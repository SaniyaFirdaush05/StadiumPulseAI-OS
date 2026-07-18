/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Building, User, Users, Sliders, Sparkles, Wifi, Shield, 
  Tv, Cpu, Clock, AlertTriangle, Play, HelpCircle, Radio, Mic
} from 'lucide-react';
import { StadiumState, Incident, CCTVFeed, IoTSensor } from './types';
import StadiumMap from './components/StadiumMap';
import DashboardView from './components/DashboardView';
import FanView from './components/FanView';
import StaffView from './components/StaffView';
import SimulatorControls from './components/SimulatorControls';
import VoiceIntercom from './components/VoiceIntercom';

const initialStadiumState: StadiumState = {
  time: '19:35:00',
  eventActive: true,
  eventName: 'FIFA World Cup 2026: USA vs England (Group B)',
  weather: {
    temperature: 72,
    humidity: 58,
    rainChance: 12,
    precipitationRate: 0.0,
    windSpeed: 8,
    roofStatus: 'Open',
  },
  ticketing: {
    capacity: 68000,
    scannedCount: 54120,
    vipScannedCount: 1420,
    scanRateHistory: [380, 410, 485, 490, 520, 580],
    gateStatuses: {
      'Gate A': 'Normal',
      'Gate B': 'Normal',
      'Gate C': 'Normal',
      'Gate D': 'Normal',
    }
  },
  concessions: [
    { id: 'c1', name: 'Tacopedia Cup Corner', category: 'Food', location: 'Concourse East', queueLength: 8, avgWaitMinutes: 4, staffCount: 4 },
    { id: 'c2', name: 'Stars & Stripes Beverages', category: 'Drinks', location: 'Concourse West', queueLength: 14, avgWaitMinutes: 9, staffCount: 3 },
    { id: 'c3', name: 'World Cup 2026 Official Merch', category: 'Merch', location: 'Concourse North', queueLength: 22, avgWaitMinutes: 15, staffCount: 5 },
  ],
  sensors: [
    { id: 's1', name: 'Trash Gate A bin', location: 'Gate A Entrance', type: 'TrashCan', value: 34, status: 'Normal' },
    { id: 's2', name: 'Trash Gate B bin', location: 'Gate B Entrance', type: 'TrashCan', value: 89, status: 'Warning' },
    { id: 's3', name: 'Trash Concourse West bin', location: 'Concourse West', type: 'TrashCan', value: 42, status: 'Normal' },
    { id: 's4', name: 'Trash Concourse East bin', location: 'Concourse East', type: 'TrashCan', value: 92, status: 'Warning' },
    { id: 's5', name: 'Restroom West tissue supply', location: 'Restroom West', type: 'RestroomSupply', value: 21, status: 'Warning' },
    { id: 's6', name: 'Restroom East soap supply', location: 'Restroom East', type: 'RestroomSupply', value: 75, status: 'Normal' },
    { id: 's7', name: 'Acoustic Decibel level', location: 'Section 105', type: 'SoundLevel', value: 94, status: 'Normal' },
  ],
  cctvFeeds: [
    { id: 'cam1', name: 'CCTV Camera 01 (Gate A)', location: 'Gate A turnstile', status: 'Normal', crowdCount: 120, flowRate: 85, aiAnalysis: 'Flow rate steady. Crowd density low. No perimeter alarms.', feedUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
    { id: 'cam2', name: 'CCTV Camera 02 (Gate B)', location: 'Gate B turnstile', status: 'Normal', crowdCount: 145, flowRate: 98, aiAnalysis: 'Ticketing lines moving efficiently. Direct routing successful.', feedUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4' },
    { id: 'cam3', name: 'CCTV Camera 03 (Gate C)', location: 'Gate C turnstile', status: 'Normal', crowdCount: 95, flowRate: 72, aiAnalysis: 'Flow rates stable. Hand luggage checkpoints normal.', feedUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4' },
    { id: 'cam4', name: 'CCTV Camera 04 (Gate D)', location: 'Gate D turnstile', status: 'Normal', crowdCount: 88, flowRate: 64, aiAnalysis: 'Normal transit. Ground ramp dry and clear.', feedUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4' },
    { id: 'cam5', name: 'CCTV Camera 05 (Pitch/Field)', location: 'Pitch perimeter', status: 'Normal', crowdCount: 22, flowRate: 0, aiAnalysis: 'Pitchside secure. Standard technical areas monitored.', feedUrl: 'https://vjs.zencdn.net/v/oceans.mp4' },
    { id: 'cam6', name: 'CCTV Camera 06 (Concourse East)', location: 'Concourse East', status: 'Normal', crowdCount: 180, flowRate: 110, aiAnalysis: 'High flow near concessions. Maintain regular corridor spacing.', feedUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' },
    { id: 'cam7', name: 'CCTV Camera 07 (Concourse West)', location: 'Concourse West', status: 'Normal', crowdCount: 112, flowRate: 74, aiAnalysis: 'Corridors clear. Concession queues moving steadily.', feedUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
  ],
  staff: [
    { id: 'staff-1', name: 'Officer Miller', role: 'Security', status: 'Idle', gps: { x: 30, y: 18 }, phone: '+1 (555) 019-3829' },
    { id: 'staff-2', name: 'EMT Sarah', role: 'Medical', status: 'Idle', gps: { x: 74, y: 28 }, phone: '+1 (555) 019-4821' },
    { id: 'staff-3', name: 'Janitor Marcus', role: 'Janitorial', status: 'Idle', gps: { x: 50, y: 84 }, phone: '+1 (555) 019-2710' },
  ],
  incidents: [
    {
      id: 'inc-init-1',
      title: 'Gate B Minor Spill',
      category: 'Maintenance',
      severity: 'Low',
      location: 'Restroom West',
      description: 'Minor water leak from sink valve creating localized slip hazard.',
      status: 'Reported',
      timestamp: '19:32:10',
      reportedBy: 'IoT',
      aiSuggestedFix: 'Ops Agent: Alert Janitor Marcus to proceed to Restroom West with cleanup kit. Standard priority.'
    }
  ],
  sustainability: {
    energyUsageKw: 4250,
    energyGridStatus: 'Grid Stable',
    waterConsumptionLiters: 12400,
    waterPressurePsi: 65,
    wasteRecyclablePercentage: 68,
    wasteGeneralBinPercentage: 32,
    transportShuttlesActive: 12,
    transportMetroFlowRate: 8500,
    transportParkingOccupancy: 84,
  }
};

export default function App() {
  const [stadiumState, setStadiumState] = useState<StadiumState>(initialStadiumState);
  
  // Real-time local clock state
  const [realTime, setRealTime] = useState<string>('');

  useEffect(() => {
    const updateRealTime = () => {
      const now = new Date();
      setRealTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    updateRealTime();
    const interval = setInterval(updateRealTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Current high-level selected role view (admin / fan / staff)
  const [currentRole, setCurrentRole] = useState<'admin' | 'fan' | 'staff'>('admin');
  
  // Voice Intercom state
  const [voiceIntercomOpen, setVoiceIntercomOpen] = useState(false);
  
  // States to bridge clicks from Map to Admin Dashboard
  const [selectedCamera, setSelectedCamera] = useState<CCTVFeed>(initialStadiumState.cctvFeeds[0]);
  const [selectedSensor, setSelectedSensor] = useState<IoTSensor | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Time simulation ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setStadiumState((prev) => {
        // Ticking time string
        const [h, m, s] = prev.time.split(':').map(Number);
        let ns = s + 1;
        let nm = m;
        let nh = h;
        if (ns >= 60) {
          ns = 0;
          nm += 1;
        }
        if (nm >= 60) {
          nm = 0;
          nh += 1;
        }
        const timeStr = `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}:${String(ns).padStart(2, '0')}`;

        // Ticket scans increment slightly
        const newScanned = Math.min(prev.ticketing.scannedCount + Math.floor(Math.random() * 5) + 1, prev.ticketing.capacity);
        const newVip = Math.min(prev.ticketing.vipScannedCount + (Math.random() > 0.85 ? 1 : 0), 2000);

        // Fluctuate concession queues slightly
        const newConcessions = prev.concessions.map((c) => {
          const delta = Math.random() > 0.6 ? 1 : Math.random() > 0.6 ? -1 : 0;
          const q = Math.max(2, c.queueLength + delta);
          return {
            ...c,
            queueLength: q,
            avgWaitMinutes: Math.max(1, Math.round(q * 0.6)),
          };
        });

        // Fluctuate IoT sensor levels slightly
        const newSensors = prev.sensors.map((sensor) => {
          if (sensor.type === 'TrashCan') {
            const newValue = Math.min(100, sensor.value + (Math.random() > 0.8 ? 1 : 0));
            return {
              ...sensor,
              value: newValue,
              status: newValue > 90 ? 'Critical' as const : newValue > 75 ? 'Warning' as const : 'Normal' as const,
            };
          }
          if (sensor.type === 'RestroomSupply') {
            const newValue = Math.max(0, sensor.value - (Math.random() > 0.8 ? 1 : 0));
            return {
              ...sensor,
              value: newValue,
              status: newValue < 15 ? 'Critical' as const : newValue < 30 ? 'Warning' as const : 'Normal' as const,
            };
          }
          if (sensor.type === 'SoundLevel') {
            const newValue = Math.max(80, Math.min(115, sensor.value + Math.floor(Math.random() * 7) - 3));
            return { ...sensor, value: newValue };
          }
          return sensor;
        });

        // Fluctuate sustainability metrics realistically
        const sDeltaEnergy = Math.floor(Math.random() * 51) - 25;
        const sDeltaWater = Math.floor(Math.random() * 31) - 10;
        const newSustainability = prev.sustainability ? {
          ...prev.sustainability,
          energyUsageKw: Math.max(3000, prev.sustainability.energyUsageKw + sDeltaEnergy),
          waterConsumptionLiters: Math.max(8000, prev.sustainability.waterConsumptionLiters + sDeltaWater),
          waterPressurePsi: Math.max(45, Math.min(85, prev.sustainability.waterPressurePsi + (Math.random() > 0.8 ? (Math.random() > 0.5 ? 1 : -1) : 0))),
          wasteRecyclablePercentage: Math.max(50, Math.min(95, prev.sustainability.wasteRecyclablePercentage + (Math.random() > 0.85 ? (Math.random() > 0.5 ? 0.2 : -0.2) : 0))),
          wasteGeneralBinPercentage: 100 - Math.max(50, Math.min(95, prev.sustainability.wasteRecyclablePercentage)),
          transportMetroFlowRate: Math.max(6000, Math.min(12000, prev.sustainability.transportMetroFlowRate + (Math.floor(Math.random() * 101) - 50))),
          transportParkingOccupancy: Math.max(50, Math.min(100, prev.sustainability.transportParkingOccupancy + (Math.random() > 0.95 ? 1 : 0))),
        } : {
          energyUsageKw: 4250,
          energyGridStatus: 'Grid Stable' as const,
          waterConsumptionLiters: 12400,
          waterPressurePsi: 65,
          wasteRecyclablePercentage: 68,
          wasteGeneralBinPercentage: 32,
          transportShuttlesActive: 12,
          transportMetroFlowRate: 8500,
          transportParkingOccupancy: 84,
        };

        return {
          ...prev,
          time: timeStr,
          ticketing: {
            ...prev.ticketing,
            scannedCount: newScanned,
            vipScannedCount: newVip,
          },
          concessions: newConcessions,
          sensors: newSensors,
          sustainability: newSustainability,
        };
      });
    }, 2000); // Ticks every 2s for immediate feedback in preview

    return () => clearInterval(timer);
  }, []);

  // Sync selected camera or incident when updated inside state
  useEffect(() => {
    const matchedCam = stadiumState.cctvFeeds.find(c => c.id === selectedCamera.id);
    if (matchedCam) setSelectedCamera(matchedCam);
    
    if (selectedIncident) {
      const matchedInc = stadiumState.incidents.find(i => i.id === selectedIncident.id);
      if (matchedInc) setSelectedIncident(matchedInc);
    }
  }, [stadiumState]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none selection:bg-emerald-500/30 antialiased">
      
      {/* GLOBAL TELEMETRY HEADER */}
      <header className="border-b border-slate-900 bg-slate-950 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50 shadow-md backdrop-blur-md">
        
        {/* Logo and Tagline */}
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-tr from-emerald-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-emerald-900/10 border border-emerald-500/20">
            <Cpu className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black tracking-tight text-white uppercase font-sans">
                Stadium <span className="text-emerald-400 font-extrabold">Pulse</span> <span className="bg-gradient-to-r from-yellow-400 to-emerald-400 bg-clip-text text-transparent">AI-OS</span>
              </h1>
              <span className="bg-emerald-900/30 border border-emerald-500/30 text-[9px] px-1.5 py-0.5 rounded font-mono text-emerald-400 flex items-center gap-1 uppercase font-bold">
                <Wifi className="h-2.5 w-2.5 text-emerald-400 animate-pulse" />
                World Cup 2026
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium tracking-tight mt-0.5">
              "One AI. Every Fan. Every Staff Member. Every Decision."
            </p>
          </div>
        </div>

        {/* Global Live Ticker */}
        <div className="flex items-center gap-5 text-xs bg-slate-900/40 border border-slate-800/60 px-4 py-2 rounded-xl backdrop-blur-xs shadow-inner">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-sky-400" />
            <div>
              <span className="text-[9px] text-slate-500 block uppercase font-mono leading-none">Realtime Clock</span>
              <span className="font-mono text-sky-400 text-xs font-bold">{realTime}</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 border-l border-slate-800/60 pl-4">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block" />
            <div>
              <span className="text-[9px] text-slate-500 block uppercase font-mono leading-none">Event Active</span>
              <span className="font-bold text-slate-200 text-xs">{stadiumState.eventName}</span>
            </div>
          </div>
        </div>

        {/* Roles Navigator Switcher (Admin / Fan / Staff) */}
        <div className="flex bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs shadow-md">
          <button
            onClick={() => setCurrentRole('admin')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-semibold ${
              currentRole === 'admin' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building className="h-4 w-4" />
            <span className="hidden md:inline">Command Center (Ops)</span>
            <span className="md:hidden">Ops</span>
          </button>
          
          <button
            onClick={() => setCurrentRole('fan')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-semibold ${
              currentRole === 'fan' 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/10' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span className="hidden md:inline">Fan App (Concierge)</span>
            <span className="md:hidden">Fan</span>
          </button>
          
          <button
            onClick={() => setCurrentRole('staff')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-semibold ${
              currentRole === 'staff' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/10' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="h-4 w-4" />
            <span className="hidden md:inline">Staff Terminal (Duty)</span>
            <span className="md:hidden">Staff</span>
          </button>
        </div>

        {/* Global Live Voice Intercom Toggle */}
        <button
          onClick={() => setVoiceIntercomOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/25 border border-emerald-400/20 transition-all hover:scale-[1.03] active:scale-[0.97]"
        >
          <Radio className="h-4 w-4 animate-pulse text-emerald-300" />
          <span>🎙️ Live Intercom</span>
        </button>

      </header>

      {/* CORE WORKSPACE GRID */}
      <main className="flex-1 p-6 grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        
        {/* INTERACTIVE SVG LIVE MAP (Fixed Left on Desktop for Command/Ops perspective) */}
        {currentRole === 'admin' && (
          <div className="xl:col-span-4 h-full flex flex-col gap-6">
            <StadiumMap
              state={stadiumState}
              onSelectCamera={setSelectedCamera}
              onSelectSensor={setSelectedSensor}
              onSelectIncident={(inc) => {
                setSelectedIncident(inc);
              }}
              selectedCamId={selectedCamera.id}
              selectedSensorId={selectedSensor?.id}
            />

            {/* Simulated Live IoT Status logs ticker */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left flex-1 min-h-[120px] flex flex-col justify-between">
              <div className="flex items-center gap-2 mb-2">
                <Sliders className="h-4 w-4 text-emerald-400 animate-spin-slow" />
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">IoT Sensor Telemetry Log</span>
              </div>
              <div className="space-y-1.5 overflow-y-auto max-h-[140px] pr-1 flex-1">
                {stadiumState.sensors.map((s) => (
                  <div key={s.id} className="flex justify-between items-center text-[10px] py-1 border-b border-slate-800/40">
                    <span className="text-slate-400">{s.name} ({s.location})</span>
                    <span className={`font-mono font-semibold ${
                      s.status === 'Critical' ? 'text-red-400' : s.status === 'Warning' ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {s.type === 'SoundLevel' ? `${s.value} dB` : `${s.value}%`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* DYNAMIC ROLE VIEWS CONTAINER (Admin, Fan, or Staff Screen) */}
        <div className={`h-full ${
          currentRole === 'admin' ? 'xl:col-span-8' : 'xl:col-span-9'
        }`}>
          {currentRole === 'admin' && (
            <DashboardView
              state={stadiumState}
              onUpdateState={setStadiumState}
              selectedCamera={selectedCamera}
              onSelectCamera={setSelectedCamera}
              selectedIncident={selectedIncident}
              onSelectIncident={setSelectedIncident}
            />
          )}

          {currentRole === 'fan' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full items-center">
              <div className="space-y-4 text-left pr-4">
                <div className="bg-emerald-950/20 border border-emerald-500/20 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Sparkles className="h-5 w-5" />
                    <h3 className="font-bold text-sm uppercase">Simulated Fan View Mode</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    This smartphone terminal simulates the **Stadium Pulse Fan Companion App**.
                    As a simulated fan in <strong className="text-white">Section 103</strong>, you can use wayfinding guides, order concessions, report spills/hazards, and chat directly with the **Fan Assistant Agent**.
                  </p>
                </div>
                
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] text-slate-500 block font-mono uppercase">State synchronization tip:</span>
                  <p className="text-xs text-slate-400 leading-normal">
                    Reporting a hazard (e.g. wet floor or medical issue) here instantly propagates to the Admin Dashboard (Command Center) and flashes on the interactive stadium map!
                  </p>
                </div>
              </div>
              <FanView
                state={stadiumState}
                onUpdateState={setStadiumState}
              />
            </div>
          )}

          {currentRole === 'staff' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full items-center">
              <div className="space-y-4 text-left pr-4">
                <div className="bg-blue-950/20 border border-blue-500/20 p-4 rounded-xl">
                  <div className="flex items-center gap-2 text-blue-400">
                    <Shield className="h-5 w-5" />
                    <h3 className="font-bold text-sm uppercase">Simulated Ground Staff View</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    This terminal simulates the secure handheld devices used by field responders.
                    Toggle between <strong className="text-white">Security (Officer Miller)</strong>, <strong className="text-white">Medical (EMT Sarah)</strong>, or <strong className="text-white">Janitorial (Marcus)</strong>.
                  </p>
                </div>

                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] text-slate-500 block font-mono uppercase">Full Ground-Dispatch workflow:</span>
                  <ol className="text-xs text-slate-400 space-y-1 list-decimal list-inside leading-normal">
                    <li>Inject an incident using the Control Panel below or from the Fan App.</li>
                    <li>Open the <strong className="text-white">Command Center (Ops)</strong> view, inspect it, and click <strong className="text-white">Dispatch</strong> to assign the standby staff.</li>
                    <li>Switch here to the dispatched staff member, acknowledge the dispatch, and click <strong className="text-white">Mark Resolved</strong>.</li>
                  </ol>
                </div>
              </div>
              <StaffView
                state={stadiumState}
                onUpdateState={setStadiumState}
              />
            </div>
          )}
        </div>

        {/* BOTTOM SIMULATOR CONTROL FOOTER PANEL */}
        <div className="xl:col-span-12">
          <SimulatorControls
            state={stadiumState}
            onUpdateState={setStadiumState}
            onSelectIncident={(inc) => {
              setSelectedIncident(inc);
              // Focus Admin Dashboard when incident is injected
              setCurrentRole('admin');
            }}
          />
        </div>

      </main>
      
      {/* STATIC FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 px-6 text-center text-[10px] font-mono text-slate-600 flex justify-between items-center">
        <span>© 2026 Stadium Pulse AIOS Decision Systems. All Channels Encrypted.</span>
        <span className="hidden sm:inline">Powered by Gemini 3.5 Flash Model Core</span>
      </footer>

      {voiceIntercomOpen && (
        <VoiceIntercom 
          onClose={() => setVoiceIntercomOpen(false)} 
          stadiumTime={realTime} 
        />
      )}

    </div>
  );
}
