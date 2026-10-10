import React, { useState } from 'react';
import { BaselineSkinMetrics } from '../types';
import { getBaselineData, saveBaselineModeData, resetBaselineData } from '../lib/calibrationEngine';
import { User, CheckCircle2, RotateCcw, MoveHorizontal, ArrowDown, Radio, Sparkles, ShieldCheck } from 'lucide-react';

interface CalibrationScreenProps {
  onStartCalibration: (mode: 'texture' | 'hardness' | 'density') => void;
  baseline: BaselineSkinMetrics;
  onBaselineUpdated: (updated: BaselineSkinMetrics) => void;
}

export const CalibrationScreen: React.FC<CalibrationScreenProps> = ({
  onStartCalibration,
  baseline,
  onBaselineUpdated,
}) => {
  const [selectedParam, setSelectedParam] = useState<'all' | 'texture' | 'hardness' | 'density'>('all');

  const handleReset = () => {
    resetBaselineData();
    onBaselineUpdated(getBaselineData());
  };

  return (
    <div className="w-full space-y-4 text-left">
      {/* Forearm Skin Baseline Status Banner */}
      <div className="p-4 rounded-2xl bg-white border border-teal-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Forearm Skin Reference (0% Anchor)
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                baseline.isCalibrated
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {baseline.isCalibrated ? '● Calibrated' : '○ Factory Baseline'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {baseline.isCalibrated && baseline.calibratedAt
                ? `Last calibrated on your forearm: ${baseline.calibratedAt}`
                : 'Using biological standard reference values for human forearm epidermis.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {baseline.isCalibrated && (
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Reset to factory skin standard"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Calibration Instructions & Mode Selector */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Calibrate Forearm Baseline Protocols
            </h3>
            <p className="text-[11px] text-slate-500">
              Measure your own forearm skin to anchor all future test items to 0%
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md">
            TouchxAi_V6Pro
          </span>
        </div>

        {/* 3 Step Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* 1. Texture Protocol */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3 hover:border-teal-300 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <MoveHorizontal className="w-4 h-4 text-teal-600" />
                  Texture Baseline
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  {baseline.texture?.value?.toFixed(1) ?? '2.8'} Score
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Slide the microphone port across your inner forearm <strong>5+ times</strong> at steady speed (10–25 cm/s).
              </p>
              <div className="mt-2 text-[10px] font-mono text-slate-400">
                Anchor Centroid: ~1,100 Hz
              </div>
            </div>

            <button
              onClick={() => onStartCalibration('texture')}
              className="w-full py-2 px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <span>Calibrate Texture</span>
            </button>
          </div>

          {/* 2. Hardness Protocol */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3 hover:border-sky-300 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ArrowDown className="w-4 h-4 text-sky-600" />
                  Hardness Baseline
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  {baseline.hardness?.value?.toFixed(1) ?? '1.4'} Score
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Tap the microphone port firmly against your forearm skin <strong>5 times</strong> to calibrate viscoelastic delay.
              </p>
              <div className="mt-2 text-[10px] font-mono text-slate-400">
                Contact Delay: ~28 ms lag
              </div>
            </div>

            <button
              onClick={() => onStartCalibration('hardness')}
              className="w-full py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <span>Calibrate Hardness</span>
            </button>
          </div>

          {/* 3. Density Protocol */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between space-y-3 hover:border-rose-300 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-rose-600" />
                  Density Baseline
                </span>
                <span className="text-[10px] font-mono font-bold text-slate-500">
                  {baseline.density?.value?.toFixed(1) ?? '1.5'} Score
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Hold the phone microphone against your forearm skin for <strong>5+ seconds</strong> while vibrating.
              </p>
              <div className="mt-2 text-[10px] font-mono text-slate-400">
                Acoustic Z: 1.6 × 10⁵ kg/(m²·s)
              </div>
            </div>

            <button
              onClick={() => onStartCalibration('density')}
              className="w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
            >
              <span>Calibrate Density</span>
            </button>
          </div>
        </div>
      </div>

      {/* Calibration Reference Summary Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs text-left space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Current Stored Forearm Baseline Parameters
          </span>
          <span className="text-[10px] font-mono text-slate-500">Persisted in LocalStorage</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-mono text-slate-500 uppercase">
                <th className="py-2 px-2.5">Tactile Metric</th>
                <th className="py-2 px-2.5">0% Anchor Value</th>
                <th className="py-2 px-2.5">Acoustic / IMU Signal</th>
                <th className="py-2 px-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              <tr>
                <td className="py-2.5 px-2.5 font-bold text-slate-900 font-sans">Texture (Roughness)</td>
                <td className="py-2.5 px-2.5 text-teal-700 font-bold">{baseline.texture?.value?.toFixed(1) ?? '2.8'}</td>
                <td className="py-2.5 px-2.5 text-slate-600">f_centroid: {baseline.texture?.centroid ?? 1100} Hz · v_slide: 18 cm/s</td>
                <td className="py-2.5 px-2.5 text-emerald-600">Active (0%)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-2.5 font-bold text-slate-900 font-sans">Hardness (Firmness)</td>
                <td className="py-2.5 px-2.5 text-sky-700 font-bold">{baseline.hardness?.value?.toFixed(1) ?? '1.4'}</td>
                <td className="py-2.5 px-2.5 text-slate-600">f_res: 220 Hz · Δt_visco: {baseline.hardness?.contactLagMs ?? 28} ms</td>
                <td className="py-2.5 px-2.5 text-emerald-600">Active (0%)</td>
              </tr>
              <tr>
                <td className="py-2.5 px-2.5 font-bold text-slate-900 font-sans">Density (Mass Inertia)</td>
                <td className="py-2.5 px-2.5 text-rose-700 font-bold">{baseline.density?.value?.toFixed(1) ?? '1.5'}</td>
                <td className="py-2.5 px-2.5 text-slate-600">160 Hz Coupling · Z: 1.6 × 10⁵ kg/(m²·s)</td>
                <td className="py-2.5 px-2.5 text-emerald-600">Active (0%)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
