import React, { useState, useMemo } from 'react';
import {
  Grid,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  Crosshair,
  Compass,
  Cpu,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { AcousticAnalysisResult } from '../types';
import {
  REFERENCE_MATERIALS,
  ReferenceMaterial,
  MaterialCategory,
  calculateSamplePropertyIntersection,
  findNearestMaterialMatches,
  MeasuredIntersection,
} from '../lib/materialDatabase';

interface MaterialHeatmapProps {
  currentResult: AcousticAnalysisResult;
  priorRecords?: AcousticAnalysisResult[];
  className?: string;
}

type PlaneType = 'hardness_vs_texture' | 'hardness_vs_density' | 'density_vs_texture';

export const MaterialHeatmap: React.FC<MaterialHeatmapProps> = ({
  currentResult,
  priorRecords = [],
  className = '',
}) => {
  const [activePlane, setActivePlane] = useState<PlaneType>('hardness_vs_texture');
  const [categoryFilter, setCategoryFilter] = useState<'all' | MaterialCategory>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<ReferenceMaterial | null>(null);

  // Compute 3D property intersection
  const intersection: MeasuredIntersection = useMemo(() => {
    return calculateSamplePropertyIntersection(currentResult, priorRecords);
  }, [currentResult, priorRecords]);

  // Compute nearest neighbor matches
  const nearestMatches = useMemo(() => {
    return findNearestMaterialMatches(intersection, activePlane, categoryFilter);
  }, [intersection, activePlane, categoryFilter]);

  const topMatch = nearestMatches[0];

  // Axis labels and coordinates based on active plane
  const planeConfig = useMemo(() => {
    if (activePlane === 'hardness_vs_texture') {
      return {
        xLabel: 'Hardness (Impulse Rigidity)',
        yLabel: 'Texture (Surface Friction)',
        xVal: intersection.hardness,
        yVal: intersection.texture,
        getX: (m: ReferenceMaterial) => m.hardness,
        getY: (m: ReferenceMaterial) => m.texture,
        xMinLabel: '1.0 Soft Elastomer',
        xMaxLabel: '10.0 Hard Carbide',
        yMinLabel: '1.0 Mirror Glass',
        yMaxLabel: '10.0 Rough Sandpaper',
      };
    } else if (activePlane === 'hardness_vs_density') {
      return {
        xLabel: 'Hardness (Impulse Rigidity)',
        yLabel: 'Acoustic Density (Impedance Z)',
        xVal: intersection.hardness,
        yVal: intersection.density,
        getX: (m: ReferenceMaterial) => m.hardness,
        getY: (m: ReferenceMaterial) => m.density,
        xMinLabel: '1.0 Soft Elastomer',
        xMaxLabel: '10.0 Hard Carbide',
        yMinLabel: '1.0 Gas-Filled Foam',
        yMaxLabel: '10.0 Dense Metal/Stone',
      };
    } else {
      return {
        xLabel: 'Acoustic Density (Impedance Z)',
        yLabel: 'Texture (Surface Friction)',
        xVal: intersection.density,
        yVal: intersection.texture,
        getX: (m: ReferenceMaterial) => m.density,
        getY: (m: ReferenceMaterial) => m.texture,
        xMinLabel: '1.0 Gas-Filled Foam',
        xMaxLabel: '10.0 Dense Metal/Stone',
        yMinLabel: '1.0 Mirror Glass',
        yMaxLabel: '10.0 Rough Sandpaper',
      };
    }
  }, [activePlane, intersection]);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      all: REFERENCE_MATERIALS.length,
      metals: REFERENCE_MATERIALS.filter((m) => m.category === 'metals').length,
      polymers: REFERENCE_MATERIALS.filter((m) => m.category === 'polymers').length,
      ceramics: REFERENCE_MATERIALS.filter((m) => m.category === 'ceramics').length,
      woods: REFERENCE_MATERIALS.filter((m) => m.category === 'woods').length,
      elastomers: REFERENCE_MATERIALS.filter((m) => m.category === 'elastomers').length,
    };
  }, []);

  // Filtered materials for SVG scatter
  const displayedMaterials = useMemo(() => {
    return categoryFilter === 'all'
      ? REFERENCE_MATERIALS
      : REFERENCE_MATERIALS.filter((m) => m.category === categoryFilter);
  }, [categoryFilter]);

  // Convert (1.0 - 10.0) coordinate to SVG viewBox (50 to 450 X, 450 to 50 Y)
  const toSvgCoords = (xVal: number, yVal: number) => {
    const normX = Math.max(1.0, Math.min(10.0, xVal));
    const normY = Math.max(1.0, Math.min(10.0, yVal));
    const svgX = 50 + ((normX - 1.0) / 9.0) * 400;
    const svgY = 450 - ((normY - 1.0) / 9.0) * 400;
    return { svgX, svgY };
  };

  const sampleCoords = toSvgCoords(planeConfig.xVal, planeConfig.yVal);

  return (
    <div className={`w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl text-left space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shadow-xs">
            <Compass className="w-4 h-4 text-teal-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Material Property Heatmap
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold">
                Ashby 2D Space
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Identifies unknown sample <strong className="text-slate-200">"{currentResult.objectName}"</strong> by mapping density, hardness, and texture intersection
            </p>
          </div>
        </div>

        {/* 3D Property Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono">
            <span className="text-slate-400">Hardness:</span>{' '}
            <strong className="text-teal-400">{intersection.hardness}</strong>
            <span className="text-slate-500 ml-1">({intersection.sourceConfidence.hardness})</span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono">
            <span className="text-slate-400">Texture:</span>{' '}
            <strong className="text-sky-400">{intersection.texture}</strong>
            <span className="text-slate-500 ml-1">({intersection.sourceConfidence.texture})</span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-[10px] font-mono">
            <span className="text-slate-400">Density:</span>{' '}
            <strong className="text-amber-400">{intersection.density}</strong>
            <span className="text-slate-500 ml-1">({intersection.sourceConfidence.density})</span>
          </div>
        </div>
      </div>

      {/* Plane Selection & Category Filter Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        {/* Plane Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActivePlane('hardness_vs_texture')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl transition-all ${
              activePlane === 'hardness_vs_texture'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Hardness vs. Texture
          </button>
          <button
            type="button"
            onClick={() => setActivePlane('hardness_vs_density')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl transition-all ${
              activePlane === 'hardness_vs_density'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Hardness vs. Density
          </button>
          <button
            type="button"
            onClick={() => setActivePlane('density_vs_texture')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl transition-all ${
              activePlane === 'density_vs_texture'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Density vs. Texture
          </button>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-[11px] font-mono">
          {(['all', 'metals', 'polymers', 'ceramics', 'woods', 'elastomers'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-2 py-1 rounded-lg border capitalize whitespace-nowrap transition-colors ${
                categoryFilter === cat
                  ? 'bg-slate-800 text-white border-slate-600 font-bold'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat} ({categoryCounts[cat]})
            </button>
          ))}
        </div>
      </div>

      {/* Main 2D Heatmap & Identification Display */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left: 2D Interactive Coordinate Heatmap (7 cols) */}
        <div className="lg:col-span-7 bg-[#060a14] rounded-2xl border border-slate-800 p-3 relative flex flex-col items-center">
          {/* Top Axis Banner */}
          <div className="w-full flex justify-between items-center text-[10px] font-mono text-slate-400 mb-1 px-1">
            <span className="text-teal-400 font-bold uppercase tracking-wider">{planeConfig.yLabel}</span>
            <span className="text-slate-500">{planeConfig.yMaxLabel} (10.0)</span>
          </div>

          {/* SVG 2D Ashby Grid */}
          <div className="w-full relative aspect-square max-h-[380px] rounded-xl overflow-hidden bg-[#070d1a] border border-slate-800/80">
            <svg className="w-full h-full" viewBox="0 0 500 500">
              <defs>
                {/* Background Heatmap Gradient Zones */}
                <radialGradient id="denseMetalsCluster" cx="80%" cy="20%" r="50%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                </radialGradient>
                <radialGradient id="polymersCluster" cx="45%" cy="65%" r="45%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </radialGradient>
                <radialGradient id="organicsCluster" cx="55%" cy="40%" r="40%">
                  <stop offset="0%" stopColor="#ca8a04" stopOpacity="0.2" />
                  <stop offset="100%" stopColor="#ca8a04" stopOpacity="0.0" />
                </radialGradient>
                <radialGradient id="foamCluster" cx="20%" cy="80%" r="45%">
                  <stop offset="0%" stopColor="#ec4899" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity="0.0" />
                </radialGradient>
              </defs>

              {/* Heatmap density contour backdrops */}
              <rect x="0" y="0" width="500" height="500" fill="#070c18" />
              <rect x="0" y="0" width="500" height="500" fill="url(#denseMetalsCluster)" />
              <rect x="0" y="0" width="500" height="500" fill="url(#polymersCluster)" />
              <rect x="0" y="0" width="500" height="500" fill="url(#organicsCluster)" />
              <rect x="0" y="0" width="500" height="500" fill="url(#foamCluster)" />

              {/* Grid Lines (1.0 to 10.0 in steps of 1.0) */}
              {[...Array(10)].map((_, i) => {
                const pos = 50 + (i / 9) * 400;
                return (
                  <g key={i}>
                    {/* Vertical grid line */}
                    <line x1={pos} y1={50} x2={pos} y2={450} stroke="#172554" strokeWidth="0.8" strokeDasharray="3 3" />
                    {/* Horizontal grid line */}
                    <line x1={50} y1={pos} x2={450} y2={pos} stroke="#172554" strokeWidth="0.8" strokeDasharray="3 3" />
                  </g>
                );
              })}

              {/* Axis borders */}
              <rect x="50" y="50" width="400" height="400" fill="none" stroke="#334155" strokeWidth="1.2" />

              {/* Region zone labels */}
              <text x="360" y="85" fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold" opacity="0.6">
                CERAMICS & METALS
              </text>
              <text x="65" y="435" fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold" opacity="0.6">
                ELASTOMERS & FOAMS
              </text>
              <text x="210" y="270" fill="#64748b" fontSize="10" fontFamily="monospace" fontWeight="bold" opacity="0.6">
                POLYMERS & WOODS
              </text>

              {/* Connector line between Measured Sample and Selected Material */}
              {selectedMaterial && (() => {
                const selCoords = toSvgCoords(planeConfig.getX(selectedMaterial), planeConfig.getY(selectedMaterial));
                return (
                  <g>
                    <line
                      x1={sampleCoords.svgX}
                      y1={sampleCoords.svgY}
                      x2={selCoords.svgX}
                      y2={selCoords.svgY}
                      stroke="#2dd4bf"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                    />
                    <circle
                      cx={(sampleCoords.svgX + selCoords.svgX) / 2}
                      cy={(sampleCoords.svgY + selCoords.svgY) / 2}
                      r="10"
                      fill="#0f172a"
                      stroke="#2dd4bf"
                      strokeWidth="1"
                    />
                    <text
                      x={(sampleCoords.svgX + selCoords.svgX) / 2}
                      y={(sampleCoords.svgY + selCoords.svgY) / 2 + 3}
                      fill="#2dd4bf"
                      fontSize="9"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      Δ
                    </text>
                  </g>
                );
              })()}

              {/* Scatter Points for Reference Materials */}
              {displayedMaterials.map((mat) => {
                const coords = toSvgCoords(planeConfig.getX(mat), planeConfig.getY(mat));
                const isSelected = selectedMaterial?.id === mat.id;
                const isTop1 = topMatch?.material.id === mat.id;

                return (
                  <g
                    key={mat.id}
                    onClick={() => setSelectedMaterial(mat)}
                    className="cursor-pointer group"
                  >
                    {/* Pulsing ring for Top 1 Nearest Match */}
                    {isTop1 && (
                      <circle
                        cx={coords.svgX}
                        cy={coords.svgY}
                        r="12"
                        fill="none"
                        stroke="#eab308"
                        strokeWidth="1.5"
                        className="animate-ping"
                        opacity="0.75"
                      />
                    )}

                    {/* Outer hover ring */}
                    <circle
                      cx={coords.svgX}
                      cy={coords.svgY}
                      r={isSelected ? 10 : 7}
                      fill={isSelected ? '#38bdf8' : mat.color}
                      fillOpacity={isSelected ? 0.35 : 0.15}
                      stroke={mat.color}
                      strokeWidth={isSelected ? 2 : 1.2}
                      className="transition-all duration-150"
                    />

                    {/* Center solid node */}
                    <circle
                      cx={coords.svgX}
                      cy={coords.svgY}
                      r={isSelected ? 5 : 3.8}
                      fill={mat.color}
                      stroke="#ffffff"
                      strokeWidth={1}
                    />

                    {/* Material Name Label */}
                    <text
                      x={coords.svgX + 8}
                      y={coords.svgY + 3}
                      fill={isSelected ? '#ffffff' : '#94a3b8'}
                      fontSize="9"
                      fontFamily="sans-serif"
                      fontWeight={isSelected ? 'bold' : 'normal'}
                      className="pointer-events-none select-none transition-colors"
                    >
                      {mat.name.split(' ')[0]}
                    </text>
                  </g>
                );
              })}

              {/* MEASURED OBJECT (CURRENT SAMPLE) RADAR PIN */}
              <g className="transition-all duration-300">
                {/* Confidence radius circle (0.8 scale unit) */}
                <circle
                  cx={sampleCoords.svgX}
                  cy={sampleCoords.svgY}
                  r="35"
                  fill="rgba(45, 212, 191, 0.08)"
                  stroke="#2dd4bf"
                  strokeWidth="1"
                  strokeDasharray="4 3"
                />

                {/* Animated Pulsing Radar Beacon */}
                <circle
                  cx={sampleCoords.svgX}
                  cy={sampleCoords.svgY}
                  r="16"
                  fill="none"
                  stroke="#2dd4bf"
                  strokeWidth="2"
                  className="animate-ping"
                  opacity="0.8"
                />

                {/* Sample Pin Background */}
                <circle
                  cx={sampleCoords.svgX}
                  cy={sampleCoords.svgY}
                  r="9"
                  fill="#090d16"
                  stroke="#2dd4bf"
                  strokeWidth="2.5"
                />

                {/* Center Core */}
                <circle
                  cx={sampleCoords.svgX}
                  cy={sampleCoords.svgY}
                  r="4"
                  fill="#2dd4bf"
                />

                {/* Crosshair spikes */}
                <line x1={sampleCoords.svgX - 14} y1={sampleCoords.svgY} x2={sampleCoords.svgX - 10} y2={sampleCoords.svgY} stroke="#2dd4bf" strokeWidth="2" />
                <line x1={sampleCoords.svgX + 10} y1={sampleCoords.svgY} x2={sampleCoords.svgX + 14} y2={sampleCoords.svgY} stroke="#2dd4bf" strokeWidth="2" />
                <line x1={sampleCoords.svgX} y1={sampleCoords.svgY - 14} x2={sampleCoords.svgX} y2={sampleCoords.svgY - 10} stroke="#2dd4bf" strokeWidth="2" />
                <line x1={sampleCoords.svgX} y1={sampleCoords.svgY + 10} x2={sampleCoords.svgX} y2={sampleCoords.svgY + 14} stroke="#2dd4bf" strokeWidth="2" />

                {/* Floating Tag */}
                <g transform={`translate(${sampleCoords.svgX + 14}, ${sampleCoords.svgY - 18})`}>
                  <rect x="0" y="0" width="110" height="20" rx="6" fill="#0f172a" stroke="#2dd4bf" strokeWidth="1" />
                  <text x="6" y="13" fill="#2dd4bf" fontSize="9" fontWeight="bold" fontFamily="monospace">
                    ★ {currentResult.objectName.slice(0, 14)}
                  </text>
                </g>
              </g>
            </svg>
          </div>

          {/* Bottom Axis Label */}
          <div className="w-full flex justify-between items-center text-[10px] font-mono text-slate-400 mt-2 px-1">
            <span className="text-slate-500">(1.0) {planeConfig.xMinLabel}</span>
            <span className="text-teal-400 font-bold uppercase tracking-wider">{planeConfig.xLabel}</span>
            <span className="text-slate-500">{planeConfig.xMaxLabel} (10.0)</span>
          </div>

          {/* Legend */}
          <div className="w-full pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono flex-wrap gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-teal-400 border border-white" />
              <span className="text-teal-300 font-bold">Measured Sample</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Top Nearest Match</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              <span>Reference Material</span>
            </div>
          </div>
        </div>

        {/* Right: Unknown Sample Identification Verdict & Nearest Matches (5 cols) */}
        <div className="lg:col-span-5 space-y-3.5">
          {/* Top Prediction Verdict Card */}
          <div className="p-3.5 rounded-2xl bg-linear-to-br from-teal-950/60 to-slate-950 border border-teal-500/30 text-white space-y-2 shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                Sample Identification Verdict
              </span>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-[10px] font-mono font-bold">
                {topMatch?.similarityPercent}% Confidence
              </span>
            </div>

            <div>
              <p className="text-base font-extrabold text-white flex items-center gap-2">
                {topMatch?.material.name}
              </p>
              <p className="text-[11px] text-teal-200/90 font-medium mt-0.5">
                {topMatch?.material.descriptor}
              </p>
            </div>

            <p className="text-[10px] text-slate-300 font-mono leading-relaxed pt-1 border-t border-teal-900/60">
              {topMatch?.material.soundSignature}
            </p>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 font-mono">
              <span>Category: <strong className="text-slate-200 capitalize">{topMatch?.material.category}</strong></span>
              <span>Impedance: <strong className="text-teal-300">{topMatch?.material.acousticImpedanceZ}</strong></span>
            </div>
          </div>

          {/* Top 3 Closest Material Matches */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider font-mono block">
              Top 3 Material Neighbors:
            </span>

            {nearestMatches.slice(0, 3).map((match, idx) => {
              const isSelected = selectedMaterial?.id === match.material.id;

              return (
                <div
                  key={match.material.id}
                  onClick={() => setSelectedMaterial(match.material)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-slate-800/90 border-teal-400 ring-1 ring-teal-400'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center font-bold font-mono text-xs shrink-0"
                      style={{ backgroundColor: `${match.material.color}25`, color: match.material.color }}
                    >
                      #{idx + 1}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-200 truncate">
                          {match.material.name}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800 capitalize">
                          {match.material.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        H: {match.material.hardness} · T: {match.material.texture} · D: {match.material.density}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black font-mono text-teal-400 block">
                      {match.similarityPercent}%
                    </span>
                    <span className="text-[9px] font-mono text-slate-500">
                      Δ {match.distance.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Material Inspector Drawer / Card */}
          {selectedMaterial && (
            <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 text-left animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                  Material Inspector: {selectedMaterial.name}
                </span>
                <span className="text-[9px] font-mono capitalize px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-800">
                  {selectedMaterial.category}
                </span>
              </div>

              <p className="text-[11px] text-slate-300">
                <strong>Applications:</strong> {selectedMaterial.typicalApplications}
              </p>

              <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono">
                <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">Hardness</span>
                  <span className="text-xs font-bold text-teal-400">{selectedMaterial.hardness}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">Texture</span>
                  <span className="text-xs font-bold text-sky-400">{selectedMaterial.texture}</span>
                </div>
                <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800">
                  <span className="text-[9px] text-slate-400 block">Density</span>
                  <span className="text-xs font-bold text-amber-400">{selectedMaterial.density}</span>
                </div>
              </div>
            </div>
          )}

          {/* Physical Meaning Explainer */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[10px] text-slate-400 font-mono space-y-1">
            <span className="text-teal-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Unknown Sample Identification Logic
            </span>
            <p className="text-slate-400">
              The 3D intersection combines the contact impulse duration ($\Delta t$), resonant quality factor ($Q$), and friction spectral centroid ($f_c$) to pinpoint the mechanical boundary on the Ashby chart.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
