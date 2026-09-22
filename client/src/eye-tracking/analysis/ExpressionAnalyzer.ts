/**
 * Observable Facial Expression Signal Analyzer
 *
 * Extracts objective geometric facial cues from MediaPipe landmarks:
 * - Brow raise: vertical displacement of eyebrows relative to eye top
 * - Brow furrow: horizontal narrowing between inner eyebrows
 * - Eye squint: vertical eyelid narrowing during reading
 * - Jaw / mouth tension: vertical lip compression
 *
 * IMPORTANT: Strictly non-diagnostic. These are physical observations,
 * NOT emotional or psychological claims.
 */

import type { Point3D, ObservableFacialSignals } from '../types';

export class ExpressionAnalyzer {
  private baselineBrowDistance = 0;
  private baselineInnerBrowWidth = 0;
  private isCalibrated = false;

  private squintCount = 0;
  private browRaiseCount = 0;

  public analyzeLandmarks(landmarks: Point3D[]): ObservableFacialSignals {
    if (!landmarks || landmarks.length < 468) {
      return {
        browRaise: 0,
        browFurrow: 0,
        eyeSquint: 0,
        jawTension: 0,
        headTiltAngle: 0
      };
    }

    // Key facial expression landmarks:
    // Right eyebrow arch: 70, Right eye top: 159
    // Left eyebrow arch: 300, Left eye top: 386
    // Inner eyebrows: 55, 285
    // Upper lip: 13, Lower lip: 14, Chin: 152
    // Cheek line: 234, 454
    const rBrow = landmarks[70];
    const rEyeTop = landmarks[159];
    const lBrow = landmarks[300];
    const lEyeTop = landmarks[386];
    const rInnerBrow = landmarks[55];
    const lInnerBrow = landmarks[285];
    const upperLip = landmarks[13];
    const lowerLip = landmarks[14];
    const rCheek = landmarks[234];
    const lCheek = landmarks[454];

    // 1. Brow Raise distance (vertical gap between brow and eyelid)
    const currentBrowDist = (rEyeTop.y - rBrow.y + (lEyeTop.y - lBrow.y)) / 2;

    // 2. Inner brow width
    const currentInnerBrowWidth = Math.abs(lInnerBrow.x - rInnerBrow.x);

    // Baseline calibration over first frames
    if (!this.isCalibrated) {
      this.baselineBrowDistance = currentBrowDist;
      this.baselineInnerBrowWidth = currentInnerBrowWidth;
      this.isCalibrated = true;
    } else {
      this.baselineBrowDistance = 0.998 * this.baselineBrowDistance + 0.002 * currentBrowDist;
      this.baselineInnerBrowWidth =
        0.998 * this.baselineInnerBrowWidth + 0.002 * currentInnerBrowWidth;
    }

    // Brow raise ratio (> 1.0 indicates raised brows)
    const browDelta = currentBrowDist - this.baselineBrowDistance;
    const browRaise = Math.max(
      0,
      Math.min(1.0, (browDelta / Math.max(0.01, this.baselineBrowDistance)) * 3.5)
    );

    // Brow furrow ratio (narrowing of inner brows)
    const furrowDelta = this.baselineInnerBrowWidth - currentInnerBrowWidth;
    const browFurrow = Math.max(
      0,
      Math.min(1.0, (furrowDelta / Math.max(0.01, this.baselineInnerBrowWidth)) * 3.0)
    );

    // Eye squint (aperture compression)
    const rAperture = Math.abs(landmarks[145].y - landmarks[159].y);
    const lAperture = Math.abs(landmarks[374].y - landmarks[386].y);
    const avgAperture = (rAperture + lAperture) / 2;
    // Squint: narrow aperture without full closure
    const eyeSquint =
      avgAperture > 0.012 && avgAperture < 0.024 ? 0.75 : avgAperture <= 0.012 ? 0.9 : 0.1;

    // Mouth / jaw tension
    const mouthOpening = Math.abs(lowerLip.y - upperLip.y);
    const jawTension = mouthOpening < 0.006 ? 0.7 : 0.2;

    // Head tilt angle
    const headTiltAngle = Math.round(
      Math.atan2(lCheek.y - rCheek.y, lCheek.x - rCheek.x) * (180 / Math.PI)
    );

    if (browRaise > 0.6) this.browRaiseCount++;
    if (eyeSquint > 0.6) this.squintCount++;

    return {
      browRaise: Number(browRaise.toFixed(2)),
      browFurrow: Number(browFurrow.toFixed(2)),
      eyeSquint: Number(eyeSquint.toFixed(2)),
      jawTension: Number(jawTension.toFixed(2)),
      headTiltAngle
    };
  }

  public getSummary(): {
    frequentSquintingDetected: boolean;
    elevatedBrowRaiseDetected: boolean;
    frequentHeadAdjustmentDetected: boolean;
  } {
    return {
      frequentSquintingDetected: this.squintCount > 15,
      elevatedBrowRaiseDetected: this.browRaiseCount > 12,
      frequentHeadAdjustmentDetected: false
    };
  }

  public reset(): void {
    this.baselineBrowDistance = 0;
    this.baselineInnerBrowWidth = 0;
    this.isCalibrated = false;
    this.squintCount = 0;
    this.browRaiseCount = 0;
  }
}
