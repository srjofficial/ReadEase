/**
 * JEOresearch HeadTracker Port (TypeScript / WebGL MediaPipe FaceMesh)
 *
 * Direct port of Jason Orlosky's JEOresearch/EyeTracker: HeadTracker/MonitorTracking.py:
 * https://github.com/JEOresearch/EyeTracker/tree/main/HeadTracker
 *
 * Algorithm:
 * 1. Extract 3D landmarks:
 *    left: 234 (right cheek/tragus in video)
 *    right: 454 (left cheek/tragus in video)
 *    top: 10 (forehead)
 *    bottom: 152 (chin)
 *    front: 1 (nose tip)
 * 2. Compute face coordinate frame:
 *    right_axis = (right - left) / norm(right - left)
 *    up_axis = (top - bottom) / norm(top - bottom)
 *    forward_axis = -cross(right_axis, up_axis) / norm(cross(right_axis, up_axis))
 * 3. Buffer 8 recent vectors (rolling deque) to compute avg_direction.
 * 4. Project onto XZ and YZ planes to determine 3D yaw and pitch angles.
 * 5. Re-center around 180 deg (90 = left/down, 270 = right/up).
 * 6. Apply calibration offsets:
 *    calibration_offset_yaw = 180 - raw_yaw_deg
 *    calibration_offset_pitch = 180 - raw_pitch_deg
 * 7. Map to target screen dimensions via yawDegrees (default 20) and pitchDegrees (default 10).
 */

import type { Point3D, HeadPoseState } from '../types';

export interface JEOHeadTrackerConfig {
  filterLength?: number; // rolling buffer size (default 8)
  yawDegrees?: number; // angular range horizontally (default 20)
  pitchDegrees?: number; // angular range vertically (default 10)
  invertX?: boolean; // match mirrored selfie webcam view (default true)
  invertY?: boolean; // default false
}

export interface JEOHeadTrackerOutput {
  screenX: number; // mapped pixel X (or container pixel X)
  screenY: number; // mapped pixel Y (or container pixel Y)
  normX: number; // 0.0 to 1.0
  normY: number; // 0.0 to 1.0
  rawYawDeg: number;
  rawPitchDeg: number;
  calibratedYawDeg: number;
  calibratedPitchDeg: number;
  offsetYaw: number;
  offsetPitch: number;
  center: Point3D;
  forwardRay: { x: number; y: number; z: number };
  headPose: HeadPoseState;
}

export class JEOHeadTracker {
  private filterLength: number;
  private yawDegrees: number;
  private pitchDegrees: number;
  private invertX: boolean;
  private invertY: boolean;

  // Rolling deque buffers
  private rayOrigins: Point3D[] = [];
  private rayDirections: { x: number; y: number; z: number }[] = [];

  // Calibration offsets (set via calibrateCenter() or 'c' key)
  private calibrationOffsetYaw = 0;
  private calibrationOffsetPitch = 0;
  private isCalibrated = false;

  // Cached last raw angles
  private lastRawYaw = 0;
  private lastRawPitch = 0;
  private hasFrame = false;

  constructor(config?: JEOHeadTrackerConfig) {
    this.filterLength = config?.filterLength ?? 3; // 3-frame rolling buffer for instant, zero-lag response
    this.yawDegrees = config?.yawDegrees ?? 14; // Natural desktop yaw range
    this.pitchDegrees = config?.pitchDegrees ?? 9; // Natural desktop pitch range
    this.invertX = config?.invertX ?? true; // In selfie webcam, mirror X so looking right moves cursor right
    this.invertY = config?.invertY ?? false;
  }

  public setSensitivity(yawDeg: number, pitchDeg: number): void {
    this.yawDegrees = Math.max(6, Math.min(30, yawDeg));
    this.pitchDegrees = Math.max(4, Math.min(22, pitchDeg));
  }

  public getSensitivity(): { yawDegrees: number; pitchDegrees: number } {
    return { yawDegrees: this.yawDegrees, pitchDegrees: this.pitchDegrees };
  }

  public setInvertX(invert: boolean): void {
    this.invertX = invert;
  }

  public getInvertX(): boolean {
    return this.invertX;
  }

  /**
   * One-touch calibration (matches 'c' key in MonitorTracking.py):
   * calibration_offset_yaw = 180 - raw_yaw_deg
   * calibration_offset_pitch = 180 - raw_pitch_deg
   */
  public calibrateCenter(): void {
    if (!this.hasFrame) {
      this.isCalibrated = false; // auto-calibrates on the first real frame
      return;
    }
    this.calibrationOffsetYaw = this.lastRawYaw;
    this.calibrationOffsetPitch = this.lastRawPitch;
    this.isCalibrated = true;
    console.log(
      `[JEOHeadTracker] Calibrated offsets: Yaw=${this.calibrationOffsetYaw.toFixed(2)}, Pitch=${this.calibrationOffsetPitch.toFixed(2)}`
    );
  }

  public resetCalibration(): void {
    this.calibrationOffsetYaw = 0;
    this.calibrationOffsetPitch = 0;
    this.isCalibrated = false;
  }

  public reset(): void {
    this.rayOrigins = [];
    this.rayDirections = [];
    this.resetCalibration();
  }

  /**
   * Process MediaPipe landmarks according to MonitorTracking.py
   */
  public processLandmarks(
    landmarks: Point3D[],
    targetWidth: number,
    targetHeight: number,
    srcW = 640,
    srcH = 480
  ): JEOHeadTrackerOutput | null {
    if (!landmarks || landmarks.length < 468) return null;

    // LANDMARKS = { "left": 234, "right": 454, "top": 10, "bottom": 152, "front": 1 }
    const pLeft = landmarks[234];
    const pRight = landmarks[454];
    const pTop = landmarks[10];
    const pBottom = landmarks[152];
    const pFront = landmarks[1];

    if (!pLeft || !pRight || !pTop || !pBottom || !pFront) return null;

    // Scaled to video source pixel dimensions (NOT target container — keeps aspect ratio correct)
    const w = srcW || 640;
    const h = srcH || 480;

    const left = { x: pLeft.x * w, y: pLeft.y * h, z: (pLeft.z || 0) * w };
    const right = { x: pRight.x * w, y: pRight.y * h, z: (pRight.z || 0) * w };
    const top = { x: pTop.x * w, y: pTop.y * h, z: (pTop.z || 0) * w };
    const bottom = { x: pBottom.x * w, y: pBottom.y * h, z: (pBottom.z || 0) * w };
    const front = { x: pFront.x * w, y: pFront.y * h, z: (pFront.z || 0) * w };

    // right_axis = (right - left)
    const rx = right.x - left.x;
    const ry = right.y - left.y;
    const rz = right.z - left.z;
    const rNorm = Math.hypot(rx, ry, rz) || 1;
    const rightAxis = { x: rx / rNorm, y: ry / rNorm, z: rz / rNorm };

    // up_axis = (top - bottom)
    const ux = top.x - bottom.x;
    const uy = top.y - bottom.y;
    const uz = top.z - bottom.z;
    const uNorm = Math.hypot(ux, uy, uz) || 1;
    const upAxis = { x: ux / uNorm, y: uy / uNorm, z: uz / uNorm };

    // forward_axis = np.cross(right_axis, up_axis)
    let fx = rightAxis.y * upAxis.z - rightAxis.z * upAxis.y;
    let fy = rightAxis.z * upAxis.x - rightAxis.x * upAxis.z;
    let fz = rightAxis.x * upAxis.y - rightAxis.y * upAxis.x;
    const fNorm = Math.hypot(fx, fy, fz) || 1;
    fx /= fNorm;
    fy /= fNorm;
    fz /= fNorm;

    // Forward must point toward camera (negative z in MediaPipe)
    if (fz > 0) {
      fx = -fx;
      fy = -fy;
      fz = -fz;
    }

    // Compute center of head: center = (left + right + top + bottom + front) / 5
    const center: Point3D = {
      x: (left.x + right.x + top.x + bottom.x + front.x) / 5,
      y: (left.y + right.y + top.y + bottom.y + front.y) / 5,
      z: (left.z + right.z + top.z + bottom.z + front.z) / 5
    };

    // Update smoothing buffers (rolling deque maxlen = filterLength)
    this.rayOrigins.push(center);
    if (this.rayOrigins.length > this.filterLength) {
      this.rayOrigins.shift();
    }

    this.rayDirections.push({ x: fx, y: fy, z: fz });
    if (this.rayDirections.length > this.filterLength) {
      this.rayDirections.shift();
    }

    // Compute averaged ray direction
    let sumDirX = 0;
    let sumDirY = 0;
    let sumDirZ = 0;
    for (const d of this.rayDirections) {
      sumDirX += d.x;
      sumDirY += d.y;
      sumDirZ += d.z;
    }
    const bLen = this.rayDirections.length || 1;
    let avgDirX = sumDirX / bLen;
    let avgDirY = sumDirY / bLen;
    let avgDirZ = sumDirZ / bLen;
    const avgNorm = Math.hypot(avgDirX, avgDirY, avgDirZ) || 1;
    avgDirX /= avgNorm;
    avgDirY /= avgNorm;
    avgDirZ /= avgNorm;

    // Continuous 3D Yaw (horizontal rotation):
    // Use -avgDirZ so facing camera (fz<0) gives atan2(0,pos) = 0 at center
    const rawYawDeg = Math.atan2(avgDirX, -avgDirZ) * (180 / Math.PI);

    // Continuous 3D Pitch (vertical nodding):
    // In screen coordinates, Y points down, so -avgDirY is up:
    const vectorPitchDeg =
      Math.atan2(-avgDirY, Math.hypot(avgDirX, avgDirZ)) * (180 / Math.PI) * 1.5;

    // Anatomical vertical rotation assist:
    // Uses nose tip (1) relative to ear rotation axis (midpoint of tragus landmarks 234 & 454).
    // Raising chin moves nose tip upward in 2D image coordinates, increasing (pivotPxY - nosePxY).
    const pivotPxY = (left.y + right.y) / 2;
    const nosePxY = front.y;
    const faceWidthPx = Math.hypot(right.x - left.x, right.y - left.y) || 1;
    const directPitchRatio = (pivotPxY - nosePxY) / faceWidthPx;
    const geoPitchDeg = directPitchRatio * 38;

    // Fused pitch: combines 3D head normal vector with anatomical ear-nose vertical rotation
    const rawPitchDeg = vectorPitchDeg * 0.5 + geoPitchDeg * 0.5;

    this.lastRawYaw = rawYawDeg;
    this.lastRawPitch = rawPitchDeg;
    this.hasFrame = true;

    // Auto-initialize first frame calibration if not yet calibrated
    if (!this.isCalibrated) {
      this.calibrationOffsetYaw = rawYawDeg;
      this.calibrationOffsetPitch = rawPitchDeg;
      this.isCalibrated = true;
    }

    // Apply calibration offsets (0 deg = facing center)
    const calYawDeg = rawYawDeg - this.calibrationOffsetYaw;
    const calPitchDeg = rawPitchDeg - this.calibrationOffsetPitch;

    // Map to normalized coordinates (0.0 to 1.0)
    let normX = 0.5 + calYawDeg / (2 * this.yawDegrees);
    let normY = 0.5 - calPitchDeg / (2 * this.pitchDegrees);

    // Invert X for mirrored webcam feed so user looking towards right edge moves right
    if (this.invertX) {
      normX = 1 - normX;
    }
    if (this.invertY) {
      normY = 1 - normY;
    }

    // Clamp to [0.01, 0.99]
    normX = Math.max(0.01, Math.min(0.99, normX));
    normY = Math.max(0.01, Math.min(0.99, normY));

    const screenX = Math.round(normX * targetWidth);
    const screenY = Math.round(normY * targetHeight);

    // Head alignment description
    const devYaw = calYawDeg;
    const devPitch = calPitchDeg;
    let alignment: HeadPoseState['alignment'] = 'centered';
    if (Math.abs(devYaw) > 5 || Math.abs(devPitch) > 4) {
      if (Math.abs(devYaw) > Math.abs(devPitch)) {
        alignment = devYaw > 0 ? 'tilted_right' : 'tilted_left';
      } else {
        alignment = devPitch < 0 ? 'looking_down' : 'looking_up';
      }
    }

    const headPose: HeadPoseState = {
      yaw: Math.round(devYaw * 10) / 10,
      pitch: Math.round(devPitch * 10) / 10,
      roll: Math.round(Math.atan2(right.y - left.y, right.x - left.x) * (180 / Math.PI) * 10) / 10,
      alignment,
      distanceQuality: 'optimal',
      headRay: { x: avgDirX, y: avgDirY, z: avgDirZ }
    };

    return {
      screenX,
      screenY,
      normX,
      normY,
      rawYawDeg,
      rawPitchDeg,
      calibratedYawDeg: calYawDeg,
      calibratedPitchDeg: calPitchDeg,
      offsetYaw: this.calibrationOffsetYaw,
      offsetPitch: this.calibrationOffsetPitch,
      center,
      forwardRay: { x: avgDirX, y: avgDirY, z: avgDirZ },
      headPose
    };
  }
}
