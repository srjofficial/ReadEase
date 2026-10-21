import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  Brain,
  AlertCircle,
  CheckCircle2,
  Clock,
  Award,
  Languages,
  Zap,
  Plus
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

export const EducatorPhonemicAnalysisView: React.FC = () => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('std_alex_1');
  const [selectedLanguage, setSelectedLanguage] = useState<'English' | 'Malayalam'>('English');
  const [phonemicData, setPhonemicData] = useState<any>(null);
  const [assignedToast, setAssignedToast] = useState(false);
  const [assignedTitle, setAssignedTitle] = useState('');

  const selectedStudent =
    CASELOAD_STUDENTS.find((s) => s._id === selectedStudentId) || CASELOAD_STUDENTS[0];

  useEffect(() => {
    const token = getStoredToken();
    fetch(`/api/v1/educator/students/${selectedStudentId}/phonemics`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setPhonemicData(d.data);
        }
      })
      .catch((err) => console.warn('Error fetching phonemics:', err));
  }, [selectedStudentId]);

  const handleAssignIntervention = (title: string) => {
    setAssignedTitle(title);
    setAssignedToast(true);
    setTimeout(() => setAssignedToast(false), 2500);
  };

  const errorCategories = phonemicData?.errorCategories || [
    {
      category: 'Letter / Directional Reversals',
      severity: 'moderate',
      description: 'Stumbling or hesitation on mirrored graphemes',
      items: [
        { target: 'b', substitutedWith: 'd', frequency: 4, examples: ['bold', 'brave', 'bend'] },
        { target: 'p', substitutedWith: 'q', frequency: 2, examples: ['paused', 'playful'] }
      ]
    },
    {
      category: 'Consonant Blend Clusters',
      severity: 'moderate',
      description: 'Cluster reduction or phoneme omission at word onset',
      items: [
        { target: 'str-', substitutedWith: 'st-', frequency: 3, examples: ['stream', 'structured'] },
        { target: 'spl-', substitutedWith: 'sp-', frequency: 2, examples: ['splash', 'splendid'] },
        { target: 'cr-', substitutedWith: 'c-', frequency: 2, examples: ['currents', 'crystal'] }
      ]
    },
    {
      category: 'Vowel Team / Digraph Variations',
      severity: 'low',
      description: 'Phonemic length variation in compound vowel teams',
      items: [
        { target: 'ea (long e)', substitutedWith: 'short e', frequency: 2, examples: ['leap', 'reached'] },
        { target: 'oa (long o)', substitutedWith: 'short o', frequency: 1, examples: ['floating', 'oak'] }
      ]
    }
  ];

  const hesitationWords = phonemicData?.hesitationWords || [
    { word: 'scampering', latencySeconds: 1.4, syllables: 'scam·per·ing', stressError: false },
    { word: 'miniature', latencySeconds: 1.8, syllables: 'min·i·a·ture', stressError: true },
    { word: 'crystal', latencySeconds: 1.3, syllables: 'crys·tal', stressError: false }
  ];

  const interventions = phonemicData?.targetedInterventions || [
    {
      title: 'Multisensory b/d Kinesthetic Tracing',
      description: 'Utilize "bat and ball" vs "doorknob and door" anchor mnemonics prior to reading sessions.',
      status: 'active'
    },
    {
      title: 'Onset-Rime Elkonin Boxes',
      description: 'Practice pushing phoneme counters for 3-letter consonant blends (str-, spl-, scr-).',
      status: 'recommended'
    },
    {
      title: 'Syllable Chunking in Studio',
      description: 'Keep Syllable Division toggle active to break polysyllabic words into phonetic morphemes.',
      status: 'active'
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Toast Notification */}
      {assignedToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 bg-tertiary text-white font-semibold rounded-2xl shadow-elevated animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 size={20} className="flex-shrink-0" />
          <span>"{assignedTitle || 'Intervention'}" assigned to {selectedStudent.displayName}!</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display-lg-mobile font-bold text-text-primary flex items-center gap-3">
            <Sparkles size={28} className="text-secondary" /> Phonemic Analysis
          </h1>
          <p className="text-text-secondary text-body-sm mt-1">
            Speech recognition phonological breakdown, decoding obstacles, and pronunciation telemetry.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-surface-low p-1.5 rounded-2xl border border-surface-border">
          <Languages size={16} className="text-text-muted ml-2" />
          {(['English', 'Malayalam'] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setSelectedLanguage(lang)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedLanguage === lang
                  ? 'bg-surface-lowest text-text-primary shadow-soft'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {lang}
            </button>
          ))}
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
                ? 'border-secondary bg-secondary-50 text-secondary-dark shadow-soft'
                : 'border-surface-border bg-surface-low text-text-secondary hover:text-text-primary hover:bg-surface-lowest'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold text-xs">
              {student.displayName.charAt(0)}
            </div>
            <span>{student.displayName}</span>
            <span className="text-xs opacity-60">({student.grade})</span>
          </button>
        ))}
      </div>

      {/* Top Phonemic Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card variant="subtle" padding="md">
          <div className="flex items-center gap-2 mb-1">
            <Volume2 size={18} className="text-secondary" />
            <span className="text-xs font-semibold text-text-muted">Phonological Accuracy</span>
          </div>
          <p className="text-display-lg-mobile font-bold text-text-primary">
            {phonemicData?.overallPhonologicalAccuracy || 86}%
          </p>
          <p className="text-xs text-text-muted">Based on recorded oral reading sessions</p>
        </Card>

        <Card variant="subtle" padding="md">
          <div className="flex items-center gap-2 mb-1">
            <Brain size={18} className="text-primary" />
            <span className="text-xs font-semibold text-text-muted">Segmentation Fluency</span>
          </div>
          <p className="text-display-lg-mobile font-bold text-text-primary">
            {phonemicData?.phonemeSegmentationRate || 79}%
          </p>
          <p className="text-xs text-text-muted">Compound syllable separation rate</p>
        </Card>

        <Card variant="subtle" padding="md">
          <div className="flex items-center gap-2 mb-1">
            <Award size={18} className="text-tertiary" />
            <span className="text-xs font-semibold text-text-muted">GPC Mastery Level</span>
          </div>
          <p className="text-display-lg-mobile font-bold text-text-primary">
            {phonemicData?.gpcProficiency || 'Emerging'}
          </p>
          <p className="text-xs text-text-muted">Grapheme-to-phoneme correspondence</p>
        </Card>
      </div>

      {/* Identified Decoding Obstacles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-headline-sm font-bold text-text-primary flex items-center gap-2">
            <AlertCircle size={20} className="text-secondary" /> Identified Decoding Obstacles ({selectedLanguage})
          </h3>
          <span className="text-xs text-text-muted">
            Aggregated from {selectedStudent.displayName}'s reading assessment speech recordings
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {errorCategories.map((cat: any, idx: number) => (
            <Card key={idx} variant="default" padding="md" className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-text-primary">{cat.category}</span>
                <Badge variant={cat.severity === 'moderate' ? 'secondary' : 'primary'} size="sm">
                  {cat.severity.toUpperCase()}
                </Badge>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">{cat.description}</p>

              <div className="space-y-2 pt-2 border-t border-surface-border">
                {cat.items.map((item: any, iIdx: number) => (
                  <div key={iIdx} className="p-2.5 rounded-xl bg-surface-low space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-text-primary">
                        {item.target} → {item.substitutedWith}
                      </span>
                      <span className="font-bold text-secondary">{item.frequency}x</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {item.examples.map((ex: string, eIdx: number) => (
                        <span key={eIdx} className="px-1.5 py-0.5 rounded bg-surface-lowest text-[11px] text-text-muted font-mono">
                          {ex}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Multi-Syllabic Pause Latencies */}
      <Card variant="default" padding="lg">
        <h3 className="text-headline-sm font-bold text-text-primary mb-1 flex items-center gap-2">
          <Clock size={20} className="text-primary" /> Polysyllabic Hesitation Latencies
        </h3>
        <p className="text-xs text-text-muted mb-4">
          Words where {selectedStudent.displayName} paused for &gt; 1.2s before verbalizing.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {hesitationWords.map((hw: any, idx: number) => (
            <div key={idx} className="p-4 rounded-2xl bg-surface-low border border-surface-border space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-bold text-text-primary text-body-md">{hw.word}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-mono font-bold">
                  +{hw.latencySeconds}s pause
                </span>
              </div>
              <p className="text-xs text-text-secondary font-mono">{hw.syllables}</p>
              <p className="text-[11px] text-text-muted">
                {hw.stressError ? 'Irregular stress pattern' : 'Standard syllable boundary hesitation'}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Targeted Phonics Interventions */}
      <Card variant="default" padding="lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-headline-sm font-bold text-text-primary flex items-center gap-2">
              <Zap size={20} className="text-tertiary" /> Targeted Phonics Interventions
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Evidence-based Orton-Gillingham exercises generated from {selectedStudent.displayName}'s obstacle profile.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {interventions.map((plan: any, idx: number) => (
            <div
              key={idx}
              className="p-4 rounded-2xl bg-surface-low border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-tertiary-200 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-text-primary text-body-md">{plan.title}</h4>
                  <Badge variant={plan.status === 'active' ? 'tertiary' : 'primary'}>
                    {plan.status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
                  {plan.description}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                iconLeft={<Plus size={16} />}
                onClick={() => handleAssignIntervention(plan.title)}
              >
                Assign Practice
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
