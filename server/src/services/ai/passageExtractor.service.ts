import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export interface ExtractPassagePayload {
  rawText: string;
  fileName?: string;
  targetGrade?: string;
  language?: 'English' | 'Malayalam';
}

export interface ExtractPassageResponse {
  title: string;
  passage: string;
  gradeLevel: string;
  language: 'English' | 'Malayalam';
  wordCount: number;
  readingTimeMinutes: number;
  summary?: string;
  source: 'ai-extracted' | 'ai-reconstructed';
}

/**
 * Filter out obvious binary / JPEG / JFIF noise and unprintable character spam
 */
function cleanBinaryArtifacts(text: string): { cleaned: string; hadBinaryNoise: boolean } {
  let cleaned = text;
  const hadBinaryNoise = /JFIF|Exif|\!2222222222|DCTDecode|stream\b/i.test(text);

  // Remove JFIF blocks and JPEG headers
  cleaned = cleaned.replace(/JFIF[\s\S]*?(?=\b[A-Za-z]{3,}|\n\n|$)/gi, '');
  // Remove repetitive exclamation / number patterns like "!22222222..."
  cleaned = cleaned.replace(/!2{5,}/g, '');
  // Remove non-printable control characters while keeping standard whitespace and unicode
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
  // Collapse whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return { cleaned, hadBinaryNoise };
}

export class PassageExtractorService {
  static async extractPassage(payload: ExtractPassagePayload): Promise<ExtractPassageResponse> {
    const { rawText, fileName, targetGrade, language } = payload;
    const { cleaned, hadBinaryNoise } = cleanBinaryArtifacts(rawText || '');

    // Sample words to see if readable content exists
    const words = cleaned.split(/\s+/).filter((w) => w.length > 2 && /^[a-zA-Z\u0D00-\u0D7F]+$/.test(w));
    const isMalayalam = language === 'Malayalam' || /[\u0D00-\u0D7F]/.test(cleaned);

    const promptContext = `
Document Name: "${fileName || 'Reading Passage'}"
Target Grade Request: ${targetGrade || 'Grade 3 - Grade 4'}
Target Language: ${isMalayalam ? 'Malayalam (മലയാളം)' : 'English'}
Had Scanned Image/Binary Noise: ${hadBinaryNoise ? 'Yes (contains JFIF/image scan artifacts)' : 'No'}
Raw Extracted Text Sample (first 2500 chars):
"""
${cleaned.slice(0, 2500)}
"""
`;

    const systemPrompt = `You are ReadEase AI Reading Specialist, an expert in reading comprehension, accessibility, and dyslexia-friendly curriculum design.
Your task is to analyze document text uploaded by an educator and output a clean, educational, and high-quality reading passage for students.

Rules:
1. Strip out ALL binary artifacts, image tags, JFIF markers, PDF encoding noise, and meaningless character gibberish.
2. If readable text is present, reconstruct and polish the core text into clean, engaging paragraphs with smooth transitions and correct punctuation.
3. If the input was predominantly binary noise (from a scanned image or photo PDF), write a compelling, educational story/passage of about 150-250 words inspired by the document name ("${fileName || 'Nature & Learning'}").
4. Grade Level should be appropriate for elementary/middle school (e.g. "Grade 3", "Grade 4", "Grade 5").
5. Return ONLY a valid JSON object with no wrapping markdown quotes:
{
  "title": "Title of the Passage",
  "passage": "Paragraph 1\\n\\nParagraph 2...",
  "gradeLevel": "Grade 3",
  "language": "${isMalayalam ? 'Malayalam' : 'English'}",
  "summary": "Brief 1-sentence summary of the passage."
}`;

    const modelToUse = env.LLM_MODEL || 'openai/gpt-oss-120b';

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
            { role: 'user', content: promptContext }
          ],
          temperature: 0.3,
          max_tokens: 1200
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.warn({ errorText, status: response.status }, 'Groq LLM extraction API non-200');
        throw new Error(`LLM API returned status ${response.status}`);
      }

      const data = await response.json();
      const rawOutput = data.choices?.[0]?.message?.content?.trim() || '';

      // Strip markdown code block wrappers if any
      const jsonString = rawOutput
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/, '')
        .replace(/\s*```$/, '')
        .trim();

      let parsed: any;
      try {
        parsed = JSON.parse(jsonString);
      } catch (jsonErr) {
        // Fallback: extract JSON with regex
        const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Could not parse AI response as JSON.');
        }
      }

      const finalPassage = parsed.passage || cleaned || 'Custom reading passage.';
      const passageWords = finalPassage.trim().split(/\s+/).filter(Boolean).length;

      return {
        title: parsed.title || fileName?.replace(/\.[^/.]+$/, '') || 'Reading Passage',
        passage: finalPassage,
        gradeLevel: parsed.gradeLevel || targetGrade || 'Grade 3',
        language: parsed.language === 'Malayalam' ? 'Malayalam' : 'English',
        wordCount: passageWords,
        readingTimeMinutes: Math.max(1, Math.ceil(passageWords / 120)),
        summary: parsed.summary,
        source: hadBinaryNoise ? 'ai-reconstructed' : 'ai-extracted'
      };
    } catch (err) {
      logger.error({ err }, 'Failed AI passage extraction, providing fallback cleanup');

      // Fallback: rule-based cleanup
      const fallbackTitle = fileName?.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ') || 'Reading Passage';
      const fallbackText =
        words.length > 20
          ? words.join(' ')
          : `This reading passage has been prepared for your classroom. The document "${fallbackTitle}" was processed for accessible reading with Bionic fixation points and synchronized audio guidance.`;

      const finalWordCount = fallbackText.split(/\s+/).filter(Boolean).length;

      return {
        title: fallbackTitle,
        passage: fallbackText,
        gradeLevel: targetGrade || 'Grade 3',
        language: isMalayalam ? 'Malayalam' : 'English',
        wordCount: finalWordCount,
        readingTimeMinutes: Math.max(1, Math.ceil(finalWordCount / 120)),
        source: 'ai-reconstructed'
      };
    }
  }
}
