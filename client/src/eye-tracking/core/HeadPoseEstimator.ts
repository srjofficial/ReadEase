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

  public estimateHeadPose(landmarks: Point3D[]): HeadPoseState {
    if (!landmarks || landmarks.length < 468) {
      return {
        pitch: 0,
        yaw: 0,
        roll: 0,
        alignment: 'centered',
        distanceQuality: 'optimal'
      };
    }

    // Key anatomical landmarks in MediaPipe 478 mesh:
    // Nose tip: 1
    // Forehead / glabella: 10
    // Menton (chin): 152
    // Right cheek / tragus (anatomical): 234
    // Left cheek / tragus (anatomical): 454
    const nose = landmarks[1];
    const forehead = landmarks[10];
    const chin = landmarks[152];
    const rightCheek = landmarks[234];
    const leftCheek = landmarks[454];

    // 1. Pitch: vertical displacement of nose relative to face center
    const faceMidY = (forehead.y + chin.y) / 2;
    const faceHeight = Math.max(0.01, chin.y - forehead.y);
    const rawPitch = ((nose.y - faceMidY) / faceHeight) * 70;

    // 2. Yaw: horizontal displacement of nose relative to cheek midpoint
    const faceMidX = (rightCheek.x + leftCheek.x) / 2;
    const faceWidth = Math.max(0.01, Math.abs(leftCheek.x - rightCheek.x));
    const rawYaw = ((nose.x - faceMidX) / faceWidth) * 90;

    // 3. Roll: angle of cheek axis relative to horizon
    const dX = leftCheek.x - rightCheek.x;
    const dY = leftCheek.y - rightCheek.y;
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
      distanceQuality
    };
  }

  public reset(): void {
    this.smoothedYaw = 0;
    this.smoothedPitch = 0;
    this.smoothedRoll = 0;
  }
}
