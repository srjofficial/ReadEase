/**
 * 3D Head Pose Estimator
 *
 * Uses key facial landmarks (nose tip, chin, forehead, cheekbones) to estimate
 * 3D yaw, pitch, and roll in degrees, and evaluates distance quality.
 */

import type { Point3D, HeadPoseState } from '../types';

export class HeadPoseEstimator {
  private smoothedYaw = 0;
  private smoothedPitch = 0;
  private smoothedRoll = 0;
  private alpha = 0.22; // temporal smoothing factor

  // JEOresearch HeadTracker rolling vector buffer (filter_length = 8)
  private rayBuffer: { x: number; y: number; z: number }[] = [];
  private readonly filterLength = 8;

  public estimateHeadPose(landmarks: Point3D[]): HeadPoseState {
    if (!landmarks || landmarks.length < 468) {
      return {
        pitch: 0,
        yaw: 0,
        roll: 0,
        alignment: 'centered',
        distanceQuality: 'optimal',
        headRay: { x: 0, y: 0, z: -1 }
      };
    }

    // Key anatomical landmarks in MediaPipe 478 mesh (matches JEOresearch HeadTracker LANDMARKS):
    // Nose tip (front): 1
    // Forehead (top): 10
    // Menton / Chin (bottom): 152
    // Right cheek / tragus (left): 234
    // Left cheek / tragus (right): 454
    const nose = landmarks[1];
    const forehead = landmarks[10];
    const chin = landmarks[152];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];

    // JEOresearch 3D Head Orientation Normal Vector:
    // right_axis = right - left
    // up_axis = top - bottom
    // forward_vector = np.cross(right_axis, up_axis)
    const rightAxis = {
      x: rightCheek.x - leftCheek.x,
      y: rightCheek.y - leftCheek.y,
      z: (rightCheek.z || 0) - (leftCheek.z || 0)
    };
    const upAxis = {
      x: forehead.x - chin.x,
      y: forehead.y - chin.y,
      z: (forehead.z || 0) - (chin.z || 0)
    };

    // Cross product: forwardVector = rightAxis x upAxis
    const rawFx = rightAxis.y * upAxis.z - rightAxis.z * upAxis.y;
    const rawFy = rightAxis.z * upAxis.x - rightAxis.x * upAxis.z;
    const rawFz = rightAxis.x * upAxis.y - rightAxis.y * upAxis.x;
    const fMag = Math.hypot(rawFx, rawFy, rawFz) || 1;

    const normal = {
      x: rawFx / fMag,
      y: rawFy / fMag,
      z: rawFz / fMag
    };

    // Push into JEOresearch rolling average buffer (filter_length = 8)
    this.rayBuffer.push(normal);
    if (this.rayBuffer.length > this.filterLength) {
      this.rayBuffer.shift();
    }

    let avgFx = 0;
    let avgFy = 0;
    let avgFz = 0;
    for (const r of this.rayBuffer) {
      avgFx += r.x;
      avgFy += r.y;
      avgFz += r.z;
    }
    const bLen = this.rayBuffer.length;
    avgFx /= bLen;
    avgFy /= bLen;
    avgFz /= bLen;

    // 1. Pitch: 3D normal Y elevation fused with vertical facial displacement
    const faceMidY = (forehead.y + chin.y) / 2;
    const faceHeight = Math.max(0.01, chin.y - forehead.y);
    const displacementPitch = ((nose.y - faceMidY) / faceHeight) * 70;
    const rayPitch = Math.asin(Math.max(-0.9, Math.min(0.9, avgFy))) * (180 / Math.PI);
    const rawPitch = 0.65 * rayPitch + 0.35 * displacementPitch;

    // 2. Yaw: 3D normal X deflection fused with nose horizontal offset
    const faceMidX = (leftCheek.x + rightCheek.x) / 2;
    const faceWidth = Math.max(0.01, Math.abs(rightCheek.x - leftCheek.x));
    const displacementYaw = ((nose.x - faceMidX) / faceWidth) * 90;
    const rayYaw = Math.asin(Math.max(-0.9, Math.min(0.9, -avgFx))) * (180 / Math.PI);
    const rawYaw = 0.65 * rayYaw + 0.35 * displacementYaw;

    // 3. Roll: angle of cheek axis relative to horizon
    const dX = rightCheek.x - leftCheek.x;
    const dY = rightCheek.y - leftCheek.y;
    const rawRoll = Math.atan2(dY, dX) * (180 / Math.PI);

    // Apply temporal smoothing to prevent angle flicker
    this.smoothedYaw = this.alpha * rawYaw + (1 - this.alpha) * this.smoothedYaw;
    this.smoothedPitch = this.alpha * rawPitch + (1 - this.alpha) * this.smoothedPitch;
    this.smoothedRoll = this.alpha * rawRoll + (1 - this.alpha) * this.smoothedRoll;

    const yawDeg = Math.round(this.smoothedYaw * 10) / 10;
    const pitchDeg = Math.round(this.smoothedPitch * 10) / 10;
    const rollDeg = Math.round(this.smoothedRoll * 10) / 10;

    // Alignment classification
    let alignment: HeadPoseState['alignment'] = 'centered';
    const absYaw = Math.abs(yawDeg);
    const absPitch = Math.abs(pitchDeg);

    if (absYaw > 7 || absPitch > 6) {
      if (absYaw > absPitch) {
        alignment = yawDeg < 0 ? 'tilted_right' : 'tilted_left';
      } else {
        alignment = pitchDeg > 0 ? 'looking_down' : 'looking_up';
      }
    }

    // Distance quality estimation:
    // Average normalized face width between cheeks on a standard webcam:
    // Optimal: 0.22 to 0.48
    // Too far: < 0.18 (user needs to move closer)
    // Too close: > 0.58 (face fills screen)
    let distanceQuality: HeadPoseState['distanceQuality'] = 'optimal';
    if (faceWidth < 0.18) {
      distanceQuality = 'too_far';
    } else if (faceWidth > 0.58) {
      distanceQuality = 'too_close';
    }

    return {
      pitch: pitchDeg,
      yaw: yawDeg,
      roll: rollDeg,
      alignment,
      distanceQuality,
      headRay: { x: avgFx, y: avgFy, z: avgFz }
    };
  }

  public reset(): void {
    this.smoothedYaw = 0;
    this.smoothedPitch = 0;
    this.smoothedRoll = 0;
  }
}
