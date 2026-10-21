import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Building2,
  Users,
  Sparkles,
  BookOpen,
  Award,
  Bell,
  CheckCircle2,
  Save,
  RotateCcw,
  Copy,
  Check,
  Download,
  Eye,
  Gauge,
  KeyRound,
  ShieldCheck,
  CheckSquare,
  HelpCircle
} from 'lucide-react';
import { Card, Button, Input } from '../../components/ui';

export interface ClassSettings {
  // Classroom Profile
  className: string;
  schoolName: string;
  gradeLevel: string;
  academicYear: string;
  joinCode: string;
  allowSelfEnrollment: boolean;
  teacherEmail: string;

  // Default Dyslexia Accommodations for Class
  defaultFont: 'OpenDyslexic' | 'Lexend' | 'Atkinson Hyperlegible' | 'Comic Neue';
  defaultFontSize: number;
  defaultLineHeight: number;
  defaultLetterSpacing: number;
  defaultBionicReading: boolean;
  defaultReadingRuler: boolean;
  defaultBackgroundTint: 'cream' | 'soft-blue' | 'soft-green' | 'soft-pink' | 'dark' | 'clean-white';
  defaultTtsRate: number;
  defaultSyllableBreakdown: boolean;

  // Fluency & Reading Policy
  targetWpm: number;
  dailyGoalMinutes: number;
  targetAccuracy: number;
  allowRetries: boolean;
  enablePhonemeAiFeedback: boolean;
  requireQuizCompletion: boolean;

  // Notifications
  notifyOnSubmission: boolean;
  notifyOnInactivity: boolean;
  notifyOnMilestone: boolean;
  autoRemindPendingStudents: boolean;
}

const DEFAULT_CLASS_SETTINGS: ClassSettings = {
  className: 'Grade 3 - Room 204',
  schoolName: 'Oakridge Elementary School',
  gradeLevel: 'Grade 3',
  academicYear: '2026-2027 Academic Year',
  joinCode: 'READ-2026-EASE',
  allowSelfEnrollment: true,
  teacherEmail: 'teacher@readease.edu',

  defaultFont: 'Lexend',
  defaultFontSize: 18,
  defaultLineHeight: 1.8,
  defaultLetterSpacing: 0.04,
  defaultBionicReading: true,
  defaultReadingRuler: false,
  defaultBackgroundTint: 'cream',
  defaultTtsRate: 0.95,
  defaultSyllableBreakdown: true,

  targetWpm: 115,
  dailyGoalMinutes: 20,
  targetAccuracy: 85,
  allowRetries: true,
  enablePhonemeAiFeedback: true,
  requireQuizCompletion: true,

  notifyOnSubmission: true,
  notifyOnInactivity: true,
  notifyOnMilestone: true,
  autoRemindPendingStudents: true
};

const STORAGE_KEY = 'readease_class_settings';

export const TeacherSettingsView: React.FC = () => {
  const [settings, setSettings] = useState<ClassSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_CLASS_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Failed to load class settings:', e);
    }
    return DEFAULT_CLASS_SETTINGS;
  });

  const [activeTab, setActiveTab] = useState<'profile' | 'accommodations' | 'goals' | 'notifications'>('profile');
  const [saveToast, setSaveToast] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-hide toast
  useEffect(() => {
    if (saveToast) {
      const timer = setTimeout(() => setSaveToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveToast]);

  const updateSetting = <K extends keyof ClassSettings>(key: K, value: ClassSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    setIsSaving(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSaveToast(true);
    } catch (e) {
      console.error('Failed to save settings:', e);
    } finally {
      setTimeout(() => setIsSaving(false), 400);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all classroom settings to recommended dyslexia best-practice defaults?')) {
      setSettings(DEFAULT_CLASS_SETTINGS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CLASS_SETTINGS));
      setSaveToast(true);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(settings.joinCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRegenerateCode = () => {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'READ-';
    for (let i = 0; i < 4; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
    code += '-EASE';
    updateSetting('joinCode', code);
  };

  // Export Roster as CSV
  const handleExportRosterCsv = () => {
    let students = [];
    try {
      const saved = localStorage.getItem('readease_teacher_students');
      if (saved) students = JSON.parse(saved);
    } catch (e) {}

    if (!students || students.length === 0) {
      students = [
        { displayName: 'Alex Student', email: 'alex@readease.edu', grade: 'Grade 3' },
        { displayName: 'Maya Sharma', email: 'maya.s@readease.edu', grade: 'Grade 3' },
        { displayName: 'Liam Chen', email: 'liam.chen@readease.edu', grade: 'Grade 4' },
        { displayName: 'Sophia Patel', email: 'sophia.p@readease.edu', grade: 'Grade 3' },
        { displayName: 'Ethan Brooks', email: 'ethan.b@readease.edu', grade: 'Grade 4' },
        { displayName: 'Emma Watson', email: 'emma.w@readease.edu', grade: 'Grade 3' },
        { displayName: 'Noah Miller', email: 'noah.m@readease.edu', grade: 'Grade 4' },
        { displayName: 'Olivia Davis', email: 'olivia.d@readease.edu', grade: 'Grade 3' }
      ];
    }

    const headers = ['Student ID', 'Full Name', 'Email', 'Grade', 'Enrolled Date'];
    const rows = students.map((s: any, idx: number) => [
      s._id || `std_${idx + 1}`,
      `"${s.displayName || s.userId?.name || 'Student'}"`,
      `"${s.userId?.email || s.email || 'N/A'}"`,
      `"${s.grade || settings.gradeLevel}"`,
      `"${s.userId?.createdAt ? new Date(s.userId.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${settings.className.replace(/\s+/g, '_')}_Roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON Snapshot
  const handleExportJsonSnapshot = () => {
    const payload = {
      exportDate: new Date().toISOString(),
      classroom: settings,
      meta: {
        platform: 'ReadEase Educator Portal',
        version: '2.0.0'
      }
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${settings.className.replace(/\s+/g, '_')}_Settings.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Bionic helper for preview box
  const renderBionicText = (text: string) => {
    if (!settings.defaultBionicReading) return text;
    return text.split(' ').map((word, wIdx) => {
      const mid = Math.ceil(word.length * 0.45);
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

  // Background tint style calculation
  const getTintBgClass = () => {
    switch (settings.defaultBackgroundTint) {
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
          <span>Classroom settings saved successfully!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display-lg-mobile font-bold text-text-primary flex items-center gap-3">
            <SlidersHorizontal size={28} className="text-primary" /> Class Settings
          </h1>
          <p className="text-text-secondary text-body-sm mt-1">
            Manage your classroom profile, dyslexia accommodation defaults, reading goals, and roster access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            iconLeft={<RotateCcw size={16} />}
            onClick={handleResetDefaults}
          >
            Reset Defaults
          </Button>
          <Button
            variant="primary"
            size="md"
            iconLeft={<Save size={16} />}
            isLoading={isSaving}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-surface-border gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'profile', label: 'Classroom Profile', icon: <Building2 size={18} /> },
          { id: 'accommodations', label: 'Default Accommodations', icon: <Sparkles size={18} /> },
          { id: 'goals', label: 'Fluency & Reading Goals', icon: <Award size={18} /> },
          { id: 'notifications', label: 'Alerts & Data Export', icon: <Bell size={18} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-semibold text-sm rounded-t-xl transition-all border-b-2 whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-primary text-primary bg-primary-50/50 dark:bg-primary-950/20'
                : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-low'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Classroom Profile */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card variant="default" padding="lg">
              <h2 className="text-headline-sm font-bold text-text-primary mb-5 flex items-center gap-2">
                <Building2 size={20} className="text-primary" /> General Classroom Info
              </h2>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Classroom Name"
                    value={settings.className}
                    onChange={(e) => updateSetting('className', e.target.value)}
                    placeholder="e.g. Grade 3 - Room 204"
                  />
                  <Input
                    label="School / Institution"
                    value={settings.schoolName}
                    onChange={(e) => updateSetting('schoolName', e.target.value)}
                    placeholder="e.g. Oakridge Elementary"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-label-md font-semibold text-text-primary">Primary Grade Level</label>
                    <select
                      value={settings.gradeLevel}
                      onChange={(e) => updateSetting('gradeLevel', e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-surface-border bg-surface-low text-text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    >
                      {['1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade', '6th Grade', 'Middle School', 'Intervention Cohort'].map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Academic Year / Term"
                    value={settings.academicYear}
                    onChange={(e) => updateSetting('academicYear', e.target.value)}
                    placeholder="e.g. 2026-2027 Fall"
                  />
                </div>

                <Input
                  label="Educator Contact Email"
                  type="email"
                  value={settings.teacherEmail}
                  onChange={(e) => updateSetting('teacherEmail', e.target.value)}
                  placeholder="teacher@readease.edu"
                />
              </div>
            </Card>

            {/* Student Enrollment Code */}
            <Card variant="default" padding="lg">
              <h2 className="text-headline-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                <KeyRound size={20} className="text-secondary" /> Classroom Join Code
              </h2>
              <p className="text-body-sm text-text-secondary mb-4 leading-relaxed">
                Students can enter this code in their ReadEase portal to instantly link their account to your classroom roster.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-4 bg-surface-low rounded-2xl border border-surface-border">
                <div className="flex-1 font-mono text-2xl font-black text-primary tracking-widest text-center sm:text-left select-all">
                  {settings.joinCode}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    iconLeft={copiedCode ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    onClick={handleCopyCode}
                  >
                    {copiedCode ? 'Copied!' : 'Copy Code'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    iconLeft={<RotateCcw size={16} />}
                    onClick={handleRegenerateCode}
                  >
                    Regenerate
                  </Button>
                </div>
              </div>

              {/* Self-Enrollment Toggle */}
              <div className="mt-5 flex items-center justify-between p-4 bg-surface-low/50 rounded-2xl border border-surface-border">
                <div className="space-y-0.5">
                  <p className="font-semibold text-text-primary text-body-md">Allow Student Self-Enrollment</p>
                  <p className="text-xs text-text-secondary">
                    When active, students with the code join immediately without manual admin approval.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.allowSelfEnrollment}
                  onChange={(e) => updateSetting('allowSelfEnrollment', e.target.checked)}
                  className="w-5 h-5 rounded-lg accent-primary cursor-pointer"
                  aria-label="Allow Student Self-Enrollment"
                />
              </div>
            </Card>
          </div>

          {/* Side Info / Capacity Card */}
          <div className="space-y-6">
            <Card variant="default" padding="lg" className="border-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-text-primary text-headline-sm">Roster Tier</h3>
                  <p className="text-xs text-text-muted">Standard Educator License</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-body-sm font-semibold">
                  <span className="text-text-secondary">Enrolled Students</span>
                  <span className="text-primary font-bold">8 / 20</span>
                </div>
                <div className="w-full bg-surface-high h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: '40%' }}
                  />
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Your classroom currently uses 40% of its maximum capacity. 12 student seats remain available.
                </p>
              </div>

              <div className="mt-6 pt-5 border-t border-surface-border space-y-2 text-xs text-text-secondary">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-tertiary" />
                  <span>FERPA & COPPA Compliant Roster</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckSquare size={16} className="text-tertiary" />
                  <span>Individual Dyslexia Profiles Enabled</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: Default Accommodations */}
      {activeTab === 'accommodations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card variant="default" padding="lg">
              <h2 className="text-headline-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                <Sparkles size={20} className="text-primary" /> Class-Wide Dyslexia Presets
              </h2>
              <p className="text-body-sm text-text-secondary mb-6 leading-relaxed">
                These settings establish the default reading presentation for all newly created passages and assignments. Students can still customize their individual preferences in their personal studio.
              </p>

              <div className="space-y-6">
                {/* Font Selection */}
                <div className="space-y-2">
                  <label className="text-label-md font-semibold text-text-primary flex items-center gap-2">
                    <BookOpen size={16} className="text-secondary" /> Default Dyslexia-Friendly Typeface
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'Lexend', label: 'Lexend', desc: 'Engineered for fluency' },
                      { id: 'OpenDyslexic', label: 'OpenDyslexic', desc: 'Weighted gravity bottoms' },
                      { id: 'Atkinson Hyperlegible', label: 'Atkinson', desc: 'Braille Institute' },
                      { id: 'Comic Neue', label: 'Comic Neue', desc: 'High letter distinction' }
                    ].map((font) => (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => updateSetting('defaultFont', font.id as any)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          settings.defaultFont === font.id
                            ? 'border-primary bg-primary-50/40 text-primary dark:bg-primary-950/30'
                            : 'border-surface-border bg-surface-low hover:bg-surface-lowest text-text-primary'
                        }`}
                      >
                        <p className="font-bold text-sm" style={{ fontFamily: font.id }}>{font.label}</p>
                        <p className="text-[11px] text-text-muted mt-0.5">{font.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sizing & Spacing Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                  <div className="space-y-2">
                    <div className="flex justify-between text-body-sm font-medium">
                      <span className="text-text-primary font-semibold">Font Size</span>
                      <span className="text-primary font-mono">{settings.defaultFontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="24"
                      step="1"
                      value={settings.defaultFontSize}
                      onChange={(e) => updateSetting('defaultFontSize', Number(e.target.value))}
                      className="w-full accent-primary cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-text-muted">
                      <span>15px (Standard)</span>
                      <span>20px (Comfort)</span>
                      <span>24px (Large)</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-body-sm font-medium">
                      <span className="text-text-primary font-semibold">Line Height</span>
                      <span className="text-primary font-mono">{settings.defaultLineHeight}x</span>
                    </div>
                    <input
                      type="range"
                      min="1.4"
                      max="2.2"
                      step="0.1"
                      value={settings.defaultLineHeight}
                      onChange={(e) => updateSetting('defaultLineHeight', Number(e.target.value))}
                      className="w-full accent-primary cursor-pointer"
                    />
                    <div className="flex justify-between text-[11px] text-text-muted">
                      <span>1.4x (Compact)</span>
                      <span>1.8x (Optimal)</span>
                      <span>2.2x (Spacious)</span>
                    </div>
                  </div>
                </div>

                {/* Background Tint Options */}
                <div className="space-y-2 pt-2">
                  <label className="text-label-md font-semibold text-text-primary flex items-center gap-2">
                    <Eye size={16} className="text-secondary" /> Default Contrast Tint (Visual Stress Reduction)
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { id: 'cream', label: 'Warm Cream', color: '#FFF9EE' },
                      { id: 'soft-blue', label: 'Soft Blue', color: '#F0F5FA' },
                      { id: 'soft-green', label: 'Pale Sage', color: '#F2F8F4' },
                      { id: 'soft-pink', label: 'Soft Peach', color: '#FCF4F6' },
                      { id: 'clean-white', label: 'White', color: '#FFFFFF' },
                      { id: 'dark', label: 'Dark Slate', color: '#18181B' }
                    ].map((tint) => (
                      <button
                        key={tint.id}
                        type="button"
                        onClick={() => updateSetting('defaultBackgroundTint', tint.id as any)}
                        className={`p-2.5 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                          settings.defaultBackgroundTint === tint.id
                            ? 'border-primary ring-2 ring-primary/30 shadow-soft'
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

                {/* Dyslexia Aid Toggles */}
                <div className="space-y-3 pt-3">
                  <div className="flex items-center justify-between p-4 bg-surface-low rounded-2xl border border-surface-border">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-text-primary text-body-md">Bionic Reading Fixations by Default</p>
                      <p className="text-xs text-text-secondary">
                        Bolds the first half of each word to guide saccadic eye movements and increase reading speed.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.defaultBionicReading}
                      onChange={(e) => updateSetting('defaultBionicReading', e.target.checked)}
                      className="w-5 h-5 rounded-lg accent-primary cursor-pointer"
                      aria-label="Bionic Reading Fixations"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-low rounded-2xl border border-surface-border">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-text-primary text-body-md">Syllable Division & Phoneme Breakdown</p>
                      <p className="text-xs text-text-secondary">
                        Highlights compound word roots and phoneme boundaries when clicked.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.defaultSyllableBreakdown}
                      onChange={(e) => updateSetting('defaultSyllableBreakdown', e.target.checked)}
                      className="w-5 h-5 rounded-lg accent-primary cursor-pointer"
                      aria-label="Syllable Division"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-low rounded-2xl border border-surface-border">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-text-primary text-body-md">Reading Ruler Overlay</p>
                      <p className="text-xs text-text-secondary">
                        Displays a focus beam overlay on the active line to prevent line-skipping.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.defaultReadingRuler}
                      onChange={(e) => updateSetting('defaultReadingRuler', e.target.checked)}
                      className="w-5 h-5 rounded-lg accent-primary cursor-pointer"
                      aria-label="Reading Ruler Overlay"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Live Preview Card */}
          <div className="space-y-6">
            <Card variant="default" padding="lg" className="sticky top-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-text-primary text-headline-sm flex items-center gap-2">
                  <Eye size={18} className="text-primary" /> Live Student View
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary">
                  Interactive
                </span>
              </div>
              <p className="text-xs text-text-muted mb-4">
                Real-time preview of how text renders with your current classroom accommodation presets:
              </p>

              {/* Preview Box */}
              <div
                className={`p-5 rounded-2xl border shadow-soft transition-all duration-300 ${getTintBgClass()}`}
                style={{
                  fontFamily: settings.defaultFont,
                  fontSize: `${settings.defaultFontSize}px`,
                  lineHeight: settings.defaultLineHeight,
                  letterSpacing: `${settings.defaultLetterSpacing}em`
                }}
              >
                <h4 className="font-bold text-base mb-2">The Brave River Otter</h4>
                <p>
                  {renderBionicText(
                    'Pip the otter paused at the bend in the rushing river. Sunlight sparkled like tiny diamonds across the cool ripples. With one playful leap, Pip dove deep into the emerald currents, swimming swiftly toward the welcoming forest.'
                  )}
                </p>
              </div>

              <div className="mt-4 pt-4 border-t border-surface-border text-xs text-text-secondary space-y-1.5">
                <p><strong>Font:</strong> {settings.defaultFont}</p>
                <p><strong>Size:</strong> {settings.defaultFontSize}px · <strong>Line Height:</strong> {settings.defaultLineHeight}x</p>
                <p><strong>Bionic Guide:</strong> {settings.defaultBionicReading ? 'Active' : 'Disabled'}</p>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: Fluency & Reading Goals */}
      {activeTab === 'goals' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card variant="default" padding="lg">
              <h2 className="text-headline-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                <Gauge size={20} className="text-primary" /> Reading Benchmarks & Fluency Targets
              </h2>
              <p className="text-body-sm text-text-secondary mb-6 leading-relaxed">
                Establish classroom benchmarks. ReadEase uses these thresholds to track student fluency growth, award milestone badges, and suggest interventions.
              </p>

              <div className="space-y-6">
                {/* WPM Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-text-primary text-body-md">Target Reading Speed (WPM)</span>
                    <span className="text-lg font-bold font-mono text-primary px-3 py-1 bg-primary-50 rounded-xl">
                      {settings.targetWpm} WPM
                    </span>
                  </div>
                  <input
                    type="range"
                    min="60"
                    max="180"
                    step="5"
                    value={settings.targetWpm}
                    onChange={(e) => updateSetting('targetWpm', Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>60 WPM (Beginner / Grade 1-2)</span>
                    <span>115 WPM (Grade 3-4 Benchmark)</span>
                    <span>180 WPM (Advanced / Middle School)</span>
                  </div>
                </div>

                {/* Daily Reading Target */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-text-primary text-body-md">Daily Reading Goal</span>
                    <span className="text-lg font-bold font-mono text-secondary px-3 py-1 bg-secondary-50 rounded-xl">
                      {settings.dailyGoalMinutes} mins/day
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="45"
                    step="5"
                    value={settings.dailyGoalMinutes}
                    onChange={(e) => updateSetting('dailyGoalMinutes', Number(e.target.value))}
                    className="w-full accent-secondary cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>10 mins</span>
                    <span>20 mins (Recommended)</span>
                    <span>45 mins</span>
                  </div>
                </div>

                {/* Accuracy Target */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-text-primary text-body-md">Minimum Target Accuracy</span>
                    <span className="text-lg font-bold font-mono text-tertiary px-3 py-1 bg-tertiary-50 rounded-xl">
                      {settings.targetAccuracy}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="70"
                    max="98"
                    step="2"
                    value={settings.targetAccuracy}
                    onChange={(e) => updateSetting('targetAccuracy', Number(e.target.value))}
                    className="w-full accent-tertiary cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-text-muted">
                    <span>70% (Foundational)</span>
                    <span>85% (Proficient)</span>
                    <span>98% (Mastery)</span>
                  </div>
                </div>

                {/* Policy Toggles */}
                <div className="space-y-3 pt-3">
                  <div className="flex items-center justify-between p-4 bg-surface-low rounded-2xl border border-surface-border">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-text-primary text-body-md">Allow Multiple Reading Attempts</p>
                      <p className="text-xs text-text-secondary">
                        Encourages students with dyslexia to re-read passages to build confidence, recording their best score.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.allowRetries}
                      onChange={(e) => updateSetting('allowRetries', e.target.checked)}
                      className="w-5 h-5 rounded-lg accent-primary cursor-pointer"
                      aria-label="Allow Multiple Reading Attempts"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-low rounded-2xl border border-surface-border">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-text-primary text-body-md">AI Real-Time Phoneme Guidance</p>
                      <p className="text-xs text-text-secondary">
                        Speech recognition gently indicates stumbling words without penalizing or interrupting the reader.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.enablePhonemeAiFeedback}
                      onChange={(e) => updateSetting('enablePhonemeAiFeedback', e.target.checked)}
                      className="w-5 h-5 rounded-lg accent-primary cursor-pointer"
                      aria-label="AI Real-Time Phoneme Guidance"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-surface-low rounded-2xl border border-surface-border">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-text-primary text-body-md">Require Reflection / Comprehension Check</p>
                      <p className="text-xs text-text-secondary">
                        Assignments are only marked completed once student answers 2-3 accessible comprehension questions.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.requireQuizCompletion}
                      onChange={(e) => updateSetting('requireQuizCompletion', e.target.checked)}
                      className="w-5 h-5 rounded-lg accent-primary cursor-pointer"
                      aria-label="Require Reflection / Comprehension Check"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Research & Guidance Card */}
          <div className="space-y-6">
            <Card variant="default" padding="lg">
              <h3 className="font-bold text-text-primary text-headline-sm mb-3 flex items-center gap-2">
                <HelpCircle size={18} className="text-secondary" /> Dyslexia Fluency Guide
              </h3>
              <div className="space-y-4 text-xs text-text-secondary leading-relaxed">
                <div className="p-3 bg-secondary-50/50 rounded-xl border border-secondary-200">
                  <p className="font-semibold text-text-primary mb-1">Grade 3 Benchmarks:</p>
                  <p>Typical oral reading fluency ranges between 90–120 WPM by mid-year. Prioritize accuracy over pure speed.</p>
                </div>
                <div className="p-3 bg-primary-50/50 rounded-xl border border-primary-200">
                  <p className="font-semibold text-text-primary mb-1">The Power of Re-Reading:</p>
                  <p>Allowing retries produces an average 22% increase in comprehension and significantly lowers reading anxiety.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 4: Alerts & Data Export */}
      {activeTab === 'notifications' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Notification Preferences */}
            <Card variant="default" padding="lg">
              <h2 className="text-headline-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                <Bell size={20} className="text-primary" /> Educator Notifications & Reminders
              </h2>
              <p className="text-body-sm text-text-secondary mb-6 leading-relaxed">
                Control which email alerts and in-portal notification cards you receive regarding student activity.
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-surface-low rounded-2xl border border-surface-border">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-text-primary text-body-md">Assignment Submissions</p>
                    <p className="text-xs text-text-secondary">
                      Receive an alert as soon as a student completes their assigned reading and comprehension.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyOnSubmission}
                    onChange={(e) => updateSetting('notifyOnSubmission', e.target.checked)}
                    className="w-5 h-5 rounded-lg accent-primary cursor-pointer"
                    aria-label="Assignment Submissions"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-low rounded-2xl border border-surface-border">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-text-primary text-body-md">Inactivity Warnings (3+ Days)</p>
                    <p className="text-xs text-text-secondary">
                      Alerts when an enrolled student has not recorded any reading session in 3 days.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyOnInactivity}
                    onChange={(e) => updateSetting('notifyOnInactivity', e.target.checked)}
                    className="w-5 h-5 rounded-lg accent-primary cursor-pointer"
                    aria-label="Inactivity Warnings"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-low rounded-2xl border border-surface-border">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-text-primary text-body-md">Milestone & Streak Achievements</p>
                    <p className="text-xs text-text-secondary">
                      Celebrate when a student reaches new fluency goals or hits a 7-day reading streak.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyOnMilestone}
                    onChange={(e) => updateSetting('notifyOnMilestone', e.target.checked)}
                    className="w-5 h-5 rounded-lg accent-primary cursor-pointer"
                    aria-label="Milestone & Streak Achievements"
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-surface-low rounded-2xl border border-surface-border">
                  <div className="space-y-0.5">
                    <p className="font-semibold text-text-primary text-body-md">Automated 24h Due Date Reminders</p>
                    <p className="text-xs text-text-secondary">
                      Send a friendly, non-punitive reminder card to students who have pending assignments 24h before due date.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoRemindPendingStudents}
                    onChange={(e) => updateSetting('autoRemindPendingStudents', e.target.checked)}
                    className="w-5 h-5 rounded-lg accent-primary cursor-pointer"
                    aria-label="Automated 24h Due Date Reminders"
                  />
                </div>
              </div>
            </Card>

            {/* Data Export Card */}
            <Card variant="default" padding="lg">
              <h2 className="text-headline-sm font-bold text-text-primary mb-2 flex items-center gap-2">
                <Download size={20} className="text-secondary" /> Data Export & Records
              </h2>
              <p className="text-body-sm text-text-secondary mb-5 leading-relaxed">
                Download your classroom records, student roster, and accessibility configurations for school compliance or offline analysis.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-surface-low border border-surface-border space-y-3">
                  <div>
                    <h3 className="font-bold text-text-primary text-body-md">Student Roster (CSV)</h3>
                    <p className="text-xs text-text-muted mt-1">Export enrolled student names, emails, grades, and enroll dates.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    iconLeft={<Download size={16} />}
                    onClick={handleExportRosterCsv}
                  >
                    Download CSV
                  </Button>
                </div>

                <div className="p-4 rounded-2xl bg-surface-low border border-surface-border space-y-3">
                  <div>
                    <h3 className="font-bold text-text-primary text-body-md">Classroom Settings (JSON)</h3>
                    <p className="text-xs text-text-muted mt-1">Export configuration snapshot of presets and reading goals.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    iconLeft={<Download size={16} />}
                    onClick={handleExportJsonSnapshot}
                  >
                    Download JSON
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Privacy & Compliance Notice */}
          <div className="space-y-6">
            <Card variant="default" padding="lg">
              <h3 className="font-bold text-text-primary text-headline-sm mb-3 flex items-center gap-2">
                <ShieldCheck size={18} className="text-tertiary" /> Privacy Standards
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed mb-4">
                All reading data, audio waveforms, and phoneme tracking are encrypted in transit and at rest in accordance with educational privacy laws (FERPA, COPPA).
              </p>
              <div className="p-3 bg-tertiary-50/50 rounded-xl border border-tertiary-200 text-xs text-text-secondary">
                <p className="font-semibold text-text-primary mb-1">Data Ownership</p>
                <p>Educators retain full control over classroom records. Exported files remain within your school district jurisdiction.</p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
