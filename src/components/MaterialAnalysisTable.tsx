import React, { useState } from 'react';
import {
  Sliders,
  Activity,
  Layers,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Waves,
} from 'lucide-react';
import { AcousticAnalysisResult, DspParameters } from '../types';
import { buildDspParameters } from '../lib/acousticDsp';
import { InteractiveFftVisualizer } from './InteractiveFftVisualizer';

interface MaterialAnalysisTableProps {
  result: AcousticAnalysisResult;
  className?: string;
  defaultExpanded?: boolean;
}

export const MaterialAnalysisTable: React.FC<MaterialAnalysisTableProps> = ({
  result,
  className = '',
  defaultExpanded = true,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'core' | 'figures'>('all');
  const [isCopied, setIsCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Ensure full DSP metrics, time-domain oscillogram, and FFT spectrum data exist
  const dominantFreq = parseInt(result.dominantHarmonic.replace(/[^0-9]/g, '')) || 1400;
  const computedData = buildDspParameters(
    result.mode,
    result.score,
    result.objectName,
    dominantFreq,
    result.avgDb
  );

  const dsp: DspParameters = result.dspParameters || computedData.dsp;
  const timeSignal: number[] = result.timeDomainSignal || computedData.timeDomainSignal;
  const spectrumDb: number[] = result.spectrumDbData || computedData.spectrumDbData;

  // Format table rows
  const allParams = [
    {
      id: 'rms',
      name: 'RMS Energy',
      symbol: 'E_rms',
      value: `${dsp.rmsDb.toFixed(1)} dB`,
      raw: dsp.rmsDb,
      unit: 'dBFS',
      isCore: true,
      category: 'Time Domain',
      description: 'Total kinetic energy of micro-asperity friction / elastic rebound.',
      benchmarkRelation:
        result.mode === 'texture'
          ? 'Smooth Glass (< -70 dB) → Rough Sandpaper (> -35 dB)'
          : result.mode === 'hardness'
          ? 'Soft Sponge (< -65 dB) → Hard Wood Table (> -35 dB)'
          : 'Low attenuation Styrofoam → Heavily loaded Rock Granite',
    },
    {
      id: 'centroid',
      name: 'Spectral Centroid',
      symbol: 'f_c',
      value: `${dsp.spectralCentroid.toLocaleString()} Hz`,
      raw: dsp.spectralCentroid,
      unit: 'Hz',
      isCore: true,
      category: 'FFT Frequency',
      description: 'Center of acoustic mass; higher frequency reflects sharp micro-bursts.',
      benchmarkRelation:
        result.mode === 'texture'
          ? 'Smooth (< 1 kHz) → Coarse Sandpaper (> 5 kHz)'
          : result.mode === 'hardness'
          ? 'Compliant Gel (< 600 Hz) → Solid Diamond / Ceramic (> 4 kHz)'
          : 'Vibration fundamental shifted by boundary stiffness',
    },
    {
      id: 'crest',
      name: 'Crest Factor',
      symbol: 'C = X_pk / X_rms',
      value: dsp.crestFactor.toFixed(2),
      raw: dsp.crestFactor,
      unit: 'ratio',
      isCore: true,
      category: 'Time Domain',
      description: 'Ratio of peak impulse to RMS energy; distinguishes sharp impacts from soft damping.',
      benchmarkRelation:
        result.mode === 'hardness'
          ? 'Soft Rubber / Sponge (< 2.5) → Rigid Solid Wood / Metal (> 7.0)'
          : result.mode === 'texture'
          ? 'Continuous sliding noise (2.0 - 4.5) → Spiky grit bursts (> 6.0)'
          : 'Steady motor oscillation (~1.5 - 2.5)',
    },
    {
      id: 'zcr',
      name: 'Zero Crossing Rate',
      symbol: 'ZCR',
      value: `${(dsp.zeroCrossingRate * 100).toFixed(1)}%`,
      raw: dsp.zeroCrossingRate,
      unit: '/ sample',
      isCore: true,
      category: 'Time Domain',
      description: 'Rate of sign changes in audio waveform; detects high-frequency roughness.',
      benchmarkRelation:
        result.mode === 'texture'
          ? 'Low micro-asperities (< 10%) → Heavy stick-slip cuts (> 45%)'
          : result.mode === 'hardness'
          ? 'Damped low oscillation (< 12%) → High ringing frequency (> 35%)'
          : 'Reflects motor structural harmonics emergence',
    },
    {
      id: 'peak',
      name: 'Peak Amplitude',
      symbol: 'A_peak',
      value: `${dsp.peakDb.toFixed(1)} dB`,
      raw: dsp.peakDb,
      unit: 'dBFS',
      isCore: false,
      category: 'Time Domain',
      description: 'Absolute peak transient acoustic pressure recorded at microphone port.',
      benchmarkRelation: 'Instantaneous contact momentum transfer intensity.',
    },
    {
      id: 'duration',
      name: 'Contact Duration',
      symbol: 'Δt',
      value: `${dsp.contactDurationMs} ms`,
      raw: dsp.contactDurationMs,
      unit: 'ms',
      isCore: false,
      category: 'Impulse Dynamics',
      description: 'Hertzian elastic contact duration or vibration integration period.',
      benchmarkRelation:
        result.mode === 'hardness'
          ? 'Soft Sponge (> 15 ms, slow rebound) → Hard Wood (< 3 ms, instant bounce)'
          : result.mode === 'density'
          ? '10.0s continuous motor excitation cycle'
          : 'Stationary sliding stroke window',
    },
    {
      id: 'rolloff',
      name: 'Spectral Rolloff',
      symbol: 'f_85%',
      value: `${dsp.spectralRolloff.toLocaleString()} Hz`,
      raw: dsp.spectralRolloff,
      unit: 'Hz',
      isCore: false,
      category: 'FFT Frequency',
      description: 'Frequency threshold below which 85% of total acoustic spectral energy is concentrated.',
      benchmarkRelation: 'Indicates high-frequency harmonic cutoff and material damping.',
    },
    {
      id: 'hfer',
      name: 'High-Freq Energy Ratio',
      symbol: 'HFER',
      value: `${(dsp.highFreqEnergyRatio * 100).toFixed(1)}%`,
      raw: dsp.highFreqEnergyRatio,
      unit: '% (> 3 kHz)',
      isCore: false,
      category: 'FFT Frequency',
      description: 'Fraction of audio energy contained in frequencies above 3,000 Hz.',
      benchmarkRelation: 'High for rough abrasive sliding and brittle rigid contact ringing.',
    },
    {
      id: 'qfactor',
      name: 'Quality Factor',
      symbol: 'Q = f_0 / Δf',
      value: dsp.qualityFactorQ.toFixed(1),
      raw: dsp.qualityFactorQ,
      unit: 'Q',
      isCore: false,
      category: 'Acoustic Resonance',
      description: 'Resonance sharpness of the dominant contact harmonic.',
      benchmarkRelation:
        result.mode === 'hardness'
          ? 'Damped absorbent foam (Q < 2.0) → Ringing elastic solid (Q > 6.0)'
          : 'Indicates structural resonance sharpness',
    },
    {
      id: 'thd',
      name: 'Harmonic Distortion',
      symbol: 'THD',
      value: `${dsp.thdPercent.toFixed(1)}%`,
      raw: dsp.thdPercent,
      unit: '%',
      isCore: false,
      category: 'Acoustic Coupling',
      description: 'Total harmonic distortion excited by mechanical nonlinearities.',
      benchmarkRelation:
        result.mode === 'density'
          ? 'Free vibration on light foam (< 6%) → Loaded clamping on rock (> 25%)'
          : 'Nonlinear micro-impact distortion',
    },
    {
      id: 'impedance',
      name: 'Acoustic Impedance',
      symbol: 'Z = ρ · c',
      value: dsp.acousticImpedanceZ || '1.85 × 10⁶ kg/(m²·s)',
      raw: 0,
      unit: 'kg/(m²·s)',
      isCore: false,
      category: 'Material Physics',
      description: 'Product of mass density ρ and speed of sound c across contact boundary.',
      benchmarkRelation: 'Impedance matching dictates transmission vs boundary wave reflection.',
    },
    {
      id: 'damping',
      name: 'Damping Ratio',
      symbol: 'ζ',
      value: dsp.dampingRatioZeta || result.dampingRatio,
      raw: 0,
      unit: 'ζ',
      isCore: false,
      category: 'Material Physics',
      description: 'Rate of acoustic decay and structural energy dissipation.',
      benchmarkRelation: 'High damping in viscoelastic polymers; low damping in rigid crystalline stone/metals.',
    },
  ];

  const displayedParams = filterMode === 'core'
    ? allParams.filter((p) => p.isCore)
    : allParams;

  const handleCopyTable = () => {
    const textData = [
      `TouchxAi V4 Material Analysis Report · Object: ${result.objectName} (${result.mode.toUpperCase()})`,
      `Calibrated Scale: ${result.score.toFixed(1)} / 10 · Descriptor: ${result.descriptor}`,
      `--------------------------------------------------------------------------------`,
      `Parameter Name\tSymbol\tMeasured Value\tCategory\tPhysical Benchmark Relation`,
      ...allParams.map((p) => `${p.name}\t${p.symbol}\t${p.value}\t${p.category}\t${p.benchmarkRelation}`),
    ].join('\n');

    navigator.clipboard.writeText(textData);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      className={`w-full bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden text-left transition-all ${className}`}
    >
      {/* Table Header Bar */}
      <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200/90 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Material DSP Analysis Table
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-teal-100 text-teal-800">
                {result.mode === 'texture' && 'Tribological Friction'}
                {result.mode === 'hardness' && 'Hertzian Impact'}
                {result.mode === 'density' && 'Vibro-Acoustic Coupling'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Extracted acoustic physics parameters alongside calibrated 1–10 scale ({result.score.toFixed(1)}/10)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopyTable}
            className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-900 text-xs font-medium flex items-center gap-1 transition-colors"
            title="Copy table to clipboard"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-[10px] text-teal-700 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[10px]">Copy</span>
              </>
            )}
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-white text-slate-600 hover:text-slate-900 text-xs font-medium transition-colors"
            title={isExpanded ? 'Collapse Table' : 'Expand Table'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-3">
          {/* View Filter Pill Switch */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setFilterMode('core')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  filterMode === 'core'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Core 4 Metrics
              </button>
              <button
                onClick={() => setFilterMode('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  filterMode === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                All 12 DSP Parameters
              </button>
              <button
                onClick={() => setFilterMode('figures')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                  filterMode === 'figures'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Figures & Curves
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
              <span>Target: <strong className="text-slate-900">{result.objectName}</strong></span>
              <span>·</span>
              <span>Dominant: <strong className="text-teal-700">{result.dominantHarmonic}</strong></span>
            </div>
          </div>

          {/* Quick Core Metrics Highlights Strip (Always visible) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">RMS Energy</span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-base font-bold font-mono text-slate-900">{dsp.rmsDb.toFixed(1)}</span>
                <span className="text-[10px] text-slate-500 font-mono">dBFS</span>
              </div>
              <span className="text-[10px] text-teal-700 font-medium block truncate mt-0.5">
                {dsp.rmsDb < -60 ? 'Low Friction' : dsp.rmsDb < -40 ? 'Moderate' : 'High Friction Energy'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Spectral Centroid</span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-base font-bold font-mono text-slate-900">{dsp.spectralCentroid.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 font-mono">Hz</span>
              </div>
              <span className="text-[10px] text-teal-700 font-medium block truncate mt-0.5">
                {dsp.spectralCentroid < 1000 ? 'Low Band' : dsp.spectralCentroid < 3500 ? 'Mid Resonant' : 'High Asperity Ringing'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Crest Factor</span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-base font-bold font-mono text-slate-900">{dsp.crestFactor.toFixed(2)}</span>
                <span className="text-[10px] text-slate-500 font-mono">X_pk/rms</span>
              </div>
              <span className="text-[10px] text-teal-700 font-medium block truncate mt-0.5">
                {dsp.crestFactor < 2.5 ? 'Damped Rebound' : dsp.crestFactor < 6.0 ? 'Standard Elastic' : 'Sharp Impulse Spike'}
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Zero Crossing Rate</span>
              <div className="flex items-baseline justify-between mt-0.5">
                <span className="text-base font-bold font-mono text-slate-900">{(dsp.zeroCrossingRate * 100).toFixed(1)}%</span>
                <span className="text-[10px] text-slate-500 font-mono">ZCR</span>
              </div>
              <span className="text-[10px] text-teal-700 font-medium block truncate mt-0.5">
                {dsp.zeroCrossingRate < 0.15 ? 'Smooth Envelope' : 'Rough Micro-Transitions'}
              </span>
            </div>
          </div>

          {/* TABLE VIEW (Core or All) */}
          {(filterMode === 'all' || filterMode === 'core') && (
            <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-600 font-semibold text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3">DSP Parameter</th>
                    <th className="py-2.5 px-2">Symbol</th>
                    <th className="py-2.5 px-3">Measured Value</th>
                    <th className="py-2.5 px-2">Category</th>
                    <th className="py-2.5 px-3">1–10 Scale Physical Interpretation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedParams.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50/80' : 'bg-slate-50/50 hover:bg-slate-100/70'}
                    >
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <span>{row.name}</span>
                          {row.isCore && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                              Core
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 font-mono text-slate-500 text-[11px]">
                        {row.symbol}
                      </td>
                      <td className="py-2.5 px-3 font-bold font-mono text-teal-900">
                        <span className="px-2 py-0.5 rounded bg-teal-50/80 border border-teal-200/60 inline-block">
                          {row.value}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-[11px] text-slate-500">
                        {row.category}
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-slate-600">
                        <p>{row.benchmarkRelation}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{row.description}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* FIGURES VIEW (Inline Waveform & Spectrum FFT graphs) */}
          {filterMode === 'figures' && (
            <div className="space-y-3 pt-1">
              {/* Figure A: Time Domain Waveform */}
              <div className="p-3 bg-slate-950 text-white rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[11px] text-teal-300 font-mono flex items-center gap-1.5">
                    <Waves className="w-3.5 h-3.5 text-teal-400" />
                    Figure 1: Time-Domain Audio Signal Waveform x(t)
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Peak: {dsp.peakDb} dB · Contact: {dsp.contactDurationMs} ms
                  </span>
                </div>

                <div className="w-full h-24 bg-[#0a0f18] rounded-lg border border-slate-800 p-1 relative overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 400 80" preserveAspectRatio="none">
                    <line x1="0" y1="40" x2="400" y2="40" stroke="#334155" strokeWidth="0.8" />
                    {(() => {
                      let pathD = '';
                      const len = timeSignal.length;
                      for (let i = 0; i < len; i++) {
                        const x = (i / (len - 1)) * 400;
                        const y = 40 - timeSignal[i] * 35;
                        pathD += i === 0 ? `M${x},${y} ` : `L${x},${y} `;
                      }
                      return <path d={pathD} fill="none" stroke="#2dd4bf" strokeWidth="1.6" strokeLinecap="round" />;
                    })()}
                  </svg>
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1">
                  <span>0 ms (Contact Impact)</span>
                  <span>50 ms</span>
                  <span>100 ms</span>
                </div>
              </div>

              {/* Figure B: Interactive Audio Frequency FFT Spectrum */}
              <div className="p-3 bg-slate-950 text-white rounded-xl border border-slate-800 space-y-1.5">
                <InteractiveFftVisualizer
                  spectrumDb={spectrumDb}
                  dsp={dsp}
                  dominantHarmonic={result.dominantHarmonic}
                  dominantPeaks={result.dominantPeaks}
                  height={150}
                  showPeakPills={true}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
