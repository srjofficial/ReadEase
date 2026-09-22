/**
 * ReadEase Real-Time Eye Tracking & Reading Behavior Analysis Type Definitions
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface HeadPoseState {
  pitch: number; // looking up / down in degrees
  yaw: number; // looking left / right in degrees
  roll: number; // head tilt in degrees
  alignment: 'centered' | 'tilted_left' | 'tilted_right' | 'looking_down' | 'looking_up';
  distanceQuality: 'optimal' | 'too_close' | 'too_far';
}

export interface EyeFeatures {
  irisCenter: Point2D;
  innerCorner: Point2D;
  outerCorner: Point2D;
  topLid: Point2D;
  bottomLid: Point2D;
  ear: number; // Eye Aspect Ratio
  horizontalRatio: number; // 0.0 to 1.0 (outer to inner)
  verticalRatio: number; // 0.0 to 1.0 (top to bottom)
}

export interface RawGazeSample {
  timestamp: number;
  rawGazeX: number; // 0.0 to 1.0 normalized ocular deflection
  rawGazeY: number;
  leftEye: EyeFeatures;
  rightEye: EyeFeatures;
  headPose: HeadPoseState;
  earLeft: number;
  earRight: number;
  isBlinking: boolean;
  confidence: number; // 0.0 to 1.0
  lightingQuality: 'optimal' | 'dim' | 'harsh' | 'unknown';
}

export interface FilteredGazePoint {
  x: number; // 0.0 to 1.0 normalized screen viewport
  y: number;
  screenPixelX: number;
  screenPixelY: number;
  timestamp: number;
  confidence: number;
  velocity: number; // pixels per millisecond
}

export interface CalibrationTarget {
  id: string;
  label: string;
  targetX: number; // 0.0 to 1.0 (screen viewport ratio)
  targetY: number;
}

export interface CalibrationSample {
  targetX: number;
  targetY: number;
  gazeX: number;
  gazeY: number;
  yaw: number;
  pitch: number;
  timestamp: number;
}

export interface PolynomialCoefficients {
  a0: number;
  a1: number;
  a2: number;
  a3: number;
  a4: number;
  a5: number;
  a6: number;
  b0: number;
  b1: number;
  b2: number;
  b3: number;
  b4: number;
  b5: number;
  b6: number;
}

export interface CalibrationModel {
  isCalibrated: boolean;
  coefficients: PolynomialCoefficients;
  rmse: number;
  qualityScore: number; // 0 to 100%
  calibratedAt: number;
  samplesCount: number;
}

export interface FixationEvent {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // milliseconds
  x: number; // normalized screen coordinates
  y: number;
  pixelX: number;
  pixelY: number;
  wordIndex: number | null;
  wordText?: string;
  lineIndex: number | null;
  confidence: number;
}

export interface SaccadeEvent {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // ms
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  distancePx: number;
  amplitudeDeg: number;
  peakVelocityPxPerMs: number;
  direction: 'forward' | 'backward' | 'return_sweep' | 'vertical';
  fromWordIndex: number | null;
  toWordIndex: number | null;
}

export interface RegressionEvent {
  id: string;
  timestamp: number;
  duration: number;
  fromWordIndex: number;
  toWordIndex: number;
  fromLineIndex: number;
  toLineIndex: number;
  wordsSpanned: number;
  isInterLine: boolean;
}

export interface LineTransitionEvent {
  fromLineIndex: number;
  toLineIndex: number;
  timestamp: number;
  sweepDurationMs: number;
  latencyMs: number;
}

export interface LineMetrics {
  lineIndex: number;
  startTime: number;
  endTime: number;
  durationMs: number;
  fixationCount: number;
  averageFixationDurationMs: number;
  regressionCount: number;
  wordsCount: number;
}

export interface BlinkEvent {
  startTime: number;
  endTime: number;
  duration: number;
  isUnusuallyLong: boolean;
}

export interface ObservableFacialSignals {
  browRaise: number; // 0.0 to 1.0 (raised eyebrows cue)
  browFurrow: number; // 0.0 to 1.0 (concentration / squint cue)
  eyeSquint: number; // 0.0 to 1.0
  jawTension: number; // 0.0 to 1.0
  headTiltAngle: number; // degrees
}

export interface WordBoundingBox {
  index: number;
  text: string;
  lineIndex: number;
  paragraphIndex: number;
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export interface LineBoundingBox {
  lineIndex: number;
  top: number;
  bottom: number;
  left: number;
  right: number;
  firstWordIndex: number;
  lastWordIndex: number;
  words: WordBoundingBox[];
}

export interface ReadingSessionMetrics {
  durationSeconds: number;
  wordsReadCount: number;
  readingSpeedWpm: number;
  completionRate: number; // 0.0 to 1.0

  // Fixations
  totalFixations: number;
  averageFixationDurationMs: number;
  fixationDurations: number[];
  fixationsPer100Words: number;

  // Saccades
  totalSaccades: number;
  averageSaccadeLengthPx: number;
  saccadeLengths: number[];

  // Regressions
  totalRegressions: number;
  regressionsPer100Words: number;
  regressionDurations: number[];

  // Lines
  totalLineTransitions: number;
  averageLineReadingTimeMs: number;
  lines: LineMetrics[];

  // Blinks
  totalBlinks: number;
  blinkRatePerMinute: number;
  averageBlinkDurationMs: number;

  // Quality & Stability
  gazeStabilityScore: number; // 0 to 100
  trackingConfidence: number; // 0 to 100
  calibrationQuality: number; // 0 to 100

  // Behavioral Observations (strictly non-diagnostic)
  behavioralObservations: string[];
  observableFacialSummary?: {
    frequentSquintingDetected: boolean;
    elevatedBrowRaiseDetected: boolean;
    frequentHeadAdjustmentDetected: boolean;
  };
}
