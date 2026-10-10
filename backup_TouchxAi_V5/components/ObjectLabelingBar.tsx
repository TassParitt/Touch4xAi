import React, { useState, useRef, useEffect } from 'react';
import { Type, Mic, Camera, Check, Sparkles, Loader2, Volume2, Square, Smartphone } from 'lucide-react';
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
  const [typedName, setTypedName] = useState(currentObject.name || '');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Keep typedName in sync if currentObject changes externally (e.g. from camera)
  useEffect(() => {
    setTypedName(currentObject.name || '');
  }, [currentObject.name]);

  const handleApplyType = (name: string) => {
    setTypedName(name);
    const resolvedDevice = detectedPhoneModel || currentObject.deviceModel || 'Acoustic Sensor';
    const mat = inferMaterial(name);
    onUpdateObject({
      ...currentObject,
      name,
      material: mat,
      description: name ? `Target object: ${name} (${mat}) [Sensor: ${resolvedDevice}]` : '',
      deviceModel: resolvedDevice,
    });
  };

  const inferMaterial = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('glass') || lower.includes('mirror') || lower.includes('lens')) return 'Glass';
    if (lower.includes('sandpaper') || lower.includes('grit') || lower.includes('emery')) return 'Composite';
    if (lower.includes('wood') || lower.includes('oak') || lower.includes('timber') || lower.includes('pine')) return 'Wood';
    if (lower.includes('ceramic') || lower.includes('mug') || lower.includes('porcelain') || lower.includes('tile')) return 'Ceramic';
    if (lower.includes('aluminum') || lower.includes('metal') || lower.includes('steel') || lower.includes('brass')) return 'Metal';
    if (lower.includes('granite') || lower.includes('marble') || lower.includes('stone') || lower.includes('concrete')) return 'Stone';
    if (lower.includes('silicone') || lower.includes('rubber') || lower.includes('plastic') || lower.includes('foam')) return 'Polymer';
    if (lower.includes('leather') || lower.includes('fabric') || lower.includes('cotton') || lower.includes('velvet') || lower.includes('silk') || lower.includes('denim')) return 'Textile';
    return 'Composite Material';
  };

  // Start real microphone voice recording with live Speech Recognition & AI transcript
  const startVoiceRecording = async () => {
    try {
      // 1. Try browser native SpeechRecognition for instant live typing if available
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
              setTypedName(transcript);
              handleApplyType(transcript);
            }
          };

          recognizer.onend = () => {
            setIsRecording(false);
          };

          speechRecognitionRef.current = recognizer;
          recognizer.start();
        } catch (e) {
          console.warn('SpeechRecognition start failed, relying on audio recorder:', e);
        }
      }

      // 2. Also record audio stream for Gemini transcription
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
        setAudioLevel(Math.min(100, Math.round((sum / dataArray.length) * 1.5)));
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
      console.warn('Microphone voice recording error:', err);
      // Fallback prompt
      const simulated = prompt('Describe the object (voice input):', 'Porcelain Coffee Cup');
      if (simulated) {
        handleApplyType(simulated);
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
          const transcribed = data.label.trim();
          setTypedName(transcribed);
          handleApplyType(transcribed);
        }
      };
    } catch (err) {
      console.error('Transcription error:', err);
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
      {/* Section Header */}
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
          onClick={async () => {
            setActiveTab('camera');
            // Request camera permission directly on user gesture
            if (navigator?.mediaDevices?.getUserMedia) {
              navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                .catch(() => { /* Handled in modal */ });
            }
            onOpenCamModal();
          }}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'camera'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Camera className="w-3.5 h-3.5 text-sky-600" />
          Camera / Lens
        </button>
      </div>

      {/* Method View: Typing (Fill-in Window) */}
      {activeTab === 'type' && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={typedName}
              onChange={(e) => {
                setTypedName(e.target.value);
                handleApplyType(e.target.value);
              }}
              placeholder="Enter object name (e.g. Oak Wood, Soft Skin, Steel Knife)..."
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 transition-all"
            />
            {typedName && (
              <button
                onClick={() => handleApplyType('')}
                className="px-2.5 py-2 text-xs text-slate-400 hover:text-slate-700 font-medium"
                title="Clear input"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Benchmark Preset Chips for Instant 1-Tap Testing */}
          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider pr-1">
              Quick Test:
            </span>
            {[
              { label: '🪵 Oak Wood', value: 'Oak Wood Table' },
              { label: '🖐️ Soft Skin', value: 'Soft Human Skin' },
              { label: '🧽 Soft Sponge', value: 'Soft Polyurethane Sponge' },
              { label: '🪞 Mirror Glass', value: 'Mirror Glass Plate' },
              { label: '🔪 Steel Knife', value: 'Structural Alloy Steel' },
              { label: '🧱 Ceramic Mug', value: 'Glazed Ceramic Mug' },
            ].map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => handleApplyType(chip.value)}
                className={`text-[11px] font-medium px-2.5 py-1 rounded-lg border transition-all ${
                  typedName === chip.value
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Method View: Audio Voice */}
      {activeTab === 'voice' && (
        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col items-center text-center space-y-2.5">
          {isTranscribing ? (
            <div className="flex items-center gap-2 py-3 text-slate-700 text-xs font-semibold">
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              <span>Transcribing voice and auto-typing object name...</span>
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

              {typedName && (
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 font-medium">
                  Typing: <span className="font-bold text-teal-700 font-mono">{typedName}</span>
                </div>
              )}

              <button
                onClick={stopVoiceRecording}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 hover:bg-rose-700 shadow-xs"
              >
                <Square className="w-3.5 h-3.5" />
                Done Speaking
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="text-left">
                <p className="text-xs font-semibold text-slate-800">Voice Transcription</p>
                <p className="text-[11px] text-slate-500">
                  Speak object name (e.g. "Glass Plate", "Ceramic Mug") to auto-type
                </p>
              </div>
              <button
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

      {/* Method View: Camera Preview Prompt */}
      {activeTab === 'camera' && (
        <div className="p-3 bg-teal-50/60 border border-teal-200/70 rounded-xl flex items-center justify-between">
          <div className="text-left">
            <span className="text-xs font-semibold text-teal-950 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              Google Lens Visual Recognition
            </span>
            <p className="text-[11px] text-teal-800/80">Camera viewfinder & visual match active</p>
          </div>
          <button
            onClick={() => {
              if (navigator?.mediaDevices?.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
                  .catch(() => { /* Handled in camera modal */ });
              }
              onOpenCamModal();
            }}
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
            {currentObject.name || <span className="text-slate-400 font-normal italic">None (Fill in or select above)</span>}
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
          <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0 ${
            currentObject.name ? 'text-teal-700 bg-teal-50' : 'text-slate-400 bg-slate-100'
          }`}>
            {currentObject.name ? 'Ready to Measure' : 'Enter Object First'}
          </span>
        </div>
      </div>
    </div>
  );
};
