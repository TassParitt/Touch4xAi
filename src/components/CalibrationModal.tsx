import React, { useState, useEffect, useRef } from 'react';
import { X, RotateCcw, MoveHorizontal, ArrowDown, Radio, Compass, Play } from 'lucide-react';
import { ReferenceProfile } from '../types';
import { setActiveReference, resetBaselineData, getActiveReference } from '../lib/calibrationEngine';
import { PhoneContactDiagram } from './PhoneContactDiagram';

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
  // Requirement: Keep reference names blank until the user puts the name during calibration
  const [referenceName, setReferenceName] = useState(activeReference.isCalibrated ? activeReference.name : '');
  const [calibrationMode, setCalibrationMode] = useState<'texture' | 'hardness' | 'density'>('texture');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isNameApplied, setIsNameApplied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeReference?.isCalibrated && activeReference.name) {
      setReferenceName(activeReference.name);
    } else {
      setReferenceName('');
    }
  }, [activeReference]);

  useEffect(() => {
    if (isOpen) {
      setValidationError(null);
      setIsNameApplied(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApplyCustomName = () => {
    const trimmed = referenceName.trim() || '0% Reference Standard';
    const updated: ReferenceProfile = {
      ...activeReference,
      name: trimmed,
      isCalibrated: true,
    };
    setActiveReference(updated);
    onReferenceChanged(updated);
    setIsNameApplied(true);
    setTimeout(() => setIsNameApplied(false), 2000);
  };

  /**
   * Requirement: If user taps on reset calibration, bring back to refill the new object names
   * and repeat the calibration as selected function of measurement.
   */
  const handleResetToStandard = () => {
    resetBaselineData();
    const blankStandard = getActiveReference();
    setReferenceName('');
    setValidationError(null);
    setIsNameApplied(false);
    onReferenceChanged(blankStandard);
    // Focus input to refill new object name
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleStart = () => {
    // Make sure Smart Calibration tab always works reliably
    const targetName = referenceName.trim() || activeReference.name?.trim() || '0% Reference Standard';
    setValidationError(null);
    const updated: ReferenceProfile = {
      ...activeReference,
      name: targetName,
      isCalibrated: true,
    };
    setActiveReference(updated);
    onReferenceChanged(updated);
    onStartCalibration(calibrationMode, targetName);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] text-left">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Calibration</h3>
              <p className="text-[11px] text-slate-500 font-medium">Establishes 0% reference baseline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* 1. Object Name: Blank filling in text with an Enter Tab */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Reference Object Name
              </label>
              <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md">
                0% Reference Standard
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={referenceName}
                onChange={(e) => {
                  setReferenceName(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleApplyCustomName();
                  }
                }}
                placeholder="Enter reference object name..."
                className={`flex-1 px-3.5 py-3 bg-slate-50 border rounded-xl text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 transition-all ${
                  validationError
                    ? 'border-rose-400 ring-rose-400/20 focus:border-rose-500'
                    : 'border-slate-200 focus:ring-teal-500/20 focus:border-teal-600'
                }`}
              />
              <button
                type="button"
                onClick={handleApplyCustomName}
                disabled={!referenceName.trim()}
                className="px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
                title="Enter reference object name"
              >
                <span>{isNameApplied ? 'Applied ✓' : 'Enter'}</span>
              </button>
            </div>
            {validationError && (
              <p className="text-xs font-semibold text-rose-600 mt-1">{validationError}</p>
            )}
          </div>

          {/* 2. Calibration Function: Texture, Hardness, Density */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
              Calibration Function
            </label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setCalibrationMode('texture')}
                className={`py-3 px-2 rounded-lg text-sm font-black transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  calibrationMode === 'texture'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MoveHorizontal className="w-4 h-4 text-teal-600" />
                <span>Texture</span>
              </button>

              <button
                type="button"
                onClick={() => setCalibrationMode('hardness')}
                className={`py-3 px-2 rounded-lg text-sm font-black transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  calibrationMode === 'hardness'
                    ? 'bg-white text-sky-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ArrowDown className="w-4 h-4 text-sky-600" />
                <span>Hardness</span>
              </button>

              <button
                type="button"
                onClick={() => setCalibrationMode('density')}
                className={`py-3 px-2 rounded-lg text-sm font-black transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                  calibrationMode === 'density'
                    ? 'bg-white text-rose-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Radio className="w-4 h-4 text-rose-600" />
                <span>Density</span>
              </button>
            </div>
          </div>

          {/* Acoustic Contact Alignment with Figure Movement */}
          {/* Methodology text removed as requested, keeping acoustic contact alignment figure */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                Acoustic Contact Alignment
              </label>
              <span className="text-[11px] font-mono text-slate-500">
                {calibrationMode === 'hardness' && '3 taps'}
                {calibrationMode === 'texture' && '6 slidings (3 cycles)'}
                {calibrationMode === 'density' && '6s steady contact'}
              </span>
            </div>

            {/* Figure Movement Animation Diagram */}
            <div className="rounded-2xl overflow-hidden border border-slate-200">
              <PhoneContactDiagram mode={calibrationMode} />
            </div>
          </div>
        </div>

        {/* 4. Start Calibration & 5. Reset Calibration */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          {/* Reset calibration: clears and prepares to refill new object name */}
          <button
            type="button"
            onClick={handleResetToStandard}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Reset calibration and refill new object name"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Calibration</span>
          </button>

          {/* Smart Calibration / Start Calibration button */}
          <button
            type="button"
            onClick={handleStart}
            className="flex-1 max-w-xs h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 active:scale-[0.99] transition-all cursor-pointer"
            title="Start calibration and run measurement for selected mode"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Smart Calibration ({calibrationMode.toUpperCase()})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
