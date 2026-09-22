/**
 * Saccade Detector
 *
 * Detects ballistic eye movements between fixation intervals:
 * - Computes amplitude, duration, velocity vector, and reading direction:
 *   - 'forward': left-to-right reading progression along a line
 *   - 'backward': right-to-left intra-line regressions
 *   - 'return_sweep': long downward-leftward jump from end of one line to beginning of next line
 *   - 'vertical': inter-line drift
 */

import type { SaccadeEvent } from '../types';

export class SaccadeDetector {
  private activeSaccade: {
    startTime: number;
    startX: number;
    startY: number;
    startPxX: number;
    startPxY: number;
    fromWordIndex: number | null;
    peakVelocity: number;
  } | null = null;

  private completedSaccades: SaccadeEvent[] = [];
  private velocityThreshold = 0.42; // px per ms

  public processSample(
    normX: number,
    normY: number,
    pixelX: number,
    pixelY: number,
    velocityPxPerMs: number,
    wordIndex: number | null,
    timestamp: number
  ): {
    isSaccade: boolean;
    newCompletedSaccade: SaccadeEvent | null;
  } {
    let newCompletedSaccade: SaccadeEvent | null = null;
    const isMovingFast = velocityPxPerMs >= this.velocityThreshold;

    if (isMovingFast) {
      if (!this.activeSaccade) {
        // Start saccade
        this.activeSaccade = {
          startTime: timestamp,
          startX: normX,
          startY: normY,
          startPxX: pixelX,
          startPxY: pixelY,
          fromWordIndex: wordIndex,
          peakVelocity: velocityPxPerMs
        };
      } else {
        if (velocityPxPerMs > this.activeSaccade.peakVelocity) {
          this.activeSaccade.peakVelocity = velocityPxPerMs;
        }
      }
    } else {
      // Velocity dropped below threshold: finalize saccade
      if (this.activeSaccade) {
        const duration = Math.max(15, timestamp - this.activeSaccade.startTime);
        const distancePx = Math.hypot(
          pixelX - this.activeSaccade.startPxX,
          pixelY - this.activeSaccade.startPxY
        );

        // Only register if minimum spatial jump occurred (> 18px)
        if (distancePx >= 18 && duration <= 180) {
          const dX = pixelX - this.activeSaccade.startPxX;
          const dY = pixelY - this.activeSaccade.startPxY;

          let direction: SaccadeEvent['direction'] = 'forward';
          if (dX < -60 && dY > 20) {
            direction = 'return_sweep';
          } else if (dX < -15 && Math.abs(dY) < 30) {
            direction = 'backward';
          } else if (Math.abs(dY) > Math.abs(dX) * 1.5) {
            direction = 'vertical';
          }

          const event: SaccadeEvent = {
            id: `sac_${Date.now()}_${this.completedSaccades.length}`,
            startTime: this.activeSaccade.startTime,
            endTime: timestamp,
            duration,
            startX: this.activeSaccade.startX,
            startY: this.activeSaccade.startY,
            endX: normX,
            endY: normY,
            distancePx: Math.round(distancePx),
            amplitudeDeg: Number(((distancePx / 45) * 1.0).toFixed(2)),
            peakVelocityPxPerMs: Number(this.activeSaccade.peakVelocity.toFixed(2)),
            direction,
            fromWordIndex: this.activeSaccade.fromWordIndex,
            toWordIndex: wordIndex
          };

          this.completedSaccades.push(event);
          newCompletedSaccade = event;
        }

        this.activeSaccade = null;
      }
    }

    return {
      isSaccade: this.activeSaccade !== null,
      newCompletedSaccade
    };
  }

  public getSaccades(): SaccadeEvent[] {
    return [...this.completedSaccades];
  }

  public getAverageSaccadeLength(): number {
    if (this.completedSaccades.length === 0) return 65;
    const total = this.completedSaccades.reduce((acc, s) => acc + s.distancePx, 0);
    return Math.round(total / this.completedSaccades.length);
  }

  public reset(): void {
    this.activeSaccade = null;
    this.completedSaccades = [];
  }
}
