/**
 * Text Layout Engine
 *
 * Dynamically indexes rendered text elements in the DOM:
 * Paragraphs -> Lines -> Words
 * Clusters word spans into discrete reading lines, calculates hit targets,
 * and maintains zoom/resize invariance using dynamic bounding boxes.
 */

import type { WordBoundingBox, LineBoundingBox } from '../types';

export interface TextHitResult {
  wordIndex: number | null;
  wordText: string | null;
  lineIndex: number | null;
  distancePx: number;
  targetPixelX: number;
  targetPixelY: number;
  isDirectHit: boolean;
}

export class TextLayoutEngine {
  private wordBoxes: WordBoundingBox[] = [];
  private lines: LineBoundingBox[] = [];
  private containerElement: HTMLElement | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(() => {
        this.refreshLayout();
      });
    }
  }

  public bindContainer(element: HTMLElement | null): void {
    if (this.containerElement && this.resizeObserver) {
      this.resizeObserver.unobserve(this.containerElement);
    }
    this.containerElement = element;
    if (element && this.resizeObserver) {
      this.resizeObserver.observe(element);
    }
    this.refreshLayout();
  }

  public refreshLayout(): void {
    const selector = '[data-word-idx]';
    const root = this.containerElement || document;
    const elements = root.querySelectorAll<HTMLElement>(selector);

    const rawBoxes: {
      index: number;
      text: string;
      left: number;
      top: number;
      right: number;
      bottom: number;
      centerX: number;
      centerY: number;
    }[] = [];

    elements.forEach((el) => {
      const idxAttr = el.getAttribute('data-word-idx');
      if (idxAttr === null) return;
      const idx = Number(idxAttr);
      const rect = el.getBoundingClientRect();

      if (rect.width > 0 && rect.height > 0) {
        rawBoxes.push({
          index: idx,
          text: el.innerText.trim(),
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          centerX: (rect.left + rect.right) / 2,
          centerY: (rect.top + rect.bottom) / 2
        });
      }
    });

    if (rawBoxes.length === 0) {
      this.wordBoxes = [];
      this.lines = [];
      return;
    }

    // Sort by vertical position, then horizontal
    rawBoxes.sort((a, b) => {
      if (Math.abs(a.centerY - b.centerY) > 10) {
        return a.centerY - b.centerY;
      }
      return a.centerX - b.centerX;
    });

    // Cluster into distinct lines based on vertical overlap
    const clusteredLines: LineBoundingBox[] = [];
    let currentLineWords: typeof rawBoxes = [];
    let currentLineY = rawBoxes[0].centerY;

    for (const box of rawBoxes) {
      // If box is on the same vertical line (within vertical threshold)
      if (Math.abs(box.centerY - currentLineY) < 14) {
        currentLineWords.push(box);
      } else {
        if (currentLineWords.length > 0) {
          clusteredLines.push(this.buildLineBox(clusteredLines.length, currentLineWords));
        }
        currentLineWords = [box];
        currentLineY = box.centerY;
      }
    }

    if (currentLineWords.length > 0) {
      clusteredLines.push(this.buildLineBox(clusteredLines.length, currentLineWords));
    }

    this.lines = clusteredLines;

    // Flatten into wordBoxes with attached line indices
    const wordsWithLine: WordBoundingBox[] = [];
    for (const line of clusteredLines) {
      for (const w of line.words) {
        wordsWithLine.push(w);
      }
    }
    // Sort words by index
    wordsWithLine.sort((a, b) => a.index - b.index);
    this.wordBoxes = wordsWithLine;
  }

  private buildLineBox(
    lineIndex: number,
    boxes: {
      index: number;
      text: string;
      left: number;
      top: number;
      right: number;
      bottom: number;
      centerX: number;
      centerY: number;
    }[]
  ): LineBoundingBox {
    boxes.sort((a, b) => a.centerX - b.centerX);
    let minLeft = Infinity,
      maxRight = -Infinity,
      minTop = Infinity,
      maxBottom = -Infinity;

    const words: WordBoundingBox[] = boxes.map((b) => {
      if (b.left < minLeft) minLeft = b.left;
      if (b.right > maxRight) maxRight = b.right;
      if (b.top < minTop) minTop = b.top;
      if (b.bottom > maxBottom) maxBottom = b.bottom;
      return {
        ...b,
        lineIndex,
        paragraphIndex: 0
      };
    });

    return {
      lineIndex,
      top: minTop,
      bottom: maxBottom,
      left: minLeft,
      right: maxRight,
      firstWordIndex: words[0].index,
      lastWordIndex: words[words.length - 1].index,
      words
    };
  }

  /**
   * Maps gaze coordinates on the screen to the active line and word.
   */
  public hitTestGaze(pixelX: number, pixelY: number): TextHitResult {
    if (this.wordBoxes.length === 0) {
      return {
        wordIndex: null,
        wordText: null,
        lineIndex: null,
        distancePx: Infinity,
        targetPixelX: pixelX,
        targetPixelY: pixelY,
        isDirectHit: false
      };
    }

    // 1. Direct bounding box check (with generous padding for easy reading focus)
    for (const box of this.wordBoxes) {
      if (
        pixelX >= box.left - 12 &&
        pixelX <= box.right + 12 &&
        pixelY >= box.top - 8 &&
        pixelY <= box.bottom + 8
      ) {
        return {
          wordIndex: box.index,
          wordText: box.text,
          lineIndex: box.lineIndex,
          distancePx: 0,
          targetPixelX: box.centerX,
          targetPixelY: box.centerY,
          isDirectHit: true
        };
      }
    }

    // 2. Line-aware nearest-word matching: penalize vertical distance so gaze hugs the line
    let closestWord: WordBoundingBox | null = null;
    let minDistance = Infinity;

    for (const box of this.wordBoxes) {
      const dX = Math.abs(pixelX - box.centerX);
      const dY = Math.abs(pixelY - box.centerY);
      // Penalize vertical distance 1.8x to prevent inadvertent jumping between lines
      const dist = Math.hypot(dX, dY * 1.8);

      if (dist < minDistance) {
        minDistance = dist;
        closestWord = box;
      }
    }

    if (closestWord && minDistance < 180) {
      return {
        wordIndex: closestWord.index,
        wordText: closestWord.text,
        lineIndex: closestWord.lineIndex,
        distancePx: Math.round(minDistance),
        targetPixelX: closestWord.centerX,
        targetPixelY: closestWord.centerY,
        isDirectHit: false
      };
    }

    return {
      wordIndex: null,
      wordText: null,
      lineIndex: null,
      distancePx: minDistance,
      targetPixelX: pixelX,
      targetPixelY: pixelY,
      isDirectHit: false
    };
  }

  public getWordBoxes(): WordBoundingBox[] {
    return this.wordBoxes;
  }

  public getLines(): LineBoundingBox[] {
    return this.lines;
  }

  public destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.containerElement = null;
  }
}
