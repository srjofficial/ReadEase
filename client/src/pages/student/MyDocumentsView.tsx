import React, { useState, useEffect } from 'react';
import type { DocumentData } from './ReadingStudioView';
import { useLanguage } from '../../context/LanguageContext';
import { useReadingPreferences } from '../../context/ReadingPreferencesContext';
import { TTSEngine } from '../../utils/ttsEngine';
import { renderAccessibleText } from '../../utils/textTransform';
import {
  FolderKanban,
  FileText,
  UploadCloud,
  Plus,
  Search,
  Trash2,
  Clock,
  Sparkles,
  ArrowRight,
  Volume2,
  Square,
  Eye,
  ExternalLink
} from 'lucide-react';
import { Button, Card, Badge, Modal, Input, Textarea } from '../../components/ui';

interface MyDocumentsViewProps {
  onOpenDocumentInStudio: (doc: DocumentData) => void;
}

export type StoredDocument = DocumentData & {
  fileType: 'PDF' | 'DOCX' | 'TXT';
  progressPercent: number;
  lastRead: string;
  readingTimeMins: number;
  difficulty: 'Easy' | 'Moderate' | 'Advanced';
};

const INITIAL_DOCUMENTS: StoredDocument[] = [
  {
    id: 'whispering-woods',
    title: 'The Whispering Woods',
    category: 'Nature & Adventure',
    language: 'EN',
    wordCount: 280,
    fileType: 'PDF',
    progressPercent: 100,
    lastRead: 'Yesterday',
    readingTimeMins: 4,
    difficulty: 'Easy',
    content: `Deep within the emerald valley stood the Whispering Woods, a sanctuary where ancient trees spoke in gentle rustles. Ten-year-old Maya loved walking along the pebble path after the morning rain. The sweet fragrance of pine needles and damp earth filled the crisp air.

Suddenly, a streak of bright azure caught her eye. It was a sun-bird, with feathers shimmering like polished sapphires. The bird hopped from twig to branch, pausing as if waiting for Maya to follow. Each step revealed new wonders: tiny luminous mushrooms nestled beside tree roots, crystalline spiderwebs strung between fern fronds, and dew drops glistening like tiny morning lanterns.`
  },
  {
    id: 'ocean-adventure',
    title: 'The Ocean Adventure & Coral Reefs',
    category: 'Science & Marine',
    language: 'EN',
    wordCount: 310,
    fileType: 'PDF',
    progressPercent: 65,
    lastRead: '2 days ago',
    readingTimeMins: 5,
    difficulty: 'Moderate',
    content: `The sun was shining brightly over the vast blue ocean as Captain Maya stood at the helm of her ship, the Starduster. Little silver fish darted through colorful coral reefs below, playing hide and seek among the gently swaying kelp forests.

Maya adjusted her brass compass and charted their course toward the mysterious Island of Whispers. For three days, gentle sea breezes had guided their vessel through tranquil waters. Pip, her bright green emerald parrot, perched proudly upon the mast, squawking encouragement.`
  },
  {
    id: 'malayalam-katha',
    title: 'കുട്ടികളുടെ കഥകൾ (The Clever Deer)',
    category: 'Malayalam Folktale',
    language: 'ML',
    wordCount: 220,
    fileType: 'TXT',
    progressPercent: 40,
    lastRead: '3 days ago',
    readingTimeMins: 3,
    difficulty: 'Easy',
    content: `ഒരു മനോഹരമായ കാട്ടിൽ ചിന്നു എന്നൊരു ചെറിയ മാൻകുട്ടി ജീവിച്ചിരുന്നു. അവൾക്ക് പച്ചപ്പുല്ല് തിന്നാനും അരുവിയിലെ തെളിഞ്ഞ വെള്ളം കുടിക്കാനും വളരെ ഇഷ്ടമായിരുന്നു. എല്ലാ ദിവസവും കാട്ടിലെ കൂട്ടുകാരോടൊപ്പം അവൾ കളിക്കുമായിരുന്നു.

ഒരു ദിവസം ഒരു വലിയ സിംഹം കാട്ടിലൂടെ നടന്നു വന്നു. ചിന്നു ഭയന്നില്ല. അവൾ തന്റെ ബുദ്ധി ഉപയോഗിച്ച് സിംഹത്തോട് പറഞ്ഞു: "അങ്ങേക്ക് വിശക്കുന്നുണ്ടെങ്കിൽ കാടിന്റെ അപ്പുറത്ത് വലിയൊരു മാൻ നിൽപ്പുണ്ട്." സിംഹം അങ്ങോട്ട് ഓടിപ്പോയി. ചിന്നു സുരക്ഷിതമായി തന്റെ അമ്മയുടെ അടുത്തേക്ക് മടങ്ങി.`
  },
  {
    id: 'space-explorers',
    title: 'Journey to the Solar Nebula',
    category: 'Astronomy',
    language: 'EN',
    wordCount: 420,
    fileType: 'DOCX',
    progressPercent: 15,
    lastRead: 'Last week',
    readingTimeMins: 7,
    difficulty: 'Moderate',
    content: `Stars are born inside giant clouds of dust and hydrogen gas called stellar nebulae. In these cosmic nurseries, gravity pulls clumps of matter together over millions of years. As the center becomes denser and hotter, nuclear fusion ignites, creating a brand new star that will shine for billions of years.`
  }
];

export const MyDocumentsView: React.FC<MyDocumentsViewProps> = ({ onOpenDocumentInStudio }) => {
  const { preferences, getTintStyle } = useReadingPreferences();
  const { t } = useLanguage();

  const [documents, setDocuments] = useState<StoredDocument[]>(INITIAL_DOCUMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<
    'All' | 'In Progress' | 'Completed' | 'English' | 'Malayalam'
  >('All');

  // Direct Audio Playback State
  const [activePlayingDocId, setActivePlayingDocId] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Quick Reader Modal State
  const [previewDoc, setPreviewDoc] = useState<StoredDocument | null>(null);
  const [previewWordIndex, setPreviewWordIndex] = useState(-1);

  // Upload Modal State
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Schoolwork');
  const [newLanguage, setNewLanguage] = useState<'EN' | 'ML'>('EN');
  const [newContent, setNewContent] = useState('');
  const [uploadTab, setUploadTab] = useState<'file' | 'paste'>('file');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  // Clean up speech on unmount
  useEffect(() => {
    return () => {
      TTSEngine.stop();
    };
  }, []);

  // Card-level TTS Audio Toggle
  const handleToggleAudio = (doc: StoredDocument, e?: React.MouseEvent) => {
    e?.stopPropagation();

    // If currently playing this document, stop playback
    if (activePlayingDocId === doc.id && isPlayingAudio) {
      TTSEngine.stop();
      setIsPlayingAudio(false);
      setActivePlayingDocId(null);
      setPreviewWordIndex(-1);
      return;
    }

    TTSEngine.stop();
    setActivePlayingDocId(doc.id);
    setIsPlayingAudio(true);
    setPreviewWordIndex(0);

    const targetLang = doc.language === 'ML' ? 'ml' : 'en';

    TTSEngine.speak({
      text: doc.content,
      language: targetLang,
      voiceGender: preferences.voiceGender || 'female',
      voicePersona: preferences.voicePersona || 'tutor',
      voiceName: preferences.ttsVoice,
      rate: preferences.ttsRate || 1.0,
      pitch: preferences.ttsPitch || 1.0,
      onWordBoundary: (idx) => {
        setPreviewWordIndex(idx);
      },
      onEnd: () => {
        setIsPlayingAudio(false);
        setActivePlayingDocId(null);
        setPreviewWordIndex(-1);
      },
      onError: () => {
        setIsPlayingAudio(false);
        setActivePlayingDocId(null);
        setPreviewWordIndex(-1);
      }
    });
  };

  const handleOpenPreview = (doc: StoredDocument, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setPreviewDoc(doc);
    setPreviewWordIndex(-1);
  };

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const words = newContent.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length || 150;
    const readingTimeMins = Math.max(1, Math.ceil(wordCount / 120));

    const newDoc: StoredDocument = {
      id: `doc-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      language: newLanguage,
      wordCount,
      fileType: (selectedFileName?.endsWith('.pdf')
        ? 'PDF'
        : selectedFileName?.endsWith('.docx')
          ? 'DOCX'
          : 'TXT') as 'PDF' | 'DOCX' | 'TXT',
      progressPercent: 0,
      lastRead: 'Just now',
      readingTimeMins,
      difficulty: wordCount > 300 ? 'Moderate' : 'Easy',
      content:
        newContent.trim() ||
        `${newTitle}\n\nThis document has been processed with ReadEase dyslexia accommodations. Visual fixation points, line rulers, and synchronized text-to-speech audio are ready for your session.`
    };

    setDocuments([newDoc, ...documents]);
    setIsUploadModalOpen(false);
    setNewTitle('');
    setNewContent('');
    setSelectedFileName(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activePlayingDocId === id) {
      TTSEngine.stop();
      setIsPlayingAudio(false);
      setActivePlayingDocId(null);
    }
    setDocuments(documents.filter((d) => d.id !== id));
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedFilter === 'In Progress')
      return doc.progressPercent > 0 && doc.progressPercent < 100;
    if (selectedFilter === 'Completed') return doc.progressPercent === 100;
    if (selectedFilter === 'English') return doc.language === 'EN';
    if (selectedFilter === 'Malayalam') return doc.language === 'ML';
    return true;
  });

  const tintStyle = getTintStyle();

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header & Storage Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-container rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-primary-200">
            <FolderKanban size={14} /> {t('documents.tag', 'Personal Learning Library')}
          </div>
          <h1 className="text-display-lg-mobile md:text-headline-md font-bold text-text-primary">
            {t('documents.title', 'My Documents & Readings')}
          </h1>
          <p className="text-body-md text-text-secondary">
            {t(
              'documents.subtitle',
              'Manage your uploaded textbooks, storybooks, and custom reading passages.'
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="md"
            iconLeft={<FileText size={18} />}
            onClick={() => {
              setUploadTab('paste');
              setIsUploadModalOpen(true);
            }}
          >
            {t('documents.pasteText', 'Paste Text')}
          </Button>

          <Button
            variant="primary"
            size="md"
            iconLeft={<UploadCloud size={18} />}
            onClick={() => {
              setUploadTab('file');
              setIsUploadModalOpen(true);
            }}
          >
            {t('documents.upload', 'Upload Document')}
          </Button>
        </div>
      </div>

      {/* Library Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card variant="subtle" padding="sm">
          <p className="text-xs text-text-muted font-semibold">
            {t('documents.totalDocs', 'Total Documents')}
          </p>
          <p className="text-headline-md font-bold text-text-primary">{documents.length}</p>
        </Card>
        <Card variant="subtle" padding="sm">
          <p className="text-xs text-text-muted font-semibold">
            {t('documents.completedStories', 'Completed Stories')}
          </p>
          <p className="text-headline-md font-bold text-tertiary">
            {documents.filter((d) => d.progressPercent === 100).length}
          </p>
        </Card>
        <Card variant="subtle" padding="sm">
          <p className="text-xs text-text-muted font-semibold">
            {t('documents.totalWordsRead', 'Total Words Read')}
          </p>
          <p className="text-headline-md font-bold text-primary">
            {documents.reduce(
              (acc, d) => acc + Math.round(d.wordCount * (d.progressPercent / 100)),
              0
            )}
          </p>
        </Card>
        <Card variant="subtle" padding="sm">
          <p className="text-xs text-text-muted font-semibold">
            {t('documents.bilingualBalance', 'Bilingual Balance')}
          </p>
          <p className="text-headline-md font-bold text-secondary">
            {documents.filter((d) => d.language === 'ML').length} ML /{' '}
            {documents.filter((d) => d.language === 'EN').length} EN
          </p>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-surface-lowest border border-surface-border rounded-2xl shadow-soft">
        <div className="relative flex-1 max-w-md">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
          />
          <input
            type="text"
            placeholder={t('documents.searchPlaceholder', 'Search documents by title or topic...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-low border border-surface-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary text-text-primary placeholder:text-text-muted"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'All', label: t('documents.filterAll', 'All') },
            { id: 'In Progress', label: t('documents.filterInProgress', 'In Progress') },
            { id: 'Completed', label: t('documents.filterCompleted', 'Completed') },
            { id: 'English', label: t('documents.filterEnglish', 'English') },
            { id: 'Malayalam', label: t('documents.filterMalayalam', 'Malayalam') }
          ].map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setSelectedFilter(filter.id as typeof selectedFilter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedFilter === filter.id
                  ? 'bg-primary text-white shadow-soft'
                  : 'bg-surface-low text-text-secondary hover:bg-surface border border-surface-border'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDocs.map((doc) => {
          const isThisPlaying = activePlayingDocId === doc.id && isPlayingAudio;

          return (
            <Card
              key={doc.id}
              variant="interactive"
              padding="lg"
              className={`flex flex-col justify-between group h-full border transition-all relative ${
                isThisPlaying
                  ? 'border-primary ring-2 ring-primary/40 bg-primary-50/20 dark:bg-primary-950/20 shadow-elevated'
                  : 'border-surface-border hover:border-primary-200'
              }`}
              onClick={() => onOpenDocumentInStudio(doc)}
            >
              <div className="space-y-4">
                {/* Badges */}
                <div className="flex items-center justify-between">
                  <Badge
                    variant={
                      doc.fileType === 'PDF'
                        ? 'primary'
                        : doc.fileType === 'DOCX'
                          ? 'secondary'
                          : 'neutral'
                    }
                  >
                    {doc.fileType}
                  </Badge>
                  <Badge variant={doc.language === 'ML' ? 'secondary' : 'neutral'} dot>
                    {doc.language === 'ML' ? 'മലയാളം' : 'English'}
                  </Badge>
                </div>

                {/* Title & Category */}
                <div>
                  <span className="text-xs uppercase font-bold text-secondary tracking-wider">
                    {doc.category}
                  </span>
                  <h3 className="font-bold text-headline-sm text-text-primary group-hover:text-primary transition-colors line-clamp-2 mt-1">
                    {doc.title}
                  </h3>
                </div>

                {/* Document Metadata */}
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <FileText size={14} /> {doc.wordCount} {t('documents.words', 'words')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} /> ~{doc.readingTimeMins} {t('documents.mins', 'mins')}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-text-muted">
                      {t('documents.progress', 'Reading Progress')}
                    </span>
                    <span
                      className={doc.progressPercent === 100 ? 'text-tertiary' : 'text-primary'}
                    >
                      {doc.progressPercent}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-surface-high rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        doc.progressPercent === 100 ? 'bg-tertiary' : 'bg-primary'
                      }`}
                      style={{ width: `${doc.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Audio Playing Pulse Bar */}
                {isThisPlaying && (
                  <div className="flex items-center gap-2 p-2 bg-primary-100/70 dark:bg-primary-900/40 rounded-xl text-primary font-bold text-xs animate-pulse">
                    <Volume2 size={16} className="animate-bounce" />
                    <span>
                      {doc.language === 'ML'
                        ? 'മലയാളത്തിൽ വായിക്കുന്നു...'
                        : 'Reading aloud in English...'}
                    </span>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="mt-6 pt-4 border-t border-surface-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Direct Listen / TTS Button */}
                  <button
                    type="button"
                    onClick={(e) => handleToggleAudio(doc, e)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                      isThisPlaying
                        ? 'bg-primary text-white shadow-soft animate-pulse'
                        : 'bg-primary-50 dark:bg-primary-950/40 hover:bg-primary-100 text-primary border border-primary-200'
                    }`}
                    title={
                      isThisPlaying
                        ? t('documents.stopSpeech', 'Stop')
                        : t('documents.listen', 'Listen (TTS)')
                    }
                  >
                    {isThisPlaying ? <Square size={13} /> : <Volume2 size={14} />}
                    <span>
                      {isThisPlaying
                        ? t('documents.stopSpeech', 'Stop')
                        : doc.language === 'ML'
                          ? 'കേൾക്കുക'
                          : 'Listen'}
                    </span>
                  </button>

                  {/* Quick Preview Button */}
                  <button
                    type="button"
                    onClick={(e) => handleOpenPreview(doc, e)}
                    className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-low transition-colors"
                    title={t('documents.quickPreview', 'Quick Preview')}
                  >
                    <Eye size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="text-primary font-bold text-xs flex items-center gap-1 group-hover:gap-2 transition-all"
                  >
                    <span>{t('documents.readInStudio', 'Read in Studio')}</span>
                    <ArrowRight size={14} />
                  </button>

                  <button
                    type="button"
                    title={t('common.delete', 'Delete')}
                    onClick={(e) => handleDelete(doc.id, e)}
                    className="p-1.5 text-text-muted hover:text-feedback-error rounded-lg hover:bg-surface-low transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredDocs.length === 0 && (
        <div className="text-center py-16 bg-surface-lowest rounded-2xl border border-dashed border-surface-border p-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-surface-low text-text-muted mx-auto flex items-center justify-center">
            <FileText size={32} />
          </div>
          <h3 className="font-bold text-text-primary text-headline-sm">
            {t('documents.noDocs', 'No documents found')}
          </h3>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            {t(
              'documents.noDocsDesc',
              'Try adjusting your search query or upload a new passage to start reading.'
            )}
          </p>
          <Button
            variant="primary"
            size="md"
            iconLeft={<Plus size={16} />}
            onClick={() => setIsUploadModalOpen(true)}
          >
            {t('documents.addReading', 'Add New Reading')}
          </Button>
        </div>
      )}

      {/* Quick Audio Preview & Reader Modal */}
      {previewDoc && (
        <Modal
          isOpen={!!previewDoc}
          onClose={() => {
            if (activePlayingDocId === previewDoc.id) {
              TTSEngine.stop();
              setIsPlayingAudio(false);
              setActivePlayingDocId(null);
            }
            setPreviewDoc(null);
            setPreviewWordIndex(-1);
          }}
          title={previewDoc.title}
          description={`${previewDoc.category} • ${previewDoc.wordCount} words • ${
            previewDoc.language === 'ML' ? 'മലയാളം' : 'English'
          }`}
        >
          <div className="space-y-6">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface-low rounded-2xl border border-surface-border">
              <div className="flex items-center gap-2">
                <Button
                  variant={
                    activePlayingDocId === previewDoc.id && isPlayingAudio ? 'secondary' : 'primary'
                  }
                  size="sm"
                  iconLeft={
                    activePlayingDocId === previewDoc.id && isPlayingAudio ? (
                      <Square size={15} />
                    ) : (
                      <Volume2 size={16} />
                    )
                  }
                  onClick={(e) => handleToggleAudio(previewDoc, e)}
                >
                  {activePlayingDocId === previewDoc.id && isPlayingAudio
                    ? t('documents.stopSpeech', 'Stop Speech')
                    : previewDoc.language === 'ML'
                      ? 'മലയാളത്തിൽ കേൾക്കുക'
                      : 'Read Aloud (TTS)'}
                </Button>

                <Badge variant={previewDoc.language === 'ML' ? 'secondary' : 'primary'} dot>
                  {previewDoc.language === 'ML' ? 'മലയാളം' : 'English'}
                </Badge>
              </div>

              <Button
                variant="outline"
                size="sm"
                iconRight={<ExternalLink size={15} />}
                onClick={() => {
                  const doc = previewDoc;
                  setPreviewDoc(null);
                  onOpenDocumentInStudio(doc);
                }}
              >
                {t('documents.readInStudio', 'Open in Studio')}
              </Button>
            </div>

            {/* Passage Reader Container */}
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
              className="p-6 md:p-8 rounded-2xl border border-surface-border max-h-[380px] overflow-y-auto space-y-4 shadow-soft"
            >
              {renderAccessibleText(previewDoc.content, {
                bionicEnabled: preferences.bionicReadingEnabled,
                fixationPercent: preferences.bionicFixationPoint,
                syllablesEnabled: preferences.syllableBreakdown,
                activeWordIndex: activePlayingDocId === previewDoc.id ? previewWordIndex : -1
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* Upload Document / Paste Text Modal */}
      <Modal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title={
          uploadTab === 'file'
            ? t('documents.upload', 'Upload Document to Library')
            : t('documents.pasteText', 'Create Custom Reading Passage')
        }
        description="Text will be formatted with your dyslexia accommodations, fixation markers, and audio speech."
      >
        <form onSubmit={handleCreateDocument} className="space-y-6">
          {/* Tab Switcher */}
          <div className="flex bg-surface-low p-1 rounded-xl border border-surface-border">
            <button
              type="button"
              onClick={() => setUploadTab('file')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                uploadTab === 'file'
                  ? 'bg-surface-lowest text-primary shadow-soft'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Upload File (PDF / DOCX)
            </button>
            <button
              type="button"
              onClick={() => setUploadTab('paste')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                uploadTab === 'paste'
                  ? 'bg-surface-lowest text-primary shadow-soft'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              Paste Raw Text
            </button>
          </div>

          <Input
            label="Document Title"
            required
            placeholder="e.g. Chapter 4: Solar Systems & Gravity"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase">Category</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-4 py-2.5 bg-surface-low border border-surface-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary text-text-primary"
              >
                <option value="Schoolwork">Schoolwork / Homework</option>
                <option value="Science & Nature">Science & Nature</option>
                <option value="Stories & Fiction">Stories & Fiction</option>
                <option value="Malayalam Literature">Malayalam Literature</option>
                <option value="History">History & Culture</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-muted uppercase">
                {t('common.language', 'Language')}
              </label>
              <select
                value={newLanguage}
                onChange={(e) => setNewLanguage(e.target.value as 'EN' | 'ML')}
                className="w-full px-4 py-2.5 bg-surface-low border border-surface-border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary text-text-primary"
              >
                <option value="EN">English (US/UK)</option>
                <option value="ML">മലയാളം (Malayalam)</option>
              </select>
            </div>
          </div>

          {uploadTab === 'file' ? (
            <div className="border-2 border-dashed border-primary-200 hover:border-primary bg-primary-50/40 rounded-2xl p-8 text-center space-y-3 cursor-pointer transition-colors relative">
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelectedFileName(file.name);
                    if (!newTitle) {
                      setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
                    }
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="w-12 h-12 rounded-full bg-primary-100 text-primary mx-auto flex items-center justify-center">
                <UploadCloud size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-text-primary">
                  {selectedFileName ? selectedFileName : 'Click to select or drag and drop files'}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  PDF, Word (DOCX), or plain TXT up to 25MB
                </p>
              </div>
            </div>
          ) : (
            <Textarea
              label="Passage Content"
              required
              rows={6}
              placeholder="Paste reading content here. ReadEase will generate Bionic fixation anchors and synchronized syllable timing automatically."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-border">
            <Button variant="ghost" type="button" onClick={() => setIsUploadModalOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button variant="primary" type="submit" iconLeft={<Sparkles size={16} />}>
              Process & Add to Library
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
