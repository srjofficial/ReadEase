import React, { useState } from 'react';
import {
  Award,
  TrendingUp,
  Flame,
  Check,
  BookOpen,
  ChevronRight,
  Languages,
  Zap
} from 'lucide-react';
import { Badge, Modal, Button } from '../../components/ui';

interface BadgeItem {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  progressPercent?: number;
  colorScheme: 'tertiary' | 'primary' | 'secondary' | 'locked';
}

const BADGES_LIST: BadgeItem[] = [
  {
    id: 'badge-1',
    title: 'First 1000 Words',
    category: 'Stamina',
    description: 'Read your first 1,000 words using cognitive accessibility aids.',
    icon: 'workspace_premium',
    unlocked: true,
    unlockedAt: 'Oct 18, 2024',
    colorScheme: 'tertiary'
  },
  {
    id: 'badge-2',
    title: '7-Day Streak Champion',
    category: 'Consistency',
    description: 'Completed reading exercises for seven consecutive days.',
    icon: 'local_fire_department',
    unlocked: true,
    unlockedAt: 'Yesterday',
    colorScheme: 'secondary'
  },
  {
    id: 'badge-3',
    title: 'Night Owl Reader',
    category: 'Focus',
    description: 'Read peacefully during evening hours with low-glare dark mode.',
    icon: 'nightlight',
    unlocked: true,
    unlockedAt: 'Oct 21, 2024',
    colorScheme: 'primary'
  },
  {
    id: 'badge-4',
    title: 'Malayalam Master',
    category: 'Bilingual',
    description: 'Completed 5 stories in Malayalam with syllable highlighting.',
    icon: 'translate',
    unlocked: true,
    unlockedAt: 'Oct 22, 2024',
    colorScheme: 'secondary'
  },
  {
    id: 'badge-5',
    title: 'Saccadic Flow Star',
    category: 'Fluency',
    description: 'Decreased backward eye regressions by 25% during practice.',
    icon: 'trending_up',
    unlocked: true,
    unlockedAt: 'Oct 24, 2024',
    colorScheme: 'tertiary'
  },
  {
    id: 'badge-6',
    title: 'Speed Demon',
    category: 'Speed',
    description: 'Reach a sustained reading rate of 160 Words Per Minute.',
    icon: 'timer',
    unlocked: false,
    progressPercent: 78,
    colorScheme: 'locked'
  },
  {
    id: 'badge-7',
    title: 'Century Reader',
    category: 'Stamina',
    description: 'Accumulate 100 total minutes of active practice in one week.',
    icon: 'hourglass_bottom',
    unlocked: false,
    progressPercent: 62,
    colorScheme: 'locked'
  },
  {
    id: 'badge-8',
    title: 'Library Explorer',
    category: 'Discovery',
    description: 'Upload and read 10 custom documents in your personal library.',
    icon: 'menu_book',
    unlocked: false,
    progressPercent: 40,
    colorScheme: 'locked'
  }
];

export const AchievementsBadgesView: React.FC = () => {
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'unlocked' | 'in-progress'>('all');
  const [selectedSessionLog, setSelectedSessionLog] = useState<{
    title: string;
    date: string;
    lang: string;
    mins: number;
    wpm: number;
    regressions: number;
    fixations: number;
  } | null>(null);

  const filteredBadges = BADGES_LIST.filter((b) => {
    if (activeTab === 'unlocked') return b.unlocked;
    if (activeTab === 'in-progress') return !b.unlocked;
    return true;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-secondary-50 text-secondary-dark rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-secondary-200">
            <Award size={14} className="text-secondary" /> Student Milestones & Growth
          </div>
          <h1 className="text-2xl sm:text-3xl font-editorial font-normal text-text-primary tracking-tight">
            Your Progress
          </h1>
          <p className="text-body-xl text-text-secondary">
            Track your reading journey, celebrate milestones, and discover areas to grow.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-surface-lowest p-4 rounded-2xl border border-surface-border shadow-soft">
          <div className="w-12 h-12 rounded-xl bg-tertiary-50 text-tertiary flex items-center justify-center font-bold text-lg">
            Lv 4
          </div>
          <div>
            <p className="text-xs text-text-muted font-semibold">Current Rank</p>
            <p className="text-sm font-bold text-text-primary">Fluency Explorer</p>
            <p className="text-[11px] text-tertiary">350 XP to Level 5</p>
          </div>
        </div>
      </div>

      {/* Bento Grid: Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Large WPM Growth Chart (Span 8) */}
        <div className="lg:col-span-8 bg-surface-lowest rounded-3xl p-8 shadow-soft border border-surface-border flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-editorial font-normal text-text-primary">Reading Speed Growth</h2>
              <p className="text-body-md text-text-secondary">
                Words Per Minute (WPM) over the last 30 days.
              </p>
            </div>
            <div className="bg-primary-50 text-primary border border-primary-200 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <TrendingUp size={16} />
              <span>+12% vs last month</span>
            </div>
          </div>

          {/* Interactive SVG Curve Chart */}
          <div className="w-full h-64 relative bg-surface-low rounded-2xl overflow-hidden border border-surface-border flex items-end px-6 pb-8 pt-6">
            {/* Ambient Gradient Fill */}
            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-primary/5 to-transparent pointer-events-none" />

            {/* SVG Curve */}
            <svg
              className="absolute inset-0 w-full h-full p-4 overflow-visible"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              {/* Grid Lines */}
              <line
                x1="0"
                y1="25"
                x2="100"
                y2="25"
                stroke="#E5E0D8"
                strokeDasharray="3 3"
                strokeWidth="0.8"
              />
              <line
                x1="0"
                y1="50"
                x2="100"
                y2="50"
                stroke="#E5E0D8"
                strokeDasharray="3 3"
                strokeWidth="0.8"
              />
              <line
                x1="0"
                y1="75"
                x2="100"
                y2="75"
                stroke="#E5E0D8"
                strokeDasharray="3 3"
                strokeWidth="0.8"
              />

              {/* Smooth Trend Path */}
              <path
                d="M 5,80 Q 25,68 40,55 T 70,38 T 95,22"
                fill="none"
                stroke="#203390"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-sm"
              />

              {/* Data Nodes */}
              <circle cx="5" cy="80" r="3.5" fill="#203390" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="40" cy="55" r="3.5" fill="#203390" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="70" cy="38" r="3.5" fill="#203390" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="95" cy="22" r="4.5" fill="#E8A33D" stroke="#FFFFFF" strokeWidth="2.5" />
            </svg>

            {/* Hover Tooltip on Latest Node */}
            <div className="absolute right-6 top-8 bg-surface-lowest border border-surface-border p-2.5 rounded-xl shadow-soft text-right z-10">
              <span className="text-xs text-text-muted block">Current Pace</span>
              <span className="text-lg font-bold text-primary">142 WPM</span>
            </div>
          </div>

          {/* X-Axis Labels */}
          <div className="flex justify-between text-xs font-semibold text-text-muted px-4 mt-3">
            <span>Week 1 (110 WPM)</span>
            <span>Week 2 (124 WPM)</span>
            <span>Week 3 (135 WPM)</span>
            <span className="text-primary font-bold">Week 4 (142 WPM)</span>
          </div>
        </div>

        {/* 7-Day Streak & Calendar Card (Span 4) */}
        <div className="lg:col-span-4 bg-surface-lowest rounded-3xl p-8 shadow-soft border border-surface-border flex flex-col justify-between text-center">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-secondary-container text-secondary-onContainer flex items-center justify-center mb-4 shadow-soft">
              <Flame size={32} className="animate-pulse" />
            </div>
            <h2 className="text-xl font-editorial font-normal text-text-primary">7 Day Streak!</h2>
            <p className="text-body-md text-text-secondary mt-1">
              You're on a roll. Daily consistency builds automaticity!
            </p>
          </div>

          <div className="grid grid-cols-7 gap-2 my-6">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
              const isToday = idx === 6;
              const isComplete = idx < 6;
              return (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-text-muted">{day}</span>
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-transform ${
                      isComplete
                        ? 'bg-tertiary text-white shadow-soft'
                        : isToday
                          ? 'border-2 border-secondary bg-secondary-50 text-secondary-dark ring-2 ring-secondary/30'
                          : 'bg-surface-low border border-surface-border text-text-muted'
                    }`}
                  >
                    {isComplete ? <Check size={16} /> : isToday ? '★' : ''}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3 bg-tertiary-50 text-tertiary-dark rounded-xl border border-tertiary-200 text-xs font-medium">
            Next milestone unlocked in <strong>3 days</strong> (+100 XP)
          </div>
        </div>
      </div>

      {/* Bento Grid: Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Stability & Eye Tracking Trends (Span 6) */}
        <div className="md:col-span-6 bg-surface-lowest rounded-3xl p-8 shadow-soft border border-surface-border flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-editorial font-normal text-text-primary">Focus & Stability</h2>
              <Badge variant="tertiary" dot>
                Optimal Rhythm
              </Badge>
            </div>
            <p className="text-body-md text-text-secondary">
              Tracking regressions (backward scanning) and fixation duration.
            </p>
          </div>

          <div className="flex items-center gap-6 my-4">
            <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
              <span className="w-3 h-3 rounded-full bg-secondary" />
              <span>Regressions (Lower is better)</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
              <span className="w-3 h-3 rounded-full bg-tertiary" />
              <span>Fixations (Steady pace)</span>
            </div>
          </div>

          {/* Dual Trend Chart */}
          <div className="w-full h-44 bg-surface-low rounded-2xl relative overflow-hidden border border-surface-border flex items-end p-4">
            <svg
              className="absolute inset-0 w-full h-full p-2"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              {/* Regression line (Decreasing from 40 to 15) */}
              <path
                d="M 5,30 Q 30,35 60,65 T 95,80"
                fill="none"
                stroke="#E8A33D"
                strokeWidth="3"
                strokeLinecap="round"
              />
              {/* Fixation line (Steady near 50) */}
              <path
                d="M 5,55 Q 35,50 65,58 T 95,52"
                fill="none"
                stroke="#4E9F6E"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <div className="relative z-10 flex justify-between w-full text-[11px] font-semibold text-text-muted">
              <span>Day 1 (32 Regressions)</span>
              <span className="text-tertiary">Day 30 (12 Regressions - 62% Drop)</span>
            </div>
          </div>
        </div>

        {/* Weekly Minutes Read & Language Split (Span 6) */}
        <div className="md:col-span-6 flex flex-col gap-6">
          {/* Minutes Read Bar Chart */}
          <div className="bg-surface-lowest rounded-3xl p-6 shadow-soft border border-surface-border flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-editorial font-normal text-text-primary">
                Minutes Read This Week
              </h3>
              <span className="text-xs text-text-muted font-medium">Daily Goal: 20 mins</span>
            </div>

            <div className="flex items-end justify-between gap-3 h-28 px-2">
              {[
                { day: 'Mon', mins: 15, pct: 75 },
                { day: 'Tue', mins: 20, pct: 100 },
                { day: 'Wed', mins: 25, pct: 120 },
                { day: 'Thu', mins: 30, pct: 140 },
                { day: 'Fri', mins: 20, pct: 100 },
                { day: 'Sat', mins: 15, pct: 75 },
                { day: 'Sun', mins: 22, pct: 110 }
              ].map((bar, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group"
                >
                  <span className="text-[10px] font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    {bar.mins}m
                  </span>
                  <div className="w-full bg-surface-high rounded-t-lg h-full flex items-end">
                    <div
                      className={`w-full rounded-t-lg transition-all group-hover:brightness-110 ${
                        bar.pct >= 100 ? 'bg-primary' : 'bg-primary-300'
                      }`}
                      style={{ height: `${Math.min(bar.pct, 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-text-muted">{bar.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bilingual Language Split */}
          <div className="bg-surface-lowest rounded-3xl p-6 shadow-soft border border-surface-border">
            <h3 className="font-bold text-headline-sm text-text-primary mb-4 flex items-center gap-2">
              <Languages size={18} className="text-primary" /> Language Split
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-text-primary mb-1.5">
                  <span>English (Stories & Science)</span>
                  <span className="text-primary">65% (85 mins)</span>
                </div>
                <div className="w-full h-3 bg-surface-high rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: '65%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-text-primary mb-1.5">
                  <span>മലയാളം (Folktales & Vocabulary)</span>
                  <span className="text-secondary">35% (45 mins)</span>
                </div>
                <div className="w-full h-3 bg-surface-high rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: '35%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Badges & Achievements Gallery (Span 12) */}
      <div className="bg-surface-lowest rounded-3xl p-8 shadow-soft border border-surface-border space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-editorial font-normal text-text-primary">Badges & Achievements</h2>
            <p className="text-body-md text-text-secondary">
              Earned through consistent practice, eye-tracking stamina, and bilingual exploration.
            </p>
          </div>

          <div className="flex bg-surface-low p-1 rounded-xl border border-surface-border">
            {(['all', 'unlocked', 'in-progress'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize transition-all ${
                  activeTab === tab
                    ? 'bg-surface-lowest text-primary shadow-soft'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                {tab.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {filteredBadges.map((badge) => (
            <button
              key={badge.id}
              type="button"
              onClick={() => setSelectedBadge(badge)}
              className={`p-5 rounded-2xl border text-center flex flex-col items-center gap-3 transition-all hover:scale-105 group cursor-pointer ${
                badge.unlocked
                  ? 'bg-surface-low hover:bg-surface-lowest border-surface-border shadow-soft'
                  : 'bg-surface-low/50 border-surface-border/50 opacity-60 hover:opacity-100 grayscale hover:grayscale-0'
              }`}
            >
              {/* Badge Circle Icon */}
              <div
                className={`w-18 h-18 w-[72px] h-[72px] rounded-full flex items-center justify-center border-4 shadow-soft transition-transform group-hover:rotate-6 ${
                  badge.colorScheme === 'tertiary'
                    ? 'bg-tertiary-50 text-tertiary border-tertiary-200'
                    : badge.colorScheme === 'secondary'
                      ? 'bg-secondary-50 text-secondary border-secondary-200'
                      : badge.colorScheme === 'primary'
                        ? 'bg-primary-50 text-primary border-primary-200'
                        : 'bg-surface-high text-text-muted border-surface-border'
                }`}
              >
                {badge.unlocked ? <Award size={36} /> : <Zap size={32} />}
              </div>

              <div>
                <h4 className="font-bold text-text-primary text-sm line-clamp-1">{badge.title}</h4>
                <p className="text-[11px] text-text-muted mt-0.5">{badge.category}</p>
              </div>

              {badge.unlocked ? (
                <span className="text-[10px] font-bold text-tertiary px-2 py-0.5 bg-tertiary-50 rounded-full border border-tertiary-200">
                  Unlocked {badge.unlockedAt}
                </span>
              ) : (
                <div className="w-full space-y-1">
                  <div className="w-full h-1.5 bg-surface-high rounded-full overflow-hidden">
                    <div
                      className="h-full bg-secondary rounded-full"
                      style={{ width: `${badge.progressPercent}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-text-muted font-semibold">
                    {badge.progressPercent}% to Unlock
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Reading Activity Log (Span 12) */}
      <div className="bg-surface-lowest rounded-3xl p-8 shadow-soft border border-surface-border space-y-6">
        <h2 className="text-headline-md font-bold text-text-primary">Recent Practice Sessions</h2>

        <div className="space-y-3">
          {[
            {
              title: 'The Whispering Woods',
              date: 'Today at 10:45 AM',
              lang: 'English',
              mins: 15,
              wpm: 142,
              regressions: 4,
              fixations: 18
            },
            {
              title: 'കുട്ടികളുടെ കഥകൾ (The Clever Deer)',
              date: 'Yesterday at 4:20 PM',
              lang: 'Malayalam',
              mins: 20,
              wpm: 128,
              regressions: 6,
              fixations: 20
            },
            {
              title: 'The Ocean Adventure & Coral Reefs',
              date: 'Oct 22 at 2:10 PM',
              lang: 'English',
              mins: 12,
              wpm: 135,
              regressions: 5,
              fixations: 19
            }
          ].map((log, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface-low rounded-2xl border border-surface-border hover:bg-surface transition-colors gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary flex items-center justify-center shrink-0">
                  <BookOpen size={22} />
                </div>
                <div>
                  <h4 className="font-bold text-text-primary text-sm">{log.title}</h4>
                  <p className="text-xs text-text-muted">
                    {log.date} • {log.lang} • {log.mins} mins
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 justify-between sm:justify-end">
                <div className="text-right hidden md:block">
                  <span className="text-xs font-bold text-primary block">{log.wpm} WPM</span>
                  <span className="text-[11px] text-text-muted">High Comprehension</span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  iconRight={<ChevronRight size={14} />}
                  onClick={() => setSelectedSessionLog(log)}
                >
                  View Metrics
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Badge Detail Modal */}
      <Modal
        isOpen={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
        title={selectedBadge?.title || 'Milestone Badge'}
        description={selectedBadge?.category || 'Achievement'}
      >
        {selectedBadge && (
          <div className="space-y-6 text-center">
            <div className="w-24 h-24 rounded-full bg-secondary-50 text-secondary border-4 border-secondary-200 mx-auto flex items-center justify-center shadow-elevated">
              <Award size={48} />
            </div>

            <div className="space-y-2">
              <h3 className="text-headline-md font-bold text-text-primary">
                {selectedBadge.title}
              </h3>
              <p className="text-sm text-text-secondary max-w-sm mx-auto leading-relaxed">
                {selectedBadge.description}
              </p>
            </div>

            <div className="p-4 bg-surface-low rounded-2xl border border-surface-border text-xs font-semibold text-text-muted">
              {selectedBadge.unlocked ? (
                <span className="text-tertiary">
                  Unlocked on {selectedBadge.unlockedAt} • Added +50 XP to your profile!
                </span>
              ) : (
                <span>
                  Currently {selectedBadge.progressPercent}% complete. Read{' '}
                  {100 - (selectedBadge.progressPercent || 0)} more words to unlock!
                </span>
              )}
            </div>

            <div className="flex justify-center">
              <Button variant="primary" size="md" onClick={() => setSelectedBadge(null)}>
                Awesome, Keep Going!
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Session Metrics Modal */}
      <Modal
        isOpen={!!selectedSessionLog}
        onClose={() => setSelectedSessionLog(null)}
        title={selectedSessionLog?.title || 'Reading Session Metrics'}
        description={`Completed on ${selectedSessionLog?.date}`}
      >
        {selectedSessionLog && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-surface-low rounded-xl border border-surface-border">
                <p className="text-xs text-text-muted">Duration</p>
                <p className="text-headline-sm font-bold text-text-primary">
                  {selectedSessionLog.mins}m
                </p>
              </div>
              <div className="p-3 bg-surface-low rounded-xl border border-surface-border">
                <p className="text-xs text-text-muted">Speed</p>
                <p className="text-headline-sm font-bold text-primary">
                  {selectedSessionLog.wpm} WPM
                </p>
              </div>
              <div className="p-3 bg-surface-low rounded-xl border border-surface-border">
                <p className="text-xs text-text-muted">Regressions</p>
                <p className="text-headline-sm font-bold text-secondary">
                  {selectedSessionLog.regressions}/100w
                </p>
              </div>
              <div className="p-3 bg-surface-low rounded-xl border border-surface-border">
                <p className="text-xs text-text-muted">Fixations</p>
                <p className="text-headline-sm font-bold text-tertiary">
                  {selectedSessionLog.fixations}/100w
                </p>
              </div>
            </div>

            <div className="p-4 bg-tertiary-50 text-tertiary-dark rounded-xl border border-tertiary-200 text-xs leading-relaxed">
              <strong>Clinical Observation:</strong> Eye movement trajectory showed consistent
              forward saccades with minimal line re-reading when Bionic fixation guides were active.
            </div>

            <div className="flex justify-end">
              <Button variant="primary" size="md" onClick={() => setSelectedSessionLog(null)}>
                Close Insights
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
