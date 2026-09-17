import React, { useState } from 'react';
import { Modal, Input, Button, Badge } from '../ui';
import type { UserRole } from '../navigation/Sidebar';
import {
  GraduationCap,
  BookOpen,
  Brain,
  Users,
  LogIn,
  UserPlus,
  ArrowRight,
  Sparkles
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
  const [email, setEmail] = useState('alex.chen@student.readease.edu');
  const [password, setPassword] = useState('Password123!');
  const [name, setName] = useState('Alex Chen');
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelect = (roleId: UserRole) => {
    setSelectedRole(roleId);
    const roleConfig = ROLES.find((r) => r.id === roleId);
    if (roleConfig) {
      setName(roleConfig.defaultName);
      setEmail(`${roleId}@readease.edu`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Realistic transition delay for smooth UX
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(selectedRole, {
        name: name || 'Demo User',
        email: email || `${selectedRole}@readease.edu`
      });
      onClose();
    }, 400);
  };

  const handleQuickDemoLogin = (roleId: UserRole) => {
    const roleConfig = ROLES.find((r) => r.id === roleId);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(roleId, {
        name: roleConfig?.defaultName || 'Demo User',
        email: `${roleId}@readease.edu`
      });
      onClose();
    }, 300);
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
            />
          )}

          <Input
            label="Email Address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@readease.edu"
          />

          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
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

        {/* Quick Demo Switcher */}
        <div className="pt-4 border-t border-surface-border space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Sparkles size={13} className="text-secondary" />
            <span className="font-semibold uppercase tracking-wider">Quick Demo Access</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ROLES.map((r) => (
              <button
                key={`quick-${r.id}`}
                type="button"
                onClick={() => handleQuickDemoLogin(r.id)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-surface-low hover:bg-primary-50 hover:text-primary border border-surface-border text-text-secondary font-medium transition-colors"
              >
                Launch as {r.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AuthModal;
