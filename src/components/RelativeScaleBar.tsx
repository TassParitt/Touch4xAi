import React from 'react';
import { DifferentialResult, MeasureMode } from '../types';
import { ArrowDown, CheckCircle2, ShieldCheck, User, Compass } from 'lucide-react';

interface RelativeScaleBarProps {
  mode: MeasureMode;
  differential: DifferentialResult;
  objectName: string;
  legacyScore?: number;
  showLegacyV5Toggle?: boolean;
  versionMode?: 'V6Pro' | 'V5';
}

export const RelativeScaleBar: React.FC<RelativeScaleBarProps> = ({
  mode,
  differential,
  objectName,
  legacyScore = 5.0,
}) => {
  const diffPct = differential.differentialPercent; // e.g. +1250 or -40
  const refName = differential.baselineName || 'Forearm Skin';

  // Dynamic Auto-Adjusted Scale Range (unlimited positive scale, minimum -100%)
  const maxScale = differential.maxScaleRange || Math.max(100, Math.ceil((Math.max(100, Math.abs(diffPct)) * 1.25) / 100) * 100);

  // Total span from -100% to +maxScale%
  const totalSpan = 100 + maxScale;

  // Zero position (0% Reference mark) in percentage along the track
  const zeroPosPct = Math.max(4, Math.min(90, (100 / totalSpan) * 100));

  // Test object marker position in percentage along the track
  const markerPosPct = Math.max(2, Math.min(98, ((diffPct + 100) / totalSpan) * 100));

  const isHardness = mode === 'hardness';
  const isTexture = mode === 'texture';

  const leftLabel = isTexture ? '-100% (Ultra-Smooth)' : isHardness ? '-100% (Ultra-Soft)' : '-100% (Near Vacuum)';
  const rightLabel = isTexture ? `+${maxScale.toLocaleString()}% (Roughness)` : isHardness ? `+${maxScale.toLocaleString()}% (Rigidity)` : `+${maxScale.toLocaleString()}% (Density)`;

  const formattedDiff = `${diffPct > 0 ? '+' : ''}${diffPct.toLocaleString()}%`;

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs text-left space-y-3">
      {/* Header with Title and Reference Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200/80">
            Δ%
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <span>Relative Differential Scale</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-teal-100 text-teal-800">
                -100% ⟷ 0% ⟷ +{maxScale.toLocaleString()}%
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Auto-adjusted scale compared against <strong className="text-slate-700">{refName} (0% Reference)</strong>
            </p>
          </div>
        </div>

        {/* Baseline Status Pill */}
        <div className="flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Compass className="w-3 h-3 text-emerald-600" />
          <span>Reference: 0%</span>
        </div>
      </div>

      {/* Main Dynamic Differential Output Callout */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
        <div>
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-mono block">
            Differential Result:
          </span>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight leading-tight block mt-0.5">
            {differential.displayLabel}
          </span>
        </div>

        <div className="text-right shrink-0">
          <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight tabular-nums ${
            diffPct > 0 ? 'text-teal-700' : diffPct < 0 ? 'text-sky-700' : 'text-slate-800'
          }`}>
            {formattedDiff}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">vs {refName}</span>
        </div>
      </div>

      {/* Auto-Adjusted Graphical Scale Bar (Unlimited Positive Scale) */}
      <div className="pt-4 pb-1">
        {/* Scale Bar Track */}
        <div className="relative h-7 rounded-xl bg-slate-100 p-1 border border-slate-300/80 overflow-visible">
          {/* Dual-gradient track */}
          <div className="w-full h-full rounded-lg bg-linear-to-r from-sky-400 via-teal-400 to-rose-500 opacity-90" />

          {/* Dynamic 0% Reference Baseline Line */}
          <div
            className="absolute top-[-5px] bottom-[-5px] w-1 bg-slate-950 rounded-full shadow-sm z-10 flex flex-col items-center -ml-0.5"
            style={{ left: `${zeroPosPct}%` }}
          >
            <span className="absolute -top-5.5 text-[9px] font-mono font-bold text-slate-900 bg-white px-1.5 py-0.2 rounded-md border border-slate-300 shadow-2xs whitespace-nowrap">
              0% Ref ({refName})
            </span>
          </div>

          {/* Test Object Indicator Pin */}
          <div
            className="absolute -top-3.5 bottom-[-8px] transition-all duration-300 flex flex-col items-center z-20 -ml-2"
            style={{ left: `${markerPosPct}%` }}
          >
            {/* Pointer arrow & pill */}
            <div className="bg-slate-950 text-white text-[10px] font-bold font-mono px-2 py-0.5 rounded-md shadow-md flex items-center gap-1 border border-white/20 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
              <span>{objectName || 'Test'}: {formattedDiff}</span>
            </div>
            <div className="w-0.5 flex-1 bg-slate-950" />
            <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border-2 border-white shadow-xs" />
          </div>
        </div>

        {/* Auto-Adjusted Scale Legends */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-3 pt-1">
          <span className="text-left font-medium text-sky-700">{leftLabel}</span>
          <span className="text-center font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
            0% Reference ({refName})
          </span>
          <span className="text-right font-medium text-rose-700">{rightLabel}</span>
        </div>
      </div>

      {/* Reference Benchmark & Absolute Score Comparison Footer */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1.5 truncate">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
          <span className="truncate">Reference: <strong>{refName} ({differential.baselineValue.toFixed(1)})</strong></span>
        </div>
        <div className="font-mono text-[11px] text-slate-600 shrink-0">
          Absolute Score: <strong className="text-slate-900">{legacyScore.toFixed(1)} / 10</strong>
        </div>
      </div>
    </div>
  );
};
