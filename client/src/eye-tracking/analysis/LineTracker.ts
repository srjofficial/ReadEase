/**
 * Line Tracker
 *
 * Tracks reading line progression:
 * - Line start / end timestamps
 * - Time spent reading each line
 * - Fixation count per line
 * - Return sweep latency when moving to subsequent lines
 */

import type { LineMetrics, LineTransitionEvent } from '../types';

export class LineTracker {
  private activeLineIndex: number | null = null;
  private lineStartTime = 0;
  private lineFixationCount = 0;
  private lineRegressionCount = 0;

  private completedLines: Map<number, LineMetrics> = new Map();
  private transitions: LineTransitionEvent[] = [];

  public processLineUpdate(
    currentLineIndex: number | null,
    timestamp: number
  ): LineTransitionEvent | null {
    if (currentLineIndex === null) return null;

    let transition: LineTransitionEvent | null = null;

    if (this.activeLineIndex === null) {
      this.activeLineIndex = currentLineIndex;
      this.lineStartTime = timestamp;
      this.lineFixationCount = 0;
      this.lineRegressionCount = 0;
    } else if (this.activeLineIndex !== currentLineIndex) {
      // Line transition occurred
      const durationMs = Math.max(200, timestamp - this.lineStartTime);

      // Save previous line metrics
      const existing = this.completedLines.get(this.activeLineIndex);
      const metrics: LineMetrics = {
        lineIndex: this.activeLineIndex,
        startTime: this.lineStartTime,
        endTime: timestamp,
        durationMs: (existing ? existing.durationMs : 0) + durationMs,
        fixationCount: (existing ? existing.fixationCount : 0) + this.lineFixationCount,
        averageFixationDurationMs: 0,
        regressionCount: (existing ? existing.regressionCount : 0) + this.lineRegressionCount,
        wordsCount: 0
      };
      this.completedLines.set(this.activeLineIndex, metrics);

      transition = {
        fromLineIndex: this.activeLineIndex,
        toLineIndex: currentLineIndex,
        timestamp,
        sweepDurationMs: Math.max(30, Math.min(250, timestamp - this.lineStartTime)),
        latencyMs: Math.max(20, Math.min(180, durationMs))
      };
      this.transitions.push(transition);

      this.activeLineIndex = currentLineIndex;
      this.lineStartTime = timestamp;
      this.lineFixationCount = 0;
      this.lineRegressionCount = 0;
    }

    return transition;
  }

  public registerFixation(): void {
    this.lineFixationCount += 1;
  }

  public registerRegression(): void {
    this.lineRegressionCount += 1;
  }

  public getLineMetrics(): LineMetrics[] {
    return Array.from(this.completedLines.values()).sort((a, b) => a.lineIndex - b.lineIndex);
  }

  public getAverageLineReadingTimeMs(): number {
    const list = this.getLineMetrics();
    if (list.length === 0) return 2400;
    const total = list.reduce((acc, l) => acc + l.durationMs, 0);
    return Math.round(total / list.length);
  }

  public getTotalTransitions(): number {
    return this.transitions.length;
  }

  public reset(): void {
    this.activeLineIndex = null;
    this.lineStartTime = 0;
    this.lineFixationCount = 0;
    this.lineRegressionCount = 0;
    this.completedLines.clear();
    this.transitions = [];
  }
}
