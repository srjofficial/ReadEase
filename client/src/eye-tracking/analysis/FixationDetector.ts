/**
 * I-VT Fixation Detector (Velocity-Threshold Identification)
 *
 * Implements standard eye-tracking fixation classification:
 * - Gaze samples below velocity threshold accumulating within a spatial window are classified as fixations.
 * - Minimum duration threshold: 130ms (typical human reading fixations range from 150ms to 400ms).
 */

import type { FixationEvent } from '../types';

export class FixationDetector {
  private activeFixation: {
    startTime: number;
    points: { x: number; y: number; px: number; py: number; timestamp: number }[];
    wordIndex: number | null;
    wordText?: string;
    lineIndex: number | null;
  } | null = null;

  private completedFixations: FixationEvent[] = [];
  private velocityThreshold = 0.42; // px per millisecond
  private minFixationDurationMs = 130;
  private maxSpatialDispersionPx = 45; // max radius for a single fixation cluster

  public processSample(
    normX: number,
    normY: number,
    pixelX: number,
    pixelY: number,
    velocityPxPerMs: number,
    wordIndex: number | null,
    wordText: string | null,
    lineIndex: number | null,
    timestamp: number,
    confidence = 0.95
  ): {
    isFixating: boolean;
    activeDurationMs: number;
    newCompletedFixation: FixationEvent | null;
  } {
    let newCompletedFixation: FixationEvent | null = null;
    const isStationary = velocityPxPerMs < this.velocityThreshold;

    if (isStationary) {
      if (!this.activeFixation) {
        // Start candidate fixation
        this.activeFixation = {
          startTime: timestamp,
          points: [{ x: normX, y: normY, px: pixelX, py: pixelY, timestamp }],
          wordIndex,
          wordText: wordText ?? undefined,
          lineIndex
        };
      } else {
        // Check spatial dispersion from initial fixation center
        const firstPt = this.activeFixation.points[0];
        const distFromCenter = Math.hypot(pixelX - firstPt.px, pixelY - firstPt.py);

        if (distFromCenter < this.maxSpatialDispersionPx) {
          this.activeFixation.points.push({
            x: normX,
            y: normY,
            px: pixelX,
            py: pixelY,
            timestamp
          });
          if (wordIndex !== null) this.activeFixation.wordIndex = wordIndex;
          if (wordText) this.activeFixation.wordText = wordText;
          if (lineIndex !== null) this.activeFixation.lineIndex = lineIndex;
        } else {
          // Gaze drifted beyond fixation cluster -> close current fixation and start new
          newCompletedFixation = this.finalizeCurrentFixation(timestamp, confidence);
          this.activeFixation = {
            startTime: timestamp,
            points: [{ x: normX, y: normY, px: pixelX, py: pixelY, timestamp }],
            wordIndex,
            wordText: wordText ?? undefined,
            lineIndex
          };
        }
      }
    } else {
      // High velocity (saccade): finalize active fixation if it met the duration threshold
      if (this.activeFixation) {
        newCompletedFixation = this.finalizeCurrentFixation(timestamp, confidence);
      }
    }

    const activeDurationMs = this.activeFixation ? timestamp - this.activeFixation.startTime : 0;

    return {
      isFixating: this.activeFixation !== null && activeDurationMs >= this.minFixationDurationMs,
      activeDurationMs,
      newCompletedFixation
    };
  }

  private finalizeCurrentFixation(currentTime: number, confidence: number): FixationEvent | null {
    if (!this.activeFixation) return null;

    const duration = currentTime - this.activeFixation.startTime;
    let event: FixationEvent | null = null;

    if (duration >= this.minFixationDurationMs) {
      // Calculate spatial centroid
      const pts = this.activeFixation.points;
      const avgNormX = pts.reduce((acc, p) => acc + p.x, 0) / pts.length;
      const avgNormY = pts.reduce((acc, p) => acc + p.y, 0) / pts.length;
      const avgPxX = pts.reduce((acc, p) => acc + p.px, 0) / pts.length;
      const avgPxY = pts.reduce((acc, p) => acc + p.py, 0) / pts.length;

      event = {
        id: `fix_${Date.now()}_${this.completedFixations.length}`,
        startTime: this.activeFixation.startTime,
        endTime: currentTime,
        duration: Math.round(duration),
        x: Number(avgNormX.toFixed(4)),
        y: Number(avgNormY.toFixed(4)),
        pixelX: Math.round(avgPxX),
        pixelY: Math.round(avgPxY),
        wordIndex: this.activeFixation.wordIndex,
        wordText: this.activeFixation.wordText,
        lineIndex: this.activeFixation.lineIndex,
        confidence
      };

      this.completedFixations.push(event);
    }

    this.activeFixation = null;
    return event;
  }

  public getFixations(): FixationEvent[] {
    return [...this.completedFixations];
  }

  public getAverageFixationDuration(): number {
    if (this.completedFixations.length === 0) return 240;
    const total = this.completedFixations.reduce((acc, f) => acc + f.duration, 0);
    return Math.round(total / this.completedFixations.length);
  }

  public reset(): void {
    this.activeFixation = null;
    this.completedFixations = [];
  }
}
