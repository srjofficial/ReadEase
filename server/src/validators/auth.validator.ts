import { z } from 'zod';

export const userRoleEnum = z.enum([
  'student',
  'teacher',
  'special_educator',
  'special-educator',
  'parent',
  'admin'
]);

export const teacherRegisterSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address format').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  school: z.string().trim().min(2, 'School name is required'),
  qualification: z.string().trim().min(2, 'Teaching qualification is required'),
  experienceYears: z.coerce.number().min(0, 'Experience years cannot be negative'),
  verificationDocuments: z
    .array(
      z.object({
        title: z.string().trim().min(1),
        fileUrl: z.string().url('Verification document must be a valid URL'),
        fileType: z.string().trim().min(1)
      })
    )
    .optional()
    .default([])
});

export const signupSendOtpSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address format').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: userRoleEnum.default('student'),
  school: z.string().trim().optional(),
  qualification: z.string().trim().optional(),
  experienceYears: z.coerce.number().optional()
});

export const verifyOtpSchema = z.object({
  email: z.string().trim().email('Invalid email address format').toLowerCase(),
  otp: z
    .string()
    .trim()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must be a 6-digit number')
});

export const resendOtpSchema = z.object({
  email: z.string().trim().email('Invalid email address format').toLowerCase(),
  purpose: z.enum(['signup', 'forgot_password']).default('signup')
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address format').toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address format').toLowerCase()
});

export const resetPasswordWithOtpSchema = z.object({
  email: z.string().trim().email('Invalid email address format').toLowerCase(),
  otp: z
    .string()
    .trim()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters')
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(10, 'Reset token is invalid or missing'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters')
});

export const googleAuthSchema = z.object({
  credential: z.string().min(1, 'Google ID token is required'),
  role: userRoleEnum.default('student'),
  email: z.string().trim().email().toLowerCase().optional(),
  name: z.string().trim().max(100).optional(),
  profileImage: z.string().url().optional(),
  googleId: z.string().optional()
});

export type TeacherRegisterInput = z.infer<typeof teacherRegisterSchema>;
export type SignupSendOtpInput = z.infer<typeof signupSendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordWithOtpInput = z.infer<typeof resetPasswordWithOtpSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

// ─── Token-link email verification schemas ────────────────────────────────────

/**
 * Direct registration: creates user immediately with emailVerified:false,
 * then sends a verification link (not OTP) to the user's email.
 */
export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address format').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: userRoleEnum.default('student')
});

/** Resend a verification email to an unverified address */
export const resendVerificationSchema = z.object({
  email: z.string().trim().email('Invalid email address format').toLowerCase()
});

/** Token received as a query param on GET /verify-email */
export const verifyEmailQuerySchema = z.object({
  token: z.string().trim().min(10, 'Verification token is missing or malformed')
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>;
export type VerifyEmailQueryInput = z.infer<typeof verifyEmailQuerySchema>;
