/**
 * Robust Eye Aspect Ratio (EAR) Blink Detector
 *
 * Distinguishes micro-blinks (80-350ms) from normal tracking noise and tracks
 * unusually long eye closures (> 500ms).
 */

import type { BlinkEvent } from '../types';

export class BlinkDetector {
  private isBlinkingNow = false;
  private blinkStartTime = 0;
  private totalBlinks = 0;
  private blinkEvents: BlinkEvent[] = [];
  private earThreshold = 0.175; // tuned threshold for eye closure

  public processEAR(
    earLeft: number,
    earRight: number,
    timestamp: number
  ): {
    isBlinking: boolean;
    blinkCount: number;
    newBlinkEvent: BlinkEvent | null;
  } {
    const avgEar = (earLeft + earRight) / 2;
    const isClosed = avgEar < this.earThreshold;
    let newBlinkEvent: BlinkEvent | null = null;

    if (isClosed && !this.isBlinkingNow) {
      // Blink initiation
      this.isBlinkingNow = true;
      this.blinkStartTime = timestamp;
    } else if (!isClosed && this.isBlinkingNow) {
      // Blink conclusion
      this.isBlinkingNow = false;
      const duration = timestamp - this.blinkStartTime;

      // Filter out high-frequency noise spikes (< 60ms)
      if (duration >= 60) {
        this.totalBlinks += 1;
        const event: BlinkEvent = {
          startTime: this.blinkStartTime,
          endTime: timestamp,
          duration,
          isUnusuallyLong: duration > 500
        };
        this.blinkEvents.push(event);
        newBlinkEvent = event;
      }
    }

    return {
      isBlinking: this.isBlinkingNow,
      blinkCount: this.totalBlinks,
      newBlinkEvent
    };
  }

  public getBlinkHistory(): BlinkEvent[] {
    return [...this.blinkEvents];
  }

  public getTotalBlinks(): number {
    return this.totalBlinks;
  }

  public getAverageBlinkDuration(): number {
    if (this.blinkEvents.length === 0) return 180;
    const sum = this.blinkEvents.reduce((acc, b) => acc + b.duration, 0);
    return Math.round(sum / this.blinkEvents.length);
  }

  public reset(): void {
    this.isBlinkingNow = false;
    this.blinkStartTime = 0;
    this.totalBlinks = 0;
    this.blinkEvents = [];
  }
}
