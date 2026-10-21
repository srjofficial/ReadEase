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
import type { FaceMesh, Results } from '@mediapipe/face_mesh';
import type {
  Point2D,
  Point3D,
  HeadPoseState,
  FilteredGazePoint,
  ObservableFacialSignals,
  ReadingSessionMetrics
} from './types';
import { JEOHeadTracker } from './core/JEOHeadTracker';
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

type FaceMeshConstructorType = new (config?: {
  locateFile?: (path: string, prefix?: string) => string;
}) => FaceMesh;

interface WindowWithFaceMesh extends Window {
  FaceMesh?: FaceMeshConstructorType;
}

interface FaceMeshModuleShape {
  FaceMesh?: FaceMeshConstructorType;
  default?: FaceMeshConstructorType | { FaceMesh?: FaceMeshConstructorType };
}

const typedFaceMeshModule = faceMeshModule as unknown as FaceMeshModuleShape;
const typedWindow =
  typeof window !== 'undefined' ? (window as unknown as WindowWithFaceMesh) : undefined;

const FaceMeshConstructor: FaceMeshConstructorType | undefined =
  typedFaceMeshModule.FaceMesh ||
  (typeof typedFaceMeshModule.default === 'function'
    ? typedFaceMeshModule.default
    : typedFaceMeshModule.default?.FaceMesh) ||
  typedWindow?.FaceMesh;

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
  private faceMesh: FaceMesh | null = null;
  private isFaceMeshReady = false;
  private isProcessingFrame = false;

  // JEOresearch HeadTracker (primary tracking engine ported from MonitorTracking.py)
  public headTracker = new JEOHeadTracker({
    filterLength: 8,
    yawDegrees: 20,
    pitchDegrees: 10,
    invertX: true
  });

  // Ancillary components
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
  private initPromise: Promise<boolean> | null = null;
  private nextInitAttempt = 0;
  private srcW = 640;
  private srcH = 480;

  public initialize(): Promise<boolean> {
    if (this.isFaceMeshReady) return Promise.resolve(true);
    if (this.initPromise) return this.initPromise;
    this.initPromise = (async () => {
      try {
        if (!FaceMeshConstructor) throw new Error('FaceMesh constructor unavailable');
        const fm = new FaceMeshConstructor({
          locateFile: (f: string) => `/mediapipe/face_mesh/${f}`
        });
        fm.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });
        fm.onResults((r: Results) => this.handleFaceMeshResults(r));
        await fm.initialize();
        this.faceMesh = fm;
        this.isFaceMeshReady = true;
        console.log(
          '✅ [EyeTrackerPipeline] MediaPipe 478 FaceLandmarker with Iris Refinement Ready'
        );
        return true;
      } catch (err) {
        console.error(
          '[EyeTrackerPipeline] FaceMesh init failed. Check /public/mediapipe/face_mesh/*',
          err
        );
        this.faceMesh = null;
        this.initPromise = null;
        this.nextInitAttempt = performance.now() + 3000;
        return false;
      }
    })();
    return this.initPromise;
  }

  constructor() {
    this.setGazeSensitivity(this.gazeSensitivity);
  }

  public bindTextContainer(element: HTMLElement | null): void {
    this.textLayoutEngine.bindContainer(element);
  }

  public setGazeSensitivity(val: number): void {
    this.gazeSensitivity = Math.max(1.0, Math.min(5.0, val));
    // When sensitivity is higher, smaller head rotations reach screen borders
    const yawDeg = Math.max(6, Math.round(36 / this.gazeSensitivity));
    const pitchDeg = Math.max(4, Math.round(22 / this.gazeSensitivity));
    this.headTracker.setSensitivity(yawDeg, pitchDeg);
  }

  public getGazeSensitivity(): number {
    return this.gazeSensitivity;
  }

  /**
   * One-touch calibration (matches 'c' key in MonitorTracking.py):
   * Sets current head orientation as looking directly at screen center
   */
  public calibrateHeadCenter(): void {
    this.headTracker.calibrateCenter();
    this.gazeEstimator.recalibrate();
    this.filter2D.reset();
  }

  public setInvertX(invert: boolean): void {
    this.headTracker.setInvertX(invert);
  }

  public getInvertX(): boolean {
    return this.headTracker.getInvertX();
  }

  public processVideoFrame(video: HTMLVideoElement): TrackingFrameResult | null {
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return null;

    // Capture source video dimensions for correct aspect-ratio landmark scaling
    this.srcW = video.videoWidth;
    this.srcH = video.videoHeight;

    // Track FPS
    const now = performance.now();
    this.frameTimestamps.push(now);
    while (this.frameTimestamps.length > 0 && this.frameTimestamps[0] < now - 1000) {
      this.frameTimestamps.shift();
    }
    this.currentFps = Math.max(1, this.frameTimestamps.length);

    // Ensure model is initialized
    if (!this.isFaceMeshReady && !this.initPromise && now > this.nextInitAttempt) {
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

  private handleFaceMeshResults(results: Results): void {
    const lm = results?.multiFaceLandmarks?.[0] as Point3D[] | undefined;
    if (!lm || lm.length < 468) return;
    try {
      this.analyzeFrame(lm);
    } catch (err) {
      console.error('[EyeTrackerPipeline] analyzeFrame failed (mesh still drawn):', err);
      const prev = this.latestFrameResult;
      this.latestFrameResult = {
        ...(prev ?? ({} as TrackingFrameResult)),
        timestamp: performance.now(),
        pixelX: prev?.pixelX ?? 0,
        pixelY: prev?.pixelY ?? 0,
        screenX: prev?.screenX ?? 0.5,
        screenY: prev?.screenY ?? 0.5,
        activeWordIndex: prev?.activeWordIndex ?? null,
        isBlinking: prev?.isBlinking ?? false,
        headPose:
          prev?.headPose ?? ({ pitch: 0, yaw: 0, roll: 0, alignment: 'centered' } as HeadPoseState),
        confidence: 0.9,
        fps: this.currentFps,
        faceOvalPoints: FACEMESH_FACE_OVAL_INDICES.map((i) => ({ x: lm[i].x, y: lm[i].y })),
        leftEyeContour: FACEMESH_LEFT_EYE_INDICES.map((i) => ({ x: lm[i].x, y: lm[i].y })),
        rightEyeContour: FACEMESH_RIGHT_EYE_INDICES.map((i) => ({ x: lm[i].x, y: lm[i].y })),
        leftIrisCenter: lm[468] ? { x: lm[468].x, y: lm[468].y } : { x: 0.5, y: 0.5 },
        rightIrisCenter: lm[473] ? { x: lm[473].x, y: lm[473].y } : { x: 0.5, y: 0.5 }
      } as TrackingFrameResult;
    }
  }

  private analyzeFrame(lm: Point3D[]): void {
    const timestamp = performance.now();

    // 1. Target Container Bounds & Viewport Dimensions
    const containerBounds = this.textLayoutEngine.getContainerBounds();
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const winH = typeof window !== 'undefined' ? window.innerHeight : 800;
    const targetW = containerBounds?.width || winW;
    const targetH = containerBounds?.height || winH;

    // 2. Direct JEOresearch HeadTracker Evaluation (MonitorTracking.py: landmarks 234, 454, 10, 152, 1)
    const headResult = this.headTracker.processLandmarks(
      lm,
      targetW,
      targetH,
      this.srcW,
      this.srcH
    );
    if (!headResult) return;

    const headPose = headResult.headPose;

    // 2b. High-Precision Subpixel Eye Iris Tracking (MediaPipe landmarks 468 & 473)
    const ocularGaze = this.gazeEstimator.estimateGaze(lm, headPose, timestamp);

    // Multimodal Gaze Fusion:
    // Head pose is the primary, stable navigator (90%), eliminating webcam iris jitter
    // Ocular iris contributes subtle horizontal deflection for reading line saccades (10%)
    // Vertical is 99% head-driven so eyes looking down at screen don't fight head pitch
    let rawGazeX = headResult.normX;
    let rawGazeY = headResult.normY;

    if (ocularGaze && !ocularGaze.isBlinking) {
      rawGazeX = headResult.normX * 0.9 + ocularGaze.rawGazeX * 0.1;
      rawGazeY = headResult.normY * 0.99 + ocularGaze.rawGazeY * 0.01;
    }

    // 3. Eye Aspect Ratio (EAR) for blink counter telemetry
    const rSpanH = Math.hypot(lm[133].x - lm[33].x, lm[133].y - lm[33].y);
    const rSpanV = Math.hypot(lm[159].x - lm[145].x, lm[159].y - lm[145].y);
    const earRight = rSpanH > 1e-4 ? Math.min(0.48, rSpanV / (2 * rSpanH)) : 0.28;

    const lSpanH = Math.hypot(lm[263].x - lm[362].x, lm[263].y - lm[362].y);
    const lSpanV = Math.hypot(lm[386].x - lm[374].x, lm[386].y - lm[374].y);
    const earLeft = lSpanH > 1e-4 ? Math.min(0.48, lSpanV / (2 * lSpanH)) : 0.28;

    const blinkRes = this.blinkDetector.processEAR(earLeft, earRight, timestamp);

    // 4. One Euro Temporal Filter on fused gaze coordinates
    const filtered = this.filter2D.filter(rawGazeX, rawGazeY, timestamp);

    // 5. Screen coordinates spanning the entire viewport (with +20px right offset to center on words!)
    const pad = 16;
    const screenPxX = Math.round(pad + filtered.x * (winW - 2 * pad)) + 20;
    const screenPxY = Math.round(pad + filtered.y * (winH - 2 * pad));

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

    const confidence = blinkRes.isBlinking ? 0.7 : 0.95;

    this.lastGazePoint = {
      x: filtered.x,
      y: filtered.y,
      screenPixelX: screenPxX,
      screenPixelY: screenPxY,
      timestamp,
      confidence,
      velocity: velocityPxPerMs
    };

    // 6. DOM Text Geometry Hit-Testing
    const hit: TextHitResult = this.textLayoutEngine.hitTestGaze(screenPxX, screenPxY);

    if (hit.wordIndex !== null) {
      this.analyticsEngine.registerWordRead(hit.wordIndex);
    }
    this.analyticsEngine.recordConfidence(confidence);

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
      confidence
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
      rawGazeX,
      rawGazeY,
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
      confidence,
      fps: this.currentFps,
      faceOvalPoints,
      leftEyeContour,
      rightEyeContour,
      leftIrisCenter: lm[468] ? { x: lm[468].x, y: lm[468].y } : { x: 0.5, y: 0.5 },
      rightIrisCenter: lm[473] ? { x: lm[473].x, y: lm[473].y } : { x: 0.5, y: 0.5 }
    };
  }

  public startReadingSession(totalWords = 100): void {
    this.analyticsEngine.startSession(totalWords);
  }

  public stopReadingSession(): ReadingSessionMetrics {
    return this.analyticsEngine.compileSessionMetrics();
  }

  public reset(): void {
    this.headTracker.reset();
    this.gazeEstimator.reset();
    this.headPoseEstimator.reset();
    this.blinkDetector.reset();
    this.filter2D.reset();
    this.lastGazePoint = null;
    this.latestFrameResult = null;
    this.frameTimestamps = [];
  }
}
