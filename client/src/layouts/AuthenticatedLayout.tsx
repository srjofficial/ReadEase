import React, { useState } from 'react';
import { Sidebar, UserRole, SidebarProps } from '../components/navigation/Sidebar';
import { TopBar, TopBarProps } from '../components/navigation/TopBar';
import { SkipToContent } from '../components/common/SkipToContent';
import { Menu, X } from 'lucide-react';

export interface AuthenticatedLayoutProps {
  children: React.ReactNode;
  role?: UserRole;
  activeItemId?: string;
  onItemSelect?: (id: string) => void;
  pageTitle?: string;
  breadcrumbs?: string[];
  sidebarProps?: Partial<SidebarProps>;
  topBarProps?: Partial<TopBarProps>;
}

/**
 * Authenticated Layout Shell
 * Implements a high-performance 2-column CSS Grid shell (Sidebar + Main Area)
 * with zero layout shifts, role-aware navigation, and WCAG accessibility standards.
 */
export const AuthenticatedLayout: React.FC<AuthenticatedLayoutProps> = ({
  children,
  role = 'student',
  activeItemId = 'dashboard',
  onItemSelect,
  pageTitle = 'Dashboard',
  breadcrumbs = ['ReadEase', 'Dashboard'],
  sidebarProps,
  topBarProps
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background-cream text-text-primary selection:bg-secondary-container selection:text-secondary-onContainer">
      <SkipToContent contentId="main-content" />

      {/* Grid Container for Layout Stability */}
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] min-h-screen">
        {/* Desktop Sidebar (Grid Column 1) */}
        <div className="hidden md:block h-screen sticky top-0 z-40">
          <Sidebar
            role={role}
            activeItemId={activeItemId}
            onItemSelect={onItemSelect}
            {...sidebarProps}
          />
        </div>

        {/* Mobile Header Bar & Drawer Toggle */}
        <div className="md:hidden flex items-center justify-between p-4 bg-surface-lowest border-b border-surface-border sticky top-0 z-50">
          <button
            type="button"
            onClick={() => setMobileDrawerOpen(true)}
            aria-label="Open Navigation Drawer"
            className="p-2 text-text-secondary hover:text-primary rounded-lg focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Menu size={24} />
          </button>
          <span className="font-bold text-primary text-headline-md">ReadEase</span>
          <span className="text-xs uppercase font-semibold text-secondary px-2 py-1 bg-secondary-50 rounded-full border border-secondary-200">
            {role}
          </span>
        </div>

        {/* Mobile Drawer Backdrop & Container */}
        {mobileDrawerOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-text-primary/40 backdrop-blur-sm animate-in fade-in duration-200"
              onClick={() => setMobileDrawerOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-out Drawer */}
            <div className="relative w-4/5 max-w-xs bg-surface-lowest h-full z-10 shadow-elevated flex flex-col animate-in slide-in-from-left duration-200">
              <div className="flex justify-end p-3 border-b border-surface-border">
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(false)}
                  aria-label="Close Navigation Drawer"
                  className="p-2 text-text-muted hover:text-text-primary rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <Sidebar
                  role={role}
                  activeItemId={activeItemId}
                  onItemSelect={(id) => {
                    setMobileDrawerOpen(false);
                    onItemSelect?.(id);
                  }}
                  {...sidebarProps}
                />
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area (Grid Column 2) */}
        <div className="flex flex-col min-w-0 flex-1">
          {/* Top Bar Header Landmark */}
          <TopBar pageTitle={pageTitle} breadcrumbs={breadcrumbs} {...topBarProps} />

          {/* Main Content Landmark */}
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 p-6 md:p-10 max-w-[1400px] w-full mx-auto focus:outline-none"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AuthenticatedLayout;
