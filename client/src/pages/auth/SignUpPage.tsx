import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Card, Input } from '../../components/ui';
import type { UserRole } from '../../components/navigation/Sidebar';
import { GoogleIcon } from './LoginPage';
import { initiateGoogleSignIn, loginWithGoogleApi } from '../../utils/googleAuth';
import { OtpVerificationCard } from '../../components/auth/OtpVerificationCard';
import {
  GraduationCap,
  BookOpen,
  Brain,
  Users,
  ArrowRight,
  Eye,
  EyeOff,
  UserPlus,
  AlertCircle
} from 'lucide-react';

const ROLES: {
  id: UserRole;
  title: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'student',
    title: 'Student',
    desc: 'Reading studio, bionic view & visual ruler',
    icon: <GraduationCap size={18} className="text-primary" />
  },
  {
    id: 'teacher',
    title: 'Teacher',
    desc: 'Classroom roster, assignments & progress',
    icon: <BookOpen size={18} className="text-secondary" />
  },
  {
    id: 'special-educator',
    title: 'Special Educator',
    desc: 'Clinical screening, IEPs & accommodations',
    icon: <Brain size={18} className="text-tertiary" />
  },
  {
    id: 'parent',
    title: 'Parent',
    desc: "Child's reading milestones & weekly reports",
    icon: <Users size={18} className="text-primary-container" />
  }
];

interface SignUpPageProps {
  onLoginSuccess: (role: UserRole, user: { name: string; email: string }) => void;
}

export const SignUpPage: React.FC<SignUpPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAccountExists, setIsAccountExists] = useState(false);

  // OTP Verification state
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const activeRoleConfig = ROLES.find((r) => r.id === selectedRole) || ROLES[0];
  const activeRoleTitle = activeRoleConfig.title;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsAccountExists(false);

    if (!name.trim() || !email.trim() || !password.trim()) {
      setErrorMessage(
        language === 'ML'
          ? 'ദയവായി എല്ലാ വിവരങ്ങളും പൂരിപ്പിക്കുക.'
          : 'Please fill in all required fields.'
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        language === 'ML'
          ? 'പാസ്‌വേഡിന് കുറഞ്ഞത് 6 അക്ഷരങ്ങള്‍ ഉണ്ടായിരിക്കണം.'
          : 'Password must be at least 6 characters.'
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(
        language === 'ML'
          ? 'പാസ്‌വേഡുകള്‍ തമ്മില്‍ പൊരുത്തപ്പെടുന്നില്ല.'
          : 'Passwords do not match.'
      );
      return;
    }

    if (!agreeTerms) {
      setErrorMessage(
        language === 'ML'
          ? 'സേവന നിബന്ധനകള്‍ അംഗീകരിക്കേണ്ടതുണ്ട്.'
          : 'You must agree to the Terms of Service and Privacy Policy.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/auth/signup/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          role: selectedRole
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || !data.success) {
        const errorMsg = data?.error?.message || data?.message;
        const isConflict =
          response.status === 409 ||
          data?.error?.code === 'CONFLICT' ||
          (Boolean(errorMsg) && /already exists/i.test(errorMsg));

        if (isConflict) {
          setIsAccountExists(true);
          throw new Error(
            language === 'ML'
              ? 'ഈ ഇമെയിൽ വിലാസത്തിൽ ഇതിനകം ഒരു അക്കൗണ്ട് നിലവിലുണ്ട്. ദയവായി ലോഗിൻ ചെയ്യുക.'
              : 'An account with this email address already exists. Please log in.'
          );
        }

        throw new Error(
          errorMsg ||
            (response.status >= 500
              ? 'Unable to connect to server. Please check backend connection.'
              : 'Failed to dispatch verification code')
        );
      }

      setStep('otp');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Failed to send verification email. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (otp: string) => {
    setIsVerifying(true);
    setErrorMessage('');

    try {
      const response = await fetch('/api/v1/auth/signup/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || !data.success) {
        throw new Error(
          data?.error?.message ||
            data?.message ||
            (response.status >= 500
              ? 'Unable to connect to server. Please check backend connection.'
              : 'Invalid or expired verification code')
        );
      }

      const user = data.data.user;
      if (data.data.accessToken) {
        localStorage.setItem('readease_access_token', data.data.accessToken);
      }
      localStorage.setItem('readease_role', user.role);
      localStorage.setItem('readease_user', JSON.stringify(user));

      onLoginSuccess(user.role as UserRole, user);
      navigate(user.role === 'student' ? '/student/dashboard' : '/dashboard');
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Verification failed. Please check the code.';
      setErrorMessage(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setErrorMessage('');

    try {
      const response = await fetch('/api/v1/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          purpose: 'signup'
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || !data.success) {
        throw new Error(
          data?.error?.message ||
            data?.message ||
            (response.status >= 500
              ? 'Unable to connect to server. Please check backend connection.'
              : 'Failed to resend verification code')
        );
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Could not resend code. Please wait before retrying.';
      setErrorMessage(msg);
      throw err;
    }
  };

  const handleGoogleSignUp = async () => {
    setErrorMessage('');
    setIsGoogleLoading(true);

    try {
      // 1. Trigger Google's real OAuth popup ("Choose an account" screen)
      const credential = await initiateGoogleSignIn('signup');

      // 2. Send the Google ID token + selected role to our backend
      const response = await loginWithGoogleApi(credential, selectedRole);

      // 3. Persist session
      const userSession = {
        name: response.user.name,
        email: response.user.email,
        role: selectedRole,
        provider: 'google',
        profileImage: response.user.profileImage
      };
      localStorage.setItem('readease_role', selectedRole);
      localStorage.setItem('readease_user', JSON.stringify(userSession));

      // 4. Navigate to dashboard
      onLoginSuccess(selectedRole, userSession);
      navigate(selectedRole === 'student' ? '/student/dashboard' : '/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-up failed';
      if (!message.includes('cancelled') && !message.includes('skipped')) {
        setErrorMessage(message);
      }
      console.warn('Google sign-up error:', message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="py-12 md:py-20 px-4 sm:px-6 max-w-container mx-auto flex justify-center items-center">
        <div className="w-full max-w-lg space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-1">
              <Link to="/" aria-label="ReadEase Home">
                <img
                  src="/ReadEase_wordmark_transparent.svg"
                  alt="ReadEase"
                  className="h-10 md:h-11 w-auto object-contain hover:opacity-90 transition-opacity"
                />
              </Link>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-50 text-secondary-container rounded-full text-xs font-bold uppercase tracking-wider border border-secondary-200">
              <UserPlus size={13} />
              {language === 'ML' ? 'പുതിയ അക്കൗണ്ട് രജിസ്ട്രേഷൻ' : 'Join ReadEase Platform'}
            </div>
            <h1 className="text-display-lg-mobile md:text-headline-md font-bold text-text-primary">
              {language === 'ML' ? 'റീഡ്ഈസ് അക്കൗണ്ട് ഉണ്ടാക്കുക' : 'Create your ReadEase account'}
            </h1>
            <p className="text-body-md text-text-secondary">
              {language === 'ML'
                ? 'വായനാ പരിമിതികളെ അതിജീവിച്ചു മുന്നേറാൻ ഇന്ന് തന്നെ ആരംഭിക്കൂ.'
                : 'Start your personalized neurodivergent-friendly reading journey today.'}
            </p>
          </div>

          {step === 'otp' ? (
            <OtpVerificationCard
              email={email.trim()}
              onVerify={handleVerifyOtp}
              onResend={handleResendOtp}
              onBack={() => {
                setStep('form');
                setErrorMessage('');
              }}
              isLoading={isVerifying}
              errorMessage={errorMessage}
              title={language === 'ML' ? 'ഇമെയിൽ സ്ഥിരീകരിക്കുക' : 'Verify Your Email Address'}
              subtitle={
                language === 'ML'
                  ? `രജിസ്ട്രേഷൻ പൂർത്തിയാക്കാൻ ${email} ലേക്ക് അയച്ച 6-അക്ക കോഡ് നൽകുക:`
                  : `Enter the 6-digit code sent to ${email} to finalize your ${activeRoleTitle} account:`
              }
            />
          ) : (
            <Card variant="default" padding="lg" className="shadow-elevated border-surface-border">
              {/* Step 1: Role Selection at Top */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                    {language === 'ML'
                      ? 'അക്കൗണ്ട് തരം തിരഞ്ഞെടുക്കുക'
                      : 'Select Your Primary Role'}
                  </label>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-secondary-50 dark:bg-secondary-950/60 text-secondary-container border border-secondary-200 dark:border-secondary-800">
                    {language === 'ML'
                      ? `${activeRoleTitle} അക്കൗണ്ട്`
                      : `Role: ${activeRoleTitle}`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => {
                    const isSelected = selectedRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedRole(r.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-primary-50/70 dark:bg-primary-950/40 ring-1 ring-primary shadow-xs'
                            : 'border-surface-border bg-surface-low hover:bg-surface'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs text-text-primary">
                          {r.icon}
                          <span className="truncate">{r.title}</span>
                        </div>
                        <span className="text-[10px] text-text-muted leading-tight line-clamp-1">
                          {r.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error Message */}
              {errorMessage &&
                (isAccountExists || /already exists/i.test(errorMessage) ? (
                  <div className="mt-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/70 text-amber-900 dark:text-amber-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle
                        size={18}
                        className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-semibold text-amber-950 dark:text-amber-100 leading-snug">
                          {errorMessage}
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-0.5">
                          {language === 'ML'
                            ? 'നിങ്ങളുടെ നിലവിലുള്ള പാസ്‌വേഡ് ഉപയോഗിച്ച് ലോഗിൻ ചെയ്യുക.'
                            : 'Sign in directly with your password or Google.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate('/login', { state: { email: email.trim().toLowerCase() } })
                      }
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-semibold rounded-lg text-xs shadow-xs transition-all shrink-0 group cursor-pointer"
                      title={language === 'ML' ? 'ലോഗിൻ പേജിലേക്ക് പോകുക' : 'Go to Login page'}
                    >
                      <span>{language === 'ML' ? 'ലോഗിൻ ചെയ്യുക' : 'Log In'}</span>
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0 text-red-500" />
                    <span>{errorMessage}</span>
                  </div>
                ))}

              {/* Sign Up Form */}
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <Input
                  label={language === 'ML' ? 'പൂർണ്ണ പേര്' : 'Full Name'}
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    selectedRole === 'student'
                      ? 'Alex Chen'
                      : selectedRole === 'teacher'
                        ? 'Sarah Jenkins'
                        : 'Your Name'
                  }
                  autoComplete="name"
                />

                <Input
                  label={language === 'ML' ? 'ഇമെയിൽ വിലാസം' : 'Email Address'}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (isAccountExists) setIsAccountExists(false);
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder={
                    selectedRole === 'student'
                      ? 'alex.chen@student.readease.edu'
                      : `${selectedRole}@readease.edu`
                  }
                  autoComplete="email"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label={language === 'ML' ? 'പാസ്‌വേഡ്' : 'Password'}
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    autoComplete="new-password"
                    iconRight={
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="p-1 text-text-muted hover:text-text-primary transition-colors focus:outline-none cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />

                  <Input
                    label={language === 'ML' ? 'പാസ്‌വേഡ് സ്ഥിരീകരിക്കുക' : 'Confirm Password'}
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                </div>

                {/* Google Sign Up - Positioned above Terms & Create Account */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-surface-border" />
                    <span className="text-[11px] uppercase font-semibold text-text-muted tracking-wider">
                      {language === 'ML' ? 'അല്ലെങ്കിൽ ഗൂഗിൾ വഴി' : 'or sign up with google'}
                    </span>
                    <div className="flex-1 h-px bg-surface-border" />
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignUp}
                    disabled={isGoogleLoading || isLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-surface-lowest hover:bg-surface-low border-2 border-surface-border hover:border-primary-300 rounded-xl font-semibold text-sm text-text-primary transition-all shadow-xs hover:shadow-soft active:scale-[0.99] disabled:opacity-60 cursor-pointer"
                  >
                    {isGoogleLoading ? (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <GoogleIcon size={20} />
                    )}
                    <span>
                      {isGoogleLoading
                        ? language === 'ML'
                          ? 'ഗൂഗിൾ വഴി ബന്ധിപ്പിക്കുന്നു...'
                          : 'Connecting with Google...'
                        : language === 'ML'
                          ? `${activeRoleTitle} ആയി ഗൂഗിൾ സൈൻ അപ്പ്`
                          : `Sign up with Google as ${activeRoleTitle}`}
                    </span>
                  </button>
                </div>

                {/* Terms & Privacy */}
                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-text-secondary">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                    />
                    <span>
                      {language === 'ML' ? (
                        <>
                          ഞാൻ റീഡ്ഈസിന്റെ{' '}
                          <span className="text-primary font-semibold">സേവന നിബന്ധനകളും</span>{' '}
                          സ്വകാര്യതാ നയവും അംഗീകരിക്കുന്നു.
                        </>
                      ) : (
                        <>
                          I agree to the{' '}
                          <span className="text-primary font-semibold hover:underline">
                            Terms of Service
                          </span>{' '}
                          and{' '}
                          <span className="text-primary font-semibold hover:underline">
                            Privacy Policy
                          </span>
                          .
                        </>
                      )}
                    </span>
                  </label>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full justify-center mt-2 shadow-soft"
                  isLoading={isLoading}
                  iconRight={<ArrowRight size={18} />}
                >
                  {language === 'ML'
                    ? 'അക്കൗണ്ട് സൃഷ്ടിക്കുക'
                    : `Create ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Account`}
                </Button>
              </form>
            </Card>
          )}

          {/* Switcher to Login */}
          <div className="text-center text-sm text-text-secondary space-y-2">
            <p>
              {language === 'ML' ? 'ഇതിനകം അക്കൗണ്ട് ഉണ്ടോ?' : 'Already have a ReadEase account?'}{' '}
              <Link to="/login" className="text-primary font-bold hover:underline">
                {language === 'ML' ? 'ഇവിടെ ലോഗിൻ ചെയ്യുക (Sign In)' : 'Sign In'}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};
export default SignUpPage;
