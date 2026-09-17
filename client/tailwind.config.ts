import type { Config } from 'tailwindcss';
import { designTokens } from './src/styles/design-tokens';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: designTokens.colors.background,
        surface: designTokens.colors.surface,
        primary: designTokens.colors.primary,
        secondary: designTokens.colors.secondary,
        tertiary: designTokens.colors.tertiary,
        text: designTokens.colors.text,
        feedback: designTokens.colors.feedback
      },
      fontFamily: {
        lexend: designTokens.typography.fontFamilies.lexend,
        atkinson: designTokens.typography.fontFamilies.atkinson,
        openDyslexic: designTokens.typography.fontFamilies.openDyslexic,
        inter: designTokens.typography.fontFamilies.inter
      },
      fontSize: {
        'display-lg': [
          designTokens.typography.scale['display-lg'].fontSize,
          {
            lineHeight: designTokens.typography.scale['display-lg'].lineHeight,
            letterSpacing: designTokens.typography.scale['display-lg'].letterSpacing,
            fontWeight: designTokens.typography.scale['display-lg'].fontWeight
          }
        ],
        'display-lg-mobile': [
          designTokens.typography.scale['display-lg-mobile'].fontSize,
          {
            lineHeight: designTokens.typography.scale['display-lg-mobile'].lineHeight,
            fontWeight: designTokens.typography.scale['display-lg-mobile'].fontWeight
          }
        ],
        'headline-md': [
          designTokens.typography.scale['headline-md'].fontSize,
          {
            lineHeight: designTokens.typography.scale['headline-md'].lineHeight,
            letterSpacing: designTokens.typography.scale['headline-md'].letterSpacing,
            fontWeight: designTokens.typography.scale['headline-md'].fontWeight
          }
        ],
        'body-xl': [
          designTokens.typography.scale['body-xl'].fontSize,
          {
            lineHeight: designTokens.typography.scale['body-xl'].lineHeight,
            letterSpacing: designTokens.typography.scale['body-xl'].letterSpacing,
            fontWeight: designTokens.typography.scale['body-xl'].fontWeight
          }
        ],
        'body-lg': [
          designTokens.typography.scale['body-lg'].fontSize,
          {
            lineHeight: designTokens.typography.scale['body-lg'].lineHeight,
            letterSpacing: designTokens.typography.scale['body-lg'].letterSpacing,
            fontWeight: designTokens.typography.scale['body-lg'].fontWeight
          }
        ],
        'body-md': [
          designTokens.typography.scale['body-md'].fontSize,
          {
            lineHeight: designTokens.typography.scale['body-md'].lineHeight,
            letterSpacing: designTokens.typography.scale['body-md'].letterSpacing,
            fontWeight: designTokens.typography.scale['body-md'].fontWeight
          }
        ],
        'label-md': [
          designTokens.typography.scale['label-md'].fontSize,
          {
            lineHeight: designTokens.typography.scale['label-md'].lineHeight,
            letterSpacing: designTokens.typography.scale['label-md'].letterSpacing,
            fontWeight: designTokens.typography.scale['label-md'].fontWeight
          }
        ]
      },
      borderRadius: {
        sm: designTokens.borderRadius.sm,
        DEFAULT: designTokens.borderRadius.DEFAULT,
        md: designTokens.borderRadius.md,
        lg: designTokens.borderRadius.lg,
        xl: designTokens.borderRadius.xl,
        full: designTokens.borderRadius.full
      },
      boxShadow: {
        soft: designTokens.shadows.soft,
        card: designTokens.shadows.card,
        elevated: designTokens.shadows.elevated
      },
      spacing: {
        'touch-target': designTokens.spacing.touchTargetMin,
        'reading-measure': designTokens.spacing.readingMaxMeasure
      },
      maxWidth: {
        reading: designTokens.spacing.readingMaxMeasure,
        container: '1200px'
      }
    }
  },
  plugins: []
} satisfies Config;
