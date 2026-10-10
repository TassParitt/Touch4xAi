import React from 'react';
import { AcousticAnalysisResult, SavedRecord } from '../types';
import { TrendingUp, TrendingDown, Minus, LineChart, History, CheckCircle2 } from 'lucide-react';

interface TrendAnalysisCardProps {
  currentResult: AcousticAnalysisResult;
  allRecords: (AcousticAnalysisResult | SavedRecord)[];
}

export const TrendAnalysisCard: React.FC<TrendAnalysisCardProps> = ({
  currentResult,
  allRecords,
}) => {
  // Normalize comparison by object name & measurement mode
  const currentKey = currentResult.objectName.trim().toLowerCase();
  const currentMode = currentResult.mode;

  // Filter matching records for this object type & mode
  const matchingPastRecords = allRecords.filter(
    (r) =>
      r.id !== currentResult.id &&
      r.objectName.trim().toLowerCase() === currentKey &&
      r.mode === currentMode
  );

  // Combine current measurement as the latest, followed by past matching ones, up to 5 items
  const recentRuns = [currentResult, ...matchingPastRecords].slice(0, 5);
  const sampleCount = recentRuns.length;

  // Calculate average of the last (up to) 5 measurements
  const sumScores = recentRuns.reduce((acc, item) => acc + item.score, 0);
  const averageScore = parseFloat((sumScores / sampleCount).toFixed(1));

  // Calculate variance / consistency
  const variance =
    sampleCount > 1
      ? Math.sqrt(
          recentRuns.reduce((acc, r) => acc + Math.pow(r.score - averageScore, 2), 0) /
            sampleCount
        )
      : 0;
  const consistencyPercent = Math.max(85, Math.min(99, Math.round(100 - variance * 8)));

  // Delta between current score and rolling average
  const delta = parseFloat((currentResult.score - averageScore).toFixed(1));

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
            <LineChart className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              5-Run Trend Analysis
            </h3>
            <p className="text-[11px] text-slate-500">
              Rolling average for <strong className="text-slate-700 font-medium">{currentResult.objectName}</strong> ({currentMode})
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
          {sampleCount} of 5 runs
        </span>
      </div>

      {/* Average Score Banner */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
            5-Run Rolling Average
          </span>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-3xl font-black font-mono text-slate-950 tabular-nums">
              {averageScore.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-slate-400 font-mono">/ 10</span>
          </div>
        </div>

        {/* Delta and Repeatability Indicators */}
        <div className="flex flex-col items-end gap-1 text-right">
          <div
            className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md ${
              delta === 0
                ? 'bg-slate-100 text-slate-700'
                : delta > 0
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-rose-50 text-rose-700'
            }`}
          >
            {delta === 0 ? (
              <Minus className="w-3 h-3" />
            ) : delta > 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>
              {delta > 0 ? `+${delta.toFixed(1)}` : delta < 0 ? `${delta.toFixed(1)}` : 'Stable (0.0)'} vs Avg
            </span>
          </div>

          <span className="text-[10px] text-slate-500 font-medium">
            Repeatability: <strong className="text-slate-700 font-semibold">{consistencyPercent}%</strong> (±{variance.toFixed(2)})
          </span>
        </div>
      </div>

      {/* 1 - 10 Scale Bar for the Average */}
      <div className="space-y-1.5 pt-1">
        <div className="flex justify-between text-[11px] text-slate-600 font-semibold">
          <span>Average Scale:</span>
          <span className="font-mono text-slate-800">{averageScore.toFixed(1)} / 10.0</span>
        </div>

        {/* Graduated Bar */}
        <div className="relative w-full h-6 bg-slate-200/80 rounded-xl overflow-hidden p-1 flex items-center">
          {/* Average fill */}
          <div
            className={`h-full rounded-lg transition-all duration-700 ${
              currentMode === 'texture'
                ? 'bg-teal-600'
                : currentMode === 'hardness'
                ? 'bg-sky-600'
                : 'bg-rose-600'
            }`}
            style={{ width: `${(averageScore / 10) * 100}%` }}
          />

          {/* Marker Pin for Average */}
          <div
            className="absolute top-0 bottom-0 w-1 bg-slate-950 transition-all duration-700 shadow-sm"
            style={{ left: `${(averageScore / 10) * 100}%` }}
          />
        </div>

        {/* Scale Ticks */}
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

      {/* Individual Run Chips (Pills of the last 5 measurements) */}
      <div className="pt-2 border-t border-slate-100">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
          Run History ({sampleCount} data points):
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {recentRuns.map((run, idx) => (
            <div
              key={run.id || idx}
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1.5 shrink-0 ${
                idx === 0
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <span className={`text-[10px] ${idx === 0 ? 'text-teal-300 font-bold' : 'text-slate-400'}`}>
                #{idx + 1}
              </span>
              <span className="font-bold">{run.score.toFixed(1)}</span>
              {idx === 0 && <span className="text-[9px] uppercase tracking-wider text-teal-400">(Latest)</span>}
            </div>
          ))}

          {sampleCount < 5 && (
            <span className="text-[10px] text-slate-400 italic pl-1 shrink-0">
              +{5 - sampleCount} more {5 - sampleCount === 1 ? 'measurement' : 'measurements'} to complete 5-run window
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
