export interface DetectedSmartphone {
  brand: string;
  model: string;
  fullName: string;
  os: string;
  isMobile: boolean;
  micLocation: string;
  recommendedCalibrationOffset: number; // in dB
}

export interface MicCalibrationRecord {
  deviceModel: string;
  baselineDb: number;
  sensitivityOffsetDb: number;
  status: 'optimal' | 'acceptable' | 'noisy';
  calibratedAt: string;
  frequencyPeaks: number[];
}

/**
 * Parses userAgent string and client hints to auto-detect the smartphone model.
 */
export async function detectSmartphone(): Promise<DetectedSmartphone> {
  const ua = navigator.userAgent || '';
  const screenW = window.screen.width;
  const screenH = window.screen.height;
  const dpr = window.devicePixelRatio || 1;

  // 1. Try modern UserAgentData Client Hints if supported (Chromium / Android)
  if (typeof (navigator as any).userAgentData !== 'undefined') {
    const uad = (navigator as any).userAgentData;
    if (uad.getHighEntropyValues) {
      try {
        const hints = await uad.getHighEntropyValues([
          'model',
          'platform',
          'platformVersion',
          'architecture',
        ]);
        if (hints.model && hints.model.trim().length > 0) {
          const rawModel = hints.model.trim();
          const cleanModel = formatModelName(rawModel);
          return {
            brand: detectBrandFromModel(rawModel),
            model: cleanModel,
            fullName: cleanModel,
            os: hints.platform || 'Android',
            isMobile: uad.mobile ?? true,
            micLocation: 'Bottom Edge & Top Secondary',
            recommendedCalibrationOffset: 0.0,
          };
        }
      } catch {
        // Fall back to standard parsing
      }
    }
  }

  // 2. iOS Detection (iPhone / iPad)
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) {
    const iphoneModel = resolveIPhoneModel(screenW, screenH, dpr);
    return {
      brand: 'Apple',
      model: iphoneModel,
      fullName: iphoneModel,
      os: 'iOS',
      isMobile: true,
      micLocation: 'Bottom Port (Next to Lightning / USB-C)',
      recommendedCalibrationOffset: -0.5,
    };
  }

  // 3. Android User-Agent Regex inspection
  // Example UA snippet: "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro Build/...)"
  // or "SM-S928B Build/..."
  const androidMatch = ua.match(/Android\s+([0-9.]+)?;\s*([^;)]+)\s+Build/i);
  if (androidMatch && androidMatch[2]) {
    const rawCode = androidMatch[2].trim();
    const formatted = formatModelName(rawCode);
    return {
      brand: detectBrandFromModel(rawCode),
      model: formatted,
      fullName: formatted,
      os: 'Android',
      isMobile: true,
      micLocation: 'Bottom Primary Port',
      recommendedCalibrationOffset: 0.0,
    };
  }

  // 4. Other mobile user-agents
  const genericMobileMatch = ua.match(/(Pixel\s+[0-9a-zA-Z]+|SM-[A-Z0-9]+|Galaxy\s+[A-Za-z0-9]+|Xiaomi\s+[A-Za-z0-9]+|OnePlus\s+[A-Za-z0-9]+)/i);
  if (genericMobileMatch) {
    const raw = genericMobileMatch[1];
    const formatted = formatModelName(raw);
    return {
      brand: detectBrandFromModel(raw),
      model: formatted,
      fullName: formatted,
      os: 'Android',
      isMobile: true,
      micLocation: 'Bottom Port',
      recommendedCalibrationOffset: 0.0,
    };
  }

  // 5. Desktop / Laptop / Simulator testing environment
  const isMac = /Macintosh|Mac OS X/.test(ua);
  const isWindows = /Windows/.test(ua);
  const platformName = isMac ? 'MacBook / macOS Lab Rig' : isWindows ? 'Windows PC Test Rig' : 'Touch_AI Acoustic Rig';

  return {
    brand: isMac ? 'Apple' : 'Touch_AI Workstation',
    model: platformName,
    fullName: `${platformName} (Simulated Sensor)`,
    os: isMac ? 'macOS' : isWindows ? 'Windows' : 'Linux',
    isMobile: false,
    micLocation: 'Built-in Studio Microphone',
    recommendedCalibrationOffset: 0.0,
  };
}

/**
 * Maps known model codes to friendly smartphone commercial names
 */
function formatModelName(code: string): string {
  const c = code.trim();

  // Samsung Galaxy S series
  if (/SM-S928/i.test(c)) return 'Samsung Galaxy S24 Ultra';
  if (/SM-S926/i.test(c)) return 'Samsung Galaxy S24+';
  if (/SM-S921/i.test(c)) return 'Samsung Galaxy S24';
  if (/SM-S918/i.test(c)) return 'Samsung Galaxy S23 Ultra';
  if (/SM-S916/i.test(c)) return 'Samsung Galaxy S23+';
  if (/SM-S911/i.test(c)) return 'Samsung Galaxy S23';
  if (/SM-G998/i.test(c)) return 'Samsung Galaxy S21 Ultra';
  if (/SM-G991/i.test(c)) return 'Samsung Galaxy S21';
  if (/SM-F946/i.test(c)) return 'Samsung Galaxy Z Fold 5';
  if (/SM-F731/i.test(c)) return 'Samsung Galaxy Z Flip 5';

  // Google Pixel
  if (/Pixel 9 Pro/i.test(c)) return 'Google Pixel 9 Pro';
  if (/Pixel 9/i.test(c)) return 'Google Pixel 9';
  if (/Pixel 8 Pro/i.test(c)) return 'Google Pixel 8 Pro';
  if (/Pixel 8a/i.test(c)) return 'Google Pixel 8a';
  if (/Pixel 8/i.test(c)) return 'Google Pixel 8';
  if (/Pixel 7 Pro/i.test(c)) return 'Google Pixel 7 Pro';
  if (/Pixel 7a/i.test(c)) return 'Google Pixel 7a';
  if (/Pixel 7/i.test(c)) return 'Google Pixel 7';
  if (/Pixel 6/i.test(c)) return 'Google Pixel 6';

  // OnePlus
  if (/OnePlus|CPH2/i.test(c)) return `OnePlus Phone (${c})`;

  // Xiaomi / Redmi
  if (/Xiaomi|Redmi|23049PCD8G|2201123G/i.test(c)) return `Xiaomi Smartphone (${c})`;

  return c;
}

function detectBrandFromModel(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('pixel')) return 'Google';
  if (n.includes('samsung') || n.includes('sm-')) return 'Samsung';
  if (n.includes('iphone') || n.includes('apple')) return 'Apple';
  if (n.includes('oneplus')) return 'OnePlus';
  if (n.includes('xiaomi') || n.includes('redmi') || n.includes('poco')) return 'Xiaomi';
  if (n.includes('sony') || n.includes('xperia')) return 'Sony';
  return 'Smartphone';
}

function resolveIPhoneModel(w: number, h: number, dpr: number): string {
  const minDim = Math.min(w, h);
  const maxDim = Math.max(w, h);

  // Exact resolution matching for modern iPhones
  if (minDim === 430 && maxDim === 932 && dpr === 3) return 'Apple iPhone 15 / 16 Pro Max';
  if (minDim === 393 && maxDim === 852 && dpr === 3) return 'Apple iPhone 15 / 16 Pro';
  if (minDim === 428 && maxDim === 926 && dpr === 3) return 'Apple iPhone 14 Plus / 13 Pro Max';
  if (minDim === 390 && maxDim === 844 && dpr === 3) return 'Apple iPhone 14 / 13 / 12';
  if (minDim === 375 && maxDim === 812 && dpr === 3) return 'Apple iPhone 13 mini / 12 mini';
  if (minDim === 375 && maxDim === 667 && dpr === 2) return 'Apple iPhone SE';

  return 'Apple iPhone (Acoustic MIC)';
}

const STORAGE_CALIBRATION_KEY = 'touch_ai_mic_calibration';

export function getSavedCalibration(): MicCalibrationRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_CALIBRATION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveCalibration(data: MicCalibrationRecord): void {
  try {
    localStorage.setItem(STORAGE_CALIBRATION_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save mic calibration to storage:', err);
  }
}
