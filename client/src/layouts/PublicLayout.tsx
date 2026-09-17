import React from 'react';
import { Navbar, NavbarProps } from '../components/navigation/Navbar';
import { Footer } from '../components/navigation/Footer';
import { SkipToContent } from '../components/common/SkipToContent';

export interface PublicLayoutProps {
  children: React.ReactNode;
  navbarProps?: Partial<NavbarProps>;
}

/**
 * Public Layout Shell
 * Wraps landing, marketing, authentication, and public research pages.
 * Incorporates Skip-to-content and full semantic landmarks.
 */
export const PublicLayout: React.FC<PublicLayoutProps> = ({ children, navbarProps }) => {
  return (
    <div className="min-h-screen flex flex-col bg-background-cream text-text-primary selection:bg-secondary-container selection:text-secondary-onContainer transition-colors duration-200">
      <SkipToContent contentId="main-content" />

      {/* Top Navbar */}
      <Navbar {...navbarProps} />

      {/* Main Content Landmark */}
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>

      {/* Site Footer */}
      <Footer />
    </div>
  );
};

export default PublicLayout;
