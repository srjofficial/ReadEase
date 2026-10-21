import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Save,
  CheckCircle2,
  Sparkles,
  Eye,
  BookOpen,
  RotateCcw,
  ShieldCheck,
  Moon,
  Laptop,
  Check
} from 'lucide-react';
import { Card, Button, Badge } from '../../components/ui';
import { getStoredToken } from '../../utils/auth';

export interface HomeAccommodations {
  fontFamily: 'OpenDyslexic' | 'Lexend' | 'Atkinson Hyperlegible' | 'Comic Neue';
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  bionicReadingEnabled: boolean;
  bionicFixationPoint: number;
  readingRulerEnabled: boolean;
  readingRulerHeight: number;
  backgroundTint: 'cream' | 'soft-blue' | 'soft-green' | 'soft-pink' | 'dark';
  ttsRate: number;
  syllableBreakdown: boolean;
  eveningComfortMode: boolean;
}

const DEFAULT_HOME_SETTINGS: HomeAccommodations = {
  fontFamily: 'Lexend',
  fontSize: 18,
  lineHeight: 1.8,
  letterSpacing: 0.04,
  bionicReadingEnabled: true,
  bionicFixationPoint: 50,
  readingRulerEnabled: true,
  readingRulerHeight: 48,
  backgroundTint: 'cream',
  ttsRate: 0.95,
  syllableBreakdown: true,
  eveningComfortMode: true
};

const SCHOOL_RECOMMENDED = {
  fontFamily: 'Lexend',
  fontSize: 18,
  lineHeight: 1.8,
  backgroundTint: 'cream',
  bionicReadingEnabled: true,
  bionicFixationPoint: 50,
  readingRulerEnabled: true,
  specialist: 'Dr. Emily Specialist',
  teacher: 'Sarah Teacher'
};

export const ParentAccommodationsView: React.FC = () => {
  const [settings, setSettings] = useState<HomeAccommodations>(() => {
    try {
      const saved = localStorage.getItem('readease_reading_preferences');
      if (saved) return { ...DEFAULT_HOME_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {}
    return DEFAULT_HOME_SETTINGS;
  });

  const [saveToast, setSaveToast] = useState(false);
  const [syncToast, setSyncToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    fetch('/api/v1/parent/accommodations', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.accommodations) {
          setSettings((prev) => ({ ...prev, ...d.data.accommodations }));
        }
      })
      .catch((e) => console.warn('Could not fetch parent accommodations:', e));
  }, []);

  const updateSetting = <K extends keyof HomeAccommodations>(key: K, val: HomeAccommodations[K]) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleSyncWithSchool = () => {
    setSettings((prev) => ({
      ...prev,
      fontFamily: SCHOOL_RECOMMENDED.fontFamily as any,
      fontSize: SCHOOL_RECOMMENDED.fontSize,
      lineHeight: SCHOOL_RECOMMENDED.lineHeight,
      backgroundTint: SCHOOL_RECOMMENDED.backgroundTint as any,
      bionicReadingEnabled: SCHOOL_RECOMMENDED.bionicReadingEnabled,
      bionicFixationPoint: SCHOOL_RECOMMENDED.bionicFixationPoint,
      readingRulerEnabled: SCHOOL_RECOMMENDED.readingRulerEnabled
    }));
    setSyncToast(true);
    setTimeout(() => setSyncToast(false), 2500);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = getStoredToken();
      await fetch('/api/v1/parent/accommodations', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ accommodations: settings })
      }).catch(() => null);

      // Save directly to localStorage so Alex Student's studio immediately uses these home settings
      localStorage.setItem('readease_reading_preferences', JSON.stringify(settings));

      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const renderBionicPreview = (text: string) => {
    if (!settings.bionicReadingEnabled) return text;
    return text.split(' ').map((word, wIdx) => {
      const mid = Math.ceil(word.length * (settings.bionicFixationPoint / 100));
      const boldPart = word.slice(0, mid);
      const rest = word.slice(mid);
      return (
        <span key={wIdx} className="inline-block mr-1.5">
          <strong className="font-extrabold text-text-primary">{boldPart}</strong>
          <span>{rest}</span>
        </span>
      );
    });
  };

  const getTintBgClass = () => {
    switch (settings.backgroundTint) {
      case 'cream':
        return 'bg-[#FFF9EE] text-[#2C2416] border-[#F2E5C9]';
      case 'soft-blue':
        return 'bg-[#F0F5FA] text-[#1E293B] border-[#DCE7F3]';
      case 'soft-green':
        return 'bg-[#F2F8F4] text-[#1B382B] border-[#D4E8DC]';
      case 'soft-pink':
        return 'bg-[#FCF4F6] text-[#3B1E28] border-[#F4DCE3]';
      case 'dark':
        return 'bg-[#18181B] text-[#F4F4F5] border-[#27272A]';
      default:
        return 'bg-surface-lowest text-text-primary border-surface-border';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Toast Notifications */}
      {saveToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-secondary text-white font-semibold rounded-2xl shadow-elevated animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={20} className="flex-shrink-0" />
          <span>Home reading settings saved and synced to Alex Student's account!</span>
        </div>
      )}

      {syncToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-primary text-white font-semibold rounded-2xl shadow-elevated animate-in slide-in-from-top-4 duration-300">
          <Sparkles size={20} className="flex-shrink-0" />
          <span>Accommodations synced with Dr. Emily Specialist's recommendations!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display-lg-mobile font-bold text-text-primary flex items-center gap-3">
            <SlidersHorizontal size={28} className="text-secondary" /> Home Accommodations
          </h1>
          <p className="text-text-secondary text-body-sm mt-1">
            Customize home reading comfort, visual stress reduction tints, and audio assistance for Alex Student.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            iconLeft={<RotateCcw size={16} />}
            onClick={handleSyncWithSchool}
          >
            Sync with School IEP
          </Button>
          <Button
            variant="primary"
            size="md"
            iconLeft={<Save size={16} />}
            isLoading={isSaving}
            onClick={handleSave}
          >
            Save Home Settings
          </Button>
        </div>
      </div>

      {/* School Alignment Notice */}
      <Card variant="highlight" padding="lg" className="border-secondary/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-secondary-50 text-secondary-dark flex items-center gap-1.5">
                <ShieldCheck size={14} /> School IEP Recommendation
              </span>
              <span className="text-xs text-text-muted">
                Recommended by {SCHOOL_RECOMMENDED.specialist}
              </span>
            </div>
            <p className="text-body-sm text-text-primary font-semibold mt-1">
              Active School Profile: Lexend Font · 18px · Warm Cream Tint · 50% Bionic Reading · Reading Ruler Active
            </p>
            <p className="text-xs text-text-secondary leading-relaxed">
              Keeping your home reading device aligned with school settings ensures consistency and prevents visual fatigue.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Sparkles size={16} />}
            onClick={handleSyncWithSchool}
          >
            Apply School Presets
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Typography & Spacing */}
          <Card variant="default" padding="lg">
            <h2 className="text-headline-sm font-bold text-text-primary mb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-secondary" /> Home Reader Typography
            </h2>

            <div className="space-y-5">
              {/* Typeface Selection */}
              <div className="space-y-2">
                <label className="text-label-md font-semibold text-text-primary">
                  Dyslexia Typeface
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'Lexend', label: 'Lexend', desc: 'School recommended' },
                    { id: 'OpenDyslexic', label: 'OpenDyslexic', desc: 'Weighted bottom gravity' },
                    { id: 'Atkinson Hyperlegible', label: 'Atkinson', desc: 'Braille Institute' },
                    { id: 'Comic Neue', label: 'Comic Neue', desc: 'Clear letter distinction' }
                  ].map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => updateSetting('fontFamily', font.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        settings.fontFamily === font.id
                          ? 'border-secondary bg-secondary-50/50 text-secondary-dark ring-2 ring-secondary/20 shadow-soft'
                          : 'border-surface-border bg-surface-low hover:bg-surface-lowest'
                      }`}
                    >
                      <p className="font-bold text-sm" style={{ fontFamily: font.id }}>
                        {font.label}
                      </p>
                      <p className="text-[11px] text-text-muted mt-0.5">{font.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                <div className="space-y-2">
                  <div className="flex justify-between text-body-sm font-medium">
                    <span className="text-text-primary font-semibold">Home Font Size</span>
                    <span className="text-secondary font-mono">{settings.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="24"
                    step="1"
                    value={settings.fontSize}
                    onChange={(e) => updateSetting('fontSize', Number(e.target.value))}
                    className="w-full accent-secondary cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-body-sm font-medium">
                    <span className="text-text-primary font-semibold">Line Spacing</span>
                    <span className="text-secondary font-mono">{settings.lineHeight}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.4"
                    max="2.2"
                    step="0.1"
                    value={settings.lineHeight}
                    onChange={(e) => updateSetting('lineHeight', Number(e.target.value))}
                    className="w-full accent-secondary cursor-pointer"
                  />
                </div>
              </div>

              {/* Background Tint */}
              <div className="space-y-2 pt-2">
                <label className="text-label-md font-semibold text-text-primary flex items-center gap-2">
                  <Eye size={16} className="text-primary" /> Visual Stress Contrast Tint
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'cream', label: 'Warm Cream', color: '#FFF9EE' },
                    { id: 'soft-blue', label: 'Soft Blue', color: '#F0F5FA' },
                    { id: 'soft-green', label: 'Pale Sage', color: '#F2F8F4' },
                    { id: 'soft-pink', label: 'Soft Peach', color: '#FCF4F6' },
                    { id: 'dark', label: 'Dark Slate', color: '#18181B' }
                  ].map((tint) => (
                    <button
                      key={tint.id}
                      type="button"
                      onClick={() => updateSetting('backgroundTint', tint.id as any)}
                      className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                        settings.backgroundTint === tint.id
                          ? 'border-secondary ring-2 ring-secondary/30 shadow-soft'
                          : 'border-surface-border bg-surface-low hover:bg-surface-lowest'
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-full border border-black/10 shadow-inner"
                        style={{ backgroundColor: tint.color }}
                      />
                      <span className="text-xs font-semibold text-text-primary">{tint.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Reading Scaffolds & Bedtime Mode */}
          <Card variant="default" padding="lg">
            <h2 className="text-headline-sm font-bold text-text-primary mb-4 flex items-center gap-2">
              <Sparkles size={20} className="text-secondary" /> Assistive Reading Scaffolds
            </h2>

            <div className="space-y-4">
              {/* Bionic Reading */}
              <div className="p-4 bg-surface-low rounded-2xl border border-surface-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-text-primary text-body-md">Bionic Reading Fixations</p>
                    <p className="text-xs text-text-secondary">
                      Bolds the beginning of each word to help Alex's eyes anchor and read without losing their place.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.bionicReadingEnabled}
                    onChange={(e) => updateSetting('bionicReadingEnabled', e.target.checked)}
                    className="w-5 h-5 rounded-lg accent-secondary cursor-pointer"
                    aria-label="Bionic Reading Fixations"
                  />
                </div>

                {settings.bionicReadingEnabled && (
                  <div className="pt-2 border-t border-surface-border space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Fixation Bold Intensity:</span>
                      <span className="font-bold text-secondary">{settings.bionicFixationPoint}%</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="70"
                      step="5"
                      value={settings.bionicFixationPoint}
                      onChange={(e) => updateSetting('bionicFixationPoint', Number(e.target.value))}
                      className="w-full accent-secondary cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Reading Ruler */}
              <div className="p-4 bg-surface-low rounded-2xl border border-surface-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-text-primary text-body-md">Reading Ruler Overlay</p>
                    <p className="text-xs text-text-secondary">
                      Highlights the current line Alex is reading so lines don't blur together.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.readingRulerEnabled}
                    onChange={(e) => updateSetting('readingRulerEnabled', e.target.checked)}
                    className="w-5 h-5 rounded-lg accent-secondary cursor-pointer"
                    aria-label="Reading Ruler Overlay"
                  />
                </div>

                {settings.readingRulerEnabled && (
                  <div className="pt-2 border-t border-surface-border space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Ruler Beam Height:</span>
                      <span className="font-bold text-secondary">{settings.readingRulerHeight}px</span>
                    </div>
                    <input
                      type="range"
                      min="36"
                      max="64"
                      step="4"
                      value={settings.readingRulerHeight}
                      onChange={(e) => updateSetting('readingRulerHeight', Number(e.target.value))}
                      className="w-full accent-secondary cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Bedtime / Evening Comfort Mode */}
              <div className="flex items-center justify-between p-4 bg-surface-low rounded-2xl border border-surface-border">
                <div className="space-y-0.5">
                  <p className="font-semibold text-text-primary text-body-md flex items-center gap-1.5">
                    <Moon size={16} className="text-amber-500" /> Evening / Bedtime Reading Mode
                  </p>
                  <p className="text-xs text-text-secondary">
                    Filters harsh blue light and increases line spacing for relaxing bedtime home reading.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.eveningComfortMode}
                  onChange={(e) => updateSetting('eveningComfortMode', e.target.checked)}
                  className="w-5 h-5 rounded-lg accent-secondary cursor-pointer"
                  aria-label="Evening Bedtime Reading Mode"
                />
              </div>

              {/* Syllable Breakdown */}
              <div className="flex items-center justify-between p-4 bg-surface-low rounded-2xl border border-surface-border">
                <div className="space-y-0.5">
                  <p className="font-semibold text-text-primary text-body-md">Syllable Division Support</p>
                  <p className="text-xs text-text-secondary">
                    Allows Alex to tap any unfamiliar long word to break it into easy phonetic chunks.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.syllableBreakdown}
                  onChange={(e) => updateSetting('syllableBreakdown', e.target.checked)}
                  className="w-5 h-5 rounded-lg accent-secondary cursor-pointer"
                  aria-label="Syllable Division"
                />
              </div>

              {/* Audio Playback Pace */}
              <div className="p-4 bg-surface-low rounded-2xl border border-surface-border space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-text-primary text-body-md">Text-to-Speech Guidance Pacing</p>
                    <p className="text-xs text-text-secondary">Speed of the voice when reading books aloud together.</p>
                  </div>
                  <span className="text-sm font-mono font-bold text-secondary px-3 py-1 bg-secondary-50 rounded-xl">
                    {settings.ttsRate}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.25"
                  step="0.05"
                  value={settings.ttsRate}
                  onChange={(e) => updateSetting('ttsRate', Number(e.target.value))}
                  className="w-full accent-secondary cursor-pointer"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Live Home Tablet Preview */}
        <div className="space-y-6">
          <Card variant="default" padding="lg" className="sticky top-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-text-primary text-headline-sm flex items-center gap-2">
                <Laptop size={18} className="text-secondary" /> Home Device Preview
              </h3>
              <Badge variant="secondary" size="sm">
                Alex's Tablet
              </Badge>
            </div>
            <p className="text-xs text-text-muted mb-4">
              Real-time look at how stories render on Alex Student's tablet with your saved home settings:
            </p>

            {/* Preview Box */}
            <div
              className={`p-5 rounded-2xl border shadow-soft transition-all duration-300 relative overflow-hidden ${getTintBgClass()}`}
              style={{
                fontFamily: settings.fontFamily,
                fontSize: `${settings.fontSize}px`,
                lineHeight: settings.lineHeight,
                letterSpacing: `${settings.letterSpacing}em`
              }}
            >
              {settings.readingRulerEnabled && (
                <div
                  className="absolute inset-x-0 bg-yellow-400/20 pointer-events-none border-y border-yellow-500/40"
                  style={{
                    top: '25%',
                    height: `${settings.readingRulerHeight}px`
                  }}
                />
              )}

              <h4 className="font-bold text-base mb-2">The Secret Garden Path</h4>
              <p>
                {renderBionicPreview(
                  'Alex walked quietly down the garden trail. Tiny fireflies danced softly in the warm evening air, leading the way toward the wooden gate.'
                )}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-surface-border space-y-2 text-xs text-text-secondary">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-secondary" />
                <span>Synchronized with Alex Student's login</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={16} className="text-secondary" />
                <span>Home Reading Environment Calibrated</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full mt-4"
              iconLeft={<Save size={18} />}
              isLoading={isSaving}
              onClick={handleSave}
            >
              Save Home Accommodations
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
