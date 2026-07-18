/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, Activity, Trash2, CheckSquare, MessageSquare, Send, 
  Sparkles, ClipboardList, RefreshCw, UserCheck2, Loader2, Phone,
  Radio, Volume2, Check, Users, Brain, Mic
} from 'lucide-react';
import { StadiumState, Incident, StaffMember, ChatMessage } from '../types';

interface StaffViewProps {
  state: StadiumState;
  onUpdateState: (newState: StadiumState) => void;
}

export default function StaffView({ state, onUpdateState }: StaffViewProps) {
  const dictationRecRef = React.useRef<any>(null);
  const dictationStartingRef = React.useRef<boolean>(false);

  // Active Staff ID selected on mobile terminal
  const [selectedStaffId, setSelectedStaffId] = useState<string>('staff-1'); // Default Security (Officer Miller)
  const [activeTab, setActiveTab] = useState<'tasks' | 'chat'>('tasks');

  // Radio Voice dispatch simulation states
  const [voiceDispatchActive, setVoiceDispatchActive] = useState(false);
  const [checkedSOPs, setCheckedSOPs] = useState<{ [key: string]: boolean }>({});

  // SOP Items generator
  const getSOPItems = (role: string) => {
    switch (role) {
      case 'Security':
        return [
          'Verify physical perimeter locks & crowd spacing',
          'Check spectator ID credentials & match tickets',
          'Coordinate immediate path clearance with EMTs',
          'Confirm security threat is fully neutralized'
        ];
      case 'Medical':
        return [
          'Check patient responsiveness and clear airway',
          'Locate & deploy nearest AED/trauma kit',
          'Stabilize patient vital indicators',
          'Broadcast status and coordinate ambulance egress'
        ];
      case 'Janitorial':
        return [
          'Isolate spill hazard with fluorescent warning cones',
          'Apply rapid chemical absorption agent',
          'Mop, sanitize, and dry the affected surface',
          'Validate section safety and update Command Center'
        ];
      default:
        return [
          'Acknowledge automated dispatch order',
          'Navigate to precise GPS-located incident coordinates',
          'Inspect incident area and assess severity',
          'Report final resolution to AI Operating System'
        ];
    }
  };

  // Distance calculation based on GPS coords
  const getDistance = (g1: { x: number; y: number }, g2: { x: number; y: number }) => {
    const dx = g1.x - g2.x;
    const dy = g1.y - g2.y;
    return Math.round(Math.sqrt(dx * dx + dy * dy) * 1.5); // scaled meters
  };

  // Staff Agent chat state
  const [messages, setMessages] = useState<{ [key: string]: ChatMessage[] }>({
    'staff-1': [
      {
        id: 'st-init-1',
        sender: 'agent',
        agentName: 'Staff Agent',
        text: "Officer Miller, Security Dispatch AI online. Ground reports indicate half-time crowd shifting. Let me know if you need tactical protocols or crowd guidance.",
        timestamp: new Date().toLocaleTimeString(),
      },
    ],
    'staff-2': [
      {
        id: 'st-init-2',
        sender: 'agent',
        agentName: 'Staff Agent',
        text: "Sarah, Medical Dispatch AI active. Keep me updated on any heat fatigue or medical dispatches. Procedural steps are ready if you request them.",
        timestamp: new Date().toLocaleTimeString(),
      },
    ],
    'staff-3': [
      {
        id: 'st-init-3',
        sender: 'agent',
        agentName: 'Staff Agent',
        text: "Marcus, Janitorial Ops AI standing by. I monitor toilet supply alerts and concession waste bins. Report any cleanups so I can register resolutions.",
        timestamp: new Date().toLocaleTimeString(),
      },
    ],
  });
  const [inputText, setInputText] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  // Dynamic Gemini Intelligence options for Staff
  const [selectedModel, setSelectedModel] = useState<'gemini-3.1-flash-lite' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite'>('gemini-3.1-pro-preview'); // Defaults to Pro for Staff/SOP complex reasoning!
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [useMapsGrounding, setUseMapsGrounding] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isDictating, setIsDictating] = useState(false);

  // Active staff object
  const currentStaff = state.staff.find((s) => s.id === selectedStaffId) || state.staff[0];

  // Active dispatched incident
  const activeIncident = state.incidents.find(
    (inc) => inc.assignedStaffId === currentStaff.id && inc.status !== 'Resolved'
  );

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

  // Send message to Staff Agent
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString(),
    };

    const currentStaffHistory = messages[selectedStaffId] || [];
    const updatedHistory = [...currentStaffHistory, userMsg];

    setMessages((prev) => ({ ...prev, [selectedStaffId]: updatedHistory }));
    setInputText('');
    setLoadingChat(true);

    try {
      const response = await fetch('/api/gemini/staff-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedHistory,
          stadiumState: state,
          staffMember: currentStaff,
          model: selectedModel,
          useSearch: useSearchGrounding,
          useMaps: useMapsGrounding,
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch Staff Agent reply');
      const data = await response.json();

      const responseText = data.text || "Proceeding with standard tactical procedures. Copy that.";

      setMessages((prev) => ({
        ...prev,
        [selectedStaffId]: [
          ...updatedHistory,
          {
            id: `agent-${Date.now()}`,
            sender: 'agent',
            agentName: 'Staff Agent',
            text: responseText,
            timestamp: new Date().toLocaleTimeString(),
          },
        ],
      }));

      if (data.updateStatus) {
        // Automatically trigger status update on the incident and staff
        handleUpdateIncidentStatus(data.updateStatus);

        // Add a radio confirmation
        setTimeout(() => {
          setMessages((prev) => ({
            ...prev,
            [selectedStaffId]: [
              ...(prev[selectedStaffId] || []),
              {
                id: `sys-${Date.now()}`,
                sender: 'agent',
                agentName: 'Radio Command',
                text: `📻 [Command Link] Automated status sync: Incident task updated to "${data.updateStatus}" and logged in Command Center.`,
                timestamp: new Date().toLocaleTimeString(),
              },
            ],
          }));
        }, 800);
      }

      // If voice output is enabled, synthesize and speak the reply
      if (voiceEnabled) {
        try {
          const voiceRes = await fetch('/api/gemini/voice-assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `Acknowledge ground dispatcher SOP rule in a clear tactical radio voice: "${data.text}"`,
              voiceName: 'Kore',
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
      setMessages((prev) => ({
        ...prev,
        [selectedStaffId]: [
          ...updatedHistory,
          {
            id: `agent-err-${Date.now()}`,
            sender: 'agent',
            agentName: 'Staff Agent',
            text: '👮 Communication channel busy. Proceed with on-ground safety protocols. Acknowledging state updates.',
            timestamp: new Date().toLocaleTimeString(),
          },
        ],
      }));
    } finally {
      setLoadingChat(false);
    }
  };

  // Ground Staff status transitions
  const handleUpdateIncidentStatus = (newStatus: 'In Progress' | 'Resolved') => {
    if (!activeIncident) return;

    // Update incident array
    const updatedIncidents = state.incidents.map((inc) => {
      if (inc.id === activeIncident.id) {
        return { ...inc, status: newStatus };
      }
      return inc;
    });

    // Update staff status
    const updatedStaff = state.staff.map((s) => {
      if (s.id === currentStaff.id) {
        return {
          ...s,
          status: newStatus === 'Resolved' ? ('Idle' as const) : ('Dispatched' as const),
          activeTaskId: newStatus === 'Resolved' ? undefined : s.activeTaskId,
        };
      }
      return s;
    });

    onUpdateState({
      ...state,
      incidents: updatedIncidents,
      staff: updatedStaff,
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Security': return <Shield className="h-4 w-4 text-blue-400" />;
      case 'Medical': return <Activity className="h-4 w-4 text-rose-400" />;
      case 'Janitorial': return <Trash2 className="h-4 w-4 text-amber-400" />;
      default: return <ClipboardList className="h-4 w-4 text-emerald-400" />;
    }
  };

  return (
    <div id="staff-phone-simulator" className="flex justify-center items-center h-full p-2">
      
      {/* Smartphone Outer Shell */}
      <div className="w-[340px] h-[610px] bg-slate-950 border-[8px] border-slate-800 rounded-[36px] flex flex-col shadow-2xl relative overflow-hidden ring-4 ring-slate-900/40">
        
        {/* Smartphone Camera Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-32 h-5 bg-slate-800 rounded-full z-30 flex items-center justify-center gap-1.5 px-3">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
          <div className="w-10 h-1 bg-slate-900 rounded-full" />
        </div>

        {/* Smartphone Signal bar */}
        <div className="bg-slate-900 h-9 pt-5 px-6 flex justify-between items-center text-[10px] font-semibold text-slate-400 select-none z-20">
          <span>SV Staff Network</span>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-blue-400 uppercase font-mono font-bold">SECURE CHANNEL</span>
            <div className="w-5 h-2.5 border border-slate-500 rounded-xs p-0.5 flex">
              <div className="bg-blue-500 h-full w-full rounded-2xs" />
            </div>
          </div>
        </div>

        {/* Staff Screen Display */}
        <div className="flex-1 flex flex-col bg-slate-900 overflow-hidden relative">
          
          {/* Top Selection Nav */}
          <div className="bg-slate-900/95 border-b border-slate-800/80 px-3 py-2.5 flex items-center justify-between z-10">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Terminal Node:</span>
              
              {/* Dynamic staff selector drop */}
              <select
                value={selectedStaffId}
                onChange={(e) => {
                  setSelectedStaffId(e.target.value);
                  setActiveTab('tasks');
                }}
                className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-200 focus:outline-none focus:border-blue-500 font-bold"
              >
                {state.staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.role}: {s.name.split(' ')[1] || s.name}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[9px] bg-blue-950 border border-blue-900/50 text-blue-400 px-1.5 py-0.5 rounded font-mono uppercase">
              GPS ON
            </span>
          </div>

          {/* Active Terminal Content Area */}
          <div className="flex-1 overflow-y-auto p-4 text-left">
            
            {/* TAB 1: Tasks Feed */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                
                {/* Personnel Card */}
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
                      {getRoleIcon(currentStaff.role)}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-200">{currentStaff.name}</h4>
                      <span className="text-[9px] text-slate-500 font-mono uppercase">{currentStaff.role} UNIT</span>
                    </div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase font-mono ${
                    currentStaff.status === 'Dispatched' ? 'bg-amber-600/20 text-amber-400 border border-amber-500/20' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {currentStaff.status}
                  </span>
                </div>
                {/* Active Dispatched Duty Alert */}
                {activeIncident ? (
                  <div className="border border-amber-500/20 bg-amber-950/10 rounded-2xl p-4 shadow-xl space-y-3 relative overflow-hidden">
                    <div className="absolute right-2 top-2 text-amber-500/10">
                      <ClipboardList className="h-10 w-10" />
                    </div>

                    <div className="border-b border-slate-800 pb-2">
                      <span className="text-[8px] font-bold tracking-wider text-amber-400 font-mono uppercase">DISPATCH DIRECTIVE ALARM</span>
                      <h5 className="font-extrabold text-xs text-white mt-0.5 uppercase">{activeIncident.title}</h5>
                    </div>

                    <div className="space-y-1.5 text-[10.5px] text-slate-300">
                      <p>📍 <strong className="text-white">Location:</strong> {activeIncident.location}</p>
                      <p>⚠️ <strong className="text-white">Severity:</strong> {activeIncident.severity}</p>
                      <p className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-slate-400 italic text-[10px] leading-relaxed mt-2">
                        "{activeIncident.description}"
                      </p>
                    </div>

                    {/* SOP Tactical Checklist */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-2">
                      <span className="text-[9px] font-bold tracking-wider text-emerald-400 font-mono uppercase block">SOP Tactical Checklist:</span>
                      {getSOPItems(currentStaff.role).map((sop, idx) => {
                        const sopKey = `${currentStaff.id}-${idx}`;
                        const isChecked = !!checkedSOPs[sopKey];
                        return (
                          <label key={idx} className="flex items-start gap-2 text-[10px] text-slate-300 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => setCheckedSOPs(prev => ({ ...prev, [sopKey]: !prev[sopKey] }))}
                              className="mt-0.5 h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                            />
                            <span className={isChecked ? "line-through text-slate-500" : ""}>{sop}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Step-by-step guidance block */}
                    <div className="bg-blue-950/20 border border-blue-500/20 p-3 rounded-lg text-[10px] text-blue-300 leading-relaxed">
                      <span className="font-bold block uppercase tracking-wider mb-1">AUTOMATED INCIDENT PROCEDURE:</span>
                      {activeIncident.aiSuggestedFix}
                    </div>

                    {/* Task Actions buttons */}
                    <div className="flex gap-2.5 pt-2">
                      {activeIncident.status === 'Assigned' && (
                        <button
                          onClick={() => handleUpdateIncidentStatus('In Progress')}
                          className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" />
                          Acknowledge
                        </button>
                      )}
                      
                      {activeIncident.status === 'In Progress' && (
                        <button
                          onClick={() => handleUpdateIncidentStatus('Resolved')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                        >
                          <CheckSquare className="h-3.5 w-3.5" />
                          Mark Resolved
                        </button>
                      )}
                    </div>

                  </div>
                ) : (
                  <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 text-center space-y-2">
                    <CheckSquare className="h-8 w-8 text-slate-800 mx-auto" />
                    <h5 className="font-bold text-xs text-slate-400">Standby Status</h5>
                    <p className="text-[10px] text-slate-500 leading-relaxed">
                      All sectors stable. Standby for dispatch alerts or ask the Staff Agent for guidelines in the Chat tab.
                    </p>
                  </div>
                )}

                {/* Nearby Teammates Tracker */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center gap-1.5 border-b border-slate-800/80 pb-1.5">
                    <Users className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nearby Teammates GPS:</span>
                  </div>
                  <div className="space-y-1.5">
                    {state.staff.filter(s => s.id !== currentStaff.id).map(teammate => {
                      const distance = getDistance(currentStaff.gps, teammate.gps);
                      return (
                        <div key={teammate.id} className="flex justify-between items-center text-[10px]">
                          <span className="text-slate-300 font-medium">{teammate.name} ({teammate.role})</span>
                          <span className="text-slate-500 font-mono">{distance}m away • {teammate.status}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Secure AI Voice Dispatch line simulation */}
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Radio className="h-4 w-4 text-blue-400" />
                      <span className="font-semibold text-slate-200">Secure Voice Dispatch</span>
                    </div>
                    <button
                      onClick={() => setVoiceDispatchActive(!voiceDispatchActive)}
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all ${
                        voiceDispatchActive ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {voiceDispatchActive ? 'MONITOR' : 'STANDBY'}
                    </button>
                  </div>
                  {voiceDispatchActive && (
                    <div className="space-y-1.5 mt-1">
                      <div className="flex items-center gap-1 justify-center py-1.5 h-7">
                        {[...Array(16)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-blue-500 rounded-full animate-pulse"
                            style={{
                              height: `${(i % 3 === 0 ? 16 : i % 2 === 0 ? 10 : 6) + Math.floor(Math.random() * 8)}px`,
                              animationDelay: `${i * 0.05}s`
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-[9px] text-blue-400 italic font-mono text-center leading-snug">
                        "Radio: Monitoring channel... Teammate telemetry synced. Await automatic dispatch coordinates."
                      </p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 2: AI Dispatcher Chat */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-[400px]">
                {/* Options and Toggles Toolbar */}
                <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-850 mb-2 space-y-1.5 text-[10px]">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-400">Dispatcher Model:</span>
                    <select
                      value={selectedModel}
                      onChange={(e: any) => setSelectedModel(e.target.value)}
                      className="bg-slate-900 border border-slate-800 text-[9px] text-blue-400 font-bold px-1.5 py-0.5 rounded focus:outline-none"
                    >
                      <option value="gemini-3.1-pro-preview">Pro (Deep Intel)</option>
                      <option value="gemini-3.1-flash-lite">Flash (General)</option>
                      <option value="gemini-3.1-flash-lite">Lite (Fast Tasks)</option>
                    </select>
                  </div>
                  <div className="flex justify-between items-center pt-0.5">
                    <div className="flex gap-2">
                      <label className="flex items-center gap-1 text-[9px] text-slate-400 cursor-pointer select-none hover:text-white">
                        <input
                          type="checkbox"
                          checked={useSearchGrounding}
                          onChange={(e) => setUseSearchGrounding(e.target.checked)}
                          className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-0 h-2.5 w-2.5"
                        />
                        <span>🌐 Search</span>
                      </label>
                      <label className="flex items-center gap-1 text-[9px] text-slate-400 cursor-pointer select-none hover:text-white">
                        <input
                          type="checkbox"
                          checked={useMapsGrounding}
                          onChange={(e) => setUseMapsGrounding(e.target.checked)}
                          className="rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-0 h-2.5 w-2.5"
                        />
                        <span>🗺️ Maps</span>
                      </label>
                    </div>
                    <button
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      className={`flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold border transition-colors ${
                        voiceEnabled 
                          ? 'bg-blue-950/40 border-blue-500/30 text-blue-400' 
                          : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <Volume2 className="h-2.5 w-2.5" />
                      <span>{voiceEnabled ? 'Voice: On' : 'Voice: Off'}</span>
                    </button>
                  </div>
                </div>

                {/* Chat feed */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-[11px] pb-2">
                  {(messages[selectedStaffId] || []).map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        msg.sender === 'user' ? 'items-end' : 'items-start'
                      }`}
                    >
                      {msg.sender === 'agent' && (
                        <span className="text-[8px] text-blue-400 font-bold uppercase tracking-wider mb-0.5">
                          {msg.agentName}
                        </span>
                      )}
                      <div
                        className={`p-2 rounded-lg max-w-[85%] leading-normal ${
                          msg.sender === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-none'
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
                                  className="block hover:text-blue-400 truncate text-blue-500 underline"
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
                                body: JSON.stringify({ prompt: msg.text, voiceName: 'Kore' })
                              })
                              .then(r => r.json())
                              .then(d => {
                                if (d.audioBase64) playPcmAudio(d.audioBase64);
                              });
                            }}
                            className="text-[8px] text-slate-500 hover:text-blue-400 flex items-center gap-0.5"
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
                      <Sparkles className="h-2.5 w-2.5 animate-spin text-blue-400" />
                      Staff Dispatcher is compiling guidelines...
                    </div>
                  )}
                </div>

                {/* Input block */}
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
                    placeholder={`Ask procedural steps...`}
                    disabled={loadingChat}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg text-xs px-2 py-1 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={loadingChat || !inputText.trim()}
                    className="bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-lg transition-colors flex items-center justify-center disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            )}

          </div>

          {/* Smartphone Navigation Footer */}
          <div className="bg-slate-950/95 border-t border-slate-800/80 px-4 py-2 flex justify-around select-none">
            <button 
              onClick={() => setActiveTab('tasks')}
              className={`flex flex-col items-center gap-0.5 ${activeTab === 'tasks' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <ClipboardList className="h-4 w-4" />
              <span className="text-[8px] font-medium">Duty directives</span>
            </button>
            <button 
              onClick={() => setActiveTab('chat')}
              className={`flex flex-col items-center gap-0.5 ${activeTab === 'chat' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="text-[8px] font-medium">Dispatcher AI</span>
            </button>
          </div>

        </div>

        {/* Swipe bar */}
        <div className="h-4 w-full bg-slate-950 flex justify-center items-center select-none z-20">
          <div className="w-24 h-1 bg-slate-800 rounded-full" />
        </div>

      </div>

    </div>
  );
}
