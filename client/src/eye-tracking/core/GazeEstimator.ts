/**
 * Modular Gaze Estimator Architecture
 *
 * Implements IGazeEstimator interface with:
 * 1. GeometricGazeEstimator: Subpixel 3D iris vector projection decoupled from head roll
 * 2. MLGazeEstimator (Adapter Stub): Ready for future ONNX / L2CS-Net integration
 */

import type { Point2D, Point3D, HeadPoseState, EyeFeatures, RawGazeSample } from '../types';

export interface IGazeEstimator {
  estimateGaze(
    landmarks: Point3D[],
    headPose: HeadPoseState,
    timestamp: number,
    video?: HTMLVideoElement | null
  ): RawGazeSample | null;
  reset(): void;
}

/**
 * Geometric Gaze Estimator
 *
 * Uses MediaPipe 478 subpixel iris landmarks with dark pupil centroid video fallback.
 * Maps ocular rotation vectors to screen space with selfie-mirror inversion and high gain
 * so eye pupil movement directly drives reading line tracking.
 */
export class GeometricGazeEstimator implements IGazeEstimator {
  private baselineGazeX = 0.5;
  private baselineGazeY = 0.5;
  private isBaselineInitialized = false;
  private smoothRightIris: Point2D | null = null;
  private smoothLeftIris: Point2D | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  /**
   * Fallback dark-pupil centroid locator for browsers or frames where
   * MediaPipe 478 iris refinement is unavailable.
   */
  private extractDarkPupilCentroid(
    video: HTMLVideoElement,
    eyeCornerA: Point3D,
    eyeCornerB: Point3D,
    topLid: Point3D,
    bottomLid: Point3D
  ): Point2D {
    try {
      const W = video.videoWidth || 640;
      const H = video.videoHeight || 480;

      const minX = Math.max(0, Math.min(eyeCornerA.x, eyeCornerB.x) * W);
      const maxX = Math.min(W, Math.max(eyeCornerA.x, eyeCornerB.x) * W);
      const minY = Math.max(0, topLid.y * H);
      const maxY = Math.min(H, bottomLid.y * H);

      const boxW = Math.max(2, Math.round(maxX - minX));
      const boxH = Math.max(2, Math.round(maxY - minY));

      if (!this.offscreenCanvas) {
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });
      }

      if (!this.offscreenCtx || !this.offscreenCanvas) {
        return { x: (eyeCornerA.x + eyeCornerB.x) / 2, y: (topLid.y + bottomLid.y) / 2 };
      }

      this.offscreenCanvas.width = boxW;
      this.offscreenCanvas.height = boxH;
      this.offscreenCtx.drawImage(video, minX, minY, boxW, boxH, 0, 0, boxW, boxH);

      const imgData = this.offscreenCtx.getImageData(0, 0, boxW, boxH);
      const data = imgData.data;

      let sumX = 0;
      let sumY = 0;
      let weightSum = 0;

      for (let y = 0; y < boxH; y++) {
        for (let x = 0; x < boxW; x++) {
          const idx = (y * boxW + x) * 4;
          const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
          // Heavy weight on darkest pixels (pupil & iris core)
          const weight = Math.pow(Math.max(0, 255 - lum), 2);
          sumX += x * weight;
          sumY += y * weight;
          weightSum += weight;
        }
      }

      if (weightSum > 100) {
        return {
          x: (minX + sumX / weightSum) / W,
          y: (minY + sumY / weightSum) / H
        };
      }
    } catch {
      // ignore
    }

    return { x: (eyeCornerA.x + eyeCornerB.x) / 2, y: (topLid.y + bottomLid.y) / 2 };
  }

  public estimateGaze(
    landmarks: Point3D[],
    headPose: HeadPoseState,
    timestamp: number,
    video?: HTMLVideoElement | null
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
      : video && video.readyState >= 2
        ? this.extractDarkPupilCentroid(video, rOuter, rInner, rTop, rBottom)
        : { x: (rOuter.x + rInner.x) / 2, y: (rTop.y + rBottom.y) / 2, z: 0 };

    // Left Eye (MediaPipe 263 group):
    // Outer corner: 263, Inner corner: 362, Upper lid: 386, Lower lid: 374, Iris center: 473
    const lOuter = landmarks[263];
    const lInner = landmarks[362];
    const lTop = landmarks[386];
    const lBottom = landmarks[374];
    const lIris = hasIris
      ? landmarks[473]
      : video && video.readyState >= 2
        ? this.extractDarkPupilCentroid(video, lInner, lOuter, lTop, lBottom)
        : { x: (lOuter.x + lInner.x) / 2, y: (lTop.y + lBottom.y) / 2, z: 0 };

    // 2. Eye Aspect Ratio (EAR)
    const rSpanH = Math.hypot(rInner.x - rOuter.x, rInner.y - rOuter.y);
    const rSpanV = Math.hypot(rTop.x - rBottom.x, rTop.y - rBottom.y);
    const earRight = rSpanH > 1e-4 ? Math.min(0.48, rSpanV / (2 * rSpanH)) : 0.28;

    const lSpanH = Math.hypot(lOuter.x - lInner.x, lOuter.y - lInner.y);
    const lSpanV = Math.hypot(lTop.x - lBottom.x, lTop.y - lBottom.y);
    const earLeft = lSpanH > 1e-4 ? Math.min(0.48, lSpanV / (2 * lSpanH)) : 0.28;

    const isBlinking = (earLeft + earRight) / 2 < 0.175;

    // Pre-filter raw iris with light exponential smoothing to kill camera sensor quantization flicker
    const irisAlpha = 0.65;
    if (!this.smoothRightIris) {
      this.smoothRightIris = { x: rIris.x, y: rIris.y };
    } else {
      this.smoothRightIris = {
        x: irisAlpha * rIris.x + (1 - irisAlpha) * this.smoothRightIris.x,
        y: irisAlpha * rIris.y + (1 - irisAlpha) * this.smoothRightIris.y
      };
    }

    if (!this.smoothLeftIris) {
      this.smoothLeftIris = { x: lIris.x, y: lIris.y };
    } else {
      this.smoothLeftIris = {
        x: irisAlpha * lIris.x + (1 - irisAlpha) * this.smoothLeftIris.x,
        y: irisAlpha * lIris.y + (1 - irisAlpha) * this.smoothLeftIris.y
      };
    }

    const curRIris = this.smoothRightIris;
    const curLIris = this.smoothLeftIris;

    // 3. Dot-product horizontal ocular deflection projection
    // Right eye: vector from outer corner (33) to inner corner (133)
    const rEyeVecX = rInner.x - rOuter.x;
    const rEyeVecY = rInner.y - rOuter.y;
    const rEyeLenSq = Math.max(1e-6, rEyeVecX * rEyeVecX + rEyeVecY * rEyeVecY);
    const rIrisVecX = curRIris.x - rOuter.x;
    const rIrisVecY = curRIris.y - rOuter.y;
    const ratioRightX = (rIrisVecX * rEyeVecX + rIrisVecY * rEyeVecY) / rEyeLenSq;

    // Left eye: vector from inner corner (362) to outer corner (263)
    const lEyeVecX = lOuter.x - lInner.x;
    const lEyeVecY = lOuter.y - lInner.y;
    const lEyeLenSq = Math.max(1e-6, lEyeVecX * lEyeVecX + lEyeVecY * lEyeVecY);
    const lIrisVecX = curLIris.x - lInner.x;
    const lIrisVecY = curLIris.y - lInner.y;
    const ratioLeftX = (lIrisVecX * lEyeVecX + lIrisVecY * lEyeVecY) / lEyeLenSq;

    // 4. Vertical ocular deflection relative to fixed orbital eye corners
    // Unlike eyelids which droop/lag when looking down, eye corners are fixed on the skull
    const rEyeWidth = Math.max(1e-4, Math.hypot(rEyeVecX, rEyeVecY));
    const rCornerMidY = (rOuter.y + rInner.y) / 2;
    const ratioRightY = (curRIris.y - rCornerMidY) / rEyeWidth;

    const lEyeWidth = Math.max(1e-4, Math.hypot(lEyeVecX, lEyeVecY));
    const lCornerMidY = (lOuter.y + lInner.y) / 2;
    const ratioLeftY = (curLIris.y - lCornerMidY) / lEyeWidth;

    // Harmonized ocular gaze ratios
    const ocularGazeX = (ratioRightX + ratioLeftX) / 2;
    const ocularGazeY = (ratioRightY + ratioLeftY) / 2;

    // 5. Anatomical resting baseline tracking
    if (!this.isBaselineInitialized) {
      this.baselineGazeX = ocularGazeX;
      this.baselineGazeY = ocularGazeY;
      this.isBaselineInitialized = true;
    }

    // ── MIRRORING CORRECTION & OCULAR SENSITIVITY ──
    // In selfie webcam video: looking to your LEFT moves the pupil to camera-right (positive X).
    // Negate horizontal delta so looking left moves to screen-left.
    const deltaOcularX = -(ocularGazeX - this.baselineGazeX) * 3.4;
    // Looking down moves iris downward in image space (positive Y), so delta is positive:
    const deltaOcularY = (ocularGazeY - this.baselineGazeY) * 3.8;

    const combinedGazeX = Math.max(0.02, Math.min(0.98, 0.5 + deltaOcularX));
    const combinedGazeY = Math.max(0.02, Math.min(0.98, 0.5 + deltaOcularY));

    const rightEyeFeatures: EyeFeatures = {
      irisCenter: { x: curRIris.x, y: curRIris.y },
      innerCorner: { x: rInner.x, y: rInner.y },
      outerCorner: { x: rOuter.x, y: rOuter.y },
      topLid: { x: rTop.x, y: rTop.y },
      bottomLid: { x: rBottom.x, y: rBottom.y },
      ear: earRight,
      horizontalRatio: ratioRightX,
      verticalRatio: ratioRightY
    };

    const leftEyeFeatures: EyeFeatures = {
      irisCenter: { x: curLIris.x, y: curLIris.y },
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
      rawGazeX: combinedGazeX,
      rawGazeY: combinedGazeY,
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
    this.smoothRightIris = null;
    this.smoothLeftIris = null;
  }

  public recalibrate(): void {
    this.isBaselineInitialized = false;
    this.smoothRightIris = null;
    this.smoothLeftIris = null;
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
    timestamp: number,
    video?: HTMLVideoElement | null
  ): RawGazeSample | null {
    return this.fallbackEstimator.estimateGaze(landmarks, headPose, timestamp, video);
  }

  public reset(): void {
    this.fallbackEstimator.reset();
  }
}
