import React from 'react';

export type CardVariant = 'default' | 'subtle' | 'interactive' | 'highlight';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Visual variant of the card surface */
  variant?: CardVariant;
  /** Internal padding scale */
  padding?: CardPadding;
  /** Accessible role override */
  role?: string;
}

/**
 * Accessible Card Component
 *
 * Provides a tactile, soft-edged container for chunking information,
 * helping neurodivergent readers focus on one task at a time.
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className = '', variant = 'default', padding = 'md', ...props }, ref) => {
    const baseClasses = 'rounded-xl border transition-all duration-200 text-text-primary';

    const variantClasses: Record<CardVariant, string> = {
      default: 'bg-surface-lowest border-surface-border shadow-card',
      subtle: 'bg-surface-low border-surface-border shadow-soft',
      interactive:
        'bg-surface-lowest border-surface-border shadow-card hover:shadow-elevated hover:-translate-y-0.5 cursor-pointer focus-within:ring-3 focus-within:ring-primary/40',
      highlight: 'bg-surface-lowest border-surface-border border-l-4 border-l-primary shadow-card'
    };

    const paddingClasses: Record<CardPadding, string> = {
      none: 'p-0',
      sm: 'p-4',
      md: 'p-6 md:p-8',
      lg: 'p-8 md:p-12'
    };

    return (
      <div
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className = '', ...props }, ref) => (
    <div ref={ref} className={`flex flex-col space-y-1.5 pb-4 ${className}`} {...props}>
      {children}
    </div>
  )
);
CardHeader.displayName = 'CardHeader';

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export const CardTitle = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, className = '', as: Component = 'h3', ...props }, ref) => (
    <Component
      ref={ref}
      className={`text-headline-md font-bold text-text-primary tracking-tight ${className}`}
      {...props}
    >
      {children}
    </Component>
  )
);
CardTitle.displayName = 'CardTitle';

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

export const CardDescription = React.forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ children, className = '', ...props }, ref) => (
    <p
      ref={ref}
      className={`text-body-md text-text-secondary leading-relaxed max-w-reading ${className}`}
      {...props}
    >
      {children}
    </p>
  )
);
CardDescription.displayName = 'CardDescription';

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className = '', ...props }, ref) => (
    <div ref={ref} className={`space-y-4 ${className}`} {...props}>
      {children}
    </div>
  )
);
CardContent.displayName = 'CardContent';

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`flex items-center justify-between pt-6 border-t border-surface-border mt-6 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
);
CardFooter.displayName = 'CardFooter';
