import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { PublicLayout } from '../../layouts/PublicLayout';
import { useLanguage } from '../../context/LanguageContext';
import { Button, Card, Input, Modal } from '../../components/ui';
import type { UserRole } from '../../components/navigation/Sidebar';
import { initiateGoogleSignIn, loginWithGoogleApi } from '../../utils/googleAuth';
import {
  GraduationCap,
  BookOpen,
  Brain,
  Users,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  KeyRound,
  CheckCircle2,
  Mail
} from 'lucide-react';

export const GoogleIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 20,
  className = ''
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

const ROLES: {
  id: UserRole;
  title: string;
  desc: string;
  icon: React.ReactNode;
  defaultName: string;
}[] = [
  {
    id: 'student',
    title: 'Student',
    desc: 'Reading studio, bionic view & visual ruler',
    icon: <GraduationCap size={18} className="text-primary" />,
    defaultName: 'Alex Chen'
  },
  {
    id: 'teacher',
    title: 'Teacher',
    desc: 'Classroom roster, assignments & progress',
    icon: <BookOpen size={18} className="text-secondary" />,
    defaultName: 'Ms. Sarah Jenkins'
  },
  {
    id: 'special-educator',
    title: 'Special Educator',
    desc: 'Clinical screening, IEPs & accommodations',
    icon: <Brain size={18} className="text-tertiary" />,
    defaultName: 'Dr. Maya Thorne'
  },
  {
    id: 'parent',
    title: 'Parent',
    desc: "Child's reading milestones & weekly reports",
    icon: <Users size={18} className="text-primary-container" />,
    defaultName: 'David Chen'
  }
];

interface PendingRoleMismatchSession {
  user: {
    name: string;
    email: string;
    role?: string;
    [key: string]: unknown;
  };
  accessToken?: string;
  actualRole: UserRole;
  selectedRole: UserRole;
}

const normalizeRole = (role?: string): UserRole => {
  if (!role) return 'student';
  if (role === 'special_educator' || role === 'special-educator') return 'special-educator';
  if (['student', 'teacher', 'parent'].includes(role)) return role as UserRole;
  return 'student';
};

interface LoginPageProps {
  onLoginSuccess: (role: UserRole, user: { name: string; email: string }) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();

  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [email, setEmail] = useState(
    () => (location.state as { email?: string } | null)?.email || ''
  );
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [googleError, setGoogleError] = useState('');

  // Role Mismatch Prompt Modal State
  const [roleMismatchSession, setRoleMismatchSession] = useState<PendingRoleMismatchSession | null>(
    null
  );

  useEffect(() => {
    const passedEmail = (location.state as { email?: string } | null)?.email;
    if (passedEmail) {
      setEmail(passedEmail);
    }
  }, [location.state]);

  // Forgot Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'reset' | 'success'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const activeRoleConfig = ROLES.find((r) => r.id === selectedRole) || ROLES[0];
  const activeRoleTitle = activeRoleConfig.title;

  const completeLogin = (
    user: { name: string; email: string; role?: string; [key: string]: unknown },
    roleToSet: UserRole,
    accessToken?: string
  ) => {
    if (accessToken) {
      localStorage.setItem('readease_access_token', accessToken);
    }

    const sessionUser = {
      ...user,
      role: roleToSet,
      ...(accessToken ? { accessToken } : {})
    };

    if (rememberMe) {
      localStorage.setItem('readease_user', JSON.stringify(sessionUser));
      localStorage.setItem('readease_role', roleToSet);
    }

    setSelectedRole(roleToSet);
    onLoginSuccess(roleToSet, sessionUser);
    const roleRoutes: Record<string, string> = {
      student: '/student/dashboard',
      teacher: '/teacher/dashboard',
      'special-educator': '/educator/dashboard',
      special_educator: '/educator/dashboard',
      parent: '/parent/dashboard',
      admin: '/dashboard'
    };
    navigate(roleRoutes[roleToSet] || '/student/dashboard');
  };

  const handleConfirmRoleSwitch = () => {
    if (!roleMismatchSession) return;
    const { user, actualRole, accessToken } = roleMismatchSession;
    setRoleMismatchSession(null);
    completeLogin(user, actualRole, accessToken);
  };

  const handleCancelRoleSwitch = () => {
    setRoleMismatchSession(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setLoginError('');

    try {
      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password
        })
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data || !data.success) {
        const errorMsg = data?.error?.message || data?.message;
        throw new Error(
          errorMsg ||
            (response.status >= 500
              ? 'Unable to connect to server. Please check backend connection.'
              : 'Invalid email or password')
        );
      }

      const user = data.data.user;
      const actualRole = normalizeRole(user.role);

      // Check if user account belongs to a different portal than selected
      if (actualRole !== selectedRole) {
        setRoleMismatchSession({
          user,
          accessToken: data.data.accessToken,
          actualRole,
          selectedRole
        });
        return;
      }

      completeLogin(user, actualRole, data.data.accessToken);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : 'Invalid email or password. Please try again.';
      setLoginError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForgotModal = () => {
    setForgotEmail(email.trim());
    setForgotOtp('');
    setForgotNewPassword('');
    setForgotConfirmPassword('');
    setForgotError('');
    setForgotStep('email');
    setIsForgotModalOpen(true);
  };

  const handleSendForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotLoading(true);
    setForgotError('');

    try {
      const response = await fetch('/api/v1/auth/forgot-password/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim().toLowerCase() })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data || !data.success) {
        throw new Error(
          data?.error?.message ||
            data?.message ||
            (response.status >= 500
              ? 'Unable to connect to server. Please check backend connection.'
              : 'Failed to dispatch verification code')
        );
      }

      setForgotStep('reset');
    } catch (err: unknown) {
      setForgotError(err instanceof Error ? err.message : 'Failed to send reset code');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (forgotOtp.trim().length !== 6) {
      setForgotError(language === 'ML' ? '6-അക്ക കോഡ് നൽകുക' : 'Please enter the 6-digit code');
      return;
    }

    if (forgotNewPassword.length < 6) {
      setForgotError(
        language === 'ML'
          ? 'പാസ്‌വേഡിന് കുറഞ്ഞത് 6 അക്ഷരങ്ങൾ വേണം'
          : 'Password must be at least 6 characters'
      );
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError(
        language === 'ML' ? 'പാസ്‌വേഡുകൾ തമ്മിൽ പൊരുത്തപ്പെടുന്നില്ല' : 'Passwords do not match'
      );
      return;
    }

    setForgotLoading(true);

    try {
      const response = await fetch('/api/v1/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail.trim().toLowerCase(),
          otp: forgotOtp.trim(),
          newPassword: forgotNewPassword
        })
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data || !data.success) {
        throw new Error(
          data?.error?.message ||
            data?.message ||
            (response.status >= 500
              ? 'Unable to connect to server. Please check backend connection.'
              : 'Password reset failed. Please check your verification code.')
        );
      }

      setForgotStep('success');
      setEmail(forgotEmail);
    } catch (err: unknown) {
      setForgotError(
        err instanceof Error ? err.message : 'Failed to reset password. Please check your code.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleError('');
    setIsGoogleLoading(true);

    try {
      // 1. Trigger Google's real OAuth popup ("Choose an account" screen)
      const credential = await initiateGoogleSignIn('signin');

      // 2. Send the Google ID token + selected role to our backend
      const response = await loginWithGoogleApi(credential, selectedRole);
      const actualRole = normalizeRole(response.user.role);

      const userSession = {
        name: response.user.name,
        email: response.user.email,
        role: actualRole,
        provider: 'google',
        profileImage: response.user.profileImage
      };

      // Check if user account belongs to a different portal than selected
      if (actualRole !== selectedRole) {
        const token = localStorage.getItem('readease_access_token') || undefined;
        setRoleMismatchSession({
          user: userSession,
          accessToken: token,
          actualRole,
          selectedRole
        });
        return;
      }

      // Complete login directly if role matches
      completeLogin(userSession, actualRole);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google sign-in failed';
      // Don't show error for user-initiated cancellations
      if (!message.includes('cancelled') && !message.includes('skipped')) {
        setGoogleError(message);
      }
      console.warn('Google sign-in error:', message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="py-12 md:py-20 px-4 sm:px-6 max-w-container mx-auto flex justify-center items-center">
        <div className="w-full max-w-md space-y-6">
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
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-container rounded-full text-xs font-bold uppercase tracking-wider border border-primary-200">
              <Lock size={13} /> ReadEase Secure Authentication
            </div>
            <h1 className="text-display-lg-mobile md:text-headline-md font-bold text-text-primary">
              {language === 'ML' ? 'റീഡ്ഈസിലേക്ക് ലോഗിൻ ചെയ്യുക' : 'Welcome back to ReadEase'}
            </h1>
            <p className="text-body-md text-text-secondary">
              {language === 'ML'
                ? 'നിങ്ങളുടെ വ്യക്തിഗത വായനാ ക്രമീകരണങ്ങൾ ഉപയോഗിക്കാൻ പ്രവേശിക്കുക.'
                : 'Sign in to access your assistive reading workspace & cognitive aids.'}
            </p>
          </div>

          <Card variant="default" padding="lg" className="shadow-elevated border-surface-border">
            {/* Step 1: Role Selection at Top */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-text-muted uppercase tracking-wider block">
                  {language === 'ML' ? 'അക്കൗണ്ട് തരം തിരഞ്ഞെടുക്കുക' : 'Select Account Role'}
                </label>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-950/60 text-primary border border-primary-200 dark:border-primary-800">
                  {language === 'ML' ? `${activeRoleTitle} അക്കൗണ്ട്` : `Role: ${activeRoleTitle}`}
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

            {/* Login Error Message */}
            {loginError && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
                {loginError}
              </div>
            )}

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <Input
                label={language === 'ML' ? 'ഇമെയിൽ വിലാസം' : 'Email Address'}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={
                  selectedRole === 'student'
                    ? 'alex.chen@student.readease.edu'
                    : `${selectedRole}@readease.edu`
                }
                autoComplete="email"
              />

              <div className="space-y-1">
                <Input
                  label={language === 'ML' ? 'പാസ്‌വേഡ്' : 'Password'}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={language === 'ML' ? 'നിങ്ങളുടെ പാസ്‌വേഡ്' : 'Enter your password'}
                  autoComplete="current-password"
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
              </div>

              {/* Divider & Google One-Click Login - Positioned ABOVE Remember Me */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-surface-border" />
                  <span className="text-[11px] uppercase font-semibold text-text-muted tracking-wider">
                    {language === 'ML'
                      ? 'അല്ലെങ്കിൽ ഗൂഗിൾ വഴി ലോഗിൻ ചെയ്യുക'
                      : 'or continue with google'}
                  </span>
                  <div className="flex-1 h-px bg-surface-border" />
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
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
                        ? `${activeRoleTitle} ആയി ഗൂഗിൾ ലോഗിൻ`
                        : `Continue with Google as ${activeRoleTitle}`}
                  </span>
                </button>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-text-secondary">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary accent-primary cursor-pointer"
                  />
                  <span>{language === 'ML' ? 'ഓർത്തു വെക്കുക' : 'Remember me'}</span>
                </label>

                <button
                  type="button"
                  onClick={handleOpenForgotModal}
                  className="text-primary font-bold hover:underline bg-transparent border-0 p-0 cursor-pointer text-xs"
                >
                  {language === 'ML' ? 'പാസ്‌വേഡ് മറന്നോ?' : 'Forgot password?'}
                </button>
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
                  ? `${activeRoleTitle} ആയി ലോഗിൻ ചെയ്യുക`
                  : `Sign In as ${activeRoleTitle}`}
              </Button>
            </form>
          </Card>

          {/* Google Error Message */}
          {googleError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
              {googleError}
            </div>
          )}

          {/* Footer Switcher */}
          <div className="text-center text-sm text-text-secondary space-y-2">
            <p>
              {language === 'ML' ? 'അക്കൗണ്ട് ഇല്ലേ?' : "Don't have a ReadEase account?"}{' '}
              <Link to="/signup" className="text-primary font-bold hover:underline">
                {language === 'ML' ? 'ഇവിടെ പുതിയത് തുടങ്ങാം (Sign Up)' : 'Create one now'}
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal with 6-Digit Email OTP Verification */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title={language === 'ML' ? 'പാസ്‌വേഡ് പുനഃക്രമീകരിക്കുക' : 'Reset Account Password'}
        description={
          forgotStep === 'email'
            ? language === 'ML'
              ? 'നിങ്ങളുടെ രജിസ്റ്റർ ചെയ്ത ഇമെയിൽ വിലാസം നൽകുക. ഞങ്ങൾ ഒരു 6-അക്ക സ്ഥിരീകരണ കോഡ് അയക്കും.'
              : 'Enter your registered email address to receive a 6-digit verification code.'
            : forgotStep === 'reset'
              ? language === 'ML'
                ? `${forgotEmail} എന്ന ഇമെയിലിലേക്ക് അയച്ച 6-അക്ക കോഡും പുതിയ പാസ്‌വേഡും നൽകുക:`
                : `Enter the 6-digit code dispatched to ${forgotEmail} and set your new password:`
              : undefined
        }
      >
        <div className="space-y-4">
          {forgotError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-medium">
              {forgotError}
            </div>
          )}

          {forgotStep === 'email' && (
            <form onSubmit={handleSendForgotOtp} className="space-y-4">
              <Input
                label={language === 'ML' ? 'ഇമെയിൽ വിലാസം' : 'Registered Email Address'}
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="name@readease.edu"
                iconLeft={<Mail size={16} />}
                autoComplete="email"
              />

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setIsForgotModalOpen(false)}>
                  {language === 'ML' ? 'റദ്ദാക്കുക' : 'Cancel'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={forgotLoading}
                  iconRight={<ArrowRight size={16} />}
                >
                  {language === 'ML' ? 'കോഡ് അയക്കുക' : 'Send Reset Code'}
                </Button>
              </div>
            </form>
          )}

          {forgotStep === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Input
                label={language === 'ML' ? '6-അക്ക സ്ഥിരീകരണ കോഡ്' : '6-Digit Verification Code'}
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={forgotOtp}
                onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                iconLeft={<KeyRound size={16} />}
              />

              <Input
                label={language === 'ML' ? 'പുതിയ പാസ്‌വേഡ്' : 'New Password'}
                type={showForgotNewPassword ? 'text' : 'password'}
                required
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                iconRight={
                  <button
                    type="button"
                    onClick={() => setShowForgotNewPassword((p) => !p)}
                    className="p-1 text-text-muted hover:text-text-primary"
                  >
                    {showForgotNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />

              <Input
                label={language === 'ML' ? 'പാസ്‌വേഡ് വീണ്ടും നൽകുക' : 'Confirm New Password'}
                type={showForgotNewPassword ? 'text' : 'password'}
                required
                value={forgotConfirmPassword}
                onChange={(e) => setForgotConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setForgotStep('email')}
                  className="text-xs text-text-muted hover:text-text-primary underline cursor-pointer"
                >
                  {language === 'ML' ? 'ഇമെയിൽ മാറ്റുക' : 'Change email'}
                </button>

                <div className="flex gap-2">
                  <Button type="button" variant="ghost" onClick={() => setIsForgotModalOpen(false)}>
                    {language === 'ML' ? 'റദ്ദാക്കുക' : 'Cancel'}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={forgotLoading}
                    iconLeft={<CheckCircle2 size={16} />}
                  >
                    {language === 'ML' ? 'പാസ്‌വേഡ് മാറ്റുക' : 'Update Password'}
                  </Button>
                </div>
              </div>
            </form>
          )}

          {forgotStep === 'success' && (
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={26} />
              </div>
              <div className="space-y-1">
                <h3 className="text-headline-sm font-bold text-text-primary">
                  {language === 'ML'
                    ? 'പാസ്‌വേഡ് വിജയകരമായി മാറ്റി!'
                    : 'Password Updated Successfully!'}
                </h3>
                <p className="text-body-sm text-text-secondary">
                  {language === 'ML'
                    ? 'നിങ്ങളുടെ പുതിയ പാസ്‌വേഡ് ഉപയോഗിച്ച് ഇപ്പോൾ ലോഗിൻ ചെയ്യാം.'
                    : 'Your account password has been updated. You may now sign in.'}
                </p>
              </div>
              <Button
                type="button"
                variant="primary"
                className="w-full justify-center"
                onClick={() => setIsForgotModalOpen(false)}
              >
                {language === 'ML' ? 'ഇപ്പോൾ ലോഗിൻ ചെയ്യുക' : 'Sign In Now'}
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Role Mismatch Detection Modal */}
      <Modal
        isOpen={Boolean(roleMismatchSession)}
        onClose={handleCancelRoleSwitch}
        title={language === 'ML' ? 'അക്കൗണ്ട് റോൾ പൊരുത്തക്കേട്' : 'Account Role Mismatch'}
        description={
          language === 'ML'
            ? 'നിങ്ങൾ തിരഞ്ഞെടുത്ത പോർട്ടലിൽ നിന്നല്ല ഈ അക്കൗണ്ട് രജിസ്റ്റർ ചെയ്തിട്ടുള്ളത്.'
            : 'Your account is registered under a different portal than the one selected.'
        }
      >
        {roleMismatchSession &&
          (() => {
            const attemptedConfig =
              ROLES.find((r) => r.id === roleMismatchSession.selectedRole) || ROLES[0];
            const actualConfig =
              ROLES.find((r) => r.id === roleMismatchSession.actualRole) || ROLES[0];

            return (
              <div className="space-y-5">
                {/* Visual Comparison Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] items-center gap-3 p-4 rounded-xl bg-surface-low border border-surface-border">
                  {/* Attempted / Selected Role */}
                  <div className="p-3 rounded-lg bg-surface-lowest border border-surface-border flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-surface text-text-muted">
                      {attemptedConfig.icon}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-semibold text-text-muted block truncate">
                        {language === 'ML' ? 'തിരഞ്ഞെടുത്ത പോർട്ടൽ' : 'Selected Portal'}
                      </span>
                      <span className="text-sm font-bold text-text-secondary line-through decoration-red-500/60 block truncate">
                        {attemptedConfig.title}
                      </span>
                    </div>
                  </div>

                  {/* Arrow indicator */}
                  <div className="flex justify-center text-text-muted py-1">
                    <ArrowRight size={20} className="rotate-90 sm:rotate-0 text-primary" />
                  </div>

                  {/* Actual Registered Role */}
                  <div className="p-3 rounded-lg bg-primary-50/70 dark:bg-primary-950/40 border-2 border-primary ring-1 ring-primary/30 flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      {actualConfig.icon}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-primary block truncate">
                        {language === 'ML' ? 'രജിസ്റ്റർ ചെയ്ത റോൾ' : 'Your Actual Role'}
                      </span>
                      <span className="text-sm font-extrabold text-text-primary block truncate">
                        {actualConfig.title}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Informational Message */}
                <div className="p-4 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs sm:text-sm space-y-2">
                  <p className="leading-relaxed">
                    {language === 'ML' ? (
                      <>
                        <strong>{roleMismatchSession.user.email}</strong> എന്ന അക്കൗണ്ട്{' '}
                        <strong>{actualConfig.title}</strong> പോർട്ടലിൽ രജിസ്റ്റർ ചെയ്തതാണ്. എന്നാൽ
                        നിങ്ങൾ ഇപ്പോൾ <strong>{attemptedConfig.title}</strong> പോർട്ടലിലൂടെയാണ്
                        ലോഗിൻ ചെയ്യാൻ ശ്രമിക്കുന്നത്.
                      </>
                    ) : (
                      <>
                        The account for <strong>{roleMismatchSession.user.email}</strong> is
                        registered as a <strong>{actualConfig.title}</strong>, but you are currently
                        signing in through the <strong>{attemptedConfig.title}</strong> portal.
                      </>
                    )}
                  </p>
                  <p className="font-semibold">
                    {language === 'ML'
                      ? `നിങ്ങൾക്ക് ${actualConfig.title} ആയി ലോഗിൻ ചെയ്യണോ?`
                      : `Would you like to log in as a ${actualConfig.title} instead?`}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancelRoleSwitch}
                    className="w-full sm:w-auto"
                  >
                    {language === 'ML' ? 'റദ്ദാക്കുക' : 'Cancel'}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleConfirmRoleSwitch}
                    iconRight={<ArrowRight size={16} />}
                    className="w-full sm:w-auto font-bold shadow-soft"
                  >
                    {language === 'ML'
                      ? `${actualConfig.title} ആയി ലോഗിൻ ചെയ്യുക`
                      : `Yes, Log in as ${actualConfig.title}`}
                  </Button>
                </div>
              </div>
            );
          })()}
      </Modal>
    </PublicLayout>
  );
};
export default LoginPage;
