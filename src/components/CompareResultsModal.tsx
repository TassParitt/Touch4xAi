import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Layers,
  Sparkles,
  Check,
  ChevronDown,
  Info,
  Scale,
  Share2,
  Copy,
  Zap,
  Clock,
  Calendar,
} from 'lucide-react';
import { AcousticAnalysisResult, SavedRecord, MeasureMode } from '../types';

interface CompareResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentResult: AcousticAnalysisResult;
  historyRecords: (AcousticAnalysisResult | SavedRecord)[];
}

// Built-in benchmark reference materials
const REFERENCE_MATERIALS: AcousticAnalysisResult[] = [
  {
    id: 'ref_glass',
    timestamp: 'Benchmark Ref',
    objectName: 'Polished Mirror Glass',
    mode: 'texture',
    score: 1.0,
    descriptor: 'Specular Mirror Glass',
    summary: 'Ultra-low friction with negligible acoustic micro-vibrations.',
    dominantHarmonic: '680 Hz',
    dampingRatio: '0.04 ζ',
    confidencePercent: 99,
    peakFreqs: [680, 1360],
    avgDb: 28.2,
    modeSpecificMetric: { label: 'Slide Cycles', value: '5/5' },
  },
  {
    id: 'ref_sandpaper',
    timestamp: 'Benchmark Ref',
    objectName: 'Rough Sandpaper (120-Grit)',
    mode: 'texture',
    score: 9.8,
    descriptor: 'Coarse Abrasive Sandpaper',
    summary: 'Intense high-frequency friction bursts from micro-cutting alumina grains.',
    dominantHarmonic: '6,450 Hz',
    dampingRatio: '0.22 ζ',
    confidencePercent: 98,
    peakFreqs: [6450, 12900],
    avgDb: 62.4,
    modeSpecificMetric: { label: 'Slide Cycles', value: '5/5' },
  },
  {
    id: 'ref_jelly',
    timestamp: 'Benchmark Ref',
    objectName: 'Soft Elastic Jelly Pad',
    mode: 'hardness',
    score: 1.2,
    descriptor: 'Ultra-Soft Jelly Gelatin',
    summary: 'Maximum viscoelastic compliance with near-zero acoustic rebound.',
    dominantHarmonic: '180 Hz',
    dampingRatio: '0.52 ζ',
    confidencePercent: 97,
    peakFreqs: [180, 360],
    avgDb: 31.0,
    modeSpecificMetric: { label: 'Tap Impulse', value: '5/5' },
  },
  {
    id: 'ref_diamond',
    timestamp: 'Benchmark Ref',
    objectName: 'Hardened Tool Steel / Diamond',
    mode: 'hardness',
    score: 9.9,
    descriptor: 'Superhard Diamond / Tool Steel',
    summary: 'Extreme compressive stiffness with sharp high-Q resonant harmonics.',
    dominantHarmonic: '5,820 Hz',
    dampingRatio: '0.03 ζ',
    confidencePercent: 99,
    peakFreqs: [5820, 11640],
    avgDb: 59.8,
    modeSpecificMetric: { label: 'Tap Impulse', value: '5/5' },
  },
  {
    id: 'ref_styrofoam',
    timestamp: 'Benchmark Ref',
    objectName: 'Expanded Styrofoam Block',
    mode: 'density',
    score: 1.1,
    descriptor: 'Porous Styrofoam Foam',
    summary: '98% air cellular matrix with rapid vibro-acoustic attenuation.',
    dominantHarmonic: '240 Hz',
    dampingRatio: '0.49 ζ',
    confidencePercent: 95,
    peakFreqs: [240, 480],
    avgDb: 29.5,
    modeSpecificMetric: { label: 'Hold Duration', value: '10.0s' },
  },
  {
    id: 'ref_granite',
    timestamp: 'Benchmark Ref',
    objectName: 'Rock Granite Slab',
    mode: 'density',
    score: 9.7,
    descriptor: 'Ultra-Dense Rock Granite',
    summary: 'Massive crystalline plutonic matrix with strong mechanical wave transmission.',
    dominantHarmonic: '3,840 Hz',
    dampingRatio: '0.06 ζ',
    confidencePercent: 98,
    peakFreqs: [3840, 7680],
    avgDb: 56.4,
    modeSpecificMetric: { label: 'Hold Duration', value: '10.0s' },
  },
  {
    id: 'ref_oak',
    timestamp: 'Benchmark Ref',
    objectName: 'Satin Lacquered Oak',
    mode: 'texture',
    score: 4.5,
    descriptor: 'Fine Timber Grain',
    summary: 'Smooth timber grain with moderate sliding acoustic resonance.',
    dominantHarmonic: '1,850 Hz',
    dampingRatio: '0.14 ζ',
    confidencePercent: 96,
    peakFreqs: [1850, 3700],
    avgDb: 42.1,
    modeSpecificMetric: { label: 'Slide Cycles', value: '5/5' },
  },
  {
    id: 'ref_tile',
    timestamp: 'Benchmark Ref',
    objectName: 'Glazed Porcelain Tile',
    mode: 'texture',
    score: 2.2,
    descriptor: 'Polished Vitrified Surface',
    summary: 'Low-friction vitrified silicate plane with negligible micro-asperities.',
    dominantHarmonic: '1,120 Hz',
    dampingRatio: '0.08 ζ',
    confidencePercent: 97,
    peakFreqs: [1120, 2240],
    avgDb: 34.6,
    modeSpecificMetric: { label: 'Slide Cycles', value: '5/5' },
  },
  {
    id: 'ref_aluminum',
    timestamp: 'Benchmark Ref',
    objectName: 'Tempered Aluminum Alloy',
    mode: 'hardness',
    score: 7.2,
    descriptor: 'High-Q Structural Alloy',
    summary: 'Crisp ringing harmonics with high yield modulus.',
    dominantHarmonic: '3,200 Hz',
    dampingRatio: '0.07 ζ',
    confidencePercent: 98,
    peakFreqs: [3200, 6400],
    avgDb: 54.2,
    modeSpecificMetric: { label: 'Tap Impulse', value: '5/5' },
  },
  {
    id: 'ref_concrete',
    timestamp: 'Benchmark Ref',
    objectName: 'Cast Concrete Paver',
    mode: 'density',
    score: 8.2,
    descriptor: 'Dense Aggregate Matrix',
    summary: 'High mass-density stone matrix (~2.3 g/cm³) with strong coupling.',
    dominantHarmonic: '2,900 Hz',
    dampingRatio: '0.09 ζ',
    confidencePercent: 96,
    peakFreqs: [2900, 5800],
    avgDb: 51.8,
    modeSpecificMetric: { label: 'Hold Duration', value: '10.0s' },
  },
];

// Helper to extract or generate Fourier spectral curve points (64 bins)
function generateFourierCurve(result: AcousticAnalysisResult): number[] {
  if (result.spectrumData && result.spectrumData.length >= 32) {
    return result.spectrumData;
  }

  const bins = 64;
  const curve = new Array(bins).fill(0);
  const freqNum = parseInt(result.dominantHarmonic.replace(/[^0-9]/g, '')) || 2000;
  
  const peakBin = Math.max(3, Math.min(60, Math.round((Math.log10(freqNum / 100) / Math.log10(200)) * bins)));
  const bandwidth = result.mode === 'hardness' ? 3.5 : result.mode === 'texture' ? 6.0 : 8.5;
  const peakHeight = Math.min(240, 140 + result.score * 10);

  for (let i = 0; i < bins; i++) {
    const dist = (i - peakBin) / bandwidth;
    let val = peakHeight * Math.exp(-0.5 * dist * dist);

    const harmonicBin = Math.min(bins - 1, Math.round(peakBin * 1.8));
    const distHarmonic = (i - harmonicBin) / (bandwidth * 0.8);
    val += (peakHeight * 0.45) * Math.exp(-0.5 * distHarmonic * distHarmonic);

    const noise = 15 + Math.sin(i * 0.7) * 8 + (result.avgDb * 0.35);
    curve[i] = Math.min(255, Math.max(5, val + noise));
  }

  return curve;
}

// 1-10 Color Bar (Red -> Orange -> Yellow -> Green -> Blue -> Black)
const SCALE_GRADIENT = 'linear-gradient(to right, #ef4444 0%, #f97316 20%, #eab308 40%, #22c55e 60%, #3b82f6 80%, #09090b 100%)';

export const CompareResultsModal: React.FC<CompareResultsModalProps> = ({
  isOpen,
  onClose,
  currentResult,
  historyRecords,
}) => {
  // Combine user history records with reference materials to guarantee rich selection
  const allAvailableRecords = useMemo(() => {
    const list: AcousticAnalysisResult[] = [];
    list.push(currentResult);

    historyRecords.forEach((rec) => {
      if (rec.id !== currentResult.id && !list.some((r) => r.id === rec.id)) {
        list.push(rec);
      }
    });

    REFERENCE_MATERIALS.forEach((ref) => {
      if (!list.some((r) => r.id === ref.id)) {
        list.push(ref);
      }
    });

    return list;
  }, [currentResult, historyRecords]);

  // List of the last 10 object measurements with name and time
  const top10ObjectsList = useMemo(() => {
    return allAvailableRecords.slice(0, 10);
  }, [allAvailableRecords]);

  // Selected records A and B
  const [selectedAId, setSelectedAId] = useState<string>(currentResult.id);
  const [selectedBId, setSelectedBId] = useState<string>(() => {
    const match = allAvailableRecords.find(
      (r) => r.id !== currentResult.id && r.mode === currentResult.mode
    );
    if (match) return match.id;
    const diff = allAvailableRecords.find((r) => r.id !== currentResult.id);
    return diff ? diff.id : allAvailableRecords[0]?.id || '';
  });

  // Automatically pre-select the current result as primary item A on open
  useEffect(() => {
    if (isOpen && currentResult?.id) {
      setSelectedAId(currentResult.id);
    }
  }, [isOpen, currentResult?.id]);

  const [curveView, setCurveView] = useState<'both' | 'a' | 'b'>('both');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const recordA = useMemo(
    () => allAvailableRecords.find((r) => r.id === selectedAId) || currentResult,
    [allAvailableRecords, selectedAId, currentResult]
  );

  const recordB = useMemo(
    () => allAvailableRecords.find((r) => r.id === selectedBId) || allAvailableRecords[1] || currentResult,
    [allAvailableRecords, selectedBId, allAvailableRecords, currentResult]
  );

  const handleSwap = () => {
    const temp = selectedAId;
    setSelectedAId(selectedBId);
    setSelectedBId(temp);
  };

  const scoreDiff = parseFloat((recordA.score - recordB.score).toFixed(1));

  // Overlaid Fourier Canvas Effect
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    for (let c = 0; c <= 8; c++) {
      const x = (c / 8) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let r = 0; r <= 4; r++) {
      const y = (r / 4) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const curveA = generateFourierCurve(recordA);
    const curveB = generateFourierCurve(recordB);
    const bins = curveA.length;

    const drawSpectrum = (curve: number[], strokeColor: string, gradStart: string, gradEnd: string) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, height - 14);

      for (let i = 0; i < bins; i++) {
        const x = (i / (bins - 1)) * width;
        const normY = curve[i] / 255;
        const y = height - 16 - normY * (height - 32);
        if (i === 0) ctx.lineTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.lineTo(width, height - 14);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, gradStart);
      grad.addColorStop(1, gradEnd);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      for (let i = 0; i < bins; i++) {
        const x = (i / (bins - 1)) * width;
        const normY = curve[i] / 255;
        const y = height - 16 - normY * (height - 32);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2.2;
      ctx.stroke();
      ctx.restore();
    };

    if (curveView === 'both' || curveView === 'b') {
      drawSpectrum(curveB, '#38bdf8', 'rgba(56, 189, 248, 0.3)', 'rgba(56, 189, 248, 0.02)');
    }

    if (curveView === 'both' || curveView === 'a') {
      drawSpectrum(curveA, '#14b8a6', 'rgba(20, 184, 166, 0.35)', 'rgba(20, 184, 166, 0.02)');
    }

    ctx.fillStyle = '#64748b';
    ctx.font = '8px monospace';
    ctx.fillText('100Hz', 8, height - 3);
    ctx.fillText('1kHz', width * 0.28, height - 3);
    ctx.fillText('5kHz', width * 0.55, height - 3);
    ctx.fillText('10kHz', width * 0.78, height - 3);
    ctx.fillText('20kHz', width - 36, height - 3);
  }, [isOpen, recordA, recordB, curveView]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-white flex items-center justify-center shadow-xs">
              <Scale className="w-4 h-4 text-teal-400" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                TouchxAi_V6Pro Compare Results
              </h2>
              <p className="text-[10px] text-slate-500 font-mono">
                Overlaid Fourier Spectrum & 10-Object Measurement Log
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Sample Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 relative">
            {/* Sample A */}
            <div className="p-3 rounded-2xl border-2 border-teal-500/40 bg-teal-50/30 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold uppercase tracking-wider">
                  Sample A (Recent)
                </span>
                <span className="font-mono text-teal-800 font-extrabold text-sm">
                  {recordA.score.toFixed(1)}/10
                </span>
              </div>

              <div className="relative mt-1">
                <select
                  value={selectedAId}
                  onChange={(e) => setSelectedAId(e.target.value)}
                  className="w-full bg-white border border-teal-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900 appearance-none pr-8 focus:outline-hidden focus:ring-2 focus:ring-teal-500 shadow-2xs"
                >
                  {allAvailableRecords.map((rec) => (
                    <option key={`a-${rec.id}`} value={rec.id}>
                      {rec.objectName} ({rec.mode} · {rec.score.toFixed(1)})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Swap Button */}
            <button
              onClick={handleSwap}
              className="sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 z-10 w-7 h-7 mx-auto sm:mx-0 rounded-full bg-white border border-slate-300 shadow-md flex items-center justify-center text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-all"
              title="Swap Samples"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>

            {/* Sample B */}
            <div className="p-3 rounded-2xl border-2 border-sky-400/40 bg-sky-50/30 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-sky-600 text-white text-[10px] font-bold uppercase tracking-wider">
                  Sample B (Baseline)
                </span>
                <span className="font-mono text-sky-900 font-extrabold text-sm">
                  {recordB.score.toFixed(1)}/10
                </span>
              </div>

              <div className="relative mt-1">
                <select
                  value={selectedBId}
                  onChange={(e) => setSelectedBId(e.target.value)}
                  className="w-full bg-white border border-sky-300 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-900 appearance-none pr-8 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-2xs"
                >
                  {allAvailableRecords.map((rec) => (
                    <option key={`b-${rec.id}`} value={rec.id}>
                      {rec.objectName} ({rec.mode} · {rec.score.toFixed(1)})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Overlaid Fourier Spectrum Canvas */}
          <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800 shadow-inner flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-teal-400" />
                <span className="font-bold text-slate-200">Overlaid Fourier Spectrums</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  onClick={() => setCurveView('both')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    curveView === 'both' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Overlaid
                </button>
                <button
                  onClick={() => setCurveView('a')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    curveView === 'a' ? 'bg-teal-700 text-white' : 'text-slate-400 hover:text-teal-400'
                  }`}
                >
                  A Only
                </button>
                <button
                  onClick={() => setCurveView('b')}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                    curveView === 'b' ? 'bg-sky-700 text-white' : 'text-slate-400 hover:text-sky-400'
                  }`}
                >
                  B Only
                </button>
              </div>
            </div>

            <canvas
              ref={canvasRef}
              width={460}
              height={140}
              className="w-full h-32 rounded-xl bg-[#090d16] border border-slate-800/80 block"
            />

            <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-800/60 font-mono">
              <span className="text-teal-400 truncate max-w-[200px]">
                A: {recordA.objectName} ({recordA.dominantHarmonic})
              </span>
              <span className="text-sky-300 truncate max-w-[200px]">
                B: {recordB.objectName} ({recordB.dominantHarmonic})
              </span>
            </div>
          </div>

          {/* TWO COLOR SCALE BARS (Red -> Orange -> Yellow -> Green -> Blue -> Black) */}
          <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 block">
              1 – 10 Color Bar Scales (Red → Orange → Yellow → Green → Blue → Black)
            </span>

            {/* Scale Bar for Sample A */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-slate-800">
                  Sample A: <span className="text-teal-700">{recordA.objectName}</span>
                </span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {recordA.score.toFixed(1)} / 10
                </span>
              </div>
              <div className="relative w-full h-5 rounded-lg overflow-hidden p-0.5 shadow-inner" style={{ background: SCALE_GRADIENT }}>
                {/* Pointer Pin A */}
                <div
                  className="absolute top-0 bottom-0 w-2 bg-white rounded-full border-2 border-slate-950 shadow-md transition-all duration-500 -ml-1"
                  style={{ left: `${(recordA.score / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* Scale Bar for Sample B */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-slate-800">
                  Sample B: <span className="text-sky-700">{recordB.objectName}</span>
                </span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {recordB.score.toFixed(1)} / 10
                </span>
              </div>
              <div className="relative w-full h-5 rounded-lg overflow-hidden p-0.5 shadow-inner" style={{ background: SCALE_GRADIENT }}>
                {/* Pointer Pin B */}
                <div
                  className="absolute top-0 bottom-0 w-2 bg-white rounded-full border-2 border-slate-950 shadow-md transition-all duration-500 -ml-1"
                  style={{ left: `${(recordB.score / 10) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between text-[9px] font-mono text-slate-400 px-1 pt-0.5">
              <span>1 (Red)</span>
              <span>3 (Orange)</span>
              <span>5 (Yellow)</span>
              <span>7 (Green)</span>
              <span>8.5 (Blue)</span>
              <span>10 (Black)</span>
            </div>
          </div>

          {/* LIST OF 10 OBJECTS MEASUREMENTS AND RESULTS WITH NAME AND TIME */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-600" />
                <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider">
                  List of 10 Object Measurements
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {top10ObjectsList.length} Objects
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[220px] overflow-y-auto pr-1">
              {top10ObjectsList.map((item, idx) => (
                <div
                  key={`top10-${item.id || idx}`}
                  className="py-2 px-1 flex items-center justify-between hover:bg-slate-50 transition-colors rounded-lg text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-5 text-[10px] font-mono text-slate-400 font-semibold">
                      #{idx + 1}
                    </span>
                    <div className="text-left truncate">
                      <span className="font-bold text-slate-900 block truncate">
                        {item.objectName}
                      </span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        <span className="capitalize text-teal-700 font-medium">{item.mode}</span>
                        <span>·</span>
                        <span>{item.timestamp}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-900 px-2 py-0.5 rounded border border-slate-200">
                      {item.score.toFixed(1)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedAId(item.id)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono transition-colors ${
                          selectedAId === item.id
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-100 hover:bg-teal-50 text-slate-600 hover:text-teal-700'
                        }`}
                        title="Set as Sample A"
                      >
                        Set A
                      </button>
                      <button
                        onClick={() => setSelectedBId(item.id)}
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono transition-colors ${
                          selectedBId === item.id
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-700'
                        }`}
                        title="Set as Sample B"
                      >
                        Set B
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 px-5 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};
