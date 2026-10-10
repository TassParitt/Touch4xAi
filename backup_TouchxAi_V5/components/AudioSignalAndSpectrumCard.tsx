import React, { useState } from 'react';
import {
  Activity,
  Sliders,
  Sparkles,
  Info,
  Maximize2,
  Minimize2,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { AcousticAnalysisResult, DspParameters } from '../types';
import { generateSyntheticAcousticData } from '../lib/acousticDsp';

interface AudioSignalAndSpectrumCardProps {
  result: AcousticAnalysisResult;
  onApplyBenchmarkTest?: (syntheticResult: AcousticAnalysisResult) => void;
}

export const AudioSignalAndSpectrumCard: React.FC<AudioSignalAndSpectrumCardProps> = ({
  result,
  onApplyBenchmarkTest,
}) => {
  const [activeTab, setActiveTab] = useState<'both' | 'time' | 'fft' | 'table'>('both');
  const [isExpanded, setIsExpanded] = useState(false);

  // Fallback if result does not yet have dspParameters
  const dsp: DspParameters = result.dspParameters || {
    rmsDb: result.avgDb || -45,
    peakDb: (result.avgDb || -45) + 6.5,
    crestFactor: result.mode === 'hardness' ? 6.8 : result.mode === 'texture' ? 4.5 : 2.8,
    contactDurationMs: result.mode === 'hardness' ? (result.score <= 3 ? 18.0 : 2.5) : 50.0,
    spectralCentroid: result.mode === 'texture' ? Math.round(result.score * 750) : 1240,
    spectralRolloff: result.mode === 'texture' ? Math.round(result.score * 1200) : 2800,
    highFreqEnergyRatio: result.mode === 'texture' ? Math.min(0.9, result.score * 0.09) : 0.25,
    zeroCrossingRate: 0.18,
    qualityFactorQ: result.mode === 'hardness' ? Math.max(1.2, result.score * 1.5) : 3.5,
    thdPercent: result.mode === 'density' ? Math.max(4.0, result.score * 3.8) : 8.5,
    acousticImpedanceZ: `${(0.05 + (result.score / 10) * 2.8).toFixed(2)} × 10⁶ kg/(m²·s)`,
    dampingRatioZeta: result.dampingRatio || '0.14 ζ',
  };

  const timeSignal: number[] = result.timeDomainSignal && result.timeDomainSignal.length >= 64
    ? result.timeDomainSignal
    : Array.from({ length: 128 }, (_, i) => {
        const t = i / 128;
        const decay = Math.exp(-t * (result.mode === 'hardness' ? (result.score < 3 ? 4 : 14) : 6));
        return parseFloat((Math.sin(t * 50) * decay * (result.score / 10)).toFixed(3));
      });

  const spectrumDb: number[] = result.spectrumDbData && result.spectrumDbData.length >= 64
    ? result.spectrumDbData
    : Array.from({ length: 128 }, (_, k) => {
        const freq = 20 * Math.pow(600, k / 127);
        const peakF = parseInt(result.dominantHarmonic.replace(/[^0-9]/g, '')) || 140;
        const dist = Math.abs(Math.log10(freq) - Math.log10(peakF)) / 0.4;
        const peakDb = dsp.peakDb;
        const base = Math.max(-120, peakDb - dist * dist * 35 - Math.log10(Math.max(1, freq / 100)) * 12);
        return parseFloat(base.toFixed(1));
      });

  const peaks = result.dominantPeaks && result.dominantPeaks.length > 0
    ? result.dominantPeaks
    : [{ freq: parseInt(result.dominantHarmonic.replace(/[^0-9]/g, '')) || 140, db: dsp.peakDb }];

  // Quick benchmark presets for testing
  const handleLoadPreset = (type: 'soft_sponge' | 'hard_wood') => {
    const syn = generateSyntheticAcousticData('hardness', type);
    const updated: AcousticAnalysisResult = {
      ...result,
      id: `meas_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      objectName: type === 'soft_sponge' ? 'Soft Sponge (Benchmark)' : 'Hard Wood Table (Benchmark)',
      mode: 'hardness',
      score: syn.score,
      descriptor: syn.descriptor,
      summary: syn.summary,
      dominantHarmonic: syn.dominantHarmonic,
      dampingRatio: syn.dampingRatio,
      confidencePercent: syn.confidencePercent,
      avgDb: syn.dsp.rmsDb,
      timeDomainSignal: syn.timeDomainSignal,
      spectrumDbData: syn.spectrumDbData,
      dspParameters: syn.dsp,
      dominantPeaks: syn.dominantPeaks,
    };
    onApplyBenchmarkTest?.(updated);
  };

  return (
    <div className="w-full bg-slate-950 text-white rounded-3xl border border-slate-800 shadow-xl overflow-hidden text-left flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Acoustic Signal & Fourier Spectrum (FFT)
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Tribological friction · Hertzian impact impulse · Vibro-acoustic coupling
            </p>
          </div>
        </div>

        {/* View mode tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-mono">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              activeTab === 'both' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Dual Graphs
          </button>
          <button
            onClick={() => setActiveTab('time')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              activeTab === 'time' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Oscillogram
          </button>
          <button
            onClick={() => setActiveTab('fft')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              activeTab === 'fft' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            FFT dB
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              activeTab === 'table' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            DSP Table
          </button>
        </div>
      </div>

      {/* QUICK BENCHMARK TESTING SWITCHER (Addresses user request to test Soft Sponge vs Hard Wood Table) */}
      <div className="px-4 py-2 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between flex-wrap gap-2 text-xs">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          Quick Test Comparison:
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleLoadPreset('soft_sponge')}
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-semibold transition-all"
            title="Load Soft Sponge benchmark (Peak: -64 dB @ 108 Hz, Score ~1.8)"
          >
            Soft Sponge (-64 dB · 1.8)
          </button>
          <button
            onClick={() => handleLoadPreset('hard_wood')}
            className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-mono text-[10px] font-semibold transition-all"
            title="Load Hard Wood Table benchmark (Peak: -31 dB @ 141 Hz, Score ~7.2)"
          >
            Hard Wood Table (-31 dB · 7.2)
          </button>
        </div>
      </div>

      {/* Main Graphs Content Area */}
      <div className="p-4 space-y-4">
        {/* ======================================================== */}
        {/* GRAPH 1: TIME-DOMAIN AUDIO SIGNAL OSCILLOGRAM x(t) */}
        {/* ======================================================== */}
        {(activeTab === 'both' || activeTab === 'time') && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 text-[11px] font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
                1. Audio Signal: Time-Domain Waveform x(t)
              </span>
              <div className="flex items-center gap-3 text-[10px] font-mono text-slate-400">
                <span>Peak: <strong className="text-white">{dsp.peakDb} dB</strong></span>
                <span>RMS: <strong className="text-teal-300">{dsp.rmsDb} dB</strong></span>
                <span>Contact Δt: <strong className="text-amber-300">{dsp.contactDurationMs} ms</strong></span>
              </div>
            </div>

            {/* SVG Oscillogram Graph */}
            <div className="w-full h-32 sm:h-36 bg-[#070b12] rounded-2xl border border-slate-800 p-2 relative overflow-hidden flex flex-col justify-between">
              {/* Oscilloscope Grid */}
              <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#14b8a6" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines */}
                <line x1="0" y1="20" x2="400" y2="20" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="0" y1="60" x2="400" y2="60" stroke="#334155" strokeWidth="1" />
                <line x1="0" y1="100" x2="400" y2="100" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" />

                {/* Vertical Grid Lines (Time ms) */}
                <line x1="100" y1="0" x2="100" y2="120" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="200" y1="0" x2="200" y2="120" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" />
                <line x1="300" y1="0" x2="300" y2="120" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="3 3" />

                {/* Time-Domain Waveform Path */}
                {(() => {
                  let pathD = '';
                  let areaD = 'M0,60 ';
                  const len = timeSignal.length;
                  for (let i = 0; i < len; i++) {
                    const x = (i / (len - 1)) * 400;
                    const y = 60 - timeSignal[i] * 50;
                    if (i === 0) {
                      pathD = `M${x},${y} `;
                    } else {
                      pathD += `L${x},${y} `;
                    }
                    areaD += `L${x},${y} `;
                  }
                  areaD += 'L400,60 Z';

                  return (
                    <>
                      <path d={areaD} fill="url(#waveGrad)" />
                      <path d={pathD} fill="none" stroke="#2dd4bf" strokeWidth="1.8" strokeLinecap="round" />
                    </>
                  );
                })()}

                {/* Peak Amplitude Marker Pin */}
                <circle cx="100" cy={60 - Math.min(1.0, Math.pow(10, dsp.peakDb / 20)) * 50} r="3" fill="#f43f5e" />
              </svg>

              {/* Oscillogram Axis Labels */}
              <div className="flex justify-between px-1 text-[9px] font-mono text-slate-500 pt-0.5 border-t border-slate-800/80">
                <span>0 ms (Contact Trigger)</span>
                <span>25 ms</span>
                <span>50 ms</span>
                <span>75 ms</span>
                <span>100 ms</span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* GRAPH 2: AUDIO SPECTRUM (FFT FREQUENCY IN dB: -120 to 0) */}
        {/* (Styled after user's real smartphone screenshots) */}
        {/* ======================================================== */}
        {(activeTab === 'both' || activeTab === 'fft') && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 text-[11px] font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                2. Audio Spectrum: Log FFT Frequency |X(f)| (dB)
              </span>
              <div className="flex items-center gap-2 text-[10px] font-mono text-amber-300">
                {peaks.map((p, idx) => (
                  <span key={idx} className="bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                    {p.db} dB @ {p.freq} Hz
                  </span>
                ))}
              </div>
            </div>

            {/* FFT Canvas / SVG matching user's phone screenshot with dB grid */}
            <div className="w-full h-44 sm:h-52 bg-[#05080f] rounded-2xl border border-slate-800 p-2.5 relative overflow-hidden flex flex-col justify-between">
              <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="spectrumFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#0284c7" stopOpacity="0.20" />
                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Horizontal dB Grid Lines (-20 dB to -120 dB) */}
                <line x1="0" y1="25" x2="400" y2="25" stroke="#1e293b" strokeWidth="0.8" />
                <text x="5" y="24" fill="#64748b" fontSize="8" fontFamily="monospace">-20 dB</text>

                <line x1="0" y1="50" x2="400" y2="50" stroke="#1e293b" strokeWidth="0.8" />
                <text x="5" y="49" fill="#64748b" fontSize="8" fontFamily="monospace">-40 dB</text>

                <line x1="0" y1="75" x2="400" y2="75" stroke="#1e293b" strokeWidth="0.8" />
                <text x="5" y="74" fill="#64748b" fontSize="8" fontFamily="monospace">-60 dB</text>

                <line x1="0" y1="100" x2="400" y2="100" stroke="#1e293b" strokeWidth="0.8" />
                <text x="5" y="99" fill="#64748b" fontSize="8" fontFamily="monospace">-80 dB</text>

                <line x1="0" y1="125" x2="400" y2="125" stroke="#1e293b" strokeWidth="0.8" />
                <text x="5" y="124" fill="#64748b" fontSize="8" fontFamily="monospace">-100 dB</text>

                {/* Log Frequency Vertical Grid Lines (30Hz, 100Hz, 300Hz, 1kHz, 3kHz, 10kHz) */}
                <line x1="35" y1="0" x2="35" y2="140" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2 2" />
                <line x1="110" y1="0" x2="110" y2="140" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="185" y1="0" x2="185" y2="140" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2 2" />
                <line x1="260" y1="0" x2="260" y2="140" stroke="#334155" strokeWidth="1" strokeDasharray="2 2" />
                <line x1="335" y1="0" x2="335" y2="140" stroke="#1e293b" strokeWidth="0.8" strokeDasharray="2 2" />

                {/* Frequency Spectrum Curve (dB mapped to Y coordinates) */}
                {(() => {
                  let pathD = '';
                  let areaD = 'M0,140 ';
                  const len = spectrumDb.length;
                  for (let i = 0; i < len; i++) {
                    const x = (i / (len - 1)) * 400;
                    // Y axis: 0 dB at y=0, -120 dB at y=140
                    const db = spectrumDb[i];
                    const y = Math.min(140, Math.max(5, (-db / 120) * 140));
                    if (i === 0) {
                      pathD = `M${x},${y} `;
                    } else {
                      pathD += `L${x},${y} `;
                    }
                    areaD += `L${x},${y} `;
                  }
                  areaD += 'L400,140 Z';

                  return (
                    <>
                      <path d={areaD} fill="url(#spectrumFill)" />
                      {/* Secondary peak envelope curve (red trace matching user's phone app) */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#f43f5e"
                        strokeWidth="1.2"
                        strokeOpacity="0.75"
                        strokeDasharray="4 2"
                      />
                      {/* Primary FFT curve (yellow trace matching user's phone app) */}
                      <path d={pathD} fill="none" stroke="#fbbf24" strokeWidth="2.0" strokeLinecap="round" />
                    </>
                  );
                })()}

                {/* Harmonic Peak Markers with Labels */}
                {peaks.map((p, idx) => {
                  // Map freq to X on log axis
                  const normX = Math.min(400, Math.max(10, (Math.log10(p.freq / 20) / Math.log10(600)) * 400));
                  const y = Math.min(135, Math.max(10, (-p.db / 120) * 140));
                  return (
                    <g key={idx}>
                      <circle cx={normX} cy={y} r="3.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1" />
                      <line x1={normX} y1={y} x2={normX} y2={y - 12} stroke="#38bdf8" strokeWidth="1" />
                      <rect x={normX - 28} y={y - 24} width="56" height="12" rx="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="0.8" />
                      <text x={normX} y={y - 15} textAnchor="middle" fill="#38bdf8" fontSize="7.5" fontFamily="monospace" fontWeight="bold">
                        {p.db} dB
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Spectrogram Energy Heatmap Strip (Matching bottom half of user's phone app screenshot!) */}
              <div className="w-full h-5 rounded-md overflow-hidden relative border border-slate-800/80 my-0.5">
                <div
                  className="w-full h-full"
                  style={{
                    background: `linear-gradient(to right,
                      ${dsp.peakDb > -45 ? '#831843 0%, #e11d48 20%, #fb923c 45%, #fde047 70%, #1e293b 100%' : '#1e1b4b 0%, #312e81 25%, #4338ca 50%, #1e293b 100%'}
                    )`,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-2 text-[8px] font-mono font-bold text-slate-300 pointer-events-none">
                  <span>Spectrogram Harmonic Density</span>
                  <span>{dsp.peakDb > -45 ? 'High Energy Transmission' : 'Suppressed Damping Envelope'}</span>
                </div>
              </div>

              {/* Log Frequency Axis Ticks */}
              <div className="flex justify-between px-2 text-[9px] font-mono text-slate-400 pt-0.5">
                <span>30 Hz</span>
                <span>100 Hz</span>
                <span>300 Hz</span>
                <span>1 kHz</span>
                <span>3 kHz</span>
                <span>10 kHz</span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TABLE OF MEASURED PARAMETERS (Digital Signal Processing) */}
        {/* ======================================================== */}
        {(activeTab === 'both' || activeTab === 'table') && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 text-[11px] font-mono flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-teal-400" />
                3. Table of Measured Physical & DSP Parameters
              </span>
              <span className="text-[10px] font-mono text-teal-400">
                Mode: {result.mode.toUpperCase()}
              </span>
            </div>

            <div className="w-full rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/60 divide-y divide-slate-800/80 text-xs">
              {/* Parameter Rows */}
              <div className="grid grid-cols-2 sm:grid-cols-4 p-2.5 gap-2 hover:bg-slate-800/30 transition-colors">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Peak Amplitude</span>
                  <span className={`font-mono font-bold text-sm ${dsp.peakDb > -45 ? 'text-sky-300' : 'text-amber-300'}`}>
                    {dsp.peakDb} dB
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">RMS Amplitude</span>
                  <span className="font-mono font-bold text-sm text-slate-200">
                    {dsp.rmsDb} dB
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Crest Factor (Pk/RMS)</span>
                  <span className="font-mono font-bold text-sm text-teal-300">
                    {dsp.crestFactor}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Contact Duration (Δt)</span>
                  <span className={`font-mono font-bold text-sm ${dsp.contactDurationMs < 5 ? 'text-sky-300' : 'text-amber-300'}`}>
                    {dsp.contactDurationMs} ms
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 p-2.5 gap-2 hover:bg-slate-800/30 transition-colors">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Spectral Centroid (fc)</span>
                  <span className="font-mono font-bold text-sm text-slate-200">
                    {dsp.spectralCentroid} Hz
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Spectral Rolloff (f85%)</span>
                  <span className="font-mono font-bold text-sm text-slate-200">
                    {dsp.spectralRolloff} Hz
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">High-Freq Ratio (&gt;3kHz)</span>
                  <span className="font-mono font-bold text-sm text-teal-300">
                    {(dsp.highFreqEnergyRatio * 100).toFixed(1)}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Zero-Crossing Rate</span>
                  <span className="font-mono font-bold text-sm text-slate-200">
                    {dsp.zeroCrossingRate}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 p-2.5 gap-2 hover:bg-slate-800/30 transition-colors">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Resonant Q / THD</span>
                  <span className="font-mono font-bold text-sm text-slate-200">
                    {result.mode === 'density' ? `THD: ${dsp.thdPercent}%` : `Q = ${dsp.qualityFactorQ}`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Acoustic Impedance (Z)</span>
                  <span className="font-mono font-bold text-xs text-sky-300 truncate block">
                    {dsp.acousticImpedanceZ || '1.8 × 10⁶ kg/(m²·s)'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Damping Ratio (ζ)</span>
                  <span className="font-mono font-bold text-sm text-emerald-400">
                    {dsp.dampingRatioZeta || result.dampingRatio}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Confidence Level</span>
                  <span className="font-mono font-bold text-sm text-teal-400">
                    {result.confidencePercent}%
                  </span>
                </div>
              </div>
            </div>

            {/* Scientific DSP Analysis Insight */}
            <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
              <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white block">
                  Acoustic Physics Evaluation:
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                  {result.summary}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
