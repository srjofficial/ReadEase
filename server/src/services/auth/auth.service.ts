import crypto from 'crypto';
import { User, IUser } from '../../models/user.model';
import { TeacherProfile } from '../../models/teacherProfile.model';
import { TokenService } from './token.service';
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError
} from '../../utils/errors';
import {
  TeacherRegisterInput,
  LoginInput,
  ResetPasswordInput
} from '../../validators/auth.validator';
import { logger } from '../../utils/logger';

export interface AuthSuccessPayload {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    profileImage?: string;
  };
  accessToken: string;
  refreshToken: string;
  teacherProfile?: unknown;
}

export class AuthService {
  /**
   * Register a new Teacher account (status: pending verification)
   */
  static async registerTeacher(input: TeacherRegisterInput): Promise<AuthSuccessPayload> {
    const existing = await User.findOne({ email: input.email });
    if (existing) {
      throw new ConflictError('An account with this email address already exists');
    }

    // 1. Hash password with bcrypt cost factor 12
    const passwordHash = await User.hashPassword(input.password);

    // 2. Create User document with PENDING status
    const user = new User({
      name: input.name,
      email: input.email,
      passwordHash,
      role: 'teacher',
      status: 'pending' // Teacher accounts start in pending status awaiting admin review
    });

    await user.save();

    // 3. Create TeacherProfile with 20 student limit and pending verification
    const teacherProfile = new TeacherProfile({
      userId: user._id,
      school: input.school,
      qualification: input.qualification,
      experienceYears: input.experienceYears,
      verificationDocuments: input.verificationDocuments || [],
      verificationStatus: 'pending',
      maxStudents: 20
    });

    await teacherProfile.save();

    // 4. Issue access and rotating refresh token
    const accessToken = TokenService.generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status
    });

    const { token: refreshToken } = TokenService.generateRefreshToken(user._id.toString());
    user.refreshTokenHash = TokenService.hashToken(refreshToken);
    await user.save();

    logger.info({ userId: user._id, email: user.email }, 'New teacher registered successfully');

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage
      },
      accessToken,
      refreshToken,
      teacherProfile
    };
  }

  /**
   * Authenticate user and issue tokens
   */
  static async login(input: LoginInput): Promise<AuthSuccessPayload> {
    const user = await User.findOne({ email: input.email }).select(
      '+passwordHash +refreshTokenHash'
    );
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isMatch = await user.comparePassword(input.password);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.status === 'suspended') {
      throw new ForbiddenError(
        'Your account has been suspended. Please contact the administrator.'
      );
    }

    if (user.status === 'inactive') {
      throw new ForbiddenError('Your account is currently inactive.');
    }

    // Issue tokens
    const accessToken = TokenService.generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status
    });

    const { token: refreshToken } = TokenService.generateRefreshToken(user._id.toString());

    // Save hash of the refresh token to DB
    user.refreshTokenHash = TokenService.hashToken(refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    logger.info({ userId: user._id, role: user.role }, 'User successfully authenticated');

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage
      },
      accessToken,
      refreshToken
    };
  }

  /**
   * Rotate refresh token and issue new access token (with token reuse detection)
   */
  static async refreshTokens(rawRefreshToken: string): Promise<AuthSuccessPayload> {
    if (!rawRefreshToken) {
      throw new UnauthorizedError('Refresh token is required');
    }

    let payload;
    try {
      payload = TokenService.verifyRefreshToken(rawRefreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await User.findById(payload.sub).select('+refreshTokenHash');
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedError('User session not found');
    }

    const incomingHash = TokenService.hashToken(rawRefreshToken);

    // Token reuse detection: if incoming hash doesn't match current DB hash, revoke immediately!
    if (user.refreshTokenHash !== incomingHash) {
      logger.warn(
        { userId: user._id },
        'Potential refresh token reuse detected! Revoking all sessions.'
      );
      user.refreshTokenHash = undefined;
      await user.save();
      throw new UnauthorizedError('Token reuse detected. All sessions revoked for your security.');
    }

    if (user.status === 'suspended' || user.status === 'inactive') {
      throw new ForbiddenError('Account is no longer active.');
    }

    // Issue new access token and rotated refresh token
    const accessToken = TokenService.generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status
    });

    const { token: newRefreshToken } = TokenService.generateRefreshToken(user._id.toString());
    user.refreshTokenHash = TokenService.hashToken(newRefreshToken);
    await user.save();

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        profileImage: user.profileImage
      },
      accessToken,
      refreshToken: newRefreshToken
    };
  }

  /**
   * Log out user by clearing stored refresh token hash
   */
  static async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
    logger.info({ userId }, 'User logged out and refresh token revoked');
  }

  /**
   * Initiate forgot password flow with cryptographic reset token
   */
  static async forgotPassword(email: string): Promise<{ resetTokenPreview?: string }> {
    const user = await User.findOne({ email });
    if (!user) {
      // Don't leak whether user exists
      return {};
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = TokenService.hashToken(rawToken);
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
    await user.save();

    logger.info({ userId: user._id, email }, 'Password reset token generated');

    // In non-production, return preview token to facilitate developer testing
    return process.env.NODE_ENV !== 'production' ? { resetTokenPreview: rawToken } : {};
  }

  /**
   * Reset user password using token
   */
  static async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = TokenService.hashToken(input.token);

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() }
    }).select('+passwordResetTokenHash +passwordResetExpiresAt');

    if (!user) {
      throw new BadRequestError('Password reset token is invalid or has expired');
    }

    // Hash new password with cost factor 12
    user.passwordHash = await User.hashPassword(input.newPassword);
    user.passwordResetTokenHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.refreshTokenHash = undefined; // Revoke all active sessions
    await user.save();

    logger.info({ userId: user._id }, 'Password reset successfully');
  }

  /**
   * Retrieve current user profile and role details
   */
  static async getMe(userId: string): Promise<IUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    return user;
  }
}
