import { Router } from 'express';
import { EducatorController } from '../controllers/educator.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate, requireRole('special_educator', 'admin'));

router.get('/dashboard', EducatorController.getDashboard);
router.get('/students', EducatorController.getAssignedStudents);
router.get('/students/:studentId', EducatorController.getStudentProfile);

export const educatorRoutes = router;
