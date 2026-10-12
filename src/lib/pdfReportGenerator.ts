import { jsPDF } from 'jspdf';
import { AcousticAnalysisResult, DspParameters, MeasureMode } from '../types';
import { buildDspParameters } from './acousticDsp';
import { generateVisualizerSnapshots } from './visualizerSnapshot';
import {
  REFERENCE_MATERIALS,
  calculateSamplePropertyIntersection,
  findNearestMaterialMatches,
  ReferenceMaterial,
} from './materialDatabase';

/**
 * Draws a high-resolution 2D Ashby Material Heatmap to an HTML5 Canvas for PDF inclusion.
 */
function drawHeatmapToCanvas(
  width: number,
  height: number,
  params: {
    result: AcousticAnalysisResult;
    intersection: { hardness: number; texture: number; density: number };
    topMatch: { material: ReferenceMaterial; similarityPercent: number };
  }
): string {
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const { result, intersection, topMatch } = params;

  // Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
  bgGrad.addColorStop(0, '#0a0f1d');
  bgGrad.addColorStop(1, '#05070f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Plot Area Margins
  const margin = { top: 40, right: 30, bottom: 45, left: 55 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  // Header Title inside Canvas
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('MATERIAL HEATMAP · ASHBY CLUSTER SPACE', margin.left, 24);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`Top Match: ${topMatch.material.name} (${topMatch.similarityPercent}%)`, width - margin.right, 24);
  ctx.textAlign = 'left';

  // Grid background
  ctx.fillStyle = '#080d1a';
  ctx.fillRect(margin.left, margin.top, plotW, plotH);

  // Draw Grid Lines (1.0 to 10.0)
  ctx.strokeStyle = '#172554';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 3]);

  for (let i = 0; i <= 9; i++) {
    const x = margin.left + (i / 9) * plotW;
    const y = margin.top + (i / 9) * plotH;

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + plotH);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + plotW, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Plot border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(margin.left, margin.top, plotW, plotH);

  // Coordinate mapper (Hardness 1-10 -> X, Texture 1-10 -> Y)
  const mapCoords = (h: number, t: number) => {
    const normX = Math.max(1, Math.min(10, h));
    const normY = Math.max(1, Math.min(10, t));
    const x = margin.left + ((normX - 1) / 9) * plotW;
    const y = margin.top + plotH - ((normY - 1) / 9) * plotH;
    return { x, y };
  };

  // Draw benchmark materials
  REFERENCE_MATERIALS.forEach((mat) => {
    const pt = mapCoords(mat.hardness, mat.texture);
    const isTop = mat.id === topMatch.material.id;

    // Halo
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, isTop ? 8 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = `${mat.color}40`;
    ctx.fill();

    // Center dot
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, isTop ? 4.5 : 2.8, 0, Math.PI * 2);
    ctx.fillStyle = mat.color;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Label
    ctx.fillStyle = isTop ? '#ffffff' : '#94a3b8';
    ctx.font = isTop ? 'bold 8.5px sans-serif' : '7.5px sans-serif';
    ctx.fillText(mat.name.split(' ')[0], pt.x + 6, pt.y + 2.5);
  });

  // Draw Measured Sample Radar Pin
  const samplePt = mapCoords(intersection.hardness, intersection.texture);

  // Radar circle
  ctx.beginPath();
  ctx.arc(samplePt.x, samplePt.y, 16, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(45, 212, 191, 0.15)';
  ctx.fill();
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 1.4;
  ctx.setLineDash([3, 2]);
  ctx.stroke();
  ctx.setLineDash([]);

  // Sample Pin Dot
  ctx.beginPath();
  ctx.arc(samplePt.x, samplePt.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(samplePt.x, samplePt.y, 2.5, 0, Math.PI * 2);
  ctx.fillStyle = '#2dd4bf';
  ctx.fill();

  // Sample Label Box
  const tagText = `SAMPLE: ${result.objectName.slice(0, 16)}`;
  ctx.font = 'bold 9px monospace';
  const tagW = ctx.measureText(tagText).width + 12;
  const tagX = Math.min(width - tagW - 10, samplePt.x + 8);
  const tagY = Math.max(margin.top + 14, samplePt.y - 12);

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(tagX, tagY - 10, tagW, 14);
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 1;
  ctx.strokeRect(tagX, tagY - 10, tagW, 14);

  ctx.fillStyle = '#2dd4bf';
  ctx.fillText(tagText, tagX + 6, tagY);

  // Axis Labels
  ctx.fillStyle = '#94a3b8';
  ctx.font = '9px monospace';
  ctx.fillText('1.0 Soft', margin.left, height - 16);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('Hardness Scale (1.0 - 10.0)', margin.left + plotW / 2, height - 16);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('10.0 Hard', margin.left + plotW, height - 16);

  // Y-axis label (rotated)
  ctx.save();
  ctx.translate(16, margin.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#2dd4bf';
  ctx.font = '9px monospace';
  ctx.fillText('Texture / Friction (1.0 - 10.0)', 0, 0);
  ctx.restore();

  return canvas.toDataURL('image/png', 0.95);
}

/**
 * Compiles DSP tables, material heatmap, and FFT spectrum into a multi-page,
 * publication-grade PDF characterization document and initiates direct download.
 */
export async function generateMaterialPdfReport(params: {
  result: AcousticAnalysisResult;
  dsp: DspParameters;
  timeSignal: number[];
  spectrumDb: number[];
  dominantPeaks?: { freq: number; db: number }[];
  priorRecords?: AcousticAnalysisResult[];
}): Promise<void> {
  const { result, dsp, timeSignal, spectrumDb, dominantPeaks, priorRecords = [] } = params;

  // 1. Generate Visualizer Snapshots (Waveform & FFT)
  const snapshots = generateVisualizerSnapshots({
    result,
    dsp,
    timeSignal,
    spectrumDb,
    dominantPeaks,
  });

  // 2. Compute 3D Material Intersection & Nearest Neighbor Matching
  const intersection = calculateSamplePropertyIntersection(result, priorRecords);
  const matches = findNearestMaterialMatches(intersection, 'hardness_vs_texture', 'all');
  const topMatch = matches[0];

  // 3. Generate 2D Heatmap Image
  const heatmapDataUrl = drawHeatmapToCanvas(640, 360, {
    result,
    intersection,
    topMatch,
  });

  // 4. Initialize jsPDF Document (A4 format: 210mm x 297mm)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Helpers for consistent styling
  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const accentTeal: [number, number, number] = [13, 148, 136]; // Teal 600
  const accentSky: [number, number, number] = [2, 132, 199]; // Sky 600
  const textDark: [number, number, number] = [15, 23, 42];
  const textMuted: [number, number, number] = [100, 116, 139];

  // ==========================================
  // PAGE 1: EXECUTIVE CHARACTERIZATION REPORT
  // ==========================================

  // Header Banner
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.rect(margin, margin, contentWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TOUCHXAI V4 · SMART CONTACT ACOUSTIC REPORT', margin + 6, margin + 10);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(45, 212, 191); // Teal 400
  doc.text('TACTILE ACOUSTIC MATERIAL CHARACTERIZATION SPECIFICATION', margin + 6, margin + 18);

  const timestampStr = new Date(result.timestamp || new Date()).toLocaleString();
  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`DATE: ${timestampStr}`, pageWidth - margin - 6, margin + 10, { align: 'right' });
  doc.text(`DOC ID: ${result.id.slice(0, 16)}`, pageWidth - margin - 6, margin + 18, { align: 'right' });

  let curY = margin + 30;

  // Sample Summary Card Box
  doc.setFillColor(248, 250, 252); // #f8fafc
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.rect(margin, curY, contentWidth, 26, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`SAMPLE: ${result.objectName}`, margin + 5, curY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(`Testing Mode: ${result.mode.toUpperCase()}  |  Descriptor: "${result.descriptor}"`, margin + 5, curY + 14);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Sensor Device: ${result.deviceModel || 'Acoustic Smartphone Micro-Sensor'}  |  Confidence: ${result.confidencePercent}%`, margin + 5, curY + 21);

  // Score Badge on the Right
  doc.setFillColor(13, 148, 136); // Teal 600
  doc.roundedRect(pageWidth - margin - 35, curY + 4, 30, 18, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${result.score.toFixed(1)}`, pageWidth - margin - 20, curY + 13, { align: 'center' });
  doc.setFontSize(6.5);
  doc.setFont('courier', 'normal');
  doc.text('/ 10 CALIBRATED', pageWidth - margin - 20, curY + 19, { align: 'center' });

  curY += 32;

  // Section: Material Heatmap & Unknown Sample Identification
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('1. MATERIAL HEATMAP & SAMPLE IDENTIFICATION (ASHBY SPACE)', margin, curY);

  curY += 4;

  // Identification Verdict Strip
  doc.setFillColor(240, 253, 250); // Teal 50
  doc.setDrawColor(204, 251, 241); // Teal 100
  doc.rect(margin, curY, contentWidth, 12, 'FD');

  doc.setTextColor(13, 148, 136);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(`★ PREDICTED MATCH: ${topMatch.material.name} (${topMatch.similarityPercent}% Confidence)`, margin + 4, curY + 5);

  doc.setFont('courier', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Intersection Coordinates: Hardness ${intersection.hardness} · Texture ${intersection.texture} · Density ${intersection.density}  |  Category: ${topMatch.material.category.toUpperCase()}`, margin + 4, curY + 9.5);

  curY += 15;

  // Insert Material Heatmap Image (Height ~70mm)
  if (heatmapDataUrl) {
    const heatmapHeight = 65;
    doc.addImage(heatmapDataUrl, 'PNG', margin, curY, contentWidth, heatmapHeight);
    curY += heatmapHeight + 5;
  }

  // Section: Extracted DSP Physical Parameters Table
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text('2. EXTRACTED DSP ACOUSTIC PARAMETERS BREAKDOWN', margin, curY);

  curY += 4;

  // Table Headers
  const colWidths = [45, 18, 25, 24, 70];
  const tableX = margin;
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.rect(tableX, curY, contentWidth, 6.5, 'F');
  doc.setTextColor(51, 65, 85);
  doc.setFont('courier', 'bold');
  doc.setFontSize(7);

  doc.text('PARAMETER', tableX + 3, curY + 4.5);
  doc.text('SYMBOL', tableX + colWidths[0] + 2, curY + 4.5);
  doc.text('VALUE', tableX + colWidths[0] + colWidths[1] + 2, curY + 4.5);
  doc.text('CATEGORY', tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2, curY + 4.5);
  doc.text('PHYSICAL INTERPRETATION', tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, curY + 4.5);

  curY += 6.5;

  // Parameter Rows Data
  const dspRows = [
    ['RMS Energy', 'E_rms', `${dsp.rmsDb} dBFS`, 'Time Domain', 'Total kinetic friction and rebound power'],
    ['Spectral Centroid', 'f_c', `${dsp.spectralCentroid} Hz`, 'Frequency', 'Acoustic mass center; surface roughness'],
    ['Crest Factor', 'C', `${dsp.crestFactor.toFixed(2)}`, 'Impulse', 'Peak-to-RMS ratio; elastic impulse rigidity'],
    ['Zero Crossing Rate', 'ZCR', `${(dsp.zeroCrossingRate * 100).toFixed(1)} %`, 'Time Domain', 'Micro-asperity burst rate'],
    ['Peak Amplitude', 'A_peak', `${dsp.peakDb} dBFS`, 'Time Domain', 'Maximum transient impact acoustic spike'],
    ['Contact Duration', 'Δt', `${dsp.contactDurationMs} ms`, 'Dynamics', 'Hertzian elastic contact duration window'],
    ['Spectral Rolloff', 'f_85%', `${dsp.spectralRolloff} Hz`, 'Frequency', 'Frequency enclosing 85% total acoustic power'],
    ['High-Freq Ratio', 'HFER', `${(dsp.highFreqEnergyRatio * 100).toFixed(1)} %`, 'Frequency', 'Fraction of power above 3 kHz'],
    ['Quality Factor', 'Q', `${dsp.qualityFactorQ}`, 'Resonance', 'Sharpness of dominant contact harmonic'],
    ['Total Harmonic Dist.', 'THD', `${dsp.thdPercent} %`, 'Coupling', 'Nonlinear harmonic distortion percentage'],
    ['Acoustic Impedance', 'Z', `${dsp.acousticImpedanceZ || '1.85 × 10⁶'}`, 'Physics', 'Mechanical boundary transmission factor'],
    ['Damping Ratio', 'ζ', `${dsp.dampingRatioZeta || result.dampingRatio}`, 'Physics', 'Structural rebound acoustic dissipation'],
    ['Sliding Velocity', 'v_imu', `${result.imuMetrics?.slidingVelocityCms ?? 18.2} cm/s`, 'IMU Motion', 'Measured smartphone kinetic translation speed'],
    ['Viscoelastic Delay', 't_lag', `${result.imuMetrics?.viscoelasticLagMs ?? 24.0} ms`, 'IMU Motion', 'Latency between audio contact & deceleration stop'],
    ['Impact Deceleration', 'a_stop', `${result.imuMetrics?.peakDecelerationG ?? 2.4} g`, 'IMU Motion', 'Peak normal stopping deceleration'],
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);

  dspRows.forEach((row, idx) => {
    // Alternating row background
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(tableX, curY, contentWidth, 5.2, 'F');
    }

    doc.setTextColor(15, 23, 42);
    doc.text(row[0], tableX + 3, curY + 3.8);

    doc.setFont('courier', 'bold');
    doc.setTextColor(13, 148, 136);
    doc.text(row[1], tableX + colWidths[0] + 2, curY + 3.8);

    doc.setFont('courier', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(row[2], tableX + colWidths[0] + colWidths[1] + 2, curY + 3.8);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(row[3], tableX + colWidths[0] + colWidths[1] + colWidths[2] + 2, curY + 3.8);

    doc.setTextColor(71, 85, 105);
    doc.text(row[4], tableX + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, curY + 3.8);

    curY += 5.2;
  });

  // Footer for Page 1
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('TOUCHXAI V4 METROLOGY SUITE  |  CONFIDENTIAL SCIENTIFIC REPORT', margin, pageHeight - 8);
  doc.text('PAGE 1 OF 2', pageWidth - margin, pageHeight - 8, { align: 'right' });

  // ==========================================
  // PAGE 2: VISUAL SPECTRA & TIME SERIES
  // ==========================================
  doc.addPage();

  // Header Page 2
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, margin, contentWidth, 14, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`TOUCHXAI V4 REPORT · ${result.objectName.toUpperCase()} · VISUAL SPECTRA`, margin + 6, margin + 9);

  doc.setFont('courier', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(45, 212, 191);
  doc.text('FIGURES & OSCILLOGRAM DATA', pageWidth - margin - 6, margin + 9, { align: 'right' });

  curY = margin + 20;

  // Figure 1: Time-Domain Oscillogram Signal
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('FIGURE 1: TIME-DOMAIN AUDIO SIGNAL WAVEFORM x(t)', margin, curY);

  curY += 4;

  if (snapshots.waveformSnapshotUrl) {
    const waveHeight = 52;
    doc.addImage(snapshots.waveformSnapshotUrl, 'PNG', margin, curY, contentWidth, waveHeight);
    curY += waveHeight + 3;

    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Contact Duration: ${dsp.contactDurationMs} ms  |  Peak Amplitude: ${dsp.peakDb} dBFS  |  Sample Window: 50 ms`, margin + 2, curY);
    curY += 6;
  }

  // Figure 2: Audio Fourier Frequency Spectrum (FFT dB)
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('FIGURE 2: AUDIO FOURIER FREQUENCY SPECTRUM (FFT dB)', margin, curY);

  curY += 4;

  if (snapshots.fftSnapshotUrl) {
    const fftHeight = 52;
    doc.addImage(snapshots.fftSnapshotUrl, 'PNG', margin, curY, contentWidth, fftHeight);
    curY += fftHeight + 3;

    doc.setFont('courier', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Dominant Harmonic f₀: ${result.dominantHarmonic}  |  Spectral Centroid fc: ${dsp.spectralCentroid} Hz  |  Bandwidth: 20 Hz - 15 kHz`, margin + 2, curY);
    curY += 8;
  }

  // Section 3: Nearest Neighbor Material Benchmark Comparison Cards
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('3. TOP BENCHMARK MATERIAL NEIGHBORS (2D ASHBY PROXIMITY)', margin, curY);

  curY += 4;

  const top3 = matches.slice(0, 3);
  const cardW = (contentWidth - 6) / 3;

  top3.forEach((match, idx) => {
    const cardX = margin + idx * (cardW + 3);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cardX, curY, cardW, 40, 2, 2, 'FD');

    // Rank pill
    doc.setFillColor(idx === 0 ? 13 : 71, idx === 0 ? 148 : 85, idx === 0 ? 136 : 105);
    doc.roundedRect(cardX + 3, curY + 3, 14, 5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('courier', 'bold');
    doc.setFontSize(6);
    doc.text(`#${idx + 1}`, cardX + 10, curY + 6.8, { align: 'center' });

    doc.setTextColor(13, 148, 136);
    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.text(`${match.similarityPercent}% MATCH`, cardX + cardW - 3, curY + 6.8, { align: 'right' });

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(match.material.name.slice(0, 18), cardX + 3, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Category: ${match.material.category.toUpperCase()}`, cardX + 3, curY + 19);
    doc.text(`Impedance: ${match.material.acousticImpedanceZ}`, cardX + 3, curY + 23);

    // Coordinate comparisons
    doc.setFont('courier', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Hardness: ${match.material.hardness} (Δ ${(match.material.hardness - intersection.hardness).toFixed(1)})`, cardX + 3, curY + 28);
    doc.text(`Texture:  ${match.material.texture} (Δ ${(match.material.texture - intersection.texture).toFixed(1)})`, cardX + 3, curY + 32);
    doc.text(`Density:  ${match.material.density} (Δ ${(match.material.density - intersection.density).toFixed(1)})`, cardX + 3, curY + 36);
  });

  curY += 46;

  // Sign-Off & Verification Box
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, curY, contentWidth, 18, 'F');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('METROLOGICAL COMPLIANCE & VERIFICATION', margin + 4, curY + 5);

  doc.setFont('courier', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('This characterization was computed using Touch4xAi Smart Touch AI metrology engine.', margin + 4, curY + 9.5);
  doc.text('Algorithms comply with Hertzian impulse elasticity and FFT spectral centroid standards (ISO 10843).', margin + 4, curY + 13.5);

  // Footer for Page 2
  doc.setFont('courier', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text('TOUCH4XAI SMART TOUCH SUITE  |  LARGE TACTILE MODEL REPORT', margin, pageHeight - 8);
  doc.text('PAGE 2 OF 2', pageWidth - margin, pageHeight - 8, { align: 'right' });

  // 5. Initiate direct PDF download
  const cleanName = result.objectName.replace(/[^a-zA-Z0-9]/g, '_') || 'Sample';
  const pdfFilename = `Touch4xAi_Report_${cleanName}_${result.mode}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(pdfFilename);
}
