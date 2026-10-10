import React, { useState, useMemo } from 'react';
import {
  X,
  Smartphone,
  Cloud,
  Trash2,
  Calendar,
  Activity,
  Check,
  CheckSquare,
  Square,
  FileSpreadsheet,
  Download,
  Search,
  SlidersHorizontal,
  Sparkles,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { SavedRecord, MeasureMode } from '../types';
import { buildDspParameters } from '../lib/acousticDsp';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  records: SavedRecord[];
  onDeleteRecord: (id: string) => void;
  onSelectRecord: (record: SavedRecord) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  records,
  onDeleteRecord,
  onSelectRecord,
}) => {
  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | MeasureMode>('all');
  const [isExportSuccess, setIsExportSuccess] = useState(false);

  // Filter records based on search query and mode
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        rec.objectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.descriptor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.mode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rec.deviceModel?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesMode = filterMode === 'all' || rec.mode === filterMode;

      return matchesSearch && matchesMode;
    });
  }, [records, searchQuery, filterMode]);

  // Selection helpers
  const isAllFilteredSelected =
    filteredRecords.length > 0 &&
    filteredRecords.every((r) => selectedIds.has(r.id));

  const toggleSelectRecord = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
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
    if (isAllFilteredSelected) {
      // Clear selection of currently filtered records
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredRecords.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      // Select all currently filtered records
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

  /**
   * Generates and downloads a consolidated CSV file containing all selected measurements
   * (or all filtered records if none are explicitly checked).
   */
  const handleExportConsolidatedCsv = (exportAllFallback = false) => {
    const targetRecords =
      selectedIds.size > 0 && !exportAllFallback
        ? records.filter((r) => selectedIds.has(r.id))
        : filteredRecords;

    if (targetRecords.length === 0) return;

    const timestampIso = new Date().toISOString();
    const dateFormatted = timestampIso.slice(0, 10);
    const filename = `TouchxAi_V4_Consolidated_Measurements_${targetRecords.length}_records_${dateFormatted}.csv`;

    let csv = `### TOUCHXAI V4 (SMART CONTACT) - CONSOLIDATED MEASUREMENTS DATASET ###\n`;
    csv += `Export_Timestamp,"${timestampIso}"\n`;
    csv += `Total_Records_Exported,${targetRecords.length}\n`;
    csv += `Generated_By,"TouchxAi V4 Acoustic Material Testing Suite"\n`;
    csv += `Export_Scope,"${selectedIds.size > 0 && !exportAllFallback ? 'Selected Measurements' : 'All Filtered Measurements'}"\n\n`;

    // 1. Consolidated Tabular Dataset (RFC-4180 standard for Pandas / Excel / R / MATLAB)
    csv += `### TABULAR MEASUREMENTS DATASET ###\n`;
    csv += `id,timestamp,object_name,mode,score_1_to_10,tactile_descriptor,dominant_harmonic,avg_dbfs,rms_energy_dbfs,spectral_centroid_hz,crest_factor,zero_crossing_rate_pct,peak_amplitude_dbfs,contact_duration_ms,spectral_rolloff_hz,high_freq_ratio_pct,quality_factor_q,thd_percent,acoustic_impedance_z,damping_ratio,confidence_percent,storage_vault,target_folder,device_sensor\n`;

    targetRecords.forEach((rec) => {
      const dominantFreq = parseInt(rec.dominantHarmonic?.replace(/[^0-9]/g, '') || '') || 1400;
      const computed = buildDspParameters(rec.mode, rec.score, rec.objectName, dominantFreq, rec.avgDb);
      const dsp = rec.dspParameters || computed.dsp;

      const row = [
        `"${rec.id}"`,
        `"${rec.timestamp}"`,
        `"${(rec.objectName || 'Unknown Sample').replace(/"/g, '""')}"`,
        `"${rec.mode}"`,
        rec.score.toFixed(1),
        `"${(rec.descriptor || '').replace(/"/g, '""')}"`,
        `"${rec.dominantHarmonic || ''}"`,
        rec.avgDb !== undefined ? rec.avgDb.toFixed(1) : '-45.0',
        dsp.rmsDb.toFixed(1),
        dsp.spectralCentroid,
        dsp.crestFactor.toFixed(2),
        (dsp.zeroCrossingRate * 100).toFixed(2),
        dsp.peakDb.toFixed(1),
        dsp.contactDurationMs.toFixed(1),
        dsp.spectralRolloff,
        (dsp.highFreqEnergyRatio * 100).toFixed(1),
        dsp.qualityFactorQ.toFixed(1),
        dsp.thdPercent.toFixed(1),
        `"${(dsp.acousticImpedanceZ || '').replace(/"/g, '""')}"`,
        `"${(dsp.dampingRatioZeta || rec.dampingRatio || '').replace(/"/g, '""')}"`,
        rec.confidencePercent || 95,
        `"${rec.storageType || 'phone'}"`,
        `"${(rec.targetFolder || '').replace(/"/g, '""')}"`,
        `"${(rec.deviceModel || 'Smartphone Acoustic Port').replace(/"/g, '""')}"`,
      ];

      csv += row.join(',') + '\n';
    });

    csv += `\n### STATISTICAL SUMMARY BY MEASUREMENT MODE ###\n`;
    csv += `mode,count,avg_score,min_score,max_score,avg_rms_dbfs,avg_spectral_centroid_hz\n`;

    (['texture', 'hardness', 'density'] as const).forEach((modeKey) => {
      const group = targetRecords.filter((r) => r.mode === modeKey);
      if (group.length > 0) {
        const avgScore = (group.reduce((acc, r) => acc + r.score, 0) / group.length).toFixed(2);
        const minScore = Math.min(...group.map((r) => r.score)).toFixed(1);
        const maxScore = Math.max(...group.map((r) => r.score)).toFixed(1);
        const avgRms = (
          group.reduce((acc, r) => acc + (r.dspParameters?.rmsDb ?? r.avgDb), 0) / group.length
        ).toFixed(1);
        const avgCentroid = Math.round(
          group.reduce((acc, r) => acc + (r.dspParameters?.spectralCentroid ?? 1400), 0) / group.length
        );

        csv += `"${modeKey}",${group.length},${avgScore},${minScore},${maxScore},${avgRms},${avgCentroid}\n`;
      }
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

    setIsExportSuccess(true);
    setTimeout(() => setIsExportSuccess(false), 2400);
  };

  if (!isOpen) return null;

  const selectedCount = selectedIds.size;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-lg h-full bg-white shadow-2xl flex flex-col border-l border-slate-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
              <Activity className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Saved Measurements</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                  {records.length} total
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Select multiple records to export as a single consolidated CSV dataset
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Mode Filters */}
        <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 space-y-2.5">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search measurements by object name or mode..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900"
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

          {/* Mode pills */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {(['all', 'texture', 'hardness', 'density'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setFilterMode(m)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                    filterMode === m
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Selection Toolbar Stats */}
            <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500 shrink-0">
              <span>{filteredRecords.length} visible</span>
            </div>
          </div>

          {/* Multi-Selection Action Strip */}
          {filteredRecords.length > 0 && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-semibold text-[11px] transition-colors"
              >
                {isAllFilteredSelected ? (
                  <CheckSquare className="w-4 h-4 text-teal-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>
                  {isAllFilteredSelected ? 'Deselect All' : `Select All Visible (${filteredRecords.length})`}
                </span>
              </button>

              {selectedCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-full">
                    {selectedCount} selected
                  </span>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-[10px] text-slate-500 hover:text-slate-800 underline transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Record List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredRecords.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-slate-400 p-6">
              <Activity className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
              <p className="text-xs font-semibold text-slate-600">
                {records.length === 0
                  ? 'No saved measurements yet'
                  : 'No measurements matching filter'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                {records.length === 0
                  ? 'Complete a measurement of texture, hardness, or density and save it to phone or cloud.'
                  : 'Try clearing the search query or switching the mode filter.'}
              </p>
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const isSelected = selectedIds.has(rec.id);

              return (
                <div
                  key={rec.id}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col gap-2 relative ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50/30 shadow-xs ring-1 ring-teal-500/50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Multi-Selection Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => toggleSelectRecord(rec.id, e)}
                      className="mt-0.5 text-slate-400 hover:text-teal-600 transition-colors shrink-0"
                      title={isSelected ? 'Deselect record' : 'Select record for CSV export'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-teal-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300 hover:text-slate-400" />
                      )}
                    </button>

                    {/* Card Title & Info (Click opens record) */}
                    <div
                      className="cursor-pointer flex-1 min-w-0"
                      onClick={() => {
                        onSelectRecord(rec);
                        onClose();
                      }}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] uppercase font-bold text-teal-700 tracking-wider">
                          {rec.mode}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(rec.timestamp).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 truncate mt-0.5">
                        {rec.objectName}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        {rec.descriptor || 'Calibrated Contact Measurement'}
                      </p>
                    </div>

                    {/* Score display */}
                    <div className="flex items-center gap-1 shrink-0 text-right">
                      <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
                        {rec.score.toFixed(1)}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">/10</span>
                    </div>
                  </div>

                  {/* Visualizer Snapshot Thumbnail */}
                  {rec.visualizerSnapshot && (
                    <div
                      className="w-full h-14 rounded-xl overflow-hidden border border-slate-200/90 bg-slate-950 cursor-pointer relative group"
                      onClick={() => {
                        onSelectRecord(rec);
                        onClose();
                      }}
                      title="Click to view full measurement report"
                    >
                      <img
                        src={rec.visualizerSnapshot}
                        alt={rec.objectName}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                    </div>
                  )}

                  {/* Score bar */}
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-linear-to-r from-teal-500 to-sky-600 h-full rounded-full"
                      style={{ width: `${(rec.score / 10) * 100}%` }}
                    />
                  </div>

                  {/* Footer Meta & Actions */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1 truncate max-w-[200px]">
                      {rec.storageType === 'phone' ? (
                        <Smartphone className="w-3 h-3 text-slate-500 shrink-0" />
                      ) : (
                        <Cloud className="w-3 h-3 text-sky-600 shrink-0" />
                      )}
                      <span className="truncate">{rec.targetFolder || 'Internal Storage'}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onDeleteRecord(rec.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Action Bar with Consolidated CSV Export */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
          {/* Main Consolidated Export Button */}
          <button
            type="button"
            onClick={() => handleExportConsolidatedCsv(false)}
            disabled={filteredRecords.length === 0}
            className={`w-full h-11 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
              isExportSuccess
                ? 'bg-emerald-600 text-white'
                : selectedCount > 0
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            } disabled:opacity-50 disabled:pointer-events-none`}
            title="Download consolidated CSV containing selected measurements for Excel, Python Pandas, and statistical analysis"
          >
            {isExportSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-100" />
                <span>Consolidated CSV Exported!</span>
              </>
            ) : selectedCount > 0 ? (
              <>
                <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                <span>
                  Export {selectedCount} Selected {selectedCount === 1 ? 'Measurement' : 'Measurements'} to CSV
                </span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 text-teal-300" />
                <span>Export All ({filteredRecords.length}) to Consolidated CSV</span>
              </>
            )}
          </button>

          {/* Quick Subtext Info */}
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono px-1">
            <span>RFC-4180 Dataset Format</span>
            <span className="flex items-center gap-1 text-teal-700 font-semibold">
              <CheckCircle2 className="w-3 h-3 text-teal-600" />
              Includes all 12 DSP physical metrics
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
