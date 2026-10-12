import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Upload, Check, Sparkles, Edit3, Image as ImageIcon, Search, ExternalLink, AlertCircle } from 'lucide-react';
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
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<'camera' | 'edit'>('camera');
  const [streamActive, setStreamActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [identifiedResult, setIdentifiedResult] = useState<ObjectDetails | null>(null);
  const [editableName, setEditableName] = useState('');
  const [editableMaterial, setEditableMaterial] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const initCamera = async () => {
    setErrorMsg(null);
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
    if (isOpen && !capturedImage && activeTab === 'camera') {
      initCamera();
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, capturedImage, facingMode, activeTab]);

  if (!isOpen) return null;

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

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

  const analyzeImageWithGoogleLens = async (dataUrl: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/recognize-object', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: dataUrl }),
      });

      const data = await res.json();
      if (data && data.name) {
        const details: ObjectDetails = {
          name: data.name,
          material: data.material || 'Solid Material',
          description: data.description || 'Google Lens recognized material surface.',
          expectedTexture: data.expectedTexture,
          expectedHardness: data.expectedHardness,
          expectedDensity: data.expectedDensity,
          imageUrl: dataUrl,
        };
        setIdentifiedResult(details);
        setEditableName(data.name);
        setEditableMaterial(data.material || 'Solid Material');
      } else {
        throw new Error('Could not parse Google Lens visual features');
      }
    } catch (err: any) {
      console.error('Google Lens recognition error:', err);
      const fallback: ObjectDetails = {
        name: 'Captured Object',
        material: 'Physical Material',
        description: 'Captured via camera viewfinder for touch acoustic measurement.',
        imageUrl: dataUrl,
      };
      setIdentifiedResult(fallback);
      setEditableName('Captured Object');
      setEditableMaterial('Physical Material');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmIdentifiedObject = () => {
    const finalName = editableName.trim() || identifiedResult?.name || 'Measured Object';
    const finalMaterial = editableMaterial.trim() || identifiedResult?.material || 'Solid Material';

    onRecognized({
      name: finalName,
      material: finalMaterial,
      description: identifiedResult?.description || 'Object identified and verified via camera.',
      imageUrl: capturedImage || identifiedResult?.imageUrl,
      expectedTexture: identifiedResult?.expectedTexture,
      expectedHardness: identifiedResult?.expectedHardness,
      expectedDensity: identifiedResult?.expectedDensity,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Camera Object Recognition
                </h3>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 font-bold">
                  AI LENS
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                AI guesses object names, with editable tab for custom names
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: Camera View vs Edit Name Tab */}
        <div className="px-5 pt-3 pb-1 border-b border-slate-100 bg-white flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera View</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'edit'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Object Name</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1 text-left">
          {activeTab === 'camera' ? (
            <>
              {/* Viewfinder Screen */}
              <div className="relative w-full aspect-4/3 bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                {!capturedImage ? (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className={`w-full h-full object-cover ${streamActive ? 'block' : 'hidden'}`}
                    />

                    {!streamActive && (
                      <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
                        <Camera className="w-10 h-10 mb-2 opacity-50" />
                        <p className="text-xs font-medium">Camera preview initializing...</p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          You can also take a photo or upload an image below
                        </p>
                      </div>
                    )}

                    {/* Reticle Overlay */}
                    <div className="absolute inset-0 pointer-events-none border-2 border-white/20 m-6 rounded-xl flex items-center justify-center">
                      <div className="w-8 h-8 border-t-2 border-l-2 border-teal-400 absolute top-0 left-0" />
                      <div className="w-8 h-8 border-t-2 border-r-2 border-teal-400 absolute top-0 right-0" />
                      <div className="w-8 h-8 border-b-2 border-l-2 border-teal-400 absolute bottom-0 left-0" />
                      <div className="w-8 h-8 border-b-2 border-r-2 border-teal-400 absolute bottom-0 right-0" />
                      <span className="text-[10px] font-mono text-white/70 bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">
                        ALIGN SAMPLE SURFACE
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="relative w-full h-full">
                    <img
                      src={capturedImage}
                      alt="Captured Surface"
                      className="w-full h-full object-cover"
                    />
                    {isAnalyzing && (
                      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                        <Sparkles className="w-7 h-7 text-teal-400 animate-spin mb-2" />
                        <span className="text-xs font-bold">Google Lens AI Analyzing Surface...</span>
                        <span className="text-[10px] text-teal-300 font-mono mt-0.5">
                          Matching micro-textures & material category
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Hidden Canvas for Frame Capture */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Error Callout */}
              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-snug text-[11px]">{errorMsg}</p>
                </div>
              )}

              {/* AI Guessed result strip */}
              {identifiedResult && (
                <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200 text-left flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-mono text-teal-800 uppercase tracking-wider font-bold block">
                      Google Lens Guessed:
                    </span>
                    <h4 className="text-sm font-black text-slate-900 truncate">{editableName || identifiedResult.name}</h4>
                    <p className="text-[11px] text-teal-700 truncate">{editableMaterial || identifiedResult.material}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className="px-2.5 py-1.5 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Edit Name</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* REQUIREMENT: EDIT TAB ALLOWING USERS TO EDIT THE NAME OF THE OBJECTS USING THE CAMERA */
            <div className="space-y-3.5 py-1">
              {capturedImage && (
                <div className="w-full h-24 rounded-2xl overflow-hidden border border-slate-200 relative">
                  <img src={capturedImage} alt="Sample thumbnail" className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-teal-300 font-bold">
                    Captured via Camera
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  Object Name (Editable):
                </label>
                <input
                  type="text"
                  value={editableName}
                  onChange={(e) => setEditableName(e.target.value)}
                  placeholder="Type or edit object name..."
                  className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block">
                  Material Classification:
                </label>
                <input
                  type="text"
                  value={editableMaterial}
                  onChange={(e) => setEditableMaterial(e.target.value)}
                  placeholder="e.g. Polymer, Metal, Wood, Textile..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                You can fine-tune what the camera AI identified or enter your own custom object name directly.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
          {!capturedImage && activeTab === 'camera' ? (
            <div className="flex items-center gap-2">
              {streamActive ? (
                <>
                  <button
                    onClick={handleCapture}
                    className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-xs active:scale-[0.99] cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-teal-400" />
                    <span>Identify with Google Lens</span>
                  </button>

                  <button
                    onClick={toggleFacingMode}
                    className="p-3 h-12 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
                    title="Switch camera"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={initCamera}
                    className="flex-1 h-12 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-teal-700 transition-colors shadow-xs cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Allow Camera Access</span>
                  </button>

                  <button
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-sky-400" />
                    <span>Open Phone Camera</span>
                  </button>
                </>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 h-12 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors shrink-0 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCapturedImage(null);
                  setIdentifiedResult(null);
                  setEditableName('');
                  setEditableMaterial('');
                  setActiveTab('camera');
                  initCamera();
                }}
                className="px-4 h-11 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Retake
              </button>

              <button
                onClick={handleConfirmIdentifiedObject}
                disabled={isAnalyzing}
                className="flex-1 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-teal-600/20 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Use Name: {editableName || identifiedResult?.name || 'Sample'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
