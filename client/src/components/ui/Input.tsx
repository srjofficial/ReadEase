import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Visible label text above the input */
  label?: string;
  /** Helper text displayed below input */
  helperText?: string;
  /** Error message displaying alert icon and red outline */
  error?: string;
  /** Leading icon element (left) */
  iconLeft?: React.ReactNode;
  /** Trailing icon element (right) */
  iconRight?: React.ReactNode;
  /** Optional custom container class name */
  containerClassName?: string;
}

/**
 * Accessible Form Input Component
 *
 * Implements high-visibility fillable background, prominent focus rings,
 * explicit label linking via htmlFor, and ARIA error associations.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      iconLeft,
      iconRight,
      className = '',
      containerClassName = '',
      id,
      disabled,
      required,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const helperId = `${inputId}-helper`;

    return (
      <div className={`w-full flex flex-col space-y-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-label-md font-semibold text-text-primary flex items-center justify-between"
          >
            <span>
              {label}
              {required && <span className="text-feedback-error ml-1">*</span>}
            </span>
          </label>
        )}

        <div className="relative flex items-center">
          {iconLeft && (
            <div className="absolute left-3.5 flex items-center pointer-events-none text-text-muted">
              {iconLeft}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : helperText ? helperId : undefined}
            className={`w-full bg-surface-low text-text-primary text-body-md rounded-lg border transition-all duration-150 min-h-[48px] py-2.5 px-4 placeholder:text-text-muted focus:outline-none focus:bg-surface-lowest ${
              iconLeft ? 'pl-11' : ''
            } ${iconRight || error ? 'pr-11' : ''} ${
              error
                ? 'border-feedback-error focus:ring-3 focus:ring-feedback-error/40'
                : 'border-surface-border focus:border-primary focus:ring-3 focus:ring-primary/30'
            } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            {...props}
          />

          {error ? (
            <div className="absolute right-3.5 flex items-center pointer-events-none text-feedback-error">
              <AlertCircle size={18} aria-hidden="true" />
            </div>
          ) : (
            iconRight && (
              <div className="absolute right-3.5 flex items-center text-text-muted">
                {iconRight}
              </div>
            )
          )}
        </div>

        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-xs font-semibold text-feedback-error flex items-center gap-1 mt-1"
          >
            <span>{error}</span>
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="text-xs text-text-muted mt-1">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      helperText,
      error,
      className = '',
      containerClassName = '',
      id,
      disabled,
      required,
      rows = 4,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const textareaId = id || generatedId;
    const errorId = `${textareaId}-error`;
    const helperId = `${textareaId}-helper`;

    return (
      <div className={`w-full flex flex-col space-y-1.5 ${containerClassName}`}>
        {label && (
          <label htmlFor={textareaId} className="text-label-md font-semibold text-text-primary">
            {label}
            {required && <span className="text-feedback-error ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`w-full bg-surface-low text-text-primary text-body-md rounded-lg border transition-all duration-150 p-4 placeholder:text-text-muted focus:outline-none focus:bg-surface-lowest leading-relaxed ${
            error
              ? 'border-feedback-error focus:ring-3 focus:ring-feedback-error/40'
              : 'border-surface-border focus:border-primary focus:ring-3 focus:ring-primary/30'
          } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        />

        {error && (
          <p id={errorId} role="alert" className="text-xs font-semibold text-feedback-error mt-1">
            {error}
          </p>
        )}

        {!error && helperText && (
          <p id={helperId} className="text-xs text-text-muted mt-1">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
export default Input;
