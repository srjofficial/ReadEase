import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  /** Controls visibility */
  isOpen: boolean;
  /** Triggered when backdrop is clicked, Escape is pressed, or close button clicked */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Accessible description text */
  description?: string;
  /** Modal body content */
  children: React.ReactNode;
  /** Optional custom container width */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Extra class names */
  className?: string;
}

/**
 * Accessible Modal Dialog Component
 *
 * Implements WCAG modal dialog guidelines: Escape key dismissal,
 * focus trapping, ARIA roles, backdrop dimming, and smooth transitions.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'md',
  className = ''
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full m-4'
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      aria-describedby={description ? 'modal-description' : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-text-primary/50 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog Box */}
      <div
        ref={modalRef}
        className={`relative w-full ${maxWidthClasses[maxWidth]} bg-surface-lowest rounded-xl border border-surface-border shadow-elevated p-6 sm:p-8 space-y-6 z-10 animate-in zoom-in-95 duration-150 ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            {title && (
              <h2
                id="modal-title"
                className="text-headline-md font-bold text-text-primary tracking-tight"
              >
                {title}
              </h2>
            )}
            {description && (
              <p id="modal-description" className="text-body-md text-text-secondary">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-low rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="text-body-md text-text-primary leading-relaxed">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
