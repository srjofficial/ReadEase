import React, { createContext, useContext, useState, useEffect } from 'react';

import enTranslations from '../locales/en.json';
import mlTranslations from '../locales/ml.json';

export type Language = 'EN' | 'ML';

export interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const TRANSLATIONS: Record<Language, Record<string, string>> = {
  EN: enTranslations,
  ML: mlTranslations
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
