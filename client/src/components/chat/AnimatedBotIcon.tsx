import React from 'react';

export interface AnimatedBotIconProps {
  size?: number;
  className?: string;
  primaryColor?: string;
  faceBgColor?: string;
}

export const AnimatedBotIcon: React.FC<AnimatedBotIconProps> = ({
  size = 28,
  className = '',
  primaryColor = '#2196F3',
  faceBgColor = '#e3f2fd'
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`shrink-0 overflow-visible ${className}`}
    >
      <defs>
        <style>{`
          .readease-bot-face-group {
            transform-origin: 100px 105px;
            animation: readease-tilt 4s infinite ease-in-out;
          }
          .readease-bot-wink {
            transform-origin: 120px 95px;
            animation: readease-wink 4s infinite;
          }
          @keyframes readease-tilt {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(10deg); }
          }
          @keyframes readease-wink {
            0%, 45%, 55%, 100% { transform: scaleY(1); opacity: 1; }
            50% { transform: scaleY(0.1); opacity: 0.5; }
          }
        `}</style>
      </defs>

      {/* Speech Bubble Contour */}
      <path
        d="M100 15 C146 15 185 54 185 100 C185 146 146 185 100 185 C85 185 71 181 58 174 L25 185 L36 152 C23 138 15 120 15 100 C15 54 54 15 100 15 Z"
        fill="none"
        stroke={primaryColor}
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Animated Face Group */}
      <g className="readease-bot-face-group">
        {/* Ears */}
        <rect x="40" y="85" width="20" height="40" rx="10" fill={primaryColor} />
        <rect x="140" y="85" width="20" height="40" rx="10" fill={primaryColor} />

        {/* Antenna */}
        <line
          x1="100"
          y1="65"
          x2="100"
          y2="35"
          stroke={primaryColor}
          strokeWidth="8"
          strokeLinecap="round"
        />
        <circle cx="100" cy="30" r="9" fill={primaryColor} />

        {/* Head Box */}
        <rect
          x="52"
          y="65"
          width="96"
          height="70"
          rx="25"
          fill={faceBgColor}
          stroke={primaryColor}
          strokeWidth="8"
        />

        {/* Left Eye (Steady) */}
        <circle cx="80" cy="95" r="8" fill={primaryColor} />

        {/* Right Eye (Winking) */}
        <g className="readease-bot-wink">
          <circle cx="120" cy="95" r="8" fill={primaryColor} />
        </g>

        {/* Smile */}
        <path
          d="M 82 115 Q 100 130 118 115"
          fill="none"
          stroke={primaryColor}
          strokeWidth="7"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
};

export default AnimatedBotIcon;
