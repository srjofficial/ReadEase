import { z } from 'zod';

export const teacherRegisterSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address format').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
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

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address format').toLowerCase(),
  password: z.string().min(1, 'Password is required')
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address format').toLowerCase()
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(10, 'Reset token is invalid or missing'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
});

export type TeacherRegisterInput = z.infer<typeof teacherRegisterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
