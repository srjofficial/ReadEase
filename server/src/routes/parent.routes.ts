import { Router } from 'express';
import { ParentController } from '../controllers/parent.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate, requireRole('parent', 'admin'));

router.get('/dashboard', ParentController.getDashboard);
router.get('/child/:studentId/progress', ParentController.getChildProgress);
router.get('/child/:studentId/sessions', ParentController.getChildSessions);
router.get('/accommodations', ParentController.getAccommodations);
router.put('/accommodations', ParentController.updateAccommodations);
router.get('/collaboration', ParentController.getCollaboration);
router.post('/collaboration', ParentController.sendCollaborationNote);

export const parentRoutes = router;
