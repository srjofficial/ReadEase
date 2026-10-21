import { Request, Response, NextFunction } from 'express';
import { PassageExtractorService } from '../services/ai/passageExtractor.service';
import { ReadingVerificationService } from '../services/ai/readingVerification.service';

export class AiController {
  /**
   * POST /api/v1/ai/extract-passage
   * Extract, clean, and format reading passage from raw document text using AI
   */
  static async extractPassage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { rawText, fileName, targetGrade, language } = req.body;

      if (!rawText && !fileName) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either rawText or fileName is required for AI passage extraction.'
          }
        });
        return;
      }

      const result = await PassageExtractorService.extractPassage({
        rawText: String(rawText || ''),
        fileName: fileName ? String(fileName) : undefined,
        targetGrade: targetGrade ? String(targetGrade) : undefined,
        language: language === 'Malayalam' ? 'Malayalam' : 'English'
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

  /**
   * POST /api/v1/ai/verify-reading
   * Verify oral pronunciation and speech-gaze reading alignment using AI
   */
  static async verifyReading(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { passageText, spokenTranscript, language, gazeMetrics, activeWordIndex } = req.body;

      if (!passageText) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'passageText is required for reading verification.'
          }
        });
        return;
      }

      const result = await ReadingVerificationService.verifyReading({
        passageText: String(passageText),
        spokenTranscript: String(spokenTranscript || ''),
        language: language === 'Malayalam' ? 'Malayalam' : 'English',
        gazeMetrics,
        activeWordIndex
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

