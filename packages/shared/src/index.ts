/**
 * ReadEase Shared Domain Models and API Contracts
 */

export type UserRole = 'reader' | 'educator' | 'admin';

export type FontPreference =
  | 'OpenDyslexic'
  | 'Atkinson Hyperlegible'
  | 'Lexend'
  | 'Inter'
  | 'Comic Sans MS'
  | 'System Default';

export type ColorTheme =
  | 'cream' // High comfort / low glare
  | 'soft-yellow'
  | 'soft-blue'
  | 'soft-green'
  | 'dark'
  | 'light'
  | 'high-contrast-black'
  | 'high-contrast-white';

export interface ReadingPreferences {
  fontSize: number; // in px
  lineHeight: number; // multiplier e.g. 1.5, 2.0
  letterSpacing: number; // in px
  wordSpacing: number; // in px
  fontFamily: FontPreference;
  theme: ColorTheme;
  bionicReadingEnabled: boolean;
  bionicFixationPoint: number; // percentage 1-100 (e.g. 50%)
  readingRulerEnabled: boolean;
  readingRulerHeight: number; // in px
  ttsRate: number; // 0.5 to 2.0
  ttsPitch: number;
  ttsVoice: string;
  syllableBreakdown: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  preferences: ReadingPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  userId: string;
  title: string;
  content: string;
  fileType: 'text' | 'pdf' | 'docx' | 'image';
  wordCount: number;
  readingTimeMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  version: string;
  timestamp: string;
}
