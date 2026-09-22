import type { Config } from 'tailwindcss';
import { designTokens } from './src/styles/design-tokens';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        background: {
          cream: 'rgb(var(--bg-cream-rgb) / <alpha-value>)',
          canvas: 'rgb(var(--bg-canvas-rgb) / <alpha-value>)',
          paper: 'rgb(var(--bg-paper-rgb) / <alpha-value>)',
          dark: '#131315'
        },
        surface: {
          lowest: 'rgb(var(--surface-lowest-rgb) / <alpha-value>)',
          low: 'rgb(var(--surface-low-rgb) / <alpha-value>)',
          DEFAULT: 'rgb(var(--surface-default-rgb) / <alpha-value>)',
          high: 'rgb(var(--surface-high-rgb) / <alpha-value>)',
          highest: 'rgb(var(--surface-highest-rgb) / <alpha-value>)',
          fillable: 'rgb(var(--surface-fillable-rgb) / <alpha-value>)',
          border: 'rgb(var(--surface-border-rgb) / <alpha-value>)'
        },
        primary: {
          50: 'rgb(var(--color-primary-50-rgb) / <alpha-value>)',
          100: designTokens.colors.primary[100],
          200: 'rgb(var(--color-primary-200-rgb) / <alpha-value>)',
          300: designTokens.colors.primary[300],
          400: designTokens.colors.primary[400],
          500: designTokens.colors.primary[500],
          DEFAULT: 'rgb(var(--color-primary-rgb) / <alpha-value>)',
          container: 'rgb(var(--color-primary-container-rgb) / <alpha-value>)',
          onContainer: designTokens.colors.primary.onContainer,
          hover: designTokens.colors.primary.hover,
          dark: designTokens.colors.primary.dark
        },
        secondary: {
          50: 'rgb(var(--color-secondary-50-rgb) / <alpha-value>)',
          100: designTokens.colors.secondary[100],
          200: 'rgb(var(--color-secondary-200-rgb) / <alpha-value>)',
          300: designTokens.colors.secondary[300],
          400: designTokens.colors.secondary[400],
          DEFAULT: 'rgb(var(--color-secondary-rgb) / <alpha-value>)',
          container: designTokens.colors.secondary.container,
          onContainer: designTokens.colors.secondary.onContainer,
          dark: 'rgb(var(--color-secondary-dark-rgb) / <alpha-value>)'
        },
        tertiary: {
          50: 'rgb(var(--color-tertiary-50-rgb) / <alpha-value>)',
          100: designTokens.colors.tertiary[100],
          200: 'rgb(var(--color-tertiary-200-rgb) / <alpha-value>)',
          300: designTokens.colors.tertiary[300],
          DEFAULT: 'rgb(var(--color-tertiary-rgb) / <alpha-value>)',
          container: designTokens.colors.tertiary.container,
          onContainer: designTokens.colors.tertiary.onContainer,
          dark: 'rgb(var(--color-tertiary-dark-rgb) / <alpha-value>)'
        },
        text: {
          primary: 'rgb(var(--text-primary-rgb) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary-rgb) / <alpha-value>)',
          muted: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
          inverse: 'rgb(var(--text-inverse-rgb) / <alpha-value>)'
        },
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
