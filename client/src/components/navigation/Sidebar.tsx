import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  FolderKanban,
  Award,
  SlidersHorizontal,
  GraduationCap,
  Users,
  FileCheck,
  Brain,
  Activity,
  ClipboardList,
  Sparkles,
  ShieldAlert,
  Database,
  HeartHandshake,
  LogOut,
  Play
} from 'lucide-react';

export type UserRole = 'student' | 'teacher' | 'special-educator' | 'parent' | 'admin';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  badge?: string;
}

export interface SidebarProps {
  role: UserRole;
  activeItemId?: string;
  onItemSelect?: (id: string) => void;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
  onPrimaryAction?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  role,
  activeItemId = 'dashboard',
  onItemSelect,
  userName = 'Alex Johnson',
  userEmail = 'alex@readease.edu',
  onLogout,
  onPrimaryAction
}) => {
  const getRoleConfig = () => {
    switch (role) {
      case 'student':
        return {
          title: 'Student Portal',
          primaryActionLabel: 'Start Daily Practice',
          primaryActionIcon: <Play size={18} />,
          navItems: [
            {
              id: 'dashboard',
              label: 'Dashboard',
              icon: <LayoutDashboard size={20} />,
              href: '#dashboard'
            },
            {
              id: 'reading-studio',
              label: 'Reading Studio',
              icon: <BookOpen size={20} />,
              href: '#studio',
              badge: 'Active'
            },
            {
              id: 'library',
              label: 'My Documents',
              icon: <FolderKanban size={20} />,
              href: '#library'
            },
            {
              id: 'progress',
              label: 'Achievements & Badges',
              icon: <Award size={20} />,
              href: '#progress'
            },
            {
              id: 'assessment',
              label: 'Reading Assessment',
              icon: <Activity size={20} />,
              href: '#assessment'
            },
            {
              id: 'preferences',
              label: 'Reading Customizer',
              icon: <SlidersHorizontal size={20} />,
              href: '#preferences'
            }
          ]
        };

      case 'teacher':
        return {
          title: 'Educator Portal',
          primaryActionLabel: 'Assign New Reading',
          primaryActionIcon: <BookOpen size={18} />,
          navItems: [
            {
              id: 'dashboard',
              label: 'Class Overview',
              icon: <LayoutDashboard size={20} />,
              href: '#dashboard'
            },
            { id: 'roster', label: 'Class Roster', icon: <Users size={20} />, href: '#roster' },
            {
              id: 'assignments',
              label: 'Reading Assignments',
              icon: <FileCheck size={20} />,
              href: '#assignments'
            },
            {
              id: 'student-reports',
              label: 'Reading Analytics',
              icon: <GraduationCap size={20} />,
              href: '#reports'
            },
            {
              id: 'lesson-plans',
              label: 'Lesson Materials',
              icon: <FolderKanban size={20} />,
              href: '#materials'
            },
            {
              id: 'settings',
              label: 'Class Settings',
              icon: <SlidersHorizontal size={20} />,
              href: '#settings'
            }
          ]
        };

      case 'special-educator':
        return {
          title: 'Special Education',
          primaryActionLabel: 'New Diagnostic Check',
          primaryActionIcon: <Brain size={18} />,
          navItems: [
            {
              id: 'dashboard',
              label: 'Caseload Overview',
              icon: <LayoutDashboard size={20} />,
              href: '#dashboard'
            },
            {
              id: 'iep-tracking',
              label: 'IEP Reading Goals',
              icon: <ClipboardList size={20} />,
              href: '#iep',
              badge: '3 Due'
            },
            {
              id: 'diagnostics',
              label: 'Diagnostic Assessments',
              icon: <Activity size={20} />,
              href: '#diagnostics'
            },
            {
              id: 'phoneme-analytics',
              label: 'Phonemic Analysis',
              icon: <Sparkles size={20} />,
              href: '#phonemes'
            },
            {
              id: 'custom-profiles',
              label: 'Accommodation Profiles',
              icon: <SlidersHorizontal size={20} />,
              href: '#profiles'
            }
          ]
        };

      case 'parent':
        return {
          title: 'Parent Companion',
          primaryActionLabel: 'Log Home Reading',
          primaryActionIcon: <BookOpen size={18} />,
          navItems: [
            {
              id: 'dashboard',
              label: 'Child Progress',
              icon: <LayoutDashboard size={20} />,
              href: '#dashboard'
            },
            {
              id: 'reading-log',
              label: 'Home Reading Log',
              icon: <BookOpen size={20} />,
              href: '#log'
            },
            {
              id: 'presets',
              label: 'Home Accommodations',
              icon: <SlidersHorizontal size={20} />,
              href: '#presets'
            },
            {
              id: 'educator-notes',
              label: 'Teacher Collaboration',
              icon: <HeartHandshake size={20} />,
              href: '#notes'
            }
          ]
        };

      case 'admin':
        return {
          title: 'Admin Console',
          primaryActionLabel: 'System Diagnostics',
          primaryActionIcon: <Activity size={18} />,
          navItems: [
            {
              id: 'dashboard',
              label: 'System Health',
              icon: <LayoutDashboard size={20} />,
              href: '#dashboard'
            },
            {
              id: 'users',
              label: 'User & Role Management',
              icon: <Users size={20} />,
              href: '#users'
            },
            {
              id: 'ai-pipeline',
              label: 'AI & OCR Service',
              icon: <Brain size={20} />,
              href: '#ai-pipeline'
            },
            {
              id: 'rag-kb',
              label: 'RAG Knowledge Base',
              icon: <Database size={20} />,
              href: '#rag'
            },
            {
              id: 'audit-logs',
              label: 'Audit & Compliance Logs',
              icon: <ShieldAlert size={20} />,
              href: '#logs'
            }
          ]
        };
    }
  };

  const config = getRoleConfig();

  return (
    <aside
      aria-label="Application Sidebar"
      className="w-full h-full bg-surface-lowest border-r border-surface-border flex flex-col justify-between p-6 overflow-y-auto"
    >
      {/* Top Header & User Card */}
      <div className="space-y-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-primary-container p-2.5 rounded-xl text-white shadow-soft">
            <BookOpen size={22} aria-hidden="true" />
          </div>
          <div>
            <span className="text-headline-md font-bold text-primary block leading-none">
              ReadEase
            </span>
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">
              {config.title}
            </span>
          </div>
        </div>

        {/* User Status Card */}
        <div className="p-4 bg-surface-low border border-surface-border rounded-xl space-y-3 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary-50 border-2 border-primary-200 flex items-center justify-center text-primary font-bold text-body-md shadow-sm">
              {userName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-label-md font-semibold text-text-primary truncate">{userName}</p>
              <p className="text-xs text-text-muted truncate">{userEmail}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onPrimaryAction}
            className="w-full min-h-[44px] px-3 py-2.5 bg-primary text-white text-label-md font-semibold rounded-lg hover:bg-primary-hover shadow-soft transition-all flex items-center justify-center gap-2 focus-visible:ring-2 focus-visible:ring-primary"
          >
            {config.primaryActionIcon}
            <span>{config.primaryActionLabel}</span>
          </button>
        </div>

        {/* Navigation Item List */}
        <nav aria-label={`${config.title} Navigation`}>
          <ul className="space-y-1.5" role="list">
            {config.navItems.map((item) => {
              const isActive = activeItemId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onItemSelect?.(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-label-md font-medium transition-all duration-150 min-h-[48px] focus-visible:ring-2 focus-visible:ring-primary ${
                      isActive
                        ? 'bg-secondary-container text-secondary-onContainer font-semibold shadow-soft translate-x-1'
                        : 'text-text-secondary hover:bg-surface-low hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-secondary-onContainer' : 'text-primary'}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="px-2 py-0.5 text-[0.7rem] font-bold bg-primary-100 text-primary-dark rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Bottom Actions */}
      <div className="pt-6 border-t border-surface-border">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-label-md font-medium text-text-secondary hover:bg-feedback-errorContainer hover:text-feedback-error transition-colors focus-visible:ring-2 focus-visible:ring-feedback-error"
        >
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
