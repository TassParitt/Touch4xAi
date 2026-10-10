export type MeasureMode = 'texture' | 'hardness' | 'density' | 'calibration';

export type LabelMethod = 'type' | 'voice' | 'camera';

export type AppVersionMode = 'V6Pro' | 'V5';

export interface ReferenceProfile {
  id: string;
  name: string; // e.g. 'Forearm Skin', 'Palm Skin', 'Glass Plate', etc.
  material: string;
  textureValue: number; // baseline score e.g. 2.8 (0% reference)
  hardnessValue: number; // baseline score e.g. 1.4 (0% reference)
  densityValue: number; // baseline score e.g. 1.5 (0% reference)
  calibratedAt?: string;
  isCalibrated?: boolean;
}

export interface ObjectDetails {
  name: string;
  material: string;
  description: string;
  expectedTexture?: number;
  expectedHardness?: number;
  expectedDensity?: number;
  imageUrl?: string;
  deviceModel?: string; // Auto-detected smartphone model (e.g. Google Pixel 8 Pro)
}

export interface DspParameters {
  rmsDb: number;
  peakDb: number;
  crestFactor: number;
  contactDurationMs: number;
  spectralCentroid: number;
  spectralRolloff: number;
  highFreqEnergyRatio: number;
  zeroCrossingRate: number;
  qualityFactorQ: number;
  thdPercent: number;
  acousticImpedanceZ?: string;
  dampingRatioZeta?: string;
}

export interface ImuMetrics {
  slidingVelocityMs?: number; // m/s linear velocity
  slidingVelocityCms?: number; // cm/s linear velocity
  angularRateDps?: number; // deg/s gyroscope rate
  viscoelasticLagMs?: number; // ms time delay between microphone impact and IMU deceleration stop
  peakDecelerationG?: number; // peak deceleration in Gs
  slidingStatus?: 'optimal' | 'too_slow' | 'too_fast' | 'steady';
  directionAngleDeg?: number;
  sensorSampleCount?: number;
  slidePassCount?: number; // e.g. 3 passes back and forth
  continuousContactMaintained?: boolean;
  accelerometer?: { x: number; y: number; z: number };
  gyroscope?: { alpha: number; beta: number; gamma: number };
}

export interface DifferentialResult {
  differentialPercent: number; // unlimited positive (e.g. +1250%), min -100%
  displayLabel: string; // e.g. "+1,250% harder than Forearm Skin", "-30% smoother than Forearm Skin"
  baselineValue: number;
  testValue: number;
  baselineName: string; // e.g. 'Forearm Skin', 'Palm Skin', etc.
  baselineType: 'reference_object';
  baselineDate?: string;
  parameterUnit: string;
  comparisonCategory?: string;
  maxScaleRange?: number; // auto-adjusted scale range (e.g. 1500 for +1250%)
}

export interface BaselineSkinMetrics {
  texture?: {
    value: number; // e.g., 2.8 score or 1100 Hz
    centroid: number;
    rmsDb: number;
    vSlideMeanCms?: number;
    timestamp: string;
  };
  hardness?: {
    value: number; // e.g., 1.4 score or 28 ms delay
    contactLagMs: number;
    dominantHarmonicHz: number;
    dampingRatio: string;
    rmsDb: number;
    timestamp: string;
  };
  density?: {
    value: number; // e.g., 1.5 score
    dominantHarmonicHz: number;
    impedanceZ?: string;
    avgDb: number;
    timestamp: string;
  };
  calibratedAt?: string;
  isCalibrated?: boolean;
}

export interface AcousticAnalysisResult {
  id: string;
  timestamp: string;
  objectName: string;
  mode: MeasureMode;
  score: number; // 1.0 to 10.0 (V5 absolute benchmark scale)
  descriptor: string;
  summary: string;
  dominantHarmonic: string;
  dampingRatio: string;
  confidencePercent: number;
  peakFreqs: number[];
  avgDb: number;
  modeSpecificMetric: {
    label: string;
    value: string;
  };
  spectrumData?: number[];
  timeDomainSignal?: number[]; // Raw time-domain oscillogram waveform
  spectrumDbData?: number[];   // Audio frequency spectrum in dB (-120 to 0)
  dspParameters?: DspParameters; // Table of measured DSP physical parameters
  dominantPeaks?: { freq: number; db: number }[];
  deviceModel?: string; // Auto-detected smartphone model
  visualizerSnapshot?: string; // Combined high-resolution visual snapshot data URL (waveform + FFT)
  waveformSnapshotUrl?: string; // Time-domain signal snapshot data URL
  fftSnapshotUrl?: string; // FFT frequency spectrum visualizer snapshot data URL
  calibrationOffsetDb?: number; // Calibrated sensitivity offset in dB
  calibrationStatus?: 'optimal' | 'acceptable' | 'noisy';
  // Relative Reference Measurement Additions:
  differentialResult?: DifferentialResult; // Unlimited relative differential scale vs Reference Object (0% baseline)
  referenceProfile?: ReferenceProfile; // The reference object against which this measurement is compared
  imuMetrics?: ImuMetrics; // 6-Axis accelerometer & gyroscope telemetry (speed, viscoelastic lag, slide passes)
  versionMode?: AppVersionMode; // 'V6Pro' | 'V5'
  baselineSnapshot?: {
    textureValue?: number;
    hardnessValue?: number;
    densityValue?: number;
  };
}

export interface SavedRecord extends AcousticAnalysisResult {
  storageType: 'phone' | 'cloud';
  targetFolder: string;
}
