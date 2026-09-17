import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth/auth.service';
import { REFRESH_COOKIE_NAME, getRefreshCookieOptions } from '../services/auth/token.service';
import { UnauthorizedError } from '../utils/errors';

export class AuthController {
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
}
