import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Volume2,
  VolumeX,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  Lightbulb,
  CornerDownLeft,
  PanelRightClose,
  Bot
} from 'lucide-react';

import { useLanguage, type Language } from '../../context/LanguageContext';
import { TTSEngine } from '../../utils/ttsEngine';

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
  suggestions?: string[];
  provider?: string;
}

interface AiChatbotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userName?: string;
  roleContext?: string;
}

export const AiChatbotDrawer: React.FC<AiChatbotDrawerProps> = ({
  isOpen,
  onClose,
  userName = 'Reader',
  roleContext = 'student'
}) => {
  const { language, setLanguage } = useLanguage();
  const [chatLanguage, setChatLanguage] = useState<Language>(language);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal chatLanguage if global language changes outside
  useEffect(() => {
    setChatLanguage(language);
  }, [language]);

  const getWelcomeText = (lang: Language, name: string) => {
    return lang === 'ML'
      ? `നമസ്കാരം ${name}! ഞാൻ നിങ്ങളുടെ ReadEase AI വായനാ സഹായി ആണ്. സങ്കീർണ്ണമായ വാക്കുകളുടെ ഉച്ചാരണം, സിലബിൾ വിഭജനം, ബയോണിക് റീഡിംഗ്, അല്ലെങ്കിൽ വിഷ്വൽ റൂളർ എന്നിവയെക്കുറിച്ച് എന്നോട് ചോദിക്കാം!`
      : `Hi ${name}! I'm your ReadEase AI Reading Buddy. Ask me to break down tricky words into syllables, explain Bionic Reading, or help you with any reading questions!`;
  };

  const getDefaultSuggestions = (lang: Language) => {
    return lang === 'ML'
      ? [
          'സിലബിൾ വിഭജനം എങ്ങനെ?',
          'എന്താണ് ബയോണിക് റീഡിംഗ്?',
          'വിഷ്വൽ റൂളർ എങ്ങനെ ഉപയോഗിക്കാം?',
          'കുട്ടികളുടെ കഥകൾ'
        ]
      : [
          'Break down "extraordinary"',
          'How does Bionic Reading help?',
          'Explain the Visual Ruler',
          'Tell me a reading tip'
        ];
  };

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: getWelcomeText(language, userName),
      timestamp: new Date(),
      suggestions: getDefaultSuggestions(language)
    }
  ]);

  const handleLanguageChange = (newLang: Language) => {
    setChatLanguage(newLang);
    setLanguage(newLang);

    // If chat only contains the greeting, refresh it with new language
    if (messages.length === 1 && messages[0].id.startsWith('welcome')) {
      setMessages([
        {
          id: `welcome-${Date.now()}`,
          sender: 'ai',
          text: getWelcomeText(newLang, userName),
          timestamp: new Date(),
          suggestions: getDefaultSuggestions(newLang)
        }
      ]);
    }
  };

  // Scroll to bottom when messages change or loading state toggles
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      // Stop speech when drawer is closed
      TTSEngine.stop();
      setSpeakingMsgId(null);
    }
  }, [isOpen]);

  // Handle ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Send message to backend API
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMessageId,
      sender: 'user',
      text: query,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputQuery('');
    setIsLoading(true);

    // Prepare message history for context
    const historyPayload = messages.slice(-6).map((m) => ({
      role: m.sender === 'ai' ? ('assistant' as const) : ('user' as const),
      content: m.text
    }));

    try {
      const response = await fetch('/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localStorage.getItem('readease_access_token')
            ? { Authorization: `Bearer ${localStorage.getItem('readease_access_token')}` }
            : {})
        },
        body: JSON.stringify({
          message: query,
          history: historyPayload,
          roleContext,
          language: chatLanguage === 'ML' ? 'ML' : 'EN'
        })
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success && data.data?.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            sender: 'ai',
            text: data.data.reply,
            timestamp: new Date(),
            suggestions: data.data.suggestions || [],
            provider: data.data.provider
          }
        ]);
      } else {
        throw new Error(data?.error?.message || 'Chat service currently unavailable');
      }
    } catch {
      // Gentle offline fallback message
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text:
            chatLanguage === 'ML'
              ? 'ക്ഷമിക്കണം, ഇപ്പോൾ സെർവറുമായി ബന്ധപ്പെടാൻ സാധിക്കുന്നില്ല. ദയവായി അല്പം കഴിഞ്ഞ് വീണ്ടും ശ്രമിക്കുക.'
              : "I'm having a little trouble connecting right now. Try checking your network or asking a math calculation!",
          timestamp: new Date(),
          suggestions: ['Try asking again', 'What is 15% of 80?']
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleToggleSpeech = (id: string, text: string) => {
    if (speakingMsgId === id) {
      TTSEngine.stop();
      setSpeakingMsgId(null);
    } else {
      TTSEngine.stop();
      setSpeakingMsgId(id);

      // Clean markdown symbols for natural TTS speech
      const cleanText = text
        .replace(/[*_#`~•]/g, ' ')
        .replace(/👉/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      const hasMalayalam = /[\u0D00-\u0D7F]/.test(cleanText);

      TTSEngine.speak({
        text: cleanText,
        language: hasMalayalam || chatLanguage === 'ML' ? 'ml' : 'en',
        onEnd: () => setSpeakingMsgId(null),
        onError: () => setSpeakingMsgId(null)
      });
    }
  };

  const handleClearChat = () => {
    TTSEngine.stop();
    setSpeakingMsgId(null);
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: getWelcomeText(chatLanguage, userName),
        timestamp: new Date(),
        suggestions: getDefaultSuggestions(chatLanguage)
      }
    ]);
  };

  // Helper to render simple markdown with bold, bullets, and line breaks
  const renderFormattedText = (content: string) => {
    const lines = content.split('\n');

    return lines.map((line, idx) => {
      const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
      const cleanLine = isBullet ? line.trim().replace(/^[•-]\s*/, '') : line;

      // Parse **bold** parts
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);

      const parsedElements = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-extrabold text-text-primary">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return <em key={pIdx}>{part.slice(1, -1)}</em>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={idx} className="flex items-start gap-2 my-1 pl-1">
            <span className="text-primary font-bold mt-1 text-xs">•</span>
            <span className="leading-relaxed text-text-secondary">{parsedElements}</span>
          </div>
        );
      }

      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="my-1 leading-relaxed text-text-secondary">
          {parsedElements}
        </p>
      );
    });
  };

  return (
    <>
      {/* Integrated Right-Side Chatbot Docked Panel - No blocking backdrop so user can work on the site */}
      <aside
        role="complementary"
        aria-label="ReadEase AI Reading Buddy"
        className={`fixed top-0 bottom-0 right-0 z-40 w-full sm:w-[380px] lg:w-[420px] xl:w-[440px] bg-surface-lowest shadow-elevated border-l border-surface-border flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
      >
        {/* Panel Header */}
        <header className="p-3.5 border-b border-surface-border bg-surface-low/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 flex items-center justify-center shadow-xs">
                <Bot size={20} className="text-primary" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm text-text-primary tracking-tight">
                  ReadEase Assistant
                </h2>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-xs text-text-muted">
                {chatLanguage === 'ML'
                  ? 'നിങ്ങളുടെ വ്യക്തിഗത വായനാ സഹായി'
                  : 'Dyslexia & Reading Assistant'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Language Changer Selector */}
            <div
              className="flex items-center bg-surface-low border border-surface-border rounded-xl p-0.5 text-xs font-semibold shadow-2xs"
              role="group"
              aria-label="Language changer"
            >
              <button
                type="button"
                onClick={() => handleLanguageChange('EN')}
                className={`px-2 py-1 rounded-lg transition-all text-xs font-bold ${
                  chatLanguage === 'EN'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="Switch to English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('ML')}
                className={`px-2 py-1 rounded-lg transition-all text-xs font-bold ${
                  chatLanguage === 'ML'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary'
                }`}
                title="മലയാളത്തിലേക്ക് മാറ്റുക"
              >
                മല
              </button>
            </div>

            <button
              type="button"
              onClick={handleClearChat}
              title={chatLanguage === 'ML' ? 'ചാറ്റ് പുനഃസജ്ജമാക്കുക' : 'Restart conversation'}
              aria-label="Restart conversation"
              className="p-2 text-text-muted hover:text-text-primary hover:bg-surface rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              title={chatLanguage === 'ML' ? 'ചുരുക്കുക' : 'Collapse panel'}
              aria-label="Collapse panel"
              className="p-2 text-text-muted hover:text-text-primary hover:bg-surface rounded-lg transition-colors cursor-pointer"
            >
              <PanelRightClose size={18} />
            </button>
          </div>
        </header>

        {/* Informational Sub-banner */}
        <div className="px-4 py-2 bg-primary-50/60 dark:bg-primary-950/20 border-b border-primary-100 dark:border-primary-900/40 text-[11px] text-primary flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Lightbulb size={13} className="text-secondary shrink-0" />
            <span className="font-medium truncate">
              {chatLanguage === 'ML'
                ? 'വാക്കുകൾ, സിലബിലുകൾ, അല്ലെങ്കിൽ വായനാ ടിപ്പുകൾ ചോദിക്കൂ'
                : 'Ask for syllable breakdown, phonics & bionic reading tips'}
            </span>
          </div>
        </div>

        {/* Chat Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-canvas/30">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary-200 shadow-xs">
                  <Bot size={16} className="text-primary" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs sm:text-sm shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-primary text-white rounded-tr-none font-medium'
                    : 'bg-surface-lowest border border-surface-border text-text-primary rounded-tl-none'
                }`}
              >
                {/* Content */}
                <div className="prose-xs space-y-1">
                  {msg.sender === 'user' ? msg.text : renderFormattedText(msg.text)}
                </div>

                {/* AI Footer Actions (TTS + Copy) */}
                {msg.sender === 'ai' && (
                  <div className="mt-2.5 pt-2 border-t border-surface-border/60 flex items-center justify-between text-[11px] text-text-muted">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleToggleSpeech(msg.id, msg.text)}
                        title={
                          speakingMsgId === msg.id ? 'Stop speaking' : 'Read aloud with Karaoke TTS'
                        }
                        aria-label="Read aloud"
                        className={`p-1 rounded-md hover:bg-surface transition-colors flex items-center gap-1 cursor-pointer ${
                          speakingMsgId === msg.id ? 'text-primary font-bold' : ''
                        }`}
                      >
                        {speakingMsgId === msg.id ? <VolumeX size={13} /> : <Volume2 size={13} />}
                        <span>{speakingMsgId === msg.id ? 'Stop' : 'Listen'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg.id, msg.text)}
                        title="Copy to clipboard"
                        aria-label="Copy message"
                        className="p-1 rounded-md hover:bg-surface transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        {copiedMsgId === msg.id ? (
                          <Check size={13} className="text-emerald-500" />
                        ) : (
                          <Copy size={13} />
                        )}
                        <span>{copiedMsgId === msg.id ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <span className="text-[10px] opacity-70">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}

                {/* Follow-up Interactive Suggestion Chips */}
                {msg.sender === 'ai' && msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-surface-border/60 flex flex-wrap gap-1.5">
                    {msg.suggestions.map((sug, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => handleSendMessage(sug)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-surface hover:bg-primary-50 hover:text-primary hover:border-primary-200 border border-surface-border text-text-secondary transition-all cursor-pointer text-left active:scale-95"
                      >
                        <span className="text-primary font-bold mr-1">›</span>{sug}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-2.5 justify-start animate-in fade-in duration-150">
              <div className="w-8 h-8 rounded-xl bg-primary-50 text-primary flex items-center justify-center shrink-0 border border-primary-200">
                <Bot size={16} className="text-primary" />
              </div>
              <div className="p-3 rounded-2xl rounded-tl-none bg-surface-lowest border border-surface-border shadow-xs flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" />
                </div>
                <span className="text-xs text-text-muted font-medium">
                  {chatLanguage === 'ML' ? 'ചിന്തിക്കുന്നു...' : 'AI is answering...'}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <footer className="p-3 border-t border-surface-border bg-surface-lowest shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  chatLanguage === 'ML'
                    ? 'വാക്കുകൾ, സിലബിളുകൾ, വായനാ സംശയങ്ങൾ ചോദിക്കൂ...'
                    : 'Ask about words, syllables, dyslexia reading tips...'
                }
                disabled={isLoading}
                className="w-full pl-3.5 pr-8 py-2.5 bg-surface-low border border-surface-border rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary text-text-primary placeholder:text-text-muted transition-all"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none hidden sm:block">
                <CornerDownLeft size={12} />
              </div>
            </div>

            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              aria-label="Send message"
              className="p-2.5 rounded-xl bg-primary hover:bg-primary-hover active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white transition-all shadow-soft flex items-center justify-center cursor-pointer shrink-0"
            >
              <Send size={16} />
            </button>
          </form>

          <div className="mt-2 text-[10px] text-center text-text-muted flex items-center justify-center gap-1">
            <BookOpen size={11} className="text-secondary" />
            <span>ReadEase AI Buddy • Dyslexia & Assistive Reading Companion</span>
          </div>
        </footer>
      </aside>
    </>
  );
};

export default AiChatbotDrawer;
