import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth/auth.service';
import { REFRESH_COOKIE_NAME, getRefreshCookieOptions } from '../services/auth/token.service';
import { UnauthorizedError } from '../utils/errors';
import { verifyEmailQuerySchema } from '../validators/auth.validator';

export class AuthController {
  /**
   * POST /api/v1/auth/signup/send-otp
   */
  static async sendSignupOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.sendSignupOtp(req.body);

      res.status(200).json({
        success: true,
        message: 'A 6-digit verification code has been dispatched to your email address.',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/signup/verify-otp
   */
  static async verifySignupOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.verifySignupOtp(req.body);

      // Set httpOnly secure refresh token cookie
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());

      res.status(201).json({
        success: true,
        message: 'Email verified successfully and account created.',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          teacherProfile: result.teacherProfile
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/register/teacher
   */
  static async registerTeacher(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.registerTeacher(req.body);

      // Set httpOnly secure refresh token cookie
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());

      res.status(201).json({
        success: true,
        message:
          'Teacher account registered successfully. Verification pending administrator approval.',
        data: {
          user: result.user,
          accessToken: result.accessToken,
          teacherProfile: result.teacherProfile
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/login
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);

      // Set httpOnly secure refresh token cookie
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        data: {
          user: result.user,
          accessToken: result.accessToken
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Propagate EMAIL_NOT_VERIFIED code + email so the frontend can show Resend button
      const err = error as Record<string, unknown>;
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        res.status(403).json({
          success: false,
          message: err.message,
          code: 'EMAIL_NOT_VERIFIED',
          email: err.email,
          timestamp: new Date().toISOString()
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/google
   */
  static async googleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.googleLogin(req.body);

      // Set httpOnly secure refresh token cookie
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());

      res.status(200).json({
        success: true,
        message: 'Google authentication successful',
        data: {
          user: result.user,
          accessToken: result.accessToken
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/refresh
   */
  static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refreshToken;

      if (!refreshToken) {
        throw new UnauthorizedError('Refresh token required in cookie or request body');
      }

      const result = await AuthService.refreshTokens(refreshToken);

      // Rotate cookie with new refresh token
      res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, getRefreshCookieOptions());

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          user: result.user,
          accessToken: result.accessToken
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   */
  static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (req.user?.id) {
        await AuthService.logout(req.user.id);
      }

      // Clear cookie
      res.clearCookie(REFRESH_COOKIE_NAME, {
        path: '/api',
        httpOnly: true,
        sameSite: 'strict'
      });

      res.status(200).json({
        success: true,
        message: 'Successfully logged out',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/forgot-password/send-otp
   */
  static async sendForgotPasswordOtp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AuthService.sendForgotPasswordOtp(req.body.email);

      res.status(200).json({
        success: true,
        message:
          'If an account exists with this email address, a password reset code has been dispatched.',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/forgot-password/reset
   */
  static async resetPasswordWithOtp(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await AuthService.resetPasswordWithOtp(req.body);

      res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/resend-otp
   */
  static async resendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.resendOtp(req.body);

      res.status(200).json({
        success: true,
        message: 'A fresh verification code has been dispatched to your email.',
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/forgot-password
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.forgotPassword(req.body.email);

      res.status(200).json({
        success: true,
        message:
          'If an account exists with this email address, a password reset link has been dispatched.',
        ...(result.resetTokenPreview ? { devResetToken: result.resetTokenPreview } : {}),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/reset-password
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await AuthService.resetPassword(req.body);

      res.status(200).json({
        success: true,
        message: 'Password reset successfully. You may now sign in with your new password.',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/auth/me
   */
  static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.id) {
        throw new UnauthorizedError('Authentication required');
      }

      const user = await AuthService.getMe(req.user.id);

      res.status(200).json({
        success: true,
        data: {
          user
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── Token-Link Email Verification Controllers ───────────────────────────────

  /**
   * POST /api/v1/auth/register
   * Direct registration: creates user immediately with emailVerified:false,
   * then dispatches a secure verification link to their email.
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          email: result.email,
          ...(result.devVerifyUrl ? { devVerifyUrl: result.devVerifyUrl } : {})
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/auth/verify-email?token=<TOKEN>
   * Validates the token, marks email as verified, clears token (one-time use).
   */
  static async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = verifyEmailQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          message: 'Verification token is missing or malformed.',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await AuthService.verifyEmail(parsed.data.token);

      res.status(200).json({
        success: true,
        message: result.message,
        data: { email: result.email },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      // Propagate TOKEN_EXPIRED code so frontend can offer Resend option
      const err = error as Record<string, unknown>;
      if (err.code === 'TOKEN_EXPIRED') {
        res.status(400).json({
          success: false,
          message: err.message,
          code: 'TOKEN_EXPIRED',
          email: err.email,
          timestamp: new Date().toISOString()
        });
        return;
      }
      next(error);
    }
  }

  /**
   * POST /api/v1/auth/resend-verification
   * Resends the verification email with a fresh token (60s cooldown enforced).
   */
  static async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.resendVerification(req.body);

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          email: result.email,
          ...(result.devVerifyUrl ? { devVerifyUrl: result.devVerifyUrl } : {})
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}
