import React, { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  TrendingUp,
  Activity,
  Plus,
  ChevronRight,
  Info,
  BarChart2,
  UserCheck,
  SlidersHorizontal,
  MessageSquareText
} from 'lucide-react';
import { Button, Card, Badge } from '../../components/ui';
import { AiChatbotDrawer } from '../../components/chat/AiChatbotDrawer';

interface TeacherDashboardViewProps {
  userName?: string;
  onNavigateTab: (tabId: string) => void;
}

import { getStoredToken } from '../../utils/auth';

const API_BASE = '/api/v1';

const DEMO_DASHBOARD_DATA = {
  studentCount: 14,
  maxStudents: 20,
  capacityPercent: 70,
  weeklyStats: { avgWpm: 118, totalSessions: 42 },
  recentSessions: [
    {
      _id: 's1',
      studentId: { name: 'Alex Student', email: 'alex@readease.edu' },
      readingSpeedWpm: 124,
      createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    },
    {
      _id: 's2',
      studentId: { name: 'Maya Sharma', email: 'maya@readease.edu' },
      readingSpeedWpm: 110,
      createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
    },
    {
      _id: 's3',
      studentId: { name: 'Liam Chen', email: 'liam@readease.edu' },
      readingSpeedWpm: 132,
      createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    },
    {
      _id: 's4',
      studentId: { name: 'Sophia Patel', email: 'sophia@readease.edu' },
      readingSpeedWpm: 105,
      createdAt: new Date(Date.now() - 28 * 3600 * 1000).toISOString()
    }
  ]
};

function useTeacherDashboard() {
  const [data, setData] = useState<typeof DEMO_DASHBOARD_DATA | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setData(DEMO_DASHBOARD_DATA);
      setLoading(false);
      return;
    }

    fetch(`${API_BASE}/teacher/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setData(d.data);
        } else {
          setData(DEMO_DASHBOARD_DATA);
          setError(d.message || null);
        }
      })
      .catch(() => {
        setData(DEMO_DASHBOARD_DATA);
      })
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({
  userName = 'Teacher',
  onNavigateTab
}) => {
  const [isAiBuddyOpen, setIsAiBuddyOpen] = useState(false);
  const { data, loading, error } = useTeacherDashboard();

  const stats = [
    {
      label: 'Total Students',
      value: loading ? '—' : String(data?.studentCount ?? 0),
      sub: `of ${data?.maxStudents ?? 20} capacity`,
      icon: <Users size={20} className="text-primary" />,
      color: 'bg-primary-50'
    },
    {
      label: 'Weekly Sessions',
      value: loading ? '—' : String(data?.weeklyStats?.totalSessions ?? 0),
      sub: 'past 7 days',
      icon: <Activity size={20} className="text-tertiary" />,
      color: 'bg-tertiary-50'
    },
    {
      label: 'Avg. Class WPM',
      value: loading ? '—' : String(Math.round(data?.weeklyStats?.avgWpm ?? 0)),
      sub: 'words per minute',
      icon: <TrendingUp size={20} className="text-secondary" />,
      color: 'bg-secondary-50'
    },
    {
      label: 'Roster Capacity',
      value: loading ? '—' : `${data?.capacityPercent ?? 0}%`,
      sub: 'class full at 100%',
      icon: <BarChart2 size={20} className="text-primary-container" />,
      color: 'bg-primary-50'
    }
  ];

  return (
    <div
      className={`space-y-8 animate-fade-in pb-16 transition-all duration-300 ${
        isAiBuddyOpen ? 'lg:mr-[420px] xl:mr-[440px]' : ''
      }`}
    >
      {/* Hero */}
      <Card variant="highlight" padding="lg" className="border border-primary-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-container rounded-full text-xs font-bold uppercase tracking-wider border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-tertiary" /> Educator Portal
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-editorial font-normal text-text-primary tracking-tight">
              Welcome, {userName}!
            </h1>
            <p className="text-body-md text-text-secondary max-w-xl">
              Your classroom is active. Review student progress, assign new readings, and track
              cohort fluency trends from your personalized educator workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              iconLeft={<Plus size={18} />}
              onClick={() => onNavigateTab('roster')}
            >
              Add Student
            </Button>
            <Button
              variant="outline"
              size="lg"
              iconLeft={<BookOpen size={18} />}
              onClick={() => onNavigateTab('assignments')}
            >
              Assign Reading
            </Button>
          </div>
        </div>
      </Card>

      {/* Offline / Development mode note */}
      {error && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-800 text-xs font-medium">
          <Info size={16} className="text-amber-600 flex-shrink-0" />
          <p>
            Development Mode: Showing simulated classroom cohort data.
          </p>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <Card key={s.label} variant="subtle" padding="sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-label-md font-semibold text-text-muted">{s.label}</span>
              <div className={`p-1.5 rounded-lg ${s.color}`}>{s.icon}</div>
            </div>
            <p className="text-display-lg-mobile font-bold text-text-primary">{s.value}</p>
            <p className="text-xs text-text-muted mt-0.5">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Capacity Bar */}
      {data && (
        <Card variant="default" padding="lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-headline-sm font-bold text-text-primary flex items-center gap-2">
              <UserCheck size={20} className="text-primary" /> Roster Capacity
            </h2>
            <Badge
              variant={
                data.capacityPercent >= 90
                  ? 'secondary'
                  : data.capacityPercent >= 70
                    ? 'secondary'
                    : 'primary'
              }
            >
              {data.studentCount} / {data.maxStudents} Students
            </Badge>
          </div>
          <div className="w-full bg-surface-border rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${
                data.capacityPercent >= 90
                  ? 'bg-red-400'
                  : data.capacityPercent >= 70
                    ? 'bg-secondary'
                    : 'bg-primary'
              }`}
              style={{ width: `${Math.min(100, data.capacityPercent)}%` }}
            />
          </div>
          <p className="text-xs text-text-muted mt-2">
            {data.maxStudents - data.studentCount} spots remaining in your class
          </p>
        </Card>
      )}

      {/* Recent Activity */}
      <Card variant="default" padding="lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-headline-sm font-bold text-text-primary">Recent Student Sessions</h2>
          <Button
            variant="ghost"
            size="sm"
            iconRight={<ChevronRight size={16} />}
            onClick={() => onNavigateTab('student-reports')}
          >
            View Analytics
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-surface-low rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data?.recentSessions?.length ? (
          <div className="space-y-3">
            {data.recentSessions.map((session) => {
              const studentName =
                typeof session.studentId === 'object'
                  ? session.studentId?.name || session.studentId?.email || 'Student'
                  : 'Student';
              return (
                <div
                  key={session._id}
                  className="flex items-center justify-between p-4 bg-surface-low rounded-xl border border-surface-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-50 flex items-center justify-center">
                      <BookOpen size={16} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-label-md font-semibold text-text-primary">{studentName}</p>
                      <p className="text-xs text-text-muted">
                        {new Date(session.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant="primary">{Math.round(session.readingSpeedWpm)} WPM</Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-text-muted">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No sessions yet</p>
            <p className="text-sm">
              Add students to your roster to see their reading activity here.
            </p>
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            id: 'roster',
            label: 'Manage Class Roster',
            icon: <Users size={20} className="text-primary" />,
            desc: 'Add, view, or remove students'
          },
          {
            id: 'assignments',
            label: 'Reading Assignments',
            icon: <BookOpen size={20} className="text-secondary" />,
            desc: 'Create and track passages'
          },
          {
            id: 'student-reports',
            label: 'Class Analytics',
            icon: <BarChart2 size={20} className="text-tertiary" />,
            desc: 'Fluency trends and reports'
          },
          {
            id: 'settings',
            label: 'Class Settings',
            icon: <SlidersHorizontal size={20} className="text-primary" />,
            desc: 'Accommodations & benchmarks'
          }
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigateTab(item.id)}
            className="p-5 rounded-2xl border border-surface-border bg-surface-low hover:bg-surface-lowest hover:border-primary-200 hover:shadow-soft transition-all text-left flex items-center gap-4 group"
          >
            <div className="p-3 rounded-xl bg-surface-lowest border border-surface-border shadow-soft group-hover:scale-105 transition-transform">
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

      {/* AI Assistant */}
      <button
        type="button"
        onClick={() => setIsAiBuddyOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-primary text-white rounded-xl shadow-soft flex items-center justify-center hover:bg-primary-hover active:scale-95 transition-all border border-primary/20"
        aria-label="Open AI Assistant"
      >
        <MessageSquareText size={20} className="text-white" />
      </button>

      <AiChatbotDrawer
        isOpen={isAiBuddyOpen}
        onClose={() => setIsAiBuddyOpen(false)}
        roleContext="teacher"
        userName={userName}
      />
    </div>
  );
};
