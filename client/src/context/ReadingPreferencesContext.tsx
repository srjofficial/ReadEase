import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReadingPreferences } from '@readease/shared';

export type BackgroundTint =
  'cream' | 'soft-blue' | 'soft-green' | 'soft-grey' | 'soft-pink' | 'dark';

export interface ExtendedReadingPreferences extends ReadingPreferences {
  backgroundTint: BackgroundTint;
  readingRulerColor: string;
  rulerYPosition: number;
}

const DEFAULT_PREFERENCES: ExtendedReadingPreferences = {
  fontFamily: 'Lexend',
  fontSize: 18,
  lineHeight: 1.8,
  letterSpacing: 0.03,
  wordSpacing: 0.05,
  theme: 'cream',
  backgroundTint: 'cream',
  bionicReadingEnabled: true,
  bionicFixationPoint: 50,
  readingRulerEnabled: false,
  readingRulerHeight: 48,
  readingRulerColor: 'rgba(232, 163, 61, 0.22)',
  rulerYPosition: 200,
  ttsRate: 1.0,
  ttsPitch: 1.0,
  ttsVoice: 'default',
  voiceGender: 'female',
  voicePersona: 'tutor',
  ttsLanguage: 'auto',
  syllableBreakdown: false
};

const STORAGE_KEY = 'readease_reading_preferences';

export interface ReadingPreferencesContextValue {
  preferences: ExtendedReadingPreferences;
  updatePreferences: (updates: Partial<ExtendedReadingPreferences>) => void;
  resetPreferences: () => void;
  getTintStyle: () => { backgroundColor: string; color: string; border?: string };
  applyRecommendedAccommodations: (recommendations?: Partial<ExtendedReadingPreferences>) => void;
}

const ReadingPreferencesContext = createContext<ReadingPreferencesContextValue | undefined>(
  undefined
);

export const ReadingPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [preferences, setPreferences] = useState<ExtendedReadingPreferences>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load preferences from localStorage', e);
    }
    return DEFAULT_PREFERENCES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      console.warn('Failed to save preferences to localStorage', e);
    }
  }, [preferences]);

  const updatePreferences = (updates: Partial<ExtendedReadingPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  };

  const resetPreferences = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  const applyRecommendedAccommodations = (
    recommendations?: Partial<ExtendedReadingPreferences>
  ) => {
    const recommended: Partial<ExtendedReadingPreferences> = {
      fontFamily: 'Lexend',
      fontSize: 18,
      lineHeight: 1.8,
      backgroundTint: 'cream',
      bionicReadingEnabled: true,
      bionicFixationPoint: 50,
      readingRulerEnabled: true,
      readingRulerHeight: 52,
      ...recommendations
    };
    setPreferences((prev) => ({ ...prev, ...recommended }));
  };

  const getTintStyle = () => {
    switch (preferences.backgroundTint) {
      case 'cream':
        return { backgroundColor: '#FDF8F0', color: '#1B1B1E' };
      case 'soft-blue':
        return { backgroundColor: '#E6F3FF', color: '#102A43' };
      case 'soft-green':
        return { backgroundColor: '#E8F5E9', color: '#1B382B' };
      case 'soft-grey':
        return { backgroundColor: '#F5F5F5', color: '#2B2B2E' };
      case 'soft-pink':
        return { backgroundColor: '#FFF0F5', color: '#3A1E2B' };
      case 'dark':
        return { backgroundColor: '#131315', color: '#F2F0F4' };
      default:
        return { backgroundColor: '#FDF8F0', color: '#1B1B1E' };
    }
  };

  return (
    <ReadingPreferencesContext.Provider
      value={{
        preferences,
        updatePreferences,
        resetPreferences,
        getTintStyle,
        applyRecommendedAccommodations
      }}
    >
      {children}
    </ReadingPreferencesContext.Provider>
  );
};

export const useReadingPreferences = (): ReadingPreferencesContextValue => {
  const context = useContext(ReadingPreferencesContext);
  if (!context) {
    throw new Error('useReadingPreferences must be used within a ReadingPreferencesProvider');
  }
  return context;
};
