import { MeasureMode, DspParameters, AcousticAnalysisResult } from '../types';

export interface VisualizerSnapshots {
  waveformSnapshotUrl: string;
  fftSnapshotUrl: string;
  compositeSnapshotUrl: string;
}

/**
 * Generates high-fidelity visual representations of the FFT visualizer and time-domain signal
 * as high-resolution PNG Data URLs. These can be stored inside the saved measurement record,
 * synced to Firestore, downloaded, and embedded in exported reports.
 */
export function generateVisualizerSnapshots(params: {
  result: AcousticAnalysisResult;
  dsp: DspParameters;
  timeSignal: number[];
  spectrumDb: number[];
  dominantPeaks?: { freq: number; db: number }[];
}): VisualizerSnapshots {
  if (typeof document === 'undefined') {
    return {
      waveformSnapshotUrl: '',
      fftSnapshotUrl: '',
      compositeSnapshotUrl: '',
    };
  }

  const { result, dsp, timeSignal, spectrumDb, dominantPeaks } = params;
  const objectName = result.objectName || 'Sample Object';
  const mode = result.mode;
  const score = result.score;
  const dominantFreq = parseInt(result.dominantHarmonic.replace(/[^0-9]/g, '')) || 1400;

  // 1. Generate Waveform Snapshot (600 x 240)
  const waveformCanvas = document.createElement('canvas');
  waveformCanvas.width = 600;
  waveformCanvas.height = 240;
  const wCtx = waveformCanvas.getContext('2d');
  let waveformSnapshotUrl = '';

  if (wCtx) {
    drawWaveformToContext(wCtx, 600, 240, {
      timeSignal,
      dsp,
      objectName,
      mode,
    });
    waveformSnapshotUrl = waveformCanvas.toDataURL('image/png', 0.95);
  }

  // 2. Generate FFT Spectrum Snapshot (600 x 240)
  const fftCanvas = document.createElement('canvas');
  fftCanvas.width = 600;
  fftCanvas.height = 240;
  const fCtx = fftCanvas.getContext('2d');
  let fftSnapshotUrl = '';

  if (fCtx) {
    drawFftToContext(fCtx, 600, 240, {
      spectrumDb,
      dsp,
      dominantFreq,
      dominantHarmonic: result.dominantHarmonic,
      dominantPeaks: dominantPeaks || [{ freq: dominantFreq, db: dsp.peakDb }],
      mode,
    });
    fftSnapshotUrl = fftCanvas.toDataURL('image/png', 0.95);
  }

  // 3. Generate Composite Dual-Panel Snapshot (720 x 540)
  const compCanvas = document.createElement('canvas');
  compCanvas.width = 720;
  compCanvas.height = 540;
  const cCtx = compCanvas.getContext('2d');
  let compositeSnapshotUrl = '';

  if (cCtx) {
    drawCompositeToContext(cCtx, 720, 540, {
      result,
      dsp,
      timeSignal,
      spectrumDb,
      dominantFreq,
      dominantPeaks: dominantPeaks || [{ freq: dominantFreq, db: dsp.peakDb }],
    });
    compositeSnapshotUrl = compCanvas.toDataURL('image/png', 0.95);
  }

  return {
    waveformSnapshotUrl,
    fftSnapshotUrl,
    compositeSnapshotUrl,
  };
}

/**
 * Draws Time-Domain Oscillogram x(t) to an HTML5 2D Context
 */
function drawWaveformToContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: {
    timeSignal: number[];
    dsp: DspParameters;
    objectName: string;
    mode: MeasureMode;
  }
) {
  const { timeSignal, dsp, objectName, mode } = data;

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#090d18');
  grad.addColorStop(1, '#05070f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Outer border
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  // Header Banner
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, 34);
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(0, 34);
  ctx.lineTo(width, 34);
  ctx.stroke();

  // Title
  ctx.fillStyle = '#2dd4bf';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('FIGURE 1: TIME-DOMAIN AUDIO SIGNAL x(t)', 16, 22);

  // Header Metrics
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(
    `Peak: ${dsp.peakDb} dBFS  ·  RMS: ${dsp.rmsDb} dBFS  ·  Δt: ${dsp.contactDurationMs} ms`,
    width - 16,
    22
  );
  ctx.textAlign = 'left';

  // Graph Area coordinates
  const gx = 45;
  const gy = 44;
  const gw = width - gx - 20;
  const gh = height - gy - 30;
  const midY = gy + gh / 2;

  // Horizontal Grid Lines & Y labels
  const yLabels = ['+1.0', '+0.5', ' 0.0', '-0.5', '-1.0'];
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 3]);

  for (let i = 0; i <= 4; i++) {
    const y = gy + (gh * i) / 4;
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx + gw, y);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(yLabels[i], gx - 6, y + 3);
  }
  ctx.setLineDash([]);
  ctx.textAlign = 'left';

  // Zero-line (solid center)
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(gx, midY);
  ctx.lineTo(gx + gw, midY);
  ctx.stroke();

  // Vertical Time Grid Lines (4 steps)
  const dt = dsp.contactDurationMs || 50;
  const timeLabels = ['0 ms', `${(dt * 0.25).toFixed(0)} ms`, `${(dt * 0.5).toFixed(0)} ms`, `${(dt * 0.75).toFixed(0)} ms`, `${dt.toFixed(0)} ms`];
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([2, 2]);

  for (let i = 0; i <= 4; i++) {
    const x = gx + (gw * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x, gy + gh);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(timeLabels[i], x, gy + gh + 16);
  }
  ctx.setLineDash([]);
  ctx.textAlign = 'left';

  // Waveform Curve & Area Fill
  const len = timeSignal.length;
  if (len > 0) {
    // Area
    const areaGrad = ctx.createLinearGradient(0, gy, 0, gy + gh);
    areaGrad.addColorStop(0, 'rgba(20, 184, 166, 0.28)');
    areaGrad.addColorStop(0.5, 'rgba(20, 184, 166, 0.05)');
    areaGrad.addColorStop(1, 'rgba(20, 184, 166, 0.28)');

    ctx.beginPath();
    ctx.moveTo(gx, midY);
    for (let i = 0; i < len; i++) {
      const x = gx + (i / (len - 1)) * gw;
      const y = midY - timeSignal[i] * (gh / 2) * 0.88;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(gx + gw, midY);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Waveform line
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = gx + (i / (len - 1)) * gw;
      const y = midY - timeSignal[i] * (gh / 2) * 0.88;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#2dd4bf';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(45, 212, 191, 0.6)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Peak Impulse Pin
    const maxIdx = timeSignal.reduce((maxI, v, i, arr) => (Math.abs(v) > Math.abs(arr[maxI]) ? i : maxI), 0);
    const peakX = gx + (maxIdx / (len - 1)) * gw;
    const peakY = midY - timeSignal[maxIdx] * (gh / 2) * 0.88;

    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(peakX, peakY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#fecdd3';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${dsp.peakDb} dB`, peakX + 6, peakY - 4);
  }
}

/**
 * Draws FFT Frequency Spectrum to an HTML5 2D Context
 */
function drawFftToContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: {
    spectrumDb: number[];
    dsp: DspParameters;
    dominantFreq: number;
    dominantHarmonic: string;
    dominantPeaks: { freq: number; db: number }[];
    mode: MeasureMode;
  }
) {
  const { spectrumDb, dsp, dominantFreq, dominantHarmonic, dominantPeaks } = data;

  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#090d18');
  grad.addColorStop(1, '#05070f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Outer border
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

  // Header Banner
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, 34);
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(0, 34);
  ctx.lineTo(width, 34);
  ctx.stroke();

  // Title
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 11px monospace';
  ctx.fillText('FIGURE 2: AUDIO FOURIER SPECTRUM (FFT dB)', 16, 22);

  // Header Metrics
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(
    `f₀: ${dominantHarmonic}  ·  f_c: ${dsp.spectralCentroid.toLocaleString()} Hz  ·  Q: ${dsp.qualityFactorQ}`,
    width - 16,
    22
  );
  ctx.textAlign = 'left';

  // Graph Area coordinates
  const gx = 45;
  const gy = 44;
  const gw = width - gx - 20;
  const gh = height - gy - 30;

  // Decibel Grid Lines & Y labels (0 to -120 dB)
  const dbLabels = ['  0 dB', '-30 dB', '-60 dB', '-90 dB', '-120 dB'];
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([3, 3]);

  for (let i = 0; i <= 4; i++) {
    const y = gy + (gh * i) / 4;
    ctx.beginPath();
    ctx.moveTo(gx, y);
    ctx.lineTo(gx + gw, y);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(dbLabels[i], gx - 6, y + 3);
  }
  ctx.setLineDash([]);
  ctx.textAlign = 'left';

  // Frequency Grid Lines & X labels
  const freqLabels = ['50 Hz', '250 Hz', '1 kHz', '4 kHz', '15 kHz'];
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 0.8;
  ctx.setLineDash([2, 2]);

  for (let i = 0; i <= 4; i++) {
    const x = gx + (gw * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x, gy);
    ctx.lineTo(x, gy + gh);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(freqLabels[i], x, gy + gh + 16);
  }
  ctx.setLineDash([]);
  ctx.textAlign = 'left';

  // Spectrum Curve & Fill Area
  const len = spectrumDb.length;
  if (len > 0) {
    const areaGrad = ctx.createLinearGradient(0, gy, 0, gy + gh);
    areaGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
    areaGrad.addColorStop(0.6, 'rgba(2, 132, 199, 0.12)');
    areaGrad.addColorStop(1, 'rgba(2, 132, 199, 0.01)');

    ctx.beginPath();
    ctx.moveTo(gx, gy + gh);
    for (let i = 0; i < len; i++) {
      const x = gx + (i / (len - 1)) * gw;
      const db = spectrumDb[i];
      const normY = Math.min(1.0, Math.max(0.0, (db + 120) / 120));
      const y = gy + gh - normY * gh;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(gx + gw, gy + gh);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Stroke line
    ctx.beginPath();
    for (let i = 0; i < len; i++) {
      const x = gx + (i / (len - 1)) * gw;
      const db = spectrumDb[i];
      const normY = Math.min(1.0, Math.max(0.0, (db + 120) / 120));
      const y = gy + gh - normY * gh;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(56, 189, 248, 0.6)';
    ctx.shadowBlur = 6;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Spectral Centroid Marker Line
    const fc = Math.min(15000, Math.max(50, dsp.spectralCentroid));
    const fcNorm = Math.min(1.0, Math.max(0.0, Math.log10(fc / 40) / Math.log10(15000 / 40)));
    const fcX = gx + fcNorm * gw;

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 2]);
    ctx.beginPath();
    ctx.moveTo(fcX, gy);
    ctx.lineTo(fcX, gy + gh);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`fc: ${fc}Hz`, Math.min(gx + gw - 60, fcX + 4), gy + 12);

    // Dominant Resonant Peak Pin
    const topPeak = dominantPeaks[0] || { freq: dominantFreq, db: dsp.peakDb };
    const pNormX = Math.min(1.0, Math.max(0.0, Math.log10(Math.max(50, topPeak.freq) / 40) / Math.log10(15000 / 40)));
    const pX = gx + pNormX * gw;
    const pNormY = Math.min(1.0, Math.max(0.0, (topPeak.db + 120) / 120));
    const pY = gy + gh - pNormY * gh;

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(pX, pY, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#e0f2fe';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(`${topPeak.freq}Hz`, pX + 6, pY - 4);
  }
}

/**
 * Draws Composite Dual-Panel Snapshot with Header, Color Scale Bar, Waveform & FFT
 */
function drawCompositeToContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: {
    result: AcousticAnalysisResult;
    dsp: DspParameters;
    timeSignal: number[];
    spectrumDb: number[];
    dominantFreq: number;
    dominantPeaks: { freq: number; db: number }[];
  }
) {
  const { result, dsp, timeSignal, spectrumDb, dominantFreq, dominantPeaks } = data;

  // Background
  ctx.fillStyle = '#060a14';
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  // Top Title Bar
  ctx.fillStyle = '#0b1120';
  ctx.fillRect(2, 2, width - 4, 82);
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(2, 84);
  ctx.lineTo(width - 2, 84);
  ctx.stroke();

  // App Brand
  ctx.fillStyle = '#2dd4bf';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('TouchxAi V4 (SMART CONTACT)', 20, 26);

  ctx.fillStyle = '#64748b';
  ctx.font = '10px monospace';
  ctx.fillText('ACOUSTIC FFT & TIME-DOMAIN VISUALIZER SNAPSHOT', 20, 42);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`Target: ${result.objectName}`, 20, 62);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  ctx.fillText(`Mode: ${result.mode.toUpperCase()}  ·  Sensor: ${result.deviceModel || 'Smartphone Acoustic Port'}`, 20, 75);

  // Score Badge on Right
  const scoreBoxW = 140;
  const scoreBoxX = width - scoreBoxW - 20;
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(scoreBoxX, 10, scoreBoxW, 64);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.strokeRect(scoreBoxX, 10, scoreBoxW, 64);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '9px monospace';
  ctx.fillText('CALIBRATED SCALE', scoreBoxX + 10, 24);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(result.score.toFixed(1), scoreBoxX + 10, 50);

  ctx.fillStyle = '#64748b';
  ctx.font = '11px monospace';
  ctx.fillText('/ 10', scoreBoxX + 54, 50);

  ctx.fillStyle = '#2dd4bf';
  ctx.font = 'bold 9px sans-serif';
  ctx.fillText(result.descriptor.slice(0, 22), scoreBoxX + 10, 66);

  // 1-10 Color Bar
  const barY = 96;
  const barX = 20;
  const barW = width - 40;
  const barH = 10;

  const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  barGrad.addColorStop(0.0, '#ef4444');
  barGrad.addColorStop(0.2, '#f97316');
  barGrad.addColorStop(0.4, '#eab308');
  barGrad.addColorStop(0.6, '#22c55e');
  barGrad.addColorStop(0.8, '#3b82f6');
  barGrad.addColorStop(1.0, '#09090b');

  ctx.fillStyle = barGrad;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 5);
  ctx.fill();

  // Score Marker
  const markerX = barX + (Math.max(0.1, Math.min(10, result.score)) / 10) * barW;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(markerX, barY + barH / 2, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Sub-panel 1: Time Domain Signal Waveform (Y: 120 to 295)
  ctx.save();
  ctx.translate(20, 118);
  drawWaveformToContext(ctx, width - 40, 175, {
    timeSignal,
    dsp,
    objectName: result.objectName,
    mode: result.mode,
  });
  ctx.restore();

  // Sub-panel 2: FFT Frequency Spectrum (Y: 305 to 480)
  ctx.save();
  ctx.translate(20, 305);
  drawFftToContext(ctx, width - 40, 175, {
    spectrumDb,
    dsp,
    dominantFreq,
    dominantHarmonic: result.dominantHarmonic,
    dominantPeaks,
    mode: result.mode,
  });
  ctx.restore();

  // Footer Metadata Strip (Y: 490 to 530)
  ctx.fillStyle = '#0b1120';
  ctx.fillRect(2, 492, width - 4, 46);
  ctx.strokeStyle = '#1e293b';
  ctx.beginPath();
  ctx.moveTo(2, 492);
  ctx.lineTo(width - 2, 492);
  ctx.stroke();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px monospace';
  ctx.fillText(
    `RMS: ${dsp.rmsDb} dB  |  Centroid: ${dsp.spectralCentroid} Hz  |  Crest: ${dsp.crestFactor.toFixed(2)}  |  ZCR: ${(dsp.zeroCrossingRate * 100).toFixed(1)}%  |  THD: ${dsp.thdPercent.toFixed(1)}%`,
    20,
    518
  );

  ctx.fillStyle = '#475569';
  ctx.textAlign = 'right';
  ctx.fillText(`Recorded: ${new Date().toISOString()}`, width - 20, 518);
  ctx.textAlign = 'left';
}
