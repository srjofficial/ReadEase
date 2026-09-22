/**
 * One Euro Filter (Casiez, Roussel, Vogel - CHI 2012)
 *
 * Precise adaptive low-pass filter specifically tuned for eye-gaze tracking:
 * - At low eye velocities (fixation dwelling): lowers cutoff frequency to eliminate jitter completely.
 * - At high eye velocities (rapid saccades): dynamically increases cutoff frequency to eliminate lag.
 */

class LowPassFilter {
  private y: number | null = null;
  private s: number | null = null;

  public filter(val: number, alpha: number): number {
    if (this.y === null) {
      this.s = val;
      this.y = val;
    } else {
      this.y = val;
      this.s = alpha * val + (1 - alpha) * (this.s as number);
    }
    return this.s;
  }

  public filterWithAlpha(val: number, alpha: number): number {
    return this.filter(val, alpha);
  }

  public hasLastRawValue(): boolean {
    return this.y !== null;
  }

  public lastRawValue(): number {
    return this.y ?? 0;
  }

  public reset(): void {
    this.y = null;
    this.s = null;
  }
}

export interface OneEuroConfig {
  minCutoff?: number; // Minimum cutoff frequency in Hz (default: 1.0)
  beta?: number; // Speed coefficient (default: 0.007)
  dCutoff?: number; // Cutoff frequency for derivative in Hz (default: 1.0)
}

export class OneEuroFilter1D {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;

  private xFilt: LowPassFilter = new LowPassFilter();
  private dxFilt: LowPassFilter = new LowPassFilter();
  private lastTime: number | null = null;

  constructor(config: OneEuroConfig = {}) {
    this.minCutoff = config.minCutoff ?? 1.0;
    this.beta = config.beta ?? 0.007;
    this.dCutoff = config.dCutoff ?? 1.0;
  }

  private alpha(cutoff: number, dTime: number): number {
    const te = dTime;
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / te);
  }

  public filter(val: number, timestamp: number): number {
    if (this.lastTime === null) {
      this.lastTime = timestamp;
      return this.xFilt.filter(val, 1.0);
    }

    const dTime = Math.max(1e-4, (timestamp - this.lastTime) / 1000.0); // convert ms to seconds
    this.lastTime = timestamp;

    // Estimate derivative (velocity)
    const prevRaw = this.xFilt.hasLastRawValue() ? this.xFilt.lastRawValue() : val;
    const dx = (val - prevRaw) / dTime;
    const edx = this.dxFilt.filterWithAlpha(dx, this.alpha(this.dCutoff, dTime));

    // Dynamic cutoff frequency
    const cutoff = this.minCutoff + this.beta * Math.abs(edx);
    return this.xFilt.filterWithAlpha(val, this.alpha(cutoff, dTime));
  }

  public reset(): void {
    this.xFilt.reset();
    this.dxFilt.reset();
    this.lastTime = null;
  }
}

/**
 * 2D One Euro Filter for (X, Y) Gaze Points
 */
export class OneEuroFilter2D {
  private filterX: OneEuroFilter1D;
  private filterY: OneEuroFilter1D;

  constructor(config: OneEuroConfig = {}) {
    // Configured for screen eye tracking:
    // minCutoff = 1.1 Hz provides rock-solid fixation stability
    // beta = 0.009 allows immediate snap during reading saccades
    const tunedConfig: OneEuroConfig = {
      minCutoff: config.minCutoff ?? 1.1,
      beta: config.beta ?? 0.009,
      dCutoff: config.dCutoff ?? 1.0
    };
    this.filterX = new OneEuroFilter1D(tunedConfig);
    this.filterY = new OneEuroFilter1D(tunedConfig);
  }

  public filter(x: number, y: number, timestamp: number): { x: number; y: number } {
    return {
      x: this.filterX.filter(x, timestamp),
      y: this.filterY.filter(y, timestamp)
    };
  }

  public reset(): void {
    this.filterX.reset();
    this.filterY.reset();
  }
}
