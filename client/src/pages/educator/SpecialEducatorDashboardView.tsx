import React, { useState, useEffect } from 'react';
import {
  Brain,
  Users,
  ClipboardList,
  Activity,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  MessageSquareText
} from 'lucide-react';
import { Button, Card, Badge } from '../../components/ui';
import { AiChatbotDrawer } from '../../components/chat/AiChatbotDrawer';

interface EducatorDashboardProps {
  userName?: string;
  onNavigateTab: (tabId: string) => void;
}

import { getStoredToken } from '../../utils/auth';

const IEP_ITEMS = [
  {
    id: 'iep_1',
    student: 'Alex Student',
    studentId: 'std_alex_1',
    email: 'student@readease.com',
    goal: 'Reduce saccadic regression rate to <15% & reach 110 WPM',
    progress: 68,
    dueDate: '2026-10-25',
    status: 'needs-attention'
  },
  {
    id: 'iep_2',
    student: 'Maya Sharma',
    studentId: 'std_maya_2',
    email: 'maya.s@readease.edu',
    goal: 'Master consonant blends (str-, spl-) with 95% oral accuracy',
    progress: 82,
    dueDate: '2026-11-05',
    status: 'on-track'
  },
  {
    id: 'iep_3',
    student: 'Liam Chen',
    studentId: 'std_liam_3',
    email: 'liam.chen@readease.edu',
    goal: 'Complete daily polysyllabic chunking with 90% comprehension',
    progress: 90,
    dueDate: '2026-11-12',
    status: 'on-track'
  }
];

export const SpecialEducatorDashboardView: React.FC<EducatorDashboardProps> = ({
  userName = 'Specialist',
  onNavigateTab
}) => {
  const [isAiBuddyOpen, setIsAiBuddyOpen] = useState(false);
  const [data, setData] = useState<{ assignedCount: number; recentSessions: unknown[] } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetch('/api/v1/educator/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setData(d.data);
          setError(null);
        } else {
          setError(d.message || 'API error');
        }
      })
      .catch(() => setError('Could not reach server'))
      .finally(() => setLoading(false));
  }, []);

  const dueSoon = IEP_ITEMS.filter((i) => i.status === 'needs-attention').length;

  return (
    <div
      className={`space-y-8 animate-fade-in pb-16 transition-all ${isAiBuddyOpen ? 'lg:mr-[420px]' : ''}`}
    >
      {/* Hero */}
      <Card variant="highlight" padding="lg" className="border border-tertiary/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-tertiary-50 text-tertiary-dark rounded-full text-xs font-bold uppercase tracking-wider border border-tertiary/20">
              <span className="w-2 h-2 rounded-full bg-tertiary" /> Special Education Suite
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-editorial font-normal text-text-primary tracking-tight">
              Welcome, {userName}!
            </h1>
            <p className="text-body-md text-text-secondary max-w-xl">
              Your caseload overview and IEP reading goals are ready. Track intervention progress
              and phonemic milestones for your assigned students.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              iconLeft={<Brain size={18} />}
              onClick={() => onNavigateTab('diagnostics')}
            >
              New Diagnostic
            </Button>
            <Button variant="outline" size="lg" onClick={() => onNavigateTab('iep-tracking')}>
              IEP Goals
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
          <AlertCircle size={18} />
          <p className="text-sm">{error} — showing sample data below.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Assigned Students',
            value: loading ? '—' : String(data?.assignedCount ?? 3),
            icon: <Users size={18} className="text-primary" />,
            sub: 'Active caseload'
          },
          {
            label: 'IEP Goals Active',
            value: String(IEP_ITEMS.length),
            icon: <ClipboardList size={18} className="text-tertiary" />,
            sub: `${dueSoon} need attention`
          },
          {
            label: 'Sessions This Week',
            value: loading ? '—' : String(data?.recentSessions?.length ?? 5),
            icon: <Activity size={18} className="text-secondary" />,
            sub: 'Across all students'
          },
          {
            label: 'Avg. Progress',
            value: `${Math.round(IEP_ITEMS.reduce((a, i) => a + i.progress, 0) / IEP_ITEMS.length)}%`,
            icon: <TrendingUp size={18} className="text-primary-container" />,
            sub: 'Toward IEP goals'
          }
        ].map((s) => (
          <Card key={s.label} variant="subtle" padding="sm">
            <div className="flex items-center gap-2 mb-1">
              {s.icon}
              <span className="text-xs font-semibold text-text-muted">{s.label}</span>
            </div>
            <p className="text-display-lg-mobile font-bold text-text-primary">{s.value}</p>
            <p className="text-xs text-text-muted">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* IEP Goals Overview */}
      <Card variant="default" padding="lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-headline-sm font-bold text-text-primary flex items-center gap-2">
            <ClipboardList size={20} className="text-tertiary" /> IEP Reading Goals
          </h2>
          <Badge variant="secondary" dot>
            {dueSoon} Due Soon
          </Badge>
        </div>

        <div className="space-y-4">
          {IEP_ITEMS.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all ${
                item.status === 'needs-attention'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-surface-low border-surface-border'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className="font-bold text-text-primary">{item.student}</p>
                  <p className="text-sm text-text-secondary">{item.goal}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={item.status === 'needs-attention' ? 'secondary' : 'tertiary'} dot>
                    {item.status === 'needs-attention' ? 'Attention' : 'On Track'}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-surface-border rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      item.progress >= 80
                        ? 'bg-tertiary'
                        : item.progress >= 50
                          ? 'bg-primary'
                          : 'bg-secondary'
                    }`}
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-text-primary w-8">{item.progress}%</span>
                <span className="text-xs text-text-muted">Due {item.dueDate}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            id: 'iep-tracking',
            label: 'IEP Tracking',
            icon: <ClipboardList size={20} className="text-tertiary" />,
            desc: 'Goals, milestones, and notes'
          },
          {
            id: 'diagnostics',
            label: 'Diagnostics',
            icon: <Activity size={20} className="text-primary" />,
            desc: 'Reading screening assessments'
          },
          {
            id: 'phoneme-analytics',
            label: 'Phonemic Analysis',
            icon: <Brain size={20} className="text-secondary" />,
            desc: 'Malayalam/English phoneme data'
          }
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigateTab(item.id)}
            className="p-5 rounded-2xl border border-surface-border bg-surface-low hover:bg-surface-lowest hover:border-primary-200 hover:shadow-soft transition-all text-left flex items-center gap-4 group"
          >
            <div className="p-3 rounded-xl bg-surface-lowest border border-surface-border group-hover:scale-105 transition-transform">
              {item.icon}
            </div>
            <div>
              <p className="font-bold text-text-primary text-label-lg">{item.label}</p>
              <p className="text-xs text-text-secondary">{item.desc}</p>
            </div>
            <ChevronRight
              size={16}
              className="ml-auto text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </button>
        ))}
      </div>

      {/* AI Assistant Trigger */}
      <button
        type="button"
        onClick={() => setIsAiBuddyOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-tertiary text-white rounded-xl shadow-soft flex items-center justify-center hover:bg-tertiary-dark active:scale-95 transition-all border border-tertiary/20"
        aria-label="Open AI Assistant"
      >
        <MessageSquareText size={20} className="text-white" />
      </button>

      <AiChatbotDrawer
        isOpen={isAiBuddyOpen}
        onClose={() => setIsAiBuddyOpen(false)}
        roleContext="special-educator"
        userName={userName}
      />
    </div>
  );
};
