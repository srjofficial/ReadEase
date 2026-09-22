import { Request, Response, NextFunction } from 'express';
import { ChatbotService } from '../services/chatbot';

export class ChatController {
  /**
   * POST /api/chat or POST /api/v1/chat
   * Ask the ReadEase AI Reading Buddy
   */
  static async sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message, history, roleContext, language } = req.body;

      if (!message || typeof message !== 'string' || !message.trim()) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'A valid message string is required.'
          }
        });
        return;
      }

      const userId = (req as any).user?._id?.toString() || (req as any).user?.id?.toString();

      const result = await ChatbotService.processMessage({
        message: message.trim(),
        history: Array.isArray(history) ? history : [],
        roleContext: roleContext || (req as any).user?.role || 'student',
        language: language === 'ML' ? 'ML' : 'EN',
        userId
      });

      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}
