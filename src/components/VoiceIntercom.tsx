/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Volume2, VolumeX, Mic, MicOff, Settings, X, RefreshCw, Sparkles, 
  User, Play, Pause, Shield, Users, HelpCircle, Radio
} from 'lucide-react';

interface VoiceIntercomProps {
  onClose: () => void;
  stadiumTime: string;
}

export default function VoiceIntercom({ onClose, stadiumTime }: VoiceIntercomProps) {
  const [isActive, setIsActive] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState<'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir'>('Zephyr');
  const [persona, setPersona] = useState<'fan' | 'ops' | 'staff'>('fan');
  const [statusText, setStatusText] = useState<'Ready' | 'Listening' | 'Thinking' | 'Speaking' | 'Error'>('Ready');
  const [transcripts, setTranscripts] = useState<{ sender: 'user' | 'gemini'; text: string; id: string }[]>([
    { id: '1', sender: 'gemini', text: "Welcome to Stadium Pulse Voice Channel. Hold or tap the microphone to talk with me in real-time!" }
  ]);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Speech Recognition state
  const [recognitionActive, setRecognitionActive] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isStartingRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onstart = () => {
        isStartingRef.current = false;
        setStatusText('Listening');
        setRecognitionActive(true);
      };

      rec.onend = () => {
        isStartingRef.current = false;
        setRecognitionActive(false);
      };

      rec.onresult = async (event: any) => {
        const text = event.results[0][0].transcript;
        if (text.trim()) {
          await handleVoiceInputSubmit(text);
        } else {
          setStatusText('Ready');
        }
      };

      rec.onerror = (err: any) => {
        console.error('Speech recognition error:', err);
        isStartingRef.current = false;
        setStatusText('Ready');
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (activeSourceRef.current) {
        activeSourceRef.current.stop();
      }
    };
  }, [selectedVoice, persona]);

  // Play PCM Audio
  const playPcmAudio = (base64Data: string) => {
    try {
      // Stop current playback if active
      if (activeSourceRef.current) {
        try {
          activeSourceRef.current.stop();
        } catch (_) {}
      }

      if (isMuted) {
        setStatusText('Ready');
        return;
      }

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('AudioContext not supported');
        return;
      }

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass({ sampleRate: 24000 });
      }

      const audioCtx = audioCtxRef.current;
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const arrayBuffer = bytes.buffer;
      const int16Array = new Int16Array(arrayBuffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768;
      }

      const audioBuffer = audioCtx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      
      source.onended = () => {
        setStatusText('Ready');
      };

      activeSourceRef.current = source;
      setStatusText('Speaking');
      source.start();
    } catch (err: any) {
      console.error('Playback error:', err);
      setErrorMsg('Playback failed: ' + err.message);
      setStatusText('Ready');
    }
  };

  const handleVoiceInputSubmit = async (text: string) => {
    // Add user message to transcript
    const userMsgId = `user-${Date.now()}`;
    setTranscripts(prev => [...prev, { id: userMsgId, sender: 'user', text }]);
    setStatusText('Thinking');

    // Customize prompt based on persona
    let systemInstructionContext = '';
    if (persona === 'ops') {
      systemInstructionContext = `Respond as the Stadium Operations Command Center AI Dispatcher. Current local time is ${stadiumTime}. Keep it to 1 sentence, very direct and professional.`;
    } else if (persona === 'staff') {
      systemInstructionContext = `Respond as the Ground Volunteer & Crew SOP Coordinator. Encourage safety and direct tasks in 1 clear sentence.`;
    } else {
      systemInstructionContext = `Respond as the cheerful, helpful Stadium Fan Concierge. Warm tone, uses emojis, answers in 1 friendly sentence.`;
    }

    try {
      const response = await fetch('/api/gemini/voice-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${systemInstructionContext}\nUser asks: "${text}"`,
          voiceName: selectedVoice,
        }),
      });

      if (!response.ok) throw new Error('Voice Agent failed to reply');
      const data = await response.json();

      const geminiMsgId = `gemini-${Date.now()}`;
      setTranscripts(prev => [...prev, { id: geminiMsgId, sender: 'gemini', text: data.text }]);

      if (data.audioBase64) {
        playPcmAudio(data.audioBase64);
      } else {
        setStatusText('Ready');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Failed to process voice request: ' + err.message);
      setStatusText('Error');
      setTimeout(() => setStatusText('Ready'), 3000);
    }
  };

  const startListening = () => {
    if (isStartingRef.current || statusText === 'Listening') return;
    isStartingRef.current = true;
    setErrorMsg('');
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
      } catch (_) {}
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start dictation:', err);
        isStartingRef.current = false;
      }
    } else {
      // Mock dictation for iframe/unsupported browsers
      const mockQueries = [
        "Where is the nearest coffee shop from Section 103?",
        "Is there any active rain threat or weather warnings?",
        "How do I navigate to Gate B for my ticket?",
        "What is the current crowd congestion level at the turnstiles?"
      ];
      const randomQuery = mockQueries[Math.floor(Math.random() * mockQueries.length)];
      setStatusText('Listening');
      setTimeout(() => {
        isStartingRef.current = false;
        handleVoiceInputSubmit(randomQuery);
      }, 1500);
    }
  };

  const stopSpeaking = () => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.stop();
        setStatusText('Ready');
      } catch (_) {}
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[520px]">
        
        {/* INTERCOM HEADER */}
        <div className="bg-slate-950/80 px-6 py-4 border-b border-slate-800/80 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-emerald-400 animate-pulse" />
            <div>
              <h2 className="font-bold text-sm text-white uppercase tracking-wider">Live Voice Intercom</h2>
              <span className="text-[10px] text-slate-500 font-mono">MODEL: GEMINI-3.1-FLASH-LIVE</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* CONTROLS BAR */}
        <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/40 grid grid-cols-2 gap-4 text-xs">
          {/* Persona selector */}
          <div className="space-y-1 text-left">
            <span className="text-[9px] font-mono text-slate-500 uppercase block">Persona Channel</span>
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button 
                onClick={() => setPersona('fan')}
                className={`flex-1 py-1 rounded text-[10px] font-bold ${persona === 'fan' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Fan
              </button>
              <button 
                onClick={() => setPersona('ops')}
                className={`flex-1 py-1 rounded text-[10px] font-bold ${persona === 'ops' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Ops
              </button>
              <button 
                onClick={() => setPersona('staff')}
                className={`flex-1 py-1 rounded text-[10px] font-bold ${persona === 'staff' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Staff
              </button>
            </div>
          </div>

          {/* Voice Selector */}
          <div className="space-y-1 text-left">
            <span className="text-[9px] font-mono text-slate-500 uppercase block">Gemini Voice</span>
            <select
              value={selectedVoice}
              onChange={(e: any) => setSelectedVoice(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-[11px] text-slate-200 font-bold focus:outline-none"
            >
              <option value="Zephyr">Zephyr (Warm)</option>
              <option value="Puck">Puck (Cheerful)</option>
              <option value="Charon">Charon (Deep)</option>
              <option value="Kore">Kore (Expressive)</option>
              <option value="Fenrir">Fenrir (Classic)</option>
            </select>
          </div>
        </div>

        {/* TRANSCRIPT AREA */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-left">
          {transcripts.map((t) => (
            <div key={t.id} className={`flex flex-col ${t.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <span className="text-[8px] font-mono text-slate-500 uppercase mb-0.5">
                {t.sender === 'user' ? 'You (Ground)' : `Gemini (${selectedVoice})`}
              </span>
              <div className={`p-3 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                t.sender === 'user' 
                  ? 'bg-emerald-600 text-white rounded-tr-none' 
                  : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
              }`}>
                {t.text}
              </div>
            </div>
          ))}

          {statusText === 'Thinking' && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 italic animate-pulse">
              <Sparkles className="h-4.5 w-4.5 animate-spin text-emerald-400" />
              Gemini Voice Agent processing...
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-950/20 border border-red-500/20 text-red-400 text-[10px] p-2 rounded-xl">
              {errorMsg}
            </div>
          )}
        </div>

        {/* VOICE HUD VISUALIZER & MIC PANEL */}
        <div className="p-6 bg-slate-950/60 border-t border-slate-800/80 flex flex-col items-center justify-center gap-4">
          
          {/* Animated Wave visualizer */}
          <div className="h-16 flex items-center justify-center gap-1.5 w-full">
            {statusText === 'Listening' ? (
              // Active listening visual bars
              Array.from({ length: 9 }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-1.5 bg-emerald-500 rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 40}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: '0.6s'
                  }}
                />
              ))
            ) : statusText === 'Speaking' ? (
              // Active speaking visual waves
              Array.from({ length: 9 }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-1.5 bg-indigo-500 rounded-full animate-pulse"
                  style={{
                    height: `${15 + Math.random() * 35}px`,
                    animationDelay: `${i * 0.08}s`,
                    animationDuration: '0.5s'
                  }}
                />
              ))
            ) : statusText === 'Thinking' ? (
              // Thinking loading dots
              <div className="flex gap-2">
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
              </div>
            ) : (
              // Standby micro line
              <div className="w-32 h-1 bg-slate-800 rounded-full" />
            )}
          </div>

          {/* Core Dictation Buttons */}
          <div className="flex items-center gap-6">
            {/* Mute button */}
            <button
              onClick={() => {
                setIsMuted(!isMuted);
                if (!isMuted) stopSpeaking();
              }}
              className={`p-3 rounded-full border transition-all ${
                isMuted 
                  ? 'bg-red-950/50 border-red-500/40 text-red-400' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title={isMuted ? "Unmute Spoken Output" : "Mute Spoken Output"}
            >
              {isMuted ? <VolumeX className="h-4.5 w-4.5" /> : <Volume2 className="h-4.5 w-4.5" />}
            </button>

            {/* Mic push button */}
            <button
              onClick={statusText === 'Listening' ? () => {} : startListening}
              disabled={statusText === 'Thinking' || statusText === 'Speaking'}
              className={`h-16 w-16 rounded-full flex items-center justify-center text-white transition-all transform shadow-lg hover:scale-105 active:scale-95 border ${
                statusText === 'Listening' 
                  ? 'bg-red-600 border-red-500 animate-pulse shadow-red-900/20' 
                  : statusText === 'Speaking'
                  ? 'bg-indigo-600 border-indigo-500 hover:bg-indigo-500'
                  : 'bg-emerald-600 border-emerald-500 hover:bg-emerald-500'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {statusText === 'Listening' ? (
                <Mic className="h-7 w-7" />
              ) : statusText === 'Speaking' ? (
                <Volume2 className="h-7 w-7 animate-bounce" onClick={stopSpeaking} />
              ) : (
                <Mic className="h-7 w-7" />
              )}
            </button>

            {/* Cancel/Stop Speaking */}
            <button
              onClick={stopSpeaking}
              disabled={statusText !== 'Speaking'}
              className="p-3 rounded-full border bg-slate-900 border-slate-800 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              title="Stop Speaking"
            >
              <Pause className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Action indicator helper text */}
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            {statusText === 'Listening' ? '🗣️ LISTENING - SPEAK NOW' :
             statusText === 'Speaking' ? '🔊 GEMINI VOICE ONLINE (TAP MIC TO STOP)' :
             statusText === 'Thinking' ? '🧠 REASONING CHANNELS...' :
             '🎙️ TAP MICROPHONE TO SPEAK'}
          </span>
        </div>

      </div>
    </div>
  );
}
