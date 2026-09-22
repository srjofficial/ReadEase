import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export interface TTSWordTiming {
  word: string;
  start_ms: number;
  end_ms: number;
  syllables?: string[];
}

export interface TTSSynthesizeRequest {
  text: string;
  language?: 'en' | 'ml';
  voice?: string;
  rate?: number;
  pitch?: number;
}

export interface TTSSynthesizeResponse {
  audio_base64: string;
  audio_format: string;
  duration_ms: number;
  language: string;
  word_timings: TTSWordTiming[];
  cached?: boolean;
}

export class TTSService {
  private static readonly AI_SERVICE_TIMEOUT_MS = 12000;

  private static getHeaders() {
    return {
      'Content-Type': 'application/json',
      'X-Internal-Service-Key': env.AI_SERVICE_SECRET,
      Authorization: `Bearer ${env.AI_SERVICE_SECRET}`
    };
  }

  /**
   * Synthesizes bilingual text into speech audio with synchronized word timings
   * using the AI microservice (backed by native Malayalam + English gTTS).
   */
  public static async synthesize(request: TTSSynthesizeRequest): Promise<TTSSynthesizeResponse> {
    const text = request.text.trim();
    if (!text) {
      throw new Error('Text to synthesize cannot be empty.');
    }

    // Determine target language (detect Malayalam Unicode block if auto/unspecified)
    const isMalayalam = request.language === 'ml' || /[\u0D00-\u0D7F]/.test(text);
    const language = isMalayalam ? 'ml' : 'en';

    try {
      const url = `${env.AI_SERVICE_URL}/api/tts/synthesize`;
      const response = await fetch(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          text,
          language,
          voice: request.voice || 'natural',
          rate: request.rate || 1.0,
          pitch: request.pitch || 1.0
        }),
        signal: AbortSignal.timeout(this.AI_SERVICE_TIMEOUT_MS)
      });

      if (!response.ok) {
        logger.warn({ status: response.status }, 'AI service TTS returned non-200');
        return this.fallbackSynthesis(text, language, request.rate || 1.0);
      }

      const data = (await response.json()) as TTSSynthesizeResponse;
      logger.info(
        `[TTSService] Speech synthesized for lang '${language}', chars=${text.length}, duration=${data.duration_ms}ms`
      );
      return data;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      logger.warn(
        `[TTSService] ai-service TTS error (${errorMsg}). Using fallback audio estimation.`
      );
      return this.fallbackSynthesis(text, language, request.rate || 1.0);
    }
  }

  private static fallbackSynthesis(
    text: string,
    language: string,
    rate: number
  ): TTSSynthesizeResponse {
    const words = text.split(/\s+/).filter(Boolean);
    const msPerWord = Math.round(60000 / (135 * rate));
    let currentMs = 0;

    const timings: TTSWordTiming[] = words.map((w) => {
      const start = currentMs;
      const end = start + msPerWord;
      currentMs = end;
      return {
        word: w,
        start_ms: start,
        end_ms: end,
        syllables: [w]
      };
    });

    return {
      audio_base64: '',
      audio_format: 'mp3',
      duration_ms: currentMs,
      language,
      word_timings: timings,
      cached: false
    };
  }
}
