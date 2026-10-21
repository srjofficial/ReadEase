import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Search, Bell, SlidersHorizontal, Globe, Moon, Sun } from 'lucide-react';

export interface TopBarProps {
  pageTitle?: string;
  breadcrumbs?: string[];
  currentLanguage?: 'EN' | 'ML';
  onLanguageToggle?: () => void;
  onPreferencesClick?: () => void;
  isDarkMode?: boolean;
  onDarkModeToggle?: () => void;
  onSearchChange?: (query: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  pageTitle = 'Dashboard',
  breadcrumbs = ['Home', 'Dashboard'],
  currentLanguage,
  onLanguageToggle,
  onPreferencesClick,
  isDarkMode = false,
  onDarkModeToggle,
  onSearchChange
}) => {
  const { language, toggleLanguage, t } = useLanguage();
  const effectiveLang = currentLanguage || language;

  return (
    <header
      aria-label="Dashboard Top Bar"
      className="h-20 bg-surface-lowest border-b border-surface-border px-6 flex items-center justify-between gap-4 sticky top-0 z-30 transition-colors duration-200"
    >
      {/* Left: Title & Breadcrumbs */}
      <div>
        <nav aria-label="Breadcrumbs" className="hidden sm:block">
          <ol className="flex items-center gap-1.5 text-xs text-text-muted">
            {breadcrumbs.map((crumb, idx) => (
              <li key={crumb} className="flex items-center gap-1.5">
                {idx > 0 && <span>/</span>}
                <span
                  className={
                    idx === breadcrumbs.length - 1 ? 'font-semibold text-text-secondary' : ''
                  }
                >
                  {crumb}
                </span>
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="text-2xl sm:text-3xl font-editorial font-normal text-text-primary tracking-tight">{pageTitle}</h1>
      </div>

      {/* Center: Quick Search */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder={t(
              'nav.searchPlaceholder',
              'Search documents, reading tools, or vocabulary...'
            )}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-surface-low border border-surface-border rounded-xl text-label-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:bg-surface-lowest transition-all"
          />
        </div>
      </div>

      {/* Right: Accessibility Controls & Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Quick Accessibility Customizer Trigger */}
        <button
          type="button"
          onClick={onPreferencesClick}
          aria-label="Open Reading Accommodations Panel"
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-2 bg-primary-50 text-primary-container rounded-xl text-xs sm:text-label-md font-semibold hover:bg-primary-100 transition-colors border border-primary-200 shadow-soft shrink-0 max-w-[8rem] sm:max-w-[10rem] xl:max-w-none"
        >
          <SlidersHorizontal size={16} className="shrink-0" />
          <span className="hidden sm:inline truncate leading-snug">
            {t('nav.accommodations', 'Reading Accommodations')}
          </span>
        </button>

        {/* Dark/Light Mode Toggle */}
        <button
          type="button"
          onClick={onDarkModeToggle}
          aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 sm:p-2.5 text-text-secondary hover:text-text-primary hover:bg-surface-low rounded-xl transition-colors shrink-0"
        >
          {isDarkMode ? <Sun size={20} className="text-secondary shrink-0" /> : <Moon size={20} className="shrink-0" />}
        </button>

        {/* Bilingual Switcher */}
        <button
          type="button"
          onClick={onLanguageToggle || toggleLanguage}
          aria-label={`Toggle language. Current language is ${effectiveLang === 'EN' ? 'English' : 'Malayalam'}`}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-bold rounded-xl border border-surface-border bg-surface-low hover:bg-surface text-text-primary transition-all shadow-xs shrink-0"
        >
          <Globe size={16} className="text-primary shrink-0" />
          <span className="font-bold">{effectiveLang === 'EN' ? 'EN' : 'മലയാളം'}</span>
        </button>

        {/* Notification Bell */}
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label="View notifications (1 unread)"
            className="p-2 sm:p-2.5 text-text-secondary hover:text-text-primary hover:bg-surface-low rounded-xl transition-colors relative shrink-0"
          >
            <Bell size={20} className="shrink-0" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-secondary ring-2 ring-surface-lowest shrink-0" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
