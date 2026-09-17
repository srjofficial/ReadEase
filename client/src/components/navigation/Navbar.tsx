import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Globe, Menu, X, ArrowRight } from 'lucide-react';

export interface NavbarProps {
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
  currentLanguage?: 'EN' | 'ML';
  onLanguageToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onLoginClick,
  onSignUpClick,
  currentLanguage = 'EN',
  onLanguageToggle
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'About', href: '#about' },
    { label: 'Features', href: '#features' },
    { label: 'Reading Tools', href: '#tools' },
    { label: 'Testimonials', href: '#testimonials' },
    { label: 'FAQ', href: '#faq' }
  ];

  return (
    <nav
      aria-label="Primary Navigation"
      className="sticky top-0 z-50 bg-surface-lowest/95 backdrop-blur-md border-b border-surface-border transition-all duration-200"
    >
      <div className="max-w-container mx-auto px-6 h-20 flex items-center justify-between">
        {/* Brand */}
        <Link
          to="/"
          className="flex items-center gap-3 group focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
          aria-label="ReadEase Home"
        >
          <div className="bg-primary-container p-2.5 rounded-xl text-white shadow-soft group-hover:scale-105 transition-transform duration-200">
            <BookOpen size={24} aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-headline-md font-bold text-primary tracking-tight">ReadEase</span>
            <span className="text-[0.7rem] uppercase tracking-wider font-semibold text-text-muted">
              Assistive Platform
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-label-md text-text-secondary hover:text-primary font-medium transition-colors duration-150 relative py-1 focus-visible:ring-2 focus-visible:ring-primary rounded"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          {/* Language Switcher */}
          <button
            type="button"
            onClick={onLanguageToggle}
            aria-label={`Current language is ${currentLanguage === 'EN' ? 'English' : 'Malayalam'}. Click to toggle.`}
            className="flex items-center gap-1.5 px-3 py-2 text-label-md font-medium text-text-secondary hover:text-primary hover:bg-surface-low rounded-lg transition-colors"
          >
            <Globe size={18} aria-hidden="true" />
            <span>{currentLanguage === 'EN' ? 'EN / ML' : 'ML / EN'}</span>
          </button>

          {/* Login Button */}
          <button
            type="button"
            onClick={onLoginClick}
            className="px-4 py-2.5 text-label-md font-semibold text-primary hover:bg-surface-low rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-primary"
          >
            Login
          </button>

          {/* Sign Up CTA */}
          <button
            type="button"
            onClick={onSignUpClick}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-label-md font-semibold rounded-lg hover:bg-primary-hover shadow-soft transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span>Sign Up</span>
            <ArrowRight size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Mobile Menu Toggle Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
          className="md:hidden p-2 text-text-secondary hover:text-primary rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
        >
          {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-surface-border bg-surface-lowest px-6 py-6 space-y-4 shadow-elevated animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
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
              onClick={onLanguageToggle}
              className="flex items-center justify-center gap-2 px-4 py-3 text-label-md font-medium text-text-secondary bg-surface-low rounded-lg"
            >
              <Globe size={18} />
              <span>Language: {currentLanguage === 'EN' ? 'English (EN)' : 'Malayalam (ML)'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onLoginClick?.();
              }}
              className="w-full py-3 text-center text-label-md font-semibold text-primary border border-surface-border rounded-lg hover:bg-surface-low"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onSignUpClick?.();
              }}
              className="w-full py-3 text-center text-label-md font-semibold bg-primary text-white rounded-lg hover:bg-primary-hover shadow-soft"
            >
              Sign Up Free
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
