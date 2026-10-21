import { Router } from 'express';
import { AiController } from '../controllers/ai.controller';
import { authenticateOptional } from '../middleware/auth.middleware';

const router = Router();

// POST /api/v1/ai/extract-passage
router.post('/extract-passage', authenticateOptional, AiController.extractPassage);

// POST /api/v1/ai/verify-reading
router.post('/verify-reading', authenticateOptional, AiController.verifyReading);

export const aiRoutes = router;
