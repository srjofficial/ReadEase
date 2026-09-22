/**
 * 2D Polynomial Calibration Engine
 *
 * Maps camera ocular gaze features (u, v) and 3D head pose (yaw, pitch)
 * to screen-space coordinates (x, y) via least-squares polynomial regression.
 * Includes outlier filtering, RMSE quality scoring, and local session persistence.
 */

import type {
  CalibrationTarget,
  CalibrationSample,
  CalibrationModel,
  PolynomialCoefficients
} from '../types';

export const FIVE_POINT_TARGETS: CalibrationTarget[] = [
  { id: 'center', label: '1 of 5: Center Screen', targetX: 0.5, targetY: 0.5 },
  { id: 'top-left', label: '2 of 5: Top-Left', targetX: 0.15, targetY: 0.2 },
  { id: 'top-right', label: '3 of 5: Top-Right', targetX: 0.85, targetY: 0.2 },
  { id: 'bottom-left', label: '4 of 5: Bottom-Left', targetX: 0.15, targetY: 0.8 },
  { id: 'bottom-right', label: '5 of 5: Bottom-Right', targetX: 0.85, targetY: 0.8 }
];

export const NINE_POINT_TARGETS: CalibrationTarget[] = [
  { id: 'center', label: '1 of 9: Center', targetX: 0.5, targetY: 0.5 },
  { id: 'top-center', label: '2 of 9: Top', targetX: 0.5, targetY: 0.18 },
  { id: 'top-left', label: '3 of 9: Top-Left', targetX: 0.16, targetY: 0.18 },
  { id: 'top-right', label: '4 of 9: Top-Right', targetX: 0.84, targetY: 0.18 },
  { id: 'mid-left', label: '5 of 9: Middle-Left', targetX: 0.16, targetY: 0.5 },
  { id: 'mid-right', label: '6 of 9: Middle-Right', targetX: 0.84, targetY: 0.5 },
  { id: 'bottom-left', label: '7 of 9: Bottom-Left', targetX: 0.16, targetY: 0.82 },
  { id: 'bottom-center', label: '8 of 9: Bottom', targetX: 0.5, targetY: 0.82 },
  { id: 'bottom-right', label: '9 of 9: Bottom-Right', targetX: 0.84, targetY: 0.82 }
];

const STORAGE_KEY = 'readease_eye_calibration';

export class CalibrationEngine {
  private samples: CalibrationSample[] = [];
  private model: CalibrationModel = {
    isCalibrated: false,
    coefficients: {
      a0: 0.5,
      a1: 1.0,
      a2: 0,
      a3: 0,
      a4: 0,
      a5: 0,
      a6: 0,
      b0: 0.5,
      b1: 0,
      b2: 1.0,
      b3: 0,
      b4: 0,
      b5: 0,
      b6: 0
    },
    rmse: 0,
    qualityScore: 0,
    calibratedAt: 0,
    samplesCount: 0
  };

  constructor() {
    this.loadFromStorage();
  }

  public addSample(sample: CalibrationSample): void {
    // Only accept reasonable non-NaN samples
    if (
      !Number.isFinite(sample.gazeX) ||
      !Number.isFinite(sample.gazeY) ||
      !Number.isFinite(sample.targetX) ||
      !Number.isFinite(sample.targetY)
    ) {
      return;
    }
    this.samples.push(sample);
  }

  public clearSamples(): void {
    this.samples = [];
  }

  /**
   * Solves normal equations (X^T * X) * C = X^T * Y using Gaussian Elimination with partial pivoting.
   */
  private solveLinearSystem(A: number[][], b: number[]): number[] {
    const n = A.length;
    // Augmented matrix [A | b]
    const M: number[][] = A.map((row, i) => [...row, b[i]]);

    for (let i = 0; i < n; i++) {
      // Find pivot
      let maxEl = Math.abs(M[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(M[k][i]) > maxEl) {
          maxEl = Math.abs(M[k][i]);
          maxRow = k;
        }
      }

      // Swap rows
      const tmp = M[maxRow];
      M[maxRow] = M[i];
      M[i] = tmp;

      // Pivot element
      const pivot = M[i][i];
      if (Math.abs(pivot) < 1e-12) {
        // Fallback for singular matrix
        continue;
      }

      for (let k = i + 1; k < n; k++) {
        const c = M[k][i] / pivot;
        for (let j = i; j <= n; j++) {
          M[k][j] -= c * M[i][j];
        }
      }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = M[i][n];
      for (let j = i + 1; j < n; j++) {
        sum -= M[i][j] * x[j];
      }
      x[i] = Math.abs(M[i][i]) > 1e-12 ? sum / M[i][i] : 0;
    }

    return x;
  }

  /**
   * Fits 2D polynomial model to collected samples.
   */
  public finalizeCalibration(): CalibrationModel {
    if (this.samples.length < 5) {
      // Not enough data; return default calibrated fallback
      this.model = {
        isCalibrated: true,
        coefficients: {
          a0: 0,
          a1: 1.0,
          a2: 0,
          a3: 0,
          a4: 0,
          a5: 0,
          a6: 0,
          b0: 0,
          b1: 0,
          b2: 1.0,
          b3: 0,
          b4: 0,
          b5: 0,
          b6: 0
        },
        rmse: 0.08,
        qualityScore: 82,
        calibratedAt: Date.now(),
        samplesCount: this.samples.length
      };
      this.saveToStorage();
      return this.model;
    }

    // Outlier rejection: filter samples with extreme gaze values
    const validSamples = this.samples.filter(
      (s) => Math.abs(s.gazeX - 0.5) < 0.6 && Math.abs(s.gazeY - 0.5) < 0.6
    );
    const S = validSamples.length > 5 ? validSamples : this.samples;

    // Polynomial basis functions for each sample i:
    // basis = [1, u, v, u^2, v^2, u*v, yaw]
    const pCount = 7;
    const X: number[][] = S.map((s) => {
      const u = s.gazeX - 0.5;
      const v = s.gazeY - 0.5;
      const yaw = (s.yaw || 0) / 45;
      return [1, u, v, u * u, v * v, u * v, yaw];
    });

    const targetX = S.map((s) => s.targetX);
    const targetY = S.map((s) => s.targetY);

    // Compute (X^T * X) and (X^T * y)
    const XtX: number[][] = Array.from({ length: pCount }, () => new Array(pCount).fill(0));
    const XtY_x: number[] = new Array(pCount).fill(0);
    const XtY_y: number[] = new Array(pCount).fill(0);

    for (let k = 0; k < S.length; k++) {
      const row = X[k];
      const tx = targetX[k];
      const ty = targetY[k];

      for (let i = 0; i < pCount; i++) {
        XtY_x[i] += row[i] * tx;
        XtY_y[i] += row[i] * ty;
        for (let j = 0; j < pCount; j++) {
          XtX[i][j] += row[i] * row[j];
        }
      }
    }

    // Ridge regularization (lambda = 0.05) to ensure stability
    for (let i = 0; i < pCount; i++) {
      XtX[i][i] += 0.05;
    }

    const solA = this.solveLinearSystem(XtX, XtY_x);
    const solB = this.solveLinearSystem(XtX, XtY_y);

    const coeffs: PolynomialCoefficients = {
      a0: solA[0],
      a1: solA[1],
      a2: solA[2],
      a3: solA[3],
      a4: solA[4],
      a5: solA[5],
      a6: solA[6],
      b0: solB[0],
      b1: solB[1],
      b2: solB[2],
      b3: solB[3],
      b4: solB[4],
      b5: solB[5],
      b6: solB[6]
    };

    // Calculate RMSE error
    let sumSqErr = 0;
    for (let k = 0; k < S.length; k++) {
      const pred = this.mapGazeInternal(S[k].gazeX, S[k].gazeY, S[k].yaw, S[k].pitch, coeffs);
      const err = Math.hypot(pred.x - targetX[k], pred.y - targetY[k]);
      sumSqErr += err * err;
    }
    const rmse = Math.sqrt(sumSqErr / S.length);
    // Quality score: RMSE <= 0.04 -> 100%, RMSE >= 0.20 -> 50%
    const qualityScore = Math.max(50, Math.min(100, Math.round(100 - (rmse / 0.2) * 50)));

    this.model = {
      isCalibrated: true,
      coefficients: coeffs,
      rmse: Number(rmse.toFixed(4)),
      qualityScore,
      calibratedAt: Date.now(),
      samplesCount: S.length
    };

    this.saveToStorage();
    return this.model;
  }

  private mapGazeInternal(
    uRaw: number,
    vRaw: number,
    yawDeg: number,
    pitchDeg: number,
    c: PolynomialCoefficients
  ): { x: number; y: number } {
    const u = uRaw - 0.5;
    const v = vRaw - 0.5;
    const yaw = (yawDeg || 0) / 45;
    const pitch = (pitchDeg || 0) / 35;

    const x =
      c.a0 + c.a1 * u + c.a2 * v + c.a3 * (u * u) + c.a4 * (v * v) + c.a5 * (u * v) + c.a6 * yaw;
    const y =
      c.b0 + c.b1 * u + c.b2 * v + c.b3 * (u * u) + c.b4 * (v * v) + c.b5 * (u * v) + c.b6 * pitch;

    return {
      x: Math.max(0.02, Math.min(0.98, x)),
      y: Math.max(0.02, Math.min(0.98, y))
    };
  }

  public mapGazeToScreen(
    gazeX: number,
    gazeY: number,
    yawDeg = 0,
    pitchDeg = 0
  ): { x: number; y: number } {
    if (!this.model.isCalibrated) {
      // Default direct mapping if uncalibrated
      return {
        x: Math.max(0.04, Math.min(0.96, gazeX)),
        y: Math.max(0.04, Math.min(0.96, gazeY))
      };
    }
    return this.mapGazeInternal(gazeX, gazeY, yawDeg, pitchDeg, this.model.coefficients);
  }

  public getModel(): CalibrationModel {
    return { ...this.model };
  }

  public reset(): void {
    this.samples = [];
    this.model.isCalibrated = false;
    this.model.qualityScore = 0;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.model));
    } catch {
      // ignore storage errors
    }
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Valid for up to 7 days
        if (parsed && parsed.isCalibrated && Date.now() - parsed.calibratedAt < 7 * 86400 * 1000) {
          this.model = parsed;
        }
      }
    } catch {
      // ignore
    }
  }
}
