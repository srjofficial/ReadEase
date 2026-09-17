/**
 * ReadEase Design Tokens
 * Extracted from Stitch Design System: "ReadEase Reading Assistant" (projects/2839887259727416319)
 *
 * Designed specifically for cognitive accessibility, low-friction luxury, and dyslexia-friendly reading.
 */

export const designTokens = {
  colors: {
    // Canvas & Surfaces
    background: {
      cream: '#FAF6EF', // Soft warm cream base (low glare)
      canvas: '#FBF8FC', // Default light canvas
      dark: '#131315', // Deep accessible dark mode canvas
      paper: '#FFFFFF' // Elevated white surface
    },
    surface: {
      lowest: '#FFFFFF',
      low: '#F5F3F6',
      DEFAULT: '#F0EDF1',
      high: '#EAE7EB',
      highest: '#E4E2E5',
      fillable: '#F5F0E8', // Light tint for input boxes
      border: '#E5E0D8' // Soft contrast boundary
    },
    // Primary Indigo (Navigation, Authority, Primary Actions)
    primary: {
      50: '#EEF2FF',
      100: '#E0E7FF',
      200: '#C7D2FE',
      300: '#A5B4FC',
      400: '#818CF8',
      500: '#4557B3',
      DEFAULT: '#203390',
      container: '#3A4CA8',
      onContainer: '#BDC6FF',
      hover: '#18276D',
      dark: '#00115A'
    },
    // Warm Amber (Encouragement, Highlights, Reading Progress)
    secondary: {
      50: '#FFFBEB',
      100: '#FEF3C7',
      200: '#FDE68A',
      300: '#FCD34D',
      400: '#FEB64E',
      DEFAULT: '#E8A33D',
      container: '#FEB64E',
      onContainer: '#714800',
      dark: '#835400'
    },
    // Sage Green (Success States, Completed Tasks)
    tertiary: {
      50: '#F0FDF4',
      100: '#DCFCE7',
      200: '#BBF7D0',
      300: '#86D8A2',
      DEFAULT: '#4E9F6E',
      container: '#006137',
      onContainer: '#87DAA4',
      dark: '#004727'
    },
    // Text & Legibility (Charcoal rather than pure black to avoid saccadic vibration)
    text: {
      primary: '#2B2B2E',
      secondary: '#454652',
      muted: '#757683',
      inverse: '#F2F0F4'
    },
    // Accessible Feedback (Coral / Soft Warm Alert)
    feedback: {
      error: '#BA1A1A',
      errorContainer: '#FFDAD6',
      onErrorContainer: '#93000A',
      warning: '#E8A33D',
      success: '#4E9F6E',
      info: '#3A4CA8'
    }
  },

  typography: {
    fontFamilies: {
      lexend: ['Lexend', 'sans-serif'],
      atkinson: ['Atkinson Hyperlegible', 'sans-serif'],
      openDyslexic: ['OpenDyslexic', 'sans-serif'],
      inter: ['Inter', 'system-ui', 'sans-serif']
    },
    scale: {
      'display-lg': {
        fontSize: '3rem', // 48px
        lineHeight: '3.75rem', // 60px
        fontWeight: '700',
        letterSpacing: '-0.01em'
      },
      'display-lg-mobile': {
        fontSize: '2rem', // 32px
        lineHeight: '2.5rem', // 40px
        fontWeight: '700',
        letterSpacing: '-0.01em'
      },
      'headline-md': {
        fontSize: '1.5rem', // 24px
        lineHeight: '2rem', // 32px
        fontWeight: '600',
        letterSpacing: '0.02em'
      },
      'body-xl': {
        fontSize: '1.25rem', // 20px
        lineHeight: '2.25rem', // 36px (1.8 ratio)
        fontWeight: '400',
        letterSpacing: '0.03em'
      },
      'body-lg': {
        fontSize: '1.125rem', // 18px (recommended minimum body size)
        lineHeight: '2rem', // 32px (1.78 ratio)
        fontWeight: '400',
        letterSpacing: '0.03em'
      },
      'body-md': {
        fontSize: '1rem', // 16px
        lineHeight: '1.75rem', // 28px
        fontWeight: '400',
        letterSpacing: '0.025em'
      },
      'label-md': {
        fontSize: '0.875rem', // 14px
        lineHeight: '1.25rem', // 20px
        fontWeight: '600',
        letterSpacing: '0.05em'
      }
    }
  },

  spacing: {
    unit: '0.5rem', // 8px baseline grid
    stackGap: '1rem', // 16px
    gutter: '1.5rem', // 24px
    containerPadding: '2rem', // 32px
    touchTargetMin: '3rem', // 48px minimum touch target
    readingMaxMeasure: '65ch' // Optimal reading column width to prevent line-lost errors
  },

  borderRadius: {
    sm: '0.25rem', // 4px
    DEFAULT: '0.5rem', // 8px
    md: '0.75rem', // 12px
    lg: '1rem', // 16px - buttons & inputs
    xl: '1.5rem', // 24px - cards & elevated containers
    full: '9999px' // pills & avatars
  },

  shadows: {
    soft: '0 2px 8px -1px rgba(58, 76, 168, 0.06), 0 1px 4px -1px rgba(0, 0, 0, 0.04)',
    card: '0 4px 20px -2px rgba(58, 76, 168, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
    elevated: '0 12px 32px -4px rgba(58, 76, 168, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.06)',
    focusRing: '0 0 0 3px rgba(58, 76, 168, 0.35)'
  }
} as const;

export type DesignTokens = typeof designTokens;
export default designTokens;
