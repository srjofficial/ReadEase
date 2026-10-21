import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';
import { assessmentRoutes } from './assessment.routes';
import { ttsRoutes } from './tts.routes';
import { chatRoutes } from './chat.routes';
import { teacherRoutes } from './teacher.routes';
import { educatorRoutes } from './educator.routes';
import { parentRoutes } from './parent.routes';
import { aiRoutes } from './ai.routes';
import { adminRoutes } from './admin.routes';

const router = Router();

// Mount Modular Routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);
router.use('/assessment', assessmentRoutes);
router.use('/tts', ttsRoutes);
router.use('/chat', chatRoutes);
router.use('/ai', aiRoutes);
router.use('/teacher', teacherRoutes);
router.use('/educator', educatorRoutes);
router.use('/parent', parentRoutes);
router.use('/admin', adminRoutes);

export const apiRouter = router;
