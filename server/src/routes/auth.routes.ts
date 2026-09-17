import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authRateLimiter, authenticate, requireDatabase } from '../middleware';
import {
  validateBody,
  teacherRegisterSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from '../validators';

const router = Router();

// Apply strict rate limiting and database check to auth routes
router.use(authRateLimiter);
router.use(requireDatabase);

// 1. POST /api/auth/register/teacher
router.post(
  '/register/teacher',
  validateBody(teacherRegisterSchema),
  AuthController.registerTeacher
);

// 2. POST /api/auth/login
router.post('/login', validateBody(loginSchema), AuthController.login);

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
