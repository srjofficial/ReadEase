import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authRateLimiter, authenticate, requireDatabase } from '../middleware';
import {
  validateBody,
  teacherRegisterSchema,
  loginSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signupSendOtpSchema,
  verifyOtpSchema,
  resendOtpSchema,
  resetPasswordWithOtpSchema,
  registerSchema,
  resendVerificationSchema
} from '../validators';

const router = Router();

// Apply strict rate limiting and database check to auth routes
router.use(authRateLimiter);
router.use(requireDatabase);

// 0a. POST /api/auth/signup/send-otp & /api/auth/register/send-otp
router.post('/signup/send-otp', validateBody(signupSendOtpSchema), AuthController.sendSignupOtp);
router.post('/register/send-otp', validateBody(signupSendOtpSchema), AuthController.sendSignupOtp);

// 0b. POST /api/auth/signup/verify-otp & /api/auth/register/verify-otp
router.post('/signup/verify-otp', validateBody(verifyOtpSchema), AuthController.verifySignupOtp);
router.post('/register/verify-otp', validateBody(verifyOtpSchema), AuthController.verifySignupOtp);

// 0c. POST /api/auth/resend-otp
router.post('/resend-otp', validateBody(resendOtpSchema), AuthController.resendOtp);

// 0d. POST /api/auth/forgot-password/send-otp
router.post(
  '/forgot-password/send-otp',
  validateBody(forgotPasswordSchema),
  AuthController.sendForgotPasswordOtp
);

// 0e. POST /api/auth/forgot-password/reset
router.post(
  '/forgot-password/reset',
  validateBody(resetPasswordWithOtpSchema),
  AuthController.resetPasswordWithOtp
);

// ─── Token-Link Email Verification Routes ────────────────────────────────────

// R1. POST /api/auth/register  — direct signup, sends verification link
router.post('/register', validateBody(registerSchema), AuthController.register);

// R2. GET /api/auth/verify-email?token=<TOKEN>
router.get('/verify-email', AuthController.verifyEmail);

// R3. POST /api/auth/resend-verification
router.post(
  '/resend-verification',
  validateBody(resendVerificationSchema),
  AuthController.resendVerification
);

// 1. POST /api/auth/register/teacher
router.post(
  '/register/teacher',
  validateBody(teacherRegisterSchema),
  AuthController.registerTeacher
);

// 2. POST /api/auth/login
router.post('/login', validateBody(loginSchema), AuthController.login);

// 2b. POST /api/auth/google
router.post('/google', validateBody(googleAuthSchema), AuthController.googleLogin);

// 3. POST /api/auth/refresh
router.post('/refresh', AuthController.refresh);

// 4. POST /api/auth/logout
router.post('/logout', authenticate, AuthController.logout);

// 5. POST /api/auth/forgot-password
router.post('/forgot-password', validateBody(forgotPasswordSchema), AuthController.forgotPassword);

// 6. POST /api/auth/reset-password
router.post('/reset-password', validateBody(resetPasswordSchema), AuthController.resetPassword);

// 7. GET /api/auth/me
router.get('/me', authenticate, AuthController.getMe);

export const authRoutes = router;
