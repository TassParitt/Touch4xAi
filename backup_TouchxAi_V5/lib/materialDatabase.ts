import { MeasureMode, DspParameters, AcousticAnalysisResult } from '../types';

export type MaterialCategory = 'metals' | 'polymers' | 'ceramics' | 'woods' | 'elastomers';

export interface ReferenceMaterial {
  id: string;
  name: string;
  category: MaterialCategory;
  hardness: number; // 1.0 to 10.0
  texture: number;  // 1.0 to 10.0
  density: number;  // 1.0 to 10.0
  acousticImpedanceZ: string;
  typicalApplications: string;
  descriptor: string;
  color: string;
  soundSignature: string;
}

/**
 * Standard Materials Science Reference Database (Calibrated on the 1.0 - 10.0 Ashby scale)
 */
export const REFERENCE_MATERIALS: ReferenceMaterial[] = [
  // --- METALS & ALLOYS ---
  {
    id: 'mat_steel',
    name: 'Carbon Structural Steel',
    category: 'metals',
    hardness: 8.5,
    texture: 2.8,
    density: 8.2,
    acousticImpedanceZ: '4.5 × 10⁷ kg/(m²·s)',
    typicalApplications: 'Beams, machinery shafts, structural frameworks',
    descriptor: 'Rigid Elastic High-Reflection',
    color: '#64748b',
    soundSignature: 'High resonant chime, low acoustic damping',
  },
  {
    id: 'mat_al_6061',
    name: 'Aircraft Aluminum 6061',
    category: 'metals',
    hardness: 6.8,
    texture: 2.4,
    density: 6.0,
    acousticImpedanceZ: '1.7 × 10⁷ kg/(m²·s)',
    typicalApplications: 'Aerospace frames, laptop chassis, automotive',
    descriptor: 'Medium-Dense Fast Transmission',
    color: '#94a3b8',
    soundSignature: 'Clear high ring, moderate dissipation',
  },
  {
    id: 'mat_brass',
    name: 'Cartridge Brass (70/30)',
    category: 'metals',
    hardness: 7.2,
    texture: 2.2,
    density: 7.8,
    acousticImpedanceZ: '3.6 × 10⁷ kg/(m²·s)',
    typicalApplications: 'Musical instruments, plumbing, low-friction bushings',
    descriptor: 'Harmonic Ringing Resonant',
    color: '#f59e0b',
    soundSignature: 'Bright harmonic overtone stack',
  },
  {
    id: 'mat_titanium',
    name: 'Titanium Ti-6Al-4V',
    category: 'metals',
    hardness: 9.0,
    texture: 2.5,
    density: 7.4,
    acousticImpedanceZ: '2.7 × 10⁷ kg/(m²·s)',
    typicalApplications: 'Medical implants, aerospace turbines, armor',
    descriptor: 'Ultra-High Specific Modulus',
    color: '#38bdf8',
    soundSignature: 'Sharp transient burst with rapid decay',
  },
  {
    id: 'mat_copper',
    name: 'Pure Electrolytic Copper',
    category: 'metals',
    hardness: 5.6,
    texture: 2.3,
    density: 7.6,
    acousticImpedanceZ: '4.1 × 10⁷ kg/(m²·s)',
    typicalApplications: 'Busbars, heat sinks, electromagnetic shielding',
    descriptor: 'Malleable Dense Boundary',
    color: '#f97316',
    soundSignature: 'Mellow resonance with fast dissipation',
  },
  {
    id: 'mat_lead',
    name: 'Cast Lead',
    category: 'metals',
    hardness: 3.2,
    texture: 2.1,
    density: 8.8,
    acousticImpedanceZ: '2.4 × 10⁷ kg/(m²·s)',
    typicalApplications: 'Radiation shielding, acoustic dampening sheets',
    descriptor: 'High-Density Dead Thud',
    color: '#475569',
    soundSignature: 'Near zero ringing, complete plastic absorption',
  },

  // --- POLYMERS & PLASTICS ---
  {
    id: 'mat_polycarbonate',
    name: 'Polycarbonate (Lexan)',
    category: 'polymers',
    hardness: 6.5,
    texture: 2.0,
    density: 4.1,
    acousticImpedanceZ: '2.6 × 10⁶ kg/(m²·s)',
    typicalApplications: 'Safety goggles, bullet-resistant barriers, phone cases',
    descriptor: 'Tough Impact-Resistant Polymer',
    color: '#3b82f6',
    soundSignature: 'Solid snap with brief mid-frequency body',
  },
  {
    id: 'mat_acrylic',
    name: 'Cast Acrylic (PMMA)',
    category: 'polymers',
    hardness: 6.9,
    texture: 1.6,
    density: 4.3,
    acousticImpedanceZ: '3.2 × 10⁶ kg/(m²·s)',
    typicalApplications: 'Display cases, optical lenses, decorative signage',
    descriptor: 'Vitreous Rigid Polymer',
    color: '#6366f1',
    soundSignature: 'Brittle glassy click, high spectral centroid',
  },
  {
    id: 'mat_hdpe',
    name: 'High-Density Polyethylene (HDPE)',
    category: 'polymers',
    hardness: 4.8,
    texture: 2.6,
    density: 3.1,
    acousticImpedanceZ: '2.3 × 10⁶ kg/(m²·s)',
    typicalApplications: 'Chemical containers, cutting boards, piping',
    descriptor: 'Semi-Crystalline Viscoelastic',
    color: '#06b6d4',
    soundSignature: 'Damped hollow tap with low harmonic distortion',
  },
  {
    id: 'mat_nylon',
    name: 'Nylon 6/6 Polyamide',
    category: 'polymers',
    hardness: 5.9,
    texture: 3.4,
    density: 3.6,
    acousticImpedanceZ: '2.9 × 10⁶ kg/(m²·s)',
    typicalApplications: 'Gears, cable ties, automotive mechanical components',
    descriptor: 'Wear-Resistant Sliding Polymer',
    color: '#0ea5e9',
    soundSignature: 'Firm plastic impact with moderate damping',
  },
  {
    id: 'mat_teflon',
    name: 'PTFE Teflon',
    category: 'polymers',
    hardness: 3.8,
    texture: 1.4,
    density: 3.3,
    acousticImpedanceZ: '1.9 × 10⁶ kg/(m²·s)',
    typicalApplications: 'Non-stick coatings, chemical gaskets, labware',
    descriptor: 'Ultra-Low Friction Lubricous',
    color: '#2dd4bf',
    soundSignature: 'Extremely silent slide, nearly silent asperities',
  },

  // --- CERAMICS, MINERALS & GLASS ---
  {
    id: 'mat_float_glass',
    name: 'Silica Float Glass',
    category: 'ceramics',
    hardness: 8.8,
    texture: 1.1,
    density: 6.4,
    acousticImpedanceZ: '1.4 × 10⁷ kg/(m²·s)',
    typicalApplications: 'Windows, optical displays, smartphone screens',
    descriptor: 'Specular Vitreous Surface',
    color: '#0284c7',
    soundSignature: 'Piercing high-pitch ping, zero friction roughness',
  },
  {
    id: 'mat_glazed_porcelain',
    name: 'Glazed Technical Ceramic',
    category: 'ceramics',
    hardness: 8.6,
    texture: 1.8,
    density: 6.8,
    acousticImpedanceZ: '1.9 × 10⁷ kg/(m²·s)',
    typicalApplications: 'Tiles, electrical insulators, tableware',
    descriptor: 'Impervious Vitrified Mineral',
    color: '#0d9488',
    soundSignature: 'Crystalline crisp transient, high Q resonance',
  },
  {
    id: 'mat_granite',
    name: 'Natural Granite Stone',
    category: 'ceramics',
    hardness: 8.2,
    texture: 5.4,
    density: 7.5,
    acousticImpedanceZ: '1.6 × 10⁷ kg/(m²·s)',
    typicalApplications: 'Countertops, metrology surface plates, building facades',
    descriptor: 'Massive Crystalline Mineral Aggregate',
    color: '#78716c',
    soundSignature: 'Deep resonant tone coupled with micro-granite roughness',
  },
  {
    id: 'mat_marble',
    name: 'Polished Marble Stone',
    category: 'ceramics',
    hardness: 7.6,
    texture: 2.9,
    density: 7.0,
    acousticImpedanceZ: '1.5 × 10⁷ kg/(m²·s)',
    typicalApplications: 'Sculpture, flooring, monumental architecture',
    descriptor: 'Metamorphic Calcite Dense Matrix',
    color: '#a8a29e',
    soundSignature: 'Solid clack with slight internal acoustic dissipation',
  },
  {
    id: 'mat_concrete',
    name: 'Cured Portland Concrete',
    category: 'ceramics',
    hardness: 7.0,
    texture: 7.4,
    density: 6.2,
    acousticImpedanceZ: '8.5 × 10⁶ kg/(m²·s)',
    typicalApplications: 'Pavements, foundations, structural retaining walls',
    descriptor: 'Coarse Asperity Porous Solid',
    color: '#57534e',
    soundSignature: 'Gritty friction scrape with broad multi-band noise',
  },

  // --- WOODS & ORGANICS ---
  {
    id: 'mat_oak',
    name: 'White Oak Hardwood',
    category: 'woods',
    hardness: 6.3,
    texture: 5.2,
    density: 4.8,
    acousticImpedanceZ: '3.4 × 10⁶ kg/(m²·s)',
    typicalApplications: 'Flooring, acoustic guitar bodies, barrels, furniture',
    descriptor: 'Cellular Lignin Organic Resonator',
    color: '#ca8a04',
    soundSignature: 'Rich warm acoustic timbre, pleasant resonant decay',
  },
  {
    id: 'mat_pine',
    name: 'Scots Pine Softwood',
    category: 'woods',
    hardness: 4.4,
    texture: 5.7,
    density: 3.2,
    acousticImpedanceZ: '2.1 × 10⁶ kg/(m²·s)',
    typicalApplications: 'Framing studs, acoustic soundboards (spruce/pine)',
    descriptor: 'Fibrous Grain Anisotropic',
    color: '#eab308',
    soundSignature: 'Airy hollow thump, moderate grain friction',
  },
  {
    id: 'mat_bamboo',
    name: 'Laminated Bamboo Composite',
    category: 'woods',
    hardness: 6.7,
    texture: 4.6,
    density: 4.6,
    acousticImpedanceZ: '3.6 × 10⁶ kg/(m²·s)',
    typicalApplications: 'Cutting boards, bike frames, architectural flooring',
    descriptor: 'Dense Fibrous Vascular Solid',
    color: '#84cc16',
    soundSignature: 'Crisp woody clack, higher pitch than softwood',
  },
  {
    id: 'mat_balsa',
    name: 'Lightweight Balsa Wood',
    category: 'woods',
    hardness: 2.2,
    texture: 5.9,
    density: 1.8,
    acousticImpedanceZ: '5.2 × 10⁵ kg/(m²·s)',
    typicalApplications: 'Model airplanes, wind turbine blade cores, insulation',
    descriptor: 'Ultralight Honeycomb Cellular',
    color: '#fde047',
    soundSignature: 'Featherlight tap with quick air decay',
  },
  {
    id: 'mat_leather',
    name: 'Tanned Full-Grain Leather',
    category: 'woods',
    hardness: 3.1,
    texture: 6.8,
    density: 2.8,
    acousticImpedanceZ: '1.2 × 10⁶ kg/(m²·s)',
    typicalApplications: 'Footwear, upholstery, protective apparel',
    descriptor: 'Fibrous Collagen Damped Layer',
    color: '#b45309',
    soundSignature: 'Soft muffled rub, high friction drag',
  },

  // --- ELASTOMERS & FOAMS ---
  {
    id: 'mat_silicone',
    name: 'Solid Silicone Rubber',
    category: 'elastomers',
    hardness: 2.4,
    texture: 5.0,
    density: 2.5,
    acousticImpedanceZ: '1.1 × 10⁶ kg/(m²·s)',
    typicalApplications: 'Kitchen utensils, medical tubes, sealing gaskets',
    descriptor: 'High-Damping Viscous Elastomer',
    color: '#d946ef',
    soundSignature: 'Dull squishy impact, stick-slip friction acoustic bursts',
  },
  {
    id: 'mat_rubber',
    name: 'Vulcanized Tread Rubber',
    category: 'elastomers',
    hardness: 3.4,
    texture: 6.4,
    density: 3.0,
    acousticImpedanceZ: '1.5 × 10⁶ kg/(m²·s)',
    typicalApplications: 'Automotive tires, shoe soles, conveyor belts',
    descriptor: 'Crosslinked Hysteresis Solid',
    color: '#a21caf',
    soundSignature: 'Heavy muffled rebound, strong frictional screech',
  },
  {
    id: 'mat_neoprene',
    name: 'Closed-Cell Neoprene Foam',
    category: 'elastomers',
    hardness: 1.8,
    texture: 5.3,
    density: 1.4,
    acousticImpedanceZ: '2.5 × 10⁵ kg/(m²·s)',
    typicalApplications: 'Wetsuits, laptop sleeves, soundproofing pads',
    descriptor: 'Porous Gas-Filled Damper',
    color: '#f43f5e',
    soundSignature: 'Nearly zero sound propagation, deep acoustic absorption',
  },
  {
    id: 'mat_styrofoam',
    name: 'Expanded Polystyrene (EPS)',
    category: 'elastomers',
    hardness: 1.2,
    texture: 4.1,
    density: 1.1,
    acousticImpedanceZ: '1.8 × 10⁵ kg/(m²·s)',
    typicalApplications: 'Packaging coolers, shock absorbers, architectural models',
    descriptor: 'Ultralow Density Micro-Cellular',
    color: '#ec4899',
    soundSignature: 'High squeak friction, hollow reverberant resonance',
  },
];

export interface MeasuredIntersection {
  hardness: number;
  texture: number;
  density: number;
  sourceConfidence: {
    hardness: 'measured' | 'estimated';
    texture: 'measured' | 'estimated';
    density: 'measured' | 'estimated';
  };
}

export interface MaterialMatch {
  material: ReferenceMaterial;
  distance: number;
  similarityPercent: number;
  matchedCategory: string;
}

/**
 * Derives the 3D property intersection (Hardness, Texture, Density) of the measured sample
 * by combining direct measurements and DSP feature extractions.
 */
export function calculateSamplePropertyIntersection(
  result: AcousticAnalysisResult,
  priorRecords: AcousticAnalysisResult[] = []
): MeasuredIntersection {
  const dsp = result.dspParameters;
  const primaryScore = Math.max(1.0, Math.min(10.0, result.score));

  // Check if prior records of the exact same object exist for other modes
  const objectRecords = priorRecords.filter(
    (r) => r.objectName.trim().toLowerCase() === result.objectName.trim().toLowerCase()
  );

  const priorHardness = objectRecords.find((r) => r.mode === 'hardness')?.score;
  const priorTexture = objectRecords.find((r) => r.mode === 'texture')?.score;
  const priorDensity = objectRecords.find((r) => r.mode === 'density')?.score;

  let hardness = 5.0;
  let texture = 5.0;
  let density = 5.0;

  const sourceConfidence: MeasuredIntersection['sourceConfidence'] = {
    hardness: 'estimated',
    texture: 'estimated',
    density: 'estimated',
  };

  // 1. Assign measured primary mode
  if (result.mode === 'hardness') {
    hardness = primaryScore;
    sourceConfidence.hardness = 'measured';
  } else if (priorHardness) {
    hardness = priorHardness;
    sourceConfidence.hardness = 'measured';
  }

  if (result.mode === 'texture') {
    texture = primaryScore;
    sourceConfidence.texture = 'measured';
  } else if (priorTexture) {
    texture = priorTexture;
    sourceConfidence.texture = 'measured';
  }

  if (result.mode === 'density') {
    density = primaryScore;
    sourceConfidence.density = 'measured';
  } else if (priorDensity) {
    density = priorDensity;
    sourceConfidence.density = 'measured';
  }

  // 2. Derive complementary properties using DSP physical acoustics if not directly measured
  if (dsp) {
    // If Hardness is estimated:
    if (sourceConfidence.hardness === 'estimated') {
      // Crest factor, peak dB, and spectral centroid indicate impulse stiffness
      const crestEstimate = (dsp.crestFactor - 1.5) * 1.5;
      const peakEstimate = (dsp.peakDb + 60) / 7;
      hardness = Math.max(1.2, Math.min(9.8, (crestEstimate * 0.6 + peakEstimate * 0.4)));
    }

    // If Texture is estimated:
    if (sourceConfidence.texture === 'estimated') {
      // High-Frequency Energy Ratio (HFER) and Zero Crossing Rate (ZCR) indicate micro-asperities
      const zcrFactor = dsp.zeroCrossingRate * 22;
      const hferFactor = dsp.highFreqEnergyRatio * 18;
      const centroidFactor = (dsp.spectralCentroid - 500) / 600;
      texture = Math.max(1.1, Math.min(9.8, (zcrFactor * 0.35 + hferFactor * 0.35 + centroidFactor * 0.3)));
    }

    // If Density is estimated:
    if (sourceConfidence.density === 'estimated') {
      // RMS Energy, contact duration, and Q factor reflect structural inertial impedance
      const energyFactor = (dsp.rmsDb + 70) / 6.5;
      const qFactor = Math.min(8, dsp.qualityFactorQ * 1.4);
      density = Math.max(1.1, Math.min(9.6, (energyFactor * 0.5 + qFactor * 0.5)));
    }
  }

  return {
    hardness: parseFloat(hardness.toFixed(1)),
    texture: parseFloat(texture.toFixed(1)),
    density: parseFloat(density.toFixed(1)),
    sourceConfidence,
  };
}

/**
 * Finds top nearest-neighbor reference materials based on the property intersection
 */
export function findNearestMaterialMatches(
  intersection: MeasuredIntersection,
  activePlane: 'hardness_vs_texture' | 'hardness_vs_density' | 'density_vs_texture' = 'hardness_vs_texture',
  categoryFilter: 'all' | MaterialCategory = 'all'
): MaterialMatch[] {
  const materials = categoryFilter === 'all'
    ? REFERENCE_MATERIALS
    : REFERENCE_MATERIALS.filter((m) => m.category === categoryFilter);

  const scored = materials.map((mat) => {
    let dist = 0;

    if (activePlane === 'hardness_vs_texture') {
      // 2D distance on active plane + 0.35 weight on 3rd dimension
      const dH = mat.hardness - intersection.hardness;
      const dT = mat.texture - intersection.texture;
      const dD = mat.density - intersection.density;
      dist = Math.sqrt(dH * dH + dT * dT + 0.35 * (dD * dD));
    } else if (activePlane === 'hardness_vs_density') {
      const dH = mat.hardness - intersection.hardness;
      const dD = mat.density - intersection.density;
      const dT = mat.texture - intersection.texture;
      dist = Math.sqrt(dH * dH + dD * dD + 0.35 * (dT * dT));
    } else {
      const dD = mat.density - intersection.density;
      const dT = mat.texture - intersection.texture;
      const dH = mat.hardness - intersection.hardness;
      dist = Math.sqrt(dD * dD + dT * dT + 0.35 * (dH * dH));
    }

    // Similarity score (0% to 99%)
    const similarity = Math.max(5, Math.min(99, Math.round((1 - dist / 11) * 100)));

    return {
      material: mat,
      distance: dist,
      similarityPercent: similarity,
      matchedCategory: mat.category,
    };
  });

  return scored.sort((a, b) => a.distance - b.distance);
}
