import React, { useState, useEffect } from 'react';
import { X, Check, RotateCcw, MoveHorizontal, ArrowDown, Radio, Sparkles, Smartphone, Layers, HelpCircle, Compass, ShieldCheck } from 'lucide-react';
import { ReferenceProfile, MeasureMode } from '../types';
import { PRESET_REFERENCES, setActiveReference, resetBaselineData, getActiveReference } from '../lib/calibrationEngine';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeReference: ReferenceProfile;
  onReferenceChanged: (ref: ReferenceProfile) => void;
  onStartCalibration: (mode: 'texture' | 'hardness' | 'density', referenceName: string) => void;
}

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  activeReference,
  onReferenceChanged,
  onStartCalibration,
}) => {
  const [referenceName, setReferenceName] = useState(activeReference.name || 'Forearm Skin');
  const [calibrationMode, setCalibrationMode] = useState<'texture' | 'hardness' | 'density'>('texture');

  useEffect(() => {
    if (activeReference?.name) {
      setReferenceName(activeReference.name);
    }
  }, [activeReference]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: ReferenceProfile) => {
    setReferenceName(preset.name);
    setActiveReference(preset);
    onReferenceChanged(preset);
  };

  const handleApplyCustomName = () => {
    const trimmed = referenceName.trim();
    if (!trimmed) return;
    const updated: ReferenceProfile = {
      ...activeReference,
      name: trimmed,
    };
    setActiveReference(updated);
    onReferenceChanged(updated);
  };

  const handleResetToStandard = () => {
    resetBaselineData();
    const standard = getActiveReference();
    setReferenceName(standard.name);
    onReferenceChanged(standard);
  };

  const handleStart = () => {
    handleApplyCustomName();
    onStartCalibration(calibrationMode, referenceName.trim() || 'Forearm Skin');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] text-left">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                Calibration & Reference Baseline
              </h3>
              <p className="text-[11px] text-slate-500">
                Set baseline parameters to establish the 0% reference for relative measurements
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

        {/* Modal Body */}
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Step 1: What would you like to compare? (Fill-in) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span>1. What would you like to compare? (Reference Object)</span>
              </label>
              <span className="text-[10px] font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                0% Reference
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={referenceName}
                onChange={(e) => setReferenceName(e.target.value)}
                onBlur={handleApplyCustomName}
                placeholder="e.g. Forearm Skin, Palm Skin, Reference Steel Block..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
              />
            </div>

            {/* Quick Reference Presets Chips */}
            <div className="space-y-1.5 pt-0.5">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Change Reference Object:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_REFERENCES.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${
                      referenceName === preset.name
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Current Reference Benchmark Status Pills */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] text-slate-500 font-medium">
                Active Reference Baselines (0%):
              </span>
              <div className="flex items-center gap-2 font-mono text-[10px]">
                <span className="px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 font-semibold">
                  Texture: {activeReference.textureValue.toFixed(1)}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-semibold">
                  Hardness: {activeReference.hardnessValue.toFixed(1)}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-semibold">
                  Density: {activeReference.densityValue.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Step 2: Select Calibration Function */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              2. Select Calibration Function
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setCalibrationMode('texture')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                  calibrationMode === 'texture'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MoveHorizontal className="w-3.5 h-3.5 text-teal-600" />
                <span>Texture</span>
              </button>

              <button
                type="button"
                onClick={() => setCalibrationMode('hardness')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                  calibrationMode === 'hardness'
                    ? 'bg-white text-sky-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDown className="w-3.5 h-3.5 text-sky-600" />
                <span>Hardness</span>
              </button>

              <button
                type="button"
                onClick={() => setCalibrationMode('density')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                  calibrationMode === 'density'
                    ? 'bg-white text-rose-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Radio className="w-3.5 h-3.5 text-rose-600" />
                <span>Density</span>
              </button>
            </div>
          </div>

          {/* Step 3: Show How to Measure */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
              3. How to Measure {calibrationMode.toUpperCase()}
            </label>

            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200/80 text-xs text-slate-800 space-y-2.5">
              {calibrationMode === 'texture' && (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="leading-relaxed">
                      Place the smartphone microphone port flat against your <strong>{referenceName}</strong> surface.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="leading-relaxed">
                      Slide the phone across the surface <strong>3 times</strong> back and forth continuously <strong>without lifting</strong> the smartphone.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="leading-relaxed">
                      The accelerometer tracks the 3 sliding passes and locks the measured result as your <strong>0% Texture Reference</strong>.
                    </p>
                  </div>
                </>
              )}

              {calibrationMode === 'hardness' && (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="leading-relaxed">
                      Align the microphone port vertically against your <strong>{referenceName}</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="leading-relaxed">
                      Tap the microphone port firmly against the surface <strong>3 times</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="leading-relaxed">
                      The accelerometer tracks the 3 taps and locks the result as your <strong>0% Hardness Reference</strong>.
                    </p>
                  </div>
                </>
              )}

              {calibrationMode === 'density' && (
                <>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      1
                    </span>
                    <p className="leading-relaxed">
                      Press the microphone port firmly against your <strong>{referenceName}</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      2
                    </span>
                    <p className="leading-relaxed">
                      Hold the phone firmly for <strong>6 seconds</strong> while phone vibrations excite the material.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      3
                    </span>
                    <p className="leading-relaxed">
                      The sensor measures structural damping decay over 6 seconds and locks the result as your <strong>0% Density Reference</strong>.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetToStandard}
            className="px-3 py-2 text-slate-500 hover:text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Standards</span>
          </button>

          <button
            type="button"
            onClick={handleStart}
            className="flex-1 max-w-xs h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 active:scale-[0.99] transition-all"
          >
            <span>Start Calibration ({calibrationMode})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
