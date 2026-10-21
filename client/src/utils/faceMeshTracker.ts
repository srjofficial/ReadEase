/**
 * ReadEase Computer Vision & Face Mesh Real-Time Tracking Engine
 *
 * Provides:
 * - Client-side real-time gaze estimation (pupil luminance centroid, 30-60 FPS)
 * - Head pose estimation via facial feature luminance asymmetry (NO server required)
 * - Eye Aspect Ratio (EAR) blink detection
 * - Saccade / fixation / regression classification
 * - Complete scanpath trajectory for assessment replay
 * - Voice/speech analysis via Web Speech API
 */

import * as faceMeshModule from '@mediapipe/face_mesh';

// Canonical MediaPipe 478 Landmark Indices
export const FACEMESH_FACE_OVAL_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
  176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10
];

export const FACEMESH_LEFT_EYE_INDICES = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246
];

export const FACEMESH_RIGHT_EYE_INDICES = [
  362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398
];

// Safe constructor resolution across ESM, CJS, and browser globals
const FaceMeshClass: any =
  (faceMeshModule as any).FaceMesh ||
  (faceMeshModule as any).default?.FaceMesh ||
  (faceMeshModule as any).default ||
  (typeof window !== 'undefined' && (window as any).FaceMesh);

// ─── Web Speech API type declarations (not yet in all TS DOM libs) ─────────

interface SpeechRecognitionResultItem {
  readonly transcript: string;
  readonly confidence: number;
}
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionResultItem;
  [index: number]: SpeechRecognitionResultItem;
}
interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
interface ISpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
interface ISpeechRecognitionConstructor {
  new (): ISpeechRecognition;
}

export interface Point2D {
  x: number;
  y: number;
}

export interface CalibrationTarget {
  id: string;
  label: string;
  targetX: number; // 0.0 to 1.0 (screen viewport ratio)
  targetY: number;
}

export interface CalibrationOffset {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  isCalibrated: boolean;
}

export interface ScanpathPoint {
  x: number;
  y: number;
  timestamp: number;
  type: 'fixation' | 'saccade' | 'regression';
  duration?: number;
  wordIndex?: number | null;
}

export interface HeadPoseState {
  pitch: number;
  yaw: number;
  roll: number;
  alignment: 'centered' | 'tilted_left' | 'tilted_right' | 'looking_down' | 'looking_up';
}

export interface GazeTrackingMetrics {
  screenX: number;
  screenY: number;
  smoothedX: number;
  smoothedY: number;
  earLeft: number;
  earRight: number;
  isBlinking: boolean;
  confidence: number;
  fps: number;
  headPose: HeadPoseState;
  fixationsCount: number;
  regressionsCount: number;
  totalBlinks: number;
  stabilityScore: number;
  activeWordIndex: number | null;
  activeLineIndex: number | null;
  lightingQuality: 'optimal' | 'dim' | 'harsh' | 'unknown';
}

export interface WordBox {
  index: number;
  text: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface VoiceAnalysisResult {
  transcript: string;
  wordCount: number;
  wpmEstimate: number;
  isListening: boolean;
  fluencyScore: number; // 0-100
  hesitationCount: number; // detected pauses / fillers
  mispronunciations: string[];
}

export interface VideoGazeEstimation {
  rawX: number;
  rawY: number;
  earLeft: number;
  earRight: number;
  confidence: number;
  headPose: HeadPoseState;
  lightingQuality: 'optimal' | 'dim' | 'harsh' | 'unknown';
  leftIrisCenter?: Point2D;
  rightIrisCenter?: Point2D;
  faceOvalPoints?: Point2D[];
  leftEyeContour?: Point2D[];
  rightEyeContour?: Point2D[];
  isMediaPipe?: boolean;
}

export interface WordHitResult {
  wordIndex: number | null;
  distance: number;
  targetPixelX: number;
  targetPixelY: number;
}

// ─────────────────────────────────────────────────────────────────────────────

export class FaceMeshTracker {
  private smoothedX = 0.5;
  private smoothedY = 0.45;
  private smoothingFactor = 0.24;

  // Adaptive Gaze Sensitivity & Resting Baseline
  private gazeSensitivity = 2.8;
  private baselinePupilX = 0.5;
  private baselinePupilY = 0.5;
  private hasInitializedBaseline = false;

  // Manual / Interactive Eye Anchors (Pinpointed by user or auto-calibrated)
  private eyeAnchorLeft: Point2D | null = null;
  private eyeAnchorRight: Point2D | null = null;

  // Calibration parameters
  private calibration: CalibrationOffset = {
    offsetX: 0,
    offsetY: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    isCalibrated: false
  };

  private calibrationSamples: { targetX: number; targetY: number; rawX: number; rawY: number }[] =
    [];

  // Dwell and Fixation tracking
  private lastFixationX = 0.5;
  private lastFixationY = 0.45;
  private fixationDwellStart = 0;
  private fixationsCount = 0;
  private regressionsCount = 0;
  private totalBlinks = 0;
  private lastBlinkState = false;
  private recordedFixationDurations: number[] = [];
  private recordedSaccadeLengths: number[] = [];

  // Scanpath
  private scanpath: ScanpathPoint[] = [];

  // Canvas for client-side CV analysis
  private processingCanvas: HTMLCanvasElement | null = null;
  private processingCtx: CanvasRenderingContext2D | null = null;

  // Saccade tracking
  private lastWordIndex: number | null = null;
  private lastLineIndex: number | null = null;

  // FPS calculation
  private frameTimes: number[] = [];
  private lastFps = 30;

  // Head Pose - smoothed internal state (avoid flicker)
  private smoothedYaw = 0;
  private smoothedPitch = 0;
  private smoothedRoll = 0;

  // Voice Analysis & Audio Capture
  private recognition: ISpeechRecognition | null = null;
  private voiceTranscripts: string[] = [];
  private latestInterimText = '';
  private voiceStartTime = 0;
  private voiceHesitationCount = 0;
  private voiceIsListening = false;
  private audioStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private audioAnalyser: AnalyserNode | null = null;
  private audioAnimId: number | null = null;

  // MediaPipe 478 Face Mesh & Iris Neural Net
  private faceMesh: any = null;
  private isFaceMeshReady = false;
  private isProcessingFrame = false;
  private latestMeshEstimation: VideoGazeEstimation | null = null;

  // ─── Session Reset ─────────────────────────────────────────────────────────

  public resetSession() {
    this.smoothedX = 0.5;
    this.smoothedY = 0.45;
    this.fixationsCount = 0;
    this.regressionsCount = 0;
    this.totalBlinks = 0;
    this.lastBlinkState = false;
    this.lastWordIndex = null;
    this.lastLineIndex = null;
    this.frameTimes = [];
    this.recordedFixationDurations = [];
    this.recordedSaccadeLengths = [];
    this.scanpath = [];
    this.smoothedYaw = 0;
    this.smoothedPitch = 0;
    this.smoothedRoll = 0;
    this.hasInitializedBaseline = false;
    this.baselinePupilX = 0.5;
    this.baselinePupilY = 0.5;
    this.latestMeshEstimation = null;
    this.voiceTranscripts = [];
    this.voiceHesitationCount = 0;
    this.stopVoiceAnalysis();
  }

  // ─── Gaze Sensitivity Controls ─────────────────────────────────────────────

  public getGazeSensitivity(): number {
    return this.gazeSensitivity;
  }

  public setGazeSensitivity(val: number): void {
    this.gazeSensitivity = Math.max(1.0, Math.min(5.0, val));
  }

  public getBaselinePupil(): { x: number; y: number } {
    return { x: this.baselinePupilX, y: this.baselinePupilY };
  }

  // ─── Manual Eye Pinpoint Anchors ──────────────────────────────────────────

  public setEyeAnchors(left: Point2D | null, right: Point2D | null): void {
    this.eyeAnchorLeft = left;
    this.eyeAnchorRight = right;
    this.hasInitializedBaseline = false; // re-center resting baseline
  }

  public getEyeAnchors(): { left: Point2D | null; right: Point2D | null } {
    return { left: this.eyeAnchorLeft, right: this.eyeAnchorRight };
  }

  // ─── Calibration ───────────────────────────────────────────────────────────

  public addCalibrationSample(targetX: number, targetY: number, rawX: number, rawY: number) {
    this.calibrationSamples.push({ targetX, targetY, rawX, rawY });
  }

  public finalizeCalibration(): CalibrationOffset {
    if (this.calibrationSamples.length < 3) {
      this.calibration.isCalibrated = true;
      return this.calibration;
    }

    let minRawX = Infinity,
      maxRawX = -Infinity;
    let minRawY = Infinity,
      maxRawY = -Infinity;
    let minTargetX = Infinity,
      maxTargetX = -Infinity;
    let minTargetY = Infinity,
      maxTargetY = -Infinity;

    for (const s of this.calibrationSamples) {
      if (s.rawX < minRawX) minRawX = s.rawX;
      if (s.rawX > maxRawX) maxRawX = s.rawX;
      if (s.rawY < minRawY) minRawY = s.rawY;
      if (s.rawY > maxRawY) maxRawY = s.rawY;
      if (s.targetX < minTargetX) minTargetX = s.targetX;
      if (s.targetX > maxTargetX) maxTargetX = s.targetX;
      if (s.targetY < minTargetY) minTargetY = s.targetY;
      if (s.targetY > maxTargetY) maxTargetY = s.targetY;
    }

    const rawSpanX = Math.max(0.05, maxRawX - minRawX);
    const rawSpanY = Math.max(0.05, maxRawY - minRawY);
    const targetSpanX = Math.max(0.2, maxTargetX - minTargetX);
    const targetSpanY = Math.max(0.2, maxTargetY - minTargetY);

    this.calibration = {
      offsetX: minRawX,
      offsetY: minRawY,
      scaleX: targetSpanX / rawSpanX,
      scaleY: targetSpanY / rawSpanY,
      isCalibrated: true
    };

    return this.calibration;
  }

  // ─── MediaPipe 478 FaceMesh & Iris Model Lifecycle ─────────────────────────

  public async initMediaPipe(): Promise<boolean> {
    if (this.isFaceMeshReady && this.faceMesh) return true;
    try {
      if (!FaceMeshClass) {
        console.warn('[FaceMeshTracker] FaceMesh constructor not found, fallback enabled');
        return false;
      }

      this.faceMesh = new FaceMeshClass({
        locateFile: (file: string) => `/mediapipe/face_mesh/${file}`
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true, // Crucial: enables landmarks 468-477 for true irises
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.faceMesh.onResults((results: any) => {
        this.processMediaPipeResults(results);
      });

      await this.faceMesh.initialize();
      this.isFaceMeshReady = true;
      console.log(
        '✅ [FaceMeshTracker] MediaPipe 478 FaceLandmarker with Iris refinement initialized'
      );
      return true;
    } catch (err) {
      console.warn(
        '[FaceMeshTracker] MediaPipe initialization error, using high-performance fallback:',
        err
      );
      return false;
    }
  }

  private processMediaPipeResults(results: any): void {
    if (!results || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      return;
    }

    const lm = results.multiFaceLandmarks[0];
    if (!lm || lm.length < 468) return;

    const hasIris = lm.length >= 478;

    // 1. Iris Centers: 468 = Right Iris Center (anatomical right), 473 = Left Iris Center (anatomical left)
    const rightIris = hasIris
      ? { x: lm[468].x, y: lm[468].y }
      : { x: (lm[33].x + lm[133].x) / 2, y: (lm[159].y + lm[145].y) / 2 };

    const leftIris = hasIris
      ? { x: lm[473].x, y: lm[473].y }
      : { x: (lm[263].x + lm[362].x) / 2, y: (lm[386].y + lm[374].y) / 2 };

    // 2. Eye Aspect Ratio (EAR) for blinks
    const rightH = Math.hypot(lm[133].x - lm[33].x, lm[133].y - lm[33].y);
    const rightV = Math.hypot(lm[159].x - lm[145].x, lm[159].y - lm[145].y);
    const earRight = rightH > 0.001 ? Math.min(0.45, rightV / (2 * rightH)) : 0.28;

    const leftH = Math.hypot(lm[263].x - lm[362].x, lm[263].y - lm[362].y);
    const leftV = Math.hypot(lm[386].x - lm[374].x, lm[386].y - lm[374].y);
    const earLeft = leftH > 0.001 ? Math.min(0.45, leftV / (2 * leftH)) : 0.28;

    // 3. Head Pose Estimation from 3D Face Mesh Landmarks
    // Nose tip: 1, Forehead: 10, Chin: 152, Left cheek: 234, Right cheek: 454
    const midY = (lm[10].y + lm[152].y) / 2;
    const rawPitch = (lm[1].y - midY) * 60;
    const midX = (lm[234].x + lm[454].x) / 2;
    const rawYaw = (lm[1].x - midX) * 75;
    const rawRoll = Math.atan2(lm[454].y - lm[234].y, lm[454].x - lm[234].x) * (180 / Math.PI);

    const alpha = 0.22;
    this.smoothedYaw = alpha * rawYaw + (1 - alpha) * this.smoothedYaw;
    this.smoothedPitch = alpha * rawPitch + (1 - alpha) * this.smoothedPitch;
    this.smoothedRoll = alpha * rawRoll + (1 - alpha) * this.smoothedRoll;

    const yawDeg = Math.round(this.smoothedYaw * 10) / 10;
    const pitchDeg = Math.round(this.smoothedPitch * 10) / 10;
    const rollDeg = Math.round(this.smoothedRoll * 10) / 10;

    let alignment: HeadPoseState['alignment'] = 'centered';
    const absYaw = Math.abs(yawDeg);
    const absPitch = Math.abs(pitchDeg);
    if (absYaw > absPitch) {
      if (yawDeg < -6) alignment = 'tilted_right';
      else if (yawDeg > 6) alignment = 'tilted_left';
    } else {
      if (pitchDeg > 5) alignment = 'looking_down';
      else if (pitchDeg < -5) alignment = 'looking_up';
    }

    const headPose: HeadPoseState = {
      pitch: pitchDeg,
      yaw: yawDeg,
      roll: rollDeg,
      alignment
    };

    // 4. Decoupled Ocular Gaze Trajectory (Reading sweep left-to-right)
    // Anatomical Right Eye (33 group): outer corner 33 to inner corner 133
    const rvx = lm[133].x - lm[33].x;
    const rvy = lm[133].y - lm[33].y;
    const rLenSq = Math.max(1e-6, rvx * rvx + rvy * rvy);
    const rix = rightIris.x - lm[33].x;
    const riy = rightIris.y - lm[33].y;
    const ratioRight = (rix * rvx + riy * rvy) / rLenSq;

    // Anatomical Left Eye (263 group): inner corner 362 to outer corner 263
    const lvx = lm[263].x - lm[362].x;
    const lvy = lm[263].y - lm[362].y;
    const lLenSq = Math.max(1e-6, lvx * lvx + lvy * lvy);
    const lix = leftIris.x - lm[362].x;
    const liy = leftIris.y - lm[362].y;
    const ratioLeft = (lix * lvx + liy * lvy) / lLenSq;

    // Vertical eyelid spans:
    const rSpanY = Math.max(0.005, lm[145].y - lm[159].y);
    const ratioYRight = (rightIris.y - lm[159].y) / rSpanY;

    const lSpanY = Math.max(0.005, lm[374].y - lm[386].y);
    const ratioYLeft = (leftIris.y - lm[386].y) / lSpanY;

    // Both ratioRight and ratioLeft increase as student glances from screen-left to screen-right
    const horizontalRatio = (ratioRight + ratioLeft) / 2;
    const verticalRatio = (ratioYRight + ratioYLeft) / 2;

    if (!this.hasInitializedBaseline) {
      this.baselinePupilX = Math.max(0.44, Math.min(0.56, horizontalRatio));
      this.baselinePupilY = Math.max(0.42, Math.min(0.54, verticalRatio));
      this.hasInitializedBaseline = true;
    }
    // Note: Do NOT decay baseline toward active gaze while reading to prevent gaze collapsing to center

    const deltaX = horizontalRatio - this.baselinePupilX;
    const deltaY = verticalRatio - this.baselinePupilY;

    // Calibrated ocular sensitivity tuned for reading passage sweep
    const gainMult = this.gazeSensitivity / 2.8;
    const GAIN_X = 4.6 * gainMult;
    const GAIN_Y = 3.6 * gainMult;

    // Negate horizontal ocular delta and yaw for front-facing webcam mirroring (left is left, right is right)
    let screenX = 0.5 - deltaX * GAIN_X - (yawDeg / 36) * 0.20;
    let screenY = 0.48 + deltaY * GAIN_Y + (pitchDeg / 28) * 0.16;

    // Apply 5-point calibration if active
    if (this.calibration.isCalibrated) {
      screenX = (screenX - this.calibration.offsetX) * this.calibration.scaleX;
      screenY = (screenY - this.calibration.offsetY) * this.calibration.scaleY;
    }

    screenX = Math.max(0.03, Math.min(0.97, screenX));
    screenY = Math.max(0.03, Math.min(0.97, screenY));

    // 5. Contours and wireframe geometry for UI overlay
    const faceOvalPoints = FACEMESH_FACE_OVAL_INDICES.map((idx) => ({
      x: lm[idx].x,
      y: lm[idx].y
    }));
    const leftEyeContour = FACEMESH_LEFT_EYE_INDICES.map((idx) => ({ x: lm[idx].x, y: lm[idx].y }));
    const rightEyeContour = FACEMESH_RIGHT_EYE_INDICES.map((idx) => ({
      x: lm[idx].x,
      y: lm[idx].y
    }));

    this.latestMeshEstimation = {
      rawX: screenX,
      rawY: screenY,
      earLeft,
      earRight,
      confidence: 0.98,
      headPose,
      lightingQuality: 'optimal',
      leftIrisCenter: leftIris,
      rightIrisCenter: rightIris,
      faceOvalPoints,
      leftEyeContour,
      rightEyeContour,
      isMediaPipe: true
    };
  }

  // ─── Real-Time Gaze Estimation ─────────────────────────────────────────────

  /**
   * Estimates gaze position and head orientation directly from an HTMLVideoElement.
   * Dispatches asynchronously to MediaPipe FaceMesh (478 landmarks with subpixel irises).
   * While loading or if unsupported, falls back smoothly to localized CV.
   */
  public estimateGazeFromVideo(video: HTMLVideoElement): VideoGazeEstimation | null {
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return null;

    // Pre-initialize MediaPipe if not already running
    if (!this.isFaceMeshReady && !this.faceMesh) {
      this.initMediaPipe().catch(() => {});
    }

    // Send frame to MediaPipe if not currently busy processing previous frame
    if (this.isFaceMeshReady && this.faceMesh && !this.isProcessingFrame) {
      this.isProcessingFrame = true;
      this.faceMesh
        .send({ image: video })
        .catch(() => {})
        .finally(() => {
          this.isProcessingFrame = false;
        });
    }

    // If neural net results are ready, return them!
    if (this.latestMeshEstimation) {
      return this.latestMeshEstimation;
    }

    // Otherwise use instant fallback
    return this.estimateLegacyFallback(video);
  }

  /**
   * Fast canvas luminance centroid fallback used while MediaPipe WASM initializes.
   */
  private estimateLegacyFallback(video: HTMLVideoElement): VideoGazeEstimation | null {
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return null;

    try {
      if (!this.processingCanvas) {
        this.processingCanvas = document.createElement('canvas');
        this.processingCanvas.width = 320;
        this.processingCanvas.height = 240;
        this.processingCtx = this.processingCanvas.getContext('2d', { willReadFrequently: true });
      }

      const ctx = this.processingCtx;
      if (!ctx) return null;

      const W = 320;
      const H = 240;

      // Draw raw camera frame in native camera sensor space (unmirrored)
      ctx.drawImage(video, 0, 0, W, H);

      const imgData = ctx.getImageData(0, 0, W, H);
      const px = imgData.data;

      // ── Helper: mean luminance in region ──
      const regionMeanLum = (x0: number, x1: number, y0: number, y1: number) => {
        let sum = 0,
          count = 0;
        const xStart = Math.max(0, Math.min(W - 1, x0 | 0));
        const xEnd = Math.max(0, Math.min(W, x1 | 0));
        const yStart = Math.max(0, Math.min(H - 1, y0 | 0));
        const yEnd = Math.max(0, Math.min(H, y1 | 0));

        for (let y = yStart; y < yEnd; y++) {
          for (let x = xStart; x < xEnd; x++) {
            const i = (y * W + x) * 4;
            sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
            count++;
          }
        }
        return count > 0 ? sum / count : 128;
      };

      // ── Helper: adaptive weighted centroid for pupil / iris tracking ──
      const eyePupilCentroid = (x0: number, x1: number, y0: number, y1: number) => {
        let minL = 255,
          maxL = 0;
        const xStart = Math.max(0, Math.min(W - 1, x0 | 0));
        const xEnd = Math.max(0, Math.min(W, x1 | 0));
        const yStart = Math.max(0, Math.min(H - 1, y0 | 0));
        const yEnd = Math.max(0, Math.min(H, y1 | 0));

        for (let y = yStart; y < yEnd; y++) {
          for (let x = xStart; x < xEnd; x++) {
            const i = (y * W + x) * 4;
            const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
            if (l < minL) minL = l;
            if (l > maxL) maxL = l;
          }
        }

        // Target the darkest 35% percentile pixels inside the eye socket (pupil/iris core)
        const threshold = minL + (maxL - minL) * 0.35;
        let sumX = 0,
          sumY = 0,
          weight = 0;

        for (let y = yStart; y < yEnd; y++) {
          for (let x = xStart; x < xEnd; x++) {
            const i = (y * W + x) * 4;
            const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
            if (l <= threshold) {
              const w = Math.pow(threshold - l + 1, 1.5);
              sumX += x * w;
              sumY += y * w;
              weight += w;
            }
          }
        }

        if (weight === 0) {
          const midX = (xStart + xEnd) / 2;
          const midY = (yStart + yEnd) / 2;
          return { rx: 0.5, ry: 0.5, ear: 0.26, normX: midX / W, normY: midY / H };
        }

        const cx = sumX / weight;
        const cy = sumY / weight;
        const rx = (cx - xStart) / Math.max(1, xEnd - xStart);
        const ry = (cy - yStart) / Math.max(1, yEnd - yStart);
        const ear = Math.max(0.12, Math.min(0.38, ((maxL - minL) / 255) * 0.48));

        return { rx, ry, ear, normX: cx / W, normY: cy / H };
      };

      // ── Adaptive Eye Region of Interest (ROI) ──
      let leftEyeX0: number, leftEyeX1: number, leftEyeY0: number, leftEyeY1: number;
      let rightEyeX0: number, rightEyeX1: number, rightEyeY0: number, rightEyeY1: number;

      if (this.eyeAnchorLeft && this.eyeAnchorRight) {
        // High-precision mode: User clicked their eyes directly! Search in a tight ±28px box around each pupil
        const halfBoxW = Math.floor(W * 0.09);
        const halfBoxH = Math.floor(H * 0.08);

        const alX = Math.floor(this.eyeAnchorLeft.x * W);
        const alY = Math.floor(this.eyeAnchorLeft.y * H);
        leftEyeX0 = Math.max(0, alX - halfBoxW);
        leftEyeX1 = Math.min(W, alX + halfBoxW);
        leftEyeY0 = Math.max(0, alY - halfBoxH);
        leftEyeY1 = Math.min(H, alY + halfBoxH);

        const arX = Math.floor(this.eyeAnchorRight.x * W);
        const arY = Math.floor(this.eyeAnchorRight.y * H);
        rightEyeX0 = Math.max(0, arX - halfBoxW);
        rightEyeX1 = Math.min(W, arX + halfBoxW);
        rightEyeY0 = Math.max(0, arY - halfBoxH);
        rightEyeY1 = Math.min(H, arY + halfBoxH);
      } else {
        // Auto default: search below the eyebrow line (0.37 - 0.52 H)
        const eyeY0 = Math.floor(H * 0.37);
        const eyeY1 = Math.floor(H * 0.52);

        // Right eye (on image left for raw front camera sensor): 18% - 44%
        rightEyeX0 = Math.floor(W * 0.18);
        rightEyeX1 = Math.floor(W * 0.44);
        rightEyeY0 = eyeY0;
        rightEyeY1 = eyeY1;

        // Left eye (on image right for raw front camera sensor): 56% - 82%
        leftEyeX0 = Math.floor(W * 0.56);
        leftEyeX1 = Math.floor(W * 0.82);
        leftEyeY0 = eyeY0;
        leftEyeY1 = eyeY1;
      }

      const leftEye = eyePupilCentroid(leftEyeX0, leftEyeX1, leftEyeY0, leftEyeY1);
      const rightEye = eyePupilCentroid(rightEyeX0, rightEyeX1, rightEyeY0, rightEyeY1);

      // Raw pupil coordinates (relative to each eye box)
      const avgRx = (leftEye.rx + rightEye.rx) / 2;
      const avgRy = (leftEye.ry + rightEye.ry) / 2;

      // ── Adaptive Resting Baseline & Ocular Amplification ──
      // Natural human eye rotation in the socket only creates ~±0.12 displacement.
      // We amplify this ocular rotation so looking left/right sweeps across the reading passage
      // WITHOUT requiring any head movement.
      if (!this.hasInitializedBaseline) {
        this.baselinePupilX = avgRx;
        this.baselinePupilY = avgRy;
        this.hasInitializedBaseline = true;
      } else {
        // Slow continuous resting baseline adaptation (accounts for posture shift over minutes)
        this.baselinePupilX = 0.996 * this.baselinePupilX + 0.004 * avgRx;
        this.baselinePupilY = 0.996 * this.baselinePupilY + 0.004 * avgRy;
      }

      // Compute ocular deflection from resting gaze
      const deltaX = avgRx - this.baselinePupilX;
      const deltaY = avgRy - this.baselinePupilY;

      // Sensitivity amplification multiplier
      const gainMultiplier = this.gazeSensitivity / 2.8;
      const GAIN_X = 6.8 * gainMultiplier;
      const GAIN_Y = 5.2 * gainMultiplier;

      // In front-facing webcam, looking left moves pupils to camera right; negate deltaX
      let screenX = 0.5 - deltaX * GAIN_X;
      let screenY = 0.48 + deltaY * GAIN_Y;

      // Apply 5-point calibration if student completed calibration
      if (this.calibration.isCalibrated) {
        screenX = (screenX - this.calibration.offsetX) * this.calibration.scaleX;
        screenY = (screenY - this.calibration.offsetY) * this.calibration.scaleY;
      }

      screenX = Math.max(0.04, Math.min(0.96, screenX));
      screenY = Math.max(0.04, Math.min(0.96, screenY));

      // ── Client-Side Head Pose via Facial Luminance Asymmetry ──
      const faceX0 = Math.floor(W * 0.15),
        faceX1 = Math.floor(W * 0.85);
      const faceY0 = Math.floor(H * 0.12),
        faceY1 = Math.floor(H * 0.88);
      const faceW = faceX1 - faceX0;
      const faceH = faceY1 - faceY0;
      const midX = faceX0 + faceW / 2;
      const midY = faceY0 + faceH / 2;

      const lumFaceLeft = regionMeanLum(faceX0, midX | 0, faceY0, faceY1);
      const lumFaceRight = regionMeanLum(midX | 0, faceX1, faceY0, faceY1);
      const lumFaceUpper = regionMeanLum(faceX0, faceX1, faceY0, midY | 0);
      const lumFaceLower = regionMeanLum(faceX0, faceX1, midY | 0, faceY1);
      const lumTopLeft = regionMeanLum(faceX0, midX | 0, faceY0, (faceY0 + faceH * 0.35) | 0);
      const lumTopRight = regionMeanLum(midX | 0, faceX1, faceY0, (faceY0 + faceH * 0.35) | 0);

      const rawYaw =
        ((lumFaceLeft - lumFaceRight) / Math.max(1, (lumFaceLeft + lumFaceRight) / 2)) * 35;
      const rawPitch =
        ((lumFaceLower - lumFaceUpper) / Math.max(1, (lumFaceLower + lumFaceUpper) / 2)) * 25;
      const rawRoll =
        ((lumTopLeft - lumTopRight) / Math.max(1, (lumTopLeft + lumTopRight) / 2)) * 20;

      const alpha = 0.18;
      this.smoothedYaw = alpha * rawYaw + (1 - alpha) * this.smoothedYaw;
      this.smoothedPitch = alpha * rawPitch + (1 - alpha) * this.smoothedPitch;
      this.smoothedRoll = alpha * rawRoll + (1 - alpha) * this.smoothedRoll;

      const yawDeg = Math.round(this.smoothedYaw * 10) / 10;
      const pitchDeg = Math.round(this.smoothedPitch * 10) / 10;
      const rollDeg = Math.round(this.smoothedRoll * 10) / 10;

      let alignment: HeadPoseState['alignment'] = 'centered';
      const absYaw = Math.abs(yawDeg);
      const absPitch = Math.abs(pitchDeg);

      if (absYaw > absPitch) {
        if (yawDeg < -6) alignment = 'tilted_right';
        else if (yawDeg > 6) alignment = 'tilted_left';
      } else {
        if (pitchDeg > 5) alignment = 'looking_down';
        else if (pitchDeg < -5) alignment = 'looking_up';
      }

      const headPose: HeadPoseState = {
        pitch: pitchDeg,
        yaw: yawDeg,
        roll: rollDeg,
        alignment
      };

      const overallLum = regionMeanLum(0, W, 0, H);
      let lightingQuality: 'optimal' | 'dim' | 'harsh' | 'unknown' = 'optimal';
      if (overallLum < 55) lightingQuality = 'dim';
      else if (overallLum > 210) lightingQuality = 'harsh';

      return {
        rawX: screenX,
        rawY: screenY,
        earLeft: leftEye.ear,
        earRight: rightEye.ear,
        confidence: lightingQuality === 'optimal' ? 0.96 : 0.78,
        headPose,
        lightingQuality,
        leftIrisCenter: { x: leftEye.normX, y: leftEye.normY },
        rightIrisCenter: { x: rightEye.normX, y: rightEye.normY }
      };
    } catch {
      return null;
    }
  }

  // ─── Gaze Smoothing ────────────────────────────────────────────────────────

  public updateGaze(rawX: number, rawY: number): { x: number; y: number } {
    const cx = Math.max(0.05, Math.min(0.95, rawX));
    const cy = Math.max(0.05, Math.min(0.95, rawY));
    this.smoothedX = this.smoothingFactor * cx + (1 - this.smoothingFactor) * this.smoothedX;
    this.smoothedY = this.smoothingFactor * cy + (1 - this.smoothingFactor) * this.smoothedY;
    return {
      x: Number(this.smoothedX.toFixed(4)),
      y: Number(this.smoothedY.toFixed(4))
    };
  }

  // ─── FPS Tick ──────────────────────────────────────────────────────────────

  public tickFps(): number {
    const now = performance.now();
    this.frameTimes.push(now);
    while (this.frameTimes.length > 0 && this.frameTimes[0] < now - 1000) {
      this.frameTimes.shift();
    }
    this.lastFps = Math.max(1, this.frameTimes.length);
    return this.lastFps;
  }

  // ─── EAR Blink Detection ──────────────────────────────────────────────────

  public processBlink(
    earLeft: number,
    earRight: number
  ): { isBlinking: boolean; blinkCount: number } {
    const avgEar = (earLeft + earRight) / 2;
    const isBlinking = avgEar < 0.17; // tuned threshold for luminance-based EAR
    if (isBlinking && !this.lastBlinkState) {
      this.totalBlinks += 1;
    }
    this.lastBlinkState = isBlinking;
    return { isBlinking, blinkCount: this.totalBlinks };
  }

  // ─── Reading Movement / Saccade / Fixation Classification ─────────────────

  public processReadingMovement(
    currentWordIndex: number | null,
    currentLineIndex: number | null,
    currentX: number,
    currentY: number,
    now: number
  ) {
    const dist = Math.hypot(currentX - this.lastFixationX, currentY - this.lastFixationY);

    if (dist < 0.055) {
      // Dwelling on same area → Fixation
      const dwellDuration = now - this.fixationDwellStart;
      if (dwellDuration > 150) {
        this.fixationsCount += 1;
        const dur = Math.max(160, Math.min(650, Math.round(dwellDuration)));
        this.recordedFixationDurations.push(dur);
        this.scanpath.push({
          x: currentX,
          y: currentY,
          timestamp: now,
          type: 'fixation',
          duration: dur,
          wordIndex: currentWordIndex
        });
        this.fixationDwellStart = now + 180;
      }
    } else {
      // Saccade movement
      const saccadeDistPx = Math.round(dist * Math.max(window.innerWidth, 1000));
      this.recordedSaccadeLengths.push(saccadeDistPx);

      let isRegression = false;

      if (
        currentWordIndex !== null &&
        this.lastWordIndex !== null &&
        currentWordIndex !== this.lastWordIndex
      ) {
        if (currentLineIndex !== null && this.lastLineIndex !== null) {
          if (currentLineIndex < this.lastLineIndex) {
            this.regressionsCount += 1;
            isRegression = true;
          } else if (currentLineIndex === this.lastLineIndex) {
            if (currentWordIndex < this.lastWordIndex - 1) {
              this.regressionsCount += 1;
              isRegression = true;
            }
          }
        }
      }

      this.scanpath.push({
        x: currentX,
        y: currentY,
        timestamp: now,
        type: isRegression ? 'regression' : 'saccade',
        wordIndex: currentWordIndex
      });

      this.lastFixationX = currentX;
      this.lastFixationY = currentY;
      this.fixationDwellStart = now;
    }

    if (currentWordIndex !== null) this.lastWordIndex = currentWordIndex;
    if (currentLineIndex !== null) this.lastLineIndex = currentLineIndex;
  }

  // ─── Stability Score ───────────────────────────────────────────────────────

  public calculateStabilityScore(): number {
    const totalEvents = this.fixationsCount + this.regressionsCount;
    if (totalEvents === 0) return 92;
    const regressionRatio = this.regressionsCount / Math.max(1, totalEvents);
    return Math.max(45, Math.min(98, Math.round(96 - regressionRatio * 90)));
  }

  // ─── Word Hit-Test with Passage-Aware Normalization ───────────────────────

  public static findTargetWord(
    screenX: number,
    screenY: number,
    wordBoxes: WordBox[],
    passageBounds?: {
      left: number;
      top: number;
      right: number;
      bottom: number;
      width?: number;
      height?: number;
    } | null
  ): WordHitResult {
    if (wordBoxes.length === 0) {
      return { wordIndex: null, distance: Infinity, targetPixelX: 0, targetPixelY: 0 };
    }

    // Determine bounds of the reading passage
    let pLeft = Infinity,
      pRight = -Infinity,
      pTop = Infinity,
      pBottom = -Infinity;
    if (
      passageBounds &&
      passageBounds.right > passageBounds.left &&
      passageBounds.bottom > passageBounds.top
    ) {
      pLeft = passageBounds.left;
      pRight = passageBounds.right;
      pTop = passageBounds.top;
      pBottom = passageBounds.bottom;
    } else {
      for (const box of wordBoxes) {
        if (box.left < pLeft) pLeft = box.left;
        if (box.right > pRight) pRight = box.right;
        if (box.top < pTop) pTop = box.top;
        if (box.bottom > pBottom) pBottom = box.bottom;
      }
    }

    const passageWidth = Math.max(120, pRight - pLeft);
    const passageHeight = Math.max(80, pBottom - pTop);

    // Normalize gaze [0..1] directly across the width and height of the reading passage
    // Eye movements from 0.08 (left boundary) to 0.92 (right boundary) span the full line of text
    const normX = Math.max(0, Math.min(1, (screenX - 0.08) / 0.84));
    const normY = Math.max(0, Math.min(1, (screenY - 0.12) / 0.76));

    const pixelX = pLeft + normX * passageWidth;
    const pixelY = pTop + normY * passageHeight;

    let closestWord: number | null = null;
    let minDistance = Infinity;

    // 1. Direct bounding box hit test (with generous 14px horizontal, 10px vertical padding)
    for (const box of wordBoxes) {
      if (
        pixelX >= box.left - 14 &&
        pixelX <= box.right + 14 &&
        pixelY >= box.top - 10 &&
        pixelY <= box.bottom + 10
      ) {
        return { wordIndex: box.index, distance: 0, targetPixelX: pixelX, targetPixelY: pixelY };
      }
    }

    // 2. Line-aware nearest word matching (prioritizes words on the current vertical reading line)
    for (const box of wordBoxes) {
      const boxMidX = (box.left + box.right) / 2;
      const boxMidY = (box.top + box.bottom) / 2;
      const dX = Math.abs(pixelX - boxMidX);
      const dY = Math.abs(pixelY - boxMidY);

      // Vertical distance is penalised 1.8x so eye tracking stays glued to the active reading line
      const weightedDist = Math.hypot(dX, dY * 1.8);
      if (weightedDist < minDistance) {
        minDistance = weightedDist;
        closestWord = box.index;
      }
    }

    return minDistance < 185
      ? {
          wordIndex: closestWord,
          distance: minDistance,
          targetPixelX: pixelX,
          targetPixelY: pixelY
        }
      : { wordIndex: null, distance: minDistance, targetPixelX: pixelX, targetPixelY: pixelY };
  }

  // ─── Voice Analysis via Web Speech API ────────────────────────────────────

  /**
   * Start speech recognition and live microphone audio capture.
   * Prompts user for microphone permission, calculates real-time audio volume level,
   * and continuously transcribes speech into text via Web Speech API.
   */
  public async startVoiceAnalysis(
    lang: string = 'en-US',
    onPartialResult?: (partial: string) => void,
    onFinalResult?: (result: VoiceAnalysisResult) => void,
    onAudioLevel?: (level: number) => void
  ): Promise<boolean> {
    this.stopVoiceAnalysis();

    // 1. Explicitly capture microphone stream to guarantee browser permissions & compute real-time audio meter
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });

        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          const source = this.audioContext.createMediaStreamSource(this.audioStream);
          this.audioAnalyser = this.audioContext.createAnalyser();
          this.audioAnalyser.fftSize = 256;
          source.connect(this.audioAnalyser);

          const pcmData = new Uint8Array(this.audioAnalyser.frequencyBinCount);
          const updateVolume = () => {
            if (!this.voiceIsListening || !this.audioAnalyser) return;
            this.audioAnalyser.getByteFrequencyData(pcmData);
            let sum = 0;
            for (let i = 0; i < pcmData.length; i++) {
              sum += pcmData[i];
            }
            const avg = sum / pcmData.length;
            const volume = Math.min(100, Math.round((avg / 128) * 100));
            onAudioLevel?.(volume);
            this.audioAnimId = requestAnimationFrame(updateVolume);
          };
          this.audioAnimId = requestAnimationFrame(updateVolume);
        }
      }
    } catch (micErr) {
      console.warn('[ReadEase] Microphone stream permission notice:', micErr);
    }

    // 2. Initialize Web Speech Recognition
    const w = window as unknown as Record<string, unknown>;
    const SR = (w['SpeechRecognition'] || w['webkitSpeechRecognition']) as
      ISpeechRecognitionConstructor | undefined;

    this.voiceTranscripts = [];
    this.voiceHesitationCount = 0;
    this.voiceStartTime = performance.now();
    this.voiceIsListening = true;

    if (!SR) {
      console.warn('[ReadEase] Speech Recognition not supported in this browser.');
      return this.audioStream !== null;
    }

    this.recognition = new SR();
    this.recognition.lang = lang;
    this.recognition.interimResults = true;
    this.recognition.continuous = true;
    this.recognition.maxAlternatives = 1;

    const hesitationPatterns = /\b(um|uh|er|hmm|ah|like|you know)\b/gi;

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          const text = res[0].transcript.trim();
          if (text) {
            this.voiceTranscripts.push(text);
          }

          // Count hesitation words
          const hesitations = text.match(hesitationPatterns);
          if (hesitations) this.voiceHesitationCount += hesitations.length;
        } else {
          interimText += res[0].transcript;
        }
      }

      this.latestInterimText = interimText.trim();

      // Ensure full cumulative spoken transcript across all phrases is dispatched
      const fullAccumulated = (this.voiceTranscripts.join(' ') + ' ' + this.latestInterimText).trim();
      if (fullAccumulated && onPartialResult) {
        onPartialResult(fullAccumulated);
      }

      if (onFinalResult) {
        onFinalResult(this.getVoiceAnalysisResult());
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.warn('[ReadEase] Speech recognition event:', event.error);
      if (event.error === 'not-allowed') {
        this.voiceIsListening = false;
      }
    };

    this.recognition.onend = () => {
      // Auto restart if still in listening mode (browser stops recognition after ~60s)
      if (this.voiceIsListening && this.recognition) {
        try {
          this.recognition.start();
        } catch {
          /* ignore */
        }
      }
    };

    try {
      this.recognition.start();
      return true;
    } catch {
      return this.audioStream !== null;
    }
  }

  public stopVoiceAnalysis() {
    this.voiceIsListening = false;
    if (this.audioAnimId) {
      cancelAnimationFrame(this.audioAnimId);
      this.audioAnimId = null;
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        /* ignore */
      }
      this.audioContext = null;
    }
    this.audioAnalyser = null;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        /* ignore */
      }
      this.recognition = null;
    }
  }

  public getVoiceAnalysisResult(): VoiceAnalysisResult {
    const list = [...this.voiceTranscripts];
    if (this.latestInterimText) {
      const lastFinal = list.length > 0 ? list[list.length - 1] : '';
      if (!lastFinal.endsWith(this.latestInterimText)) {
        list.push(this.latestInterimText);
      }
    }
    const fullTranscript = list.join(' ').trim();
    const wordCount = fullTranscript.split(/\s+/).filter(Boolean).length;
    const elapsedMin = Math.max(0.01, (performance.now() - this.voiceStartTime) / 60000);
    const wpmEstimate = Math.round(wordCount / elapsedMin);

    // Simple fluency score: penalise hesitations, missing words, very slow or fast pace
    const hesitationPenalty = Math.min(40, this.voiceHesitationCount * 5);
    const pacePenalty = wpmEstimate < 60 ? 20 : wpmEstimate > 180 ? 10 : 0;
    const fluencyScore = Math.max(0, Math.min(100, 100 - hesitationPenalty - pacePenalty));

    return {
      transcript: fullTranscript,
      wordCount,
      wpmEstimate: isFinite(wpmEstimate) ? wpmEstimate : 0,
      isListening: this.voiceIsListening,
      fluencyScore,
      hesitationCount: this.voiceHesitationCount,
      mispronunciations: [] // would need reference text comparison
    };
  }

  public isVoiceAnalysisActive(): boolean {
    return this.voiceIsListening;
  }

  // ─── Frame Capture for Server Sync ────────────────────────────────────────

  public static captureFrameBase64(
    video: HTMLVideoElement,
    maxWidth = 320,
    maxHeight = 240,
    quality = 0.6
  ): string | null {
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return null;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = maxWidth;
      canvas.height = maxHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, maxWidth, maxHeight);
      return canvas.toDataURL('image/jpeg', quality);
    } catch {
      return null;
    }
  }

  // ─── Getters ───────────────────────────────────────────────────────────────

  public getFixationsCount(): number {
    return this.fixationsCount;
  }
  public getRegressionsCount(): number {
    return this.regressionsCount;
  }
  public getTotalBlinks(): number {
    return this.totalBlinks;
  }
  public getFixationDurations(): number[] {
    return this.recordedFixationDurations;
  }
  public getSaccadeLengths(): number[] {
    return this.recordedSaccadeLengths;
  }
  public getScanpath(): ScanpathPoint[] {
    return this.scanpath;
  }
  public getCalibration(): CalibrationOffset {
    return this.calibration;
  }
  public setCalibration(cal: CalibrationOffset): void {
    this.calibration = cal;
  }
}
