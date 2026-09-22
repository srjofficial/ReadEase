import { Router } from 'express';
import { TeacherController } from '../controllers/teacher.controller';
import {
  authenticate,
  requireRole,
  requireVerifiedTeacher,
  enforceTeacherCapacity
} from '../middleware/auth.middleware';

const router = Router();

// All teacher routes require authentication and teacher role
router.use(authenticate, requireRole('teacher', 'admin'));

// Dashboard
router.get('/dashboard', TeacherController.getDashboard);

// Analytics
router.get('/analytics', TeacherController.getAnalytics);

// Student roster
router.get('/students', requireVerifiedTeacher, TeacherController.getStudents);
router.post(
  '/students',
  requireVerifiedTeacher,
  enforceTeacherCapacity,
  TeacherController.addStudent
);
router.get('/students/:studentId', requireVerifiedTeacher, TeacherController.getStudentProfile);
router.delete('/students/:studentId', requireVerifiedTeacher, TeacherController.removeStudent);

export const teacherRoutes = router;
