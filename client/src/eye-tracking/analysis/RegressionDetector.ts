/**
 * Regression Detector
 *
 * Detects backward eye movements during reading:
 * - Differentiates between normal return sweeps (line N to line N+1) and true regressions.
 * - Tracks intra-line regressions (re-reading previous words on the same line)
 * - Tracks inter-line regressions (re-reading earlier lines)
 * - Formulated strictly as reading behavior metrics, NEVER as a medical diagnosis.
 */

import type { RegressionEvent } from '../types';

export class RegressionDetector {
  private completedRegressions: RegressionEvent[] = [];
  private lastWordIndex: number | null = null;
  private lastLineIndex: number | null = null;
  private lastTimestamp = 0;

  public processReadingStep(
    currentWordIndex: number | null,
    currentLineIndex: number | null,
    timestamp: number
  ): RegressionEvent | null {
    if (
      currentWordIndex === null ||
      this.lastWordIndex === null ||
      currentWordIndex === this.lastWordIndex
    ) {
      if (currentWordIndex !== null) this.lastWordIndex = currentWordIndex;
      if (currentLineIndex !== null) this.lastLineIndex = currentLineIndex;
      this.lastTimestamp = timestamp;
      return null;
    }

    let regression: RegressionEvent | null = null;

    if (currentLineIndex !== null && this.lastLineIndex !== null) {
      // 1. Inter-line backward regression (re-reading an earlier line)
      if (currentLineIndex < this.lastLineIndex) {
        regression = {
          id: `reg_${Date.now()}_${this.completedRegressions.length}`,
          timestamp,
          duration: Math.max(100, timestamp - this.lastTimestamp),
          fromWordIndex: this.lastWordIndex,
          toWordIndex: currentWordIndex,
          fromLineIndex: this.lastLineIndex,
          toLineIndex: currentLineIndex,
          wordsSpanned: Math.max(1, this.lastWordIndex - currentWordIndex),
          isInterLine: true
        };
      }
      // 2. Intra-line backward regression (re-reading earlier words on the same line)
      else if (
        currentLineIndex === this.lastLineIndex &&
        currentWordIndex < this.lastWordIndex - 1
      ) {
        regression = {
          id: `reg_${Date.now()}_${this.completedRegressions.length}`,
          timestamp,
          duration: Math.max(100, timestamp - this.lastTimestamp),
          fromWordIndex: this.lastWordIndex,
          toWordIndex: currentWordIndex,
          fromLineIndex: this.lastLineIndex,
          toLineIndex: currentLineIndex,
          wordsSpanned: this.lastWordIndex - currentWordIndex,
          isInterLine: false
        };
      }
    }

    if (regression) {
      this.completedRegressions.push(regression);
    }

    this.lastWordIndex = currentWordIndex;
    if (currentLineIndex !== null) this.lastLineIndex = currentLineIndex;
    this.lastTimestamp = timestamp;

    return regression;
  }

  public getRegressions(): RegressionEvent[] {
    return [...this.completedRegressions];
  }

  public getTotalRegressions(): number {
    return this.completedRegressions.length;
  }

  public reset(): void {
    this.completedRegressions = [];
    this.lastWordIndex = null;
    this.lastLineIndex = null;
    this.lastTimestamp = 0;
  }
}
