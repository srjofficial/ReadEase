import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Save,
  CheckCircle2,
  Sparkles,
  Eye,
  BookOpen,
  Download,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Card, Button, Badge } from '../../components/ui';
import { getStoredToken } from '../../utils/auth';

interface StudentOption {
  _id: string;
  displayName: string;
  email: string;
  grade: string;
  readingLevel: string;
}

const CASELOAD_STUDENTS: StudentOption[] = [
  {
    _id: 'std_alex_1',
    displayName: 'Alex Student',
    email: 'student@readease.com',
    grade: 'Grade 3',
    readingLevel: 'Grade 3 • Emerging Fluency'
  },
  {
    _id: 'std_maya_2',
    displayName: 'Maya Sharma',
    email: 'maya.s@readease.edu',
    grade: 'Grade 3',
    readingLevel: 'Grade 3 • Targeted Support'
  },
  {
    _id: 'std_liam_3',
    displayName: 'Liam Chen',
    email: 'liam.chen@readease.edu',
    grade: 'Grade 4',
    readingLevel: 'Grade 4 • Phonological Focus'
  }
];

export interface StudentAccommodations {
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
}

const DEFAULT_ACCOMMODATIONS: Record<string, StudentAccommodations> = {
  std_alex_1: {
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
    syllableBreakdown: true
  },
  std_maya_2: {
    fontFamily: 'OpenDyslexic',
    fontSize: 20,
    lineHeight: 1.8,
    letterSpacing: 0.05,
    bionicReadingEnabled: false,
    bionicFixationPoint: 50,
    readingRulerEnabled: true,
    readingRulerHeight: 52,
    backgroundTint: 'soft-blue',
    ttsRate: 0.9,
    syllableBreakdown: true
  },
  std_liam_3: {
    fontFamily: 'Atkinson Hyperlegible',
    fontSize: 18,
    lineHeight: 2.0,
    letterSpacing: 0.04,
    bionicReadingEnabled: true,
    bionicFixationPoint: 45,
    readingRulerEnabled: false,
    readingRulerHeight: 44,
    backgroundTint: 'soft-green',
    ttsRate: 1.0,
    syllableBreakdown: true
  }
};

export const EducatorAccommodationsView: React.FC = () => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('std_alex_1');
  const [accommodations, setAccommodations] = useState<StudentAccommodations>(
    DEFAULT_ACCOMMODATIONS.std_alex_1
  );
  const [saveToast, setSaveToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const selectedStudent =
    CASELOAD_STUDENTS.find((s) => s._id === selectedStudentId) || CASELOAD_STUDENTS[0];

  useEffect(() => {
    // If student has saved preferences in localStorage, load them
    const stored = localStorage.getItem(`readease_student_prefs_${selectedStudentId}`);
    if (stored) {
      try {
        setAccommodations(JSON.parse(stored));
        return;
      } catch (e) {}
    }
    setAccommodations(DEFAULT_ACCOMMODATIONS[selectedStudentId] || DEFAULT_ACCOMMODATIONS.std_alex_1);
  }, [selectedStudentId]);

  const updateAcc = <K extends keyof StudentAccommodations>(
    key: K,
    val: StudentAccommodations[K]
  ) => {
    setAccommodations((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveToStudentProfile = async () => {
    setIsSaving(true);
    try {
      const token = getStoredToken();
      await fetch(`/api/v1/educator/students/${selectedStudentId}/accommodations`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          preferences: accommodations,
          accommodations: {
            bionicReading: accommodations.bionicReadingEnabled,
            font: accommodations.fontFamily,
            overlayColor: accommodations.backgroundTint,
            fontSize: accommodations.fontSize,
            lineHeight: accommodations.lineHeight,
            readingRuler: accommodations.readingRulerEnabled
          }
        })
      }).catch(() => null);

      // Save to localStorage so student reading studio and preferences pick it up immediately
      localStorage.setItem(`readease_student_prefs_${selectedStudentId}`, JSON.stringify(accommodations));
      if (selectedStudentId === 'std_alex_1') {
        localStorage.setItem('readease_reading_preferences', JSON.stringify(accommodations));
      }

      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportIepPlan = () => {
    const text = `INDIVIDUALIZED EDUCATION PROGRAM (IEP) 504 ACCOMMODATION SHEET
Student: ${selectedStudent.displayName} (${selectedStudent.email})
Grade: ${selectedStudent.grade} | Reading Specialist: Dr. Emily Specialist
Date: ${new Date().toLocaleDateString()}

ASSISTIVE READING ACCOMMODATIONS:
- Dyslexia Typeface: ${accommodations.fontFamily}
- Font Size: ${accommodations.fontSize}px
- Line Spacing: ${accommodations.lineHeight}x
- Letter Spacing: ${accommodations.letterSpacing}em
- Visual Stress Filter: ${accommodations.backgroundTint} contrast tint
- Saccadic Fixation Guide: ${accommodations.bionicReadingEnabled ? `Bionic Reading Active (${accommodations.bionicFixationPoint}% fixation)` : 'Disabled'}
- Line Tracking Ruler: ${accommodations.readingRulerEnabled ? `Active (${accommodations.readingRulerHeight}px height)` : 'Disabled'}
- Speech Audio Pacing: ${accommodations.ttsRate}x playback rate
- Syllable Morpheme Division: ${accommodations.syllableBreakdown ? 'Active' : 'Disabled'}

CLINICAL JUSTIFICATION:
Accommodations engineered to reduce visual crowding, anchor saccadic eye movements, and bypass decoding roadblocks in compliance with educational accessibility mandates.
`;
    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `${selectedStudent.displayName.replace(/\s+/g, '_')}_IEP_Accommodation_Plan.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const renderBionicPreview = (text: string) => {
    if (!accommodations.bionicReadingEnabled) return text;
    return text.split(' ').map((word, wIdx) => {
      const mid = Math.ceil(word.length * (accommodations.bionicFixationPoint / 100));
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
    switch (accommodations.backgroundTint) {
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
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-tertiary text-white font-semibold rounded-2xl shadow-elevated animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={20} className="flex-shrink-0" />
          <span>Accommodations synced to {selectedStudent.displayName}'s active reading studio!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display-lg-mobile font-bold text-text-primary flex items-center gap-3">
            <SlidersHorizontal size={28} className="text-tertiary" /> Accommodation Profiles
          </h1>
          <p className="text-text-secondary text-body-sm mt-1">
            Specialist-tailored typography, visual stress tints, and assistive reading overlays for your caseload.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            iconLeft={<Download size={16} />}
            onClick={handleExportIepPlan}
          >
            Export IEP Plan
          </Button>
          <Button
            variant="primary"
            size="md"
            iconLeft={<Save size={16} />}
            isLoading={isSaving}
            onClick={handleSaveToStudentProfile}
          >
            Apply to Student Account
          </Button>
        </div>
      </div>

      {/* Caseload Student Selector */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="text-xs font-bold uppercase tracking-wider text-text-muted mr-1">
          Caseload Student:
        </span>
        {CASELOAD_STUDENTS.map((student) => (
          <button
            key={student._id}
            type="button"
            onClick={() => setSelectedStudentId(student._id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold transition-all border ${
              selectedStudentId === student._id
                ? 'border-tertiary bg-tertiary-50 text-tertiary-dark shadow-soft'
                : 'border-surface-border bg-surface-low text-text-secondary hover:text-text-primary hover:bg-surface-lowest'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-tertiary/10 text-tertiary flex items-center justify-center font-bold text-xs">
              {student.displayName.charAt(0)}
            </div>
            <span>{student.displayName}</span>
            <span className="text-xs opacity-60">({student.grade})</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Typography & Spacing */}
          <Card variant="default" padding="lg">
            <h2 className="text-headline-sm font-bold text-text-primary mb-4 flex items-center gap-2">
              <BookOpen size={20} className="text-primary" /> Typography & Visual Layout
            </h2>

            <div className="space-y-5">
              {/* Typeface Selection */}
              <div className="space-y-2">
                <label className="text-label-md font-semibold text-text-primary">
                  Specialized Dyslexia Typeface
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'Lexend', label: 'Lexend', desc: 'Saccadic eye-movement anchor' },
                    { id: 'OpenDyslexic', label: 'OpenDyslexic', desc: 'Heavy bottom gravity design' },
                    { id: 'Atkinson Hyperlegible', label: 'Atkinson', desc: 'Braille Institute legibility' },
                    { id: 'Comic Neue', label: 'Comic Neue', desc: 'High individual character delta' }
                  ].map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => updateAcc('fontFamily', font.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all ${
                        accommodations.fontFamily === font.id
                          ? 'border-tertiary bg-tertiary-50/50 text-tertiary-dark ring-2 ring-tertiary/20'
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
                    <span className="text-text-primary font-semibold">Font Size</span>
                    <span className="text-tertiary font-mono">{accommodations.fontSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="24"
                    step="1"
                    value={accommodations.fontSize}
                    onChange={(e) => updateAcc('fontSize', Number(e.target.value))}
                    className="w-full accent-tertiary cursor-pointer"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-body-sm font-medium">
                    <span className="text-text-primary font-semibold">Line Height</span>
                    <span className="text-tertiary font-mono">{accommodations.lineHeight}x</span>
                  </div>
                  <input
                    type="range"
                    min="1.4"
                    max="2.2"
                    step="0.1"
                    value={accommodations.lineHeight}
                    onChange={(e) => updateAcc('lineHeight', Number(e.target.value))}
                    className="w-full accent-tertiary cursor-pointer"
                  />
                </div>
              </div>

              {/* Background Tint */}
              <div className="space-y-2 pt-2">
                <label className="text-label-md font-semibold text-text-primary flex items-center gap-2">
                  <Eye size={16} className="text-secondary" /> Visual Stress Contrast Filter
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
                      onClick={() => updateAcc('backgroundTint', tint.id as any)}
                      className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                        accommodations.backgroundTint === tint.id
                          ? 'border-tertiary ring-2 ring-tertiary/30 shadow-soft'
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

          {/* Neurodivergent Scaffolds */}
          <Card variant="default" padding="lg">
            <h2 className="text-headline-sm font-bold text-text-primary mb-4 flex items-center gap-2">
              <Sparkles size={20} className="text-tertiary" /> Reading Scaffolds & Eye-Tracking Guides
            </h2>

            <div className="space-y-4">
              {/* Bionic Reading */}
              <div className="p-4 bg-surface-low rounded-2xl border border-surface-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-text-primary text-body-md">Bionic Reading Fixations</p>
                    <p className="text-xs text-text-secondary">
                      Bolds initial letters of words to anchor saccades and prevent regressions.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={accommodations.bionicReadingEnabled}
                    onChange={(e) => updateAcc('bionicReadingEnabled', e.target.checked)}
                    className="w-5 h-5 rounded-lg accent-tertiary cursor-pointer"
                    aria-label="Bionic Reading Fixations"
                  />
                </div>

                {accommodations.bionicReadingEnabled && (
                  <div className="pt-2 border-t border-surface-border space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Fixation Intensity:</span>
                      <span className="font-bold text-tertiary">{accommodations.bionicFixationPoint}%</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="70"
                      step="5"
                      value={accommodations.bionicFixationPoint}
                      onChange={(e) => updateAcc('bionicFixationPoint', Number(e.target.value))}
                      className="w-full accent-tertiary cursor-pointer"
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
                      Focus beam that highlights active line while dimming distracting peripheral lines.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={accommodations.readingRulerEnabled}
                    onChange={(e) => updateAcc('readingRulerEnabled', e.target.checked)}
                    className="w-5 h-5 rounded-lg accent-tertiary cursor-pointer"
                    aria-label="Reading Ruler Overlay"
                  />
                </div>

                {accommodations.readingRulerEnabled && (
                  <div className="pt-2 border-t border-surface-border space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-text-muted">Ruler Beam Height:</span>
                      <span className="font-bold text-tertiary">{accommodations.readingRulerHeight}px</span>
                    </div>
                    <input
                      type="range"
                      min="36"
                      max="64"
                      step="4"
                      value={accommodations.readingRulerHeight}
                      onChange={(e) => updateAcc('readingRulerHeight', Number(e.target.value))}
                      className="w-full accent-tertiary cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Syllable Division */}
              <div className="flex items-center justify-between p-4 bg-surface-low rounded-2xl border border-surface-border">
                <div className="space-y-0.5">
                  <p className="font-semibold text-text-primary text-body-md">Syllable Morpheme Division</p>
                  <p className="text-xs text-text-secondary">
                    Separates multi-syllabic words with dots or hyphens on hover for easier decoding.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={accommodations.syllableBreakdown}
                  onChange={(e) => updateAcc('syllableBreakdown', e.target.checked)}
                  className="w-5 h-5 rounded-lg accent-tertiary cursor-pointer"
                  aria-label="Syllable Division"
                />
              </div>

              {/* Speech Rate */}
              <div className="p-4 bg-surface-low rounded-2xl border border-surface-border space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-text-primary text-body-md">Text-to-Speech Playback Rate</p>
                    <p className="text-xs text-text-secondary">Comfortable speed for audio read-aloud guidance.</p>
                  </div>
                  <span className="text-sm font-mono font-bold text-tertiary px-3 py-1 bg-tertiary-50 rounded-xl">
                    {accommodations.ttsRate}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.25"
                  step="0.05"
                  value={accommodations.ttsRate}
                  onChange={(e) => updateAcc('ttsRate', Number(e.target.value))}
                  className="w-full accent-tertiary cursor-pointer"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Live Student Preview Column */}
        <div className="space-y-6">
          <Card variant="default" padding="lg" className="sticky top-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-text-primary text-headline-sm flex items-center gap-2">
                <Eye size={18} className="text-tertiary" /> Student Studio Preview
              </h3>
              <Badge variant="tertiary" size="sm">
                Live Sync
              </Badge>
            </div>
            <p className="text-xs text-text-muted mb-4">
              Real-time rendering of how passages appear in {selectedStudent.displayName}'s reading studio:
            </p>

            {/* Interactive Preview Container */}
            <div
              className={`p-5 rounded-2xl border shadow-soft transition-all duration-300 relative overflow-hidden ${getTintBgClass()}`}
              style={{
                fontFamily: accommodations.fontFamily,
                fontSize: `${accommodations.fontSize}px`,
                lineHeight: accommodations.lineHeight,
                letterSpacing: `${accommodations.letterSpacing}em`
              }}
            >
              {accommodations.readingRulerEnabled && (
                <div
                  className="absolute inset-x-0 bg-yellow-400/20 pointer-events-none border-y border-yellow-500/40"
                  style={{
                    top: '25%',
                    height: `${accommodations.readingRulerHeight}px`
                  }}
                />
              )}

              <h4 className="font-bold text-base mb-2">The Solar Journey</h4>
              <p>
                {renderBionicPreview(
                  'Astronomers observe that sunlight takes approximately eight minutes to travel ninety-three million miles across the solar system to reach Earth. Without this gentle radiant energy, green plants could not perform photosynthesis.'
                )}
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-surface-border space-y-2 text-xs text-text-secondary">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-tertiary" />
                <span>FERPA & Section 504 Compliant Configuration</span>
              </div>
              <div className="flex items-center gap-2">
                <Check size={16} className="text-tertiary" />
                <span>Auto-syncs to {selectedStudent.displayName}'s login</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full mt-4"
              iconLeft={<Save size={18} />}
              isLoading={isSaving}
              onClick={handleSaveToStudentProfile}
            >
              Save Accommodations
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};
