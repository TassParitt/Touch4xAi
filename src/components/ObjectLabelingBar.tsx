import React, { useState, useRef, useEffect } from 'react';
import { Type, Mic, Camera, Check, Sparkles, Loader2, Volume2, Square, Smartphone, CornerDownLeft, Edit3, X } from 'lucide-react';
import { LabelMethod, ObjectDetails } from '../types';

interface ObjectLabelingBarProps {
  currentObject: ObjectDetails;
  onUpdateObject: (details: ObjectDetails) => void;
  onOpenCamModal: () => void;
  detectedPhoneModel?: string;
}

export const ObjectLabelingBar: React.FC<ObjectLabelingBarProps> = ({
  currentObject,
  onUpdateObject,
  onOpenCamModal,
  detectedPhoneModel,
}) => {
  const [activeTab, setActiveTab] = useState<LabelMethod>('type');
  const [inputName, setInputName] = useState(currentObject.name || '');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [voiceCandidate, setVoiceCandidate] = useState<string | null>(null);
  const [isObjectConfirmed, setIsObjectConfirmed] = useState(Boolean(currentObject.name));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Sync with currentObject changes (e.g. from camera or history)
  useEffect(() => {
    if (currentObject.name) {
      setInputName(currentObject.name);
      setIsObjectConfirmed(true);
    }
  }, [currentObject.name]);

  const inferMaterial = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('glass') || lower.includes('mirror') || lower.includes('lens')) return 'Glass';
    if (lower.includes('sandpaper') || lower.includes('grit') || lower.includes('emery')) return 'Composite';
    if (lower.includes('wood') || lower.includes('oak') || lower.includes('timber') || lower.includes('pine')) return 'Wood';
    if (lower.includes('ceramic') || lower.includes('mug') || lower.includes('porcelain') || lower.includes('tile')) return 'Ceramic';
    if (lower.includes('metal') || lower.includes('steel') || lower.includes('aluminum') || lower.includes('iron') || lower.includes('brass')) return 'Metal';
    if (lower.includes('granite') || lower.includes('marble') || lower.includes('stone') || lower.includes('concrete')) return 'Stone';
    if (lower.includes('skin') || lower.includes('flesh') || lower.includes('epidermis') || lower.includes('cheek') || lower.includes('tissue')) return 'Biological Skin';
    if (lower.includes('silicone') || lower.includes('rubber') || lower.includes('plastic') || lower.includes('foam') || lower.includes('sponge')) return 'Polymer';
    if (lower.includes('leather') || lower.includes('fabric') || lower.includes('cotton') || lower.includes('velvet') || lower.includes('silk') || lower.includes('denim')) return 'Textile';
    return 'Composite Material';
  };

  const handleConfirmObject = (nameToConfirm: string) => {
    const trimmed = nameToConfirm.trim();
    if (!trimmed) return;
    const resolvedDevice = detectedPhoneModel || currentObject.deviceModel || 'Acoustic Sensor';
    const mat = inferMaterial(trimmed);
    setInputName(trimmed);
    setIsObjectConfirmed(true);
    setVoiceCandidate(null);
    onUpdateObject({
      ...currentObject,
      name: trimmed,
      material: mat,
      description: `Target object: ${trimmed} (${mat}) [Sensor: ${resolvedDevice}]`,
      deviceModel: resolvedDevice,
    });
  };

  const handleClearObject = () => {
    setInputName('');
    setIsObjectConfirmed(false);
    setVoiceCandidate(null);
    onUpdateObject({
      ...currentObject,
      name: '',
      material: '',
      description: '',
    });
  };

  // Start real microphone voice recording with live Speech Recognition & AI transcript
  const startVoiceRecording = async () => {
    setVoiceCandidate(null);
    try {
      // 1. Try browser native SpeechRecognition for instant live feedback
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const recognizer = new SpeechRecognition();
          recognizer.continuous = false;
          recognizer.interimResults = true;
          recognizer.lang = 'en-US';

          recognizer.onresult = (event: any) => {
            const transcript = Array.from(event.results)
              .map((r: any) => r[0]?.transcript)
              .join('');
            if (transcript) {
              setVoiceCandidate(transcript);
            }
          };

          recognizer.onend = () => {
            setIsRecording(false);
          };

          speechRecognitionRef.current = recognizer;
          recognizer.start();
        } catch (e) {
          console.warn('SpeechRecognition init error:', e);
        }
      }

      // 2. Stream audio for server-side Gemini audio transcription
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        setAudioLevel(Math.min(100, Math.round((sum / dataArray.length) * 1.6)));
        animFrameRef.current = requestAnimationFrame(updateMeter);
      };
      updateMeter();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach((track) => track.stop());
        audioCtx.close().catch(() => {});
        setAudioLevel(0);

        if (speechRecognitionRef.current) {
          try {
            speechRecognitionRef.current.stop();
          } catch {}
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendAudioToTranscribe(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.warn('Microphone access warning:', err);
      const manualFallback = prompt('Please enter object name (voice recording unavailable):', 'Silk Fabric');
      if (manualFallback) {
        handleConfirmObject(manualFallback);
      }
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioToTranscribe = async (blob: Blob) => {
    setIsTranscribing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        const res = await fetch('/api/transcribe-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64Audio, mimeType: 'audio/webm' }),
        });
        const data = await res.json();
        if (data?.label) {
          setVoiceCandidate(data.label.trim());
        }
      };
    } catch (err) {
      console.error('Transcription error:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs text-left">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          Object Identification
        </label>
        <span className="text-[11px] text-slate-500 font-medium">Type · Voice · Lens</span>
      </div>

      {/* Labeling Method Tabs */}
      <div className="flex items-center p-1 bg-slate-100 rounded-xl mb-3.5">
        <button
          onClick={() => setActiveTab('type')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'type'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          Fill-in
        </button>

        <button
          onClick={() => setActiveTab('voice')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'voice'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Mic className="w-3.5 h-3.5 text-teal-600" />
          Voice AI
        </button>

        <button
          onClick={() => {
            setActiveTab('camera');
            onOpenCamModal();
          }}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'camera'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-sky-600" />
          Google Lens
        </button>
      </div>

      {/* Method 1: Typing with Enter Tab/Button */}
      {activeTab === 'type' && (
        <div className="space-y-2.5">
          {!isObjectConfirmed ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleConfirmObject(inputName);
                  }
                }}
                placeholder="Type object name (e.g. Silk Fabric, Oak Wood)..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={() => handleConfirmObject(inputName)}
                disabled={!inputName.trim()}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-40 shrink-0"
              >
                <span>Enter</span>
                <CornerDownLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" />
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 text-sm">{currentObject.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 font-semibold">
                      {currentObject.material}
                    </span>
                  </div>
                  <span className="text-[11px] text-teal-700 font-medium">Identified & ready to measure</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsObjectConfirmed(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-teal-100/60 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                title="Edit name"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Method 2: Voice AI Transcription with Enter Confirmation */}
      {activeTab === 'voice' && (
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col items-center text-center space-y-2.5">
          {isTranscribing ? (
            <div className="flex items-center gap-2 py-3 text-slate-700 text-xs font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              <span>Transcribing voice with AI...</span>
            </div>
          ) : isRecording ? (
            <div className="w-full flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 text-rose-600 text-xs font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                Listening... Speak object name clearly
              </div>

              {/* Dynamic waveform meter */}
              <div className="w-full max-w-[200px] h-3 bg-slate-200 rounded-full overflow-hidden my-1">
                <div
                  className="h-full bg-rose-500 transition-all duration-75"
                  style={{ width: `${Math.max(8, audioLevel)}%` }}
                />
              </div>

              {voiceCandidate && (
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 font-medium">
                  Heard: <strong className="text-teal-700">{voiceCandidate}</strong>
                </div>
              )}

              <button
                type="button"
                onClick={stopVoiceRecording}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-700 shadow-xs"
              >
                <Square className="w-3.5 h-3.5" />
                Done Speaking
              </button>
            </div>
          ) : voiceCandidate ? (
            <div className="w-full space-y-2.5">
              <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-left">
                <span className="text-[10px] font-mono text-teal-800 uppercase tracking-wider font-bold block">
                  Voice AI Recognized:
                </span>
                <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                  {voiceCandidate}
                </span>
                <span className="text-[11px] text-teal-700">Click Enter to confirm for measurement</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="px-3 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-100"
                >
                  Re-record
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmObject(voiceCandidate)}
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Enter / Confirm Object</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-800">Voice Transcription</p>
                <p className="text-[11px] text-slate-500">
                  Speak object name (e.g. "Glass Plate", "Ceramic Mug")
                </p>
              </div>
              <button
                type="button"
                onClick={startVoiceRecording}
                className="h-10 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
              >
                <Mic className="w-3.5 h-3.5" />
                Record Voice
              </button>
            </div>
          )}
        </div>
      )}

      {/* Method 3: Google Lens with Enter Confirmation */}
      {activeTab === 'camera' && (
        <div className="p-3 bg-teal-50/60 border border-teal-200/70 rounded-xl flex items-center justify-between">
          <div className="text-left">
            <span className="text-xs font-semibold text-teal-950 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Google Lens Visual Recognition
            </span>
            <p className="text-[11px] text-teal-800/80">Camera viewfinder & AI visual match</p>
          </div>
          <button
            type="button"
            onClick={onOpenCamModal}
            className="px-3.5 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800 transition-colors shadow-xs"
          >
            Open Lens
          </button>
        </div>
      )}

      {/* Active Object Summary Tag */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-xs">
        <div className="flex items-center gap-2 truncate">
          <span className="text-slate-400 text-[11px]">Selected:</span>
          <span className="font-bold text-slate-900 truncate">
            {currentObject.name || <span className="text-slate-400 font-normal italic">None (Type or speak above)</span>}
          </span>
          {currentObject.material && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-slate-500 text-[11px]">{currentObject.material}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {(currentObject.deviceModel || detectedPhoneModel) && (
            <span className="text-[10px] text-sky-700 bg-sky-50 border border-sky-200/80 px-2 py-0.5 rounded-md font-mono flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-sky-600" />
              <span>{currentObject.deviceModel || detectedPhoneModel}</span>
            </span>
          )}
          {currentObject.name && (
            <button
              onClick={handleClearObject}
              className="text-[11px] text-slate-400 hover:text-rose-600 p-0.5"
              title="Clear object"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
