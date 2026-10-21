import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  BookOpen,
  Plus,
  FileCheck,
  Clock,
  Users,
  ChevronRight,
  Sparkles,
  Check,
  UploadCloud,
  FileText,
  X,
  AlertCircle,
  RefreshCw,
  Volume2,
  Square,
  Send,
  CheckCircle2,
  Filter,
  Search,
  BookMarked,
  SlidersHorizontal,
  AlignLeft,
  Wand2
} from 'lucide-react';
import { Button, Card, Badge, Modal, Input } from '../../components/ui';
import {
  extractTextFromFile,
  extractWithAI,
  detectLanguage,
  estimateGradeLevel
} from '../../utils/documentExtractor';
import { TTSEngine } from '../../utils/ttsEngine';
import { renderAccessibleText } from '../../utils/textTransform';

export interface Passage {
  id: string;
  title: string;
  level: string;
  words: number;
  language: 'English' | 'Malayalam';
  content: string;
  sourceType: 'preset' | 'upload' | 'pasted';
  fileName?: string;
  createdAt?: string;
}

export interface StudentSubmission {
  studentId: string;
  studentName: string;
  email: string;
  status: 'completed' | 'in-progress' | 'pending';
  submittedAt?: string;
  accuracy?: number;
  wpm?: number;
}

export interface Assignment {
  id: string;
  passageId: string;
  passageTitle: string;
  passageLevel: string;
  passageWords: number;
  passageLanguage: 'English' | 'Malayalam';
  passageContent: string;
  assignedTo: string;
  dueDate: string;
  createdAt: string;
  status: 'active' | 'completed';
  submissions: number;
  total: number;
  instructions?: string;
  students: StudentSubmission[];
}

const DEFAULT_STUDENTS: StudentSubmission[] = [
  { studentId: 's1', studentName: 'Alex Student', email: 'alex@readease.edu', status: 'completed', submittedAt: 'Yesterday, 3:45 PM', accuracy: 96, wpm: 124 },
  { studentId: 's2', studentName: 'Maya Sharma', email: 'maya@readease.edu', status: 'completed', submittedAt: 'Yesterday, 4:10 PM', accuracy: 92, wpm: 110 },
  { studentId: 's3', studentName: 'Liam Chen', email: 'liam@readease.edu', status: 'completed', submittedAt: 'Today, 9:15 AM', accuracy: 94, wpm: 118 },
  { studentId: 's4', studentName: 'Sophia Patel', email: 'sophia@readease.edu', status: 'in-progress', submittedAt: undefined, accuracy: 88, wpm: 95 },
  { studentId: 's5', studentName: 'Ethan Brooks', email: 'ethan@readease.edu', status: 'pending' },
  { studentId: 's6', studentName: 'Emma Watson', email: 'emma@readease.edu', status: 'completed', submittedAt: 'Today, 11:30 AM', accuracy: 98, wpm: 135 },
  { studentId: 's7', studentName: 'Noah Miller', email: 'noah@readease.edu', status: 'pending' },
  { studentId: 's8', studentName: 'Olivia Davis', email: 'olivia@readease.edu', status: 'in-progress' }
];

const INITIAL_PASSAGES: Passage[] = [
  {
    id: 'p1',
    title: 'The Butterfly Effect',
    level: 'Grade 3',
    words: 180,
    language: 'English',
    sourceType: 'preset',
    content: `In the heart of a sunlit meadow, a tiny monarch caterpillar named Pip nibbled on green milkweed leaves. Pip dreamed of the high sky and wondered what lay beyond the gentle hills. One warm afternoon, Pip spun a silky chrysalis that shimmered like jade under the summer sun.

Days turned into quiet weeks until the green shell softened. With a gentle push, Pip emerged into the morning light, unfolding vibrant orange and black wings. Fluttering softly above the wildflower blossoms, Pip discovered that even the gentlest flutter of tiny wings could carry hope across the entire meadow.`
  },
  {
    id: 'p2',
    title: 'Seasons of Change',
    level: 'Grade 4',
    words: 220,
    language: 'English',
    sourceType: 'preset',
    content: `As autumn arrives, trees throughout the forest prepare for the frosty months ahead. Chlorophyll within the leaves begins to break down, revealing brilliant bursts of crimson, amber, and gold. Squirrels scurry across mossy logs, stashing acorns beneath hollow oak roots.

When winter blankets the hills in quiet snow, life slows down to a restful whisper. Seeds rest beneath the frosty soil, waiting for the gentle warmth of spring. When April showers return, fresh green shoots pierce through the thawing ground, reminding us that nature's cycles always renew themselves in endless harmony.`
  },
  {
    id: 'p3',
    title: 'Water Cycle Story',
    level: 'Grade 3',
    words: 150,
    language: 'English',
    sourceType: 'preset',
    content: `Splash was a happy little water droplet floating on the warm surface of the ocean. When the bright sun warmed the water, Splash transformed into invisible vapor and drifted high into the sky.

High above the mountains, Splash cooled down and joined millions of friends to form a fluffy white cloud. When the cloud grew heavy, Splash fell gently as a raindrop onto a pine tree, flowing down into a river and journeying all the way back home to the sea.`
  },
  {
    id: 'p4',
    title: 'ഒരു ദിനം (A Day in the Village)',
    level: 'Grade 4',
    words: 160,
    language: 'Malayalam',
    sourceType: 'preset',
    content: `ഒരു മനോഹരമായ ഗ്രാമത്തിൽ ഉദയസൂര്യന്റെ പൊൻകിരണങ്ങൾ പരന്നു. കിളികൾ ചിലച്ചു കൊണ്ട് ആകാശത്തേക്ക് പറന്നുയർന്നു. പുഴയോരത്തെ പച്ചപ്പുല്ലിൽ മഞ്ഞുതുള്ളികൾ രത്നങ്ങൾ പോലെ തിളങ്ങി.

കുട്ടികൾ സന്തോഷത്തോടെ പുസ്തകസഞ്ചിയുമെടുത്ത് പാഠശാലയിലേക്ക് നടന്നു. വഴിയിൽ പൂത്തുനിൽക്കുന്ന ചെടികളെ നോക്കി അവർ പുഞ്ചിരിച്ചു. അധ്യാപകരുടെ സ്നേഹനിർഭരമായ വാക്കുകൾ അവരുടെ മനസ്സിൽ അറിവിന്റെ വെളിച്ചം പകർന്നു. വൈകുന്നേരം കളിക്കളത്തിൽ കൂട്ടുകാരോടൊപ്പം പന്തുതട്ടി അവർ ആനന്ദിച്ചു.`
  }
];

const INITIAL_ASSIGNMENTS: Assignment[] = [
  {
    id: 'a1',
    passageId: 'p1',
    passageTitle: 'The Butterfly Effect',
    passageLevel: 'Grade 3',
    passageWords: 180,
    passageLanguage: 'English',
    passageContent: INITIAL_PASSAGES[0].content,
    assignedTo: 'Entire Class',
    dueDate: '2026-10-28',
    createdAt: '2026-10-18',
    status: 'active',
    submissions: 12,
    total: 18,
    instructions: 'Read using Bionic Reading fixations and practice fluency. Answer the comprehension reflections at the end.',
    students: DEFAULT_STUDENTS
  },
  {
    id: 'a2',
    passageId: 'p2',
    passageTitle: 'Seasons of Change',
    passageLevel: 'Grade 4',
    passageWords: 220,
    passageLanguage: 'English',
    passageContent: INITIAL_PASSAGES[1].content,
    assignedTo: 'Group A (Reading Intervention)',
    dueDate: '2026-10-30',
    createdAt: '2026-10-19',
    status: 'active',
    submissions: 5,
    total: 8,
    instructions: 'Listen to the audio guide first, then read aloud at your own comfortable pace.',
    students: DEFAULT_STUDENTS.slice(0, 8)
  },
  {
    id: 'a3',
    passageId: 'p3',
    passageTitle: 'Water Cycle Story',
    passageLevel: 'Grade 3',
    passageWords: 150,
    passageLanguage: 'English',
    passageContent: INITIAL_PASSAGES[2].content,
    assignedTo: 'Entire Class',
    dueDate: '2026-10-20',
    createdAt: '2026-10-12',
    status: 'completed',
    submissions: 18,
    total: 18,
    instructions: 'Complete by Friday. Focus on science vocabulary words.',
    students: DEFAULT_STUDENTS.map((s) => ({ ...s, status: 'completed', submittedAt: 'Oct 20, 2:15 PM' }))
  }
];

export const TeacherAssignmentsView: React.FC = () => {
  // Passages state
  const [passages, setPassages] = useState<Passage[]>(() => {
    try {
      const saved = localStorage.getItem('readease_teacher_passages');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading stored passages:', e);
    }
    return INITIAL_PASSAGES;
  });

  // Assignments state
  const [assignments, setAssignments] = useState<Assignment[]>(() => {
    try {
      const saved = localStorage.getItem('readease_teacher_assignments');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Error reading stored assignments:', e);
    }
    return INITIAL_ASSIGNMENTS;
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('readease_teacher_passages', JSON.stringify(passages));
    } catch (e) {
      console.warn('Error persisting passages:', e);
    }
  }, [passages]);

  useEffect(() => {
    try {
      localStorage.setItem('readease_teacher_assignments', JSON.stringify(assignments));
    } catch (e) {
      console.warn('Error persisting assignments:', e);
    }
  }, [assignments]);

  // Form toggle & state
  const [showNew, setShowNew] = useState(false);
  const [sourceMode, setSourceMode] = useState<'preset' | 'upload' | 'paste'>('preset');

  // Preset Selection State
  const [selectedPassageId, setSelectedPassageId] = useState<string>('p1');

  // Upload Document State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractionSuccess, setExtractionSuccess] = useState<string | null>(null);

  // AI Document Extraction State
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [useAiExtraction, setUseAiExtraction] = useState(true);
  const [isAiEnhancedResult, setIsAiEnhancedResult] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  // Custom Passage Metadata (for Upload or Paste)
  const [customTitle, setCustomTitle] = useState('');
  const [customContent, setCustomContent] = useState('');
  const [customLevel, setCustomLevel] = useState('Grade 3');
  const [customLanguage, setCustomLanguage] = useState<'English' | 'Malayalam'>('English');

  // Assignment Parameters
  const [assignTarget, setAssignTarget] = useState('Entire Class');
  const [dueDate, setDueDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  });
  const [teacherInstructions, setTeacherInstructions] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Details Modal State
  const [selectedAssignmentForDetails, setSelectedAssignmentForDetails] = useState<Assignment | null>(null);
  const [detailsTab, setDetailsTab] = useState<'submissions' | 'passage' | 'settings'>('submissions');
  const [studentSearch, setStudentSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'in-progress' | 'pending'>('all');
  const [remindedStudents, setRemindedStudents] = useState<Record<string, boolean>>({});

  // Audio Playback in Details modal
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [bionicPreviewActive, setBionicPreviewActive] = useState(true);

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up audio on unmount or modal close
  useEffect(() => {
    return () => {
      TTSEngine.stop();
    };
  }, []);

  const handleStopAudio = () => {
    TTSEngine.stop();
    setIsPlayingAudio(false);
  };

  const handlePlayAudio = (text: string, language: string) => {
    if (isPlayingAudio) {
      handleStopAudio();
      return;
    }
    setIsPlayingAudio(true);
    TTSEngine.speak({
      text,
      language: language === 'Malayalam' ? 'ml' : 'en',
      rate: 0.95,
      onEnd: () => setIsPlayingAudio(false),
      onError: () => setIsPlayingAudio(false)
    });
  };

  // Handle document file upload and text extraction
  const handleFileChange = async (file: File) => {
    if (!file) return;
    setUploadedFile(file);
    setIsExtracting(true);
    setExtractionError(null);
    setExtractionSuccess(null);
    setIsAiEnhancedResult(false);
    setAiSummary(null);

    try {
      const result = await extractTextFromFile(file, useAiExtraction);
      setCustomTitle(result.title);
      setCustomContent(result.text);
      setCustomLevel(result.gradeLevel);
      setCustomLanguage(result.detectedLanguage);
      setIsAiEnhancedResult(!!result.isAiEnhanced);
      if (result.summary) setAiSummary(result.summary);
      setExtractionSuccess(
        result.isAiEnhanced
          ? `AI processed and formatted ${result.wordCount} words from "${file.name}"!`
          : `Successfully extracted ${result.wordCount} words from "${file.name}"!`
      );
    } catch (err) {
      const msg = (err as Error).message || 'Failed to extract text from document.';
      setExtractionError(msg);
    } finally {
      setIsExtracting(false);
    }
  };

  // Trigger AI enhancement on existing/pasted content
  const handleRunAiEnhance = async (overrideText?: string) => {
    const textToClean = overrideText || customContent;
    if (!textToClean.trim() && !uploadedFile) return;

    setIsAiProcessing(true);
    setExtractionError(null);

    try {
      const result = await extractWithAI({
        rawText: textToClean,
        fileName: uploadedFile?.name || customTitle || 'Reading Passage',
        targetGrade: customLevel,
        language: customLanguage
      });

      setCustomTitle(result.title);
      setCustomContent(result.text);
      setCustomLevel(result.gradeLevel);
      setCustomLanguage(result.detectedLanguage);
      setIsAiEnhancedResult(true);
      if (result.summary) setAiSummary(result.summary);
      setExtractionSuccess(
        `AI enhanced and structured ${result.wordCount} words for ${result.gradeLevel}!`
      );
    } catch (err) {
      setExtractionError((err as Error).message || 'AI extraction failed.');
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Handle pasted text change
  const handlePastedTextChange = (text: string) => {
    setCustomContent(text);
    if (!customTitle && text.trim().length > 0) {
      const words = text.trim().split(/\s+/).slice(0, 4);
      setCustomTitle(words.join(' ').replace(/[^a-zA-Z0-9\s]/g, ''));
    }
    if (text.trim().length > 20) {
      setCustomLanguage(detectLanguage(text));
      setCustomLevel(estimateGradeLevel(text));
    }
  };

  // Live word counter for custom content
  const customWordCount = useMemo(() => {
    return customContent.trim() ? customContent.trim().split(/\s+/).filter(Boolean).length : 0;
  }, [customContent]);

  // Submit Handler for New Assignment
  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();

    let targetPassage: Passage;

    if (sourceMode === 'preset') {
      const found = passages.find((p) => p.id === selectedPassageId);
      if (!found) return;
      targetPassage = found;
    } else {
      // Custom passage from Upload or Paste
      if (!customContent.trim()) {
        setExtractionError('Please provide passage content before creating an assignment.');
        return;
      }

      const words = customContent.trim().split(/\s+/).filter(Boolean).length;
      const finalTitle = customTitle.trim() || (sourceMode === 'upload' && uploadedFile ? uploadedFile.name : 'Custom Reading Passage');

      const newPassage: Passage = {
        id: `custom-passage-${Date.now()}`,
        title: finalTitle,
        level: customLevel,
        words,
        language: customLanguage,
        content: customContent.trim(),
        sourceType: sourceMode === 'paste' ? 'pasted' : 'upload',
        fileName: uploadedFile?.name,
        createdAt: new Date().toISOString()
      };

      // Add custom passage to the passages library
      setPassages((prev) => [newPassage, ...prev]);
      targetPassage = newPassage;
    }

    // Build the new assignment
    const newAssignment: Assignment = {
      id: `assign-${Date.now()}`,
      passageId: targetPassage.id,
      passageTitle: targetPassage.title,
      passageLevel: targetPassage.level,
      passageWords: targetPassage.words,
      passageLanguage: targetPassage.language,
      passageContent: targetPassage.content,
      assignedTo: assignTarget,
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
      status: 'active',
      submissions: 0,
      total: assignTarget.includes('Group') ? 8 : assignTarget.includes('Individual') ? 1 : 18,
      instructions: teacherInstructions.trim() || undefined,
      students: DEFAULT_STUDENTS.map((s) => ({
        ...s,
        status: 'pending',
        submittedAt: undefined,
        accuracy: undefined,
        wpm: undefined
      }))
    };

    setAssignments((prev) => [newAssignment, ...prev]);
    setSubmitted(true);

    setTimeout(() => {
      setShowNew(false);
      setSubmitted(false);
      setUploadedFile(null);
      setCustomTitle('');
      setCustomContent('');
      setExtractionError(null);
      setExtractionSuccess(null);
      setTeacherInstructions('');
      setSourceMode('preset');
    }, 1200);
  };

  // Details button handler
  const handleOpenDetails = (assignment: Assignment) => {
    handleStopAudio();
    setSelectedAssignmentForDetails(assignment);
    setDetailsTab('submissions');
    setStudentSearch('');
    setStatusFilter('all');
  };

  // Nudge / remind student
  const handleRemindStudent = (studentId: string) => {
    setRemindedStudents((prev) => ({ ...prev, [studentId]: true }));
    setTimeout(() => {
      setRemindedStudents((prev) => ({ ...prev, [studentId]: false }));
    }, 4000);
  };

  // Toggle status of assignment in details modal
  const handleToggleAssignmentStatus = () => {
    if (!selectedAssignmentForDetails) return;
    const newStatus: 'active' | 'completed' =
      selectedAssignmentForDetails.status === 'active' ? 'completed' : 'active';
    const updated: Assignment = { ...selectedAssignmentForDetails, status: newStatus };
    setSelectedAssignmentForDetails(updated);
    setAssignments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  // Filter students in details modal
  const filteredStudents = useMemo(() => {
    if (!selectedAssignmentForDetails) return [];
    return selectedAssignmentForDetails.students.filter((s) => {
      const matchesSearch =
        s.studentName.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email.toLowerCase().includes(studentSearch.toLowerCase());
      const matchesFilter =
        statusFilter === 'all' ? true : s.status === statusFilter;
      return matchesSearch && matchesFilter;
    });
  }, [selectedAssignmentForDetails, studentSearch, statusFilter]);

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header Landmark */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-display-lg-mobile md:text-display-lg font-bold text-text-primary flex items-center gap-2">
            <FileCheck size={28} className="text-primary" /> Reading Assignments
          </h1>
          <p className="text-text-secondary text-body-sm mt-1">
            Assign reading passages, upload documents, extract custom texts, and monitor class submissions
          </p>
        </div>
        <Button
          variant="primary"
          iconLeft={showNew ? <X size={18} /> : <Plus size={18} />}
          onClick={() => {
            setShowNew(!showNew);
            if (!showNew) {
              setExtractionError(null);
              setExtractionSuccess(null);
            }
          }}
        >
          {showNew ? 'Close Form' : 'New Assignment'}
        </Button>
      </div>

      {/* New Assignment Creation Form */}
      {showNew && (
        <Card variant="highlight" padding="lg" className="border-2 border-primary/25 shadow-elevated">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-surface-border">
            <div>
              <h2 className="text-headline-sm font-bold text-text-primary flex items-center gap-2">
                <Sparkles size={20} className="text-secondary" /> Create New Reading Assignment
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Choose a passage from your library, upload any document, or paste raw content for your students
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-100 text-primary">
              Step 1 of 2
            </span>
          </div>

          <form onSubmit={handleCreateAssignment} className="space-y-6">
            {/* AI Assistant Extraction Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-primary-50/70 border border-primary-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary flex items-center justify-center flex-shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-text-primary flex items-center gap-2">
                    AI Advanced Document & Noise Filter
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-white font-semibold uppercase tracking-wider">
                      Active
                    </span>
                  </p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Filters out JFIF/binary noise, transcribes scanned PDFs, and reconstructs clean dyslexia-friendly passages.
                  </p>
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer self-end sm:self-center">
                <span className="text-xs font-bold text-text-secondary">AI Extraction</span>
                <input
                  type="checkbox"
                  checked={useAiExtraction}
                  onChange={(e) => setUseAiExtraction(e.target.checked)}
                  className="w-4 h-4 text-primary rounded border-surface-border focus:ring-primary"
                />
              </label>
            </div>

            {/* Source Mode Tabs */}
            <div>
              <label className="block text-label-md font-bold text-text-primary mb-2">
                Passage Source
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-1.5 bg-surface-low rounded-2xl border border-surface-border">
                <button
                  type="button"
                  onClick={() => setSourceMode('preset')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                    sourceMode === 'preset'
                      ? 'bg-surface-lowest text-primary shadow-soft border border-primary/20'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <BookMarked size={18} /> Select from Library ({passages.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode('upload')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                    sourceMode === 'upload'
                      ? 'bg-surface-lowest text-primary shadow-soft border border-primary/20'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <UploadCloud size={18} /> Upload Document (PDF/DOCX/TXT)
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode('paste')}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                    sourceMode === 'paste'
                      ? 'bg-surface-lowest text-primary shadow-soft border border-primary/20'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <AlignLeft size={18} /> Paste Custom Content
                </button>
              </div>
            </div>

            {/* TAB 1: Select from Library Passages */}
            {sourceMode === 'preset' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                    Available Passages
                  </span>
                  <span className="text-xs text-text-secondary">
                    {passages.length} passages available
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                  {passages.map((p) => {
                    const isSelected = selectedPassageId === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPassageId(p.id)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary-50/60 shadow-soft ring-2 ring-primary/30'
                            : 'border-surface-border bg-surface-low hover:border-primary-200 hover:bg-surface-lowest'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-text-primary text-label-lg">{p.title}</p>
                              {p.sourceType !== 'preset' && (
                                <Badge variant="secondary" size="sm">
                                  {p.sourceType === 'upload' ? 'Uploaded' : 'Custom'}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-text-muted">
                              {p.level} · {p.words} words · {p.language}
                            </p>
                            <p className="text-xs text-text-secondary line-clamp-2 mt-1">
                              {p.content}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center flex-shrink-0">
                              <Check size={12} />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: Upload Document */}
            {sourceMode === 'upload' && (
              <div className="space-y-4">
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileChange(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer relative ${
                    isDragging
                      ? 'border-primary bg-primary-100/50 scale-[1.01]'
                      : 'border-primary-200 hover:border-primary bg-primary-50/30'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".txt,.docx,.doc,.pdf,.md"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileChange(file);
                    }}
                  />

                  <div className="w-14 h-14 rounded-2xl bg-primary-100 text-primary mx-auto flex items-center justify-center mb-3">
                    {isExtracting ? (
                      <RefreshCw size={26} className="animate-spin" />
                    ) : (
                      <UploadCloud size={28} />
                    )}
                  </div>

                  {isExtracting ? (
                    <div>
                      <p className="text-base font-bold text-text-primary">
                        Extracting text from {uploadedFile?.name}...
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        Parsing document contents, calculating word count, and formatting readability...
                      </p>
                    </div>
                  ) : uploadedFile ? (
                    <div className="space-y-1">
                      <p className="text-base font-bold text-primary flex items-center justify-center gap-2">
                        <FileText size={18} /> {uploadedFile.name}
                      </p>
                      <p className="text-xs text-text-muted">
                        {(uploadedFile.size / 1024).toFixed(1)} KB · Click or drag to replace file
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-base font-bold text-text-primary">
                        Drop your document here, or <span className="text-primary underline">browse</span>
                      </p>
                      <p className="text-xs text-text-muted mt-1.5">
                        Supports Word (.docx), PDF (.pdf), and Plain Text (.txt, .md) up to 25MB
                      </p>
                    </div>
                  )}
                </div>

                {/* Extraction Feedback Alerts */}
                {extractionError && (
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
                    <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Text Extraction Notice</p>
                      <p className="text-xs mt-0.5">{extractionError}</p>
                      <button
                        type="button"
                        onClick={() => setSourceMode('paste')}
                        className="text-xs font-bold text-primary underline mt-2 inline-block"
                      >
                        Switch to Paste Raw Content instead →
                      </button>
                    </div>
                  </div>
                )}

                {extractionSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                    {extractionSuccess}
                  </div>
                )}

                {/* Extracted Content Review */}
                {customContent && (
                  <div className="space-y-4 pt-2 border-t border-surface-border">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                          Passage Title
                        </label>
                        <Input
                          value={customTitle}
                          onChange={(e) => setCustomTitle(e.target.value)}
                          placeholder="Passage title"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                          Target Grade Level
                        </label>
                        <select
                          value={customLevel}
                          onChange={(e) => setCustomLevel(e.target.value)}
                          className="w-full px-4 py-2.5 bg-surface-low border border-surface-border rounded-xl text-text-primary text-sm font-medium focus:ring-2 focus:ring-primary"
                        >
                          <option value="Grade 2">Grade 2 (Early Reader)</option>
                          <option value="Grade 3">Grade 3 (Elementary)</option>
                          <option value="Grade 4">Grade 4 (Intermediate)</option>
                          <option value="Grade 5">Grade 5 (Intermediate)</option>
                          <option value="Grade 6">Grade 6 (Middle School)</option>
                          <option value="Grade 7-8">Grade 7-8 (Advanced)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                          Language
                        </label>
                        <select
                          value={customLanguage}
                          onChange={(e) => setCustomLanguage(e.target.value as 'English' | 'Malayalam')}
                          className="w-full px-4 py-2.5 bg-surface-low border border-surface-border rounded-xl text-text-primary text-sm font-medium focus:ring-2 focus:ring-primary"
                        >
                          <option value="English">English</option>
                          <option value="Malayalam">മലയാളം (Malayalam)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-text-muted uppercase">
                            Extracted Passage Text (Editable)
                          </label>
                          {isAiEnhancedResult && (
                            <Badge variant="secondary" size="sm" dot>
                              AI Cleaned & Formatted
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-primary">
                            {customWordCount} words · ~{Math.max(1, Math.ceil(customWordCount / 120))} min read
                          </span>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            iconLeft={
                              isAiProcessing ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : (
                                <Wand2 size={14} />
                              )
                            }
                            disabled={isAiProcessing || !customContent.trim()}
                            onClick={() => handleRunAiEnhance()}
                          >
                            {isAiProcessing ? 'AI Cleaning...' : 'AI Clean & Structure'}
                          </Button>
                        </div>
                      </div>

                      {isAiEnhancedResult && aiSummary && (
                        <div className="p-2.5 rounded-xl bg-secondary-50 border border-secondary-200 text-xs text-text-primary flex items-center gap-2 mb-2">
                          <Sparkles size={14} className="text-secondary flex-shrink-0" />
                          <span>
                            <strong className="text-secondary">AI Summary:</strong> {aiSummary}
                          </span>
                        </div>
                      )}

                      <textarea
                        rows={6}
                        value={customContent}
                        onChange={(e) => setCustomContent(e.target.value)}
                        className="w-full p-4 bg-surface-low border border-surface-border rounded-xl text-text-primary font-mono text-sm leading-relaxed focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                        placeholder="Extracted passage content..."
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Paste Custom Content */}
            {sourceMode === 'paste' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                      Passage Title
                    </label>
                    <Input
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      placeholder="e.g. Exploring Rainforests"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                      Target Grade Level
                    </label>
                    <select
                      value={customLevel}
                      onChange={(e) => setCustomLevel(e.target.value)}
                      className="w-full px-4 py-2.5 bg-surface-low border border-surface-border rounded-xl text-text-primary text-sm font-medium focus:ring-2 focus:ring-primary"
                    >
                      <option value="Grade 2">Grade 2 (Early Reader)</option>
                      <option value="Grade 3">Grade 3 (Elementary)</option>
                      <option value="Grade 4">Grade 4 (Intermediate)</option>
                      <option value="Grade 5">Grade 5 (Intermediate)</option>
                      <option value="Grade 6">Grade 6 (Middle School)</option>
                      <option value="Grade 7-8">Grade 7-8 (Advanced)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-1">
                      Language
                    </label>
                    <select
                      value={customLanguage}
                      onChange={(e) => setCustomLanguage(e.target.value as 'English' | 'Malayalam')}
                      className="w-full px-4 py-2.5 bg-surface-low border border-surface-border rounded-xl text-text-primary text-sm font-medium focus:ring-2 focus:ring-primary"
                    >
                      <option value="English">English</option>
                      <option value="Malayalam">മലയാളം (Malayalam)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-bold text-text-muted uppercase">
                        Passage Content
                      </label>
                      {isAiEnhancedResult && (
                        <Badge variant="secondary" size="sm" dot>
                          AI Formatted
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-primary">
                        {customWordCount} words · ~{Math.max(1, Math.ceil(customWordCount / 120))} min read
                      </span>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        iconLeft={
                          isAiProcessing ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Wand2 size={14} />
                          )
                        }
                        disabled={isAiProcessing || !customContent.trim()}
                        onClick={() => handleRunAiEnhance()}
                      >
                        {isAiProcessing ? 'AI Cleaning...' : 'AI Clean & Structure'}
                      </Button>
                    </div>
                  </div>

                  <textarea
                    rows={7}
                    value={customContent}
                    onChange={(e) => handlePastedTextChange(e.target.value)}
                    className="w-full p-4 bg-surface-low border border-surface-border rounded-xl text-text-primary text-sm leading-relaxed focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    placeholder="Paste your reading passage, story, or article here. ReadEase will automatically generate Bionic fixation anchors and TTS synchronization."
                    required
                  />
                </div>
              </div>
            )}

            {/* Step 2: Target & Schedule */}
            <div className="pt-4 border-t border-surface-border space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                Assignment Target & Schedule
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-label-md font-semibold text-text-primary mb-2">
                    Assign To
                  </label>
                  <select
                    value={assignTarget}
                    onChange={(e) => setAssignTarget(e.target.value)}
                    className="w-full px-4 py-3 bg-surface-low border border-surface-border rounded-xl text-text-primary focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm font-medium"
                  >
                    <option value="Entire Class">Entire Class (18 students)</option>
                    <option value="Group A (Reading Intervention)">Group A (Reading Intervention - 8 students)</option>
                    <option value="Group B (Accelerated Readers)">Group B (Accelerated Readers - 6 students)</option>
                    <option value="Individual: Alex Student">Individual: Alex Student</option>
                    <option value="Individual: Maya Sharma">Individual: Maya Sharma</option>
                    <option value="Individual: Liam Chen">Individual: Liam Chen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-label-md font-semibold text-text-primary mb-2">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    className="w-full px-4 py-3 bg-surface-low border border-surface-border rounded-xl text-text-primary focus:ring-2 focus:ring-primary focus:border-primary transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-label-md font-semibold text-text-primary mb-2">
                  Special Instructions for Students <span className="text-xs text-text-muted font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={teacherInstructions}
                  onChange={(e) => setTeacherInstructions(e.target.value)}
                  placeholder="e.g. Turn on the Reading Ruler and practice reading out loud twice."
                  className="w-full px-4 py-2.5 bg-surface-low border border-surface-border rounded-xl text-text-primary text-sm focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3">
              <Button type="button" variant="ghost" onClick={() => setShowNew(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                iconLeft={submitted ? <Check size={18} /> : <FileCheck size={18} />}
                disabled={
                  submitted ||
                  (sourceMode === 'preset' && !selectedPassageId) ||
                  ((sourceMode === 'upload' || sourceMode === 'paste') && !customContent.trim())
                }
              >
                {submitted ? 'Assignment Created!' : 'Create & Assign Passage'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Existing Assignments Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-headline-sm font-bold text-text-primary">
              Active & Recent Assignments
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              Click &quot;Details&quot; on any assignment to view student progress, submission timestamps, and full passage text.
            </p>
          </div>
          <Badge variant="primary">
            {assignments.length} Total Assignments
          </Badge>
        </div>

        {/* Assignments Cards */}
        <div className="space-y-3">
          {assignments.map((a) => {
            const pct = Math.round((a.submissions / a.total) * 100);
            return (
              <Card key={a.id} variant="default" padding="lg" className="hover:border-primary-200 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="p-3.5 rounded-2xl bg-primary-50 text-primary w-fit flex-shrink-0">
                    <BookOpen size={22} />
                  </div>

                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-text-primary text-base truncate">{a.passageTitle}</h3>
                      <Badge variant={a.status === 'completed' ? 'tertiary' : 'primary'} dot>
                        {a.status === 'completed' ? 'Completed' : 'Active'}
                      </Badge>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-surface-low border border-surface-border text-text-secondary">
                        {a.passageLevel} · {a.passageWords} words
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
                      <span className="flex items-center gap-1.5">
                        <Users size={14} className="text-primary" /> {a.assignedTo}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-secondary" /> Due {a.dueDate}
                      </span>
                      <span className="font-semibold text-text-primary">
                        {a.submissions}/{a.total} submitted ({pct}%)
                      </span>
                    </div>

                    <div className="w-full bg-surface-border rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          pct === 100 ? 'bg-tertiary' : 'bg-primary'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      iconRight={<ChevronRight size={14} />}
                      onClick={() => handleOpenDetails(a)}
                    >
                      Details
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Assignment Details Modal */}
      {selectedAssignmentForDetails && (
        <Modal
          isOpen={!!selectedAssignmentForDetails}
          onClose={() => {
            handleStopAudio();
            setSelectedAssignmentForDetails(null);
          }}
          maxWidth="xl"
          title={selectedAssignmentForDetails.passageTitle}
          description={`Assigned to ${selectedAssignmentForDetails.assignedTo} · Due ${selectedAssignmentForDetails.dueDate}`}
        >
          <div className="space-y-6">
            {/* Top Summary Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-surface-low border border-surface-border">
                <p className="text-xs text-text-muted font-bold uppercase">Submissions</p>
                <p className="text-xl font-bold text-text-primary mt-1">
                  {selectedAssignmentForDetails.submissions} / {selectedAssignmentForDetails.total}
                </p>
                <p className="text-xs text-primary font-medium mt-0.5">
                  {Math.round((selectedAssignmentForDetails.submissions / selectedAssignmentForDetails.total) * 100)}% completed
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-low border border-surface-border">
                <p className="text-xs text-text-muted font-bold uppercase">Grade Level</p>
                <p className="text-xl font-bold text-text-primary mt-1">
                  {selectedAssignmentForDetails.passageLevel}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {selectedAssignmentForDetails.passageLanguage}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-low border border-surface-border">
                <p className="text-xs text-text-muted font-bold uppercase">Word Count</p>
                <p className="text-xl font-bold text-text-primary mt-1">
                  {selectedAssignmentForDetails.passageWords}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  ~{Math.max(1, Math.ceil(selectedAssignmentForDetails.passageWords / 120))} min read
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-surface-low border border-surface-border">
                <p className="text-xs text-text-muted font-bold uppercase">Status</p>
                <div className="mt-1">
                  <Badge
                    variant={selectedAssignmentForDetails.status === 'completed' ? 'tertiary' : 'primary'}
                    dot
                  >
                    {selectedAssignmentForDetails.status === 'completed' ? 'Completed' : 'Active'}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  Due {selectedAssignmentForDetails.dueDate}
                </p>
              </div>
            </div>

            {/* Modal Internal Tabs */}
            <div className="flex border-b border-surface-border gap-2">
              <button
                type="button"
                onClick={() => setDetailsTab('submissions')}
                className={`pb-2.5 px-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                  detailsTab === 'submissions'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <Users size={16} /> Student Roster ({selectedAssignmentForDetails.students.length})
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab('passage')}
                className={`pb-2.5 px-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                  detailsTab === 'passage'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <BookOpen size={16} /> Passage Content & Reader
              </button>
              <button
                type="button"
                onClick={() => setDetailsTab('settings')}
                className={`pb-2.5 px-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                  detailsTab === 'settings'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >
                <SlidersHorizontal size={16} /> Assignment Settings
              </button>
            </div>

            {/* TAB 1: Submissions Roster */}
            {detailsTab === 'submissions' && (
              <div className="space-y-4">
                {/* Search & Filters */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                  <div className="relative w-full sm:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-surface-low border border-surface-border rounded-xl text-xs text-text-primary focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter size={14} className="text-text-muted" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="px-3 py-1.5 bg-surface-low border border-surface-border rounded-xl text-xs font-medium text-text-primary focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All Statuses</option>
                      <option value="completed">Completed</option>
                      <option value="in-progress">In Progress</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="border border-surface-border rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-low border-b border-surface-border text-text-muted font-bold uppercase sticky top-0 z-10">
                      <tr>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Accuracy</th>
                        <th className="py-3 px-4">Speed</th>
                        <th className="py-3 px-4">Submission</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {filteredStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-text-muted">
                            No students match the current filters.
                          </td>
                        </tr>
                      ) : (
                        filteredStudents.map((s) => (
                          <tr key={s.studentId} className="hover:bg-surface-low/50 transition-colors">
                            <td className="py-3 px-4 font-semibold text-text-primary">
                              <div>{s.studentName}</div>
                              <div className="text-[10px] text-text-muted">{s.email}</div>
                            </td>
                            <td className="py-3 px-4">
                              {s.status === 'completed' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                                  <CheckCircle2 size={12} /> Completed
                                </span>
                              ) : s.status === 'in-progress' ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px]">
                                  <Clock size={12} /> Reading
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[11px]">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-bold text-text-primary">
                              {s.accuracy ? `${s.accuracy}%` : '—'}
                            </td>
                            <td className="py-3 px-4 font-medium text-text-primary">
                              {s.wpm ? `${s.wpm} WPM` : '—'}
                            </td>
                            <td className="py-3 px-4 text-text-muted">
                              {s.submittedAt || 'Not submitted'}
                            </td>
                            <td className="py-3 px-4 text-right">
                              {s.status !== 'completed' ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  iconLeft={<Send size={12} />}
                                  onClick={() => handleRemindStudent(s.studentId)}
                                  disabled={remindedStudents[s.studentId]}
                                >
                                  {remindedStudents[s.studentId] ? 'Nudged!' : 'Remind'}
                                </Button>
                              ) : (
                                <span className="text-[11px] text-emerald-600 font-semibold">Done</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: Passage Content & Accessible Reader Preview */}
            {detailsTab === 'passage' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-low rounded-xl border border-surface-border">
                  <div className="flex items-center gap-3">
                    <Button
                      variant={isPlayingAudio ? 'danger' : 'primary'}
                      size="sm"
                      iconLeft={isPlayingAudio ? <Square size={14} /> : <Volume2 size={14} />}
                      onClick={() =>
                        handlePlayAudio(
                          selectedAssignmentForDetails.passageContent,
                          selectedAssignmentForDetails.passageLanguage
                        )
                      }
                    >
                      {isPlayingAudio ? 'Stop Speech' : 'Listen with Audio Guide (TTS)'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setBionicPreviewActive(!bionicPreviewActive)}
                      className={`text-xs font-bold px-3 py-2 rounded-lg border transition-all ${
                        bionicPreviewActive
                          ? 'bg-secondary-50 text-secondary border-secondary/30'
                          : 'bg-surface-lowest text-text-muted border-surface-border'
                      }`}
                    >
                      Bionic Reading: {bionicPreviewActive ? 'ON' : 'OFF'}
                    </button>
                  </div>
                  <span className="text-xs text-text-muted">
                    {selectedAssignmentForDetails.passageWords} words · {selectedAssignmentForDetails.passageLanguage}
                  </span>
                </div>

                {/* Accessible Reading Box */}
                <div className="p-6 rounded-2xl bg-surface-lowest border border-surface-border max-h-80 overflow-y-auto space-y-4 leading-relaxed font-sans text-base shadow-inner">
                  {renderAccessibleText(selectedAssignmentForDetails.passageContent, {
                    bionicEnabled: bionicPreviewActive,
                    fixationPercent: 0.45,
                    syllablesEnabled: false
                  })}
                </div>

                {selectedAssignmentForDetails.instructions && (
                  <div className="p-4 rounded-xl bg-primary-50/50 border border-primary/20 text-xs text-text-primary">
                    <span className="font-bold text-primary block mb-1">Teacher Instructions:</span>
                    {selectedAssignmentForDetails.instructions}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Settings */}
            {detailsTab === 'settings' && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-surface-low border border-surface-border space-y-3">
                  <h4 className="font-bold text-text-primary text-sm">Assignment Controls</h4>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">
                        Status:{' '}
                        <span className="capitalize text-primary">
                          {selectedAssignmentForDetails.status}
                        </span>
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        Close this assignment to prevent further student submissions or reopen it anytime.
                      </p>
                    </div>
                    <Button
                      variant={selectedAssignmentForDetails.status === 'active' ? 'outline' : 'primary'}
                      size="sm"
                      onClick={handleToggleAssignmentStatus}
                    >
                      {selectedAssignmentForDetails.status === 'active'
                        ? 'Mark Assignment as Completed'
                        : 'Reopen Assignment'}
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-low border border-surface-border space-y-3">
                  <h4 className="font-bold text-text-primary text-sm">Target & Schedule</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-text-muted font-bold uppercase block">Assigned Audience</span>
                      <span className="font-semibold text-text-primary mt-1 block">
                        {selectedAssignmentForDetails.assignedTo}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted font-bold uppercase block">Due Date</span>
                      <span className="font-semibold text-text-primary mt-1 block">
                        {selectedAssignmentForDetails.dueDate}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-border">
              <Button
                variant="primary"
                onClick={() => {
                  handleStopAudio();
                  setSelectedAssignmentForDetails(null);
                }}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
