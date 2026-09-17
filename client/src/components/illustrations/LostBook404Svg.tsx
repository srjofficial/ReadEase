import React from 'react';

export interface LostBook404SvgProps {
  className?: string;
}

/**
 * Animated SVG Illustration for ReadEase 404 Page
 * Derived faithfully from Google Stitch project: ReadEase Reading Assistant (Screen 38e4543eca354160b145704dc3659247)
 * Features an open book with flipping pages, floating 4-0-4 glyphs, and drifting dyslexia letters.
 */
export const LostBook404Svg: React.FC<LostBook404SvgProps> = ({ className = '' }) => {
  return (
    <div
      className={`w-full max-w-xl mx-auto relative z-10 flex items-center justify-center ${className}`}
    >
      <svg
        viewBox="0 0 700 450"
        width="100%"
        height="100%"
        className="w-full h-auto drop-shadow-xl select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        role="img"
      >
        <defs>
          <linearGradient id="bookCoverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3a4ca8" />
            <stop offset="100%" stopColor="#283573" />
          </linearGradient>
          <linearGradient id="pageGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fdfbf7" />
            <stop offset="50%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#f4efe6" />
          </linearGradient>
          <linearGradient id="accentGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3a4ca8" stopOpacity="0" />
          </linearGradient>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <style>
          {`
            @keyframes floatBook {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-12px) rotate(1deg); }
            }
            @keyframes flipLeftPage {
              0%, 100% { transform: rotateY(0deg) skewY(0deg); }
              50% { transform: rotateY(18deg) skewY(-3deg); }
            }
            @keyframes flipRightPage {
              0%, 100% { transform: rotateY(0deg) skewY(0deg); }
              50% { transform: rotateY(-18deg) skewY(3deg); }
            }
            @keyframes driftLetter1 {
              0% { transform: translate(0, 0) rotate(0deg); opacity: 0.85; }
              50% { transform: translate(-30px, -45px) rotate(-15deg); opacity: 1; }
              100% { transform: translate(0, 0) rotate(0deg); opacity: 0.85; }
            }
            @keyframes driftLetter2 {
              0% { transform: translate(0, 0) rotate(0deg); opacity: 0.7; }
              50% { transform: translate(25px, -55px) rotate(20deg); opacity: 0.95; }
              100% { transform: translate(0, 0) rotate(0deg); opacity: 0.7; }
            }
            @keyframes driftLetter3 {
              0% { transform: translate(0, 0) rotate(0deg); opacity: 0.6; }
              50% { transform: translate(-15px, -65px) rotate(-8deg); opacity: 0.9; }
              100% { transform: translate(0, 0) rotate(0deg); opacity: 0.6; }
            }
            @keyframes pulseGaze {
              0%, 100% { opacity: 0.35; transform: scale(0.98); }
              50% { opacity: 0.7; transform: scale(1.03); }
            }
            @keyframes floatBookmark {
              0%, 100% { transform: translateY(0) rotate(0deg); }
              50% { transform: translateY(8px) rotate(3deg); }
            }
            .floating-book { animation: floatBook 5s ease-in-out infinite; transform-origin: center bottom; }
            .page-turn-left { animation: flipLeftPage 4s ease-in-out infinite; transform-origin: 350px 250px; }
            .page-turn-right { animation: flipRightPage 4.5s ease-in-out infinite; transform-origin: 350px 250px; }
            .drift-1 { animation: driftLetter1 6s ease-in-out infinite; }
            .drift-2 { animation: driftLetter2 5.2s ease-in-out infinite 0.5s; }
            .drift-3 { animation: driftLetter3 7s ease-in-out infinite 1s; }
            .drift-4 { animation: driftLetter1 5.8s ease-in-out infinite 1.8s; }
            .drift-5 { animation: driftLetter2 6.5s ease-in-out infinite 1.2s; }
            .glow-aura { animation: pulseGaze 4s ease-in-out infinite; transform-origin: 350px 260px; }
            .bookmark-ribbon { animation: floatBookmark 4s ease-in-out infinite; transform-origin: 350px 170px; }
          `}
        </style>

        {/* Ambient Glow Behind Book */}
        <ellipse cx="350" cy="250" rx="220" ry="90" fill="url(#accentGlow)" className="glow-aura" />

        {/* Shadow under the book */}
        <ellipse cx="350" cy="365" rx="210" ry="24" fill="#3a4ca8" opacity="0.12" />

        {/* The Floating Open Book Group */}
        <g className="floating-book">
          {/* Book Spine & Hardcover Base */}
          <path d="M 120 310 Q 350 355 580 310 L 590 326 Q 350 375 110 326 Z" fill="#1e2852" />
          <path
            d="M 118 300 Q 350 345 582 300 L 588 318 Q 350 365 112 318 Z"
            fill="url(#bookCoverGrad)"
          />

          {/* Left Book Thick Page Block (layered paper edges) */}
          <path d="M 130 290 Q 240 280 346 312 L 346 322 Q 240 290 130 302 Z" fill="#e2ded4" />
          <path d="M 130 282 Q 240 272 346 304 L 346 312 Q 240 280 130 290 Z" fill="#ede8dc" />

          {/* Right Book Thick Page Block */}
          <path d="M 570 290 Q 460 280 354 312 L 354 322 Q 460 290 570 302 Z" fill="#e2ded4" />
          <path d="M 570 282 Q 460 272 354 304 L 354 312 Q 460 280 570 290 Z" fill="#ede8dc" />

          {/* Open Main Page Backplates */}
          <path
            d="M 140 272 Q 245 260 348 296 L 348 185 Q 245 152 140 165 Z"
            fill="url(#pageGrad)"
            stroke="#e4ded5"
            strokeWidth="1.5"
          />
          <path
            d="M 560 272 Q 455 260 352 296 L 352 185 Q 455 152 560 165 Z"
            fill="url(#pageGrad)"
            stroke="#e4ded5"
            strokeWidth="1.5"
          />

          {/* Animated Turning Page Left */}
          <g className="page-turn-left">
            <path
              d="M 148 266 Q 245 252 348 294 L 348 182 Q 245 142 152 158 Z"
              fill="#fffefc"
              opacity="0.95"
              stroke="#dfd7cb"
              strokeWidth="1"
            />
            {/* Text Lines on Left Turning Page */}
            <line
              x1="180"
              y1="185"
              x2="315"
              y2="175"
              stroke="#9ba3c7"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="8 5"
            />
            <line
              x1="180"
              y1="202"
              x2="320"
              y2="192"
              stroke="#cbd2e6"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="180"
              y1="218"
              x2="295"
              y2="210"
              stroke="#cbd2e6"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="180"
              y1="234"
              x2="310"
              y2="226"
              stroke="#cbd2e6"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Stylized '4' embedded in left text */}
            <text
              x="210"
              y="255"
              fill="#3a4ca8"
              fontFamily="Lexend, sans-serif"
              fontSize="28"
              fontWeight="900"
              opacity="0.4"
            >
              4
            </text>
          </g>

          {/* Animated Turning Page Right */}
          <g className="page-turn-right">
            <path
              d="M 552 266 Q 455 252 352 294 L 352 182 Q 455 142 548 158 Z"
              fill="#ffffff"
              opacity="0.95"
              stroke="#dfd7cb"
              strokeWidth="1"
            />
            {/* Text Lines on Right Turning Page */}
            <line
              x1="385"
              y1="175"
              x2="520"
              y2="185"
              stroke="#9ba3c7"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="8 5"
            />
            <line
              x1="380"
              y1="192"
              x2="520"
              y2="202"
              stroke="#cbd2e6"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="380"
              y1="210"
              x2="495"
              y2="218"
              stroke="#cbd2e6"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="380"
              y1="226"
              x2="510"
              y2="234"
              stroke="#cbd2e6"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Stylized '4' embedded in right text */}
            <text
              x="450"
              y="255"
              fill="#3a4ca8"
              fontFamily="Lexend, sans-serif"
              fontSize="28"
              fontWeight="900"
              opacity="0.4"
            >
              4
            </text>
          </g>

          {/* Center Spine Crease & Shadow */}
          <path d="M 347 180 Q 350 240 348 300 Q 352 240 353 180 Z" fill="#b8b0a2" opacity="0.6" />

          {/* Bookmark Ribbon cascading down center */}
          <g className="bookmark-ribbon">
            <path
              d="M 347 175 Q 355 240 365 295 L 355 315 L 343 295 Q 345 240 347 175 Z"
              fill="#f59e0b"
              filter="url(#softGlow)"
            />
            <circle cx="355" cy="308" r="3" fill="#ffffff" />
          </g>
        </g>

        {/* Escaping & Drifting "Missing" Characters & Glyphs */}
        {/* Giant Floating '4' on left */}
        <g className="drift-1">
          <circle
            cx="160"
            cy="115"
            r="32"
            fill="#eff2fe"
            stroke="#3a4ca8"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.8"
          />
          <text
            x="146"
            y="129"
            fill="#3a4ca8"
            fontFamily="Lexend, sans-serif"
            fontSize="40"
            fontWeight="900"
          >
            4
          </text>
        </g>

        {/* Giant Floating Magnifying Glass / '0' in center top */}
        <g className="drift-2">
          <ellipse
            cx="350"
            cy="85"
            rx="36"
            ry="36"
            fill="#fffbeb"
            stroke="#f59e0b"
            strokeWidth="2.5"
          />
          {/* Magnifying Glass handle */}
          <line
            x1="375"
            y1="110"
            x2="398"
            y2="133"
            stroke="#d97706"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <text
            x="337"
            y="100"
            fill="#d97706"
            fontFamily="Lexend, sans-serif"
            fontSize="44"
            fontWeight="900"
          >
            0
          </text>
          {/* Sparkle in lens */}
          <polygon
            points="340,65 344,73 352,77 344,81 340,89 336,81 328,77 336,73"
            fill="#fbbf24"
            opacity="0.9"
          />
        </g>

        {/* Giant Floating '4' on right */}
        <g className="drift-3">
          <circle
            cx="540"
            cy="110"
            r="32"
            fill="#eff2fe"
            stroke="#3a4ca8"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.8"
          />
          <text
            x="526"
            y="124"
            fill="#3a4ca8"
            fontFamily="Lexend, sans-serif"
            fontSize="40"
            fontWeight="900"
          >
            4
          </text>
        </g>

        {/* Drifting Playful Dyslexia-Friendly Letters Escaping from the Book */}
        {/* Letter 'b' */}
        <g className="drift-4">
          <rect
            x="235"
            y="70"
            width="34"
            height="34"
            rx="8"
            fill="#ffffff"
            stroke="#c7d2fe"
            strokeWidth="1.5"
          />
          <text
            x="246"
            y="94"
            fill="#4f46e5"
            fontFamily="Lexend, sans-serif"
            fontSize="20"
            fontWeight="bold"
          >
            b
          </text>
        </g>

        {/* Letter 'd' */}
        <g className="drift-5">
          <rect
            x="430"
            y="65"
            width="34"
            height="34"
            rx="8"
            fill="#ffffff"
            stroke="#fde68a"
            strokeWidth="1.5"
          />
          <text
            x="441"
            y="89"
            fill="#d97706"
            fontFamily="Lexend, sans-serif"
            fontSize="20"
            fontWeight="bold"
          >
            d
          </text>
        </g>

        {/* Tiny playful floating spark particles */}
        <circle cx="210" cy="150" r="3.5" fill="#f59e0b" opacity="0.75" className="drift-2" />
        <circle cx="490" cy="145" r="4" fill="#3a4ca8" opacity="0.6" className="drift-1" />
        <circle cx="310" cy="130" r="2.5" fill="#10b981" opacity="0.8" className="drift-3" />
        <polygon
          points="400,120 403,126 410,128 403,130 400,136 397,130 390,128 397,126"
          fill="#f59e0b"
          opacity="0.85"
          className="drift-4"
        />
        <polygon
          points="280,110 283,115 289,117 283,119 280,124 277,119 271,117 277,115"
          fill="#6366f1"
          opacity="0.7"
          className="drift-5"
        />
      </svg>
    </div>
  );
};

export default LostBook404Svg;
