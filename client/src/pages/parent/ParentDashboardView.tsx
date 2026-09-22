import React, { useState, useEffect } from 'react';
import {
  HeartHandshake,
  BookOpen,
  Award,
  TrendingUp,
  Activity,
  Sparkles,
  ChevronRight,
  AlertCircle,
  Clock
} from 'lucide-react';
import { Button, Card, Badge } from '../../components/ui';
import { AiChatbotDrawer } from '../../components/chat/AiChatbotDrawer';
import { AnimatedBotIcon } from '../../components/chat/AnimatedBotIcon';

interface ParentDashboardProps {
  userName?: string;
  onNavigateTab: (tabId: string) => void;
}

import { getStoredToken } from '../../utils/auth';

interface ChildSession {
  readingSpeedWpm?: number;
  accuracyPercentage?: number;
  durationSeconds?: number;
  createdAt?: string;
}

interface ChildItem {
  profile?: {
    _id?: string;
    grade?: string;
    userId?: { _id?: string; name?: string; email?: string } | string;
  };
  latestSession?: ChildSession;
  weeklySessionCount?: number;
  badgeCount?: number;
}

// Demo data for when API isn't connected
const DEMO_CHILD = {
  name: 'Alex',
  weeklySessionCount: 5,
  badgeCount: 7,
  latestSession: {
    readingSpeedWpm: 112,
    accuracyPercentage: 88,
    durationSeconds: 840,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
};

const DEMO_MILESTONES = [
  { label: '5-Day Reading Streak', completed: true, date: '2026-09-20' },
  { label: '100 WPM Fluency', completed: true, date: '2026-09-18' },
  { label: 'Bilingual Reader Badge', completed: false, date: null },
  { label: '50 Sessions Complete', completed: false, date: null }
];

const WEEKLY_PROGRESS = [
  { day: 'Mon', minutes: 15 },
  { day: 'Tue', minutes: 22 },
  { day: 'Wed', minutes: 0 },
  { day: 'Thu', minutes: 18 },
  { day: 'Fri', minutes: 25 },
  { day: 'Sat', minutes: 30 },
  { day: 'Sun', minutes: 10 }
];

export const ParentDashboardView: React.FC<ParentDashboardProps> = ({
  userName = 'Parent',
  onNavigateTab
}) => {
  const [isAiBuddyOpen, setIsAiBuddyOpen] = useState(false);
  const [data, setData] = useState<{ children: ChildItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    fetch('/api/v1/parent/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setData(d.data);
          setError(null);
        } else {
          // If unauthenticated or token expired, show soft message
          setError(d.message || 'Unable to sync child data');
        }
      })
      .catch(() => setError('Could not reach server'))
      .finally(() => setLoading(false));
  }, []);

  const liveChild = data?.children?.[0];
  const liveChildName =
    typeof liveChild?.profile?.userId === 'object' && liveChild?.profile?.userId !== null
      ? (liveChild.profile.userId as { name?: string }).name
      : undefined;

  const child = liveChild
    ? {
        name: liveChildName || DEMO_CHILD.name,
        weeklySessionCount: liveChild.weeklySessionCount ?? DEMO_CHILD.weeklySessionCount,
        badgeCount: liveChild.badgeCount ?? DEMO_CHILD.badgeCount,
        latestSession: {
          readingSpeedWpm:
            liveChild.latestSession?.readingSpeedWpm ?? DEMO_CHILD.latestSession.readingSpeedWpm,
          accuracyPercentage:
            liveChild.latestSession?.accuracyPercentage ??
            DEMO_CHILD.latestSession.accuracyPercentage,
          durationSeconds:
            liveChild.latestSession?.durationSeconds ?? DEMO_CHILD.latestSession.durationSeconds,
          createdAt: liveChild.latestSession?.createdAt ?? DEMO_CHILD.latestSession.createdAt
        }
      }
    : DEMO_CHILD;
  const maxMinutes = Math.max(...WEEKLY_PROGRESS.map((d) => d.minutes), 1);

  return (
    <div
      className={`space-y-8 animate-fade-in pb-16 transition-all ${isAiBuddyOpen ? 'lg:mr-[420px]' : ''}`}
    >
      {/* Hero */}
      <Card variant="highlight" padding="lg" className="border border-secondary/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-50 text-secondary-dark rounded-full text-xs font-bold uppercase tracking-wider">
              <HeartHandshake size={14} /> Parent Companion
            </div>
            <h1 className="text-display-lg-mobile md:text-display-lg font-bold text-text-primary">
              Hello, {userName}!
            </h1>
            <p className="text-body-md text-text-secondary max-w-xl">
              Track {child.name}'s reading journey, celebrate milestones, and log home reading
              sessions to support their progress.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="lg"
              iconLeft={<BookOpen size={18} />}
              onClick={() => onNavigateTab('reading-log')}
            >
              Log Home Reading
            </Button>
            <Button variant="outline" size="lg" onClick={() => onNavigateTab('educator-notes')}>
              Teacher Notes
            </Button>
          </div>
        </div>
      </Card>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800">
          <AlertCircle size={18} />
          <p className="text-sm">{error} — showing demo data.</p>
        </div>
      )}

      {/* Child Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Sessions This Week',
            value: loading ? '—' : String(child.weeklySessionCount),
            sub: 'reading sessions',
            icon: <Activity size={18} className="text-tertiary" />,
            bg: 'bg-tertiary-50'
          },
          {
            label: 'Latest WPM',
            value: String(child.latestSession.readingSpeedWpm),
            sub: 'words per minute',
            icon: <TrendingUp size={18} className="text-primary" />,
            bg: 'bg-primary-50'
          },
          {
            label: 'Accuracy',
            value: `${child.latestSession.accuracyPercentage}%`,
            sub: 'last session',
            icon: <Sparkles size={18} className="text-secondary" />,
            bg: 'bg-secondary-50'
          },
          {
            label: 'Badges Earned',
            value: loading ? '—' : String(child.badgeCount),
            sub: 'total achievements',
            icon: <Award size={18} className="text-secondary" />,
            bg: 'bg-secondary-50'
          }
        ].map((s) => (
          <Card key={s.label} variant="subtle" padding="sm">
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-lg ${s.bg}`}>{s.icon}</div>
              <span className="text-xs font-semibold text-text-muted">{s.label}</span>
            </div>
            <p className="text-display-lg-mobile font-bold text-text-primary">{s.value}</p>
            <p className="text-xs text-text-muted">{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Weekly Reading Chart */}
      <Card variant="default" padding="lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-headline-sm font-bold text-text-primary flex items-center gap-2">
            <Clock size={20} className="text-primary" /> This Week's Reading Time
          </h2>
          <Badge variant="secondary">
            {WEEKLY_PROGRESS.reduce((a, d) => a + d.minutes, 0)} min total
          </Badge>
        </div>
        <div className="flex items-end gap-2 h-28">
          {WEEKLY_PROGRESS.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`w-full rounded-t-lg transition-all duration-700 ${
                  d.minutes === 0 ? 'bg-surface-border' : 'bg-secondary hover:bg-secondary-dark'
                }`}
                style={{
                  height: `${d.minutes === 0 ? 4 : Math.max(8, (d.minutes / maxMinutes) * 100)}%`
                }}
              />
              <span className="text-xs text-text-muted">{d.day}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Milestones */}
      <Card variant="default" padding="lg">
        <h2 className="text-headline-sm font-bold text-text-primary mb-6 flex items-center gap-2">
          <Award size={20} className="text-secondary" /> {child.name}'s Milestones
        </h2>
        <div className="space-y-3">
          {DEMO_MILESTONES.map((m) => (
            <div
              key={m.label}
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                m.completed
                  ? 'bg-secondary-50/60 border-secondary/20'
                  : 'bg-surface-low border-surface-border opacity-60'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  m.completed
                    ? 'bg-secondary text-primary-dark'
                    : 'bg-surface-border text-text-muted'
                }`}
              >
                {m.completed ? <Award size={16} /> : <span className="text-xs">○</span>}
              </div>
              <div className="flex-1">
                <p
                  className={`font-semibold ${m.completed ? 'text-text-primary' : 'text-text-muted'}`}
                >
                  {m.label}
                </p>
                {m.date && <p className="text-xs text-text-muted">Earned {m.date}</p>}
              </div>
              {m.completed && (
                <Badge variant="secondary" dot>
                  Earned
                </Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          {
            id: 'reading-log',
            label: 'Home Reading Log',
            icon: <BookOpen size={20} className="text-primary" />,
            desc: 'Track practice at home'
          },
          {
            id: 'educator-notes',
            label: 'Teacher & Educator Updates',
            icon: <HeartHandshake size={20} className="text-secondary" />,
            desc: 'Stay in sync with school'
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

      {/* AI Buddy FAB */}
      <button
        type="button"
        onClick={() => setIsAiBuddyOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-secondary rounded-2xl shadow-elevated flex items-center justify-center hover:scale-110 transition-transform"
        aria-label="Open AI Assistant"
      >
        <AnimatedBotIcon size={28} className="text-primary-dark" />
      </button>

      <AiChatbotDrawer
        isOpen={isAiBuddyOpen}
        onClose={() => setIsAiBuddyOpen(false)}
        roleContext="parent"
        userName={userName}
      />
    </div>
  );
};
