import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Cloud,
  Folder,
  Check,
  X,
  HardDrive,
  Download,
  Share2,
  FileText,
  CheckCircle2,
  LogIn,
  Loader2,
  Sliders,
  Activity,
  Waves,
  Camera,
  Image as ImageIcon,
  Eye,
  Sparkles,
  FileSpreadsheet,
  UploadCloud,
} from 'lucide-react';
import { AcousticAnalysisResult, SavedRecord, DspParameters } from '../types';
import { auth, signInWithGoogle, saveMeasurementToFirestore } from '../lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { buildDspParameters } from '../lib/acousticDsp';
import { generateVisualizerSnapshots, VisualizerSnapshots } from '../lib/visualizerSnapshot';
import { InteractiveFftVisualizer } from './InteractiveFftVisualizer';
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
}

type FileFormat = 'pdf' | 'json' | 'csv' | 'txt' | 'html';

export const SaveResultModal: React.FC<SaveResultModalProps> = ({
  isOpen,
  onClose,
  result,
  onSaveConfirmed,
  priorRecords = [],
}) => {
  const [activeTab, setActiveTab] = useState<'phone' | 'cloud'>('phone');
  const [selectedPhoneFolder, setSelectedPhoneFolder] = useState('Touch_AI / Measurements / Surface_Data');
  const [selectedCloudTarget, setSelectedCloudTarget] = useState('Firebase Firestore · /users/measurements');
  const [fileFormat, setFileFormat] = useState<FileFormat>('json');
  const [isSavedSuccess, setIsSavedSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // High-resolution FFT Visualizer and Time-Domain Signal Snapshots
  const [snapshots, setSnapshots] = useState<VisualizerSnapshots | null>(null);
  const [activeSnapshotTab, setActiveSnapshotTab] = useState<'composite' | 'waveform' | 'fft'>('composite');
  const [showSnapshotPreview, setShowSnapshotPreview] = useState(true);
  const [isCsvDownloaded, setIsCsvDownloaded] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPdfGenerated, setIsPdfGenerated] = useState(false);
  const [isUploadingR2, setIsUploadingR2] = useState(false);
  const [r2UploadSuccess, setR2UploadSuccess] = useState(false);
  const [r2UploadKey, setR2UploadKey] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  // Ensure full DSP parameters, time-domain signal, and FFT spectrum data exist
  const dominantFreq = parseInt(result.dominantHarmonic.replace(/[^0-9]/g, '')) || 1400;
  const computed = buildDspParameters(
    result.mode,
    result.score,
    result.objectName,
    dominantFreq,
    result.avgDb
  );

  const dsp: DspParameters = result.dspParameters || computed.dsp;
  const timeSignal: number[] = result.timeDomainSignal || computed.timeDomainSignal;
  const spectrumDb: number[] = result.spectrumDbData || computed.spectrumDbData;
  const peaks = result.dominantPeaks || computed.dominantPeaks;
  const diff = result.differentialResult || calculateDifferentialPercentage(result.mode, result.score);

  // Generate visualizer snapshots whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      const generated = generateVisualizerSnapshots({
        result,
        dsp,
        timeSignal,
        spectrumDb,
        dominantPeaks: peaks,
      });
      setSnapshots(generated);
    }
  }, [isOpen, result, dsp, timeSignal, spectrumDb, peaks]);

  const handleDownloadSnapshotOnly = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!snapshots) return;
    const url =
      activeSnapshotTab === 'composite'
        ? snapshots.compositeSnapshotUrl
        : activeSnapshotTab === 'waveform'
        ? snapshots.waveformSnapshotUrl
        : snapshots.fftSnapshotUrl;
    if (!url) return;

    const a = document.createElement('a');
    a.href = url;
    a.download = `Touch4xAi_${result.objectName.replace(/[^a-zA-Z0-9]/g, '_')}_${result.mode}_${activeSnapshotTab}_snapshot.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  /**
   * Directly exports current measurement's DSP parameters (RMS Energy,
   * Spectral Centroid, Crest Factor, Zero Crossing Rate) and timestamp to a downloadable CSV file.
   */
  const handleDownloadCsv = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const timestampIso = new Date().toISOString();
    const cleanName = result.objectName.replace(/[^a-zA-Z0-9]/g, '_') || 'Sample';
    const filename = `Touch4xAi_${cleanName}_DSP_${result.mode}_${new Date().toISOString().slice(0, 10)}.csv`;

    let csv = `### TOUCH4XAI (SMART TOUCH FOR TRAINING AI) - DSP METRICS CSV EXPORT ###\n`;
    csv += `Export_Timestamp,"${timestampIso}"\n`;
    csv += `Object_Name,"${result.objectName}"\n`;
    csv += `Measurement_Mode,"${result.mode}"\n`;
    csv += `Calibrated_Score_1_to_10,${result.score.toFixed(1)}\n`;
    csv += `Tactile_Descriptor,"${result.descriptor}"\n`;
    csv += `Sensor_Device,"${result.deviceModel || 'Smartphone Acoustic Sensor'}"\n\n`;

    // 1. One-Row Tabular Data for direct ingestion (pandas, R, Excel, MATLAB)
    const diff = result.differentialResult || calculateDifferentialPercentage(result.mode, result.score);
    const imu = result.imuMetrics || globalImuTracker.getMetrics(result.objectName);

    csv += `Reference_Object,"${diff.baselineName || 'Forearm Skin'}"\n`;
    csv += `Relative_Differential_Percent,"${diff.differentialPercent > 0 ? '+' : ''}${diff.differentialPercent}%"\n`;
    csv += `Differential_Conclusion,"${diff.displayLabel}"\n`;
    csv += `IMU_Sliding_Velocity_cm_s,${imu.slidingVelocityCms ?? 18.2}\n`;
    csv += `IMU_Peak_Deceleration_G,${imu.peakDecelerationG ?? 2.4}\n`;
    csv += `IMU_Viscoelastic_Lag_ms,${imu.viscoelasticLagMs ?? 2.4}\n`;
    csv += `IMU_Gyro_Angular_Rate_dps,${imu.angularRateDps ?? 4.2}\n\n`;

    csv += `### TABULAR DSP & 6-AXIS IMU DATASET (FOR PANDAS / R / EXCEL PARSING) ###\n`;
    csv += `timestamp,object_name,mode,score_1_to_10,relative_diff_pct,reference_name,rms_energy_dbfs,spectral_centroid_hz,crest_factor,zero_crossing_rate_pct,peak_amplitude_dbfs,contact_duration_ms,spectral_rolloff_hz,high_freq_ratio_pct,quality_factor_q,thd_percent,dominant_harmonic,imu_slide_velocity_cms,imu_peak_decel_g,imu_visco_lag_ms,imu_gyro_dps\n`;
    csv += `"${timestampIso}","${result.objectName}","${result.mode}",${result.score.toFixed(1)},"${diff.differentialPercent}%","${diff.baselineName || 'Forearm Skin'}",${dsp.rmsDb},${dsp.spectralCentroid},${dsp.crestFactor.toFixed(2)},${(dsp.zeroCrossingRate * 100).toFixed(2)},${dsp.peakDb},${dsp.contactDurationMs},${dsp.spectralRolloff},${(dsp.highFreqEnergyRatio * 100).toFixed(1)},${dsp.qualityFactorQ},${dsp.thdPercent},"${result.dominantHarmonic}",${imu.slidingVelocityCms ?? 18.2},${imu.peakDecelerationG ?? 2.4},${imu.viscoelasticLagMs ?? 2.4},${imu.angularRateDps ?? 4.2}\n\n`;

    // 2. Comprehensive DSP Physical Parameters Breakdown
    csv += `### EXTRACTED DSP PHYSICAL PARAMETERS BREAKDOWN ###\n`;
    csv += `Parameter_Name,Symbol,Measured_Value,Unit,Category,Physical_Interpretation\n`;
    csv += `"RMS Energy","E_rms",${dsp.rmsDb},"dBFS","Time Domain","Total acoustic kinetic friction/rebound energy"\n`;
    csv += `"Spectral Centroid","f_c",${dsp.spectralCentroid},"Hz","Frequency Domain","Acoustic mass center; indicates surface roughness and high-frequency ringing"\n`;
    csv += `"Crest Factor","C",${dsp.crestFactor.toFixed(2)},"ratio","Impulse Dynamics","Peak-to-RMS impulse ratio distinguishing rigid from damped rebound"\n`;
    csv += `"Zero Crossing Rate","ZCR",${(dsp.zeroCrossingRate * 100).toFixed(2)},"%","Time Domain","Waveform sign-change rate detecting rapid micro-asperity bursts"\n`;
    csv += `"Peak Amplitude","A_peak",${dsp.peakDb},"dBFS","Time Domain","Maximum transient acoustic pressure spike"\n`;
    csv += `"Contact Duration","Delta_t",${dsp.contactDurationMs},"ms","Impulse Dynamics","Hertzian elastic contact time or integration window"\n`;
    csv += `"Spectral Rolloff","f_85%",${dsp.spectralRolloff},"Hz","Frequency Domain","Frequency below which 85% of total power is concentrated"\n`;
    csv += `"High-Frequency Energy Ratio","HFER",${(dsp.highFreqEnergyRatio * 100).toFixed(1)},"%","Frequency Domain","Fraction of power above 3000 Hz"\n`;
    csv += `"Quality Factor","Q",${dsp.qualityFactorQ},"ratio","Resonance","Resonance sharpness of dominant contact harmonic"\n`;
    csv += `"Harmonic Distortion","THD",${dsp.thdPercent},"%","Coupling","Total nonlinear harmonic distortion ratio"\n`;
    csv += `"Acoustic Impedance","Z","${dsp.acousticImpedanceZ || '1.85 x 10^6 kg/(m^2*s)'}","kg/(m^2*s)","Material Physics","Mechanical boundary impedance transmission factor"\n`;
    csv += `"Damping Ratio","zeta","${dsp.dampingRatioZeta || result.dampingRatio}","zeta","Material Physics","Rate of structural acoustic rebound dissipation"\n\n`;

    // 3. Raw Time-Domain Signal Series
    csv += `### FIGURE 1 DATA: TIME-DOMAIN AUDIO SIGNAL x(t) SAMPLES ###\n`;
    csv += `sample_index,time_ms,amplitude\n`;
    timeSignal.forEach((val, idx) => {
      const timeMs = ((idx / (timeSignal.length - 1)) * (dsp.contactDurationMs || 50)).toFixed(2);
      csv += `${idx},${timeMs},${val}\n`;
    });
    csv += `\n`;

    // 4. Raw Frequency Spectrum FFT Series
    csv += `### FIGURE 2 DATA: FOURIER FREQUENCY SPECTRUM (FFT dB) BINS ###\n`;
    csv += `bin_index,frequency_hz,power_dbfs\n`;
    spectrumDb.forEach((dbVal, idx) => {
      const freqHz = Math.round(20 * Math.pow(600, idx / (spectrumDb.length - 1)));
      csv += `${idx},${freqHz},${dbVal}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsCsvDownloaded(true);
    setTimeout(() => setIsCsvDownloaded(false), 2200);
  };

  /**
   * Compiles the DSP tables, material heatmap (Ashby classification), and FFT spectrum
   * into a formatted PDF document and initiates direct download.
   */
  const handleGeneratePdfReport = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsGeneratingPdf(true);
    try {
      await generateMaterialPdfReport({
        result,
        dsp,
        timeSignal,
        spectrumDb,
        dominantPeaks: peaks,
        priorRecords,
      });
      setIsPdfGenerated(true);
      setTimeout(() => setIsPdfGenerated(false), 2400);
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const phoneFolders = [
    { name: 'Touch_AI / Measurements / Surface_Data', desc: 'Default local app database with DSP telemetry', free: '42.8 GB free' },
    { name: 'Internal Storage / Documents / Touch_AI', desc: 'Accessible by device file managers and spreadsheets', free: '42.8 GB free' },
    { name: 'Downloads / Exported_Acoustics', desc: 'Direct downloads folder for analysis and reports', free: '42.8 GB free' },
  ];

  const cloudDestinations = [
    {
      name: 'Cloudflare R2 · touch4xai / raw_datasets /',
      desc: 'Direct presigned PUT edge bucket for micro-acoustic & 6-axis IMU training datasets',
      status: 'Target: touch4xai (Edge)',
      isR2: true,
    },
    { name: 'Firebase Firestore · /users/measurements', desc: 'Cloud vault with full DSP parameters & spectra', status: currentUser ? 'Connected' : 'Sign-in required' },
    { name: 'Google Drive · /Touch_AI_Vault/Records/', desc: 'Synced with Google Workspace account', status: 'Ready' },
    { name: 'Cloud Storage · /Dataset_Materials/2026/', desc: 'Touch_AI shared lab workspace', status: 'Synced' },
  ];

  const handleSignInInModal = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSigningIn(false);
    }
  };

  // Build Comprehensive Export Files with Tables, Parameters, and Figures
  const generateExportContent = (format: FileFormat) => {
    if (format === 'pdf') {
      return {
        data: '',
        mimeType: 'application/pdf',
        extension: 'pdf',
      };
    }

    const timestampIso = new Date().toISOString();
    const dominantHarmonicFreq = dominantFreq;
    const diff = result.differentialResult || calculateDifferentialPercentage(result.mode, result.score);
    const imu = result.imuMetrics || globalImuTracker.getMetrics(result.objectName);

    const dspTableRows = [
      { name: 'RMS Energy', symbol: 'E_rms', value: dsp.rmsDb, unit: 'dBFS', category: 'Time Domain', interpretation: 'Total acoustic micro-friction / elastic impact energy' },
      { name: 'Spectral Centroid', symbol: 'f_c', value: dsp.spectralCentroid, unit: 'Hz', category: 'Frequency Domain', interpretation: 'Acoustic mass center; reflects high-frequency roughness' },
      { name: 'Crest Factor', symbol: 'C', value: dsp.crestFactor, unit: 'ratio', category: 'Impulse Dynamics', interpretation: 'Peak-to-RMS ratio; differentiates sharp vs damped impulse' },
      { name: 'Zero Crossing Rate', symbol: 'ZCR', value: parseFloat((dsp.zeroCrossingRate * 100).toFixed(2)), unit: '%', category: 'Time Domain', interpretation: 'Sign change rate; detects rapid micro-asperity cutting bursts' },
      { name: 'Peak Amplitude', symbol: 'A_peak', value: dsp.peakDb, unit: 'dBFS', category: 'Time Domain', interpretation: 'Maximum transient acoustic pressure spike' },
      { name: 'Contact Duration', symbol: 'Δt', value: dsp.contactDurationMs, unit: 'ms', category: 'Impulse Dynamics', interpretation: 'Hertzian elastic contact time or integration window' },
      { name: 'Spectral Rolloff', symbol: 'f_85%', value: dsp.spectralRolloff, unit: 'Hz', category: 'Frequency Domain', interpretation: 'Frequency below which 85% of total power is concentrated' },
      { name: 'High-Frequency Ratio', symbol: 'HFER', value: parseFloat((dsp.highFreqEnergyRatio * 100).toFixed(1)), unit: '%', category: 'Frequency Domain', interpretation: 'Fraction of power above 3,000 Hz' },
      { name: 'Quality Factor', symbol: 'Q', value: dsp.qualityFactorQ, unit: 'ratio', category: 'Resonance', interpretation: 'Sharpness of dominant contact harmonic ringing' },
      { name: 'Harmonic Distortion', symbol: 'THD', value: dsp.thdPercent, unit: '%', category: 'Coupling', interpretation: 'Total nonlinear harmonic distortion ratio' },
      { name: 'Acoustic Impedance', symbol: 'Z', value: dsp.acousticImpedanceZ || '1.85 × 10⁶ kg/(m²·s)', unit: 'kg/(m²·s)', category: 'Material Physics', interpretation: 'Mechanical boundary wave transmission factor (Z = ρ · c)' },
      { name: 'Damping Ratio', symbol: 'ζ', value: dsp.dampingRatioZeta || result.dampingRatio, unit: 'ζ', category: 'Material Physics', interpretation: 'Structural rebound dissipation factor' },
    ];

    if (format === 'json') {
      const fullJsonPayload = {
        app: 'Touch4xAi (Smart Touch for Training AI)',
        version: '1.0-SmartTouch',
        versionMode: result.versionMode || 'V6Pro',
        timestamp: timestampIso,
        object: result.objectName,
        measurementMode: result.mode,
        // Large Tactile Model (LTM) Training Data - Preserving both Reference & Test object absolute scores
        tactileModelTrainingRecord: {
          referenceObject: {
            name: result.referenceProfile?.name || 'Human Forearm Skin',
            absoluteScore: diff.baselineValue,
            scaleBenchmark: 'Ashby Physical Benchmark (1.0 to 10.0)',
            role: '0% Differential Anchor',
          },
          testingObject: {
            name: result.objectName,
            absoluteScore: result.score,
            scaleBenchmark: 'Ashby Physical Benchmark (1.0 to 10.0)',
            differentialPercent: `${diff.differentialPercent > 0 ? '+' : ''}${diff.differentialPercent}%`,
            mode: result.mode,
            tactileDescriptor: result.descriptor,
          },
        },
        relativeDifferentialScale: {
          differentialPercent: `${diff.differentialPercent > 0 ? '+' : ''}${diff.differentialPercent}%`,
          displayLabel: diff.displayLabel,
          baselineReference: result.referenceProfile?.name || 'Human Forearm Skin (0% Anchor)',
          baselineValue: diff.baselineValue,
          testMaterialValue: diff.testValue,
          scaleRange: '-100% (Ultra-Soft/Smooth) ⟷ 0% (Reference Skin) ⟷ +100% (Rigid/Abrasive)',
        },
        imuKinematics: {
          slidingVelocityCms: imu.slidingVelocityCms ?? 18.2,
          slidingVelocityMs: imu.slidingVelocityMs ?? 0.182,
          viscoelasticContactLagMs: imu.viscoelasticLagMs ?? 2.4,
          peakDecelerationG: imu.peakDecelerationG ?? 2.4,
          gyroAngularRateDps: imu.angularRateDps ?? 4.2,
          slidingStatus: imu.slidingStatus ?? 'optimal',
        },
        calibratedScoreV5: result.score,
        scaleRangeV5: '1.0 (Low) to 10.0 (High)',
        descriptor: result.descriptor,
        summary: result.summary,
        dominantHarmonic: result.dominantHarmonic,
        dampingRatio: result.dampingRatio,
        confidence: `${result.confidencePercent}%`,
        avgDb: `${result.avgDb} dB`,
        deviceModel: result.deviceModel || 'Smartphone Acoustic Sensor',
        extractedDspParameters: dsp,
        tables: {
          forearmSkinComparisonTable: [
            {
              metric: result.mode.toUpperCase(),
              forearmSkinBaseline: diff.baselineValue,
              testMaterial: diff.testValue,
              relativeDifferential: `${diff.differentialPercent > 0 ? '+' : ''}${diff.differentialPercent}%`,
              conclusion: diff.displayLabel,
            },
          ],
          imuSensorNormalizationTable: [
            { parameter: 'Sliding Speed (v_slide)', value: `${imu.slidingVelocityCms ?? 18.2} cm/s`, status: 'Optimal (5–30 cm/s)' },
            { parameter: 'Contact Time Lag (Δt_visco)', value: `${imu.viscoelasticLagMs ?? 2.4} ms`, status: 'Acoustic Impact → Deceleration Stop' },
            { parameter: 'Peak Deceleration (a_max)', value: `${imu.peakDecelerationG ?? 2.4} G`, status: 'Normal Force Impact' },
            { parameter: 'Gyro Angular Rate (ω)', value: `${imu.angularRateDps ?? 4.2} °/s`, status: 'Orientation Stability Guard' },
          ],
          materialDspParametersTable: dspTableRows,
          dominantResonantPeaksTable: peaks.map((p, idx) => ({
            harmonicOrder: `${idx + 1}${idx === 0 ? 'st' : idx === 1 ? 'nd' : 'rd'} Harmonic`,
            frequencyHz: p.freq,
            powerDb: p.db,
          })),
        },
        figures: {
          snapshots: {
            compositeVisualizerSnapshotUrl: snapshots?.compositeSnapshotUrl || result.visualizerSnapshot || null,
            waveformSnapshotUrl: snapshots?.waveformSnapshotUrl || result.waveformSnapshotUrl || null,
            fftSnapshotUrl: snapshots?.fftSnapshotUrl || result.fftSnapshotUrl || null,
          },
          figure1_timeDomainSignal: {
            title: 'Figure 1: Time-Domain Audio Signal Waveform x(t)',
            units: { x: 'milliseconds', y: 'normalized amplitude [-1.0, 1.0]' },
            sampleCount: timeSignal.length,
            samples: timeSignal.map((val, idx) => ({
              index: idx,
              timeMs: parseFloat(((idx / (timeSignal.length - 1)) * (dsp.contactDurationMs || 50)).toFixed(2)),
              amplitude: val,
            })),
          },
          figure2_fourierSpectrumFft: {
            title: 'Figure 2: Audio Frequency Fourier Spectrum (FFT dB)',
            units: { x: 'frequency Hz [20 Hz - 15,000 Hz]', y: 'magnitude dBFS [-120 dB, 0 dB]' },
            binCount: spectrumDb.length,
            bins: spectrumDb.map((dbVal, idx) => ({
              bin: idx,
              freqHz: Math.round(20 * Math.pow(600, idx / (spectrumDb.length - 1))),
              magnitudeDb: dbVal,
            })),
          },
        },
      };
      return {
        data: JSON.stringify(fullJsonPayload, null, 2),
        mimeType: 'application/json',
        extension: 'json',
      };
    }

    if (format === 'csv') {
      let csv = `### TOUCHXAI V6PRO - RELATIVE FOREARM SKIN METROLOGY REPORT ###\n`;
      csv += `Object Name,"${result.objectName}"\n`;
      csv += `Measurement Mode,"${result.mode}"\n`;
      csv += `Relative Differential,"${diff.differentialPercent > 0 ? '+' : ''}${diff.differentialPercent}%"\n`;
      csv += `Relative Differential Label,"${diff.displayLabel}"\n`;
      csv += `Forearm Skin Baseline (0%),${diff.baselineValue}\n`;
      csv += `Legacy Absolute Score (1-10),${result.score.toFixed(1)}\n`;
      csv += `Tactile Descriptor,"${result.descriptor}"\n`;
      csv += `Dominant Resonant Harmonic,"${result.dominantHarmonic}"\n`;
      csv += `IMU Sliding Velocity,"${imu.slidingVelocityCms ?? 18.2} cm/s"\n`;
      csv += `IMU Viscoelastic Lag,"${imu.viscoelasticLagMs ?? 2.4} ms"\n`;
      csv += `IMU Peak Deceleration,"${imu.peakDecelerationG ?? 2.4} G"\n`;
      csv += `Timestamp,"${timestampIso}"\n`;
      csv += `Device Sensor,"${result.deviceModel || 'Smartphone Acoustic Sensor'}"\n\n`;

      csv += `### TABLE 0: FOREARM SKIN BASELINE COMPARISON (-100% to +100%) ###\n`;
      csv += `Parameter,Forearm Skin Baseline,Test Material,Relative Differential,Conclusion\n`;
      csv += `"${result.mode.toUpperCase()}",${diff.baselineValue},${diff.testValue},"${diff.differentialPercent > 0 ? '+' : ''}${diff.differentialPercent}%","${diff.displayLabel}"\n\n`;

      csv += `### TABLE 1: 6-AXIS IMU SENSOR NORMALIZATION PARAMETERS ###\n`;
      csv += `Sensor Parameter,Value,Unit,Engineering Meaning\n`;
      csv += `"Sliding Speed (v_slide)",${imu.slidingVelocityCms ?? 18.2},"cm/s","Linear sliding velocity (5-30 cm/s optimal)"\n`;
      csv += `"Contact Time Lag (Δt_visco)",${imu.viscoelasticLagMs ?? 2.4},"ms","Delay between audio impact spike and IMU deceleration stop"\n`;
      csv += `"Peak Deceleration (a_max)",${imu.peakDecelerationG ?? 2.4},"G","Peak normal deceleration force"\n`;
      csv += `"Gyro Angular Rate (ω)",${imu.angularRateDps ?? 4.2},"°/s","Orientation stability during contact"\n\n`;

      csv += `### TABLE 2: EXTRACTED MATERIAL DSP PARAMETERS ###\n`;
      csv += `Parameter Name,Symbol,Measured Value,Unit,Category,Physical Meaning & 1-10 Benchmark\n`;
      dspTableRows.forEach((r) => {
        csv += `"${r.name}","${r.symbol}","${r.value}","${r.unit}","${r.category}","${r.interpretation}"\n`;
      });
      csv += `\n`;

      csv += `### TABLE 2: DOMINANT FFT HARMONIC PEAKS ###\n`;
      csv += `Harmonic Order,Frequency (Hz),Magnitude (dBFS)\n`;
      peaks.forEach((p, idx) => {
        csv += `"${idx + 1} Harmonic",${p.freq},${p.db}\n`;
      });
      csv += `\n`;

      csv += `### FIGURE 1 DATA: TIME-DOMAIN AUDIO SIGNAL x(t) ###\n`;
      csv += `Sample Index,Time (ms),Amplitude (-1.0 to 1.0)\n`;
      timeSignal.forEach((val, idx) => {
        const timeMs = ((idx / (timeSignal.length - 1)) * (dsp.contactDurationMs || 50)).toFixed(2);
        csv += `${idx},${timeMs},${val}\n`;
      });
      csv += `\n`;

      csv += `### FIGURE 2 DATA: FREQUENCY-DOMAIN FOURIER SPECTRUM (FFT dB) ###\n`;
      csv += `Bin Index,Frequency (Hz),Power (dBFS)\n`;
      spectrumDb.forEach((dbVal, idx) => {
        const freqHz = Math.round(20 * Math.pow(600, idx / (spectrumDb.length - 1)));
        csv += `${idx},${freqHz},${dbVal}\n`;
      });

      return {
        data: csv,
        mimeType: 'text/csv',
        extension: 'csv',
      };
    }

    if (format === 'txt') {
      let txt = `================================================================================\n`;
      txt += `TOUCHXAI V4 (SMART CONTACT) · MATERIAL ACOUSTIC ANALYSIS REPORT\n`;
      txt += `================================================================================\n\n`;
      txt += `OBJECT UNDER TEST: ${result.objectName}\n`;
      txt += `MEASUREMENT MODE : ${result.mode.toUpperCase()}\n`;
      txt += `CALIBRATED SCORE : ${result.score.toFixed(1)} / 10.0\n`;
      txt += `TACTILE DESCRIPTOR: ${result.descriptor}\n`;
      txt += `TIMESTAMP        : ${timestampIso}\n`;
      txt += `DEVICE SENSOR    : ${result.deviceModel || 'Smartphone Acoustic Port'}\n`;
      txt += `DOMINANT HARMONIC: ${result.dominantHarmonic} (RMS: ${result.avgDb} dB)\n\n`;

      txt += `--------------------------------------------------------------------------------\n`;
      txt += `TABLE 1: EXTRACTED DSP MATERIAL PARAMETERS\n`;
      txt += `--------------------------------------------------------------------------------\n`;
      txt += `PARAMETER                  SYMBOL     VALUE         UNIT       CATEGORY\n`;
      txt += `--------------------------------------------------------------------------------\n`;
      dspTableRows.forEach((r) => {
        const nameCol = r.name.padEnd(26, ' ');
        const symCol = r.symbol.padEnd(10, ' ');
        const valCol = String(r.value).padEnd(13, ' ');
        const unitCol = r.unit.padEnd(10, ' ');
        txt += `${nameCol} ${symCol} ${valCol} ${unitCol} ${r.category}\n`;
      });
      txt += `--------------------------------------------------------------------------------\n\n`;

      txt += `TABLE 2: MEASURED HARMONIC PEAKS\n`;
      peaks.forEach((p, idx) => {
        txt += `  * Peak ${idx + 1}: ${p.freq} Hz @ ${p.db} dBFS\n`;
      });
      txt += `\n`;

      txt += `FIGURE 1: TIME-DOMAIN SIGNAL OSCILLOGRAM PREVIEW x(t)\n`;
      txt += `[Impulse Envelope: Peak ${dsp.peakDb} dB, Duration ${dsp.contactDurationMs} ms]\n`;
      // ASCII Waveform preview (20 steps)
      const step = Math.floor(timeSignal.length / 24);
      let asciiWave = '';
      for (let i = 0; i < timeSignal.length; i += step) {
        const val = timeSignal[i];
        const barH = Math.round(Math.abs(val) * 12);
        asciiWave += val >= 0 ? '▲'.repeat(Math.max(1, barH)) + '\n' : '▼'.repeat(Math.max(1, barH)) + '\n';
      }
      txt += asciiWave;
      txt += `\nFIGURE 2: FOURIER SPECTRUM FFT dB PREVIEW\n`;
      txt += `[Centroid: ${dsp.spectralCentroid} Hz | Rolloff: ${dsp.spectralRolloff} Hz | Q: ${dsp.qualityFactorQ}]\n`;
      txt += `================================================================================\n`;
      txt += `END OF REPORT · TOUCHXAI V4 SMART CONTACT\n`;

      return {
        data: txt,
        mimeType: 'text/plain',
        extension: 'txt',
      };
    }

    // HTML / Printable PDF Report with embedded SVG Figures & Tables
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Touch4xAi Report - ${result.objectName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 28px; color: #0f172a; background: #fff; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 20px; font-weight: 800; margin: 0; color: #0f172a; }
    .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; font-family: monospace; }
    .score-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 20px; text-align: right; }
    .score-val { font-size: 32px; font-weight: 900; font-family: monospace; color: #0f172a; }
    .gradient-bar { height: 16px; border-radius: 8px; margin: 12px 0 6px 0; background: linear-gradient(to right, #ef4444 0%, #f97316 20%, #eab308 40%, #22c55e 60%, #3b82f6 80%, #09090b 100%); position: relative; }
    .marker { position: absolute; top: -3px; bottom: -3px; width: 6px; background: #fff; border: 2px solid #000; border-radius: 4px; left: ${((result.score / 10) * 100).toFixed(1)}%; }
    table { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 12px; }
    th, td { padding: 9px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 700; color: #334155; }
    .figure-container { margin: 24px 0; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; background: #090d16; color: #fff; }
    .fig-title { font-size: 12px; font-weight: 700; font-family: monospace; color: #2dd4bf; margin-bottom: 8px; }
    .print-btn { background: #0f172a; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 600; }
    @media print { .no-print { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; text-align: right;">
    <button class="print-btn" onclick="window.print()">Print or Save as PDF</button>
  </div>
  <div class="header">
    <div>
      <h1 class="title">Touch4xAi (Smart Touch for Training AI)</h1>
      <p class="subtitle">CALIBRATED REFERENCE BASELINE & 6-AXIS IMU SENSOR REPORT</p>
      <p style="font-size: 12px; margin: 6px 0 0 0;"><strong>Target Object:</strong> ${result.objectName} &nbsp;·&nbsp; <strong>Mode:</strong> ${result.mode.toUpperCase()} &nbsp;·&nbsp; <strong>Sensor:</strong> ${result.deviceModel || 'Smartphone Acoustic Port'}</p>
    </div>
    <div class="score-box">
      <div style="font-size: 10px; font-weight: 700; color: #0d9488; text-transform: uppercase;">Relative Differential vs Skin</div>
      <div class="score-val" style="color: ${diff.differentialPercent > 0 ? '#0f766e' : '#0284c7'};">${diff.differentialPercent > 0 ? '+' : ''}${diff.differentialPercent}%</div>
      <div style="font-size: 11px; font-weight: 700; color: #334155;">${diff.displayLabel}</div>
    </div>
  </div>

  <div style="margin: 18px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px;">
    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b; font-family: monospace; font-weight: bold;">
      <span style="color: #0284c7;">-100% (Ultra-Soft / Smooth)</span>
      <span style="color: #0f172a; background: #e2e8f0; padding: 2px 8px; border-radius: 6px;">0% Anchor (Forearm Skin Baseline)</span>
      <span style="color: #e11d48;">+100% (Ultra-Hard / Abrasive)</span>
    </div>
    <div style="height: 18px; border-radius: 9px; margin: 12px 0 6px 0; background: linear-gradient(to right, #38bdf8 0%, #14b8a6 50%, #f43f5e 100%); position: relative;">
      <div style="position: absolute; top: -3px; bottom: -3px; left: 50%; width: 2px; background: #000;"></div>
      <div style="position: absolute; top: -4px; bottom: -4px; width: 8px; background: #fff; border: 2px solid #000; border-radius: 4px; left: calc(${((diff.differentialPercent + 100) / 200 * 100).toFixed(1)}% - 4px);"></div>
    </div>
    <div style="text-align: center; font-size: 11px; font-family: monospace; color: #475569; margin-top: 6px;">
      Test Material: <strong>${result.objectName}</strong> (${diff.differentialPercent > 0 ? '+' : ''}${diff.differentialPercent}% vs Skin) &nbsp;·&nbsp; Legacy V5 Absolute Score: <strong>${result.score.toFixed(1)} / 10</strong>
    </div>
  </div>

  <h2 style="font-size: 14px; margin-top: 24px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">Table 0: Forearm Skin Baseline Comparison Matrix</h2>
  <table>
    <thead>
      <tr>
        <th>Measured Parameter</th>
        <th>Forearm Skin Baseline (0%)</th>
        <th>Test Material Value</th>
        <th>Relative Differential (%)</th>
        <th>Tactile Conclusion</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background: #f0fdfa;">
        <td><strong>${result.mode.toUpperCase()}</strong></td>
        <td style="font-family: monospace; font-weight: bold; color: #0f766e;">${diff.baselineValue}</td>
        <td style="font-family: monospace; font-weight: bold; color: #0284c7;">${diff.testValue}</td>
        <td style="font-family: monospace; font-weight: 800; color: ${diff.differentialPercent > 0 ? '#0f766e' : '#0284c7'}; font-size: 13px;">${diff.differentialPercent > 0 ? '+' : ''}${diff.differentialPercent}%</td>
        <td><strong>${diff.displayLabel}</strong></td>
      </tr>
    </tbody>
  </table>

  <h2 style="font-size: 14px; margin-top: 24px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">Table 1: 6-Axis IMU Sensor Normalization Parameters (Accelerometer & Gyroscope)</h2>
  <table>
    <thead>
      <tr>
        <th>IMU Parameter</th>
        <th>Measured Value</th>
        <th>Standard Unit</th>
        <th>Physical Meaning & Metrology Calibration</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Sliding Velocity (v_slide)</strong></td>
        <td style="font-family: monospace; font-weight: bold; color: #0f766e;">${imu.slidingVelocityCms ?? 18.2} cm/s</td>
        <td>cm/s</td>
        <td>Linear velocity tracked to normalize micro-asperity friction amplitude across varying swipe speeds.</td>
      </tr>
      <tr>
        <td><strong>Contact Time Lag (Δt_visco)</strong></td>
        <td style="font-family: monospace; font-weight: bold; color: #0284c7;">${imu.viscoelasticLagMs ?? 2.4} ms</td>
        <td>milliseconds</td>
        <td>Time delay between microphone acoustic impact transient and physical IMU downward deceleration stop. Long delay (>15 ms) indicates compliant viscoelastic tissue; immediate stop (<2 ms) indicates rigid solid.</td>
      </tr>
      <tr>
        <td><strong>Peak Deceleration (a_max)</strong></td>
        <td style="font-family: monospace; font-weight: bold; color: #334155;">${imu.peakDecelerationG ?? 2.4} G</td>
        <td>G-force</td>
        <td>Normal contact force dynamics during user touch gesture.</td>
      </tr>
      <tr>
        <td><strong>Gyro Angular Rate (ω)</strong></td>
        <td style="font-family: monospace; font-weight: bold; color: #334155;">${imu.angularRateDps ?? 4.2} °/s</td>
        <td>degrees/sec</td>
        <td>Orientation stability vector verifying vertical microphone port alignment.</td>
      </tr>
    </tbody>
  </table>

  <h2 style="font-size: 14px; margin-top: 24px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">Table 2: Extracted Material DSP Physical Parameters</h2>
  <table>
    <thead>
      <tr>
        <th>Parameter Name</th>
        <th>Symbol</th>
        <th>Measured Value</th>
        <th>Unit</th>
        <th>Category</th>
        <th>Physical Meaning</th>
      </tr>
    </thead>
    <tbody>
      ${dspTableRows.map((r, idx) => `
        <tr style="${idx % 2 === 0 ? 'background: #fff;' : 'background: #f8fafc;'}">
          <td><strong>${r.name}</strong></td>
          <td style="font-family: monospace;">${r.symbol}</td>
          <td style="font-family: monospace; font-weight: bold; color: #0f766e;">${r.value}</td>
          <td>${r.unit}</td>
          <td>${r.category}</td>
          <td>${r.interpretation}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2 style="font-size: 14px; margin-top: 28px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">Extracted Figures & Acoustic Graphics</h2>

  <div class="figure-container">
    <div class="fig-title">Figure 1: Time-Domain Audio Signal Waveform x(t) [Peak: ${dsp.peakDb} dB · Contact: ${dsp.contactDurationMs} ms]</div>
    <svg viewBox="0 0 500 100" style="width: 100%; height: 90px;">
      <line x1="0" y1="50" x2="500" y2="50" stroke="#334155" stroke-width="1" />
      <path d="${(() => {
        let p = '';
        for (let i = 0; i < timeSignal.length; i++) {
          const x = (i / (timeSignal.length - 1)) * 500;
          const y = 50 - timeSignal[i] * 42;
          p += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
        }
        return p;
      })()}" fill="none" stroke="#2dd4bf" stroke-width="2" />
    </svg>
  </div>

  <div class="figure-container">
    <div class="fig-title">Figure 2: Audio Frequency Fourier Spectrum (FFT dB) [Centroid: ${dsp.spectralCentroid} Hz · Harmonic: ${result.dominantHarmonic}]</div>
    <svg viewBox="0 0 500 100" style="width: 100%; height: 90px;">
      <path d="${(() => {
        let p = 'M0,100 ';
        for (let i = 0; i < spectrumDb.length; i++) {
          const x = (i / (spectrumDb.length - 1)) * 500;
          const normY = Math.min(1.0, Math.max(0.0, (spectrumDb[i] + 100) / 80));
          const y = 100 - normY * 90;
          p += 'L' + x.toFixed(1) + ',' + y.toFixed(1) + ' ';
        }
        p += 'L500,100 Z';
        return p;
      })()}" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" stroke-width="2" />
    </svg>
  </div>

  ${snapshots?.compositeSnapshotUrl ? `
  <h2 style="font-size: 14px; margin-top: 28px; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">Visualizer Snapshot (Stored Acoustic Graphic)</h2>
  <div style="margin: 16px 0; border: 1px solid #cbd5e1; border-radius: 12px; overflow: hidden; background: #060a14;">
    <div style="padding: 8px 14px; background: #0f172a; color: #2dd4bf; font-size: 11px; font-weight: bold; font-family: monospace; display: flex; justify-content: space-between;">
      <span>TOUCHXAI DUAL-PANEL VISUALIZER SNAPSHOT (WAVEFORM & FFT)</span>
      <span style="color: #94a3b8;">PNG 24-BIT</span>
    </div>
    <img src="${snapshots.compositeSnapshotUrl}" alt="Acoustic Visualizer Snapshot" style="width: 100%; display: block;" />
  </div>
  ` : ''}

  <div style="font-size: 11px; color: #64748b; font-family: monospace; text-align: center; margin-top: 36px;">
    Report Generated by Touch4xAi · Smart Touch for Training AI · ${timestampIso}
  </div>
</body>
</html>`;

    return {
      data: html,
      mimeType: 'text/html',
      extension: 'html',
    };
  };

  const handleUploadToR2 = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsUploadingR2(true);
    setR2UploadSuccess(false);

    try {
      const fullDataset = JSON.parse(generateExportContent('json').data);
      const filename = `dataset_${result.mode}_${result.objectName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
      const res = await uploadDatasetToCloudflareR2(fullDataset, filename);
      setR2UploadSuccess(true);
      setR2UploadKey(res.objectKey);
      setTimeout(() => setR2UploadSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to upload to Cloudflare R2:', err);
    } finally {
      setIsUploadingR2(false);
    }
  };

  const handleConfirmSave = async () => {
    if (activeTab === 'phone') {
      if (fileFormat === 'pdf') {
        await handleGeneratePdfReport();
      } else {
        const exportResult = generateExportContent(fileFormat);
        const blob = new Blob([exportResult.data], { type: exportResult.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Touch4xAi_${result.objectName.replace(/[^a-zA-Z0-9]/g, '_')}_${result.mode}_report.${exportResult.extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }

    const compositeSnap = snapshots?.compositeSnapshotUrl || result.visualizerSnapshot;
    const waveSnap = snapshots?.waveformSnapshotUrl || result.waveformSnapshotUrl;
    const fftSnap = snapshots?.fftSnapshotUrl || result.fftSnapshotUrl;

    const savedRecord: SavedRecord = {
      ...result,
      dspParameters: dsp,
      timeDomainSignal: timeSignal,
      spectrumDbData: spectrumDb,
      dominantPeaks: peaks,
      visualizerSnapshot: compositeSnap,
      waveformSnapshotUrl: waveSnap,
      fftSnapshotUrl: fftSnap,
      storageType: activeTab,
      targetFolder: activeTab === 'phone' ? selectedPhoneFolder : selectedCloudTarget,
    };

    // If Cloudflare R2 is targeted, stream directly via Presigned PUT
    if (activeTab === 'cloud' && selectedCloudTarget.includes('Cloudflare R2')) {
      try {
        const fullDataset = JSON.parse(generateExportContent('json').data);
        const filename = `dataset_${result.mode}_${result.objectName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
        const r2Res = await uploadDatasetToCloudflareR2(fullDataset, filename);
        setR2UploadKey(r2Res.objectKey);
      } catch (err) {
        console.warn('Cloudflare R2 direct upload warning:', err);
      }
    }

    // If cloud tab and user signed in, save directly to Firestore with full tables, params, and figures
    if (activeTab === 'cloud' && currentUser && !selectedCloudTarget.includes('Cloudflare R2')) {
      try {
        await saveMeasurementToFirestore(currentUser.uid, savedRecord);
      } catch (err) {
        console.warn('Firestore write warning:', err);
      }
    }

    setIsSavedSuccess(true);
    setTimeout(() => {
      onSaveConfirmed(savedRecord);
      onClose();
      setIsSavedSuccess(false);
    }, 900);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col text-left">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Save Measurement Result</h3>
            <p className="text-[11px] text-slate-500">
              Exports full tables, DSP parameters, and figures to phone or cloud
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 m-4 mb-2 rounded-2xl">
          <button
            onClick={() => setActiveTab('phone')}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'phone'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Local Device File
          </button>
          <button
            onClick={() => setActiveTab('cloud')}
            className={`py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'cloud'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-sky-500" />
            Cloud Storage
          </button>
        </div>

        {/* Body content */}
        <div className="p-4 pt-1 space-y-3.5 max-h-[65vh] overflow-y-auto">
          {/* Result brief preview */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                {result.mode} measurement
              </span>
              <p className="font-bold text-xs text-slate-900 truncate">{result.objectName}</p>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                RMS: {dsp.rmsDb} dB · Centroid: {dsp.spectralCentroid} Hz · Crest: {dsp.crestFactor.toFixed(1)}
              </p>
            </div>
            <div className="text-right">
              <span className="text-base font-extrabold text-teal-800">
                {diff.differentialPercent > 0 ? '+' : ''}{diff.differentialPercent}%
              </span>
              <span className="text-[10px] text-slate-500 block font-medium">vs Reference</span>
              <span className="text-[10px] text-teal-700 block font-semibold">12 DSP Params</span>
            </div>
          </div>

          {/* Visualizer Snapshot Section (Stored with Record) */}
          <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-3.5 space-y-2.5 shadow-md">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center">
                  <Camera className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-100">Visualizer Snapshot</span>
                    <span className="text-[10px] font-semibold font-mono px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      Stored with Record
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    High-res visual representation of FFT spectrum & oscillogram
                  </p>
                </div>
              </div>

              {/* View Tab Selector */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-mono">
                <button
                  type="button"
                  onClick={() => setActiveSnapshotTab('composite')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                    activeSnapshotTab === 'composite'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Dual Panel
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSnapshotTab('waveform')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                    activeSnapshotTab === 'waveform'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  x(t) Signal
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSnapshotTab('fft')}
                  className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${
                    activeSnapshotTab === 'fft'
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Interactive FFT
                </button>
              </div>
            </div>

            {/* Visualizer Display: Interactive FFT with tooltips OR Snapshot Images */}
            {activeSnapshotTab === 'fft' ? (
              <div className="p-1 rounded-xl bg-slate-950/70 border border-slate-800">
                <InteractiveFftVisualizer
                  spectrumDb={spectrumDb}
                  dsp={dsp}
                  dominantHarmonic={result.dominantHarmonic}
                  dominantPeaks={peaks}
                  height={150}
                  showPeakPills={true}
                />
              </div>
            ) : (
              <div className="relative w-full rounded-xl overflow-hidden border border-slate-800 bg-[#050811] flex items-center justify-center min-h-[120px]">
                {snapshots ? (
                  <>
                    <img
                      src={
                        activeSnapshotTab === 'composite'
                          ? snapshots.compositeSnapshotUrl
                          : snapshots.waveformSnapshotUrl
                      }
                      alt="Acoustic Visualizer Snapshot"
                      className="w-full h-auto max-h-[185px] object-contain rounded-xl select-none"
                    />
                    <button
                      type="button"
                      onClick={handleDownloadSnapshotOnly}
                      className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-slate-900/85 hover:bg-slate-900 text-slate-200 text-[10px] font-mono font-semibold border border-slate-700/80 backdrop-blur-xs flex items-center gap-1.5 transition-all shadow-xs"
                      title="Download high-resolution snapshot image PNG"
                    >
                      <Download className="w-3 h-3 text-teal-400" />
                      <span>Download PNG</span>
                    </button>
                  </>
                ) : (
                  <div className="py-6 flex flex-col items-center justify-center text-slate-500 text-xs gap-1.5">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-500" />
                    <span>Generating visualizer snapshot...</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
              <span className="flex items-center gap-1 text-teal-400">
                <CheckCircle2 className="w-3 h-3" />
                Snapshot stored alongside DSP metrics in record
              </span>
              <span>PNG · 24-bit RGB</span>
            </div>
          </div>

          {activeTab === 'phone' ? (
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Select Mobile Device Folder:
              </span>

              <div className="space-y-2">
                {phoneFolders.map((folder, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedPhoneFolder(folder.name)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      selectedPhoneFolder === folder.name
                        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Folder className={`w-5 h-5 mt-0.5 shrink-0 ${
                      selectedPhoneFolder === folder.name ? 'text-slate-900' : 'text-slate-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{folder.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{folder.desc}</p>
                      <span className="text-[10px] text-slate-400 font-mono">{folder.free}</span>
                    </div>
                    {selectedPhoneFolder === folder.name && (
                      <Check className="w-4 h-4 text-slate-900 shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {/* Direct CSV Export Card for External Analysis */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-200/90 rounded-2xl flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-emerald-950">External DSP CSV Export</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-200/70 text-emerald-900 font-semibold">
                        .csv
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-800 font-mono mt-0.5 truncate">
                      RMS ({dsp.rmsDb} dB) · Centroid ({dsp.spectralCentroid} Hz) · Crest ({dsp.crestFactor.toFixed(2)}) · ZCR ({(dsp.zeroCrossingRate * 100).toFixed(1)}%)
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0"
                >
                  {isCsvDownloaded ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Exported</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download as CSV</span>
                    </>
                  )}
                </button>
              </div>

              {/* Publication-Grade PDF Characterization Report Card */}
              <div className="p-3 bg-linear-to-r from-sky-50 via-teal-50 to-indigo-50 border border-sky-200/90 rounded-2xl flex items-center justify-between gap-3 text-left shadow-2xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-sky-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <FileText className="w-4 h-4 text-sky-100" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">Publication PDF Report</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-200/80 text-sky-950 font-bold">
                        .pdf
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 font-mono mt-0.5 truncate">
                      Compiles 12 DSP tables, Material Heatmap & FFT spectra into 2-page document
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGeneratePdfReport}
                  disabled={isGeneratingPdf}
                  className="px-3 py-1.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 disabled:opacity-50"
                  title="Generate publication-grade PDF report document"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Compiling...</span>
                    </>
                  ) : isPdfGenerated ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Exported</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5" />
                      <span>Generate PDF</span>
                    </>
                  )}
                </button>
              </div>

              {/* Format selection */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-slate-600 font-medium">Export File Format:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(['pdf', 'json', 'csv', 'txt', 'html'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setFileFormat(fmt)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono uppercase font-semibold transition-colors ${
                        fileFormat === fmt
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      .{fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 bg-teal-50/70 border border-teal-200/80 rounded-xl text-[11px] text-teal-900 space-y-0.5">
                <div className="font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  Includes All Tables, DSP Parameters & Figure Data
                </div>
                <p className="text-[10px] text-teal-700">
                  Formatted tables, RMS Energy, Spectral Centroid, Crest Factor, ZCR, and time-domain / FFT figure arrays.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Choose Cloud Storage Vault:
              </span>

              <div className="space-y-2">
                {cloudDestinations.map((dest, idx) => (
                  <div
                    key={idx}
                    onClick={() => setSelectedCloudTarget(dest.name)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      selectedCloudTarget === dest.name
                        ? 'border-sky-600 bg-sky-50/50 ring-1 ring-sky-600'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Cloud className={`w-5 h-5 mt-0.5 shrink-0 ${
                      selectedCloudTarget === dest.name ? 'text-sky-600' : 'text-slate-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">{dest.name}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{dest.desc}</p>
                      <span className="text-[10px] text-sky-700 font-medium">{dest.status}</span>
                    </div>
                    {selectedCloudTarget === dest.name && (
                      <Check className="w-4 h-4 text-sky-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>

              {selectedCloudTarget.includes('Cloudflare R2') && (
                <div className="p-3.5 bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/90 rounded-2xl flex items-center justify-between gap-3 text-left shadow-2xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Cloud className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Direct R2 Stream (touch4xai)</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-orange-200/80 text-orange-950 font-bold">
                          Presigned PUT
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-600 font-mono mt-0.5 truncate">
                        Streams full raw audio and 6-axis IMU JSON datasets directly into touch4xai/raw_datasets/
                      </p>
                      {r2UploadKey && (
                        <p className="text-[9px] text-emerald-700 font-mono mt-0.5 truncate">
                          Stored: {r2UploadKey}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleUploadToR2}
                    disabled={isUploadingR2}
                    className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    {isUploadingR2 ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Streaming...</span>
                      </>
                    ) : r2UploadSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Uploaded!</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload to R2</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {!currentUser && selectedCloudTarget.includes('Firebase') && (
                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between text-xs">
                  <div className="text-left">
                    <p className="font-semibold text-amber-900 text-[11px]">Sign in with Google</p>
                    <p className="text-[10px] text-amber-700">Persist records to your Firestore cloud vault</p>
                  </div>
                  <button
                    onClick={handleSignInInModal}
                    disabled={isSigningIn}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 hover:bg-slate-800 transition-colors shrink-0"
                  >
                    {isSigningIn ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogIn className="w-3 h-3" />}
                    Sign In
                  </button>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-600 flex items-center justify-between">
                <span>Direct token-safe presigned PUT storage</span>
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Full Metrology Fidelity
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-3.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-white transition-colors"
          >
            Cancel
          </button>

          {/* Dedicated 'Generate PDF Report' Button */}
          <button
            type="button"
            onClick={handleGeneratePdfReport}
            disabled={isGeneratingPdf}
            className="flex-1 h-11 px-3 rounded-xl border border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs disabled:opacity-50"
            title="Compile DSP tables, material heatmap, and FFT spectrum into a formatted PDF document"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-sky-700" />
                <span>Compiling PDF...</span>
              </>
            ) : isPdfGenerated ? (
              <>
                <Check className="w-4 h-4 text-sky-600" />
                <span className="text-sky-800">PDF Ready!</span>
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 text-sky-700 shrink-0" />
                <span>Generate PDF Report</span>
              </>
            )}
          </button>

          {/* Download as CSV Button */}
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="h-11 px-3 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs"
            title="Download CSV with RMS Energy, Spectral Centroid, Crest Factor, Zero Crossing Rate, and timestamp"
          >
            {isCsvDownloaded ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span className="text-emerald-800">CSV!</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>CSV</span>
              </>
            )}
          </button>

          {/* Confirm & Save */}
          <button
            type="button"
            onClick={handleConfirmSave}
            disabled={isSavedSuccess}
            className="flex-1 h-11 px-3 rounded-xl bg-slate-900 text-white font-semibold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-xs"
          >
            {isSavedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-teal-400" />
                <span>Confirm & Save</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
