import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useReadingPreferences, BackgroundTint } from '../../context/ReadingPreferencesContext';
import { renderAccessibleText } from '../../utils/textTransform';
import { TTSEngine } from '../../utils/ttsEngine';
import {
  BookOpen,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Sparkles,
  Sliders,
  Maximize2,
  Volume2,
  CheckCircle2,
  Award,
  ArrowLeft,
  ChevronDown
} from 'lucide-react';
import { Button, Card, Badge, Modal } from '../../components/ui';

export interface DocumentData {
  id: string;
  title: string;
  category: string;
  language: 'EN' | 'ML';
  content: string;
  wordCount: number;
}

const PRESET_STORIES: DocumentData[] = [
  {
    id: 'whispering-woods',
    title: 'The Whispering Woods',
    category: 'Nature & Adventure',
    language: 'EN',
    wordCount: 280,
    content: `Deep within the emerald valley stood the Whispering Woods, a sanctuary where ancient trees spoke in gentle rustles. Ten-year-old Maya loved walking along the pebble path after the morning rain. The sweet fragrance of pine needles and damp earth filled the crisp air.

Suddenly, a streak of bright azure caught her eye. It was a sun-bird, with feathers shimmering like polished sapphires. The bird hopped from twig to branch, pausing as if waiting for Maya to follow. Each step revealed new wonders: tiny luminous mushrooms nestled beside tree roots, crystalline spiderwebs strung between fern fronds, and dew drops glistening like tiny morning lanterns.

Maya stopped beside the grandfather cedar tree. She placed her warm palm against the craggy bark and closed her eyes. She felt the steady, calm heartbeat of the forest. Here in the quiet grove, reading the signs of nature was effortless, peaceful, and filled with boundless curiosity.`
  },
  {
    id: 'ocean-adventure',
    title: 'The Ocean Adventure',
    category: 'Ocean & Discovery',
    language: 'EN',
    wordCount: 310,
    content: `The sun was shining brightly over the vast blue ocean as Captain Maya stood at the helm of her ship, the Starduster. Little silver fish darted through colorful coral reefs below, playing hide and seek among the gently swaying kelp forests.

Maya adjusted her brass compass and charted their course toward the mysterious Island of Whispers. For three days, gentle sea breezes had guided their vessel through tranquil waters. Pip, her bright green emerald parrot, perched proudly upon the mast, squawking encouragement whenever schools of flying fish glided above the gentle ocean swells.

As afternoon turned into golden twilight, a warm breeze carried the sweet scent of jasmine blossoms and tropical oranges. Ahead on the sparkling horizon, the misty outline of tall coconut palms appeared. They had arrived at their secret harbor, ready for tomorrow's exploration.`
  },
  {
    id: 'malayalam-katha',
    title: 'കുട്ടികളുടെ കഥകൾ (The Clever Deer)',
    category: 'Malayalam Folktale',
    language: 'ML',
    wordCount: 220,
    content: `ഒരു മനോഹരമായ കാട്ടിൽ ചിന്നു എന്നൊരു ചെറിയ മാൻകുട്ടി ജീവിച്ചിരുന്നു. അവൾക്ക് പച്ചപ്പുല്ല് തിന്നാനും അരുവിയിലെ തെളിഞ്ഞ വെള്ളം കുടിക്കാനും വളരെ ഇഷ്ടമായിരുന്നു. എല്ലാ ദിവസവും കാട്ടിലെ കൂട്ടുകാരോടൊപ്പം അവൾ കളിക്കുമായിരുന്നു.

ഒരു ദിവസം ഒരു വലിയ സിംഹം കാട്ടിലൂടെ നടന്നു വന്നു. ചിന്നു ഭയന്നില്ല. അവൾ തന്റെ ബുദ്ധി ഉപയോഗിച്ച് സിംഹത്തോട് പറഞ്ഞു: "അങ്ങേക്ക് വിശക്കുന്നുണ്ടെങ്കിൽ കാടിന്റെ അപ്പുറത്ത് വലിയൊരു മാൻ നിൽപ്പുണ്ട്." സിംഹം അങ്ങോട്ട് ഓടിപ്പോയി. ചിന്നു സുരക്ഷിതമായി തന്റെ അമ്മയുടെ അടുത്തേക്ക് മടങ്ങി. ബുദ്ധിയുണ്ടെങ്കിൽ ഏതു വലിയ ആപത്തും നേരിടാം എന്ന് ചിന്നു പഠിച്ചു.`
  }
];

interface ReadingStudioViewProps {
  initialDocument?: DocumentData | null;
  onBackToDashboard?: () => void;
  onNavigateProgress?: () => void;
}

export const ReadingStudioView: React.FC<ReadingStudioViewProps> = ({
  initialDocument,
  onBackToDashboard,
  onNavigateProgress
}) => {
  const { preferences, updatePreferences, getTintStyle } = useReadingPreferences();

  // Document state
  const [selectedDoc, setSelectedDoc] = useState<DocumentData>(
    initialDocument || PRESET_STORIES[0]
  );
  const [docMenuOpen, setDocMenuOpen] = useState(false);

  // Studio Quick Toolbar drawer
  const [isQuickToolbarOpen, setIsQuickToolbarOpen] = useState(false);

  // Interactive TTS & word sync
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [speechRate, setSpeechRate] = useState(preferences.ttsRate || 1.0);

  // Reading ruler position tracking
  const [rulerY, setRulerY] = useState(preferences.rulerYPosition || 180);
  const contentRef = useRef<HTMLDivElement>(null);

  // Session timer & metrics
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [wordsRead, setWordsRead] = useState(0);
  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);

  // Count total words in text
  const wordsList = useMemo(() => {
    return selectedDoc.content.split(/\s+/).filter(Boolean);
  }, [selectedDoc.content]);

  // Timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update words read approximation
  useEffect(() => {
    const calculated = Math.min(wordsList.length, Math.floor(sessionSeconds * 2.2));
    setWordsRead(calculated);
  }, [sessionSeconds, wordsList.length]);

  // Update selected document if initialDocument prop changes (e.g. from My Documents)
  useEffect(() => {
    if (initialDocument) {
      setSelectedDoc(initialDocument);
      TTSEngine.stop();
      setIsPlaying(false);
      setCurrentWordIndex(-1);
    }
  }, [initialDocument]);

  // Clean up speech synthesis when component unmounts or doc changes
  useEffect(() => {
    return () => {
      TTSEngine.stop();
      setIsPlaying(false);
      setCurrentWordIndex(-1);
    };
  }, [selectedDoc]);

  // Speech synthesis playback handler
  const handleTogglePlay = () => {
    if (isPlaying) {
      TTSEngine.pause();
      setIsPlaying(false);
      return;
    }

    if (TTSEngine.isPaused()) {
      TTSEngine.resume();
      setIsPlaying(true);
      return;
    }

    TTSEngine.stop();
    setIsPlaying(true);
    setCurrentWordIndex(0);

    const lang =
      selectedDoc.language === 'ML'
        ? 'ml'
        : preferences.ttsLanguage === 'ml'
          ? 'ml'
          : preferences.ttsLanguage === 'en'
            ? 'en'
            : 'auto';

    TTSEngine.speak({
      text: selectedDoc.content,
      language: lang,
      voiceGender: preferences.voiceGender || 'female',
      voicePersona: preferences.voicePersona || 'tutor',
      voiceName: preferences.ttsVoice,
      rate: speechRate || preferences.ttsRate || 1.0,
      pitch: preferences.ttsPitch || 1.0,
      onWordBoundary: (wordIndex) => {
        setCurrentWordIndex(wordIndex);
      },
      onEnd: () => {
        setIsPlaying(false);
        setCurrentWordIndex(-1);
      },
      onError: () => {
        setIsPlaying(false);
        setCurrentWordIndex(-1);
      }
    });
  };

  const handleRewind = () => {
    TTSEngine.stop();
    setIsPlaying(false);
    setCurrentWordIndex((idx) => Math.max(0, idx - 15));
  };

  const handleForward = () => {
    TTSEngine.stop();
    setIsPlaying(false);
    setCurrentWordIndex((idx) => Math.min(wordsList.length - 1, idx + 15));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!preferences.readingRulerEnabled) return;
    const rect = contentRef.current?.getBoundingClientRect();
    if (rect) {
      const relativeY = e.clientY - rect.top;
      setRulerY(Math.max(20, Math.min(relativeY, rect.height - 40)));
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const tintStyle = getTintStyle();

  return (
    <div className="space-y-6 animate-fade-in relative pb-32">
      {/* Studio Top Control Dock */}
      <div className="bg-surface-lowest border border-surface-border rounded-2xl p-4 shadow-soft flex flex-wrap items-center justify-between gap-4">
        {/* Left: Back & Document Switcher */}
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <Button
              variant="outline"
              size="sm"
              iconLeft={<ArrowLeft size={16} />}
              onClick={onBackToDashboard}
            >
              Dashboard
            </Button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setDocMenuOpen(!docMenuOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-surface-low hover:bg-surface border border-surface-border rounded-xl font-semibold text-text-primary text-sm transition-colors"
            >
              <BookOpen size={18} className="text-primary" />
              <span className="max-w-[200px] truncate">{selectedDoc.title}</span>
              <ChevronDown size={14} className="text-text-muted" />
            </button>

            {docMenuOpen && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-surface-lowest border border-surface-border rounded-xl shadow-elevated p-2 z-50 space-y-1">
                <div className="px-3 py-1.5 text-xs font-bold text-text-muted uppercase tracking-wider">
                  Select Story or Document
                </div>
                {PRESET_STORIES.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setSelectedDoc(doc);
                      setDocMenuOpen(false);
                      if (window.speechSynthesis) window.speechSynthesis.cancel();
                      setIsPlaying(false);
                      setCurrentWordIndex(-1);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between transition-colors ${
                      selectedDoc.id === doc.id
                        ? 'bg-primary-50 text-primary font-bold'
                        : 'hover:bg-surface-low text-text-primary'
                    }`}
                  >
                    <span className="truncate">{doc.title}</span>
                    <Badge variant={doc.language === 'ML' ? 'secondary' : 'primary'}>
                      {doc.language}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Badge variant="primary" dot>
            Studio Active
          </Badge>
        </div>

        {/* Center: Real-time Reading Stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-text-secondary">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse" />
            <span>
              Time: <strong>{formatTime(sessionSeconds)}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-text-secondary">
            <span>
              Words:{' '}
              <strong>
                {wordsRead} / {wordsList.length}
              </strong>
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-text-secondary">
            <span>
              WPM:{' '}
              <strong>{Math.round((wordsRead / Math.max(sessionSeconds, 1)) * 60) || 120}</strong>
            </span>
          </div>
        </div>

        {/* Right: Quick Tools Drawer Trigger & Finish */}
        <div className="flex items-center gap-2">
          <Button
            variant={isQuickToolbarOpen ? 'primary' : 'outline'}
            size="sm"
            iconLeft={<Sliders size={16} />}
            onClick={() => setIsQuickToolbarOpen(!isQuickToolbarOpen)}
          >
            Adjust Reading Aids
          </Button>

          <Button
            variant="tertiary"
            size="sm"
            iconLeft={<CheckCircle2 size={16} />}
            onClick={() => setIsMilestoneModalOpen(true)}
          >
            Finish Practice
          </Button>
        </div>
      </div>

      {/* Floating Quick Accommodation Controls Drawer */}
      {isQuickToolbarOpen && (
        <Card
          variant="default"
          padding="md"
          className="border border-primary-200 shadow-soft bg-surface-lowest"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
            {/* 1. Bionic Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase">Bionic Focus</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    updatePreferences({ bionicReadingEnabled: !preferences.bionicReadingEnabled })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    preferences.bionicReadingEnabled
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-surface-low text-text-secondary border border-surface-border'
                  }`}
                >
                  <Sparkles size={14} />
                  {preferences.bionicReadingEnabled ? 'Bionic Active' : 'Standard Text'}
                </button>
                {preferences.bionicReadingEnabled && (
                  <input
                    type="range"
                    min="30"
                    max="70"
                    step="10"
                    value={preferences.bionicFixationPoint}
                    onChange={(e) =>
                      updatePreferences({ bionicFixationPoint: Number(e.target.value) })
                    }
                    className="w-20 accent-primary"
                    title={`Fixation: ${preferences.bionicFixationPoint}%`}
                  />
                )}
              </div>
            </div>

            {/* 2. Reading Ruler Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase">Reading Ruler</label>
              <button
                type="button"
                onClick={() =>
                  updatePreferences({ readingRulerEnabled: !preferences.readingRulerEnabled })
                }
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  preferences.readingRulerEnabled
                    ? 'bg-secondary-container text-secondary-onContainer font-bold shadow-sm'
                    : 'bg-surface-low text-text-secondary border border-surface-border'
                }`}
              >
                <Maximize2 size={14} />
                {preferences.readingRulerEnabled ? 'Ruler Tracking' : 'Ruler Off'}
              </button>
            </div>

            {/* 3. Typography Stacks */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase">Font Face</label>
              <div className="flex items-center gap-1">
                {(['Lexend', 'OpenDyslexic', 'Atkinson Hyperlegible'] as const).map((font) => (
                  <button
                    key={font}
                    type="button"
                    onClick={() => updatePreferences({ fontFamily: font })}
                    className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                      preferences.fontFamily === font
                        ? 'bg-primary text-white font-bold'
                        : 'bg-surface-low text-text-secondary hover:bg-surface'
                    }`}
                  >
                    {font.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Canvas Tint */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase">Low-Glare Tint</label>
              <div className="flex items-center gap-2">
                {[
                  { id: 'cream' as BackgroundTint, color: '#FDF8F0', label: 'Warm Cream' },
                  { id: 'soft-blue' as BackgroundTint, color: '#E6F3FF', label: 'Soft Blue' },
                  { id: 'soft-green' as BackgroundTint, color: '#E8F5E9', label: 'Sage' },
                  { id: 'dark' as BackgroundTint, color: '#131315', label: 'Dark' }
                ].map((tint) => (
                  <button
                    key={tint.id}
                    type="button"
                    title={tint.label}
                    onClick={() => updatePreferences({ backgroundTint: tint.id })}
                    style={{ backgroundColor: tint.color }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      preferences.backgroundTint === tint.id
                        ? 'border-primary scale-110 shadow-sm'
                        : 'border-surface-border hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Main Reading Canvas */}
      <div
        ref={contentRef}
        onMouseMove={handleMouseMove}
        style={{
          backgroundColor: tintStyle.backgroundColor,
          color: tintStyle.color,
          fontFamily: preferences.fontFamily,
          fontSize: `${preferences.fontSize}px`,
          lineHeight: preferences.lineHeight,
          letterSpacing: `${preferences.letterSpacing}em`,
          wordSpacing: `${preferences.wordSpacing}em`
        }}
        className="relative rounded-3xl p-8 md:p-16 shadow-soft border border-surface-border transition-colors duration-200 min-h-[500px] select-text overflow-hidden"
      >
        {/* Interactive Reading Ruler Overlay */}
        {preferences.readingRulerEnabled && (
          <div
            style={{
              top: `${rulerY}px`,
              height: `${preferences.readingRulerHeight}px`,
              backgroundColor: preferences.readingRulerColor
            }}
            className="absolute left-0 right-0 pointer-events-none border-y-2 border-secondary transition-all duration-75 z-20 shadow-sm"
          />
        )}

        {/* Passage Content Container */}
        <article className="max-w-[70ch] mx-auto space-y-6 relative z-10">
          <header className="border-b border-surface-border/40 pb-6 mb-8 flex items-center justify-between">
            <div>
              <span className="text-xs uppercase font-bold text-secondary tracking-widest">
                {selectedDoc.category}
              </span>
              <h1 className="text-headline-md font-bold mt-1 text-primary">{selectedDoc.title}</h1>
            </div>
            <Badge variant="primary" dot>
              {selectedDoc.language === 'ML' ? 'മലയാളം' : 'English'}
            </Badge>
          </header>

          <div className="reading-content-body transition-all">
            {renderAccessibleText(selectedDoc.content, {
              bionicEnabled: preferences.bionicReadingEnabled,
              fixationPercent: preferences.bionicFixationPoint,
              syllablesEnabled: preferences.syllableBreakdown,
              activeWordIndex: currentWordIndex
            })}
          </div>
        </article>
      </div>

      {/* Docked Floating Audio Playback Bar */}
      <div className="fixed bottom-6 left-0 right-0 max-w-3xl mx-auto px-4 z-40">
        <div className="bg-surface-lowest/95 backdrop-blur-md border border-surface-border rounded-2xl p-4 shadow-elevated flex items-center justify-between gap-4">
          {/* Audio Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
              <Volume2 size={20} />
            </div>
            <div className="hidden sm:block">
              <h4 className="text-xs font-bold text-text-primary">Text-to-Speech Highlighting</h4>
              <p className="text-[11px] text-text-muted">Karaoke synchronized audio tracking</p>
            </div>
          </div>

          {/* Player Transport Controls */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRewind}
              aria-label="Rewind 10 seconds"
              className="w-10 h-10 rounded-full bg-surface-low hover:bg-surface text-text-primary flex items-center justify-center transition-colors"
            >
              <RotateCcw size={16} />
            </button>

            <button
              type="button"
              onClick={handleTogglePlay}
              aria-label={isPlaying ? 'Pause Speech' : 'Play Speech'}
              className="w-14 h-14 rounded-full bg-primary hover:bg-primary-hover text-white flex items-center justify-center shadow-soft hover:scale-105 transition-all"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={handleForward}
              aria-label="Forward 10 seconds"
              className="w-10 h-10 rounded-full bg-surface-low hover:bg-surface text-text-primary flex items-center justify-center transition-colors"
            >
              <FastForward size={16} />
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted hidden md:inline">Speed:</span>
            <div className="flex bg-surface-low rounded-lg p-1 border border-surface-border">
              {[0.75, 1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => {
                    setSpeechRate(rate);
                    if (isPlaying) {
                      TTSEngine.stop();
                      setIsPlaying(false);
                      setCurrentWordIndex(-1);
                    }
                  }}
                  className={`px-2 py-1 text-xs rounded font-semibold transition-colors ${
                    speechRate === rate
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Practice Completion & Milestone Modal */}
      <Modal
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        title="Reading Session Completed! 🎉"
        description="Great work maintaining focus. You've earned daily practice credit!"
      >
        <div className="space-y-6 text-center">
          <div className="w-20 h-20 rounded-full bg-secondary-50 text-secondary border-4 border-secondary-200 mx-auto flex items-center justify-center shadow-soft animate-bounce">
            <Award size={40} />
          </div>

          <div className="grid grid-cols-3 gap-3 p-4 bg-surface-low rounded-xl border border-surface-border">
            <div>
              <p className="text-xs text-text-muted">Duration</p>
              <p className="text-headline-md font-bold text-text-primary">
                {formatTime(sessionSeconds)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Words Read</p>
              <p className="text-headline-md font-bold text-primary">{wordsRead}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Points Earned</p>
              <p className="text-headline-md font-bold text-tertiary">+50 XP</p>
            </div>
          </div>

          <p className="text-sm text-text-secondary leading-relaxed">
            Your reading stamina improved by <strong>14%</strong> during this passage with Bionic
            fixation points active!
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => {
                setIsMilestoneModalOpen(false);
                onNavigateProgress?.();
              }}
            >
              View Achievements
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setIsMilestoneModalOpen(false);
                onBackToDashboard?.();
              }}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
