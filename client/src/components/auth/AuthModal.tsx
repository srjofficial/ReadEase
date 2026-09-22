import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Badge } from '../ui';
import type { UserRole } from '../navigation/Sidebar';
import { GoogleIcon } from '../../pages/auth/LoginPage';
import {
  GraduationCap,
  BookOpen,
  Brain,
  Users,
  LogIn,
  UserPlus,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';

export interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onLoginSuccess: (role: UserRole, user: { name: string; email: string }) => void;
}

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

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  onLoginSuccess
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Clear fields and sync mode whenever modal opens or initialMode changes
  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setEmail('');
      setPassword('');
      setName('');
      setShowPassword(false);
    }
  }, [isOpen, initialMode]);

  const handleRoleSelect = (roleId: UserRole) => {
    setSelectedRole(roleId);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const roleConfig = ROLES.find((r) => r.id === selectedRole);
    // Realistic transition delay for smooth UX
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(selectedRole, {
        name: name.trim() || roleConfig?.defaultName || 'Reader',
        email: email.trim() || `${selectedRole}@readease.edu`
      });
      onClose();
    }, 400);
  };

  const handleGoogleAuth = () => {
    setIsGoogleLoading(true);
    setTimeout(() => {
      setIsGoogleLoading(false);
      onLoginSuccess(selectedRole, {
        name: name.trim() || 'Google Reader',
        email: 'user.google@gmail.com'
      });
      onClose();
    }, 500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'login' ? 'Sign in to ReadEase' : 'Create your ReadEase account'}
      description={
        mode === 'login'
          ? 'Access your personalized dyslexia-friendly workspace.'
          : 'Start reading with evidence-based cognitive assistive tools.'
      }
    >
      <div className="space-y-6 pt-2">
        <div className="flex justify-center -mt-1 mb-2">
          <img
            src="/ReadEase_wordmark_transparent.svg"
            alt="ReadEase"
            className="h-8 w-auto object-contain"
          />
        </div>

        {/* Mode Toggle (Login vs Sign Up) */}
        <div className="flex bg-surface-low p-1 rounded-xl border border-surface-border">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 text-label-md font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === 'login'
                ? 'bg-surface-lowest text-primary shadow-soft'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <LogIn size={16} />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 text-label-md font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              mode === 'signup'
                ? 'bg-surface-lowest text-primary shadow-soft'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <UserPlus size={16} />
            <span>Create Account</span>
          </button>
        </div>

        {/* Google Authentication */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isGoogleLoading || isLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-surface-lowest hover:bg-surface-low border border-surface-border hover:border-primary-300 rounded-xl font-semibold text-sm text-text-primary transition-all shadow-xs hover:shadow-soft active:scale-[0.99] disabled:opacity-60 cursor-pointer"
          >
            {isGoogleLoading ? (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <GoogleIcon size={18} />
            )}
            <span>
              {isGoogleLoading
                ? 'Connecting with Google...'
                : mode === 'login'
                  ? 'Continue with Google'
                  : 'Sign up with Google'}
            </span>
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-surface-border" />
            <span className="text-[11px] uppercase font-semibold text-text-muted tracking-wider">
              or continue with email
            </span>
            <div className="flex-1 h-px bg-surface-border" />
          </div>
        </div>

        {/* Role Selector */}
        <div className="space-y-2.5">
          <label className="text-label-md font-bold text-text-primary flex items-center justify-between">
            <span>Select Account Role</span>
            <Badge variant="primary">Active: {selectedRole.toUpperCase()}</Badge>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => handleRoleSelect(r.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                  selectedRole === r.id
                    ? 'border-primary bg-primary-50/70 shadow-soft ring-2 ring-primary/20'
                    : 'border-surface-border bg-surface-lowest hover:border-primary-200 hover:bg-surface-low'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold text-text-primary text-label-md">
                  {r.icon}
                  <span>{r.title}</span>
                </div>
                <span className="text-[0.72rem] text-text-secondary leading-tight line-clamp-2">
                  {r.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <Input
              label="Full Name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Chen"
              autoComplete="name"
            />
          )}

          <Input
            label="Email Address"
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

          <Input
            label="Password"
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signup' ? 'Create a secure password' : 'Enter your password'}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            iconRight={
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-high transition-colors focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-center cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff
                    size={18}
                    className="text-primary transition-all animate-in fade-in"
                    aria-hidden="true"
                  />
                ) : (
                  <Eye
                    size={18}
                    className="text-text-muted hover:text-text-primary transition-all"
                    aria-hidden="true"
                  />
                )}
              </button>
            }
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full justify-center"
            isLoading={isLoading}
            iconRight={<ArrowRight size={18} />}
          >
            {mode === 'login' ? `Sign In as ${selectedRole}` : `Create ${selectedRole} Account`}
          </Button>
        </form>
      </div>
    </Modal>
  );
};

export default AuthModal;
