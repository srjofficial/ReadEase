/**
 * Document Text Extractor Utility with AI Enhancement
 * Supports:
 * - Word documents (.docx, .doc via mammoth)
 * - PDF documents (via pdfjs-dist text layer parsing)
 * - Plain text (.txt, .md, .csv)
 * - AI-powered extraction, cleanup, and reconstruction via Groq/ReadEase API
 */
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

export interface ExtractedDocumentResult {
  text: string;
  wordCount: number;
  title: string;
  detectedLanguage: 'English' | 'Malayalam';
  readingTimeMinutes: number;
  gradeLevel: string;
  isAiEnhanced?: boolean;
  summary?: string;
}

export interface AiExtractionParams {
  rawText: string;
  fileName?: string;
  targetGrade?: string;
  language?: 'English' | 'Malayalam';
}

/**
 * Detect language based on Unicode character distribution
 */
export function detectLanguage(text: string): 'English' | 'Malayalam' {
  const malayalamRegex = /[\u0D00-\u0D7F]/;
  return malayalamRegex.test(text) ? 'Malayalam' : 'English';
}

/**
 * Estimate grade level based on word length and sentence structure
 */
export function estimateGradeLevel(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Grade 3';

  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const sentenceCount = Math.max(1, sentences.length);
  const avgWordsPerSentence = words.length / sentenceCount;

  const totalChars = words.reduce((acc, w) => acc + w.replace(/[^a-zA-Z0-9]/g, '').length, 0);
  const avgWordLength = totalChars / words.length;

  if (avgWordLength < 4.2 && avgWordsPerSentence < 9) return 'Grade 2';
  if (avgWordLength < 4.6 && avgWordsPerSentence < 12) return 'Grade 3';
  if (avgWordLength < 5.0 && avgWordsPerSentence < 15) return 'Grade 4';
  if (avgWordLength < 5.5 && avgWordsPerSentence < 18) return 'Grade 5';
  if (avgWordLength < 6.0 && avgWordsPerSentence < 22) return 'Grade 6';
  return 'Grade 7-8';
}

/**
 * Clean obvious binary noise, JFIF/Exif tags, and control characters
 */
export function cleanRawText(text: string): string {
  let cleaned = text;
  // Remove JFIF blocks and JPEG headers
  cleaned = cleaned.replace(/JFIF[\s\S]*?(?=\b[A-Za-z]{3,}|\n\n|$)/gi, '');
  // Remove repetitive exclamation / number patterns like "!22222222..."
  cleaned = cleaned.replace(/!2{5,}/g, '');
  // Remove non-printable control characters
  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, ' ');
  // Collapse whitespace
  return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * Call server-side Groq AI API for advanced passage extraction & cleanup
 */
export async function extractWithAI(params: AiExtractionParams): Promise<ExtractedDocumentResult> {
  const { rawText, fileName, targetGrade, language } = params;

  try {
    const res = await fetch('/api/v1/ai/extract-passage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawText,
        fileName,
        targetGrade,
        language
      })
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data) {
        const item = data.data;
        return {
          text: item.passage,
          wordCount: item.wordCount,
          title: item.title,
          detectedLanguage: item.language,
          readingTimeMinutes: item.readingTimeMinutes,
          gradeLevel: item.gradeLevel,
          isAiEnhanced: true,
          summary: item.summary
        };
      }
    }
  } catch (err) {
    console.warn('AI passage extraction API call failed, falling back to local extraction:', err);
  }

  // Local fallback if AI service is offline
  const cleaned = cleanRawText(rawText);
  const words = cleaned.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const detectedLanguage = language || detectLanguage(cleaned);
  const gradeLevel = targetGrade || estimateGradeLevel(cleaned);
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 120));
  const title = fileName?.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ') || 'Reading Passage';

  return {
    text: cleaned || 'Custom reading passage.',
    wordCount,
    title,
    detectedLanguage,
    readingTimeMinutes,
    gradeLevel,
    isAiEnhanced: false
  };
}

/**
 * Extract clean text layers from PDF using pdfjs-dist
 */
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true
    });

    const doc = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageStrings = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .filter((s: string) => s.trim().length > 0);

      if (pageStrings.length > 0) {
        pageTexts.push(pageStrings.join(' '));
      }
    }

    return pageTexts.join('\n\n').trim();
  } catch (err) {
    console.warn('pdfjs-dist text extraction warning:', err);
    return '';
  }
}

/**
 * Main file text extraction function
 * Automatically detects whether AI enhancement is needed (e.g. scanned image PDF or binary noise)
 */
export async function extractTextFromFile(
  file: File,
  useAiAlways = false
): Promise<ExtractedDocumentResult> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ');

  let extractedText = '';

  if (extension === 'docx' || extension === 'doc') {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      extractedText = result.value.trim();
    } catch (err) {
      console.error('Failed to parse docx with mammoth:', err);
      throw new Error(`Could not parse Word document: ${(err as Error).message}`);
    }
  } else if (extension === 'pdf') {
    const arrayBuffer = await file.arrayBuffer();
    // Use pdfjs-dist for clean text layers
    extractedText = await extractTextFromPDF(arrayBuffer);

    // If PDF has no text layer or very few words (scanned image PDF), invoke AI extraction
    const words = extractedText.split(/\s+/).filter(Boolean);
    const hasBinaryNoise = /JFIF|Exif|!22222222/i.test(extractedText);

    if (words.length < 15 || hasBinaryNoise || useAiAlways) {
      // Use AI for advanced extraction and reconstruction
      return await extractWithAI({
        rawText: extractedText,
        fileName: file.name
      });
    }
  } else {
    // Plain text formats: .txt, .md, .csv, .json, .html, etc.
    extractedText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error('Failed to read text file.'));
      reader.readAsText(file);
    });
    extractedText = cleanRawText(extractedText);
  }

  // If user requested AI enhancement or text has noise, pass through AI
  if (useAiAlways) {
    return await extractWithAI({
      rawText: extractedText,
      fileName: file.name
    });
  }

  // Standard clean and normalize text
  extractedText = cleanRawText(extractedText)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const words = extractedText.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const detectedLanguage = detectLanguage(extractedText);
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 120));
  const gradeLevel = estimateGradeLevel(extractedText);

  return {
    text: extractedText,
    wordCount,
    title: cleanTitle,
    detectedLanguage,
    readingTimeMinutes,
    gradeLevel,
    isAiEnhanced: false
  };
}

/**
 * Helper to process raw pasted text
 */
export function processRawPastedText(rawText: string, userTitle?: string): ExtractedDocumentResult {
  const cleaned = cleanRawText(rawText)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const detectedLanguage = detectLanguage(cleaned);
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 120));
  const gradeLevel = estimateGradeLevel(cleaned);

  const fallbackTitle =
    words
      .slice(0, 4)
      .join(' ')
      .replace(/[^a-zA-Z0-9\s]/g, '') || 'Custom Reading Passage';

  return {
    text: cleaned,
    wordCount,
    title: userTitle?.trim() || fallbackTitle,
    detectedLanguage,
    readingTimeMinutes,
    gradeLevel,
    isAiEnhanced: false
  };
}
