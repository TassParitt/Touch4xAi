import React, { useState, useEffect } from 'react';
import {
  Activity,
  Layers,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Share2,
  FolderArchive,
  ArrowRight,
  RotateCcw,
  Smartphone,
  Cloud,
  CheckCircle2,
  Sliders,
  Info,
  Maximize2,
  Minimize2,
  HelpCircle,
  Scale,
  Crosshair,
  Compass,
  ArrowLeftRight,
} from 'lucide-react';
import { MeasureMode, ObjectDetails, AcousticAnalysisResult, SavedRecord, AppVersionMode, BaselineSkinMetrics, ReferenceProfile } from './types';
import { PhoneContactDiagram } from './components/PhoneContactDiagram';
import { ObjectLabelingBar } from './components/ObjectLabelingBar';
import { CameraRecognitionModal } from './components/CameraRecognitionModal';
import { AudioFourierVisualizer } from './components/AudioFourierVisualizer';
import { SaveResultModal } from './components/SaveResultModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { AuthBar } from './components/AuthBar';
import { TrendAnalysisCard } from './components/TrendAnalysisCard';
import { CompareResultsModal } from './components/CompareResultsModal';
import { TouchxAiLogo } from './components/TouchxAiLogo';
import { MaterialAnalysisTable } from './components/MaterialAnalysisTable';
import { InteractiveFftVisualizer } from './components/InteractiveFftVisualizer';
import { MaterialHeatmap } from './components/MaterialHeatmap';
import { RelativeScaleBar } from './components/RelativeScaleBar';
import { CalibrationModal } from './components/CalibrationModal';
import { getBaselineData, getActiveReference, updateActiveReferenceBaseline } from './lib/calibrationEngine';
import {
  detectSmartphone,
  DetectedSmartphone,
} from './lib/deviceDetection';
import { User } from 'firebase/auth';
import { fetchUserMeasurementsFromFirestore, deleteMeasurementFromFirestore } from './lib/firebase';

export default function App() {
  // Navigation Screens: 1 = Setup, 2 = Measurement (Fourier), 3 = Results (1-10 Dual Scale Bars)
  const [currentScreen, setCurrentScreen] = useState<1 | 2 | 3>(1);

  // Screen 3 View Mode: 'scale' (Default immediately after measuring) | 'table' | 'fft' | 'heatmap' | 'both'
  const [screen3ViewTab, setScreen3ViewTab] = useState<'scale' | 'table' | 'fft' | 'heatmap' | 'both'>('table');
  // Optional expandable technical parameters for advanced users (collapsed by default for general consumers)
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // App version mode: 'V6Pro' (Relative Skin Calibration & 6-Axis IMU) vs 'V5' (Absolute 1-10 Benchmark)
  const [versionMode, setVersionMode] = useState<AppVersionMode>('V6Pro');

  // Forearm Skin Baseline reference state (persists across reloads)
  const [skinBaseline, setSkinBaseline] = useState<BaselineSkinMetrics>(() => getBaselineData());
  const [activeReference, setActiveReferenceState] = useState<ReferenceProfile>(() => getActiveReference());
  const [isCalibratingBaseline, setIsCalibratingBaseline] = useState(false);
  const [isCalibrationModalOpen, setIsCalibrationModalOpen] = useState(false);

  // Auto-detected smartphone device profile
  const [detectedPhone, setDetectedPhone] = useState<DetectedSmartphone>({
    brand: 'Detecting...',
    model: 'Smartphone',
    fullName: 'Detecting Smartphone Sensor...',
    os: 'Mobile OS',
    isMobile: true,
    micLocation: 'Bottom Port',
    recommendedCalibrationOffset: 0,
  });

  // Active measuring mode: 'texture' | 'hardness' | 'density'
  const [selectedMode, setSelectedMode] = useState<MeasureMode>('texture');

  // How-to-measure dropdown info state
  const [isHowToOpen, setIsHowToOpen] = useState(true);

  // Object details - fill-in window by default
  const [currentObject, setCurrentObject] = useState<ObjectDetails>({
    name: '',
    material: '',
    description: '',
  });

  // Detect smartphone model on mount and attach to currentObject
  useEffect(() => {
    detectSmartphone().then((phone) => {
      setDetectedPhone(phone);
      setCurrentObject((prev) => ({
        ...prev,
        deviceModel: phone.fullName,
      }));
    });
  }, []);

  // Active measurement result for Screen 3 (Recent)
  const [analysisResult, setAnalysisResult] = useState<AcousticAnalysisResult | null>(null);

  // Previous measurement result for Dual Scale Bar comparison
  const [previousResult, setPreviousResult] = useState<AcousticAnalysisResult | null>(null);

  // Session history for trend analysis
  const [sessionHistory, setSessionHistory] = useState<AcousticAnalysisResult[]>([]);

  // Modals & Drawers
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Current Firebase Auth user
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Saved records storage (persisted in localStorage + synced with Firestore)
  const [savedRecords, setSavedRecords] = useState<SavedRecord[]>(() => {
    try {
      const stored = localStorage.getItem('touch_ai_records');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sync records with Firestore when user logs in
  useEffect(() => {
    if (currentUser) {
      fetchUserMeasurementsFromFirestore(currentUser.uid)
        .then((remoteRecords) => {
          if (remoteRecords.length > 0) {
            setSavedRecords((prev) => {
              const map = new Map<string, SavedRecord>();
              // Keep remote records
              remoteRecords.forEach((r) => map.set(r.id, r));
              // Merge with local records
              prev.forEach((r) => {
                if (!map.has(r.id)) map.set(r.id, r);
              });
              return Array.from(map.values());
            });
          }
        })
        .catch((err) => console.warn('Could not sync Firestore records:', err));
    }
  }, [currentUser]);

  // Mobile frame wrapper toggle for desktop viewing comfort
  const [mobileFrameMode, setMobileFrameMode] = useState(true);

  // Persist records
  useEffect(() => {
    try {
      localStorage.setItem('touch_ai_records', JSON.stringify(savedRecords));
    } catch (e) {
      console.error(e);
    }
  }, [savedRecords]);

  // Concise one-sentence measuring guides
  const measurementGuides = {
    texture: 'Slide the microphone port across the object surface 5+ times.',
    hardness: 'Tap the microphone port firmly against the object surface 5 times.',
    density: 'Hold the microphone port against the object for 5+ seconds while vibrating.',
  };

  // Measurement finished on Screen 2 -> Automatically bring to Screen 3
  const handleMeasurementComplete = (result: AcousticAnalysisResult) => {
    if (isCalibratingBaseline) {
      const updated = updateActiveReferenceBaseline(
        result.mode as 'texture' | 'hardness' | 'density',
        result.score,
        activeReference.name
      );
      setActiveReferenceState(updated);
      setIsCalibratingBaseline(false);
      setCurrentScreen(1);
      return;
    }

    if (analysisResult) {
      setPreviousResult(analysisResult);
    } else if (sessionHistory.length > 0) {
      setPreviousResult(sessionHistory[0]);
    } else if (savedRecords.length > 0) {
      setPreviousResult(savedRecords[0]);
    }
    setAnalysisResult(result);
    setSessionHistory((prev) => [result, ...prev]);
    setScreen3ViewTab('scale'); // Show scale on the app immediately after measuring
    setCurrentScreen(3);
  };

  const handleSaveConfirmed = (record: SavedRecord) => {
    setSavedRecords((prev) => [record, ...prev]);
  };

  const handleDeleteRecord = async (id: string) => {
    setSavedRecords((prev) => prev.filter((r) => r.id !== id));
    if (currentUser) {
      try {
        await deleteMeasurementFromFirestore(currentUser.uid, id);
      } catch (err) {
        console.warn('Failed to delete from Firestore:', err);
      }
    }
  };

  const handleSelectHistoryRecord = (record: SavedRecord) => {
    if (analysisResult && analysisResult.id !== record.id) {
      setPreviousResult(analysisResult);
    }
    setAnalysisResult(record);
    setSelectedMode(record.mode);
    setCurrentObject({
      name: record.objectName,
      material: 'Saved Sample',
      description: record.summary,
    });
    setCurrentScreen(3);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-start p-0 sm:py-6 sm:px-4 font-sans antialiased selection:bg-teal-100 selection:text-teal-900">
      {/* Mobile Shell Frame */}
      <main
        className={`w-full ${
          mobileFrameMode ? 'max-w-[420px] sm:shadow-2xl sm:border sm:border-slate-200/90 sm:rounded-[36px]' : 'max-w-2xl'
        } bg-white min-h-screen sm:min-h-[820px] flex flex-col justify-between overflow-hidden relative`}
      >
        {/* TOP BAR / HEADER (Top Bar Contract: Logo, Quick status, Actions) */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center justify-between">
          {/* 1) Brand Logo: TouchxAi (V6Pro / V5 Dynamic) */}
          <div
            onClick={() => setCurrentScreen(1)}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <TouchxAiLogo size="md" showTagline={true} version={versionMode} />
          </div>

          {/* Right Action Icons: Auth Bar, Saved History Drawer & Frame mode toggle */}
          <div className="flex items-center gap-1.5">
            <AuthBar onUserChanged={setCurrentUser} />

            <button
              onClick={() => setIsHistoryDrawerOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative"
              title="Saved Measurements"
            >
              <FolderArchive className="w-4 h-4" />
              {savedRecords.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-teal-600" />
              )}
            </button>

            <button
              onClick={() => setMobileFrameMode(!mobileFrameMode)}
              className="hidden sm:flex p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title={mobileFrameMode ? 'Expand View' : 'Mobile Viewport'}
            >
              {mobileFrameMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>

        {/* ======================================================== */}
        {/* SCREEN 1: PLATFORM SELECTION & SETUP MAIN SCREEN */}
        {/* ======================================================== */}
        {currentScreen === 1 && (
          <div className="flex-1 p-4 pb-20 space-y-4 overflow-y-auto animate-in fade-in duration-150">
            {/* 2) Label Objects Section (Fill-in Window) */}
            <ObjectLabelingBar
              currentObject={currentObject}
              onUpdateObject={(details) => setCurrentObject(details)}
              onOpenCamModal={() => setIsCameraModalOpen(true)}
              detectedPhoneModel={detectedPhone.fullName}
            />

            {/* 3) Calibration & Reference Baseline (BEFORE Measuring Parameter) */}
            <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs text-left">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs border border-teal-200/60">
                    <Compass className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider block">
                      Calibration & Reference Baseline
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Establishes 0% reference object for relative metrology
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  0% Ref: {activeReference.name}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
                <div className="text-left space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                    Compare Against (Reference):
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">
                      {activeReference.name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-teal-100 text-teal-800 font-semibold">
                      0% Reference
                    </span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500 pt-0.5">
                    <span>Texture: {activeReference.textureValue.toFixed(1)}</span>
                    <span>•</span>
                    <span>Hardness: {activeReference.hardnessValue.toFixed(1)}</span>
                    <span>•</span>
                    <span>Density: {activeReference.densityValue.toFixed(1)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCalibrationModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Calibrate / Compare</span>
                </button>
              </div>
            </div>

            {/* 4) Measuring Parameter Tabs: Texture, Hardness, Density */}
            <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs text-left">
              <div className="flex items-center justify-between mb-2.5">
                <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Measuring Parameter
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-teal-700 font-medium capitalize">
                    {selectedMode} Mode
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                    Ref: 0% ({activeReference.name})
                  </span>
                </div>
              </div>

              {/* Segmented Mode Selector Buttons (Texture, Hardness, Density) */}
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => {
                    setSelectedMode('texture');
                    setIsCalibratingBaseline(false);
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                    selectedMode === 'texture'
                      ? 'bg-white text-teal-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Texture
                </button>

                <button
                  onClick={() => {
                    setSelectedMode('hardness');
                    setIsCalibratingBaseline(false);
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                    selectedMode === 'hardness'
                      ? 'bg-white text-sky-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Hardness
                </button>

                <button
                  onClick={() => {
                    setSelectedMode('density');
                    setIsCalibratingBaseline(false);
                  }}
                  className={`py-2 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                    selectedMode === 'density'
                      ? 'bg-white text-rose-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Density
                </button>
              </div>

              {/* How to measure dropdown */}
              <div className="mt-3">
                <button
                  onClick={() => setIsHowToOpen(!isHowToOpen)}
                  className="w-full flex items-center justify-between py-1.5 text-xs text-slate-600 font-semibold hover:text-slate-900 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-teal-600" />
                    How to measure {selectedMode}:
                  </span>
                  {isHowToOpen ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {isHowToOpen && (
                  <div className="mt-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 animate-in fade-in">
                    <p className="font-medium text-slate-800 leading-relaxed">
                      {measurementGuides[selectedMode as 'texture' | 'hardness' | 'density']}
                    </p>
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Contact Area: Microphone (MIC) Port</span>
                      <span className="font-mono text-[10px]">Continuous Surface Contact</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Figures/Icons: Phone & MIC contact area diagram with movement animations */}
            <PhoneContactDiagram mode={selectedMode as 'texture' | 'hardness' | 'density'} />
          </div>
        )}

        {/* ======================================================== */}
        {/* SCREEN 2: AUDIO FOURIER SPECTRUM MEASUREMENT SCREEN */}
        {/* ======================================================== */}
        {currentScreen === 2 && (
          <div className="flex-1 p-4 pb-20 space-y-4 overflow-y-auto animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentScreen(1)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
              >
                ← Back to Setup
              </button>
              <span className="text-[11px] uppercase tracking-wider font-bold text-teal-700">
                Screen 2 · Live Measurement
              </span>
            </div>

            {/* 2nd Screen Visualizer with Audio Fourier Spectrum */}
            <AudioFourierVisualizer
              mode={selectedMode === 'calibration' ? 'hardness' : selectedMode}
              objectDetails={
                isCalibratingBaseline
                  ? {
                      name: `${activeReference.name} (${selectedMode.toUpperCase()} Reference)`,
                      material: activeReference.material || 'Reference Standard',
                      description: `Calibrating ${activeReference.name} as 0% reference baseline`,
                      deviceModel: detectedPhone.fullName,
                    }
                  : currentObject
              }
              onComplete={handleMeasurementComplete}
              onCancel={() => {
                setIsCalibratingBaseline(false);
                setCurrentScreen(1);
              }}
              detectedPhoneModel={detectedPhone.fullName}
              versionMode={versionMode}
              isCalibratingBaseline={isCalibratingBaseline}
            />
          </div>
        )}

        {/* ======================================================== */}
        {/* SCREEN 3: RESULT SCREEN WITH 1 - 10 DUAL COLOR BARS & SAVE */}
        {/* ======================================================== */}
        {/* ======================================================== */}
        {/* SCREEN 3: CONSUMER RESULTS SCREEN (1-10 SCALE ONLY)       */}
        {/* ======================================================== */}
        {currentScreen === 3 && analysisResult && (
          <div className="flex-1 p-4 pb-20 space-y-4 overflow-y-auto animate-in fade-in duration-150 text-left">
            {/* Top Navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentScreen(1)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1"
              >
                ← Back to Setup
              </button>
              <span className="text-[11px] uppercase tracking-wider font-bold text-teal-700">
                Measurement Result
              </span>
            </div>

            {/* 1. OBJECT NAME & MEASUREMENT MODE CARD */}
            <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs text-left space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border ${
                  analysisResult.mode === 'texture'
                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                    : analysisResult.mode === 'hardness'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-sky-50 text-sky-800 border-sky-200'
                }`}>
                  {analysisResult.mode} Measurement
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-slate-100 text-slate-700">
                    Mode: {versionMode}
                  </span>
                  <span className="font-mono text-[11px] text-slate-400">
                    {analysisResult.timestamp}
                  </span>
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {analysisResult.objectName}
              </h2>

              {/* Auto-detected smartphone sensor info badge */}
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">
                  <Smartphone className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="font-medium">
                    Sensor: <strong className="text-slate-900">{analysisResult.deviceModel || detectedPhone.fullName}</strong>
                  </span>
                  <span className="text-[10px] text-teal-700 font-mono font-semibold ml-1">(Auto-detected)</span>
                </div>
              </div>
            </div>

            {/* 2. V6PRO RELATIVE DIFFERENTIAL SCALE (-100% ⟷ 0% ⟷ +100%) */}
            {versionMode === 'V6Pro' && analysisResult.differentialResult ? (
              <RelativeScaleBar
                mode={analysisResult.mode}
                differential={analysisResult.differentialResult}
                objectName={analysisResult.objectName}
                legacyScore={analysisResult.score}
                versionMode={versionMode}
              />
            ) : null}

            {/* Shortcut: Compare Now (Automatically opens CompareResultsModal, pre-selecting current result as primary item) */}
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="w-full h-12 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all"
            >
              <ArrowLeftRight className="w-4 h-4 text-teal-400" />
              <span>Compare Now (Primary: {analysisResult.objectName})</span>
            </button>

            {/* 4. LEGACY V5 1-10 COLOR BAR CARD (Rendered in V5 Mode or as secondary reference) */}
            {versionMode === 'V5' && (
              <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs text-left space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      V5 ABSOLUTE SCORE (1-10)
                    </span>
                    <span className="text-sm font-semibold text-slate-800 mt-0.5 inline-block">
                      {analysisResult.descriptor}
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="flex items-baseline gap-1 justify-end">
                      <span className="text-4xl font-black text-slate-950 font-mono tracking-tight tabular-nums">
                        {analysisResult.score.toFixed(1)}
                      </span>
                      <span className="text-sm font-bold text-slate-400 font-mono">/ 10</span>
                    </div>
                  </div>
                </div>

                {/* 1-10 Color Bar */}
                <div className="space-y-2 pt-1">
                  <div
                    className="relative w-full h-7 rounded-2xl overflow-hidden p-0.5 shadow-inner"
                    style={{ background: 'linear-gradient(to right, #ef4444 0%, #f97316 20%, #eab308 40%, #22c55e 60%, #3b82f6 80%, #09090b 100%)' }}
                  >
                    <div
                      className="absolute top-0 bottom-0 w-3 bg-white rounded-full border-2 border-slate-950 shadow-md transition-all duration-700 -ml-1.5"
                      style={{ left: `${(analysisResult.score / 10) * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-between px-1 text-[10px] font-mono font-semibold text-slate-400">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                    <span>6</span>
                    <span>7</span>
                    <span>8</span>
                    <span>9</span>
                    <span>10</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3. CONSUMER ACTION BUTTONS (Save Result, Remeasure, New Object) */}
            <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-4 shadow-xs space-y-2.5">
              <button
                onClick={() => setIsSaveModalOpen(true)}
                className="w-full h-12 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 active:scale-[0.99] transition-all"
              >
                <FolderArchive className="w-4 h-4 text-teal-200" />
                <span>Save Result & Export (Phone / Cloud / PDF / CSV)</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentScreen(2)}
                  className="flex-1 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Remeasure</span>
                </button>

                {/* Redo in alternate mode switcher */}
                <button
                  onClick={() => {
                    setVersionMode((v) => (v === 'V6Pro' ? 'V5' : 'V6Pro'));
                  }}
                  className="flex-1 h-11 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs flex items-center justify-center gap-1 transition-colors border border-teal-200"
                  title="Switch and compare in alternate mode"
                >
                  <span>Redo in {versionMode === 'V6Pro' ? 'V5 Mode' : 'V6Pro Mode'}</span>
                </button>

                <button
                  onClick={() => {
                    setIsCalibratingBaseline(false);
                    setCurrentScreen(1);
                  }}
                  className="flex-1 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>New Object</span>
                </button>
              </div>
            </div>

            {/* 4. OPTIONAL EXPANDABLE TAB FOR PHYSICAL PARAMETERS & ADVANCED CHARTS */}
            <div className="w-full border border-slate-200 rounded-3xl overflow-hidden bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Physical Parameters & Technical Details
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {showTechnicalDetails ? 'Click to collapse technical view' : 'Optional tab: DSP table, FFT spectrum & material heatmap'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-slate-400">
                  <span className="text-[11px] font-mono font-medium text-slate-500">
                    {showTechnicalDetails ? 'Hide' : 'View'}
                  </span>
                  {showTechnicalDetails ? (
                    <ChevronUp className="w-4 h-4 text-slate-600" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-600" />
                  )}
                </div>
              </button>

              {/* Technical Details Content (Revealed when expanded) */}
              {showTechnicalDetails && (
                <div className="p-4 pt-0 space-y-4 border-t border-slate-100 animate-in fade-in">
                  {/* Mode switcher for technical figures */}
                  <div className="flex items-center justify-between bg-slate-100 p-1 rounded-2xl text-xs overflow-x-auto gap-0.5 mt-3">
                    <button
                      onClick={() => setScreen3ViewTab('table')}
                      className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-all text-center whitespace-nowrap ${
                        screen3ViewTab === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      DSP Table
                    </button>
                    <button
                      onClick={() => setScreen3ViewTab('fft')}
                      className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-all text-center whitespace-nowrap ${
                        screen3ViewTab === 'fft' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      FFT Spectrum
                    </button>
                    <button
                      onClick={() => setScreen3ViewTab('heatmap')}
                      className={`flex-1 py-1.5 px-2 rounded-xl font-bold transition-all text-center whitespace-nowrap ${
                        screen3ViewTab === 'heatmap' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Material Heatmap
                    </button>
                    <button
                      onClick={() => setScreen3ViewTab('both')}
                      className={`py-1.5 px-3 rounded-xl font-bold transition-all text-center whitespace-nowrap ${
                        screen3ViewTab === 'both' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Figures
                    </button>
                  </div>

                  {/* 1. DSP Table */}
                  {(screen3ViewTab === 'table' || screen3ViewTab === 'both') && (
                    <MaterialAnalysisTable result={analysisResult} defaultExpanded={true} />
                  )}

                  {/* 2. FFT Spectrum */}
                  {(screen3ViewTab === 'fft' || screen3ViewTab === 'both') && (
                    <div className="w-full bg-slate-950 border border-slate-800 rounded-3xl p-4 shadow-lg space-y-3 text-left">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Interactive FFT Spectrum
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                          Live Tooltips
                        </span>
                      </div>
                      <InteractiveFftVisualizer
                        spectrumDb={analysisResult.spectrumDbData || []}
                        dsp={analysisResult.dspParameters || {
                          rmsDb: analysisResult.avgDb,
                          peakDb: analysisResult.avgDb + 6,
                          crestFactor: 3.5,
                          contactDurationMs: 50,
                          spectralCentroid: parseInt(analysisResult.dominantHarmonic.replace(/[^0-9]/g, '')) || 1400,
                          spectralRolloff: 2100,
                          highFreqEnergyRatio: 0.35,
                          zeroCrossingRate: 0.22,
                          qualityFactorQ: 3.2,
                          thdPercent: 8.5,
                        }}
                        dominantHarmonic={analysisResult.dominantHarmonic}
                        dominantPeaks={analysisResult.dominantPeaks}
                        height={190}
                        showPeakPills={true}
                      />
                    </div>
                  )}

                  {/* 3. Material Heatmap */}
                  {(screen3ViewTab === 'heatmap' || screen3ViewTab === 'both') && (
                    <MaterialHeatmap
                      currentResult={analysisResult}
                      priorRecords={[...sessionHistory, ...savedRecords]}
                    />
                  )}

                  {/* 4. Trend Analysis */}
                  <TrendAnalysisCard
                    currentResult={analysisResult}
                    allRecords={[...sessionHistory, ...savedRecords]}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* BOTTOM STICKY ACTION BAR: TAB "MEASUREMENT" (Pattern C) */}
        {/* ======================================================== */}
        <footer className="sticky bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-3.5 flex items-center justify-between">
          {currentScreen === 1 && (
            <button
              onClick={() => {
                setIsCalibratingBaseline(false);
                setCurrentScreen(2);
              }}
              className="w-full h-12 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-[0.99] transition-all"
            >
              <span>Measurement ({selectedMode.toUpperCase()})</span>
              <span className="text-slate-400 font-normal">
                (vs {activeReference.name} 0% Ref)
              </span>
              <ArrowRight className="w-4 h-4 ml-1 text-teal-400" />
            </button>
          )}

          {currentScreen === 2 && (
            <div className="w-full flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500 font-medium">Measuring {selectedMode}...</span>
              <button
                onClick={() => setCurrentScreen(1)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Back to Setup
              </button>
            </div>
          )}

          {currentScreen === 3 && (
            <button
              onClick={() => setCurrentScreen(1)}
              className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-all"
            >
              <span>Done · Measure Another Item</span>
            </button>
          )}
        </footer>

        {/* MODALS & DRAWERS */}
        <CalibrationModal
          isOpen={isCalibrationModalOpen}
          onClose={() => setIsCalibrationModalOpen(false)}
          activeReference={activeReference}
          onReferenceChanged={(ref) => {
            setActiveReferenceState(ref);
          }}
          onStartCalibration={(calMode, refName) => {
            setSelectedMode(calMode);
            setIsCalibratingBaseline(true);
            setCurrentScreen(2);
          }}
        />

        <CameraRecognitionModal
          isOpen={isCameraModalOpen}
          onClose={() => setIsCameraModalOpen(false)}
          onRecognized={(details) => setCurrentObject(details)}
        />

        {analysisResult && (
          <SaveResultModal
            isOpen={isSaveModalOpen}
            onClose={() => setIsSaveModalOpen(false)}
            result={analysisResult}
            onSaveConfirmed={handleSaveConfirmed}
            priorRecords={[...sessionHistory, ...savedRecords]}
          />
        )}

        {analysisResult && (
          <CompareResultsModal
            isOpen={isCompareModalOpen}
            onClose={() => setIsCompareModalOpen(false)}
            currentResult={analysisResult}
            historyRecords={[...sessionHistory, ...savedRecords]}
          />
        )}

        <HistoryDrawer
          isOpen={isHistoryDrawerOpen}
          onClose={() => setIsHistoryDrawerOpen(false)}
          records={savedRecords}
          onDeleteRecord={handleDeleteRecord}
          onSelectRecord={handleSelectHistoryRecord}
        />
      </main>
    </div>
  );
}
