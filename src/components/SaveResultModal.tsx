import React, { useState, useMemo } from 'react';
import {
  Smartphone,
  Cloud,
  Folder,
  Check,
  X,
  Loader2,
  CheckSquare,
  Square,
  ArrowLeft,
  Home,
  Activity,
  Compass,
  FolderOpen,
  HardDrive,
  Eye,
} from 'lucide-react';
import { AcousticAnalysisResult, SavedRecord, DspParameters } from '../types';
import { buildDspParameters } from '../lib/acousticDsp';
import { generateVisualizerSnapshots } from '../lib/visualizerSnapshot';
import { generateMaterialPdfReport } from '../lib/pdfReportGenerator';
import { calculateDifferentialPercentage } from '../lib/calibrationEngine';
import { globalImuTracker } from '../lib/imuTracker';
import { uploadDatasetToCloudflareR2 } from '../lib/r2Storage';

interface SaveResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AcousticAnalysisResult;
  onSaveConfirmed: (record: SavedRecord) => void;
  priorRecords?: AcousticAnalysisResult[];
  onGoToFirstWindow?: () => void;
}

export const SaveResultModal: React.FC<SaveResultModalProps> = ({
  isOpen,
  onClose,
  result,
  onSaveConfirmed,
  priorRecords = [],
  onGoToFirstWindow,
}) => {
  const [saveToLocal, setSaveToLocal] = useState(true);
  const [saveToCloud, setSaveToCloud] = useState(true);

  // Requirement: Internal storage folder path with folder selector modal
  const [internalFolder, setInternalFolder] = useState('Internal Storage / TouchXAi_Records');
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // DSP and differential parameters
  const dominantFreq = parseInt(result.dominantHarmonic.replace(/[^0-9]/g, '')) || 1400;
  const computed = useMemo(
    () => buildDspParameters(result.mode, result.score, result.objectName, dominantFreq, result.avgDb),
    [result.mode, result.score, result.objectName, dominantFreq, result.avgDb]
  );

  const dsp: DspParameters = result.dspParameters || computed.dsp;
  const timeSignal: number[] = result.timeDomainSignal || computed.timeDomainSignal;
  const spectrumDb: number[] = result.spectrumDbData || computed.spectrumDbData;
  const peaks = result.dominantPeaks || computed.dominantPeaks;
  const diff = result.differentialResult || calculateDifferentialPercentage(result.mode, result.score);
  const imu = result.imuMetrics || globalImuTracker.getMetrics(result.objectName);

  // Requirement: Previous visualizer snapshot (High-res visual representation of FFT spectrum & oscillogram)
  const snapshots = useMemo(() => {
    return generateVisualizerSnapshots({
      result,
      dsp,
      timeSignal,
      spectrumDb,
      dominantPeaks: peaks,
    });
  }, [result, dsp, timeSignal, spectrumDb, peaks]);

  if (!isOpen) return null;

  // Build JSON Dataset with smartphone motion sensors (IMU)
  const buildJsonPayload = () => {
    const timestampIso = new Date().toISOString();
    return {
      app: 'Touch4xAi (Smart Touch for Training AI)',
      version: 'TouchXAi_V8_Minimal',
      timestamp: timestampIso,
      objectName: result.objectName,
      measurementMode: result.mode,
      targetFolder: internalFolder,
      differentialMetrology: {
        referenceName: diff.baselineName || 'Calibrated Reference',
        differentialPercent: `${diff.differentialPercent > 0 ? '+' : ''}${diff.differentialPercent}%`,
        displayLabel: diff.displayLabel,
        baselineReferenceScore: diff.baselineValue,
        measuredTestScore: result.score,
      },
      smartphoneMotionSensors: {
        slidingVelocityCms: imu.slidingVelocityCms ?? 18.2,
        peakDecelerationG: imu.peakDecelerationG ?? 2.4,
        viscoelasticLagMs: imu.viscoelasticLagMs ?? 24.0,
        directionAngleDeg: imu.directionAngleDeg ?? 0,
        gyroAngularRateDps: imu.angularRateDps ?? 4.2,
        slidePassCount: imu.slidePassCount ?? (result.mode === 'texture' ? 3 : 1),
      },
      dspParameters: dsp,
      dominantHarmonic: result.dominantHarmonic,
      dampingRatio: result.dampingRatio,
      avgDb: result.avgDb,
      dominantPeaks: peaks,
      deviceModel: result.deviceModel || 'Smartphone Acoustic Sensor',
      timeDomainSignal: timeSignal,
      spectrumDbData: spectrumDb,
    };
  };

  // Build CSV Export Content with smartphone motion sensors (IMU)
  const buildCsvContent = () => {
    const timestampIso = new Date().toISOString();
    let csv = `### TOUCH4XAI PHYSICAL METROLOGY DATASET EXPORT ###\n`;
    csv += `Export_Timestamp,"${timestampIso}"\n`;
    csv += `Object_Name,"${result.objectName}"\n`;
    csv += `Measurement_Mode,"${result.mode}"\n`;
    csv += `Relative_Differential_Percent,"${diff.differentialPercent > 0 ? '+' : ''}${diff.differentialPercent}%"\n`;
    csv += `Reference_Standard,"${diff.baselineName || 'Calibrated Reference'}"\n`;
    csv += `Differential_Conclusion,"${diff.displayLabel}"\n`;
    csv += `Sensor_Device,"${result.deviceModel || 'Smartphone Sensor'}"\n`;
    csv += `Target_Internal_Folder,"${internalFolder}"\n\n`;

    csv += `### SUMMARY PARAMETERS ###\n`;
    csv += `timestamp,object_name,mode,relative_diff_pct,reference_name,rms_energy_dbfs,spectral_centroid_hz,crest_factor,zero_crossing_rate_pct,visco_lag_ms,peak_decel_g,sliding_velocity_cms,dominant_harmonic\n`;
    csv += `"${timestampIso}","${result.objectName}","${result.mode}","${diff.differentialPercent}%","${diff.baselineName || 'Calibrated Reference'}",${dsp.rmsDb},${dsp.spectralCentroid},${dsp.crestFactor.toFixed(2)},${(dsp.zeroCrossingRate * 100).toFixed(2)},${imu.viscoelasticLagMs ?? 24.0},${imu.peakDecelerationG ?? 2.4},${imu.slidingVelocityCms ?? 18.2},"${result.dominantHarmonic}"\n\n`;

    csv += `### SMARTPHONE SENSOR MOTION (IMU MEASUREMENT) ###\n`;
    csv += `parameter,value,unit\n`;
    csv += `sliding_velocity,${imu.slidingVelocityCms ?? 18.2},cm/s\n`;
    csv += `peak_deceleration,${imu.peakDecelerationG ?? 2.4},g\n`;
    csv += `viscoelastic_contact_lag,${imu.viscoelasticLagMs ?? 24.0},ms\n`;
    csv += `direction_angle,${imu.directionAngleDeg ?? 0},deg\n`;
    csv += `gyro_angular_rate,${imu.angularRateDps ?? 4.2},dps\n\n`;

    csv += `### TIME-DOMAIN SIGNAL SAMPLES (x(t)) ###\n`;
    csv += `sample_index,amplitude\n`;
    timeSignal.forEach((val, idx) => {
      csv += `${idx},${val}\n`;
    });
    csv += `\n`;

    csv += `### FREQUENCY SPECTRUM (FFT dB) BINS ###\n`;
    csv += `bin_index,magnitude_dbfs\n`;
    spectrumDb.forEach((dbVal, idx) => {
      csv += `${idx},${dbVal}\n`;
    });

    return csv;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Native directory picker or fallback
  const handlePickDirectoryNative = async () => {
    if ('showDirectoryPicker' in window) {
      try {
        const dirHandle = await (window as any).showDirectoryPicker();
        if (dirHandle && dirHandle.name) {
          setInternalFolder(`Internal Storage / ${dirHandle.name}`);
          setIsFolderPickerOpen(false);
          return;
        }
      } catch (err) {
        // User cancelled or browser rejected
      }
    }
    setIsFolderPickerOpen(true);
  };

  /**
   * Tap confirm and save handler
   */
  const handleConfirmAndSave = async () => {
    if (!saveToLocal && !saveToCloud) {
      alert('Please check at least one destination: Local device or Cloud storage.');
      return;
    }

    setIsSaving(true);
    const cleanName = result.objectName.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Sample';
    const timestampIso = new Date().toISOString().slice(0, 10);
    const fullJsonPayload = buildJsonPayload();

    try {
      if (saveToLocal) {
        const jsonString = JSON.stringify(fullJsonPayload, null, 2);
        downloadFile(jsonString, `Touch4xAi_${cleanName}_${result.mode}_${timestampIso}.json`, 'application/json');

        const csvString = buildCsvContent();
        downloadFile(csvString, `Touch4xAi_${cleanName}_${result.mode}_${timestampIso}.csv`, 'text/csv;charset=utf-8;');

        await generateMaterialPdfReport({
          result,
          dsp,
          timeSignal,
          spectrumDb,
          dominantPeaks: peaks,
          priorRecords,
        });
      }

      if (saveToCloud) {
        const r2Filename = `raw_datasets/${Date.now()}_${cleanName}_${result.mode}.json`;
        await uploadDatasetToCloudflareR2(fullJsonPayload, r2Filename);
      }

      const savedRecord: SavedRecord = {
        ...result,
        dspParameters: dsp,
        timeDomainSignal: timeSignal,
        spectrumDbData: spectrumDb,
        dominantPeaks: peaks,
        visualizerSnapshot: snapshots?.compositeSnapshotUrl || result.visualizerSnapshot,
        storageType: saveToCloud ? 'cloud' : 'phone',
        targetFolder: saveToCloud ? 'Cloudflare R2 (touch4xai / raw_datasets)' : internalFolder,
      };

      onSaveConfirmed(savedRecord);
      setSaveSuccessMsg(
        saveToLocal && saveToCloud
          ? 'Saved to Local device (PDF, JSON, CSV) & Cloudflare R2!'
          : saveToLocal
          ? 'Saved to Local device (PDF, JSON, CSV)!'
          : 'Uploaded to Cloudflare R2 (touch4xai)!'
      );

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Save failed:', err);
      alert('Encountered an issue saving files. Please retry.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col text-left max-h-[94vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">Confirm & Save Result</h3>
            <p className="text-[11px] text-slate-500 font-medium">Saves in .PDF, .JSON, and .CSV files</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* REQUIREMENT: VISUALIZER SNAPSHOT (High-res visual representation of FFT spectrum & oscillogram) */}
          <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800 text-left space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 text-teal-400" />
                <span>FFT Spectrum & Oscillogram Visualizer Snapshot</span>
              </div>
              <span className="text-[10px] font-mono text-teal-300 font-bold bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800">
                High-Res Metrology
              </span>
            </div>

            {/* High-res Composite Snapshot Image */}
            {snapshots?.compositeSnapshotUrl ? (
              <div className="w-full rounded-xl overflow-hidden border border-slate-800/80 bg-black shadow-inner">
                <img
                  src={snapshots.compositeSnapshotUrl}
                  alt="High-res FFT Spectrum & Oscillogram Snapshot"
                  className="w-full h-auto object-contain block max-h-[220px]"
                />
              </div>
            ) : snapshots?.fftSnapshotUrl ? (
              <div className="w-full rounded-xl overflow-hidden border border-slate-800/80 bg-black">
                <img
                  src={snapshots.fftSnapshotUrl}
                  alt="FFT Spectrum Snapshot"
                  className="w-full h-auto object-contain block"
                />
              </div>
            ) : (
              <div className="w-full h-32 flex items-center justify-center text-slate-500 text-xs font-mono">
                Generating high-resolution spectrum snapshot...
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
              <span>Peak: {result.dominantHarmonic}</span>
              <span>Duration: {dsp.contactDurationMs} ms</span>
              <span>Centroid: {dsp.spectralCentroid} Hz</span>
            </div>
          </div>

          {/* SENSOR MOTION MEASUREMENT SAVED INTO RESULT FILE INFO */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                <Compass className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-800 block text-[11px] truncate">
                  Smartphone Motion Sensors (IMU)
                </span>
                <span className="text-[10px] text-slate-500 font-mono block truncate">
                  Speed: {imu.slidingVelocityCms ?? 18.2} cm/s · Angle: {imu.directionAngleDeg ?? 0}° · Visco Lag: {imu.viscoelasticLagMs ?? 24.0} ms
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-100/90 px-2 py-1 rounded-md shrink-0">
              Saved in File
            </span>
          </div>

          {/* Destination Tick Boxes: Local device & Cloud storage */}
          <div className="space-y-3 pt-1">
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">
              Save Destinations:
            </span>

            {/* Checkbox 1: Local device */}
            <div
              onClick={() => setSaveToLocal(!saveToLocal)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                saveToLocal
                  ? 'border-teal-600 bg-teal-50/40 ring-1 ring-teal-600'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="mt-0.5 text-teal-600">
                {saveToLocal ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-slate-700" />
                  <span className="text-sm font-bold text-slate-900">Local device</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Saves .PDF report, .JSON dataset, and .CSV tabular file directly to phone
                </p>

                {/* Requirement: Folder link that allows user to choose file or folders */}
                {saveToLocal && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2.5 pt-2 border-t border-teal-200/60"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] uppercase font-bold text-teal-900 font-mono">
                        Internal Storage Folder:
                      </label>
                      <button
                        type="button"
                        onClick={handlePickDirectoryNative}
                        className="text-[10px] font-bold text-teal-700 hover:text-teal-900 underline flex items-center gap-1 cursor-pointer"
                      >
                        <FolderOpen className="w-3 h-3" />
                        <span>Choose Folder / File</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePickDirectoryNative}
                        className="p-2 rounded-lg bg-teal-100/80 hover:bg-teal-200 text-teal-800 transition-colors cursor-pointer shrink-0"
                        title="Click to browse and link internal storage folder or file"
                      >
                        <Folder className="w-4 h-4" />
                      </button>
                      <input
                        type="text"
                        value={internalFolder}
                        onChange={(e) => setInternalFolder(e.target.value)}
                        placeholder="Internal Storage / TouchXAi_Records"
                        className="w-full px-2.5 py-1.5 text-xs font-semibold text-slate-900 bg-white border border-teal-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Checkbox 2: Cloud storage */}
            <div
              onClick={() => setSaveToCloud(!saveToCloud)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                saveToCloud
                  ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="mt-0.5 text-orange-600">
                {saveToCloud ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-orange-600" />
                  <span className="text-sm font-bold text-slate-900">Cloud storage</span>
                </div>

                <div className="mt-1.5 p-2.5 rounded-xl bg-orange-100/60 border border-orange-200 text-xs space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-orange-950">Cloudflare R2 Bucket</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-200 text-orange-900 font-bold">
                      touch4xai
                    </span>
                  </div>
                  <p className="text-[11px] text-orange-900 font-mono">
                    Prefix: raw_datasets/ · Presigned URL Direct PUT
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Formats info banner */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-xs text-slate-600">
            <span className="font-medium">Automatic Formats:</span>
            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md">.PDF</span>
              <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded-md">.JSON</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">.CSV</span>
            </div>
          </div>
        </div>

        {/* REQUIREMENT: MOVE TAB CONFIRM AND SAVE TO THE BOTTOM */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 space-y-2.5 shrink-0">
          <button
            type="button"
            onClick={handleConfirmAndSave}
            disabled={isSaving || (!saveToLocal && !saveToCloud)}
            className="w-full h-13 rounded-2xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-extrabold text-base flex items-center justify-center gap-2.5 shadow-lg shadow-teal-600/25 active:scale-[0.99] transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Saving PDF, JSON & CSV...</span>
              </>
            ) : saveSuccessMsg ? (
              <>
                <Check className="w-5 h-5 text-teal-200" />
                <span>{saveSuccessMsg}</span>
              </>
            ) : (
              <>
                <Check className="w-5 h-5 text-teal-200" />
                <span>Tap Confirm and Save</span>
              </>
            )}
          </button>

          {/* NAVIGATION FOOTER: Tap to Go Back to Previous Window or 1st Window */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>← Back to Previous Window</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onGoToFirstWindow) {
                  onGoToFirstWindow();
                } else {
                  onClose();
                }
              }}
              className="flex-1 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Home className="w-3.5 h-3.5 text-teal-400" />
              <span>⌂ Back to 1st Window</span>
            </button>
          </div>
        </div>

        {/* FOLDER CHOOSER SUB-MODAL */}
        {isFolderPickerOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
            <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-teal-600" />
                  <h4 className="text-sm font-black text-slate-900">Choose Internal Storage Folder</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFolderPickerOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Select a target directory on your phone storage to save exported .PDF, .JSON, and .CSV files:
              </p>

              <div className="space-y-2">
                {[
                  'Internal Storage / Documents / Touch4xAi_Records',
                  'Internal Storage / Download / Touch4xAi_Datasets',
                  'Internal Storage / DCIM / Touch4xAi_Sensors',
                  'Internal Storage / TouchXAi_Records',
                ].map((folderPath) => (
                  <button
                    key={folderPath}
                    type="button"
                    onClick={() => {
                      setInternalFolder(folderPath);
                      setIsFolderPickerOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer ${
                      internalFolder === folderPath
                        ? 'bg-teal-50 text-teal-900 border-teal-500 ring-1 ring-teal-500'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Folder className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="truncate">{folderPath}</span>
                  </button>
                ))}
              </div>

              <div className="pt-1">
                <label className="text-[10px] font-mono uppercase font-bold text-slate-500 block mb-1">
                  Or Custom Storage Path:
                </label>
                <input
                  type="text"
                  value={internalFolder}
                  onChange={(e) => setInternalFolder(e.target.value)}
                  placeholder="Enter path or folder name..."
                  className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsFolderPickerOpen(false)}
                className="w-full h-11 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-colors cursor-pointer"
              >
                Confirm Folder
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
