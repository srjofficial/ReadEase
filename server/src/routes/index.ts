import { Router } from 'express';
import { healthRoutes } from './health.routes';
import { authRoutes } from './auth.routes';

const router = Router();

// Mount Modular Routes
router.use('/', healthRoutes);
router.use('/auth', authRoutes);

export const apiRouter = router;
