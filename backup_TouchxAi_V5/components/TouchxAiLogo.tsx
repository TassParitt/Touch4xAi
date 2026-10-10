import React from 'react';

interface TouchxAiLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  version?: string;
}

export const TouchxAiLogo: React.FC<TouchxAiLogoProps> = ({
  size = 'md',
  showTagline = true,
  version = 'V5',
}) => {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 42 : 34;

  return (
    <div className="flex items-center gap-2.5 group select-none">
      {/* High-Tech Custom TouchxAi Badge */}
      <div
        className="relative rounded-xl bg-slate-950 flex items-center justify-center shadow-md overflow-hidden border border-slate-800 shrink-0"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg
          viewBox="0 0 40 40"
          className="w-full h-full p-1"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle acoustic radiating rings */}
          <circle cx="20" cy="28" r="10" stroke="rgba(20, 184, 166, 0.25)" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="20" cy="28" r="6" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="1" />

          {/* Stylized 'T' and 'x' geometric fusion */}
          {/* T-bar */}
          <path
            d="M8 11H22"
            stroke="#f8fafc"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M15 11V28"
            stroke="#f8fafc"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Dynamic Electric Cyan / Teal 'x' */}
          <path
            d="M21 16L32 27"
            stroke="#14b8a6"
            strokeWidth="2.6"
            strokeLinecap="round"
          />
          <path
            d="M32 16L21 27"
            stroke="#38bdf8"
            strokeWidth="2.6"
            strokeLinecap="round"
          />

          {/* Smart Contact Point Sensor Dot with glow */}
          <circle cx="20" cy="28" r="2.5" fill="#2dd4bf" />
          <circle cx="20" cy="28" r="4.5" stroke="#2dd4bf" strokeWidth="0.8" opacity="0.8" />
        </svg>

        {/* Ambient neon shimmer */}
        <div className="absolute inset-0 bg-radial from-teal-500/15 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col text-left leading-none">
        <div className="flex items-center">
          <span className="font-extrabold text-base tracking-tight text-slate-950 font-sans">
            Touch<span className="text-teal-600">x</span>Ai<span className="text-teal-600 font-mono font-bold tracking-tight">_V5</span>
          </span>
        </div>
        {showTagline && (
          <span className="text-[9px] font-mono font-bold tracking-wider text-slate-500 uppercase mt-0.5">
            SMART CONTACT
          </span>
        )}
      </div>
    </div>
  );
};
