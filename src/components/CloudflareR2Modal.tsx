import React, { useState, useEffect, useMemo } from 'react';
import {
  Cloud,
  X,
  ExternalLink,
  CheckCircle2,
  UploadCloud,
  Database,
  ShieldCheck,
  Settings,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  FileCode,
  Sparkles,
  Layers,
  CheckSquare,
  Square,
  Search,
  Download,
  BarChart3,
  Sliders,
  Activity,
  FileJson,
} from 'lucide-react';
import {
  fetchR2Status,
  getSavedWorkerUrl,
  saveWorkerUrl,
  uploadDatasetToCloudflareR2,
  getR2UploadHistory,
  R2StatusInfo,
  R2UploadResult,
} from '../lib/r2Storage';
import { SavedRecord, MeasureMode } from '../types';
import { buildDspParameters } from '../lib/acousticDsp';

interface CloudflareR2ModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedRecords?: SavedRecord[];
}

export interface BatchAggregatedMetrics {
  recordCount: number;
  modeBreakdown: Record<string, number>;
  averageScore: number;
  minScore: number;
  maxScore: number;
  averageRmsDb: number;
  averageSpectralCentroidHz: number;
  averageCrestFactor: number;
  averageZeroCrossingRatePercent: number;
  averageSlidingVelocityCms: number;
  averagePeakDecelerationG: number;
  averageViscoelasticLagMs: number;
  averageConfidencePercent: number;
  topResonantFrequenciesHz: number[];
  batchTactileSummary: string;
}

/**
 * Calculates aggregated metrology, DSP parameters, and 6-axis IMU kinematics
 * across a selected batch of measurement records.
 */
function calculateBatchAggregatedMetrics(records: SavedRecord[]): BatchAggregatedMetrics {
  if (records.length === 0) {
    return {
      recordCount: 0,
      modeBreakdown: {},
      averageScore: 0,
      minScore: 0,
      maxScore: 0,
      averageRmsDb: 0,
      averageSpectralCentroidHz: 0,
      averageCrestFactor: 0,
      averageZeroCrossingRatePercent: 0,
      averageSlidingVelocityCms: 0,
      averagePeakDecelerationG: 0,
      averageViscoelasticLagMs: 0,
      averageConfidencePercent: 0,
      topResonantFrequenciesHz: [],
      batchTactileSummary: 'No records selected for batch analysis.',
    };
  }

  const modeBreakdown: Record<string, number> = {};
  let totalScore = 0;
  let minScore = records[0].score;
  let maxScore = records[0].score;
  let totalRms = 0;
  let totalCentroid = 0;
  let totalCrest = 0;
  let totalZcr = 0;
  let totalConfidence = 0;
  let totalVelocity = 0;
  let totalPeakDecel = 0;
  let totalViscoLag = 0;
  const allPeakFreqs: number[] = [];

  records.forEach((rec) => {
    // Mode breakdown count
    modeBreakdown[rec.mode] = (modeBreakdown[rec.mode] || 0) + 1;

    // Score metrics
    totalScore += rec.score;
    if (rec.score < minScore) minScore = rec.score;
    if (rec.score > maxScore) maxScore = rec.score;

    // Extracted DSP telemetry
    const dominantFreq = parseInt(rec.dominantHarmonic?.replace(/[^0-9]/g, '') || '') || 1400;
    const computed = buildDspParameters(rec.mode, rec.score, rec.objectName, dominantFreq, rec.avgDb);
    const dsp = rec.dspParameters || computed.dsp;

    totalRms += dsp.rmsDb ?? (rec.avgDb ?? -35);
    totalCentroid += dsp.spectralCentroid ?? dominantFreq;
    totalCrest += dsp.crestFactor ?? 3.5;
    totalZcr += (dsp.zeroCrossingRate ?? 0.12) * 100;
    totalConfidence += rec.confidencePercent ?? 95;

    // 6-axis IMU Kinematics
    const imu = rec.imuMetrics || {};
    totalVelocity += imu.slidingVelocityCms ?? 18.2;
    totalPeakDecel += imu.peakDecelerationG ?? 2.4;
    totalViscoLag += imu.viscoelasticLagMs ?? 2.4;

    // Collect resonant frequencies
    if (rec.dominantPeaks && rec.dominantPeaks.length > 0) {
      rec.dominantPeaks.forEach((p) => allPeakFreqs.push(p.freq));
    } else {
      allPeakFreqs.push(dominantFreq);
    }
  });

  const count = records.length;
  const avgScore = parseFloat((totalScore / count).toFixed(2));
  const avgCentroid = Math.round(totalCentroid / count);
  const avgRms = parseFloat((totalRms / count).toFixed(1));
  const avgCrest = parseFloat((totalCrest / count).toFixed(2));
  const avgZcr = parseFloat((totalZcr / count).toFixed(1));
  const avgVelocity = parseFloat((totalVelocity / count).toFixed(1));
  const avgDecel = parseFloat((totalPeakDecel / count).toFixed(1));
  const avgLag = parseFloat((totalViscoLag / count).toFixed(1));
  const avgConfidence = parseFloat((totalConfidence / count).toFixed(1));

  // Determine top 5 resonant harmonic bands
  const freqCounts: Record<number, number> = {};
  allPeakFreqs.forEach((f) => {
    const bucket = Math.round(f / 50) * 50;
    freqCounts[bucket] = (freqCounts[bucket] || 0) + 1;
  });
  const topResonantFrequenciesHz = Object.keys(freqCounts)
    .map(Number)
    .sort((a, b) => freqCounts[b] - freqCounts[a])
    .slice(0, 5);

  const modeParts = Object.entries(modeBreakdown).map(([m, c]) => `${c} ${m}`);
  const batchTactileSummary = `Consolidated batch of ${count} metrology datasets (${modeParts.join(', ')}) with average calibrated score ${avgScore}/10 (range: ${minScore.toFixed(1)}–${maxScore.toFixed(1)}), mean spectral centroid ${avgCentroid} Hz, and mean contact viscoelastic lag ${avgLag} ms.`;

  return {
    recordCount: count,
    modeBreakdown,
    averageScore: avgScore,
    minScore: parseFloat(minScore.toFixed(1)),
    maxScore: parseFloat(maxScore.toFixed(1)),
    averageRmsDb: avgRms,
    averageSpectralCentroidHz: avgCentroid,
    averageCrestFactor: avgCrest,
    averageZeroCrossingRatePercent: avgZcr,
    averageSlidingVelocityCms: avgVelocity,
    averagePeakDecelerationG: avgDecel,
    averageViscoelasticLagMs: avgLag,
    averageConfidencePercent: avgConfidence,
    topResonantFrequenciesHz,
    batchTactileSummary,
  };
}

export const CloudflareR2Modal: React.FC<CloudflareR2ModalProps> = ({
  isOpen,
  onClose,
  savedRecords = [],
}) => {
  const [status, setStatus] = useState<R2StatusInfo | null>(null);
  const [workerUrl, setWorkerUrl] = useState('');
  const [isSavedWorker, setIsSavedWorker] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<R2UploadResult[]>([]);
  const [copiedCors, setCopiedCors] = useState(false);
  const [activeTab, setActiveTab] = useState<'batch' | 'sync' | 'architecture' | 'config'>('batch');

  // Test single connection state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<R2UploadResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // Multi-Record Selection State for Batch Export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | MeasureMode>('all');

  // Batch Export Execution State
  const [isBatchUploading, setIsBatchUploading] = useState(false);
  const [batchUploadResult, setBatchUploadResult] = useState<R2UploadResult | null>(null);
  const [batchUploadError, setBatchUploadError] = useState<string | null>(null);
  const [isBatchDownloaded, setIsBatchDownloaded] = useState(false);

  // Initial setup when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchR2Status().then(setStatus);
      setWorkerUrl(getSavedWorkerUrl());
      setUploadHistory(getR2UploadHistory());
      setTestResult(null);
      setTestError(null);
      setBatchUploadResult(null);
      setBatchUploadError(null);

      // Pre-select all records by default if any exist
      if (savedRecords.length > 0) {
        setSelectedIds(new Set(savedRecords.map((r) => r.id)));
      } else {
        setSelectedIds(new Set());
      }
    }
  }, [isOpen, savedRecords]);

  // Filter records based on search query and mode
  const filteredRecords = useMemo(() => {
    return savedRecords.filter((rec) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        rec.objectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.descriptor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.mode.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMode = filterMode === 'all' || rec.mode === filterMode;
      return matchesSearch && matchesMode;
    });
  }, [savedRecords, searchQuery, filterMode]);

  // Selected records array
  const selectedRecords = useMemo(() => {
    return savedRecords.filter((r) => selectedIds.has(r.id));
  }, [savedRecords, selectedIds]);

  // Aggregated metrics across selected records
  const batchMetrics = useMemo(() => {
    return calculateBatchAggregatedMetrics(selectedRecords);
  }, [selectedRecords]);

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    const allFilteredSelected = filteredRecords.length > 0 && filteredRecords.every((r) => selectedIds.has(r.id));
    if (allFilteredSelected) {
      // Deselect all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRecords.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRecords.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleSaveWorkerUrl = () => {
    saveWorkerUrl(workerUrl);
    setIsSavedWorker(true);
    setTimeout(() => setIsSavedWorker(false), 2000);
  };

  /**
   * Builds the single consolidated batch package JSON object
   */
  const buildBatchPackagePayload = () => {
    const timestampIso = new Date().toISOString();
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      packageType: 'batch_metrology_dataset',
      schemaVersion: 'Touch4xAi-LTM-Batch-v1.0',
      batchId,
      exportedAt: timestampIso,
      targetBucket: 'touch4xai',
      targetDirectory: 'raw_datasets/',
      storageTarget: 'Cloudflare R2 (touch4xai)',
      accountId: '2752109d4d388476f42f329b6f68c629',
      referenceBaselineAnchor: 'Human Forearm Skin Baseline (0% Differential Anchor)',
      batchAggregatedMetrics: batchMetrics,
      records: selectedRecords.map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        objectName: r.objectName,
        mode: r.mode,
        score: r.score,
        tactileDescriptor: r.descriptor,
        spectrumSummary: r.summary,
        dominantHarmonic: r.dominantHarmonic,
        dampingRatio: r.dampingRatio,
        confidencePercent: r.confidencePercent,
        avgDb: r.avgDb,
        deviceModel: r.deviceModel,
        storageType: r.storageType,
        targetFolder: r.targetFolder,
        differentialResult: r.differentialResult,
        imuMetrics: r.imuMetrics,
        dspParameters: r.dspParameters,
        dominantPeaks: r.dominantPeaks,
        timeDomainSignal: r.timeDomainSignal,
        spectrumDbData: r.spectrumDbData,
        visualizerSnapshot: r.visualizerSnapshot,
      })),
    };
  };

  /**
   * Streams the single consolidated batch JSON package directly into the touch4xai bucket
   */
  const handleUploadBatchPackage = async () => {
    if (selectedRecords.length === 0) return;

    setIsBatchUploading(true);
    setBatchUploadError(null);
    setBatchUploadResult(null);

    const batchPayload = buildBatchPackagePayload();
    const count = selectedRecords.length;
    const filename = `batch_${count}_records_${Date.now()}.json`;

    try {
      const res = await uploadDatasetToCloudflareR2(batchPayload, filename, {
        customWorkerUrl: workerUrl || undefined,
      });
      setBatchUploadResult(res);
      setUploadHistory(getR2UploadHistory());
    } catch (err: any) {
      setBatchUploadError(err.message || 'Failed to upload batch dataset package to Cloudflare R2');
    } finally {
      setIsBatchUploading(false);
    }
  };

  /**
   * Downloads the exact batch package JSON file locally
   */
  const handleDownloadBatchPackage = () => {
    if (selectedRecords.length === 0) return;
    const batchPayload = buildBatchPackagePayload();
    const jsonStr = JSON.stringify(batchPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Touch4xAi_Batch_${selectedRecords.length}_records_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsBatchDownloaded(true);
    setTimeout(() => setIsBatchDownloaded(false), 2400);
  };

  /**
   * Single connection test upload
   */
  const handleTestUpload = async () => {
    setIsTesting(true);
    setTestError(null);
    setTestResult(null);

    const testPayload = {
      test: true,
      timestamp: new Date().toISOString(),
      source: 'Touch4xAi PWA Direct Edge Client',
      bucket: 'touch4xai',
      accountId: '2752109d4d388476f42f329b6f68c629',
      metadata: {
        sensor: 'Smartphone Micro-Acoustic Sensor & 6-Axis IMU',
        purpose: 'Presigned URL Direct Upload Verification',
        targetDirectory: 'raw_datasets/',
      },
      sampleImu: {
        slidingVelocityCms: 18.2,
        peakDecelerationG: 2.4,
        viscoelasticLagMs: 2.4,
      },
    };

    try {
      const res = await uploadDatasetToCloudflareR2(
        testPayload,
        `test_connection_${Date.now()}.json`,
        { customWorkerUrl: workerUrl || undefined }
      );
      setTestResult(res);
      setUploadHistory(getR2UploadHistory());
    } catch (err: any) {
      setTestError(err.message || 'Failed to upload test dataset');
    } finally {
      setIsTesting(false);
    }
  };

  const corsSnippet = JSON.stringify(
    [
      {
        AllowedOrigins: [
          'https://touchxai.pages.dev',
          'http://localhost:3000',
          '*',
        ],
        AllowedMethods: ['PUT', 'GET'],
        AllowedHeaders: ['Content-Type'],
        ExposeHeaders: ['ETag'],
        MaxAgeSeconds: 3600,
      },
    ],
    null,
    2
  );

  const handleCopyCors = () => {
    navigator.clipboard.writeText(corsSnippet);
    setCopiedCors(true);
    setTimeout(() => setCopiedCors(false), 2000);
  };

  const isAllFilteredSelected = filteredRecords.length > 0 && filteredRecords.every((r) => selectedIds.has(r.id));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold">Cloudflare R2 Dataset Storage</h2>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-mono uppercase tracking-wider font-semibold">
                  Bucket: touch4xai
                </span>
              </div>
              <p className="text-xs text-orange-100 mt-0.5">
                Single batch JSON package export with aggregated DSP & IMU metrics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2.5 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('batch')}
            className={`px-4 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-1.5 transition-all border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'batch'
                ? 'border-orange-500 text-orange-600 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Batch JSON Export</span>
            {selectedIds.size > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-orange-100 text-orange-700 font-mono text-[10px] font-bold">
                {selectedIds.size}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-1.5 transition-all border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'sync'
                ? 'border-orange-500 text-orange-600 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Connection & Logs</span>
          </button>

          <button
            onClick={() => setActiveTab('architecture')}
            className={`px-4 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-1.5 transition-all border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'architecture'
                ? 'border-orange-500 text-orange-600 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Architecture</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-1.5 transition-all border-b-2 cursor-pointer shrink-0 ${
              activeTab === 'config'
                ? 'border-orange-500 text-orange-600 bg-white shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Worker & CORS</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-left flex-1">
          {/* ==================================================== */}
          {/* TAB 1: BATCH JSON PACKAGE EXPORT (MULTI-RECORD)     */}
          {/* ==================================================== */}
          {activeTab === 'batch' && (
            <div className="space-y-4">
              {/* Top Explanation Banner */}
              <div className="p-3.5 bg-orange-50/80 border border-orange-200/90 rounded-2xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <FileJson className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-orange-950 block">
                      Single Consolidated Batch Package Pipeline
                    </span>
                    <p className="text-[11px] text-orange-800/90 mt-0.5">
                      Combines selected metrology records into one unified JSON dataset with computed aggregate metrics and streams directly to <strong>touch4xai/raw_datasets/</strong>.
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono uppercase text-orange-600 font-bold block">
                    Target Bucket
                  </span>
                  <span className="text-xs font-mono font-bold text-orange-950">touch4xai</span>
                </div>
              </div>

              {/* Record Multi-Selection Toolbar */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  {/* Search Bar */}
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter records by object name or mode..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Mode Pills */}
                  <div className="flex items-center gap-1">
                    {(['all', 'texture', 'hardness', 'density'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setFilterMode(m)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all cursor-pointer ${
                          filterMode === m
                            ? 'bg-slate-900 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selection Controls Strip */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/70 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleSelectAll}
                      disabled={filteredRecords.length === 0}
                      className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-semibold text-[11px] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isAllFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-orange-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                      <span>
                        {isAllFilteredSelected
                          ? 'Deselect Filtered'
                          : `Select All Filtered (${filteredRecords.length})`}
                      </span>
                    </button>

                    {selectedIds.size > 0 && (
                      <button
                        type="button"
                        onClick={handleClearSelection}
                        className="text-[10px] text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-orange-800 bg-orange-100/90 px-2.5 py-0.5 rounded-full">
                      {selectedIds.size} of {savedRecords.length} Selected
                    </span>
                  </div>
                </div>
              </div>

              {/* Records Scrollable Checkbox List */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-2 bg-slate-50/50">
                {savedRecords.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No measurement records found in history. Measure surfaces to build datasets.
                  </div>
                ) : filteredRecords.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No records matching your search or mode filter.
                  </div>
                ) : (
                  filteredRecords.map((rec) => {
                    const isSelected = selectedIds.has(rec.id);
                    return (
                      <div
                        key={rec.id}
                        onClick={() => handleToggleSelect(rec.id)}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                          isSelected
                            ? 'bg-white border-orange-400 shadow-2xs ring-1 ring-orange-400/40'
                            : 'bg-white/80 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-orange-600 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {rec.objectName || 'Sample Object'}
                              </span>
                              <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold">
                                {rec.mode}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono truncate">
                              Harmonic: {rec.dominantHarmonic || '1400 Hz'} · {rec.descriptor || 'Surface'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-bold text-slate-800">
                            {rec.score.toFixed(1)} / 10
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono block">
                            {new Date(rec.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Aggregated Metrics Dashboard Card (Live Computation) */}
              {selectedRecords.length > 0 ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 text-white space-y-3.5 shadow-sm border border-slate-800">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-orange-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                        Batch Aggregated Metrics ({batchMetrics.recordCount} Records)
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                      Calculated for Single Package
                    </span>
                  </div>

                  {/* KPI Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    {/* Score Summary */}
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                        Mean Score
                      </span>
                      <p className="text-base font-extrabold text-white font-mono">
                        {batchMetrics.averageScore} <span className="text-xs text-slate-400 font-normal">/ 10</span>
                      </p>
                      <span className="text-[9px] text-slate-400 font-mono">
                        Range: {batchMetrics.minScore} – {batchMetrics.maxScore}
                      </span>
                    </div>

                    {/* Acoustic Centroid */}
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                        Spectral Centroid
                      </span>
                      <p className="text-base font-extrabold text-orange-400 font-mono">
                        {batchMetrics.averageSpectralCentroidHz.toLocaleString()}{' '}
                        <span className="text-xs text-orange-300 font-normal">Hz</span>
                      </p>
                      <span className="text-[9px] text-slate-400 font-mono">
                        Mean Acoustic fc
                      </span>
                    </div>

                    {/* RMS Acoustic Energy */}
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                        RMS Energy
                      </span>
                      <p className="text-base font-extrabold text-amber-300 font-mono">
                        {batchMetrics.averageRmsDb}{' '}
                        <span className="text-xs text-amber-200 font-normal">dBFS</span>
                      </p>
                      <span className="text-[9px] text-slate-400 font-mono">
                        Crest: {batchMetrics.averageCrestFactor}x
                      </span>
                    </div>

                    {/* IMU Viscoelastic Lag */}
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-0.5">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block font-semibold">
                        Viscoelastic Lag
                      </span>
                      <p className="text-base font-extrabold text-teal-400 font-mono">
                        {batchMetrics.averageViscoelasticLagMs}{' '}
                        <span className="text-xs text-teal-300 font-normal">ms</span>
                      </p>
                      <span className="text-[9px] text-slate-400 font-mono">
                        Decel: {batchMetrics.averagePeakDecelerationG} G
                      </span>
                    </div>
                  </div>

                  {/* Mode Breakdown & Top Harmonics */}
                  <div className="flex items-center justify-between text-[11px] flex-wrap gap-2 pt-1 border-t border-white/10">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-400 font-semibold">Modes:</span>
                      {Object.entries(batchMetrics.modeBreakdown).map(([modeName, cnt]) => (
                        <span
                          key={modeName}
                          className="px-2 py-0.5 rounded-md bg-white/10 font-mono text-[10px] text-slate-200 font-semibold"
                        >
                          {modeName}: {cnt}
                        </span>
                      ))}
                    </div>

                    {batchMetrics.topResonantFrequenciesHz.length > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
                        <span>Top Peaks:</span>
                        {batchMetrics.topResonantFrequenciesHz.map((f, i) => (
                          <span key={i} className="text-orange-300 font-semibold">
                            {f}Hz{i < batchMetrics.topResonantFrequenciesHz.length - 1 ? ',' : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Batch Tactile Summary */}
                  <p className="text-[11px] text-slate-300 bg-white/5 p-2 rounded-xl leading-relaxed font-mono">
                    {batchMetrics.batchTactileSummary}
                  </p>

                  {/* Primary Batch Upload Action Buttons */}
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={handleUploadBatchPackage}
                      disabled={isBatchUploading || selectedRecords.length === 0}
                      className="flex-1 min-w-[220px] h-11 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      {isBatchUploading ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>Streaming Batch Package to touch4xai...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>
                            Upload Batch Package ({selectedRecords.length} Datasets) to R2
                          </span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadBatchPackage}
                      disabled={selectedRecords.length === 0}
                      className="h-11 px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/15 cursor-pointer"
                      title="Download the single consolidated batch JSON package locally"
                    >
                      {isBatchDownloaded ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-300 font-bold">Downloaded!</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 text-slate-300" />
                          <span>Download JSON</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Batch Upload Success Banner */}
                  {batchUploadResult && (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs space-y-1 text-emerald-200 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Single Batch JSON Stored in Cloudflare R2!</span>
                      </div>
                      <p className="text-[11px] font-mono text-emerald-100 break-all">
                        Key: {batchUploadResult.objectKey}
                      </p>
                      <p className="text-[10px] text-emerald-300/80">
                        Stored {selectedRecords.length} records into single consolidated payload ({(batchUploadResult.byteSize / 1024).toFixed(1)} KB) in bucket <strong>touch4xai</strong>.
                      </p>
                    </div>
                  )}

                  {/* Batch Upload Error Banner */}
                  {batchUploadError && (
                    <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs space-y-1 text-rose-200 animate-in fade-in">
                      <div className="flex items-center gap-1.5 font-bold text-rose-300">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Batch Upload Error</span>
                      </div>
                      <p className="text-[11px]">{batchUploadError}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-slate-300 rounded-2xl text-slate-500 text-xs space-y-1">
                  <p className="font-semibold text-slate-700">No records selected</p>
                  <p className="text-[11px] text-slate-400">
                    Check one or more records above to calculate batch aggregated metrics and export as a single JSON package.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 2: CONNECTION TEST & RECENT LOGS                */}
          {/* ==================================================== */}
          {activeTab === 'sync' && (
            <div className="space-y-5">
              {/* Bucket & Status Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200/80">
                  <span className="text-[10px] font-mono uppercase text-orange-700 font-bold block">
                    Target Bucket
                  </span>
                  <p className="text-sm font-bold text-orange-950 font-mono mt-0.5">touch4xai</p>
                  <span className="text-[10px] text-orange-700">Folder: raw_datasets/</span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                    Account ID
                  </span>
                  <p className="text-xs font-bold text-slate-800 font-mono truncate mt-0.5">
                    2752109d4d388476...
                  </p>
                  <a
                    href="https://dash.cloudflare.com/2752109d4d388476f42f329b6f68c629/r2/default/buckets/touch4xai"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-orange-600 hover:underline inline-flex items-center gap-1 mt-0.5"
                  >
                    Open Dashboard <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-mono uppercase text-slate-500 font-bold block">
                    Upload Protocol
                  </span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">Presigned PUT (5m)</p>
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3" /> Token-safe edge upload
                  </span>
                </div>
              </div>

              {/* Single Test Action */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Pipeline Connection Test
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Status: {status?.configured ? 'Configured' : 'Ready'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleTestUpload}
                  disabled={isTesting}
                  className="w-full h-10 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Requesting Presigned Ticket...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>Test Presigned URL & Single Upload</span>
                    </>
                  )}
                </button>

                {testResult && (
                  <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs space-y-1 text-emerald-200 animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Direct Upload Verified!</span>
                    </div>
                    <p className="text-[11px] font-mono text-emerald-100 break-all">
                      Key: {testResult.objectKey}
                    </p>
                  </div>
                )}

                {testError && (
                  <div className="p-3 bg-rose-950/70 border border-rose-500/40 rounded-xl text-xs space-y-1 text-rose-200 animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold text-rose-300">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>Upload Issue</span>
                    </div>
                    <p className="text-[11px]">{testError}</p>
                  </div>
                )}
              </div>

              {/* Uploaded History Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Recent R2 Uploads (Bucket: touch4xai)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {uploadHistory.length} files logged
                  </span>
                </div>

                {uploadHistory.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs">
                    No files uploaded to Cloudflare R2 yet.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {uploadHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-800 truncate font-mono text-[11px]">
                            {item.filename}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {item.objectKey} · {(item.byteSize / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                            {item.simulated ? 'Simulated' : 'R2 Edge'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 3: SYSTEM ARCHITECTURE                          */}
          {/* ==================================================== */}
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-900 text-white font-mono text-xs space-y-2">
                <span className="text-orange-400 font-bold uppercase tracking-wider text-[11px] block">
                  3-Tier Presigned URL Direct Upload Pipeline
                </span>
                <pre className="text-[10px] text-slate-300 leading-relaxed overflow-x-auto p-2 bg-slate-950/60 rounded-xl">
{`┌─────────────────┐       1. Request Upload Ticket       ┌─────────────────────────┐
│                 │ ───────────────────────────────────> │  Cloudflare Worker      │
│  Touch4xAi PWA  │ <─────────────────────────────────── │  (Issues Presigned URL) │
│  (Client Edge)  │      2. Returns Presigned PUT        └─────────────────────────┘
│                 │
│                 │       3. Direct PUT Upload File Stream
│                 │ ──────────────────────────────────────────────────────────────┐
└─────────────────┘                                                               │
                                                                                  ▼
                                                            ┌───────────────────────────┐
                                                            │ Cloudflare R2 Bucket      │
                                                            │ (bucket: touch4xai)       │
                                                            └───────────────────────────┘`}
                </pre>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Zero Credential Exposure
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Browser clients never hold R2 access or secret tokens. Temporary presigned PUT tickets expire in 5 minutes.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-orange-600" />
                    High-Fidelity Metrology
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Stores raw time-domain audio samples, FFT Fourier spectrum arrays, 6-axis IMU kinematic vectors, and relative skin metrology anchors for LTM training.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================== */}
          {/* TAB 4: WORKER & CORS CONFIG                         */}
          {/* ==================================================== */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              {/* Custom Worker URL */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  Cloudflare Worker URL Endpoint (Optional):
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://touch4xai-r2-worker.<subdomain>.workers.dev"
                    value={workerUrl}
                    onChange={(e) => setWorkerUrl(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <button
                    onClick={handleSaveWorkerUrl}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {isSavedWorker ? <Check className="w-3.5 h-3.5" /> : null}
                    <span>{isSavedWorker ? 'Saved' : 'Save'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Leave blank to use the built-in applet proxy (<code>/api/get-upload-url</code>), or paste your deployed Worker URL.
                </p>
              </div>

              {/* Bucket CORS Policy Snippet */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-slate-600" />
                    touch4xai Bucket CORS Policy
                  </label>
                  <button
                    onClick={handleCopyCors}
                    className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copiedCors ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCors ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-600">
                  Paste this in <strong>Cloudflare R2 Dashboard &rarr; touch4xai &rarr; Settings &rarr; CORS Policy</strong>:
                </p>
                <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono overflow-x-auto leading-relaxed">
                  {corsSnippet}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <a
            href="https://dash.cloudflare.com/2752109d4d388476f42f329b6f68c629/r2/default/buckets/touch4xai"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-orange-600 font-semibold hover:underline flex items-center gap-1"
          >
            Open touch4xai Bucket <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
