import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Compass,
  Bookmark,
  Library,
  LayoutDashboard,
  Gauge,
  Brain,
  Sliders,
  ArrowRight,
  Lightbulb,
  Sparkles,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { LostBook404Svg } from '../components/illustrations/LostBook404Svg';
import { PublicLayout } from '../layouts';

export interface NotFoundPageProps {
  onNavigateHome?: () => void;
  onNavigateLibrary?: () => void;
  onNavigateDashboard?: () => void;
  onNavigateAssessment?: () => void;
  onNavigateAiAssistant?: () => void;
  onNavigateSettings?: () => void;
}

export const NotFoundPage: React.FC<NotFoundPageProps> = ({
  onNavigateHome,
  onNavigateLibrary,
  onNavigateDashboard,
  onNavigateAssessment,
  onNavigateAiAssistant,
  onNavigateSettings
}) => {
  const navigate = useNavigate();

  const handleGoHome = onNavigateHome || (() => navigate('/'));
  const handleGoLibrary = onNavigateLibrary || (() => navigate('/catalog'));
  const handleGoDashboard = onNavigateDashboard || (() => navigate('/dashboard'));
  const handleGoAssessment = onNavigateAssessment || (() => navigate('/dashboard#assessment'));
  const handleGoAiAssistant = onNavigateAiAssistant || (() => navigate('/dashboard#assistant'));
  const handleGoSettings = onNavigateSettings || (() => navigate('/dashboard#preferences'));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [showReadingRuler, setShowReadingRuler] = useState(false);
  const [rulerPosition, setRulerPosition] = useState(40); // percentage

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchSubmitted(true);
      setTimeout(() => setSearchSubmitted(false), 3000);
    }
  };

  const wayfinders = [
    {
      id: 'dashboard',
      title: 'Student Dashboard',
      description: 'Jump straight into your personal reading goals and ongoing books.',
      actionText: 'Enter dashboard',
      icon: <LayoutDashboard className="w-6 h-6 text-primary" />,
      iconBg: 'bg-primary-50 text-primary',
      accentColor: 'text-primary',
      onClick: handleGoDashboard
    },
    {
      id: 'assessment',
      title: 'Reading Assessment',
      description: 'Check your reading pace and comfort levels at your own pace.',
      actionText: 'Start check-in',
      icon: <Gauge className="w-6 h-6 text-secondary-dark" />,
      iconBg: 'bg-secondary-100 text-secondary-dark',
      accentColor: 'text-secondary-dark',
      onClick: handleGoAssessment
    },
    {
      id: 'assistant',
      title: 'Lumina AI Assistant',
      description: 'Ask our dyslexia-aware tutor to explain any concept gently.',
      actionText: 'Ask Lumina',
      icon: <Brain className="w-6 h-6 text-tertiary-dark" />,
      iconBg: 'bg-tertiary-100 text-tertiary-dark',
      accentColor: 'text-tertiary-dark',
      onClick: handleGoAiAssistant
    },
    {
      id: 'settings',
      title: 'Reader Settings',
      description: 'Customize typography, line-spacing, and warm background tint.',
      actionText: 'Tune comfort',
      icon: <Sliders className="w-6 h-6 text-text-secondary" />,
      iconBg: 'bg-surface-high text-text-secondary',
      accentColor: 'text-text-secondary',
      onClick: handleGoSettings
    }
  ];

  return (
    <PublicLayout>
      <div className="w-full max-w-[1200px] mx-auto px-6 sm:px-8 py-8 md:py-12 flex flex-col items-center">
        {/* 1. Status Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-high/80 border border-surface-border text-text-secondary font-semibold text-label-md mb-6 shadow-soft animate-in fade-in duration-300">
          <BookOpen className="w-4 h-4 text-primary" aria-hidden="true" />
          <span>Error 404 • Lost Between The Lines</span>
        </div>

        {/* 2. Headline & Stitch Illustration */}
        <div className="text-center max-w-2xl mb-8">
          <h1 className="text-display-lg md:text-[3.25rem] font-bold text-text-primary tracking-tight leading-tight mb-3">
            Lost Between The Lines
          </h1>
          <p className="text-body-xl text-text-secondary leading-relaxed">
            The page you are looking for has wandered off our bookshelf. Don&rsquo;t worry — every
            reader finds their place again.
          </p>
        </div>

        {/* 3. Hero Vector Art: Lost Book with reading glasses & guiding light */}
        <div className="w-full max-w-sm sm:max-w-md mx-auto mb-10 flex items-center justify-center p-4">
          <LostBook404Svg />
        </div>

        {/* 4. Dyslexia-friendly Quick Search Bar */}
        <div className="w-full max-w-lg mb-8">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics, reading guides, or tools..."
                aria-label="Search site pages"
                className="w-full h-[48px] pl-11 pr-4 rounded-xl bg-surface-lowest border border-surface-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-body-md transition-all shadow-soft"
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto h-[48px] px-6 bg-primary text-white font-semibold text-label-md rounded-xl flex items-center justify-center gap-2 hover:bg-primary-hover active:scale-[0.98] transition-all shadow-soft shrink-0"
            >
              <Compass className="w-5 h-5" aria-hidden="true" />
              <span>Find Page</span>
            </button>
          </form>

          {searchSubmitted && (
            <div className="mt-3 text-center text-sm font-medium text-feedback-success flex items-center justify-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Searching our catalog for &ldquo;{searchQuery}&rdquo;...</span>
            </div>
          )}
        </div>

        {/* 5. Primary Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <button
            type="button"
            onClick={handleGoHome}
            className="h-[48px] px-6 rounded-xl bg-primary text-white font-semibold text-label-md flex items-center justify-center gap-2 shadow-soft hover:shadow-card hover:-translate-y-0.5 active:scale-[0.98] transition-all focus-visible:ring-3 focus-visible:ring-primary"
          >
            <Bookmark className="w-5 h-5 fill-current" aria-hidden="true" />
            <span>Return to Safe Harbor (Home)</span>
          </button>

          <button
            type="button"
            onClick={handleGoLibrary}
            className="h-[48px] px-6 rounded-xl bg-secondary-container text-secondary-onContainer font-semibold text-label-md flex items-center justify-center gap-2 shadow-soft hover:shadow-card hover:-translate-y-0.5 active:scale-[0.98] transition-all focus-visible:ring-3 focus-visible:ring-secondary"
          >
            <Library className="w-5 h-5" aria-hidden="true" />
            <span>Open Library Catalog</span>
          </button>
        </div>

        {/* 6. Wayfinders — Popular Chapters */}
        <div className="w-full mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="font-semibold text-xs tracking-wider uppercase text-secondary-dark">
                Wayfinders
              </span>
              <h2 className="text-headline-md font-bold text-text-primary">
                Popular Chapters to Explore
              </h2>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary bg-surface-high px-3 py-1.5 rounded-full border border-surface-border">
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              <span>4 destinations</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {wayfinders.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="group flex flex-col justify-between p-6 bg-surface-lowest rounded-2xl border border-surface-border shadow-card hover:shadow-elevated hover:-translate-y-1 transition-all duration-200 text-left focus-visible:ring-3 focus-visible:ring-primary/50"
              >
                <div>
                  <div
                    className={`w-12 h-12 rounded-xl ${item.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200 shadow-soft`}
                  >
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2 group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-body-md text-text-secondary leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div
                  className={`flex items-center gap-1.5 ${item.accentColor} font-semibold text-label-md mt-6 pt-4 border-t border-surface-border/60`}
                >
                  <span>{item.actionText}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform duration-200" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 7. Interactive Dyslexia-Friendly Tip & Live Reading Ruler */}
        <div className="w-full bg-secondary-50/80 border border-secondary-200 rounded-2xl p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-soft">
          <div className="w-12 h-12 rounded-full bg-secondary-container text-secondary-onContainer flex items-center justify-center shrink-0 shadow-soft">
            <Lightbulb className="w-6 h-6 text-secondary-onContainer" aria-hidden="true" />
          </div>

          <div className="flex-1">
            <h4 className="text-lg font-bold text-secondary-dark mb-1">
              Dyslexia-Friendly Reader Tip
            </h4>
            <p className="text-body-md text-text-secondary leading-relaxed">
              If text feels tricky or restless, you can enable our{' '}
              <strong className="font-semibold text-text-primary">Reading Ruler</strong> or switch
              to <strong className="font-semibold text-text-primary">Lexend / OpenDyslexic</strong>{' '}
              in your quick accessibility menu anytime.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowReadingRuler(!showReadingRuler)}
            className="self-start sm:self-center px-5 py-2.5 bg-surface-lowest text-secondary-dark font-semibold text-label-md rounded-xl border border-secondary-300 shadow-soft hover:bg-secondary-100 hover:shadow transition-all shrink-0 active:scale-[0.98] flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            <span>{showReadingRuler ? 'Hide Ruler' : 'Preview Ruler'}</span>
          </button>
        </div>

        {/* Live Interactive Reading Ruler Simulator */}
        {showReadingRuler && (
          <div className="w-full mt-4 p-6 rounded-2xl bg-surface-lowest border-2 border-secondary/40 shadow-card animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
                <span className="font-bold text-label-md text-text-primary">
                  Interactive Reading Ruler Demonstration
                </span>
              </div>
              <span className="text-xs text-text-muted">
                Drag slider below to adjust reading guide focus line
              </span>
            </div>

            {/* Simulated reading passage with highlight guide */}
            <div className="relative p-6 bg-background-cream rounded-xl border border-surface-border text-left overflow-hidden select-none">
              {/* Highlight ruler band */}
              <div
                className="absolute left-0 right-0 h-10 bg-secondary/25 border-y-2 border-secondary/60 pointer-events-none transition-all duration-150 shadow-[0_0_12px_rgba(232,163,61,0.2)]"
                style={{ top: `${rulerPosition}%` }}
              />

              <p className="text-body-lg text-text-primary leading-relaxed font-lexend mb-3">
                Reading with ReadEase provides low-glare warm backgrounds, generous letter-spacing,
                and synchronized line focus.
              </p>
              <p className="text-body-lg text-text-primary leading-relaxed font-lexend mb-3">
                The reading ruler anchors the eye so saccadic line jumps and unintentional word
                skips are naturally avoided.
              </p>
              <p className="text-body-lg text-text-secondary leading-relaxed font-lexend">
                Each feature is designed with cognitive accessibility at its foundation to turn
                reading into an empowering habit.
              </p>
            </div>

            {/* Slider Control */}
            <div className="mt-4 flex items-center gap-4">
              <span className="text-xs font-semibold text-text-muted shrink-0">
                Ruler Position:
              </span>
              <input
                type="range"
                min="10"
                max="75"
                value={rulerPosition}
                onChange={(e) => setRulerPosition(Number(e.target.value))}
                aria-label="Adjust reading ruler position"
                className="w-full accent-secondary cursor-pointer"
              />
              <span className="text-xs font-mono text-text-muted shrink-0">{rulerPosition}%</span>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default NotFoundPage;
