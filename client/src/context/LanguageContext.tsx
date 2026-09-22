import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'EN' | 'ML';

export interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  EN: {
    // Brand & App
    'app.name': 'ReadEase',
    'app.tagline': 'Assistive Platform',
    'app.heroSubtitle': 'Reading Without Barriers. Confidence Without Friction.',

    // Navigation & Global
    'nav.about': 'About',
    'nav.features': 'Features',
    'nav.tools': 'Reading Tools',
    'nav.testimonials': 'Testimonials',
    'nav.faq': 'FAQ',
    'nav.login': 'Login',
    'nav.signUp': 'Sign Up',
    'nav.logout': 'Log Out',
    'nav.home': 'Home',
    'nav.studentPortal': 'Student Portal',
    'nav.startPractice': 'Start Daily Practice',
    'nav.dashboard': 'Dashboard',
    'nav.readingStudio': 'Reading Studio',
    'nav.myDocuments': 'My Documents',
    'nav.achievements': 'Achievements & Badges',
    'nav.assessment': 'Reading Assessment',
    'nav.customizer': 'Reading Customizer',
    'nav.accommodations': 'Reading Accommodations',
    'nav.searchPlaceholder': 'Search documents, reading tools, or vocabulary...',
    'nav.aiAssist': 'AI Assist Active',

    // Dashboard
    'dashboard.welcome': 'Welcome back',
    'dashboard.subtitle':
      'Your assistive reading workspace is primed with your cognitive accommodations.',
    'dashboard.readingStreak': 'Reading Streak',
    'dashboard.wordsRead': 'Words Read',
    'dashboard.avgSpeed': 'Average Speed',
    'dashboard.comprehension': 'Comprehension',
    'dashboard.activeAccommodations': 'Active Accommodations',
    'dashboard.startReading': 'Open Reading Studio',
    'dashboard.takeAssessment': 'Take Reading Screening',
    'dashboard.myDocuments': 'View My Documents',
    'dashboard.readingCustomizer': 'Adjust Voice & Text',

    // My Documents
    'documents.tag': 'Personal Learning Library',
    'documents.title': 'My Documents & Readings',
    'documents.subtitle':
      'Manage your uploaded textbooks, storybooks, and custom reading passages.',
    'documents.pasteText': 'Paste Text',
    'documents.upload': 'Upload Document',
    'documents.totalDocs': 'Total Documents',
    'documents.completedStories': 'Completed Stories',
    'documents.totalWordsRead': 'Total Words Read',
    'documents.bilingualBalance': 'Bilingual Balance',
    'documents.searchPlaceholder': 'Search documents by title or topic...',
    'documents.filterAll': 'All',
    'documents.filterInProgress': 'In Progress',
    'documents.filterCompleted': 'Completed',
    'documents.filterEnglish': 'English',
    'documents.filterMalayalam': 'Malayalam',
    'documents.progress': 'Reading Progress',
    'documents.readInStudio': 'Read in Studio',
    'documents.listen': 'Listen (TTS)',
    'documents.listening': 'Speaking...',
    'documents.stopSpeech': 'Stop',
    'documents.quickPreview': 'Quick Preview',
    'documents.noDocs': 'No documents found',
    'documents.noDocsDesc':
      'Try adjusting your search query or upload a new passage to start reading.',
    'documents.addReading': 'Add New Reading',
    'documents.words': 'words',
    'documents.mins': 'mins',
    'documents.previewTitle': 'Document Audio Preview & Reader',

    // Reading Studio
    'studio.title': 'Reading Studio',
    'studio.highlighting': 'Text-to-Speech Highlighting',
    'studio.highlightingDesc': 'Karaoke synchronized audio tracking',
    'studio.play': 'Play Speech',
    'studio.pause': 'Pause Speech',
    'studio.speed': 'Speed',
    'studio.wordsRead': 'Words Read',
    'studio.sessionTime': 'Session Time',
    'studio.focusRuler': 'Focus Ruler',

    // Reading Customizer
    'customizer.title': 'Reading Customizer',
    'customizer.subtitle':
      'Tailor typography, contrast, and cognitive aids for maximum reading comfort.',
    'customizer.speechTitle': 'Speech & Read-Aloud',
    'customizer.speechSubtitle': 'Voice customization, multilingual TTS & pacing',
    'customizer.voiceGender': 'Voice Gender',
    'customizer.femaleVoice': 'Female Voice',
    'customizer.femaleVoiceDesc': 'Warm & High Clarity',
    'customizer.maleVoice': 'Male Voice',
    'customizer.maleVoiceDesc': 'Deep & Grounded',
    'customizer.voicePersona': 'Voice Kind / Persona',
    'customizer.speechLang': 'Speech Language',
    'customizer.systemVoice': 'Device System Voice',
    'customizer.speedRate': 'Voice Speed Rate',
    'customizer.voicePitch': 'Voice Pitch',
    'customizer.audition': 'Audition Voice',
    'customizer.testEnglish': 'Test English',
    'customizer.testMalayalam': 'മലയാളം കേൾക്കുക',
    'customizer.save': 'Save Changes',
    'customizer.reset': 'Reset Defaults',

    // Reading Assessment
    'assessment.title': 'Reading Assessment',
    'assessment.subtitle': 'Scientific dyslexia screening powered by the DD-main research dataset.',
    'assessment.start': 'Start Assessment',
    'assessment.finish': 'Finish Assessment',
    'assessment.riskLevel': 'Dyslexia Risk Level',

    // General
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.close': 'Close',
    'common.delete': 'Delete',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.apply': 'Apply',
    'common.language': 'Language'
  },
  ML: {
    // Brand & App
    'app.name': 'റീഡ്ഈസ്',
    'app.tagline': 'സഹായക പ്ലാറ്റ്‌ഫോം',
    'app.heroSubtitle': 'തടസ്സങ്ങളില്ലാത്ത വായന. ആത്മവിശ്വാസത്തോടെയുള്ള മുന്നേറ്റം.',

    // Navigation & Global
    'nav.about': 'വിവരങ്ങൾ',
    'nav.features': 'സവിശേഷതകൾ',
    'nav.tools': 'വായനാ ഉപകരണങ്ങൾ',
    'nav.testimonials': 'അനുഭവങ്ങൾ',
    'nav.faq': 'ചോദ്യോത്തരങ്ങൾ',
    'nav.login': 'ലോഗിൻ',
    'nav.signUp': 'സൈൻ അപ്പ്',
    'nav.logout': 'ലോഗ് ഔട്ട്',
    'nav.home': 'ഹോം',
    'nav.studentPortal': 'വിദ്യാർത്ഥി പോർട്ടൽ',
    'nav.startPractice': 'വായന ആരംഭിക്കുക',
    'nav.dashboard': 'ഡാഷ്‌ബോർഡ്',
    'nav.readingStudio': 'റീഡിംഗ് സ്റ്റുഡിയോ',
    'nav.myDocuments': 'എന്റെ രേഖകൾ',
    'nav.achievements': 'നേട്ടങ്ങളും ബാഡ്ജുകളും',
    'nav.assessment': 'വായന വിലയിരുത്തൽ',
    'nav.customizer': 'വായന ക്രമീകരണം',
    'nav.accommodations': 'വായന സഹായങ്ങൾ',
    'nav.searchPlaceholder': 'രേഖകൾ, വായനാ ഉപകരണങ്ങൾ തിരയുക...',
    'nav.aiAssist': 'എഐ സഹായം സജീവം',

    // Dashboard
    'dashboard.welcome': 'സ്വാഗതം',
    'dashboard.subtitle': 'നിങ്ങളുടെ സൗകര്യാനുസരണം ക്രമീകരിച്ച വായനാ ഇടം തയ്യാറാണ്.',
    'dashboard.readingStreak': 'വായന തുടർച്ച',
    'dashboard.wordsRead': 'വായിച്ച വാക്കുകൾ',
    'dashboard.avgSpeed': 'ശരാശരി വേഗത',
    'dashboard.comprehension': 'ധാരണാശേഷി',
    'dashboard.activeAccommodations': 'സജീവ സഹായങ്ങൾ',
    'dashboard.startReading': 'റീഡിംഗ് സ്റ്റുഡിയോ തുറക്കുക',
    'dashboard.takeAssessment': 'വായനാ പരിശോധന നടത്തുക',
    'dashboard.myDocuments': 'എന്റെ രേഖകൾ കാണുക',
    'dashboard.readingCustomizer': 'ശബ്ദവും അക്ഷരങ്ങളും മാറ്റുക',

    // My Documents
    'documents.tag': 'വ്യക്തിഗത പഠന ലൈബ്രറി',
    'documents.title': 'എന്റെ രേഖകളും വായനകളും',
    'documents.subtitle': 'പാഠപുസ്തകങ്ങളും കഥകളും വായനാ ഭാഗങ്ങളും എളുപ്പത്തിൽ കൈകാര്യം ചെയ്യുക.',
    'documents.pasteText': 'ടെക്സ്റ്റ് ചേർക്കുക',
    'documents.upload': 'രേഖ അപ്‌ലോഡ് ചെയ്യുക',
    'documents.totalDocs': 'ആകെ രേഖകൾ',
    'documents.completedStories': 'പൂർത്തിയായ കഥകൾ',
    'documents.totalWordsRead': 'വായിച്ച വാക്കുകൾ',
    'documents.bilingualBalance': 'ഭാഷാ അനുപാതം',
    'documents.searchPlaceholder': 'പേര് അല്ലെങ്കിൽ വിഷയം തിരയുക...',
    'documents.filterAll': 'എല്ലാം',
    'documents.filterInProgress': 'പുരോഗമിക്കുന്നത്',
    'documents.filterCompleted': 'പൂർത്തിയായത്',
    'documents.filterEnglish': 'ഇംഗ്ലീഷ്',
    'documents.filterMalayalam': 'മലയാളം',
    'documents.progress': 'വായന പുരോഗതി',
    'documents.readInStudio': 'സ്റ്റുഡിയോയിൽ വായിക്കുക',
    'documents.listen': 'കേൾക്കുക (TTS)',
    'documents.listening': 'ശബ്ദം കേൾക്കുന്നു...',
    'documents.stopSpeech': 'നിർത്തുക',
    'documents.quickPreview': 'പ്രിവ്യൂ & വായന',
    'documents.noDocs': 'രേഖകൾ കണ്ടെത്തിയില്ല',
    'documents.noDocsDesc': 'തിരയൽ വാക്ക് മാറ്റുക അല്ലെങ്കിൽ പുതിയൊരു വായനാ ഭാഗം ചേർക്കുക.',
    'documents.addReading': 'പുതിയ വായന ചേർക്കുക',
    'documents.words': 'വാക്കുകൾ',
    'documents.mins': 'മിനിറ്റ്',
    'documents.previewTitle': 'രേഖ പ്രിവ്യൂ & ഓഡിയോ വായന',

    // Reading Studio
    'studio.title': 'റീഡിംഗ് സ്റ്റുഡിയോ',
    'studio.highlighting': 'വായനാ ശബ്ദ ട്രാക്കിംഗ് (TTS)',
    'studio.highlightingDesc': 'വാക്കുകൾക്കൊപ്പം ഓഡിയോ ട്രാക്കിംഗ്',
    'studio.play': 'വായിച്ചു കേൾപ്പിക്കുക',
    'studio.pause': 'നിർത്തുക',
    'studio.speed': 'വേഗത',
    'studio.wordsRead': 'വായിച്ച വാക്കുകൾ',
    'studio.sessionTime': 'സമയം',
    'studio.focusRuler': 'റൂളർ',

    // Reading Customizer
    'customizer.title': 'വായന ക്രമീകരണം',
    'customizer.subtitle': 'വായന സുഗമമാക്കാൻ അക്ഷരങ്ങളും ശബ്ദവും പശ്ചാത്തലവും മാറ്റുക.',
    'customizer.speechTitle': 'ശബ്ദവും വായനയും (TTS)',
    'customizer.speechSubtitle': 'വോയ്‌സ് തിരഞ്ഞെടുക്കൽ, മലയാളം TTS & വേഗത',
    'customizer.voiceGender': 'ശബ്ദ ലിംഗം (Voice Gender)',
    'customizer.femaleVoice': 'സ്ത്രീ ശബ്ദം (Female)',
    'customizer.femaleVoiceDesc': 'വ്യക്തവും സ്വാഭാവികവുമായ ശബ്ദം',
    'customizer.maleVoice': 'പുരുഷ ശബ്ദം (Male)',
    'customizer.maleVoiceDesc': 'ഗംഭീരവും ശാന്തവുമായ ശബ്ദം',
    'customizer.voicePersona': 'വോയ്‌സ് സ്വഭാവം (Persona)',
    'customizer.speechLang': 'സംസാര ഭാഷ',
    'customizer.systemVoice': 'സിസ്റ്റം വോയ്‌സ്',
    'customizer.speedRate': 'ശബ്ദ വേഗത',
    'customizer.voicePitch': 'ശബ്ദ സ്ഥായി (Pitch)',
    'customizer.audition': 'ശബ്ദം പരീക്ഷിക്കുക',
    'customizer.testEnglish': 'ഇംഗ്ലീഷ് പരീക്ഷിക്കുക',
    'customizer.testMalayalam': 'മലയാളം കേൾക്കുക',
    'customizer.save': 'മാറ്റങ്ങൾ സംരക്ഷിക്കുക',
    'customizer.reset': 'പഴയപടിയാക്കുക',

    // Reading Assessment
    'assessment.title': 'വായന വിലയിരുത്തൽ',
    'assessment.subtitle': 'ഡിസ്‌ലെക്‌സിയ സാധ്യത പരിശോധിക്കുന്ന ശാസ്ത്രീയ വിലയിരുത്തൽ.',
    'assessment.start': 'പരിശോധന ആരംഭിക്കുക',
    'assessment.finish': 'പരിശോധന പൂർത്തിയാക്കുക',
    'assessment.riskLevel': 'ഡിസ്‌ലെക്‌സിയ സാധ്യത',

    // General
    'common.save': 'സംരക്ഷിക്കുക',
    'common.cancel': 'റദ്ദാക്കുക',
    'common.close': 'അടയ്ക്കുക',
    'common.delete': 'നീക്കം ചെയ്യുക',
    'common.back': 'തിരികെ',
    'common.next': 'അടുത്തത്',
    'common.apply': 'പ്രയോഗിക്കുക',
    'common.language': 'ഭാഷ'
  }
};

const LANGUAGE_STORAGE_KEY = 'readease_language';

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (saved === 'ML' || saved === 'EN') {
        return saved;
      }
    }
    return 'EN';
  });

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      document.documentElement.setAttribute('lang', language === 'ML' ? 'ml' : 'en');
    } catch (e) {
      console.warn('Failed to save language preference to localStorage', e);
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const toggleLanguage = () => {
    setLanguageState((prev) => (prev === 'EN' ? 'ML' : 'EN'));
  };

  const t = (key: string, fallback?: string): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.EN;
    if (dict[key]) {
      return dict[key];
    }
    // Fallback to English if missing in Malayalam
    if (TRANSLATIONS.EN[key]) {
      return TRANSLATIONS.EN[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
