import React from 'react';
import { MeasureMode } from '../types';
import { Activity, MoveHorizontal, ArrowUpDown, Vibrate, CheckCircle2 } from 'lucide-react';

interface PhoneContactDiagramProps {
  mode: MeasureMode;
}

export const PhoneContactDiagram: React.FC<PhoneContactDiagramProps> = ({ mode }) => {
  return (
    <div className="relative w-full bg-slate-50 border border-slate-200/90 rounded-2xl p-4 flex flex-col items-center justify-center overflow-hidden shadow-2xs">
      {/* Header Info */}
      <div className="w-full flex items-center justify-between mb-3 text-xs">
        <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-teal-600" />
          Acoustic Contact Alignment
        </span>
        <span className="text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold">
          {mode === 'texture' && 'Horizontal Slide Demo'}
          {mode === 'hardness' && 'Vertical Tap Demo'}
          {mode === 'density' && 'Continuous Contact + Vibration'}
        </span>
      </div>

      {/* Movement Demo Box */}
      <div className="relative w-full max-w-[320px] h-[190px] flex items-center justify-center bg-white rounded-xl border border-slate-200/80 p-2 overflow-hidden">
        {/* Ambient Grid Background */}
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }}
        />

        {/* Mode-specific Movement Diagram SVG */}
        <svg
          viewBox="0 0 300 180"
          className="w-full h-full select-none"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Phone casing gradient */}
            <linearGradient id="vPhoneChassis" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>

            {/* Phone screen gradient */}
            <linearGradient id="vPhoneScreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#334155" />
              <stop offset="50%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Roughness pattern on surface */}
            <pattern id="roughSurface" width="10" height="10" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="4" r="0.8" fill="#94a3b8" />
              <circle cx="7" cy="8" r="1.0" fill="#64748b" />
              <circle cx="5" cy="2" r="0.6" fill="#94a3b8" />
            </pattern>

            <style>{`
              @keyframes slideHorizontal {
                0% { transform: translateX(-36px); }
                50% { transform: translateX(36px); }
                100% { transform: translateX(-36px); }
              }
              @keyframes tapVertical {
                0% { transform: translateY(0px); }
                30% { transform: translateY(-34px); }
                50% { transform: translateY(0px); }
                70% { transform: translateY(-16px); }
                100% { transform: translateY(0px); }
              }
              @keyframes vibrationMicro {
                0% { transform: translate(0, 0); }
                20% { transform: translate(-1.5px, 0.8px); }
                40% { transform: translate(1.5px, -0.8px); }
                60% { transform: translate(-1px, -0.5px); }
                80% { transform: translate(1px, 0.5px); }
                100% { transform: translate(0, 0); }
              }
              @keyframes pulseWave {
                0% { opacity: 0.8; transform: scale(0.8); }
                50% { opacity: 0.3; transform: scale(1.15); }
                100% { opacity: 0.8; transform: scale(0.8); }
              }
              @keyframes sparkFlash {
                0%, 100% { opacity: 0.2; transform: scale(0.9); }
                50% { opacity: 0.9; transform: scale(1.2); }
              }
              .anim-slide {
                animation: slideHorizontal 2.8s ease-in-out infinite;
                transform-origin: 150px 140px;
              }
              .anim-tap {
                animation: tapVertical 1.6s ease-in-out infinite;
                transform-origin: 150px 140px;
              }
              .anim-vibrate {
                animation: vibrationMicro 0.12s linear infinite;
                transform-origin: 150px 140px;
              }
              .anim-wave {
                animation: pulseWave 1.2s ease-in-out infinite;
                transform-origin: center;
              }
              .anim-spark {
                animation: sparkFlash 0.8s ease-in-out infinite;
                transform-origin: center;
              }
            `}</style>
          </defs>

          {/* Target Object / Material Surface (Bottom Slab) */}
          <rect
            x="15"
            y="142"
            width="270"
            height="26"
            rx="5"
            fill="#e2e8f0"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          <rect
            x="15"
            y="142"
            width="270"
            height="26"
            rx="5"
            fill="url(#roughSurface)"
            opacity="0.8"
          />

          {/* Surface Contact Baseline Annotation */}
          <text
            x="150"
            y="159"
            textAnchor="middle"
            fill="#475569"
            fontSize="9"
            fontWeight="bold"
            fontFamily="monospace"
            letterSpacing="0.05em"
          >
            OBJECT SURFACE UNDER TEST
          </text>

          {/* ======================================================== */}
          {/* MODE 1: TEXTURE (HORIZONTAL SLIDING) */}
          {/* ======================================================== */}
          {mode === 'texture' && (
            <>
              {/* Motion Path Guide Arrow (Horizontal) */}
              <g opacity="0.85">
                <path
                  d="M70 128H230"
                  stroke="#14b8a6"
                  strokeWidth="2.5"
                  strokeDasharray="4 3"
                />
                {/* Left Arrow */}
                <polygon points="70,128 78,124 78,132" fill="#14b8a6" />
                {/* Right Arrow */}
                <polygon points="230,128 222,124 222,132" fill="#14b8a6" />
                <text
                  x="150"
                  y="122"
                  textAnchor="middle"
                  fill="#0d9488"
                  fontSize="8.5"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  ← SLIDE HORIZONTALLY (5+ TIMES) →
                </text>
              </g>

              {/* Vertical Smartphone with Animated Sliding Motion */}
              <g className="anim-slide">
                {/* Vertical Phone Shadow */}
                <rect
                  x="122"
                  y="14"
                  width="56"
                  height="128"
                  rx="12"
                  fill="rgba(0,0,0,0.18)"
                  transform="translate(4, 3)"
                />

                {/* Vertical Phone Chassis */}
                <rect
                  x="122"
                  y="14"
                  width="56"
                  height="128"
                  rx="12"
                  fill="url(#vPhoneChassis)"
                  stroke="#475569"
                  strokeWidth="1.8"
                />

                {/* Vertical Phone Glass Screen */}
                <rect
                  x="126"
                  y="22"
                  width="48"
                  height="110"
                  rx="8"
                  fill="url(#vPhoneScreen)"
                  stroke="#334155"
                  strokeWidth="1"
                />

                {/* Screen Content Graphic: Waveform */}
                <path
                  d="M130 75 Q135 60, 142 80 T150 72 T158 84 T168 75"
                  stroke="#14b8a6"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="150" cy="72" r="2" fill="#2dd4bf" />

                {/* Top Speaker Ear Notch */}
                <rect x="144" y="18" width="12" height="2" rx="1" fill="#64748b" />

                {/* Bottom Edge Contact Point (Microphone Port) */}
                <rect x="142" y="138" width="16" height="4" rx="2" fill="#38bdf8" />
                <circle cx="146" cy="140" r="1.5" fill="#f8fafc" />
                <circle cx="154" cy="140" r="1.2" fill="#64748b" />

                {/* Friction Ripples at Contact Point */}
                <ellipse cx="150" cy="142" rx="14" ry="3" stroke="#2dd4bf" strokeWidth="1.2" opacity="0.75" />
              </g>
            </>
          )}

          {/* ======================================================== */}
          {/* MODE 2: HARDNESS (VERTICAL TAPPING UP / DOWN) */}
          {/* ======================================================== */}
          {mode === 'hardness' && (
            <>
              {/* Motion Path Guide Arrow (Vertical) */}
              <g opacity="0.85">
                <path
                  d="M150 10V136"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                  opacity="0.4"
                />
                {/* Arrow up/down on side */}
                <path d="M85 45V115" stroke="#0284c7" strokeWidth="2.5" />
                <polygon points="85,45 81,53 89,53" fill="#0284c7" />
                <polygon points="85,115 81,107 89,107" fill="#0284c7" />
                <text
                  x="85"
                  y="128"
                  textAnchor="middle"
                  fill="#0369a1"
                  fontSize="8"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  TAP 5×
                </text>
              </g>

              {/* Vertical Smartphone with Animated Tapping Motion */}
              <g className="anim-tap">
                {/* Vertical Phone Shadow */}
                <rect
                  x="122"
                  y="14"
                  width="56"
                  height="128"
                  rx="12"
                  fill="rgba(0,0,0,0.18)"
                  transform="translate(4, 3)"
                />

                {/* Vertical Phone Chassis */}
                <rect
                  x="122"
                  y="14"
                  width="56"
                  height="128"
                  rx="12"
                  fill="url(#vPhoneChassis)"
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                />

                {/* Vertical Phone Glass Screen */}
                <rect
                  x="126"
                  y="22"
                  width="48"
                  height="110"
                  rx="8"
                  fill="url(#vPhoneScreen)"
                  stroke="#334155"
                  strokeWidth="1"
                />

                {/* Screen Content Graphic: Impulse Spike */}
                <path
                  d="M132 80 L146 80 L150 48 L154 90 L158 78 L168 80"
                  stroke="#38bdf8"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
                <circle cx="150" cy="48" r="2.5" fill="#38bdf8" />

                {/* Top Speaker Ear Notch */}
                <rect x="144" y="18" width="12" height="2" rx="1" fill="#64748b" />

                {/* Bottom Edge Contact Point (Microphone Port) */}
                <rect x="142" y="138" width="16" height="4" rx="2" fill="#0284c7" />
                <circle cx="146" cy="140" r="1.5" fill="#f8fafc" />
                <circle cx="154" cy="140" r="1.2" fill="#64748b" />
              </g>

              {/* Impact Shockwaves at Surface Contact Point */}
              <g className="anim-spark">
                <circle cx="150" cy="142" r="8" stroke="#38bdf8" strokeWidth="1.8" fill="rgba(56, 189, 248, 0.25)" />
                <circle cx="150" cy="142" r="18" stroke="#0284c7" strokeWidth="1.2" opacity="0.6" />
                <circle cx="150" cy="142" r="28" stroke="#0284c7" strokeWidth="0.8" opacity="0.3" strokeDasharray="3 3" />
              </g>
            </>
          )}

          {/* ======================================================== */}
          {/* MODE 3: DENSITY (MAINTAIN TOUCHING + VIBRATION SYMBOL) */}
          {/* ======================================================== */}
          {mode === 'density' && (
            <>
              {/* Maintain Touch Indicator Label */}
              <g>
                <text
                  x="150"
                  y="12"
                  textAnchor="middle"
                  fill="#e11d48"
                  fontSize="8.5"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  ⚡ HOLD CONTACT FIRMLY · 10s CONTINUOUS VIBRATION
                </text>
              </g>

              {/* Pulsating Vibration Waves radiating from phone sides */}
              <g className="anim-wave">
                {/* Left Vibration Arc Waves */}
                <path d="M108 45 Q100 78 108 110" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                <path d="M98 38 Q86 78 98 118" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                <path d="M88 32 Q72 78 88 126" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />

                {/* Right Vibration Arc Waves */}
                <path d="M192 45 Q200 78 192 110" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
                <path d="M202 38 Q214 78 202 118" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                <path d="M212 32 Q228 78 212 126" stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
              </g>

              {/* Vertical Smartphone Maintaining Firm Touching Surface with Micro Vibration */}
              <g className="anim-vibrate">
                {/* Phone Shadow */}
                <rect
                  x="122"
                  y="14"
                  width="56"
                  height="128"
                  rx="12"
                  fill="rgba(0,0,0,0.2)"
                  transform="translate(3, 2)"
                />

                {/* Vertical Phone Chassis */}
                <rect
                  x="122"
                  y="14"
                  width="56"
                  height="128"
                  rx="12"
                  fill="url(#vPhoneChassis)"
                  stroke="#f43f5e"
                  strokeWidth="2"
                />

                {/* Vertical Phone Glass Screen */}
                <rect
                  x="126"
                  y="22"
                  width="48"
                  height="110"
                  rx="8"
                  fill="url(#vPhoneScreen)"
                  stroke="#334155"
                  strokeWidth="1"
                />

                {/* Screen Vibration Icon & Frequency Waves */}
                <circle cx="150" cy="72" r="14" fill="rgba(244, 63, 94, 0.15)" />
                <path
                  d="M142 72 Q146 64 150 72 T158 72"
                  stroke="#fb7185"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <circle cx="150" cy="72" r="3" fill="#f43f5e" />

                {/* Top Speaker Ear Notch */}
                <rect x="144" y="18" width="12" height="2" rx="1" fill="#64748b" />

                {/* Bottom Edge Microphone Port firmly locked on surface */}
                <rect x="140" y="138" width="20" height="4" rx="2" fill="#e11d48" />
                <circle cx="146" cy="140" r="1.5" fill="#ffffff" />
                <circle cx="154" cy="140" r="1.5" fill="#fecdd3" />
              </g>

              {/* Vibration Transmission into Surface Substrate */}
              <g>
                <ellipse cx="150" cy="143" rx="30" ry="4" stroke="#f43f5e" strokeWidth="1.5" opacity="0.8" />
                <ellipse cx="150" cy="148" rx="50" ry="6" stroke="#fb7185" strokeWidth="1" opacity="0.5" strokeDasharray="4 3" />
                <ellipse cx="150" cy="154" rx="75" ry="8" stroke="#fb7185" strokeWidth="0.8" opacity="0.3" strokeDasharray="3 3" />
              </g>
            </>
          )}
        </svg>
      </div>

      {/* Movement Description Caption */}
      <div className="w-full mt-2.5 text-center text-xs text-slate-600">
        {mode === 'texture' && (
          <p className="font-medium text-slate-700">
            Hold smartphone <strong className="text-teal-700">vertically</strong> and slide bottom microphone port back and forth horizontally across the surface 5+ times.
          </p>
        )}
        {mode === 'hardness' && (
          <p className="font-medium text-slate-700">
            Hold smartphone <strong className="text-sky-700">vertically</strong> and tap the bottom microphone port firmly up and down against the object 5 times.
          </p>
        )}
        {mode === 'density' && (
          <p className="font-medium text-slate-700">
            Hold smartphone <strong className="text-rose-700">vertically</strong> firmly touching the surface while the 10-second high-performance motor vibrates.
          </p>
        )}
      </div>
    </div>
  );
};
