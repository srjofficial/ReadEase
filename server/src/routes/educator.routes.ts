import { Router } from 'express';
import { EducatorController } from '../controllers/educator.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate, requireRole('special_educator', 'admin'));

router.get('/dashboard', EducatorController.getDashboard);
router.get('/clinical-validation', EducatorController.getClinicalValidation);
router.get('/students', EducatorController.getAssignedStudents);
router.get('/students/:studentId', EducatorController.getStudentProfile);
router.get('/students/:studentId/diagnostics', EducatorController.getDiagnostics);
router.get('/students/:studentId/longitudinal', EducatorController.getLongitudinalDiagnostics);
router.post('/students/:studentId/clinical-assessment', EducatorController.updateClinicalAssessment);
router.get('/students/:studentId/phonemics', EducatorController.getPhonemicAnalysis);
router.put('/students/:studentId/accommodations', EducatorController.updateStudentAccommodations);

export const educatorRoutes = router;
