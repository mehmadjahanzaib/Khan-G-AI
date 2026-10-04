import React from 'react';

interface KhanGLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showTagline?: boolean;
  variant?: 'full' | 'mark' | 'squircle' | 'horizontal';
  themeMode?: 'light' | 'dark' | 'auto';
  contrast?: 'on-dark' | 'on-light' | 'auto';
}

/**
 * Official Khan G AI Brand Emblem (Precision Vector)
 * Modeled directly from the official brand identity:
 * - Emerald Ribbon "K" with volumetric gradients (#004D3A -> #00875A -> #00C882 -> #10B981)
 * - Central Calligraphy Fountain Pen Nib & Origami Ribbon in crisp pure white
 * - Dual form: Standalone floating glyph or dark forest-green rounded squircle app icon
 */
export const KhanGMark: React.FC<{
  size?: number | string;
  className?: string;
  isSquircle?: boolean;
}> = ({ size = 40, className = '', isSquircle = false }) => {
  const uniqueId = React.useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-200 select-none ${className}`}
      aria-label="Khan G AI Emblem"
    >
      <defs>
        {/* Rich multi-stop emerald gradients */}
        <linearGradient id={`grad-stem-${uniqueId}`} x1="30%" y1="10%" x2="70%" y2="90%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="35%" stopColor="#00A86B" />
          <stop offset="70%" stopColor="#006A4E" />
          <stop offset="100%" stopColor="#00432E" />
        </linearGradient>

        <linearGradient id={`grad-stem-light-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="40%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>

        <linearGradient id={`grad-top-arm-${uniqueId}`} x1="20%" y1="20%" x2="90%" y2="80%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="45%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#34D399" />
        </linearGradient>

        <linearGradient id={`grad-bottom-arm-${uniqueId}`} x1="10%" y1="10%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#004D3A" />
          <stop offset="40%" stopColor="#007A55" />
          <stop offset="85%" stopColor="#059669" />
          <stop offset="100%" stopColor="#10B981" />
        </linearGradient>

        {/* Squircle background gradient */}
        <linearGradient id={`grad-squircle-bg-${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#082A20" />
          <stop offset="50%" stopColor="#051C15" />
          <stop offset="100%" stopColor="#03120E" />
        </linearGradient>

        {/* Soft realistic drop shadows */}
        <filter id={`shadow-nib-${uniqueId}`} x="-20%" y="-20%" width="150%" height="150%">
          <feDropShadow dx="-1" dy="3" stdDeviation="3.5" floodColor="#00241A" floodOpacity="0.45" />
        </filter>

        <filter id={`shadow-arm-${uniqueId}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#001811" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Optional Dark Forest Squircle Container Tile */}
      {isSquircle && (
        <>
          <rect
            width="200"
            height="200"
            rx="46"
            fill={`url(#grad-squircle-bg-${uniqueId})`}
          />
          <rect
            x="3"
            y="3"
            width="194"
            height="194"
            rx="43"
            fill="none"
            stroke="#10B981"
            strokeOpacity="0.3"
            strokeWidth="3"
          />
        </>
      )}

      {/* Scaled/Centered Inner Emblem Group */}
      <g transform={isSquircle ? 'translate(20, 20) scale(0.8)' : 'translate(0, 0)'}>
        {/* 1. Left Vertical Curved Stem (Main ribbon body) */}
        <path
          d="M 68 28
             C 52 24, 38 34, 36 50
             C 34 68, 48 100, 48 126
             C 48 148, 42 165, 52 174
             C 60 181, 76 182, 84 170
             C 90 162, 88 138, 86 118
             C 84 94, 86 64, 82 46
             C 80 34, 76 30, 68 28 Z"
          fill={`url(#grad-stem-${uniqueId})`}
        />

        {/* Stem Inner Light/Reflective Edge */}
        <path
          d="M 68 28
             C 56 25, 42 34, 40 48
             C 38 62, 46 88, 52 108
             C 56 122, 60 92, 66 68
             C 70 50, 74 36, 68 28 Z"
          fill={`url(#grad-stem-light-${uniqueId})`}
          opacity="0.9"
        />

        {/* 2. Top-Right Diagonal Sweeping Ribbon Arm */}
        <path
          d="M 94 88
             C 106 72, 126 50, 146 36
             C 156 29, 168 26, 172 32
             C 176 38, 168 54, 154 68
             C 136 86, 116 102, 102 110
             Z"
          fill={`url(#grad-top-arm-${uniqueId})`}
          filter={`url(#shadow-arm-${uniqueId})`}
        />

        {/* 3. Bottom-Right Diagonal Ribbon Arm */}
        <path
          d="M 98 102
             C 114 116, 134 136, 150 154
             C 160 166, 168 174, 164 178
             C 160 182, 148 176, 132 166
             C 112 152, 94 136, 84 122
             Z"
          fill={`url(#grad-bottom-arm-${uniqueId})`}
        />

        {/* 4. Central Calligraphy Fountain Pen Nib & Fold (The signature white emblem element) */}
        {/* White Origami Loop Base / Silk Fold */}
        <path
          d="M 72 82
             C 66 94, 66 112, 78 124
             C 88 134, 106 136, 122 126
             C 134 118, 142 106, 136 96
             C 130 86, 112 84, 98 86
             Z"
          fill="#F8FAFC"
          filter={`url(#shadow-nib-${uniqueId})`}
        />

        {/* Calligraphy Fountain Pen Nib Body (Pointing diagonally upwards/left) */}
        <path
          d="M 124 124
             L 86 90
             C 82 86, 78 84, 74 88
             C 70 92, 74 98, 80 104
             L 114 134
             C 120 138, 128 132, 124 124 Z"
          fill="#FFFFFF"
        />

        {/* Stylized Fountain Pen Nib Tip (Triangular Point) */}
        <path
          d="M 66 78
             L 94 102
             L 82 116
             L 58 92
             C 56 90, 58 84, 62 80
             Z"
          fill="#FFFFFF"
        />

        {/* Pen Nib Ink Slit & Breather Hole */}
        <line
          x1="62"
          y1="82"
          x2="78"
          y2="98"
          stroke="#004D3A"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle
          cx="78"
          cy="98"
          r="2.5"
          fill="#004D3A"
        />

        {/* White Ribbon Flow Wing / Underfold Accent */}
        <path
          d="M 88 104
             C 98 116, 114 122, 130 114
             C 124 122, 110 126, 96 118
             Z"
          fill="#E2E8F0"
        />
      </g>
    </svg>
  );
};

export const KhanGLogo: React.FC<KhanGLogoProps> = ({
  className = '',
  size = 'md',
  showTagline = false,
  variant = 'full',
  contrast = 'auto',
}) => {
  const markDimensions = {
    sm: 28,
    md: 36,
    lg: 46,
    xl: 56,
    '2xl': 72,
  }[size];

  const titleSizes = {
    sm: 'text-sm font-bold',
    md: 'text-base sm:text-lg font-extrabold',
    lg: 'text-xl sm:text-2xl font-extrabold',
    xl: 'text-2xl sm:text-3xl font-black',
    '2xl': 'text-3xl sm:text-4xl font-black',
  }[size];

  // Standalone mark or app icon squircle
  if (variant === 'mark') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <KhanGMark size={markDimensions} isSquircle={false} />
      </div>
    );
  }

  if (variant === 'squircle') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <KhanGMark size={markDimensions} isSquircle={true} />
      </div>
    );
  }

  const isDarkContrast = contrast === 'on-dark';

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Brand Icon (Squircle app icon by default for modern presence) */}
      <KhanGMark size={markDimensions} isSquircle={true} className="drop-shadow-sm" />

      {/* Wordmark typography */}
      <div className="flex flex-col leading-none min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className={`tracking-tight font-sans ${
              isDarkContrast
                ? 'text-white'
                : 'text-[#0F172A] dark:text-white'
            } ${titleSizes}`}
          >
            Khan G
          </span>
          <span
            className={`tracking-tight font-sans text-[#00A86B] dark:text-[#10B981] ${titleSizes}`}
          >
            AI
          </span>
        </div>

        {showTagline && (
          <span
            className={`text-[11px] sm:text-xs font-medium tracking-tight mt-1 truncate ${
              isDarkContrast
                ? 'text-emerald-100/80'
                : 'text-[#64748B] dark:text-stone-400'
            }`}
          >
            Your AI Assistant for Work, Study &amp; Everyday Life.
          </span>
        )}
      </div>
    </div>
  );
};

export default KhanGLogo;
