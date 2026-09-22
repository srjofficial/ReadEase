import { Router, Request, Response } from 'express';
import { TTSService, TTSSynthesizeRequest } from '../services/tts/tts.service';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/tts/synthesize
 * Synthesize bilingual Malayalam or English text to speech with synchronized timings.
 */
router.post('/synthesize', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, language, voice, rate, pitch } = req.body as TTSSynthesizeRequest;

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Field "text" is required and must be a non-empty string.' });
      return;
    }

    const result = await TTSService.synthesize({
      text,
      language,
      voice,
      rate: Number(rate) || 1.0,
      pitch: Number(pitch) || 1.0
    });

    res.status(200).json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal TTS synthesis failure';
    logger.error(`[TTSRoutes] /synthesize error: ${message}`);
    res.status(500).json({ error: message });
  }
});

export const ttsRoutes = router;
