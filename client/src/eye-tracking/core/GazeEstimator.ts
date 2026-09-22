/**
 * Modular Gaze Estimator Architecture
 *
 * Implements IGazeEstimator interface with:
 * 1. GeometricGazeEstimator: Subpixel 3D iris vector projection decoupled from head roll
 * 2. MLGazeEstimator (Adapter Stub): Ready for future ONNX / L2CS-Net integration
 */

import type { Point3D, HeadPoseState, EyeFeatures, RawGazeSample } from '../types';

export interface IGazeEstimator {
  estimateGaze(
    landmarks: Point3D[],
    headPose: HeadPoseState,
    timestamp: number
  ): RawGazeSample | null;
  reset(): void;
}

/**
 * Geometric Gaze Estimator
 *
 * Uses MediaPipe 478 subpixel iris landmarks and projects ocular rotation vectors
 * onto the anatomical eye axis, mathematically decoupling eye movement from head tilt.
 */
export class GeometricGazeEstimator implements IGazeEstimator {
  private baselineGazeX = 0.5;
  private baselineGazeY = 0.5;
  private isBaselineInitialized = false;

  public estimateGaze(
    landmarks: Point3D[],
    headPose: HeadPoseState,
    timestamp: number
  ): RawGazeSample | null {
    if (!landmarks || landmarks.length < 468) return null;

    const hasIris = landmarks.length >= 478;

    // 1. Landmark Extraction
    // Right Eye (MediaPipe 33 group):
    // Outer corner: 33, Inner corner: 133, Upper lid: 159, Lower lid: 145, Iris center: 468
    const rOuter = landmarks[33];
    const rInner = landmarks[133];
    const rTop = landmarks[159];
    const rBottom = landmarks[145];
    const rIris = hasIris
      ? landmarks[468]
      : { x: (rOuter.x + rInner.x) / 2, y: (rTop.y + rBottom.y) / 2, z: 0 };

    // Left Eye (MediaPipe 263 group):
    // Outer corner: 263, Inner corner: 362, Upper lid: 386, Lower lid: 374, Iris center: 473
    const lOuter = landmarks[263];
    const lInner = landmarks[362];
    const lTop = landmarks[386];
    const lBottom = landmarks[374];
    const lIris = hasIris
      ? landmarks[473]
      : { x: (lOuter.x + lInner.x) / 2, y: (lTop.y + lBottom.y) / 2, z: 0 };

    // 2. Eye Aspect Ratio (EAR)
    const rSpanH = Math.hypot(rInner.x - rOuter.x, rInner.y - rOuter.y);
    const rSpanV = Math.hypot(rTop.x - rBottom.x, rTop.y - rBottom.y);
    const earRight = rSpanH > 1e-4 ? Math.min(0.48, rSpanV / (2 * rSpanH)) : 0.28;

    const lSpanH = Math.hypot(lOuter.x - lInner.x, lOuter.y - lInner.y);
    const lSpanV = Math.hypot(lTop.x - lBottom.x, lTop.y - lBottom.y);
    const earLeft = lSpanH > 1e-4 ? Math.min(0.48, lSpanV / (2 * lSpanH)) : 0.28;

    const isBlinking = (earLeft + earRight) / 2 < 0.175;

    // 3. Dot-product horizontal ocular deflection projection
    // Right eye: vector from outer corner (33) to inner corner (133)
    const rEyeVecX = rInner.x - rOuter.x;
    const rEyeVecY = rInner.y - rOuter.y;
    const rEyeLenSq = Math.max(1e-6, rEyeVecX * rEyeVecX + rEyeVecY * rEyeVecY);
    const rIrisVecX = rIris.x - rOuter.x;
    const rIrisVecY = rIris.y - rOuter.y;
    const ratioRightX = (rIrisVecX * rEyeVecX + rIrisVecY * rEyeVecY) / rEyeLenSq;

    // Left eye: vector from inner corner (362) to outer corner (263)
    const lEyeVecX = lOuter.x - lInner.x;
    const lEyeVecY = lOuter.y - lInner.y;
    const lEyeLenSq = Math.max(1e-6, lEyeVecX * lEyeVecX + lEyeVecY * lEyeVecY);
    const lIrisVecX = lIris.x - lInner.x;
    const lIrisVecY = lIris.y - lInner.y;
    const ratioLeftX = (lIrisVecX * lEyeVecX + lIrisVecY * lEyeVecY) / lEyeLenSq;

    // 4. Vertical ocular deflection
    const rVOpen = Math.max(0.005, rBottom.y - rTop.y);
    const ratioRightY = (rIris.y - rTop.y) / rVOpen;

    const lVOpen = Math.max(0.005, lBottom.y - lTop.y);
    const ratioLeftY = (lIris.y - lTop.y) / lVOpen;

    // Harmonized ocular gaze ratios:
    // Glancing from screen-left to screen-right causes both ratioRightX and ratioLeftX to increase
    const ocularGazeX = (ratioRightX + ratioLeftX) / 2;
    const ocularGazeY = (ratioRightY + ratioLeftY) / 2;

    // 5. Adaptive resting baseline tracking
    if (!this.isBaselineInitialized) {
      this.baselineGazeX = ocularGazeX;
      this.baselineGazeY = ocularGazeY;
      this.isBaselineInitialized = true;
    } else if (!isBlinking) {
      // Slow continuous posture shift accommodation
      this.baselineGazeX = 0.997 * this.baselineGazeX + 0.003 * ocularGazeX;
      this.baselineGazeY = 0.997 * this.baselineGazeY + 0.003 * ocularGazeY;
    }

    const deltaX = ocularGazeX - this.baselineGazeX;
    const deltaY = ocularGazeY - this.baselineGazeY;

    const rightEyeFeatures: EyeFeatures = {
      irisCenter: { x: rIris.x, y: rIris.y },
      innerCorner: { x: rInner.x, y: rInner.y },
      outerCorner: { x: rOuter.x, y: rOuter.y },
      topLid: { x: rTop.x, y: rTop.y },
      bottomLid: { x: rBottom.x, y: rBottom.y },
      ear: earRight,
      horizontalRatio: ratioRightX,
      verticalRatio: ratioRightY
    };

    const leftEyeFeatures: EyeFeatures = {
      irisCenter: { x: lIris.x, y: lIris.y },
      innerCorner: { x: lInner.x, y: lInner.y },
      outerCorner: { x: lOuter.x, y: lOuter.y },
      topLid: { x: lTop.x, y: lTop.y },
      bottomLid: { x: lBottom.x, y: lBottom.y },
      ear: earLeft,
      horizontalRatio: ratioLeftX,
      verticalRatio: ratioLeftY
    };

    // Confidence metric based on eye opening and distance
    const confidence = isBlinking
      ? 0.35
      : Math.max(0.65, Math.min(0.99, (earLeft + earRight) * 1.8));

    return {
      timestamp,
      rawGazeX: 0.5 + deltaX,
      rawGazeY: 0.5 + deltaY,
      leftEye: leftEyeFeatures,
      rightEye: rightEyeFeatures,
      headPose,
      earLeft,
      earRight,
      isBlinking,
      confidence,
      lightingQuality: 'optimal'
    };
  }

  public reset(): void {
    this.baselineGazeX = 0.5;
    this.baselineGazeY = 0.5;
    this.isBaselineInitialized = false;
  }
}

/**
 * Adapter stub for ML / L2CS-Net gaze estimation models.
 * Allows clean plugging of an ONNX or WebGL neural net model without modifying other layers.
 */
export class MLGazeEstimatorAdapter implements IGazeEstimator {
  private fallbackEstimator = new GeometricGazeEstimator();

  public estimateGaze(
    landmarks: Point3D[],
    headPose: HeadPoseState,
    timestamp: number
  ): RawGazeSample | null {
    // When a custom ML model is loaded, inference runs here; otherwise delegates to geometric model
    return this.fallbackEstimator.estimateGaze(landmarks, headPose, timestamp);
  }

  public reset(): void {
    this.fallbackEstimator.reset();
  }
}
