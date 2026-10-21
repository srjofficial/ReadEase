import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  BookOpen,
  Play,
  RotateCcw,
  Flame,
  Award,
  FolderKanban,
  Activity,
  SlidersHorizontal,
  ChevronRight,
  Clock,
  MessageSquareText
} from 'lucide-react';
import { Button, Card, Badge } from '../../components/ui';
import { AiChatbotDrawer } from '../../components/chat/AiChatbotDrawer';

interface StudentDashboardViewProps {
  userName?: string;
  onNavigateTab: (tabId: string) => void;
}

export const StudentDashboardView: React.FC<StudentDashboardViewProps> = ({
  userName = 'Alex',
  onNavigateTab
}) => {
  const { language, t } = useLanguage();
  const [isAiBuddyOpen, setIsAiBuddyOpen] = useState(false);

  return (
    <div
      className={`space-y-8 animate-fade-in pb-16 transition-all duration-300 ${
        isAiBuddyOpen ? 'lg:mr-[420px] xl:mr-[440px]' : ''
      }`}
    >
      {/* Welcome Hero Section */}
      <Card variant="highlight" padding="lg" className="border border-primary-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-container rounded-full text-xs font-bold uppercase tracking-wider border border-primary/20">
              <span className="w-2 h-2 rounded-full bg-tertiary" />
              <span>{t('nav.studentPortal', 'Cognitive Accessibility Portal')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-editorial font-normal text-text-primary tracking-tight">
              {language === 'ML' ? `നമസ്കാരം, ${userName}!` : `Hello, ${userName}!`}
            </h1>
            <p className="text-body-md text-text-secondary max-w-xl">
              {t(
                'dashboard.subtitle',
                "Ready for today's reading adventure? Your personalized accommodations and Bionic fixation points are active."
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              iconLeft={<Play size={18} />}
              onClick={() => onNavigateTab('reading-studio')}
            >
              {t('nav.startPractice', 'Start Daily Practice')}
            </Button>
            <Button
              variant="outline"
              size="lg"
              iconLeft={<FolderKanban size={18} />}
              onClick={() => onNavigateTab('library')}
            >
              {t('nav.myDocuments', 'My Documents')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Bento Grid: Row 1 (Daily Goal & Streak) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Goal Card (Span 2) */}
        <div className="lg:col-span-2 bg-surface-lowest rounded-3xl p-8 shadow-soft border border-surface-border flex flex-col justify-center">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-headline-md font-bold text-text-primary flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-tertiary-50 text-tertiary flex items-center justify-center">
                <Clock size={18} />
              </span>
              {t('dashboard.dailyGoal', 'Daily Reading Goal')}
            </h2>
            <Badge variant="tertiary" dot>
              15 / 20 {t('dashboard.daysRead', 'mins read today')}
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-8">
            {/* Circular SVG Progress Ring */}
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#EAE7EB"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="#E8A33D"
                  strokeWidth="10"
                  strokeDasharray="251.2"
                  strokeDashoffset="62.8"
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl font-bold text-text-primary leading-none">75%</span>
                <span className="text-[10px] text-text-muted mt-0.5">5m left</span>
              </div>
            </div>

            <div className="space-y-2 text-center sm:text-left">
              <p className="text-body-xl font-semibold text-text-primary">
                {t('dashboard.goalProgress', "Almost there! Just 5 more minutes to reach today's goal.")}
              </p>
              <p className="text-xs text-text-muted flex items-center justify-center sm:justify-start gap-1.5">
                <RotateCcw size={14} /> {t('dashboard.lastSession', 'Last session')}: 15 {t('dashboard.minsIn', 'mins in')} <em>The Whispering Woods</em>
              </p>
            </div>
          </div>
        </div>

        {/* Streak Counter Card (Span 1) */}
        <div className="bg-surface-lowest rounded-3xl p-8 shadow-soft border border-surface-border flex flex-col items-center justify-center text-center">
          <div className="w-18 h-18 w-[72px] h-[72px] rounded-full bg-secondary-container text-secondary-onContainer flex items-center justify-center mb-4 shadow-soft">
            <Flame size={36} className="animate-pulse" />
          </div>
          <h3 className="text-[44px] font-bold text-text-primary leading-none">7</h3>
          <p className="text-body-xl font-bold text-secondary mt-1">{t('dashboard.streak', 'Day Streak!')}</p>
          <p className="text-xs text-text-muted mt-2">{t('dashboard.streakDesc', 'Consistent daily reading habit')}</p>
        </div>
      </div>

      {/* Recommended For You & Fast Action Tiles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommended Story Card (Span 2) */}
        <div className="lg:col-span-2 bg-surface-lowest rounded-3xl p-8 shadow-soft border border-surface-border flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-headline-sm font-bold text-text-primary flex items-center gap-2">
              <BookOpen size={20} className="text-primary" /> {t('dashboard.recommendedToday', 'Recommended for You Today')}
            </h3>
            <Badge variant="secondary">{language === 'ML' ? 'ഡിസ്‌ലെക്‌സിയ അനുകൂലം' : 'Dyslexia Optimized'}</Badge>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 my-2">
            <div className="w-28 h-36 bg-gradient-to-br from-primary-100 to-tertiary-100 rounded-2xl border border-surface-border flex items-center justify-center shrink-0 shadow-soft">
              <BookOpen size={44} className="text-primary opacity-80" />
            </div>

            <div className="space-y-2">
              <span className="text-xs uppercase font-bold text-secondary tracking-wider">
                Nature & Adventure • 280 Words
              </span>
              <h4 className="text-headline-md font-bold text-text-primary">The Whispering Woods</h4>
              <p className="text-sm text-text-secondary leading-relaxed">
                Join Maya as she explores an ancient valley where whispering cedars and luminous
                creatures help young readers discover the calm rhythms of nature.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-surface-border flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">{t('dashboard.estimatedTime', 'Estimated time: 4 minutes')}</span>
            <Button
              variant="primary"
              size="sm"
              iconRight={<ChevronRight size={16} />}
              onClick={() => onNavigateTab('reading-studio')}
            >
              {t('dashboard.readInStudio', 'Read in Studio Now')}
            </Button>
          </div>
        </div>

        {/* Quick Portal Navigation Card (Span 1) */}
        <div className="bg-surface-lowest rounded-3xl p-6 shadow-soft border border-surface-border flex flex-col justify-between space-y-3">
          <h3 className="font-bold text-headline-sm text-text-primary">
            {t('dashboard.quickShortcuts', 'Quick Shortcuts')}
          </h3>

          <div className="space-y-2">
            {[
              {
                id: 'assessment',
                label: t('nav.assessment', 'Reading Assessment'),
                desc: t('dashboard.eyeTrackingDesc', 'Eye-tracking diagnostic & scorecard'),
                icon: <Activity size={18} className="text-primary" />
              },
              {
                id: 'preferences',
                label: t('nav.customizer', 'Reading Customizer'),
                desc: t('dashboard.fontColorDesc', 'Fonts, color tints & rulers'),
                icon: <SlidersHorizontal size={18} className="text-secondary" />
              },
              {
                id: 'progress',
                label: t('nav.achievements', 'Achievements & Badges'),
                desc: t('dashboard.wpmGrowthDesc', 'WPM growth & streak history'),
                icon: <Award size={18} className="text-tertiary" />
              }
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigateTab(item.id)}
                className="w-full text-left p-3 rounded-xl bg-surface-low hover:bg-surface border border-surface-border flex items-center justify-between transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-surface-lowest shadow-xs group-hover:scale-105 transition-transform">
                    {item.icon}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-text-primary">{item.label}</h5>
                    <p className="text-[11px] text-text-muted">{item.desc}</p>
                  </div>
                </div>
                <ChevronRight
                  size={14}
                  className="text-text-muted group-hover:translate-x-0.5 transition-transform"
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Assistive Companion Trigger */}
      <div
        className={`fixed bottom-6 right-6 z-30 transition-all duration-300 ${
          isAiBuddyOpen
            ? 'opacity-0 pointer-events-none translate-x-12'
            : 'opacity-100 translate-x-0'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsAiBuddyOpen(true)}
          aria-label="Open Assistive Companion"
          title="Open Assistive Companion"
          className="w-12 h-12 rounded-xl bg-primary text-white shadow-soft hover:bg-primary-hover active:scale-95 transition-all flex items-center justify-center cursor-pointer border border-primary/20"
        >
          <MessageSquareText size={20} className="text-white" />
        </button>
      </div>

      {/* Left-Side Sliding AI Chatbot Panel */}
      <AiChatbotDrawer
        isOpen={isAiBuddyOpen}
        onClose={() => setIsAiBuddyOpen(false)}
        userName={userName}
        roleContext="student"
      />
    </div>
  );
};
