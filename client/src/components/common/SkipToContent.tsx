import React from 'react';

export interface SkipToContentProps {
  contentId?: string;
  label?: string;
}

/**
 * Accessible Skip Link
 * Allows keyboard and screen-reader users to bypass repeated navigation landmarks.
 */
export const SkipToContent: React.FC<SkipToContentProps> = ({
  contentId = 'main-content',
  label = 'Skip to main content'
}) => {
  return (
    <a
      href={`#${contentId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-5 focus:py-3 focus:bg-primary focus:text-white focus:font-semibold focus:rounded-lg focus:shadow-elevated focus:outline-none focus:ring-4 focus:ring-secondary"
    >
      {label}
    </a>
  );
};

export default SkipToContent;
