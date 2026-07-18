/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Smartphone, Ticket, MapPin, Coffee, AlertTriangle, Send, 
  Sparkles, CheckCircle, Navigation, Loader2, RefreshCw,
  Brain, Mic, Volume2, Search
} from 'lucide-react';
import { StadiumState, Incident, ChatMessage } from '../types';

interface FanViewProps {
  state: StadiumState;
  onUpdateState: (newState: StadiumState) => void;
}

export default function FanView({ state, onUpdateState }: FanViewProps) {
  const dictationRecRef = React.useRef<any>(null);
  const dictationStartingRef = React.useRef<boolean>(false);

  // Mobile UI Tabs
  const [activeTab, setActiveTab] = useState<'ticket' | 'food' | 'report' | 'chat'>('ticket');

  // Quick report state
  const [reportType, setReportType] = useState('Maintenance');
  const [reportLocation, setReportLocation] = useState('Section 103');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSeverity, setReportSeverity] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [reportSuccess, setReportSuccess] = useState(false);

  // Concession checkout state
  const [orderingFood, setOrderingFood] = useState<string | null>(null);
  const [orderedItem, setOrderedItem] = useState<string | null>(null);

  // Fan Agent chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'fan-1',
      sender: 'agent',
      agentName: 'Fan Agent',
      text: "Hi! I'm your digital Stadium Concierge. 🏟️ Ask me about concessions lines, finding your seat, or transit options, and I'll find the best options for you!",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  // Dynamic Gemini Intelligence options for Fans
  const [selectedModel, setSelectedModel] = useState<'gemini-3.1-flash-lite' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite'>('gemini-3.1-flash-lite');
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [useMapsGrounding, setUseMapsGrounding] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isDictating, setIsDictating] = useState(false);

  // Seat finder toggle
  const [showSeatRoute, setShowSeatRoute] = useState(false);

  // Play PCM Audio helper
  const playPcmAudio = (base64Data: string) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const audioCtx = new AudioContextClass({ sampleRate: 24000 });
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
      source.start();
    } catch (err) {
      console.error('Audio playback failed', err);
    }
  };

  // Browser-native speech-to-text dictation
  const startDictation = () => {
    if (dictationStartingRef.current) return;

    if (isDictating && dictationRecRef.current) {
      try {
        dictationRecRef.current.abort();
      } catch (err) {
        console.error('Error aborting dictation:', err);
      }
      setIsDictating(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        dictationStartingRef.current = true;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
          setIsDictating(true);
          dictationStartingRef.current = false;
        };
        
        recognition.onend = () => {
          setIsDictating(false);
          dictationStartingRef.current = false;
          dictationRecRef.current = null;
        };
        
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputText(transcript);
        };
        
        recognition.onerror = (err: any) => {
          console.error('Speech recognition error:', err);
          setIsDictating(false);
          dictationStartingRef.current = false;
        };

        dictationRecRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.error('Failed to start dictation:', err);
        setIsDictating(false);
        dictationStartingRef.current = false;
      }
    } else {
      alert("Microphone dictation is not supported or accessible in this browser view.");
    }
  };

  // Chat request to Fan Agent
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText('');
    setLoadingChat(true);

    try {
      const response = await fetch('/api/gemini/fan-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          stadiumState: state,
          model: selectedModel,
          useSearch: useSearchGrounding,
          useMaps: useMapsGrounding,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch Fan Agent reply');
      const data = await response.json();

      const responseText = data.text || "I'm looking into this for you. Let me coordinate with our support teams!";

      setMessages((prev) => [
        ...prev,
        {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          agentName: 'Fan Agent',
          text: responseText,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      if (data.raiseIncident) {
        const inc = data.raiseIncident;
        const autoIncident: Incident = {
          id: `inc-fanchat-${Date.now()}`,
          title: inc.title || `AI Auto-Report: ${inc.category} at ${inc.location}`,
          category: (inc.category as any) || 'Maintenance',
          severity: (inc.severity as any) || 'Medium',
          location: inc.location || 'Section 103',
          description: inc.description || 'Reported via Fan Assistant Smart Chat',
          status: 'Reported',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
          reportedBy: 'Fan',
          aiSuggestedFix: `Smart Chat Assistant Advice: Proceed to ${inc.location} immediately. Assisting: ${inc.category === 'Security' ? 'Security' : inc.category === 'Medical' ? 'Medical' : 'Janitorial'} staff.`,
        };

        // Inject incident to central state
        onUpdateState({
          ...state,
          incidents: [autoIncident, ...state.incidents],
        });

        // Add visual confirmation in the mobile chat
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              sender: 'agent',
              agentName: 'Dispatch Center',
              text: `🚨 [Command Dispatch Connected] Your chat report regarding "${autoIncident.title}" has been registered in the Ops Dashboard! Standard response protocols triggered.`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        }, 800);
      }

      // If voice output is enabled, synthesize and speak the reply
      if (voiceEnabled) {
        try {
          const voiceRes = await fetch('/api/gemini/voice-assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `Speak this fan advice in a friendly stadium voice: "${data.text}"`,
              voiceName: 'Puck',
            }),
          });
          if (voiceRes.ok) {
            const voiceData = await voiceRes.json();
            if (voiceData.audioBase64) {
              playPcmAudio(voiceData.audioBase64);
            }
          }
        } catch (vErr) {
          console.error('Failed to voice response:', vErr);
        }
      }
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        {
          id: `agent-err-${Date.now()}`,
          sender: 'agent',
          agentName: 'Fan Agent',
          text: "🍔 I'm currently fetching wait times. Let me know if you need help finding your ticket or seat section!",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  // Log new Incident reported by Fan
  const handleReportIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDescription.trim()) return;

    const categoryMapping: { [key: string]: 'Security' | 'Medical' | 'CrowdControl' | 'Maintenance' | 'Weather' } = {
      'Security': 'Security',
      'Medical': 'Medical',
      'Janitorial': 'Maintenance',
      'Maintenance': 'Maintenance',
    };

    const newIncident: Incident = {
      id: `inc-fan-${Date.now()}`,
      title: `Fan Report: ${reportType} at ${reportLocation}`,
      category: categoryMapping[reportType] || 'Maintenance',
      severity: reportSeverity,
      location: reportLocation,
      description: reportDescription,
      status: 'Reported',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      reportedBy: 'Fan',
      aiSuggestedFix: `Fan reported ${reportType}. Recommendation: Dispatch ${reportType === 'Security' ? 'Security' : reportType === 'Medical' ? 'Medical' : 'Janitorial'} team nearest to ${reportLocation} immediately.`,
    };

    // Update StadiumState with new incident
    onUpdateState({
      ...state,
      incidents: [newIncident, ...state.incidents],
    });

    setReportSuccess(true);
    setReportDescription('');
    setTimeout(() => {
      setReportSuccess(false);
      setActiveTab('ticket');
    }, 3000);
  };

  // Simulated Order Concession
  const handleOrderFood = (item: string) => {
    setOrderingFood(item);
    setTimeout(() => {
      setOrderingFood(null);
      setOrderedItem(item);
      setTimeout(() => setOrderedItem(null), 4000);
    }, 2000);
  };

  return (
    <div id="fan-phone-simulator" className="flex justify-center items-center h-full p-2">
      
      {/* Smartphone Outer Container */}
      <div className="w-[340px] h-[610px] bg-slate-950 border-[8px] border-slate-800 rounded-[36px] flex flex-col shadow-2xl relative overflow-hidden ring-4 ring-slate-900/40">
        
        {/* Smartphone Camera Notch / Speaker */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-800 rounded-full z-30 flex items-center justify-center gap-1.5 px-3">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-900" /> {/* Lens */}
          <div className="w-10 h-1 bg-slate-900 rounded-full" /> {/* Speaker */}
        </div>

        {/* Smartphone Signal / Battery Header bar */}
        <div className="bg-slate-900 h-9 pt-5 px-6 flex justify-between items-center text-[10px] font-semibold text-slate-400 select-none z-20">
          <span>Stadium Pulse Mobile</span>
          <div className="flex items-center gap-1">
            <span>5G</span>
            <div className="w-5 h-2.5 border border-slate-500 rounded-xs p-0.5 flex">
              <div className="bg-emerald-500 h-full w-4/5 rounded-2xs" />
            </div>
          </div>
        </div>

        {/* Mobile App Screen Shell */}
        <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden relative">
          
          {/* Emergency Push Notification Overlay */}
          {state.emergencyBroadcast && (
            <div className="absolute top-12 left-2 right-2 bg-red-600 rounded-2xl p-3 shadow-2xl z-50 animate-in slide-in-from-top-4 fade-in duration-300 border border-red-400">
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-1.5 text-white">
                  <AlertTriangle className="h-4 w-4 animate-pulse" />
                  <span className="font-bold text-xs uppercase">Stadium Alert</span>
                </div>
                <span className="text-[9px] text-red-200 font-mono">{state.emergencyBroadcast.timestamp}</span>
              </div>
              <p className="text-white text-xs leading-relaxed font-medium mt-1">
                {state.emergencyBroadcast.message}
              </p>
              <button 
                onClick={() => onUpdateState({ ...state, emergencyBroadcast: null })}
                className="mt-2.5 w-full bg-red-800/80 hover:bg-red-800 text-white text-[10px] py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
              >
                Acknowledge & Dismiss
              </button>
            </div>
          )}

          {/* Top Branding Nav bar */}
          <div className="bg-slate-900/95 border-b border-slate-800/80 px-4 py-2.5 flex items-center justify-between z-10 shadow-sm">
            <span className="text-xs font-bold tracking-tight text-white flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              Fan Companion
            </span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-300 font-mono">
              Sec 103, Row G
            </span>
          </div>

          {/* Tab Views content area */}
          <div className="flex-1 overflow-y-auto p-4 text-left">
            
            {/* TAB 1: Ticket Wallet & seat finder */}
            {activeTab === 'ticket' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-indigo-900/80 to-slate-900 border border-indigo-500/30 rounded-2xl p-4 shadow-xl relative overflow-hidden">
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl" />
                  
                  <div className="flex justify-between items-start border-b border-indigo-500/20 pb-2">
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-400">Stadium Pulse VIP</span>
                      <h4 className="font-extrabold text-sm text-white mt-0.5">Champions League Final</h4>
                    </div>
                    <Ticket className="h-6 w-6 text-indigo-400" />
                  </div>

                  <div className="grid grid-cols-3 gap-2 my-3 text-center">
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[8px] text-slate-500 block uppercase font-mono">Section</span>
                      <span className="text-sm font-bold text-white">103</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[8px] text-slate-500 block uppercase font-mono">Row</span>
                      <span className="text-sm font-bold text-white">G</span>
                    </div>
                    <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[8px] text-slate-500 block uppercase font-mono">Seat</span>
                      <span className="text-sm font-bold text-white">12</span>
                    </div>
                  </div>

                  {/* QR barcode mock representation */}
                  <div className="bg-white p-2.5 rounded-lg flex flex-col items-center justify-center border border-slate-800 my-4">
                    <div className="h-8 w-full bg-repeating-barcode" />
                    <span className="text-[8px] text-slate-900 font-mono font-bold mt-1.5">★ SV-9382-VIP-12 ★</span>
                  </div>

                  <button 
                    onClick={() => setShowSeatRoute(!showSeatRoute)}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md"
                  >
                    <Navigation className="h-3.5 w-3.5" />
                    {showSeatRoute ? 'Hide Seat Guide' : 'Show Wayfinding Guide'}
                  </button>

                  {showSeatRoute && (
                    <div className="mt-3 bg-slate-950/80 p-2.5 rounded-lg border border-indigo-500/20 text-[10px] text-slate-300 leading-relaxed space-y-1">
                      <p className="font-semibold text-indigo-400">Route Instructions:</p>
                      <p>1. Enter via <strong className="text-white">Gate B (East Concourse)</strong>.</p>
                      <p>2. Take Escalator 3 to Level 2 Concourse.</p>
                      <p>3. Walk past Concession East; Section 103 entrance is on your right.</p>
                    </div>
                  )}
                </div>

                {/* Event Schedule Alert card */}
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-xs flex gap-2.5">
                  <span className="text-xl">⚽</span>
                  <div>
                    <span className="font-bold text-slate-200 block">Active Event: Real Madrid vs Man City</span>
                    <span className="text-[10px] text-emerald-400 mt-0.5 inline-block">● Event active • Half-time</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Concessions & mobile ordering */}
            {activeTab === 'food' && (
              <div className="space-y-3">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-2">Concession Queue Speeds</h4>
                
                {state.concessions.map((item) => {
                  const isQueued = item.queueLength > 10;
                  const queueColor = isQueued ? 'text-red-400' : 'text-emerald-400';
                  
                  return (
                    <div key={item.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-xs text-white block">{item.name}</span>
                          <span className="text-[9px] text-slate-500 font-mono uppercase">{item.category} • {item.location}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-bold block ${queueColor}`}>
                            {item.avgWaitMinutes} mins
                          </span>
                          <span className="text-[9px] text-slate-500 block font-mono">Queue: {item.queueLength} fans</span>
                        </div>
                      </div>

                      {/* Mock Quick-Order Options */}
                      <div className="flex gap-1.5 mt-1">
                        <button
                          onClick={() => handleOrderFood(`${item.name} Hot Dog`)}
                          disabled={orderingFood !== null}
                          className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded px-2 py-1 text-[10px] font-semibold text-slate-300 flex items-center justify-center gap-1"
                        >
                          <Coffee className="h-3 w-3" />
                          Combo ($12)
                        </button>
                        <button
                          onClick={() => handleOrderFood(`${item.name} Beer`)}
                          disabled={orderingFood !== null}
                          className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded px-2 py-1 text-[10px] font-semibold text-slate-300 flex items-center justify-center gap-1"
                        >
                          Draft Soda ($5)
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Simulated Checkout screen overlays */}
                {orderingFood && (
                  <div className="bg-indigo-950/80 border border-indigo-500/30 p-3 rounded-lg flex items-center gap-2.5 text-xs text-slate-200">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                    <span>Processing wallet payment for <strong>{orderingFood}</strong>...</span>
                  </div>
                )}

                {orderedItem && (
                  <div className="bg-emerald-950/80 border border-emerald-500/30 p-3 rounded-lg flex items-center gap-2.5 text-xs text-slate-200 animate-pulse">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <div>
                      <span className="font-bold block text-emerald-400">Order Placed! Receipt #4823</span>
                      <span className="text-[10px] text-slate-300">Pick up at Express lane when notified.</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Incident quick-report form */}
            {activeTab === 'report' && (
              <div className="space-y-4">
                <div className="bg-amber-950/10 border border-amber-900/30 p-3 rounded-xl flex gap-2.5 text-xs text-amber-200">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  <p className="leading-relaxed">
                    <strong>Report Stadium Issue:</strong> Your live report connects directly to the Ops Decision Center to dispatch security or maintenance teams.
                  </p>
                </div>

                {reportSuccess ? (
                  <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 text-center space-y-2">
                    <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
                    <h5 className="font-bold text-xs text-white">Incident Dispatch Triggered</h5>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Ops center has processed your report at {reportLocation}. An assistant has been directed to resolve this. Reassurance sent!
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleReportIncident} className="space-y-3.5">
                    <div>
                      <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Issue Category:</label>
                      <select
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Janitorial">Spill / Cleanliness (Janitorial)</option>
                        <option value="Security">Security Issue / Disturbances</option>
                        <option value="Medical">Medical Assistance Required</option>
                        <option value="Maintenance">Facility Malfunction / Maintenance</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Location / Seat:</label>
                      <input
                        type="text"
                        value={reportLocation}
                        onChange={(e) => setReportLocation(e.target.value)}
                        placeholder="e.g. Section 103, Row G, Seat 12"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Incident Severity:</label>
                      <select
                        value={reportSeverity}
                        onChange={(e) => setReportSeverity(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs px-2.5 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-bold"
                      >
                        <option value="Low">Low - Minor Inconvenience</option>
                        <option value="Medium">Medium - Standard Issue</option>
                        <option value="High">High - Urgent / Disturbance</option>
                        <option value="Critical">🚨 Critical - Emergency Siren Alarm</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Details:</label>
                      <textarea
                        value={reportDescription}
                        onChange={(e) => setReportDescription(e.target.value)}
                        placeholder="Please describe the issue..."
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs py-2 rounded-lg shadow-md transition-colors"
                    >
                      Submit Report
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 4: Smart Concierge AI chatbot */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-[400px]">
                {/* Options and Toggles Toolbar */}
                <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-850 mb-2 space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-400">Concierge Model:</span>
                    <select
                      value={selectedModel}
                      onChange={(e: any) => setSelectedModel(e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-[9px] text-emerald-400 font-bold px-1.5 py-0.5 rounded focus:outline-none"
                    >
                      <option value="gemini-3.1-flash-lite">Lite (Fast Tasks)</option>
                      <option value="gemini-3.1-flash-lite">Flash (General)</option>
                      <option value="gemini-3.1-pro-preview">Pro (Deep Intel)</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 text-[9px] text-slate-400 cursor-pointer select-none hover:text-white">
                        <input
                          type="checkbox"
                          checked={useSearchGrounding}
                          onChange={(e) => setUseSearchGrounding(e.target.checked)}
                          className="rounded border-slate-800 bg-slate-950 text-emerald-600 focus:ring-0 h-2.5 w-2.5"
                        />
                        <span>🌐 Search</span>
                      </label>
                      <label className="flex items-center gap-1 text-[9px] text-slate-400 cursor-pointer select-none hover:text-white">
                        <input
                          type="checkbox"
                          checked={useMapsGrounding}
                          onChange={(e) => setUseMapsGrounding(e.target.checked)}
                          className="rounded border-slate-800 bg-slate-950 text-emerald-600 focus:ring-0 h-2.5 w-2.5"
                        />
                        <span>🗺️ Maps</span>
                      </label>
                    </div>
                    <button
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold border transition-colors ${
                        voiceEnabled 
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                          : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Volume2 className="h-2.5 w-2.5" />
                      <span>{voiceEnabled ? 'Voice: On' : 'Voice: Off'}</span>
                    </button>
                  </div>
                </div>

                {/* Chat Scroll area */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-[11px] pb-2">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.sender === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      {msg.sender === 'agent' && (
                        <span className="text-[8px] text-emerald-400 font-bold uppercase tracking-wider mb-0.5">
                          {msg.agentName}
                        </span>
                      )}
                      <div
                        className={`p-2 rounded-lg max-w-[85%] leading-normal ${
                          msg.sender === 'user'
                            ? 'bg-emerald-600 text-white rounded-tr-none'
                            : 'bg-slate-950 border border-slate-800 text-slate-300 rounded-tl-none'
                        }`}
                      >
                        {msg.text}

                        {/* Render Search & Maps Grounding Chunk references if present */}
                        {msg.sender === 'agent' && msg.chunks && msg.chunks.length > 0 && (
                          <div className="mt-1.5 pt-1 border-t border-slate-850 text-[8px] text-slate-400 space-y-0.5">
                            <span className="font-bold uppercase font-mono block">References:</span>
                            {msg.chunks.map((chunk: any, ci: number) => {
                              const title = chunk.web?.title || chunk.maps?.title || `Link #${ci + 1}`;
                              const uri = chunk.web?.uri || chunk.maps?.uri;
                              if (!uri) return null;
                              return (
                                <a 
                                  key={ci} 
                                  href={uri} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  className="block hover:text-emerald-400 truncate text-emerald-500 underline"
                                >
                                  🔗 {title}
                                </a>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[8px] text-slate-500 font-mono">{msg.timestamp}</span>
                        {msg.sender === 'agent' && (
                          <button
                            onClick={() => {
                              fetch('/api/gemini/voice-assistant', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ prompt: msg.text, voiceName: 'Puck' })
                              })
                              .then(r => r.json())
                              .then(d => {
                                if (d.audioBase64) playPcmAudio(d.audioBase64);
                              });
                            }}
                            className="text-[8px] text-slate-500 hover:text-emerald-400 flex items-center gap-0.5"
                            title="Speak response"
                          >
                            <Volume2 className="h-2 w-2" />
                            <span>Speak</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {loadingChat && (
                    <div className="flex items-center gap-1 text-[9px] text-slate-500 italic animate-pulse pl-1">
                      <Sparkles className="h-2.5 w-2.5 animate-spin text-emerald-400" />
                      Fan Agent is thinking...
                    </div>
                  )}
                </div>

                {/* Message input */}
                <form onSubmit={handleSendMessage} className="flex gap-1 border-t border-slate-800 pt-2">
                  <button
                    type="button"
                    onClick={startDictation}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      isDictating 
                        ? 'bg-red-950/60 border-red-500/40 text-red-400 animate-pulse' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title="Dictate message"
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </button>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ask directions, wait times..."
                    disabled={loadingChat}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg text-xs px-2 py-1 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={loadingChat || !inputText.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white p-1.5 rounded-lg transition-colors flex items-center justify-center disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            )}

          </div>

          {/* Smartphone Footer Navigation bar */}
          <div className="bg-slate-950/95 border-t border-slate-800/80 px-4 py-2 flex justify-around select-none">
            <button 
              onClick={() => setActiveTab('ticket')}
              className={`flex flex-col items-center gap-0.5 ${activeTab === 'ticket' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Ticket className="h-4 w-4" />
              <span className="text-[8px] font-medium">Ticket</span>
            </button>
            <button 
              onClick={() => setActiveTab('food')}
              className={`flex flex-col items-center gap-0.5 ${activeTab === 'food' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Coffee className="h-4 w-4" />
              <span className="text-[8px] font-medium">Concessions</span>
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex flex-col items-center gap-0.5 ${activeTab === 'chat' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="text-[8px] font-medium">AI Concierge</span>
            </button>
            <button 
              onClick={() => setActiveTab('report')}
              className={`flex flex-col items-center gap-0.5 ${activeTab === 'report' ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="text-[8px] font-medium">Quick Report</span>
            </button>
          </div>

        </div>

        {/* Smartphone Home Swipe Indicator */}
        <div className="h-4 w-full bg-slate-950 flex justify-center items-center select-none z-20">
          <div className="w-24 h-1 bg-slate-800 rounded-full" />
        </div>

      </div>

    </div>
  );
}
