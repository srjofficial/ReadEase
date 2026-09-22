import { env } from '../../config/env';
import { logger } from '../../utils/logger';
import { ChatConversation } from '../../models/chatConversation.model';
import { Types } from 'mongoose';

export interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequestPayload {
  message: string;
  history?: ChatMessageInput[];
  roleContext?: 'student' | 'teacher' | 'special_educator' | 'parent' | 'admin';
  language?: 'EN' | 'ML';
  userId?: string;
}

export interface ChatResponsePayload {
  reply: string;
  provider: 'groq' | 'fallback';
  suggestions?: string[];
  timestamp: string;
}

/**
 * Clean & Direct AI Chatbot Service
 * All queries are routed directly through the LLM API without predefined hardcoded query conditions.
 */
export class ChatbotService {
  /**
   * Process any user query directly via Groq LLM API
   */
  static async processMessage(payload: ChatRequestPayload): Promise<ChatResponsePayload> {
    const { message, history = [], roleContext = 'student', language = 'EN', userId } = payload;
    const trimmedMessage = message?.trim();

    if (!trimmedMessage) {
      throw new Error('Message text is required');
    }

    const now = new Date();
    const formattedDateTime = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const isMalayalam = language === 'ML' || /[\u0D00-\u0D7F]/.test(trimmedMessage);

    const systemPrompt = `You are ReadEase AI Reading Buddy, an empathetic, expert, and conversational AI reading and learning assistant similar to ChatGPT, tailored for readers with dyslexia, students, educators, and bilingual Malayalam/English learners.

Live Environment Context:
- Current Date & Time: ${formattedDateTime}
- User Role: ${roleContext}
- Selected Language: ${isMalayalam ? 'Malayalam (മലയാളം)' : 'English'}

Instructions & Guidelines:
1. Tone & Style: Friendly, patient, conversational, encouraging, and clear like ChatGPT.
2. Dyslexia-Friendly Accessibility:
   - Use clean markdown, short paragraphs, bold key terms, and bullet points.
   - Avoid dense walls of text so it is easy on dyslexic eyes.
3. Capabilities:
   - Answer ANY question naturally: mathematics with step-by-step breakdowns, general knowledge, science, nature, history, current real-time date/time, weather concepts, or daily info.
   - If asked to break down or pronounce words, provide phonemic syllable dots (e.g. "ac • coun • ta • bi • li • ty") and pronunciation guidance.
   - Explain assistive reading tools available in ReadEase: Bionic Reading (bold fixation points), OpenDyslexic typography, Visual Reading Ruler (line focus overlay), and Karaoke Text-to-Speech audio.
4. Language:
   - If the user writes in Malayalam or selects Malayalam mode, respond fluently, naturally, and warmly in Malayalam.
5. Constraints:
   - You are a conversational Q&A buddy. Do not prepare extensive downloadable documents or request file uploads.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-8).map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.content
      })),
      { role: 'user', content: trimmedMessage }
    ];

    const modelToUse = env.LLM_MODEL || 'openai/gpt-oss-120b';

    try {
      let response = await fetch(`${env.LLM_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.LLM_API_KEY}`
        },
        body: JSON.stringify({
          model: modelToUse,
          messages,
          temperature: 0.6,
          max_tokens: 600
        })
      });

      // If primary model has an issue or quota limit, attempt fallback model
      if (!response.ok) {
        const errorText = await response.text();
        logger.warn(
          { status: response.status, errorText },
          'Primary LLM model failed, trying alternative model'
        );

        const fallbackModel = 'openai/gpt-oss-20b';
        response = await fetch(`${env.LLM_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.LLM_API_KEY}`
          },
          body: JSON.stringify({
            model: fallbackModel,
            messages,
            temperature: 0.6,
            max_tokens: 400
          })
        });
      }

      if (response.ok) {
        const data = (await response.json()) as any;
        const reply = data.choices?.[0]?.message?.content?.trim();

        if (reply) {
          await this.saveConversationIfUser(userId, roleContext, trimmedMessage, reply);

          return {
            reply,
            provider: 'groq',
            suggestions: isMalayalam
              ? [
                  'സിലബിൾ വിഭജനം എങ്ങനെ?',
                  'എന്താണ് ബയോണിക് റീഡിംഗ്?',
                  'വിഷ്വൽ റൂളർ എങ്ങനെ ഉപയോഗിക്കാം?'
                ]
              : [
                  'Break down tricky words',
                  'How does Bionic Reading help?',
                  'Explain the Visual Ruler'
                ],
            timestamp: new Date().toISOString()
          };
        }
      } else {
        const errDetails = await response.text();
        logger.error({ status: response.status, errDetails }, 'LLM API request failed');
      }
    } catch (err) {
      logger.error({ err }, 'Error connecting to LLM API');
    }

    // Gentle network error fallback only if API call fails
    const fallbackText = isMalayalam
      ? 'ക്ഷമിക്കണം, ഇപ്പോൾ AI സെർവറുമായി ബന്ധപ്പെടാൻ സാധിക്കുന്നില്ല. ദയവായി അല്പം കഴിഞ്ഞ് വീണ്ടും ചോദിക്കുക.'
      : "I'm having a little trouble connecting to the AI service right now. Please try asking again in a moment!";

    return {
      reply: fallbackText,
      provider: 'fallback',
      suggestions: ['Try asking again', 'What is Bionic Reading?'],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Save message pair into ChatConversation if user is logged in
   */
  private static async saveConversationIfUser(
    userId?: string,
    roleContext: string = 'student',
    userMessage?: string,
    assistantReply?: string
  ): Promise<void> {
    if (!userId || !Types.ObjectId.isValid(userId) || !userMessage || !assistantReply) return;

    try {
      const normalizedRole = ['student', 'teacher', 'special_educator', 'parent', 'admin'].includes(
        roleContext
      )
        ? (roleContext as any)
        : 'student';

      let conv = await ChatConversation.findOne({ userId: new Types.ObjectId(userId) }).sort({
        updatedAt: -1
      });

      if (!conv) {
        conv = new ChatConversation({
          userId: new Types.ObjectId(userId),
          title: userMessage.slice(0, 40) + '...',
          roleContext: normalizedRole,
          messages: []
        });
      }

      conv.messages.push(
        { sender: 'user', content: userMessage, timestamp: new Date() },
        { sender: 'assistant', content: assistantReply, timestamp: new Date() }
      );

      if (conv.messages.length > 40) {
        conv.messages = conv.messages.slice(-40);
      }

      await conv.save();
    } catch (err) {
      logger.warn({ err }, 'Could not persist chat conversation history');
    }
  }
}

export const chatbotService = ChatbotService;
