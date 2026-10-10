import { BaselineSkinMetrics, DifferentialResult, ReferenceProfile } from '../types';

const STORAGE_KEY = 'touchxai_v6_baseline';
const REFERENCE_PROFILE_KEY = 'touchxai_active_reference';

// Default biological forearm skin reference values (Ashby Tactile Baseline)
export const DEFAULT_REFERENCE_PROFILE: ReferenceProfile = {
  id: 'ref-forearm-skin',
  name: 'Forearm Skin',
  material: 'Biological Tissue',
  textureValue: 2.8,
  hardnessValue: 1.4,
  densityValue: 1.5,
  isCalibrated: false,
  calibratedAt: 'Factory Standard',
};

// Common preset reference objects
export const PRESET_REFERENCES: ReferenceProfile[] = [
  {
    id: 'ref-forearm-skin',
    name: 'Forearm Skin',
    material: 'Biological Tissue',
    textureValue: 2.8,
    hardnessValue: 1.4,
    densityValue: 1.5,
    isCalibrated: false,
    calibratedAt: 'Standard Biological Baseline',
  },
  {
    id: 'ref-palm-skin',
    name: 'Palm Skin',
    material: 'Thick Epidermal Tissue',
    textureValue: 3.2,
    hardnessValue: 1.8,
    densityValue: 1.6,
    isCalibrated: false,
    calibratedAt: 'Palm Epidermis Standard',
  },
  {
    id: 'ref-glass-plate',
    name: 'Polished Glass',
    material: 'Silicate Glass',
    textureValue: 1.1,
    hardnessValue: 8.9,
    densityValue: 7.2,
    isCalibrated: false,
    calibratedAt: 'Optical Flat Baseline',
  },
  {
    id: 'ref-oak-wood',
    name: 'Hardwood Oak',
    material: 'Natural Hardwood',
    textureValue: 4.8,
    hardnessValue: 5.8,
    densityValue: 5.2,
    isCalibrated: false,
    calibratedAt: 'Seasoned Oak Standard',
  },
  {
    id: 'ref-steel-plate',
    name: 'Structural Steel',
    material: 'Carbon Steel',
    textureValue: 1.8,
    hardnessValue: 8.6,
    densityValue: 8.9,
    isCalibrated: false,
    calibratedAt: 'Tool Steel Baseline',
  },
];

export const DEFAULT_SKIN_BASELINE: BaselineSkinMetrics = {
  texture: {
    value: 2.8,
    centroid: 1100,
    rmsDb: -42.0,
    vSlideMeanCms: 18.5,
    timestamp: 'Default Forearm Baseline',
  },
  hardness: {
    value: 1.4,
    contactLagMs: 28.0,
    dominantHarmonicHz: 220,
    dampingRatio: '0.44 ζ',
    rmsDb: -38.5,
    timestamp: 'Default Forearm Baseline',
  },
  density: {
    value: 1.5,
    dominantHarmonicHz: 160,
    impedanceZ: '1.6 × 10⁵ kg/(m²·s)',
    avgDb: -44.0,
    timestamp: 'Default Forearm Baseline',
  },
  calibratedAt: undefined,
  isCalibrated: false,
};

/**
 * Retrieves the currently active reference profile
 */
export function getActiveReference(): ReferenceProfile {
  try {
    const raw = localStorage.getItem(REFERENCE_PROFILE_KEY);
    if (!raw) return DEFAULT_REFERENCE_PROFILE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_REFERENCE_PROFILE,
      ...parsed,
    };
  } catch {
    return DEFAULT_REFERENCE_PROFILE;
  }
}

/**
 * Sets and saves the active reference profile
 */
export function setActiveReference(profile: ReferenceProfile): ReferenceProfile {
  try {
    localStorage.setItem(REFERENCE_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to persist reference profile:', e);
  }
  return profile;
}

/**
 * Updates a specific calibration parameter on the active reference profile
 * Setting this measured value as the 0% reference!
 */
export function updateActiveReferenceBaseline(
  mode: 'texture' | 'hardness' | 'density',
  measuredValue: number,
  customName?: string
): ReferenceProfile {
  const current = getActiveReference();
  const now = new Date().toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const updated: ReferenceProfile = {
    ...current,
    name: customName || current.name,
    isCalibrated: true,
    calibratedAt: now,
  };

  if (mode === 'texture') {
    updated.textureValue = parseFloat(measuredValue.toFixed(1));
  } else if (mode === 'hardness') {
    updated.hardnessValue = parseFloat(measuredValue.toFixed(1));
  } else if (mode === 'density') {
    updated.densityValue = parseFloat(measuredValue.toFixed(1));
  }

  setActiveReference(updated);
  return updated;
}

/**
 * Retrieves persisted forearm skin baseline from localStorage (backward compatibility)
 */
export function getBaselineData(): BaselineSkinMetrics {
  const activeRef = getActiveReference();
  return {
    texture: {
      value: activeRef.textureValue,
      centroid: 1100,
      rmsDb: -42.0,
      vSlideMeanCms: 18.5,
      timestamp: activeRef.calibratedAt || 'Default Reference',
    },
    hardness: {
      value: activeRef.hardnessValue,
      contactLagMs: 28.0,
      dominantHarmonicHz: 220,
      dampingRatio: '0.44 ζ',
      rmsDb: -38.5,
      timestamp: activeRef.calibratedAt || 'Default Reference',
    },
    density: {
      value: activeRef.densityValue,
      dominantHarmonicHz: 160,
      impedanceZ: '1.6 × 10⁵ kg/(m²·s)',
      avgDb: -44.0,
      timestamp: activeRef.calibratedAt || 'Default Reference',
    },
    calibratedAt: activeRef.calibratedAt,
    isCalibrated: activeRef.isCalibrated,
  };
}

/**
 * Saves calibrated reference parameters for a specific mode
 */
export function saveBaselineModeData(
  mode: 'texture' | 'hardness' | 'density',
  features: {
    value: number;
    centroid?: number;
    rmsDb?: number;
    dominantHarmonicHz?: number;
    dampingRatio?: string;
    contactLagMs?: number;
    vSlideMeanCms?: number;
    impedanceZ?: string;
  }
): BaselineSkinMetrics {
  updateActiveReferenceBaseline(mode, features.value);
  return getBaselineData();
}

/**
 * Resets reference back to factory standard
 */
export function resetBaselineData(): void {
  try {
    localStorage.removeItem(REFERENCE_PROFILE_KEY);
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to reset baseline:', e);
  }
}

/**
 * Calculates relative differential percentage with UNLIMITED positive range
 * e.g., +1,250% compared with the reference (Forearm Skin, Palm Skin, Glass, etc.).
 *
 * Formula: ((testScore - baseVal) / baseVal) * 100%
 * Minimum bounded at -100% (zero property), Positive is UNLIMITED.
 */
export function calculateDifferentialPercentage(
  mode: 'texture' | 'hardness' | 'density' | 'calibration',
  testScore: number,
  customBaselineScore?: number,
  customReferenceName?: string
): DifferentialResult {
  const activeMode = mode === 'calibration' ? 'hardness' : mode;
  const activeRef = getActiveReference();
  const refName = customReferenceName || activeRef.name;

  let baseVal = customBaselineScore;
  if (baseVal === undefined || baseVal === null) {
    if (activeMode === 'texture') baseVal = activeRef.textureValue || 2.8;
    else if (activeMode === 'hardness') baseVal = activeRef.hardnessValue || 1.4;
    else baseVal = activeRef.densityValue || 1.5;
  }

  // Prevent divide-by-zero
  if (baseVal <= 0.05) baseVal = 0.1;

  // Compute differential percentage relative to reference
  const diffRaw = ((testScore - baseVal) / baseVal) * 100;

  // Unbounded on top (+1,250%), minimum -100%
  const diffPercent = Math.max(-100, Math.round(diffRaw));
  const absDiff = Math.abs(diffPercent);

  // Dynamic auto-adjusted scale range (e.g. 1500 for +1250%, 500 for +380%, 100 for small differences)
  const maxScaleRange = Math.max(100, Math.ceil((Math.max(100, absDiff) * 1.25) / 100) * 100);

  // Format with thousand separator
  const formattedPercent = diffPercent.toLocaleString();

  let label = '';
  if (activeMode === 'texture') {
    if (absDiff <= 3) {
      label = `Identical to ${refName} texture (0% Reference)`;
    } else if (diffPercent > 0) {
      label = `+${formattedPercent}% rougher than ${refName} (Reference)`;
    } else {
      label = `-${absDiff.toLocaleString()}% smoother than ${refName} (Reference)`;
    }
  } else if (activeMode === 'hardness') {
    if (absDiff <= 3) {
      label = `Identical to ${refName} firmness (0% Reference)`;
    } else if (diffPercent > 0) {
      label = `+${formattedPercent}% harder than ${refName} (Reference)`;
    } else {
      label = `-${absDiff.toLocaleString()}% softer than ${refName} (Reference)`;
    }
  } else {
    if (absDiff <= 3) {
      label = `Identical to ${refName} density (0% Reference)`;
    } else if (diffPercent > 0) {
      label = `+${formattedPercent}% denser than ${refName} (Reference)`;
    } else {
      label = `-${absDiff.toLocaleString()}% lighter than ${refName} (Reference)`;
    }
  }

  return {
    differentialPercent: diffPercent,
    displayLabel: label,
    baselineValue: parseFloat(baseVal.toFixed(1)),
    testValue: parseFloat(testScore.toFixed(1)),
    baselineName: refName,
    baselineType: 'reference_object',
    baselineDate: activeRef.calibratedAt,
    parameterUnit: `% vs ${refName}`,
    maxScaleRange,
    comparisonCategory:
      activeMode === 'texture'
        ? diffPercent > 0 ? 'Rougher Surface' : 'Smoother Surface'
        : activeMode === 'hardness'
        ? diffPercent > 0 ? 'Harder Solid' : 'Softer Viscoelastic'
        : diffPercent > 0 ? 'Denser Structure' : 'Lighter Cellular',
  };
}
