import React from 'react';

interface PakistanEmblemProps {
  className?: string;
  size?: number;
  variant?: 'flag' | 'crescent-star' | 'circle' | 'shield' | 'ai-emblem';
  showBorder?: boolean;
}

/**
 * Mathematically accurate SVG representation of the National Flag and Crescent & Star of Pakistan,
 * plus modern Khan G AI emblem with neural orbital ring.
 * Colors: Pakistan Forest Green (#01411C / #025625), Crisp White (#FFFFFF), Golden Star (#FDE047).
 */
export const PakistanEmblem: React.FC<PakistanEmblemProps> = ({
  className = '',
  size = 24,
  variant = 'flag',
  showBorder = true,
}) => {
  if (variant === 'ai-emblem') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Khan G AI Pakistan Emblem"
      >
        <defs>
          <linearGradient id="emblem-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#01411C" />
            <stop offset="100%" stopColor="#025625" />
          </linearGradient>
          <linearGradient id="emblem-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#EAB308" />
          </linearGradient>
        </defs>

        {/* Outer Circular Aura */}
        <circle cx="50" cy="50" r="48" fill="url(#emblem-bg)" />
        <circle cx="50" cy="50" r="47" stroke="#10B981" strokeWidth="1.5" strokeOpacity="0.4" />

        {/* AI Orbital Ring */}
        <circle cx="50" cy="50" r="38" stroke="#34D399" strokeWidth="1" strokeDasharray="3 4" strokeOpacity="0.6" />

        {/* Orbiting Satellite Data Nodes */}
        <circle cx="22" cy="28" r="2.2" fill="#34D399" />
        <circle cx="78" cy="72" r="2.5" fill="#FDE047" />
        <circle cx="76" cy="30" r="1.8" fill="#FFFFFF" />

        {/* National Crescent Moon */}
        <path
          d="M 52 23 C 35 23 23 36 23 53 C 23 70 35 83 52 83 C 42 79 35 67 35 53 C 35 39 42 27 52 23 Z"
          fill="#FFFFFF"
        />

        {/* 5-pointed Tilted Golden Star */}
        <polygon
          points="64,35 67,43 76,43 69,48 71,57 64,52 57,57 59,48 52,43 61,43"
          fill="url(#emblem-gold)"
        />
      </svg>
    );
  }

  if (variant === 'crescent-star') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Crescent and Star of Pakistan"
      >
        {/* Crescent */}
        <path
          d="M 50 12 A 38 38 0 1 0 88 50 A 32 32 0 1 1 50 12 Z"
          fill="currentColor"
        />
        {/* Five-Pointed Star tilted towards upper right */}
        <polygon
          points="68,32 72,41 81,42 74,48 76,57 68,52 60,57 62,48 55,42 64,41"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (variant === 'circle') {
    return (
      <div
        style={{ width: size, height: size }}
        className={`relative rounded-full overflow-hidden shrink-0 shadow-xs flex items-center justify-center bg-[#01411C] ${
          showBorder ? 'ring-1.5 ring-emerald-600/30' : ''
        } ${className}`}
        title="Islamic Republic of Pakistan"
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* White vertical bar representing minorities (25% on the left) */}
          <rect x="0" y="0" width="25" height="100" fill="#FFFFFF" />
          {/* Green field */}
          <rect x="25" y="0" width="75" height="100" fill="#01411C" />
          {/* Crescent Moon */}
          <path
            d="M 60 22 C 45 22 34 35 34 50 C 34 65 45 78 60 78 C 50 78 43 66 43 50 C 43 34 50 22 60 22 Z"
            fill="#FFFFFF"
          />
          {/* 5-pointed tilted star */}
          <polygon
            points="70,36 73,43 81,43 75,48 77,56 70,51 63,56 65,48 59,43 67,43"
            fill="#FFFFFF"
          />
        </svg>
      </div>
    );
  }

  // Default: Flag rectangular format (3:2 ratio)
  const height = Math.round((size * 2) / 3);
  return (
    <div
      style={{ width: size, height }}
      className={`relative rounded-xs overflow-hidden shrink-0 shadow-xs inline-flex items-center justify-center bg-[#01411C] ${
        showBorder ? 'ring-1 ring-black/10' : ''
      } ${className}`}
      title="Flag of Pakistan"
    >
      <svg
        viewBox="0 0 90 60"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* White vertical stripe on the hoist (1/4th width = 22.5) */}
        <rect x="0" y="0" width="22.5" height="60" fill="#FFFFFF" />
        {/* Dark Green field (3/4th width = 67.5) */}
        <rect x="22.5" y="0" width="67.5" height="60" fill="#01411C" />
        {/* Crescent facing the upper-right corner */}
        <path
          d="M 56 12 C 43 15 35 25 36 37 C 37 47 46 54 57 52 C 47 50 42 41 42 32 C 42 22 48 15 56 12 Z"
          fill="#FFFFFF"
        />
        {/* Five-pointed star tilted toward upper fly */}
        <polygon
          points="66,21 68,26 73,26 69,29 70,35 66,32 62,35 63,29 59,26 64,26"
          fill="#FFFFFF"
        />
      </svg>
    </div>
  );
};

export default PakistanEmblem;
