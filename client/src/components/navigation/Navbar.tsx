import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { Globe, Menu, X, ArrowRight, Sun, Moon } from 'lucide-react';

export interface NavbarProps {
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
  currentLanguage?: 'EN' | 'ML';
  onLanguageToggle?: () => void;
  isDarkMode?: boolean;
  onDarkModeToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onLoginClick,
  onSignUpClick,
  currentLanguage,
  onLanguageToggle,
  isDarkMode = false,
  onDarkModeToggle
}) => {
  const { language, toggleLanguage, t } = useLanguage();
  const effectiveLang = currentLanguage || language;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: t('nav.bilingual', 'Malayalam & Bilingual'), href: '/#bilingual' },
    { label: t('nav.learningCircle', 'Learning Circle'), href: '/#circle' },
    { label: t('nav.clinicalNotes', 'Clinical Notes'), href: '/#voices' }
  ];

  return (
    <nav
      aria-label="Primary Navigation"
      className="sticky top-0 z-50 bg-surface-lowest/95 backdrop-blur-md border-b border-surface-border transition-all duration-200"
    >
      <div className="max-w-container mx-auto px-4 lg:px-6 h-20 flex items-center justify-between gap-4">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center shrink-0 group focus-visible:ring-2 focus-visible:ring-primary rounded-xl py-1"
          aria-label="ReadEase Home"
        >
          <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#10204d] to-[#1a3275] border border-[#2b449b]/40 shadow-soft group-hover:from-[#14265c] group-hover:to-[#203c8c] transition-all flex items-center">
            <img
              src="/ReadEase_wordmark_transparent.svg"
              alt="ReadEase"
              className="h-7 md:h-8 w-auto min-w-[105px] md:min-w-[120px] object-contain group-hover:scale-[1.02] transition-transform shrink-0"
            />
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-2.5 xl:gap-4 shrink min-w-0">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs xl:text-label-md text-text-secondary hover:text-primary font-medium transition-colors duration-150 relative py-1 focus-visible:ring-2 focus-visible:ring-primary rounded leading-snug whitespace-nowrap shrink-0"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-2 xl:gap-3 shrink-0">
          {/* Language Switcher */}
          <button
            type="button"
            onClick={onLanguageToggle || toggleLanguage}
            aria-label={`Current language is ${effectiveLang === 'EN' ? 'English' : 'Malayalam'}. Click to toggle.`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 xl:px-3 xl:py-2 text-xs font-bold text-text-secondary hover:text-primary hover:bg-surface-low rounded-lg transition-colors border border-surface-border shadow-xs"
          >
            <Globe size={16} className="text-primary shrink-0" aria-hidden="true" />
            <span className="leading-snug">{effectiveLang === 'EN' ? 'EN / മലയാളം' : 'മലയാളം / EN'}</span>
          </button>

          {/* Dark Mode Toggle */}
          {onDarkModeToggle && (
            <button
              type="button"
              onClick={onDarkModeToggle}
              aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-low rounded-lg transition-colors shrink-0"
            >
              {isDarkMode ? <Sun size={18} className="text-secondary" /> : <Moon size={18} />}
            </button>
          )}

          {/* Login Button / Link */}
          {onLoginClick ? (
            <button
              type="button"
              onClick={onLoginClick}
              className="px-3 xl:px-4 py-2 text-xs xl:text-label-md font-semibold text-primary hover:bg-surface-low rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary shrink-0 leading-snug"
            >
              {t('nav.login', 'Login')}
            </button>
          ) : (
            <Link
              to="/login"
              className="px-3 xl:px-4 py-2 text-xs xl:text-label-md font-semibold text-primary hover:bg-surface-low rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary inline-flex items-center shrink-0 leading-snug"
            >
              {t('nav.login', 'Login')}
            </Link>
          )}

          {/* Sign Up CTA */}
          {onSignUpClick ? (
            <button
              type="button"
              onClick={onSignUpClick}
              className="flex items-center gap-1.5 xl:gap-2 px-3.5 xl:px-5 py-2 xl:py-2.5 bg-primary text-white text-xs xl:text-label-md font-semibold rounded-lg hover:bg-primary-hover shadow-soft transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary shrink-0 leading-snug"
            >
              <span>{t('nav.signUp', 'Sign Up')}</span>
              <ArrowRight size={16} aria-hidden="true" className="shrink-0" />
            </button>
          ) : (
            <Link
              to="/signup"
              className="flex items-center gap-1.5 xl:gap-2 px-3.5 xl:px-5 py-2 xl:py-2.5 bg-primary text-white text-xs xl:text-label-md font-semibold rounded-lg hover:bg-primary-hover shadow-soft transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary shrink-0 leading-snug"
            >
              <span>{t('nav.signUp', 'Sign Up')}</span>
              <ArrowRight size={16} aria-hidden="true" className="shrink-0" />
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          className="lg:hidden p-2 text-text-secondary hover:text-primary rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
        >
          {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-surface-border bg-surface-lowest px-6 py-6 space-y-4 shadow-elevated animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-body-md font-medium text-text-secondary hover:text-primary hover:bg-surface-low rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="pt-4 border-t border-surface-border flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                if (onLanguageToggle) onLanguageToggle();
                else toggleLanguage();
              }}
              className="flex items-center justify-center gap-2 px-4 py-3 text-label-md font-medium text-text-secondary bg-surface-low rounded-lg"
            >
              <Globe size={18} />
              <span>{effectiveLang === 'EN' ? 'English (EN)' : 'മലയാളം (ML)'}</span>
            </button>

            {onLoginClick ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLoginClick?.();
                }}
                className="w-full py-3 text-center text-label-md font-semibold text-primary border border-surface-border rounded-lg hover:bg-surface-low"
              >
                {t('nav.login', 'Login')}
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 text-center text-label-md font-semibold text-primary border border-surface-border rounded-lg hover:bg-surface-low block"
              >
                {t('nav.login', 'Login')}
              </Link>
            )}

            {onSignUpClick ? (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSignUpClick?.();
                }}
                className="w-full py-3 text-center text-label-md font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover shadow-soft"
              >
                {t('nav.signUp', 'Sign Up Free')}
              </button>
            ) : (
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 text-center text-label-md font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover shadow-soft block"
              >
                {t('nav.signUp', 'Sign Up Free')}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
