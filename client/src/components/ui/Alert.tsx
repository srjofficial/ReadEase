import React from 'react';
import { Info, AlertTriangle, CheckCircle2, AlertCircle, ShieldCheck, X } from 'lucide-react';

export type AlertVariant = 'info' | 'warning' | 'success' | 'error' | 'disclaimer';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual type and tone */
  variant?: AlertVariant;
  /** Bold title text */
  title?: string;
  /** Custom icon override */
  icon?: React.ReactNode;
  /** Dismiss callback */
  onDismiss?: () => void;
}

/**
 * Accessible Alert & Callout Banner Component
 *
 * Implements WCAG notification patterns with appropriate ARIA roles,
 * calm non-glaring colors, and clinical screening disclaimers.
 */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ children, className = '', variant = 'info', title, icon, onDismiss, ...props }, ref) => {
    const isError = variant === 'error';

    const defaultIcons: Record<AlertVariant, React.ReactNode> = {
      info: <Info size={20} className="text-primary-container shrink-0" />,
      warning: <AlertTriangle size={20} className="text-secondary shrink-0" />,
      success: <CheckCircle2 size={20} className="text-tertiary shrink-0" />,
      error: <AlertCircle size={20} className="text-feedback-error shrink-0" />,
      disclaimer: <ShieldCheck size={20} className="text-secondary shrink-0" />
    };

    const variantClasses: Record<AlertVariant, string> = {
      info: 'bg-primary-50 border-primary-200 text-text-primary',
      warning: 'bg-secondary-50 border-secondary-200 text-text-primary',
      success: 'bg-tertiary-50 border-tertiary-200 text-text-primary',
      error: 'bg-feedback-errorContainer border-feedback-error/30 text-feedback-onErrorContainer',
      disclaimer: 'bg-surface-low border-surface-border text-text-primary'
    };

    return (
      <div
        ref={ref}
        role={isError ? 'alert' : 'region'}
        aria-live={isError ? 'assertive' : 'polite'}
        className={`p-4 sm:p-5 rounded-xl border flex items-start gap-3.5 shadow-soft transition-all ${variantClasses[variant]} ${className}`}
        {...props}
      >
        <div className="mt-0.5">{icon || defaultIcons[variant]}</div>

        <div className="flex-1 space-y-1 min-w-0">
          {title && (
            <h4 className="text-label-md font-bold leading-tight tracking-tight">{title}</h4>
          )}
          <div className="text-body-md leading-relaxed text-text-secondary">{children}</div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss alert"
            className="p-1 text-text-muted hover:text-text-primary rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary shrink-0"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

/**
 * Standardized Dyslexia Screening Disclaimer Box
 */
export const ScreeningDisclaimer: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <Alert variant="disclaimer" title="Assistive & Screening Aid Disclaimer" className={className}>
      <p className="text-xs text-text-muted leading-relaxed">
        ReadEase is an educational accommodation platform designed to assist reading fluency, visual
        comfort, and phonemic awareness. Reading risk assessments provided by ReadEase are
        observational screening aids and do not constitute a formal neuropsychological or clinical
        medical diagnosis of dyslexia.
      </p>
    </Alert>
  );
};

export default Alert;
