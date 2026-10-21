import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export interface VerifyReadingPayload {
  passageText: string;
  spokenTranscript: string;
  language?: 'English' | 'Malayalam';
  gazeMetrics?: {
    wpm?: number;
    stabilityScore?: number;
    totalFixations?: number;
    totalRegressions?: number;
    verifiedWordsCount?: number;
    totalWordsCount?: number;
  };
  activeWordIndex?: number | null;
}

export interface WordPronunciationResult {
  word: string;
  status: 'correct' | 'mispronounced' | 'skipped' | 'hesitation';
  spokenAs?: string;
  phoneticTip?: string;
  confidence: number;
}

export interface VerifyReadingResponse {
  accuracyPercentage: number;
  fluencyScore: number;
  speechGazeSyncScore: number;
  wordsAnalyzed: number;
  correctWordsCount: number;
  mispronouncedCount: number;
  skippedCount: number;
  wordBreakdown: WordPronunciationResult[];
  pronunciationTips: string[];
  practiceWords: { word: string; breakdown: string; hint: string }[];
  pedagogicalFeedback: string;
  overallAssessment: 'Independent' | 'Instructional' | 'Frustrational';
}

/**
 * Token cleaning helper supporting English and Malayalam Unicode scripts
 */
function cleanToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[^\w\u0D00-\u0D7F]/gu, '')
    .trim();
}

/**
 * Deterministic algorithmic alignment fallback in case LLM API is unavailable
 */
function computeAlgorithmicFallback(
  targetWords: string[],
  spokenWords: string[],
  gazeMetrics?: VerifyReadingPayload['gazeMetrics']
): VerifyReadingResponse {
  const m = targetWords.length;
  const n = spokenWords.length;
  const cleanTarget = targetWords.map(cleanToken);
  const cleanSpoken = spokenWords.map(cleanToken);

  // Dynamic Programming Longest Common Subsequence (LCS)
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (cleanTarget[i - 1] === cleanSpoken[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const correctCount = dp[m][n];
  const attempted = Math.max(1, Math.min(m, n > 0 ? n : m));
  const accuracyPercentage = Math.max(
    30,
    Math.min(100, Math.round((correctCount / attempted) * 100))
  );

  const wordBreakdown: WordPronunciationResult[] = targetWords.map((word, idx) => {
    const isMatched = cleanSpoken.includes(cleanTarget[idx]);
    return {
      word,
      status: isMatched ? 'correct' : idx < n ? 'mispronounced' : 'skipped',
      confidence: isMatched ? 0.95 : 0.65
    };
  });

  const mispronouncedCount = wordBreakdown.filter((w) => w.status === 'mispronounced').length;
  const skippedCount = wordBreakdown.filter((w) => w.status === 'skipped').length;

  const stability = gazeMetrics?.stabilityScore ?? 88;
  const speechGazeSyncScore = Math.max(60, Math.min(98, Math.round(stability * 0.9 + (accuracyPercentage * 0.1))));

  const assessment: 'Independent' | 'Instructional' | 'Frustrational' =
    accuracyPercentage >= 95 ? 'Independent' : accuracyPercentage >= 90 ? 'Instructional' : 'Frustrational';

  return {
    accuracyPercentage,
    fluencyScore: Math.min(100, Math.max(50, Math.round(accuracyPercentage * 0.92))),
    speechGazeSyncScore,
    wordsAnalyzed: m,
    correctWordsCount: correctCount,
    mispronouncedCount,
    skippedCount,
    wordBreakdown: wordBreakdown.slice(0, 40),
    pronunciationTips: [
      'Focus on pacing each syllable steadily with your gaze follower spotlight.',
      'Take a gentle breath at punctuation marks to maintain vocal fluency.'
    ],
    practiceWords: targetWords.slice(0, 3).map((w) => ({
      word: w,
      breakdown: w.split('').join('-'),
      hint: 'Pronounce the first consonant sound clearly before blending into the vowel.'
    })),
    pedagogicalFeedback:
      accuracyPercentage >= 90
        ? 'Great oral reading trajectory! Your gaze stability and word articulation show strong phonetic coordination.'
        : 'Good effort! Focusing your eyes on the word anchor highlights will help reduce skips and hesitation.',
    overallAssessment: assessment
  };
}

export class ReadingVerificationService {
  /**
   * Evaluates oral reading and pronunciation against benchmark passage using AI
   */
  static async verifyReading(payload: VerifyReadingPayload): Promise<VerifyReadingResponse> {
    const { passageText, spokenTranscript, language, gazeMetrics } = payload;
    const targetWords = (passageText || '').split(/\s+/).filter(Boolean);
    const spokenWords = (spokenTranscript || '').split(/\s+/).filter(Boolean);

    if (targetWords.length === 0) {
      throw new Error('Target passage text is required for reading verification.');
    }

    const isMalayalam = language === 'Malayalam' || /[\u0D00-\u0D7F]/.test(passageText);

    const systemPrompt = `You are ReadEase AI Reading & Pronunciation Clinical Specialist.
You evaluate oral reading accuracy and pronunciation for students, including those with dyslexia or phonological reading difficulties.
Compare the Reference Passage against the Student's Spoken Audio Transcript.

Analyze:
1. Exact oral accuracy percentage (0-100%).
2. Word-by-word pronunciation status: 'correct', 'mispronounced', 'skipped', or 'hesitation'.
3. Phonetic substitutions (e.g., "saw" for "was", "b" for "d", consonant cluster omissions).
4. Speech-Gaze synchrony: how well vocal speech matches oculomotor reading progression (score 0-100).
5. 2-3 specific pronunciation tips and practice words with syllable breakdowns.
6. Encouraging pedagogical feedback suitable for a learning assistant.

Return ONLY a valid JSON object matching this schema without markdown code blocks:
{
  "accuracyPercentage": number,
  "fluencyScore": number,
  "speechGazeSyncScore": number,
  "wordsAnalyzed": number,
  "correctWordsCount": number,
  "mispronouncedCount": number,
  "skippedCount": number,
  "wordBreakdown": [
    {
      "word": string,
      "status": "correct" | "mispronounced" | "skipped" | "hesitation",
      "spokenAs": string,
      "phoneticTip": string,
      "confidence": number
    }
  ],
  "pronunciationTips": [string],
  "practiceWords": [
    {
      "word": string,
      "breakdown": string,
      "hint": string
    }
  ],
  "pedagogicalFeedback": string,
  "overallAssessment": "Independent" | "Instructional" | "Frustrational"
}`;

    const userPrompt = `
Language: ${isMalayalam ? 'Malayalam (മലയാളം)' : 'English'}
Gaze Telemetry: WPM = ${gazeMetrics?.wpm ?? 'N/A'}, Stability = ${gazeMetrics?.stabilityScore ?? 90}%, Regressions = ${gazeMetrics?.totalRegressions ?? 0}
Reference Benchmark Passage:
"""
${passageText}
"""

Spoken Transcript Captured from Microphone:
"""
${spokenTranscript || '(No audio recorded or silent reading)'}
"""
`;

    const modelToUse = env.LLM_MODEL || 'llama-3.3-70b-versatile';

    try {
      const response = await fetch(`${env.LLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.LLM_API_KEY}`
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2,
          max_tokens: 1500
        })
      });

      if (!response.ok) {
        logger.warn({ status: response.status }, 'LLM reading verification non-200, using fallback');
        return computeAlgorithmicFallback(targetWords, spokenWords, gazeMetrics);
      }

      const data = await response.json();
      const rawOutput = data.choices?.[0]?.message?.content?.trim() || '';

      const jsonClean = rawOutput
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')
        .trim();

      const parsed = JSON.parse(jsonClean) as VerifyReadingResponse;
      return parsed;
    } catch (err) {
      logger.warn({ err }, 'Error calling LLM for reading verification, using algorithmic fallback');
      return computeAlgorithmicFallback(targetWords, spokenWords, gazeMetrics);
    }
  }
}
