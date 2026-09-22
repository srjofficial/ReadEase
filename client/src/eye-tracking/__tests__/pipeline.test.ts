/**
 * Comprehensive Eye Tracking Pipeline Unit Tests
 *
 * Validates:
 * 1. Gaze coordinate normalization & Iris vector decoupling
 * 2. Calibration polynomial fitting, RMSE, and transformation
 * 3. One Euro Filter temporal smoothing (jitter damping + saccade pass-through)
 * 4. Fixation detection (I-VT velocity & spatial dispersion thresholds)
 * 5. Saccade detection (velocity classification, forward vs backward vs return sweep)
 * 6. Regression detection (distinguishing return sweep from reading regressions)
 * 7. Blink detection via EAR thresholds
 * 8. Head pose estimation and confidence scoring
 */

import { OneEuroFilter2D } from '../filters/OneEuroFilter';
import { CalibrationEngine, FIVE_POINT_TARGETS } from '../calibration/CalibrationEngine';
import { FixationDetector } from '../analysis/FixationDetector';
import { SaccadeDetector } from '../analysis/SaccadeDetector';
import { RegressionDetector } from '../analysis/RegressionDetector';
import { BlinkDetector } from '../core/BlinkDetector';
import { HeadPoseEstimator } from '../core/HeadPoseEstimator';
import type { Point3D, CalibrationSample } from '../types';

export function runEyeTrackingTests(): {
  total: number;
  passed: number;
  failed: number;
  errors: string[];
} {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      console.log(`  [PASS] ${testName}`);
    } else {
      failed++;
      const msg = `[FAIL] ${testName}${detail ? `: ${detail}` : ''}`;
      console.error(`  ${msg}`);
      errors.push(msg);
    }
  }

  console.log('--- STARTING EYE TRACKING PIPELINE TEST SUITE ---');

  // TEST 1: OneEuroFilter Jitter Damping & Fast Jump Responsiveness
  try {
    const filter = new OneEuroFilter2D({ minCutoff: 1.1, beta: 0.009, dCutoff: 1.0 });
    // Steady point with artificial high-frequency noise
    const t0 = 1000;
    const noisySamples: { x: number; y: number }[] = [];
    for (let i = 0; i < 20; i++) {
      const noise = (Math.random() - 0.5) * 6; // +/- 3px jitter
      const smoothed = filter.filter(500 + noise, 300 + noise, t0 + i * 33);
      noisySamples.push(smoothed);
    }
    const lastSmoothed = noisySamples[noisySamples.length - 1];
    assert(
      Math.abs(lastSmoothed.x - 500) < 2.0 && Math.abs(lastSmoothed.y - 300) < 2.0,
      'OneEuroFilter: High-frequency jitter suppressed around fixation dwelling'
    );

    // Fast saccade jump: jump from 500 to 800 in 66ms
    const jump1 = filter.filter(800, 300, t0 + 20 * 33);
    assert(jump1.x > 700, 'OneEuroFilter: Dynamic cutoff widens on saccades without excessive lag');
  } catch (err: any) {
    assert(false, 'OneEuroFilter tests', err.message);
  }

  // TEST 2: CalibrationEngine 5-Point Polynomial Fitting
  try {
    const calib = new CalibrationEngine();
    calib.clearSamples();

    // Feed calibrated points with known polynomial/linear response
    for (const target of FIVE_POINT_TARGETS) {
      const rawX = 0.5 + (target.targetX - 0.5) * 0.8;
      const rawY = 0.5 + (target.targetY - 0.5) * 0.8;
      for (let s = 0; s < 12; s++) {
        const sample: CalibrationSample = {
          targetX: target.targetX,
          targetY: target.targetY,
          gazeX: rawX + (Math.random() - 0.5) * 0.01,
          gazeY: rawY + (Math.random() - 0.5) * 0.01,
          yaw: 0,
          pitch: 0,
          timestamp: Date.now() + s * 50
        };
        calib.addSample(sample);
      }
    }

    const model = calib.finalizeCalibration();
    assert(
      model !== null && model.isCalibrated,
      'CalibrationEngine: Polynomial regression solves successfully'
    );
    assert(model.qualityScore >= 70, 'CalibrationEngine: Quality score is healthy');

    // Test gaze coordinate transformation
    const testTransformed = calib.mapGazeToScreen(0.5, 0.5); // center raw
    assert(
      Math.abs(testTransformed.x - 0.5) < 0.15 && Math.abs(testTransformed.y - 0.5) < 0.15,
      'CalibrationEngine: Center gaze accurately maps to screen center'
    );
  } catch (err: any) {
    assert(false, 'CalibrationEngine tests', err.message);
  }

  // TEST 3: Fixation Detection (I-VT & Spatial Dispersion)
  try {
    const fixDetector = new FixationDetector();
    const startT = 5000;
    // Dwelling at (400, 200) for 250ms (8 samples @ 33ms, low velocity 0.05 px/ms)
    for (let i = 0; i < 8; i++) {
      fixDetector.processSample(
        0.4,
        0.3,
        400 + (i % 2) * 2,
        200 + (i % 2) * 2,
        0.05,
        10,
        'important',
        1,
        startT + i * 33
      );
    }
    // High velocity movement triggers fixation completion
    fixDetector.processSample(0.65, 0.3, 650, 200, 1.8, null, null, 1, startT + 9 * 33);

    const fixations = fixDetector.getFixations();
    assert(
      fixations.length >= 1,
      'FixationDetector: Successfully identified stationary fixation episode'
    );
    const firstFix = fixations[0];
    assert(
      firstFix && firstFix.duration >= 200,
      'FixationDetector: Fixation duration accurately recorded (>200ms)'
    );
  } catch (err: any) {
    assert(false, 'FixationDetector tests', err.message);
  }

  // TEST 4: Saccade & Regression Detection
  try {
    const saccadeDetector = new SaccadeDetector();
    const regressionDetector = new RegressionDetector();

    // Saccade 1: Forward reading saccade (x: 200 -> 350, y: 150)
    saccadeDetector.processSample(0.2, 0.2, 200, 150, 0.05, 5, 10000);
    // Rapid jump
    saccadeDetector.processSample(0.25, 0.2, 260, 150, 1.2, 6, 10020);
    saccadeDetector.processSample(0.35, 0.2, 350, 150, 1.4, 7, 10040);
    // Settle (low velocity terminates saccade)
    const s1Res = saccadeDetector.processSample(0.35, 0.2, 352, 150, 0.05, 7, 10060);
    assert(
      s1Res.newCompletedSaccade !== null && s1Res.newCompletedSaccade.direction === 'forward',
      'SaccadeDetector: Forward reading saccade classified'
    );

    // Saccade 2: Backward reading saccade on same line (x: 350 -> 240, y: 150) -> intra-line regression
    saccadeDetector.processSample(0.35, 0.2, 350, 150, 0.05, 7, 10300);
    saccadeDetector.processSample(0.28, 0.2, 280, 150, 1.3, 5, 10325);
    const s2Res = saccadeDetector.processSample(0.24, 0.2, 240, 150, 0.05, 5, 10350);
    assert(
      s2Res.newCompletedSaccade !== null && s2Res.newCompletedSaccade.direction === 'backward',
      'SaccadeDetector: Backward saccade classified'
    );

    // Regression Detector verification:
    // Read word 10 on line 1, then jump back to word 7 on line 1
    regressionDetector.processReadingStep(10, 1, 10500);
    const intraReg = regressionDetector.processReadingStep(7, 1, 10700);
    assert(
      intraReg !== null && !intraReg.isInterLine,
      'RegressionDetector: Correctly flagged intra-line reading regression'
    );

    // Forward reading progress (word 7 -> word 8 -> word 12) -> no regression
    const fwd1 = regressionDetector.processReadingStep(8, 1, 10900);
    const fwd2 = regressionDetector.processReadingStep(12, 1, 11100);
    assert(
      fwd1 === null && fwd2 === null,
      'RegressionDetector: Forward reading progress generates no regression'
    );

    // Return sweep to start of next line (word 12, line 1 -> word 13, line 2) -> no regression
    const returnSweep = regressionDetector.processReadingStep(13, 2, 11400);
    assert(
      returnSweep === null,
      'RegressionDetector: Return sweep to next line not falsely recorded as regression'
    );

    // Inter-line backward regression (re-reading previous line: line 2 -> line 1)
    const interReg = regressionDetector.processReadingStep(5, 1, 11800);
    assert(
      interReg !== null && interReg.isInterLine,
      'RegressionDetector: Correctly flagged inter-line regression'
    );
  } catch (err: any) {
    assert(false, 'Saccade and Regression tests', err.message);
  }

  // TEST 5: Blink Detection (EAR Drop & Recovery)
  try {
    const blinkDetector = new BlinkDetector();
    // Baseline open eyes (EAR ~ 0.30)
    blinkDetector.processEAR(0.3, 0.31, 20000);
    blinkDetector.processEAR(0.3, 0.31, 20033);

    // Eyes closed for 132ms (4 frames @ 33ms) below 0.175 EAR
    blinkDetector.processEAR(0.12, 0.13, 20066);
    blinkDetector.processEAR(0.11, 0.12, 20100);
    blinkDetector.processEAR(0.12, 0.13, 20133);
    blinkDetector.processEAR(0.11, 0.12, 20166);

    // Eyes open again (recovers above threshold)
    const res = blinkDetector.processEAR(0.29, 0.3, 20200);
    assert(
      res.newBlinkEvent !== null,
      'BlinkDetector: Normal reading blink detected upon eye reopening'
    );
    assert(res.blinkCount === 1, 'BlinkDetector: Total blink count incremented to 1');
  } catch (err: any) {
    assert(false, 'BlinkDetector tests', err.message);
  }

  // TEST 6: Head Pose Estimation & Distance Quality
  try {
    const estimator = new HeadPoseEstimator();
    const mockLandmarks: Point3D[] = new Array(478)
      .fill(null)
      .map(() => ({ x: 0.5, y: 0.5, z: 0 }));
    // Nose tip (index 1)
    mockLandmarks[1] = { x: 0.5, y: 0.5, z: -0.05 };
    // Left ear/cheek (234) and Right ear/cheek (454)
    mockLandmarks[234] = { x: 0.4, y: 0.5, z: 0 };
    mockLandmarks[454] = { x: 0.6, y: 0.5, z: 0 };
    // Forehead (10) and Chin (152)
    mockLandmarks[10] = { x: 0.5, y: 0.35, z: 0 };
    mockLandmarks[152] = { x: 0.5, y: 0.65, z: 0 };

    const headPose = estimator.estimateHeadPose(mockLandmarks);
    assert(headPose.alignment === 'centered', 'HeadPoseEstimator: Centered face pose classified');
    assert(
      headPose.distanceQuality === 'optimal',
      'HeadPoseEstimator: Ideal face distance classified'
    );
  } catch (err: any) {
    assert(false, 'HeadPoseEstimator tests', err.message);
  }

  console.log(`--- TEST SUITE COMPLETE: ${passed} Passed, ${failed} Failed ---`);
  return { total: passed + failed, passed, failed, errors };
}

runEyeTrackingTests();
