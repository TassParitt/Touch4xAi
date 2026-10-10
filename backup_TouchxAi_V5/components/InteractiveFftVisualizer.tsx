import React, { useState, useRef, useMemo } from 'react';
import { Activity, Sparkles, Crosshair } from 'lucide-react';
import { DspParameters } from '../types';

interface InteractiveFftVisualizerProps {
  spectrumDb: number[];
  dsp: DspParameters;
  dominantHarmonic?: string;
  dominantPeaks?: { freq: number; db: number }[];
  height?: number;
  className?: string;
  showPeakPills?: boolean;
}

export const InteractiveFftVisualizer: React.FC<InteractiveFftVisualizerProps> = ({
  spectrumDb,
  dsp,
  dominantHarmonic = '1,400 Hz',
  dominantPeaks = [],
  height = 160,
  className = '',
  showPeakPills = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Hover state
  const [hoveredData, setHoveredData] = useState<{
    freq: number;
    db: number;
    x: number;
    y: number;
    svgX: number;
    svgY: number;
    isPeak?: boolean;
    peakLabel?: string;
  } | null>(null);

  const binCount = spectrumDb.length || 128;
  const minFreq = 20;
  const maxFreq = 15000;
  const minDb = -120;
  const maxDb = 0;

  // Convert bin index to frequency (logarithmic mapping 20Hz - 15000Hz)
  const binToFreq = (binIndex: number): number => {
    const fraction = binIndex / (binCount - 1);
    return Math.round(minFreq * Math.pow(maxFreq / minFreq, fraction));
  };

  // Convert frequency to SVG X coordinate (0 to 500)
  const freqToSvgX = (freq: number): number => {
    const clamped = Math.max(minFreq, Math.min(maxFreq, freq));
    const fraction = Math.log10(clamped / minFreq) / Math.log10(maxFreq / minFreq);
    return fraction * 500;
  };

  // Convert dB to SVG Y coordinate (0 to 100)
  const dbToSvgY = (db: number): number => {
    const norm = Math.min(1.0, Math.max(0.0, (db - minDb) / (maxDb - minDb)));
    return 100 - norm * 92 - 4; // leave 4px padding top/bottom
  };

  // Pre-calculate SVG curve and area paths
  const { pathD, areaD, dataPoints } = useMemo(() => {
    const points: { freq: number; db: number; svgX: number; svgY: number; index: number }[] = [];
    let p = '';
    let a = 'M0,100 ';

    for (let i = 0; i < binCount; i++) {
      const freq = binToFreq(i);
      const db = spectrumDb[i] !== undefined ? spectrumDb[i] : -100;
      const svgX = (i / (binCount - 1)) * 500;
      const svgY = dbToSvgY(db);

      points.push({ freq, db, svgX, svgY, index: i });
      p += (i === 0 ? 'M' : 'L') + `${svgX.toFixed(1)},${svgY.toFixed(1)} `;
      a += `L${svgX.toFixed(1)},${svgY.toFixed(1)} `;
    }

    a += 'L500,100 Z';
    return { pathD: p, areaD: a, dataPoints: points };
  }, [spectrumDb, binCount]);

  // Resolved dominant peaks list
  const resolvedPeaks = useMemo(() => {
    if (dominantPeaks && dominantPeaks.length > 0) return dominantPeaks;
    const domFreq = parseInt(dominantHarmonic.replace(/[^0-9]/g, '')) || 1400;
    return [
      { freq: domFreq, db: dsp.peakDb },
      { freq: domFreq * 2, db: Math.max(-120, dsp.peakDb - 14) },
    ];
  }, [dominantPeaks, dominantHarmonic, dsp.peakDb]);

  // Handle pointer interaction (mouse or touch)
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const relX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const normX = relX / rect.width;
    const binIndex = Math.min(binCount - 1, Math.max(0, Math.round(normX * (binCount - 1))));

    const point = dataPoints[binIndex];
    if (!point) return;

    // Check if close to any identified peak
    let isPeak = false;
    let peakLabel: string | undefined;
    let targetFreq = point.freq;
    let targetDb = point.db;
    let targetSvgX = point.svgX;
    let targetSvgY = point.svgY;

    for (let idx = 0; idx < resolvedPeaks.length; idx++) {
      const peak = resolvedPeaks[idx];
      const peakSvgX = freqToSvgX(peak.freq);
      const distPx = Math.abs((peakSvgX / 500) * rect.width - relX);

      // Snap within 16px to known peak
      if (distPx < 16) {
        isPeak = true;
        peakLabel = idx === 0 ? '★ Dominant Resonant Peak (f₀)' : `${idx + 1}nd Harmonic (${idx + 1}f₀)`;
        targetFreq = peak.freq;
        targetDb = peak.db;
        targetSvgX = peakSvgX;
        targetSvgY = dbToSvgY(peak.db);
        break;
      }
    }

    // Check if near spectral centroid
    if (!isPeak && Math.abs(freqToSvgX(dsp.spectralCentroid) / 500 * rect.width - relX) < 14) {
      isPeak = true;
      peakLabel = 'Spectral Centroid (fc)';
      targetFreq = dsp.spectralCentroid;
    }

    setHoveredData({
      freq: targetFreq,
      db: targetDb,
      x: relX,
      y: (targetSvgY / 100) * rect.height,
      svgX: targetSvgX,
      svgY: targetSvgY,
      isPeak,
      peakLabel,
    });
  };

  const handlePointerLeave = () => {
    setHoveredData(null);
  };

  // Inspect a specific peak on demand (e.g. clicking chip)
  const handleInspectPeak = (peakFreq: number, peakDb: number, label: string) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const svgX = freqToSvgX(peakFreq);
    const svgY = dbToSvgY(peakDb);

    setHoveredData({
      freq: peakFreq,
      db: peakDb,
      x: (svgX / 500) * rect.width,
      y: (svgY / 100) * rect.height,
      svgX,
      svgY,
      isPeak: true,
      peakLabel: label,
    });
  };

  return (
    <div className={`w-full flex flex-col space-y-2 select-none ${className}`}>
      {/* Header bar */}
      <div className="flex items-center justify-between text-xs flex-wrap gap-2">
        <div className="flex items-center gap-1.5 font-bold font-mono text-sky-400">
          <Activity className="w-3.5 h-3.5 text-sky-400" />
          <span>Interactive FFT Spectrum Visualizer</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
          <span>Hover curve to inspect Hz & dB</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline text-amber-400">fc: {dsp.spectralCentroid.toLocaleString()} Hz</span>
        </div>
      </div>

      {/* Main SVG Visualizer Box with Hover Listener */}
      <div
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="relative w-full bg-[#070b14] rounded-xl border border-slate-800 p-1 cursor-crosshair overflow-hidden group shadow-inner"
        style={{ height: `${height}px` }}
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 500 100"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="fftInteractiveAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
              <stop offset="60%" stopColor="#0284c7" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="fftInteractiveStrokeGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          {/* Decibel Horizontal Grid Lines */}
          <line x1="0" y1="20" x2="500" y2="20" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="3 3" />
          <line x1="0" y1="50" x2="500" y2="50" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="3 3" />
          <line x1="0" y1="80" x2="500" y2="80" stroke="#1e293b" strokeWidth="0.6" strokeDasharray="3 3" />

          {/* Spectral Centroid Vertical Marker Line (fc) */}
          {(() => {
            const fcX = freqToSvgX(dsp.spectralCentroid);
            return (
              <g>
                <line
                  x1={fcX}
                  y1="0"
                  x2={fcX}
                  y2="100"
                  stroke="#f59e0b"
                  strokeWidth="1.2"
                  strokeDasharray="4 2"
                  opacity="0.75"
                />
              </g>
            );
          })()}

          {/* Area Fill */}
          <path d={areaD} fill="url(#fftInteractiveAreaGrad)" />

          {/* Spectrum Stroke Line */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#fftInteractiveStrokeGrad)"
            strokeWidth="1.8"
            strokeLinecap="round"
          />

          {/* Identified Dominant Resonant Peak Markers */}
          {resolvedPeaks.map((peak, idx) => {
            const px = freqToSvgX(peak.freq);
            const py = dbToSvgY(peak.db);
            const isHovered = hoveredData && Math.abs(hoveredData.svgX - px) < 4;

            return (
              <g key={idx} className="transition-all">
                {/* Glow ring */}
                <circle
                  cx={px}
                  cy={py}
                  r={isHovered ? 7 : 4}
                  fill="none"
                  stroke={idx === 0 ? '#38bdf8' : '#2dd4bf'}
                  strokeWidth="1.5"
                  className={isHovered ? 'animate-ping' : ''}
                  opacity={isHovered ? 0.9 : 0.6}
                />
                {/* Solid center dot */}
                <circle
                  cx={px}
                  cy={py}
                  r={isHovered ? 4.5 : 3}
                  fill={idx === 0 ? '#38bdf8' : '#2dd4bf'}
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {/* Crosshair & Tracking Dot when user hovers */}
          {hoveredData && (
            <g>
              {/* Vertical Crosshair Line */}
              <line
                x1={hoveredData.svgX}
                y1="0"
                x2={hoveredData.svgX}
                y2="100"
                stroke="#38bdf8"
                strokeWidth="1"
                strokeDasharray="2 2"
                opacity="0.9"
              />
              {/* Horizontal Crosshair Line */}
              <line
                x1="0"
                y1={hoveredData.svgY}
                x2="500"
                y2={hoveredData.svgY}
                stroke="#38bdf8"
                strokeWidth="0.8"
                strokeDasharray="2 2"
                opacity="0.6"
              />
              {/* Tracking Dot on Spectrum Curve */}
              <circle
                cx={hoveredData.svgX}
                cy={hoveredData.svgY}
                r="5"
                fill="#38bdf8"
                stroke="#ffffff"
                strokeWidth="1.8"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip displaying exact Hz and dB values */}
        {hoveredData && (
          <div
            className="absolute pointer-events-none transition-all duration-75 z-30"
            style={{
              left: `${Math.min(
                Math.max(10, hoveredData.x - 70),
                (containerRef.current?.clientWidth || 300) - 150
              )}px`,
              top: `${Math.max(8, Math.min((containerRef.current?.clientHeight || 150) - 68, hoveredData.y - 70))}px`,
            }}
          >
            <div className="bg-slate-950/95 border border-sky-400/90 rounded-xl px-2.5 py-1.5 shadow-2xl backdrop-blur-md text-left min-w-[135px]">
              {hoveredData.peakLabel ? (
                <div className="text-[10px] font-bold text-amber-400 font-mono truncate border-b border-slate-800 pb-0.5 mb-1">
                  {hoveredData.peakLabel}
                </div>
              ) : (
                <div className="text-[9px] font-semibold text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800 pb-0.5 mb-1">
                  FFT Spectrum Point
                </div>
              )}

              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-mono">Frequency:</span>
                <span className="text-xs font-bold font-mono text-sky-300">
                  {hoveredData.freq.toLocaleString()} Hz
                </span>
              </div>

              <div className="flex items-baseline justify-between gap-2 mt-0.5">
                <span className="text-[10px] text-slate-400 font-mono">Magnitude:</span>
                <span className="text-xs font-black font-mono text-teal-300">
                  {hoveredData.db.toFixed(1)} dBFS
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Frequency Axis Ticks */}
      <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1 pt-0.5">
        <span>20 Hz</span>
        <span>200 Hz</span>
        <span>1 kHz</span>
        <span>4 kHz</span>
        <span>10 kHz</span>
        <span>15 kHz</span>
      </div>

      {/* Interactive Peak Chips for One-Tap Inspection */}
      {showPeakPills && (
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[10px] font-mono text-slate-500 font-semibold flex items-center gap-1">
            <Crosshair className="w-3 h-3 text-sky-400" />
            Detected Peaks:
          </span>

          {resolvedPeaks.map((peak, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() =>
                handleInspectPeak(
                  peak.freq,
                  peak.db,
                  idx === 0 ? '★ Dominant Resonant Peak (f₀)' : `Harmonic ${idx + 1}`
                )
              }
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono border transition-all flex items-center gap-1 ${
                hoveredData && Math.abs(hoveredData.freq - peak.freq) < 15
                  ? 'bg-sky-500/20 text-sky-300 border-sky-400 ring-1 ring-sky-400'
                  : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
              }`}
            >
              <span className={idx === 0 ? 'text-amber-400 font-bold' : 'text-sky-400'}>
                {idx === 0 ? '★' : `#${idx + 1}`}
              </span>
              <span>{peak.freq.toLocaleString()} Hz</span>
              <span className="text-teal-400 font-semibold">({peak.db.toFixed(1)} dB)</span>
            </button>
          ))}

          {/* Centroid Chip */}
          <button
            type="button"
            onClick={() =>
              handleInspectPeak(
                dsp.spectralCentroid,
                -45,
                'Spectral Centroid (fc)'
              )
            }
            className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-slate-900/80 hover:bg-slate-800 text-amber-300 border border-amber-500/40 transition-all"
          >
            <span>fc: {dsp.spectralCentroid.toLocaleString()} Hz</span>
          </button>
        </div>
      )}
    </div>
  );
};
