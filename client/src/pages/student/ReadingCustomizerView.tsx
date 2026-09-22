import React, { useState, useEffect } from 'react';
import type { FontPreference, VoiceGender } from '@readease/shared';
import { useReadingPreferences, BackgroundTint } from '../../context/ReadingPreferencesContext';
import { renderAccessibleText } from '../../utils/textTransform';
import { TTSEngine, type TTSVoiceOption } from '../../utils/ttsEngine';
import {
  SlidersHorizontal,
  Type,
  Eye,
  Volume2,
  Sparkles,
  Maximize2,
  RotateCcw,
  Save,
  Check,
  Languages,
  BookOpen,
  User,
  GraduationCap,
  Smile,
  Play,
  Square,
  Globe
} from 'lucide-react';
import { Button, Card } from '../../components/ui';

interface ReadingCustomizerViewProps {
  onSaved?: () => void;
}

const SAMPLE_TEXTS = {
  fiction: `The sun was shining brightly over the vast blue ocean. Little fish darted through the colorful coral reefs, playing hide and seek among the seaweed. Captain Maya stood at the helm of her ship, the Starduster, looking out toward the horizon. She had been sailing for three days looking for the lost island of Whispers.`,
  science: `When you read, your eyes do not move smoothly across the page. Instead, they make quick jumps called saccades, pausing briefly at fixation points to recognize letters. ReadEase bolds the fixation points so your brain processes words with less effort.`,
  malayalam: `ഒരു മനോഹരമായ കാട്ടിൽ ചിന്നു എന്നൊരു ചെറിയ മാൻകുട്ടി ജീവിച്ചിരുന്നു. അവൾക്ക് പച്ചപ്പുല്ല് തിന്നാനും അരുവിയിലെ തെളിഞ്ഞ വെള്ളം കുടിക്കാനും വളരെ ഇഷ്ടമായിരുന്നു.`
};

export const ReadingCustomizerView: React.FC<ReadingCustomizerViewProps> = ({ onSaved }) => {
  const { preferences, updatePreferences, resetPreferences, getTintStyle } =
    useReadingPreferences();

  const [sampleKey, setSampleKey] = useState<'fiction' | 'science' | 'malayalam'>('fiction');
  const [saveToast, setSaveToast] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewWordIndex, setPreviewWordIndex] = useState(-1);
  const [testingVoiceLang, setTestingVoiceLang] = useState<'en' | 'ml' | null>(null);
  const [availableVoices, setAvailableVoices] = useState<TTSVoiceOption[]>([]);

  useEffect(() => {
    TTSEngine.getAvailableVoices().then((voices) => {
      setAvailableVoices(voices);
    });
    return () => {
      TTSEngine.stop();
    };
  }, []);

  const handleSave = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
    onSaved?.();
  };

  const handleReadAloudPreview = () => {
    if (isPlayingPreview) {
      TTSEngine.stop();
      setIsPlayingPreview(false);
      setPreviewWordIndex(-1);
      return;
    }

    if (testingVoiceLang) {
      TTSEngine.stop();
      setTestingVoiceLang(null);
    }

    const text = SAMPLE_TEXTS[sampleKey];
    setIsPlayingPreview(true);
    setPreviewWordIndex(0);

    TTSEngine.speak({
      text,
      language: sampleKey === 'malayalam' ? 'ml' : 'en',
      voiceGender: preferences.voiceGender || 'female',
      voicePersona: preferences.voicePersona || 'tutor',
      voiceName: preferences.ttsVoice,
      rate: preferences.ttsRate || 1.0,
      pitch: preferences.ttsPitch || 1.0,
      onWordBoundary: (wordIndex) => setPreviewWordIndex(wordIndex),
      onEnd: () => {
        setIsPlayingPreview(false);
        setPreviewWordIndex(-1);
      },
      onError: () => {
        setIsPlayingPreview(false);
        setPreviewWordIndex(-1);
      }
    });
  };

  const handleTestVoice = (lang: 'en' | 'ml') => {
    if (testingVoiceLang === lang) {
      TTSEngine.stop();
      setTestingVoiceLang(null);
      return;
    }

    if (isPlayingPreview) {
      TTSEngine.stop();
      setIsPlayingPreview(false);
    }

    const testText =
      lang === 'ml'
        ? 'നമസ്കാരം! റീഡ്ഈസ് വായന എളുപ്പവും ആസ്വാദ്യകരവുമാക്കുന്നു.'
        : 'Hello! ReadEase empowers dyslexic readers with confidence and clarity.';

    setTestingVoiceLang(lang);

    TTSEngine.speak({
      text: testText,
      language: lang,
      voiceGender: preferences.voiceGender || 'female',
      voicePersona: preferences.voicePersona || 'tutor',
      voiceName: preferences.ttsVoice,
      rate: preferences.ttsRate || 1.0,
      pitch: preferences.ttsPitch || 1.0,
      onEnd: () => setTestingVoiceLang(null),
      onError: () => setTestingVoiceLang(null)
    });
  };

  const tintStyle = getTintStyle();

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-container rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-primary-200">
            <SlidersHorizontal size={14} /> Cognitive Accommodations
          </div>
          <h1 className="text-display-lg-mobile md:text-headline-md font-bold text-text-primary">
            Reading Customizer
          </h1>
          <p className="text-body-md text-text-secondary">
            Tailor typography, contrast, and cognitive aids for maximum reading comfort.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            iconLeft={<RotateCcw size={16} />}
            onClick={resetPreferences}
          >
            Reset Defaults
          </Button>

          <Button variant="primary" size="md" iconLeft={<Save size={16} />} onClick={handleSave}>
            Save Accommodations
          </Button>
        </div>
      </div>

      {saveToast && (
        <div className="p-4 bg-tertiary-50 border border-tertiary-200 text-tertiary-dark rounded-2xl flex items-center justify-between shadow-soft animate-fade-in">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Check size={18} className="text-tertiary" />
            <span>
              Preferences saved successfully! All reading sessions and assessments will now use
              these settings.
            </span>
          </div>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Control Center (Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Section 1: Typography */}
          <Card variant="default" padding="lg" className="space-y-6">
            <div className="flex items-center gap-3 border-b border-surface-border pb-3">
              <span className="p-2 rounded-lg bg-primary-50 text-primary">
                <Type size={20} />
              </span>
              <div>
                <h3 className="font-bold text-headline-sm text-text-primary">Typography Stack</h3>
                <p className="text-xs text-text-muted">
                  High-legibility fonts engineered for dyslexia
                </p>
              </div>
            </div>

            {/* Font Style Buttons */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase">Font Family</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'Lexend', label: 'Lexend' },
                  { id: 'OpenDyslexic', label: 'OpenDyslexic' },
                  { id: 'Atkinson Hyperlegible', label: 'Atkinson' }
                ].map((font) => (
                  <button
                    key={font.id}
                    type="button"
                    onClick={() => updatePreferences({ fontFamily: font.id as FontPreference })}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all ${
                      preferences.fontFamily === font.id
                        ? 'border-primary bg-primary text-white shadow-soft font-bold'
                        : 'border-surface-border bg-surface-low text-text-primary hover:bg-surface'
                    }`}
                  >
                    {preferences.fontFamily === font.id && <Check size={14} />}
                    {font.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size (+/- & Slider) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                <span className="text-text-muted uppercase">Font Size</span>
                <span className="text-primary">{preferences.fontSize}px</span>
              </div>
              <div className="flex items-center gap-3 bg-surface-low p-2 rounded-xl border border-surface-border">
                <button
                  type="button"
                  onClick={() =>
                    updatePreferences({ fontSize: Math.max(14, preferences.fontSize - 1) })
                  }
                  className="w-8 h-8 rounded-lg bg-surface-lowest text-text-primary font-bold hover:bg-surface flex items-center justify-center border border-surface-border"
                >
                  -
                </button>
                <input
                  type="range"
                  min="14"
                  max="28"
                  value={preferences.fontSize}
                  onChange={(e) => updatePreferences({ fontSize: Number(e.target.value) })}
                  className="flex-1 accent-primary"
                />
                <button
                  type="button"
                  onClick={() =>
                    updatePreferences({ fontSize: Math.min(28, preferences.fontSize + 1) })
                  }
                  className="w-8 h-8 rounded-lg bg-surface-lowest text-text-primary font-bold hover:bg-surface flex items-center justify-center border border-surface-border"
                >
                  +
                </button>
              </div>
            </div>

            {/* Line Spacing */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                <span className="text-text-muted uppercase">Line Spacing (Height)</span>
                <span className="text-primary">{preferences.lineHeight}x</span>
              </div>
              <input
                type="range"
                min="1.2"
                max="2.4"
                step="0.1"
                value={preferences.lineHeight}
                onChange={(e) => updatePreferences({ lineHeight: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>

            {/* Letter Spacing */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                <span className="text-text-muted uppercase">Character Spacing</span>
                <span className="text-primary">
                  {(preferences.letterSpacing || 0.03).toFixed(2)}em
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.1"
                step="0.01"
                value={preferences.letterSpacing || 0.03}
                onChange={(e) => updatePreferences({ letterSpacing: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
          </Card>

          {/* Section 2: Visual Aids */}
          <Card variant="default" padding="lg" className="space-y-6">
            <div className="flex items-center gap-3 border-b border-surface-border pb-3">
              <span className="p-2 rounded-lg bg-secondary-50 text-secondary">
                <Eye size={20} />
              </span>
              <div>
                <h3 className="font-bold text-headline-sm text-text-primary">
                  Visual Tracking Aids
                </h3>
                <p className="text-xs text-text-muted">Color tinting and saccadic guidance</p>
              </div>
            </div>

            {/* Background Color Tints */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase">
                Page Background Tint
              </label>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {[
                  { id: 'cream' as BackgroundTint, color: '#FDF8F0', label: 'Warm Cream' },
                  { id: 'soft-blue' as BackgroundTint, color: '#E6F3FF', label: 'Soft Blue' },
                  { id: 'soft-green' as BackgroundTint, color: '#E8F5E9', label: 'Soft Green' },
                  { id: 'soft-grey' as BackgroundTint, color: '#F5F5F5', label: 'Soft Grey' },
                  { id: 'soft-pink' as BackgroundTint, color: '#FFF0F5', label: 'Soft Pink' },
                  { id: 'dark' as BackgroundTint, color: '#131315', label: 'Dark Mode' }
                ].map((tint) => (
                  <button
                    key={tint.id}
                    type="button"
                    title={tint.label}
                    onClick={() => updatePreferences({ backgroundTint: tint.id })}
                    style={{ backgroundColor: tint.color }}
                    className={`w-11 h-11 rounded-full border-2 flex items-center justify-center transition-all ${
                      preferences.backgroundTint === tint.id
                        ? 'border-primary ring-2 ring-primary/20 scale-110 shadow-soft'
                        : 'border-surface-border hover:scale-105'
                    }`}
                  >
                    {preferences.backgroundTint === tint.id && (
                      <Check
                        size={18}
                        className={tint.id === 'dark' ? 'text-white' : 'text-primary'}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Bionic Reading Toggle & Fixation */}
            <div className="space-y-3 p-4 bg-surface-low rounded-2xl border border-surface-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Sparkles size={18} className="text-primary" />
                  <div>
                    <h4 className="font-bold text-text-primary text-xs">Bionic Reading Engine</h4>
                    <p className="text-[11px] text-text-muted">Bolds initial fixation letters</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.bionicReadingEnabled}
                  onChange={(e) => updatePreferences({ bionicReadingEnabled: e.target.checked })}
                  className="w-5 h-5 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                />
              </div>

              {preferences.bionicReadingEnabled && (
                <div className="pt-2 border-t border-surface-border/60 space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-text-primary">
                    <span>Fixation Strength</span>
                    <span className="text-primary">{preferences.bionicFixationPoint}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="70"
                    step="10"
                    value={preferences.bionicFixationPoint}
                    onChange={(e) =>
                      updatePreferences({ bionicFixationPoint: Number(e.target.value) })
                    }
                    className="w-full accent-primary"
                  />
                </div>
              )}
            </div>

            {/* Reading Ruler Toggle */}
            <div className="space-y-3 p-4 bg-surface-low rounded-2xl border border-surface-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Maximize2 size={18} className="text-secondary" />
                  <div>
                    <h4 className="font-bold text-text-primary text-xs">
                      Reading Ruler (Focus Line)
                    </h4>
                    <p className="text-[11px] text-text-muted">Movable horizontal focus bar</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.readingRulerEnabled}
                  onChange={(e) => updatePreferences({ readingRulerEnabled: e.target.checked })}
                  className="w-5 h-5 rounded text-secondary focus:ring-secondary accent-secondary cursor-pointer"
                />
              </div>

              {preferences.readingRulerEnabled && (
                <div className="pt-2 border-t border-surface-border/60 space-y-1">
                  <div className="flex justify-between text-[11px] font-bold text-text-primary">
                    <span>Ruler Height</span>
                    <span className="text-secondary">{preferences.readingRulerHeight}px</span>
                  </div>
                  <input
                    type="range"
                    min="32"
                    max="80"
                    value={preferences.readingRulerHeight}
                    onChange={(e) =>
                      updatePreferences({ readingRulerHeight: Number(e.target.value) })
                    }
                    className="w-full accent-secondary"
                  />
                </div>
              )}
            </div>

            {/* Syllable Breakdown Toggle */}
            <div className="flex items-center justify-between p-4 bg-surface-low rounded-2xl border border-surface-border">
              <div className="flex items-center gap-2.5">
                <Languages size={18} className="text-tertiary" />
                <div>
                  <h4 className="font-bold text-text-primary text-xs">Syllable Segmentation</h4>
                  <p className="text-[11px] text-text-muted">Inserts gentle phonemic dividers</p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.syllableBreakdown}
                onChange={(e) => updatePreferences({ syllableBreakdown: e.target.checked })}
                className="w-5 h-5 rounded text-tertiary focus:ring-tertiary accent-tertiary cursor-pointer"
              />
            </div>
          </Card>

          {/* Section 3: Speech Audio Settings */}
          <Card variant="default" padding="lg" className="space-y-6">
            <div className="flex items-center gap-3 border-b border-surface-border pb-3">
              <span className="p-2 rounded-lg bg-tertiary-50 text-tertiary">
                <Volume2 size={20} />
              </span>
              <div>
                <h3 className="font-bold text-headline-sm text-text-primary">
                  Speech & Read-Aloud
                </h3>
                <p className="text-xs text-text-muted">
                  Voice customization, multilingual TTS & pacing
                </p>
              </div>
            </div>

            {/* 1. Voice Gender Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                Voice Gender
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'female', label: 'Female Voice', sub: 'Warm & High Clarity' },
                  { id: 'male', label: 'Male Voice', sub: 'Deep & Grounded' }
                ].map((g) => {
                  const isSelected = (preferences.voiceGender || 'female') === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => updatePreferences({ voiceGender: g.id as VoiceGender })}
                      className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 ${
                        isSelected
                          ? 'border-tertiary bg-tertiary-50/70 dark:bg-tertiary-950/40 shadow-xs'
                          : 'border-surface-border bg-surface-low hover:bg-surface text-text-secondary'
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          isSelected ? 'bg-tertiary text-white' : 'bg-surface text-text-muted'
                        }`}
                      >
                        <User size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate text-text-primary">{g.label}</p>
                        <p className="text-[10px] text-text-muted truncate">{g.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Voice Persona / Kinds */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider">
                  Voice Kind / Persona
                </label>
                <span className="text-[11px] font-semibold text-tertiary">
                  {TTSEngine.PERSONA_CONFIG[preferences.voicePersona || 'tutor']?.label}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'tutor', icon: GraduationCap },
                    { id: 'storyteller', icon: BookOpen },
                    { id: 'calm', icon: Smile },
                    { id: 'academic', icon: Sparkles }
                  ] as const
                ).map(({ id, icon: IconComponent }) => {
                  const cfg = TTSEngine.PERSONA_CONFIG[id];
                  const isSelected = (preferences.voicePersona || 'tutor') === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => updatePreferences({ voicePersona: id })}
                      className={`p-3 rounded-xl border text-left transition-all relative ${
                        isSelected
                          ? 'border-tertiary bg-tertiary-50/70 dark:bg-tertiary-950/40 ring-1 ring-tertiary shadow-xs'
                          : 'border-surface-border bg-surface-low hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <IconComponent
                          size={14}
                          className={
                            isSelected ? 'text-tertiary shrink-0' : 'text-text-muted shrink-0'
                          }
                        />
                        <span className="text-xs font-bold text-text-primary truncate">
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-muted leading-snug line-clamp-2">
                        {cfg.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Language & Engine Selection */}
            <div className="space-y-3 p-3.5 bg-surface-low rounded-2xl border border-surface-border">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                  <Globe size={13} /> Speech Language
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'auto', label: 'Auto Detect' },
                    { id: 'en', label: 'English' },
                    { id: 'ml', label: 'മലയാളം' }
                  ].map((lang) => {
                    const isSelected = (preferences.ttsLanguage || 'auto') === lang.id;
                    return (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() =>
                          updatePreferences({ ttsLanguage: lang.id as 'auto' | 'en' | 'ml' })
                        }
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all text-center ${
                          isSelected
                            ? 'bg-surface-lowest text-tertiary shadow-xs border border-surface-border font-bold'
                            : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {lang.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* System Voice Selection dropdown */}
              <div className="space-y-1 pt-2 border-t border-surface-border/60">
                <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                  Device System Voice
                </label>
                <select
                  value={preferences.ttsVoice || 'default'}
                  onChange={(e) => updatePreferences({ ttsVoice: e.target.value })}
                  className="w-full text-xs bg-surface-lowest border border-surface-border rounded-xl px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-tertiary"
                >
                  <option value="default">Default (Smart AI / System Recommended)</option>
                  {availableVoices.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} ({v.lang}) {v.gender !== 'neutral' ? `[${v.gender}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4. Fine Pacing Adjustments (Speed & Pitch) */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                  <span className="text-text-muted uppercase">Voice Speed Rate</span>
                  <span className="text-tertiary">{preferences.ttsRate || 1.0}x</span>
                </div>
                <input
                  type="range"
                  min="0.6"
                  max="1.6"
                  step="0.05"
                  value={preferences.ttsRate || 1.0}
                  onChange={(e) => updatePreferences({ ttsRate: Number(e.target.value) })}
                  className="w-full accent-tertiary cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs font-bold text-text-primary">
                  <span className="text-text-muted uppercase">Voice Pitch</span>
                  <span className="text-tertiary">{preferences.ttsPitch || 1.0}x</span>
                </div>
                <input
                  type="range"
                  min="0.7"
                  max="1.4"
                  step="0.05"
                  value={preferences.ttsPitch || 1.0}
                  onChange={(e) => updatePreferences({ ttsPitch: Number(e.target.value) })}
                  className="w-full accent-tertiary cursor-pointer"
                />
              </div>
            </div>

            {/* 5. Live Audition / Test Buttons */}
            <div className="space-y-2 pt-2 border-t border-surface-border">
              <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                Audition Voice
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleTestVoice('en')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    testingVoiceLang === 'en'
                      ? 'bg-tertiary text-white border-tertiary shadow-soft animate-pulse'
                      : 'bg-surface-low hover:bg-surface border-surface-border text-text-primary'
                  }`}
                >
                  {testingVoiceLang === 'en' ? <Square size={14} /> : <Play size={14} />}
                  <span>{testingVoiceLang === 'en' ? 'Stop Test' : 'Test English'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleTestVoice('ml')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                    testingVoiceLang === 'ml'
                      ? 'bg-primary text-white border-primary shadow-soft animate-pulse'
                      : 'bg-surface-low hover:bg-surface border-surface-border text-text-primary'
                  }`}
                >
                  {testingVoiceLang === 'ml' ? <Square size={14} /> : <Play size={14} />}
                  <span>{testingVoiceLang === 'ml' ? 'നിർത്തുക' : 'മലയാളം കേൾക്കുക'}</span>
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Sticky Live Interactive Preview (Span 7) */}
        <div className="lg:col-span-7 sticky top-24 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-primary" />
              <h3 className="font-bold text-headline-sm text-text-primary">
                Live Interactive Preview
              </h3>
            </div>

            <Button
              variant="outline"
              size="sm"
              iconLeft={<Volume2 size={16} />}
              onClick={handleReadAloudPreview}
            >
              {isPlayingPreview ? 'Stop Speech' : 'Read Aloud'}
            </Button>
          </div>

          {/* Sample Switcher Tabs */}
          <div className="flex bg-surface-low p-1 rounded-xl border border-surface-border w-fit">
            {[
              { id: 'fiction', label: 'Story Sample' },
              { id: 'science', label: 'Science / Informational' },
              { id: 'malayalam', label: 'മലയാളം' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setSampleKey(tab.id as 'fiction' | 'science' | 'malayalam');
                  if (window.speechSynthesis) window.speechSynthesis.cancel();
                  setIsPlayingPreview(false);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  sampleKey === tab.id
                    ? 'bg-surface-lowest text-primary shadow-soft font-bold'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Live Preview Container */}
          <div
            style={{
              backgroundColor: tintStyle.backgroundColor,
              color: tintStyle.color,
              fontFamily: preferences.fontFamily,
              fontSize: `${preferences.fontSize}px`,
              lineHeight: preferences.lineHeight,
              letterSpacing: `${preferences.letterSpacing}em`,
              wordSpacing: `${preferences.wordSpacing}em`
            }}
            className="relative rounded-3xl p-8 md:p-12 shadow-soft border border-surface-border transition-all duration-150 min-h-[440px] overflow-hidden"
          >
            {/* Live Reading Ruler Preview */}
            {preferences.readingRulerEnabled && (
              <div
                style={{
                  top: '120px',
                  height: `${preferences.readingRulerHeight}px`,
                  backgroundColor: preferences.readingRulerColor
                }}
                className="absolute left-0 right-0 pointer-events-none border-y-2 border-secondary shadow-xs z-20"
              />
            )}

            <div className="relative z-10 space-y-4 max-w-[65ch]">
              <h4 className="font-bold text-headline-md text-primary mb-4">
                {sampleKey === 'fiction'
                  ? 'The Ocean Adventure'
                  : sampleKey === 'science'
                    ? 'How Your Eyes Read Words'
                    : 'കുട്ടികളുടെ കഥകൾ'}
              </h4>

              {renderAccessibleText(SAMPLE_TEXTS[sampleKey], {
                bionicEnabled: preferences.bionicReadingEnabled,
                fixationPercent: preferences.bionicFixationPoint,
                syllablesEnabled: preferences.syllableBreakdown,
                activeWordIndex: previewWordIndex
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
