import React from 'react';
import { BookOpen, Heart, Sparkles, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer
      aria-label="Site Footer"
      className="bg-surface-lowest dark:bg-surface-dark border-t border-surface-border transition-colors duration-200"
    >
      <div className="max-w-container mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12">
          {/* Column 1: Brand & Disclaimer */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary-container p-2 rounded-lg text-white shadow-soft">
                <BookOpen size={20} aria-hidden="true" />
              </div>
              <span className="text-headline-md font-bold text-primary tracking-tight">
                ReadEase
              </span>
            </div>

            <p className="text-body-md text-text-secondary max-w-md leading-relaxed">
              Empowering students with dyslexia, neurodivergent readers, and educators with
              evidence-based cognitive accessibility and assistive reading technology.
            </p>

            <div className="p-4 bg-surface-low border border-surface-border rounded-xl space-y-1.5 max-w-lg">
              <div className="flex items-center gap-2 text-label-md font-semibold text-text-primary">
                <ShieldCheck size={16} className="text-secondary" />
                <span>Screening & Assistive Aid Notice</span>
              </div>
              <p className="text-xs text-text-muted leading-normal">
                ReadEase provides assistive reading accommodations and preliminary dyslexia
                screening insights. It is designed to assist learning and is not a formal medical or
                clinical diagnostic instrument.
              </p>
            </div>
          </div>

          {/* Column 2: Platform Links */}
          <div className="space-y-3">
            <h2 className="text-label-md font-bold uppercase tracking-wider text-text-primary">
              Platform
            </h2>
            <ul className="space-y-2 text-body-md text-text-secondary">
              <li>
                <a href="#about" className="hover:text-primary transition-colors">
                  About the Project
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-primary transition-colors">
                  Bionic Reading Engine
                </a>
              </li>
              <li>
                <a href="#assessment" className="hover:text-primary transition-colors">
                  Reading Speed Assessment
                </a>
              </li>
              <li>
                <a href="#educators" className="hover:text-primary transition-colors">
                  For Educators & Schools
                </a>
              </li>
              <li>
                <a href="#research" className="hover:text-primary transition-colors">
                  Dyslexia Typography Research
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Accessibility & Legal */}
          <div className="space-y-3">
            <h2 className="text-label-md font-bold uppercase tracking-wider text-text-primary">
              Accessibility & Legal
            </h2>
            <ul className="space-y-2 text-body-md text-text-secondary">
              <li>
                <a
                  href="#accessibility"
                  className="hover:text-primary transition-colors flex items-center gap-1.5"
                >
                  <Sparkles size={14} className="text-secondary" />
                  <span>WCAG 2.1 AA Statement</span>
                </a>
              </li>
              <li>
                <a href="#privacy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#terms" className="hover:text-primary transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#contact" className="hover:text-primary transition-colors">
                  Support & Contact
                </a>
              </li>
              <li>
                <a href="#sitemap" className="hover:text-primary transition-colors">
                  Sitemap
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <p>© {new Date().getFullYear()} ReadEase Platform. All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span>Built with care for neurodivergent accessibility</span>
            <Heart size={14} className="text-feedback-error fill-feedback-error" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
