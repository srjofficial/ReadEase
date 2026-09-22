import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Card } from '../ui';
import { Mail, ArrowLeft, RefreshCw, CheckCircle2, ShieldCheck } from 'lucide-react';

interface OtpVerificationCardProps {
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
  errorMessage?: string;
  title?: string;
  subtitle?: string;
}

export const OtpVerificationCard: React.FC<OtpVerificationCardProps> = ({
  email,
  onVerify,
  onResend,
  onBack,
  isLoading,
  errorMessage,
  title,
  subtitle
}) => {
  const { language } = useLanguage();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState<number>(45);
  const [isResending, setIsResending] = useState<boolean>(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Focus the first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const lastChar = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = lastChar;
    setDigits(newDigits);

    // Auto-advance to next input
    if (index < 5 && lastChar) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pastedData[i] || '';
    }
    setDigits(newDigits);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = digits.join('');
    if (fullOtp.length !== 6) return;
    await onVerify(fullOtp);
  };

  const handleResendClick = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      await onResend();
      setResendCooldown(45);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = digits.every((d) => d.length === 1);

  return (
    <Card variant="default" padding="lg" className="shadow-elevated border-surface-border">
      <div className="space-y-6">
        {/* Top Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/50 text-primary flex items-center justify-center shadow-xs border border-primary-200 dark:border-primary-800">
            <ShieldCheck size={26} />
          </div>

          <h2 className="text-headline-sm font-bold text-text-primary">
            {title || (language === 'ML' ? 'ഇമെയിൽ സ്ഥിരീകരണം' : 'Email Verification')}
          </h2>

          <p className="text-body-sm text-text-secondary max-w-sm mx-auto">
            {subtitle ||
              (language === 'ML'
                ? 'താഴെ പറയുന്ന ഇമെയിൽ വിലാസത്തിലേക്ക് ഞങ്ങൾ ഒരു 6-അക്ക കോഡ് അയച്ചിട്ടുണ്ട്:'
                : "We've sent a 6-digit verification code to your email address:")}
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface-low rounded-full border border-surface-border text-xs font-semibold text-text-primary">
            <Mail size={13} className="text-primary" />
            <span className="font-mono">{email}</span>
          </div>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium text-center">
            {errorMessage}
          </div>
        )}

        {/* 6 Digit Inputs */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center items-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                aria-label={`Digit ${idx + 1}`}
                className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-bold rounded-xl border-2 border-surface-border bg-surface-lowest text-text-primary focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              />
            ))}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full justify-center shadow-soft font-semibold"
            disabled={!isComplete || isLoading}
            isLoading={isLoading}
            iconLeft={<CheckCircle2 size={18} />}
          >
            {language === 'ML' ? 'സ്ഥിരീകരിച്ചു പൂർത്തിയാക്കുക' : 'Verify & Complete Registration'}
          </Button>
        </form>

        {/* Resend and Back controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-text-secondary border-t border-surface-border">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-text-muted hover:text-text-primary font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>{language === 'ML' ? 'ഇമെയിൽ മാറ്റുക' : 'Change email address'}</span>
          </button>

          <button
            type="button"
            onClick={handleResendClick}
            disabled={resendCooldown > 0 || isResending}
            className={`inline-flex items-center gap-1.5 font-semibold transition-colors cursor-pointer ${
              resendCooldown > 0 || isResending
                ? 'text-text-muted cursor-not-allowed opacity-70'
                : 'text-primary hover:underline'
            }`}
          >
            <RefreshCw size={13} className={isResending ? 'animate-spin' : ''} />
            <span>
              {resendCooldown > 0
                ? language === 'ML'
                  ? `കോഡ് വീണ്ടും അയക്കുക (${resendCooldown}s)`
                  : `Resend code in ${resendCooldown}s`
                : language === 'ML'
                  ? 'കോഡ് വീണ്ടും അയക്കുക'
                  : 'Resend verification code'}
            </span>
          </button>
        </div>
      </div>
    </Card>
  );
};
