import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'outline' | 'ghost' | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual hierarchy variant based on design tokens */
  variant?: ButtonVariant;
  /** Size scale matching touch target requirements */
  size?: ButtonSize;
  /** Loading spinner indicator state */
  isLoading?: boolean;
  /** Leading icon element */
  iconLeft?: React.ReactNode;
  /** Trailing icon element */
  iconRight?: React.ReactNode;
  /** Pill rounded corners instead of standard rounded-lg */
  pill?: boolean;
}

/**
 * Accessible Button Component
 *
 * Implements WCAG touch target standards (minimum 44-48px for default/large sizes),
 * tactile feedback, focus rings, loading states, and ref forwarding.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = '',
      variant = 'primary',
      size = 'md',
      isLoading = false,
      iconLeft,
      iconRight,
      pill = false,
      disabled,
      type = 'button',
      ...props
    },
    ref
  ) => {
    // Base classes with keyboard focus indicators
    const baseClasses =
      'inline-flex items-center justify-center font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-offset-2';

    // Variant mappings according to Stitch ReadEase tokens
    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-primary text-white hover:bg-primary-hover shadow-soft focus-visible:ring-primary',
      secondary:
        'bg-secondary text-text-primary hover:bg-secondary-container shadow-soft focus-visible:ring-secondary',
      tertiary:
        'bg-tertiary text-white hover:bg-tertiary-container shadow-soft focus-visible:ring-tertiary',
      outline:
        'bg-surface-lowest text-primary border-2 border-surface-border hover:bg-surface-low hover:border-primary/40 focus-visible:ring-primary shadow-soft',
      ghost:
        'bg-transparent text-text-secondary hover:bg-surface-low hover:text-text-primary focus-visible:ring-primary',
      danger:
        'bg-feedback-error text-white hover:bg-feedback-error/90 shadow-soft focus-visible:ring-feedback-error'
    };

    // Size mappings ensuring accessible touch targets
    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'px-3 py-1.5 text-xs min-h-[36px] gap-1.5',
      md: 'px-5 py-2.5 text-label-md min-h-[44px] gap-2',
      lg: 'px-7 py-3.5 text-body-md min-h-[52px] gap-2.5',
      icon: 'p-2.5 min-h-[44px] min-w-[44px] justify-center'
    };

    const roundedClass = pill ? 'rounded-full' : 'rounded-lg';

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${roundedClass} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2
            className="animate-spin text-current"
            size={size === 'sm' ? 14 : 18}
            aria-hidden="true"
          />
        ) : (
          iconLeft && <span className="inline-flex shrink-0">{iconLeft}</span>
        )}

        {children && <span className="truncate">{children}</span>}

        {!isLoading && iconRight && <span className="inline-flex shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
