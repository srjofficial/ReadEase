import crypto from 'crypto';
import { User, IUser, UserRole } from '../../models/user.model';
import { Otp } from '../../models/otp.model';
import { TeacherProfile } from '../../models/teacherProfile.model';
import { StudentProfile } from '../../models/studentProfile.model';
import { ParentProfile } from '../../models/parentProfile.model';
import { SpecialEducatorProfile } from '../../models/specialEducatorProfile.model';
import { TokenService } from './token.service';
import { EmailService } from '../email/email.service';
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError
} from '../../utils/errors';
import {
  TeacherRegisterInput,
  LoginInput,
  ResetPasswordInput,
  GoogleAuthInput,
  SignupSendOtpInput,
  VerifyOtpInput,
  ResendOtpInput,
  ResetPasswordWithOtpInput,
  RegisterInput,
  ResendVerificationInput
} from '../../validators/auth.validator';
import { logger } from '../../utils/logger';
import { OAuth2Client } from 'google-auth-library';
import { env } from '../../config/env';

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function generate6DigitOtp(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function normalizeUserRole(role: string): UserRole {
  if (role === 'special-educator' || role === 'special_educator') return 'special_educator';
  if (['teacher', 'parent', 'admin'].includes(role)) return role as UserRole;
  return 'student';
}

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
   * Initiate Sign-Up by sending a 6-digit OTP to the user's email address.
   * Account is NOT created yet — this must be verified with verifySignupOtp.
   */
  static async sendSignupOtp(
    input: SignupSendOtpInput
  ): Promise<{ email: string; expiresIn: number }> {
    const email = input.email.toLowerCase().trim();

    const existing = await User.findOne({ email });
    if (existing) {
      throw new ConflictError('An account with this email address already exists. Please log in.');
    }

    // 1. Hash password with bcrypt cost factor 12
    const passwordHash = await User.hashPassword(input.password);
    const normalizedRole = normalizeUserRole(input.role);

    // 2. Remove any previous pending signup OTPs for this email
    await Otp.deleteMany({ email, purpose: 'signup' });

    // 3. Generate 6-digit OTP
    const otp = generate6DigitOtp();
    const otpHash = hashOtp(otp);

    // 4. Store pending registration data with 10-minute expiry
    const otpDoc = new Otp({
      email,
      otpHash,
      purpose: 'signup',
      userData: {
        name: input.name.trim(),
        email,
        passwordHash,
        role: normalizedRole,
        school: input.school,
        qualification: input.qualification,
        experienceYears: input.experienceYears
      },
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await otpDoc.save();

    // 5. Send styled verification email
    await EmailService.sendOtpEmail({
      to: email,
      name: input.name,
      otp,
      purpose: 'signup'
    });

    logger.info({ email, role: normalizedRole }, 'Sign-up OTP dispatched');

    return {
      email,
      expiresIn: 600
    };
  }

  /**
   * Verify Sign-Up OTP and finalize account registration.
   */
  static async verifySignupOtp(input: VerifyOtpInput): Promise<AuthSuccessPayload> {
    const email = input.email.toLowerCase().trim();

    const otpDoc = await Otp.findOne({ email, purpose: 'signup' });
    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      throw new BadRequestError(
        'Verification code has expired or is invalid. Please request a new code.'
      );
    }

    if (otpDoc.attempts >= 5) {
      await Otp.deleteOne({ _id: otpDoc._id });
      throw new BadRequestError(
        'Too many failed attempts. Please request a new verification code.'
      );
    }

    const hashedInput = hashOtp(input.otp);
    if (hashedInput !== otpDoc.otpHash) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      throw new BadRequestError(
        'Invalid verification code. Please check your email and try again.'
      );
    }

    // Double check user doesn't already exist
    const existing = await User.findOne({ email });
    if (existing) {
      await Otp.deleteOne({ _id: otpDoc._id });
      throw new ConflictError('An account with this email address already exists');
    }

    const userData = (otpDoc.userData || {}) as {
      name: string;
      email: string;
      passwordHash: string;
      role: UserRole;
      school?: string;
      qualification?: string;
      experienceYears?: number;
    };

    const role = userData.role || 'student';

    // 1. Create User document with verified email
    const user = new User({
      name: userData.name,
      email: userData.email,
      passwordHash: userData.passwordHash,
      role,
      status: role === 'teacher' ? 'pending' : 'active',
      isEmailVerified: true
    });

    await user.save();

    // 2. Create role-specific profile
    let profileData: unknown = null;
    if (role === 'teacher') {
      const teacherProfile = new TeacherProfile({
        userId: user._id,
        school: userData.school || 'ReadEase Partner School',
        qualification: userData.qualification || 'Certified Educator',
        experienceYears: userData.experienceYears || 1,
        verificationStatus: 'pending',
        maxStudents: 20
      });
      await teacherProfile.save();
      profileData = teacherProfile;
    } else if (role === 'student') {
      const studentProfile = new StudentProfile({
        userId: user._id,
        grade: 'Standard',
        preferredLanguage: 'en'
      });
      await studentProfile.save();
      profileData = studentProfile;
    } else if (role === 'parent') {
      const parentProfile = new ParentProfile({
        userId: user._id,
        relationship: 'guardian'
      });
      await parentProfile.save();
      profileData = parentProfile;
    } else if (role === 'special_educator') {
      const specialProfile = new SpecialEducatorProfile({
        userId: user._id,
        qualification: 'Certified Specialist',
        specialization: 'Dyslexia & Reading Accessibility'
      });
      await specialProfile.save();
      profileData = specialProfile;
    }

    // 3. Remove OTP document
    await Otp.deleteOne({ _id: otpDoc._id });

    // 4. Issue tokens
    const accessToken = TokenService.generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status
    });

    const { token: refreshToken } = TokenService.generateRefreshToken(user._id.toString());
    user.refreshTokenHash = TokenService.hashToken(refreshToken);
    user.lastLoginAt = new Date();
    await user.save();

    logger.info(
      { userId: user._id, email: user.email, role: user.role },
      'User verified email and signed up successfully'
    );

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
      teacherProfile: profileData
    };
  }

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
   * Authenticate user and issue tokens.
   * Blocks login if the user's email is not yet verified.
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

    // Block login for unverified local accounts (Google accounts are pre-verified)
    if (!user.isEmailVerified && user.authProvider !== 'google') {
      const err = new ForbiddenError(
        'Please verify your email address before signing in. Check your inbox for the verification link.'
      );
      // Attach a machine-readable code so the frontend can show the Resend button
      (err as unknown as Record<string, unknown>).code = 'EMAIL_NOT_VERIFIED';
      (err as unknown as Record<string, unknown>).email = user.email;
      throw err;
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
   * Complete Google OAuth login or registration with verified ID token
   *
   * Flow:
   * 1. Verify the Google ID token (JWT credential) with Google servers
   * 2. Extract user info (email, name, picture, Google sub ID)
   * 3. Find or create a user in the database
   * 4. Record the selected role
   * 5. Issue access and refresh tokens
   */
  static async googleLogin(input: GoogleAuthInput): Promise<AuthSuccessPayload> {
    const clientId = env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;

    let verifiedEmail: string;
    let verifiedName: string;
    let verifiedPicture: string | undefined;
    let verifiedGoogleId: string;

    if (clientId) {
      // Production: Verify the Google ID token with Google servers
      try {
        const client = new OAuth2Client(clientId);
        const ticket = await client.verifyIdToken({
          idToken: input.credential,
          audience: clientId
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          throw new UnauthorizedError('Invalid Google token: missing email in payload');
        }

        if (!payload.email_verified) {
          throw new UnauthorizedError('Google account email is not verified');
        }

        verifiedEmail = payload.email.toLowerCase();
        verifiedName = payload.name || payload.email.split('@')[0];
        verifiedPicture = payload.picture;
        verifiedGoogleId = payload.sub;

        logger.info({ email: verifiedEmail }, 'Google ID token verified successfully');
      } catch (error) {
        if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
          throw error;
        }
        logger.error({ error }, 'Google ID token verification failed');
        throw new UnauthorizedError('Google authentication failed: invalid or expired token');
      }
    } else {
      // Dev fallback: Use unverified payload fields when GOOGLE_CLIENT_ID is not configured
      logger.warn('GOOGLE_CLIENT_ID not set — using unverified Google payload (dev mode only)');

      if (!input.email || !input.name) {
        throw new BadRequestError(
          'Email and name are required when GOOGLE_CLIENT_ID is not configured'
        );
      }

      verifiedEmail = input.email.toLowerCase();
      verifiedName = input.name;
      verifiedPicture = input.profileImage;
      verifiedGoogleId = input.googleId || `google_dev_${Date.now()}`;
    }

    // Normalize role e.g. 'special-educator' -> 'special_educator'
    let normalizedRole: 'student' | 'teacher' | 'special_educator' | 'parent' | 'admin' = 'student';
    if (input.role === 'special-educator' || input.role === 'special_educator') {
      normalizedRole = 'special_educator';
    } else if (['student', 'teacher', 'parent', 'admin'].includes(input.role)) {
      normalizedRole = input.role as 'student' | 'teacher' | 'parent' | 'admin';
    }

    // Look for existing user by email
    let user = await User.findOne({ email: verifiedEmail }).select('+refreshTokenHash');

    if (user) {
      if (user.status === 'suspended') {
        throw new ForbiddenError(
          'Your account has been suspended. Please contact the administrator.'
        );
      }

      if (user.status === 'inactive') {
        throw new ForbiddenError('Your account is currently inactive.');
      }

      // Update Google-specific fields
      user.authProvider = 'google';
      user.googleId = verifiedGoogleId;
      if (verifiedPicture && !user.profileImage) user.profileImage = verifiedPicture;
      user.lastLoginAt = new Date();
    } else {
      // Create new user with Google provider
      user = new User({
        name: verifiedName,
        email: verifiedEmail,
        role: normalizedRole,
        status: 'active',
        authProvider: 'google',
        googleId: verifiedGoogleId,
        profileImage:
          verifiedPicture ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(verifiedName)}&background=4285F4&color=fff`,
        lastLoginAt: new Date()
      });
    }

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

    logger.info(
      { userId: user._id, role: user.role, email: user.email, provider: 'google' },
      'User authenticated via Google OAuth'
    );

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
   * Send a 6-digit password reset OTP to the user's email address.
   */
  static async sendForgotPasswordOtp(
    emailInput: string
  ): Promise<{ email: string; expiresIn: number }> {
    const email = emailInput.toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user) {
      // Don't leak user existence; pretend code was dispatched
      return {
        email,
        expiresIn: 600
      };
    }

    // 1. Clear existing forgot password OTPs
    await Otp.deleteMany({ email, purpose: 'forgot_password' });

    // 2. Generate 6-digit OTP
    const otp = generate6DigitOtp();
    const otpHash = hashOtp(otp);

    // 3. Store OTP record with 10-minute expiry
    const otpDoc = new Otp({
      email,
      otpHash,
      purpose: 'forgot_password',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });
    await otpDoc.save();

    // 4. Send email
    await EmailService.sendOtpEmail({
      to: email,
      name: user.name,
      otp,
      purpose: 'forgot_password'
    });

    logger.info({ userId: user._id, email }, 'Forgot password OTP dispatched');

    return {
      email,
      expiresIn: 600
    };
  }

  /**
   * Reset user password using the 6-digit OTP sent to their email.
   */
  static async resetPasswordWithOtp(
    input: ResetPasswordWithOtpInput
  ): Promise<{ message: string }> {
    const email = input.email.toLowerCase().trim();

    const otpDoc = await Otp.findOne({ email, purpose: 'forgot_password' });
    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      throw new BadRequestError(
        'Password reset code has expired or is invalid. Please request a new code.'
      );
    }

    if (otpDoc.attempts >= 5) {
      await Otp.deleteOne({ _id: otpDoc._id });
      throw new BadRequestError('Too many failed attempts. Please request a new code.');
    }

    const hashedInput = hashOtp(input.otp);
    if (hashedInput !== otpDoc.otpHash) {
      otpDoc.attempts += 1;
      await otpDoc.save();
      throw new BadRequestError('Invalid verification code. Please check your email.');
    }

    const user = await User.findOne({ email });
    if (!user) {
      throw new BadRequestError('Account not found');
    }

    // 1. Hash new password with bcrypt cost factor 12
    user.passwordHash = await User.hashPassword(input.newPassword);
    user.refreshTokenHash = undefined; // Invalidate previous sessions
    user.isEmailVerified = true;
    await user.save();

    // 2. Delete OTP record
    await Otp.deleteOne({ _id: otpDoc._id });

    logger.info({ userId: user._id, email }, 'Password reset successfully with OTP');

    return {
      message: 'Password reset successfully. You may now sign in with your new password.'
    };
  }

  /**
   * Resend an OTP code with 30-second cooldown enforcement.
   */
  static async resendOtp(input: ResendOtpInput): Promise<{ email: string; expiresIn: number }> {
    const email = input.email.toLowerCase().trim();
    const purpose = input.purpose;

    const existingOtp = await Otp.findOne({ email, purpose }).sort({ createdAt: -1 });

    if (existingOtp) {
      const timeSinceCreationMs = Date.now() - existingOtp.createdAt.getTime();
      if (timeSinceCreationMs < 30 * 1000) {
        const remainingSecs = Math.ceil((30 * 1000 - timeSinceCreationMs) / 1000);
        throw new BadRequestError(
          `Please wait ${remainingSecs} seconds before requesting a new code.`
        );
      }
    }

    if (purpose === 'signup') {
      if (!existingOtp || !existingOtp.userData) {
        throw new BadRequestError(
          'No pending registration found for this email. Please fill out the sign-up form.'
        );
      }

      const otp = generate6DigitOtp();
      existingOtp.otpHash = hashOtp(otp);
      existingOtp.attempts = 0;
      existingOtp.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await existingOtp.save();

      const userData = existingOtp.userData as { name?: string };
      await EmailService.sendOtpEmail({
        to: email,
        name: userData.name,
        otp,
        purpose: 'signup'
      });

      return {
        email,
        expiresIn: 600
      };
    } else {
      return this.sendForgotPasswordOtp(email);
    }
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

  // ─── Token-Link Email Verification ─────────────────────────────────────────

  /**
   * Register a new account immediately (emailVerified: false), then send a
   * cryptographically secure verification link to the user's email address.
   *
   * Security:
   *  - Raw token is NEVER stored — only its SHA-256 hash
   *  - Token expires after 1 hour
   *  - One-time use: token is cleared after successful verification
   */
  static async register(
    input: RegisterInput
  ): Promise<{ message: string; email: string; devVerifyUrl?: string }> {
    const email = input.email.toLowerCase().trim();

    // 1. Check for duplicate email
    const existing = await User.findOne({ email });
    if (existing) {
      if (!existing.isEmailVerified) {
        // Account exists but is unverified — treat as resend
        return this.resendVerification({ email });
      }
      throw new ConflictError('An account with this email address already exists. Please sign in.');
    }

    // 2. Hash password with bcrypt cost factor 12
    const passwordHash = await User.hashPassword(input.password);
    const normalizedRole = normalizeUserRole(input.role);

    // 3. Create user with emailVerified: false
    const user = new User({
      name: input.name.trim(),
      email,
      passwordHash,
      role: normalizedRole,
      status: normalizedRole === 'teacher' ? 'pending' : 'active',
      isEmailVerified: false,
      authProvider: 'local'
    });

    // 4. Generate 32-byte cryptographically secure raw token
    const rawToken = crypto.randomBytes(32).toString('hex'); // 64-char hex string

    // 5. Store only the SHA-256 hash — raw token never touches the database
    user.emailVerificationTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 6. Set 1-hour expiry
    user.emailVerificationExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await user.save();

    // 7. Create role-specific profile immediately
    if (normalizedRole === 'teacher') {
      const teacherProfile = new TeacherProfile({
        userId: user._id,
        school: 'ReadEase Partner School',
        qualification: 'Certified Educator',
        experienceYears: 1,
        verificationStatus: 'pending',
        maxStudents: 20
      });
      await teacherProfile.save();
    } else if (normalizedRole === 'student') {
      const studentProfile = new StudentProfile({
        userId: user._id,
        grade: 'Standard',
        preferredLanguage: 'en'
      });
      await studentProfile.save();
    } else if (normalizedRole === 'parent') {
      const parentProfile = new ParentProfile({
        userId: user._id,
        relationship: 'guardian'
      });
      await parentProfile.save();
    } else if (normalizedRole === 'special_educator') {
      const specialProfile = new SpecialEducatorProfile({
        userId: user._id,
        qualification: 'Certified Specialist',
        specialization: 'Dyslexia & Reading Accessibility'
      });
      await specialProfile.save();
    }

    // 8. Build the verification URL using FRONTEND_URL env var
    const frontendUrl = env.FRONTEND_URL.replace(/\/$/, '');
    const verificationUrl = `${frontendUrl}/verify-email?token=${rawToken}`;

    // 9. Send styled verification email via Nodemailer
    await EmailService.sendVerificationEmail({
      to: email,
      name: input.name.trim(),
      verificationUrl
    });

    logger.info(
      { userId: user._id, email, role: normalizedRole },
      'User registered — verification email dispatched'
    );

    return {
      message:
        'Account created successfully. Please check your email and click the verification link to activate your account.',
      email,
      // In non-production, expose the URL so developers can test without real email
      ...(process.env.NODE_ENV !== 'production' ? { devVerifyUrl: verificationUrl } : {})
    };
  }

  /**
   * Verify a user's email address using the token from the verification link.
   *
   * Security:
   *  - Hashes the incoming token and compares against stored hash
   *  - Rejects expired tokens
   *  - Token is cleared after first use (no reuse)
   */
  static async verifyEmail(token: string): Promise<{ message: string; email: string }> {
    // 1. SHA-256 hash the received raw token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // 2. Find user with matching hash and non-expired timestamp
    const user = await User.findOne({
      emailVerificationTokenHash: tokenHash
    }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');

    // 3. Reject if not found (invalid token or already used)
    if (!user) {
      throw new BadRequestError(
        'This verification link is invalid or has already been used. Please request a new one.'
      );
    }

    // 4. Reject if expired
    if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      // Clean up expired token fields
      user.emailVerificationTokenHash = undefined;
      user.emailVerificationExpiresAt = undefined;
      await user.save();
      const expiredErr = new BadRequestError(
        'This verification link has expired. Please request a new verification email.'
      );
      (expiredErr as unknown as Record<string, unknown>).code = 'TOKEN_EXPIRED';
      (expiredErr as unknown as Record<string, unknown>).email = user.email;
      throw expiredErr;
    }

    // 5. Mark email as verified and clear token fields (one-time use)
    user.isEmailVerified = true;
    user.emailVerificationTokenHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    logger.info({ userId: user._id, email: user.email }, 'Email verified successfully');

    return {
      message: 'Email verified successfully. You can now sign in to your account.',
      email: user.email
    };
  }

  /**
   * Resend a verification email with a fresh secure token.
   * Enforces a 60-second cooldown to prevent abuse.
   * Does not reveal whether an arbitrary email exists in the database.
   */
  static async resendVerification(
    input: ResendVerificationInput
  ): Promise<{ message: string; email: string; devVerifyUrl?: string }> {
    const email = input.email.toLowerCase().trim();

    const user = await User.findOne({ email }).select(
      '+emailVerificationTokenHash +emailVerificationExpiresAt'
    );

    // Security: return the same success message whether or not the email exists
    const genericResponse = {
      message:
        'If an unverified account exists for this email, a new verification link has been dispatched.',
      email
    };

    if (!user) {
      return genericResponse;
    }

    if (user.isEmailVerified) {
      return {
        message: 'This email address is already verified. You can sign in directly.',
        email
      };
    }

    // Enforce 60-second cooldown: check how recently the current token was set
    if (user.emailVerificationExpiresAt) {
      const tokenAgeMs = 60 * 60 * 1000 - (user.emailVerificationExpiresAt.getTime() - Date.now());
      const cooldownMs = 60 * 1000; // 60 seconds
      if (tokenAgeMs < cooldownMs) {
        const remainingSecs = Math.ceil((cooldownMs - tokenAgeMs) / 1000);
        throw new BadRequestError(
          `Please wait ${remainingSecs} second(s) before requesting another verification email.`
        );
      }
    }

    // Generate fresh token
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.emailVerificationExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    const frontendUrl = env.FRONTEND_URL.replace(/\/$/, '');
    const verificationUrl = `${frontendUrl}/verify-email?token=${rawToken}`;

    await EmailService.sendVerificationEmail({
      to: email,
      name: user.name,
      verificationUrl
    });

    logger.info({ userId: user._id, email }, 'Verification email resent');

    return {
      message: 'A new verification link has been dispatched to your email address.',
      email,
      ...(process.env.NODE_ENV !== 'production' ? { devVerifyUrl: verificationUrl } : {})
    };
  }
}
