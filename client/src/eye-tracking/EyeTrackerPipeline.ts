/**
 * ReadEase Unified Eye Tracking & Reading Behavior Pipeline
 *
 * Master coordinator unifying:
 * - MediaPipe 478 Face Mesh
 * - Geometric Gaze Estimator
 * - 3D Head Pose Estimator
 * - 2D Polynomial Calibration Engine
 * - One Euro Adaptive Velocity Filter
 * - Dynamic Text Layout Engine
 * - Fixation / Saccade / Regression / Line / Blink / Expression Detectors
 */

import * as faceMeshModule from '@mediapipe/face_mesh';
import type {
  Point2D,
  Point3D,
  HeadPoseState,
  FilteredGazePoint,
  ObservableFacialSignals,
  ReadingSessionMetrics
} from './types';
import { GeometricGazeEstimator } from './core/GazeEstimator';
import { HeadPoseEstimator } from './core/HeadPoseEstimator';
import { BlinkDetector } from './core/BlinkDetector';
import { CalibrationEngine } from './calibration/CalibrationEngine';
import { OneEuroFilter2D } from './filters/OneEuroFilter';
import { TextLayoutEngine, type TextHitResult } from './analysis/TextLayoutEngine';
import { ReadingAnalyticsEngine } from './analysis/ReadingAnalyticsEngine';

// Canonical landmark indices
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

const FaceMeshConstructor: any =
  (faceMeshModule as any).FaceMesh ||
  (faceMeshModule as any).default?.FaceMesh ||
  (faceMeshModule as any).default ||
  (typeof window !== 'undefined' && (window as any).FaceMesh);

export interface TrackingFrameResult {
  timestamp: number;
  rawGazeX: number;
  rawGazeY: number;
  screenX: number;
  screenY: number;
  pixelX: number;
  pixelY: number;
  velocityPxPerMs: number;

  // Text reading state
  activeWordIndex: number | null;
  activeWordText: string | null;
  activeLineIndex: number | null;
  isDirectWordHit: boolean;
  targetPixelX: number;
  targetPixelY: number;

  // Reading behavior flags
  isFixating: boolean;
  activeFixationDurationMs: number;
  isSaccade: boolean;
  isBlinking: boolean;
  totalBlinks: number;

  // Head and face signals
  headPose: HeadPoseState;
  facialSignals: ObservableFacialSignals;
  confidence: number;
  fps: number;

  // 2D wireframe overlay data
  faceOvalPoints: Point2D[];
  leftEyeContour: Point2D[];
  rightEyeContour: Point2D[];
  leftIrisCenter: Point2D;
  rightIrisCenter: Point2D;
}

export class EyeTrackerPipeline {
  private faceMesh: any = null;
  private isFaceMeshReady = false;
  private isProcessingFrame = false;

  // Components
  public gazeEstimator = new GeometricGazeEstimator();
  public headPoseEstimator = new HeadPoseEstimator();
  public blinkDetector = new BlinkDetector();
  public calibrationEngine = new CalibrationEngine();
  public filter2D = new OneEuroFilter2D();
  public textLayoutEngine = new TextLayoutEngine();
  public analyticsEngine = new ReadingAnalyticsEngine();

  // State
  private gazeSensitivity = 2.8;
  private lastGazePoint: FilteredGazePoint | null = null;
  private latestFrameResult: TrackingFrameResult | null = null;
  private frameTimestamps: number[] = [];
  private currentFps = 30;

  public async initialize(): Promise<boolean> {
    if (this.isFaceMeshReady && this.faceMesh) return true;

    try {
      if (!FaceMeshConstructor) {
        console.warn('[EyeTrackerPipeline] FaceMesh constructor unavailable');
        return false;
      }

      this.faceMesh = new FaceMeshConstructor({
        locateFile: (file: string) => `/mediapipe/face_mesh/${file}`
      });

      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true, // Enables landmarks 468-477 for irises
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      this.faceMesh.onResults((results: any) => {
        this.handleFaceMeshResults(results);
      });

      await this.faceMesh.initialize();
      this.isFaceMeshReady = true;
      console.log(
        '✅ [EyeTrackerPipeline] MediaPipe 478 FaceLandmarker with Iris Refinement Ready'
      );
      return true;
    } catch (err) {
      console.warn('[EyeTrackerPipeline] MediaPipe initialization error:', err);
      return false;
    }
  }

  public bindTextContainer(element: HTMLElement | null): void {
    this.textLayoutEngine.bindContainer(element);
  }

  public setGazeSensitivity(val: number): void {
    this.gazeSensitivity = Math.max(1.0, Math.min(5.0, val));
  }

  public getGazeSensitivity(): number {
    return this.gazeSensitivity;
  }

  public processVideoFrame(video: HTMLVideoElement): TrackingFrameResult | null {
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return null;

    // Track FPS
    const now = performance.now();
    this.frameTimestamps.push(now);
    while (this.frameTimestamps.length > 0 && this.frameTimestamps[0] < now - 1000) {
      this.frameTimestamps.shift();
    }
    this.currentFps = Math.max(1, this.frameTimestamps.length);

    // Ensure model is initialized
    if (!this.isFaceMeshReady && !this.faceMesh) {
      this.initialize().catch(() => {});
    }

    // Send frame asynchronously to MediaPipe
    if (this.isFaceMeshReady && this.faceMesh && !this.isProcessingFrame) {
      this.isProcessingFrame = true;
      this.faceMesh
        .send({ image: video })
        .catch(() => {})
        .finally(() => {
          this.isProcessingFrame = false;
        });
    }

    return this.latestFrameResult;
  }

  private handleFaceMeshResults(results: any): void {
    if (!results || !results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      return;
    }

    const lm = results.multiFaceLandmarks[0] as Point3D[];
    if (!lm || lm.length < 468) return;

    const timestamp = performance.now();

    // 1. Head Pose & Distance
    const headPose = this.headPoseEstimator.estimateHeadPose(lm);

    // 2. Raw Geometric Gaze Estimation
    const rawGaze = this.gazeEstimator.estimateGaze(lm, headPose, timestamp);
    if (!rawGaze) return;

    // 3. Blink Detection
    const blinkRes = this.blinkDetector.processEAR(rawGaze.earLeft, rawGaze.earRight, timestamp);

    // 4. Polynomial Calibration Mapping (Ocular gaze + Head pose -> Screen coordinates)
    const calibratedScreen = this.calibrationEngine.mapGazeToScreen(
      rawGaze.rawGazeX,
      rawGaze.rawGazeY,
      headPose.yaw,
      headPose.pitch
    );

    // Sensitivity amplification
    const gain = this.gazeSensitivity / 2.8;
    const amplX = 0.5 + (calibratedScreen.x - 0.5) * gain;
    const amplY = 0.5 + (calibratedScreen.y - 0.5) * gain;
    const normX = Math.max(0.02, Math.min(0.98, amplX));
    const normY = Math.max(0.02, Math.min(0.98, amplY));

    // 5. Adaptive Velocity Temporal Filtering (One Euro Filter)
    const filtered = this.filter2D.filter(normX, normY, timestamp);

    const winW = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const screenPxX = Math.round(filtered.x * winW);
    const screenPxY = Math.round(filtered.y * winH);

    // Calculate gaze velocity (px per ms)
    let velocityPxPerMs = 0;
    if (this.lastGazePoint) {
      const dt = Math.max(1, timestamp - this.lastGazePoint.timestamp);
      const dist = Math.hypot(
        screenPxX - this.lastGazePoint.screenPixelX,
        screenPxY - this.lastGazePoint.screenPixelY
      );
      velocityPxPerMs = dist / dt;
    }

    this.lastGazePoint = {
      x: filtered.x,
      y: filtered.y,
      screenPixelX: screenPxX,
      screenPixelY: screenPxY,
      timestamp,
      confidence: rawGaze.confidence,
      velocity: velocityPxPerMs
    };

    // 6. DOM Text Geometry Hit-Testing
    const hit: TextHitResult = this.textLayoutEngine.hitTestGaze(screenPxX, screenPxY);

    if (hit.wordIndex !== null) {
      this.analyticsEngine.registerWordRead(hit.wordIndex);
    }
    this.analyticsEngine.recordConfidence(rawGaze.confidence);

    // 7. Fixation Detection (I-VT)
    const fixRes = this.analyticsEngine.fixationDetector.processSample(
      filtered.x,
      filtered.y,
      screenPxX,
      screenPxY,
      velocityPxPerMs,
      hit.wordIndex,
      hit.wordText,
      hit.lineIndex,
      timestamp,
      rawGaze.confidence
    );

    if (fixRes.newCompletedFixation) {
      this.analyticsEngine.lineTracker.registerFixation();
    }

    // 8. Saccade Detection
    const sacRes = this.analyticsEngine.saccadeDetector.processSample(
      filtered.x,
      filtered.y,
      screenPxX,
      screenPxY,
      velocityPxPerMs,
      hit.wordIndex,
      timestamp
    );

    // 9. Regression Detection
    const regEvent = this.analyticsEngine.regressionDetector.processReadingStep(
      hit.wordIndex,
      hit.lineIndex,
      timestamp
    );
    if (regEvent) {
      this.analyticsEngine.lineTracker.registerRegression();
    }

    // 10. Line Progression Tracking
    this.analyticsEngine.lineTracker.processLineUpdate(hit.lineIndex, timestamp);

    // 11. Observable Facial Expression Signals
    const facialSignals = this.analyticsEngine.expressionAnalyzer.analyzeLandmarks(lm);

    // 12. Overlay Wireframe Points
    const faceOvalPoints = FACEMESH_FACE_OVAL_INDICES.map((idx) => ({
      x: lm[idx].x,
      y: lm[idx].y
    }));
    const leftEyeContour = FACEMESH_LEFT_EYE_INDICES.map((idx) => ({ x: lm[idx].x, y: lm[idx].y }));
    const rightEyeContour = FACEMESH_RIGHT_EYE_INDICES.map((idx) => ({
      x: lm[idx].x,
      y: lm[idx].y
    }));

    this.latestFrameResult = {
      timestamp,
      rawGazeX: rawGaze.rawGazeX,
      rawGazeY: rawGaze.rawGazeY,
      screenX: filtered.x,
      screenY: filtered.y,
      pixelX: screenPxX,
      pixelY: screenPxY,
      velocityPxPerMs,
      activeWordIndex: hit.wordIndex,
      activeWordText: hit.wordText,
      activeLineIndex: hit.lineIndex,
      isDirectWordHit: hit.isDirectHit,
      targetPixelX: hit.targetPixelX,
      targetPixelY: hit.targetPixelY,
      isFixating: fixRes.isFixating,
      activeFixationDurationMs: fixRes.activeDurationMs,
      isSaccade: sacRes.isSaccade,
      isBlinking: blinkRes.isBlinking,
      totalBlinks: blinkRes.blinkCount,
      headPose,
      facialSignals,
      confidence: rawGaze.confidence,
      fps: this.currentFps,
      faceOvalPoints,
      leftEyeContour,
      rightEyeContour,
      leftIrisCenter: rawGaze.leftEye.irisCenter,
      rightIrisCenter: rawGaze.rightEye.irisCenter
    };
  }

  public startReadingSession(totalWords = 100): void {
    this.analyticsEngine.startSession(totalWords);
  }

  public stopReadingSession(): ReadingSessionMetrics {
    return this.analyticsEngine.compileSessionMetrics();
  }

  public reset(): void {
    this.gazeEstimator.reset();
    this.headPoseEstimator.reset();
    this.blinkDetector.reset();
    this.filter2D.reset();
    this.lastGazePoint = null;
    this.latestFrameResult = null;
    this.frameTimestamps = [];
  }
}
