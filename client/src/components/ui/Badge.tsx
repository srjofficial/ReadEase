import React from 'react';

export type BadgeVariant = 'primary' | 'secondary' | 'tertiary' | 'neutral' | 'error' | 'outline';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Visual theme matching token hierarchy */
  variant?: BadgeVariant;
  /** Size scale */
  size?: BadgeSize;
  /** Show leading status dot indicator */
  dot?: boolean;
  /** Leading icon element */
  icon?: React.ReactNode;
}

/**
 * Accessible Status Badge Component
 *
 * Used for role tags, reading levels, document statuses, and achievement tags.
 */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    { children, className = '', variant = 'primary', size = 'md', dot = false, icon, ...props },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center font-semibold rounded-full tracking-wide transition-colors';

    const variantClasses: Record<BadgeVariant, string> = {
      primary: 'bg-primary-50 text-primary-container border border-primary-200',
      secondary: 'bg-secondary-50 text-secondary-dark border border-secondary-200',
      tertiary: 'bg-tertiary-50 text-tertiary-dark border border-tertiary-200',
      neutral: 'bg-surface-high text-text-secondary border border-surface-border',
      error:
        'bg-feedback-errorContainer text-feedback-onErrorContainer border border-feedback-error/20',
      outline: 'bg-surface-lowest text-text-primary border border-surface-border'
    };

    const dotColorClasses: Record<BadgeVariant, string> = {
      primary: 'bg-primary',
      secondary: 'bg-secondary',
      tertiary: 'bg-tertiary',
      neutral: 'bg-text-muted',
      error: 'bg-feedback-error',
      outline: 'bg-text-secondary'
    };

    const sizeClasses: Record<BadgeSize, string> = {
      sm: 'px-2 py-0.5 text-[0.7rem] gap-1',
      md: 'px-3 py-1 text-xs gap-1.5',
      lg: 'px-3.5 py-1.5 text-label-md gap-2'
    };

    return (
      <span
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {dot && (
          <span
            className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColorClasses[variant]}`}
            aria-hidden="true"
          />
        )}

        {icon && <span className="inline-flex shrink-0">{icon}</span>}

        <span>{children}</span>
      </span>
    );
  }
);

Badge.displayName = 'Badge';
export default Badge;
