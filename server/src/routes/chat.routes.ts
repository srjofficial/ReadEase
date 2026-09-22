import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticateOptional } from '../middleware/auth.middleware';

const router = Router();

// POST /api/v1/chat or /api/chat
router.post('/', authenticateOptional, ChatController.sendMessage);

export const chatRoutes = router;
