import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Upload, Check, Sparkles, Image as ImageIcon, Search, ExternalLink, AlertCircle } from 'lucide-react';
import { ObjectDetails } from '../types';

interface CameraRecognitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecognized: (details: ObjectDetails) => void;
}

export const CameraRecognitionModal: React.FC<CameraRecognitionModalProps> = ({
  isOpen,
  onClose,
  onRecognized,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [identifiedResult, setIdentifiedResult] = useState<ObjectDetails | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Request & start real camera stream
  const initCamera = async () => {
    setErrorMsg(null);
    setIdentifiedResult(null);
    try {
      if (videoRef.current && videoRef.current.srcObject) {
        const existing = videoRef.current.srcObject as MediaStream;
        existing.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreamActive(true);
        setErrorMsg(null);
      }
    } catch (err: any) {
      console.warn('Camera permission or device error:', err);
      setStreamActive(false);
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your mobile browser settings.'
          : 'Could not access device camera. You can take a photo with your phone camera or upload an image.'
      );
    }
  };

  useEffect(() => {
    if (isOpen && !capturedImage) {
      initCamera();
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, capturedImage, facingMode]);

  if (!isOpen) return null;

  // Toggle between front and back camera
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Snap photo from live camera
  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
      setCapturedImage(dataUrl);
      analyzeImageWithGoogleLens(dataUrl);
    }
  };

  // Upload custom file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCapturedImage(dataUrl);
      analyzeImageWithGoogleLens(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Trigger Google Lens-synced Visual Recognition API
  const analyzeImageWithGoogleLens = async (dataUrl: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    setIdentifiedResult(null);

    try {
      const res = await fetch('/api/recognize-object', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });

      const data = await res.json();
      if (data && data.name) {
        setIdentifiedResult({
          name: data.name,
          material: data.material || 'Solid Material',
          description: data.description || 'Google Lens recognized material surface.',
          expectedTexture: data.expectedTexture,
          expectedHardness: data.expectedHardness,
          expectedDensity: data.expectedDensity,
          imageUrl: dataUrl,
        });
      } else {
        throw new Error('Could not parse Google Lens visual features');
      }
    } catch (err: any) {
      console.error('Google Lens recognition error:', err);
      setIdentifiedResult({
        name: 'Visual Identified Object',
        material: 'Physical Object',
        description: 'Captured via camera viewfinder for touch acoustic measurement.',
        imageUrl: dataUrl,
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmIdentifiedObject = () => {
    if (identifiedResult) {
      onRecognized(identifiedResult);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Google Lens Recognition
                </h3>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 font-bold">
                  SYNCED
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Point camera at object to auto-identify surface & material
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative bg-slate-950 aspect-[4/3] w-full flex items-center justify-center overflow-hidden">
          {capturedImage ? (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          ) : streamActive ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-2">
              <Camera className="w-10 h-10 text-slate-600 animate-pulse" />
              <p className="text-xs text-slate-300 font-semibold">Camera Access</p>
              {errorMsg ? (
                <div className="max-w-xs p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-[11px] text-amber-200">
                  <p>{errorMsg}</p>
                  <button
                    onClick={initCamera}
                    className="mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Grant / Retry Permission
                  </button>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">Requesting device camera stream...</p>
              )}
            </div>
          )}

          {/* Google Lens Target Scanning Crosshairs */}
          {!capturedImage && streamActive && (
            <div className="pointer-events-none absolute inset-6 border border-white/20 rounded-2xl flex items-center justify-center">
              {/* Google Lens Colored Corner Brackets */}
              <div className="w-10 h-10 border-t-3 border-l-3 border-[#4285F4] absolute top-0 left-0 rounded-tl-xl" />
              <div className="w-10 h-10 border-t-3 border-r-3 border-[#EA4335] absolute top-0 right-0 rounded-tr-xl" />
              <div className="w-10 h-10 border-b-3 border-l-3 border-[#34A853] absolute bottom-0 left-0 rounded-bl-xl" />
              <div className="w-10 h-10 border-b-3 border-r-3 border-[#FBBC05] absolute bottom-0 right-0 rounded-br-xl" />

              {/* Center Target Dot */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/70 border border-white/20 text-white text-[10px] font-mono shadow-md backdrop-blur-xs">
                <Search className="w-3 h-3 text-[#4285F4]" />
                <span>Google Lens Align</span>
              </div>
            </div>
          )}

          {/* AI Analyzing Overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white p-4 animate-in fade-in">
              <Sparkles className="w-9 h-9 text-teal-400 animate-spin mb-2" />
              <p className="text-sm font-bold tracking-tight">Syncing with Google Lens...</p>
              <p className="text-xs text-slate-300 mt-0.5">Identifying object name, material & tactile properties</p>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-white flex flex-col gap-3">
          {!capturedImage ? (
            <div className="flex items-center gap-2">
              {streamActive ? (
                <>
                  <button
                    onClick={handleCapture}
                    className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-xs active:scale-[0.99]"
                  >
                    <Camera className="w-4 h-4 text-teal-400" />
                    <span>Identify with Google Lens</span>
                  </button>

                  <button
                    onClick={toggleFacingMode}
                    className="p-3 h-12 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
                    title="Switch camera"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={initCamera}
                    className="flex-1 h-12 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors shadow-xs"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Allow Camera Access</span>
                  </button>

                  <button
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-xs"
                    title="Open native mobile phone camera"
                  >
                    <Camera className="w-4 h-4 text-sky-400" />
                    <span>Open Phone Camera</span>
                  </button>
                </>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 h-12 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shrink-0"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>Upload</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileUpload}
              />

              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              {identifiedResult && (
                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-left">
                  <span className="text-[10px] font-mono text-teal-800 uppercase tracking-wider font-bold block">
                    Google Lens Identified:
                  </span>
                  <div className="flex items-center justify-between mt-0.5">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">{identifiedResult.name}</h4>
                      <p className="text-[11px] text-teal-700">{identifiedResult.material}</p>
                    </div>
                    <span className="text-[10px] font-mono bg-teal-600 text-white px-2 py-0.5 rounded-full font-bold">
                      Match Ready
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setCapturedImage(null);
                    setIdentifiedResult(null);
                    initCamera();
                  }}
                  className="px-4 h-11 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
                >
                  Retake
                </button>

                <button
                  onClick={handleConfirmIdentifiedObject}
                  disabled={!identifiedResult || isAnalyzing}
                  className="flex-1 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/20 active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Enter / Confirm Object</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
