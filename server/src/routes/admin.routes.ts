import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticate, requireRole } from '../middleware/auth.middleware';

const router = Router();

// All routes require authenticating as 'admin'
router.use(authenticate, requireRole('admin'));

router.get('/stats', AdminController.getStats);
router.get('/users', AdminController.getUsers);
router.patch('/users/:id/status', AdminController.updateUserStatus);
router.get('/ai-pipeline', AdminController.getAiPipeline);
router.get('/audit-logs', AdminController.getAuditLogs);

export const adminRoutes = router;
