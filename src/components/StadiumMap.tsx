/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Camera, MapPin, AlertCircle, RefreshCw, Layers, Shield, Activity, Trash, HelpCircle } from 'lucide-react';
import { StadiumState, Incident, StaffMember, CCTVFeed, IoTSensor } from '../types';

interface StadiumMapProps {
  state: StadiumState;
  onSelectCamera: (feed: CCTVFeed) => void;
  onSelectSensor: (sensor: IoTSensor) => void;
  onSelectIncident: (incident: Incident) => void;
  selectedCamId?: string;
  selectedSensorId?: string;
}

export default function StadiumMap({
  state,
  onSelectCamera,
  onSelectSensor,
  onSelectIncident,
  selectedCamId,
  selectedSensorId,
}: StadiumMapProps) {
  const [mapLayer, setMapLayer] = useState<'all' | 'crowd' | 'staff' | 'sensors'>('all');
  const [hoveredStaff, setHoveredStaff] = useState<StaffMember | null>(null);

  // Staff roles to color
  const getStaffColor = (role: string) => {
    switch (role) {
      case 'Security': return 'bg-blue-500 border-blue-300 text-white';
      case 'Medical': return 'bg-rose-500 border-rose-300 text-white';
      case 'Janitorial': return 'bg-amber-500 border-amber-300 text-white';
      case 'Maintenance': return 'bg-purple-500 border-purple-300 text-white';
      case 'GuestServices': return 'bg-emerald-500 border-emerald-300 text-white';
      default: return 'bg-gray-500 border-gray-300 text-white';
    }
  };

  // Active Incidents at GPS coordinates
  const getIncidentCoords = (location: string): { x: number; y: number } => {
    const loc = location.toLowerCase();
    if (loc.includes('gate a')) return { x: 22, y: 35 };
    if (loc.includes('gate b')) return { x: 78, y: 35 };
    if (loc.includes('gate c')) return { x: 22, y: 65 };
    if (loc.includes('gate d')) return { x: 78, y: 65 };
    if (loc.includes('section 101') || loc.includes('sec 101')) return { x: 50, y: 18 };
    if (loc.includes('section 102') || loc.includes('sec 102')) return { x: 68, y: 24 };
    if (loc.includes('section 103') || loc.includes('sec 103')) return { x: 74, y: 50 };
    if (loc.includes('section 104') || loc.includes('sec 104')) return { x: 68, y: 76 };
    if (loc.includes('section 105') || loc.includes('sec 105')) return { x: 50, y: 82 };
    if (loc.includes('section 106') || loc.includes('sec 106')) return { x: 32, y: 76 };
    if (loc.includes('section 107') || loc.includes('sec 107')) return { x: 26, y: 50 };
    if (loc.includes('section 108') || loc.includes('sec 108')) return { x: 32, y: 24 };
    if (loc.includes('pitch') || loc.includes('field')) return { x: 50, y: 50 };
    if (loc.includes('concession east') || loc.includes('east concourse')) return { x: 82, y: 50 };
    if (loc.includes('concession west') || loc.includes('west concourse')) return { x: 18, y: 50 };
    if (loc.includes('restroom east')) return { x: 80, y: 28 };
    if (loc.includes('restroom west')) return { x: 20, y: 72 };
    return { x: 40, y: 30 }; // Fallback
  };

  return (
    <div id="stadium-map-container" className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full text-slate-100 shadow-xl relative overflow-hidden">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 z-10">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-emerald-400" />
          <h3 className="font-semibold text-sm tracking-tight text-slate-200">Event Intelligence Live Map</h3>
        </div>
        
        {/* Layer Filters */}
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs gap-1">
          <button
            onClick={() => setMapLayer('all')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              mapLayer === 'all' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setMapLayer('crowd')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              mapLayer === 'crowd' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Heatmap
          </button>
          <button
            onClick={() => setMapLayer('staff')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              mapLayer === 'staff' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            GPS Staff
          </button>
          <button
            onClick={() => setMapLayer('sensors')}
            className={`px-2.5 py-1 rounded-md transition-all ${
              mapLayer === 'sensors' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            IoT
          </button>
        </div>
      </div>

      {/* SVG Canvas Map Container */}
      <div className="relative flex-1 bg-slate-950/70 border border-slate-800/80 rounded-lg min-h-[300px] flex items-center justify-center p-2 select-none overflow-hidden">
        
        {/* Interactive SVG Stadium */}
        <svg viewBox="0 0 100 100" className="w-full h-full max-h-[460px]" style={{ aspectRatio: '1' }}>
          <style>{`
            @keyframes tele-dash {
              to {
                stroke-dashoffset: -12;
              }
            }
            .live-telemetry-link {
              stroke-dasharray: 2, 2;
              animation: tele-dash 3s linear infinite;
            }
          `}</style>
          {/* Definitions for Gradients */}
          <defs>
            <radialGradient id="pitch-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>
            
            {/* Heatmaps */}
            <radialGradient id="heat-heavy" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="60%" stopColor="#ef4444" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="heat-med" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="incident-glow-pulse" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Grass/Field Area (Pitch) */}
          <rect x="35" y="30" width="30" height="40" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="0.8" />
          <rect x="37" y="32" width="26" height="36" fill="url(#pitch-glow)" stroke="#10b981" strokeWidth="0.3" strokeDasharray="1,1" />
          {/* Halfway line */}
          <line x1="35" y1="50" x2="65" y2="50" stroke="#334155" strokeWidth="0.4" />
          <circle cx="50" cy="50" r="5" fill="none" stroke="#334155" strokeWidth="0.4" />

          {/* Outer Stadium Bowl Structure (Stands) */}
          <ellipse cx="50" cy="50" rx="42" ry="42" fill="none" stroke="#1e293b" strokeWidth="8" />
          <ellipse cx="50" cy="50" rx="42" ry="42" fill="none" stroke="#0f172a" strokeWidth="7.5" />
          
          {/* Ring Seats Sections Outline */}
          <ellipse cx="50" cy="50" rx="36" ry="36" fill="none" stroke="#1e293b" strokeWidth="0.5" />
          <ellipse cx="50" cy="50" rx="45" ry="45" fill="none" stroke="#334155" strokeWidth="0.5" />

          {/* Dividing section lines */}
          <line x1="50" y1="8" x2="50" y2="14" stroke="#475569" strokeWidth="0.5" />
          <line x1="50" y1="86" x2="50" y2="92" stroke="#475569" strokeWidth="0.5" />
          <line x1="8" y1="50" x2="14" y2="50" stroke="#475569" strokeWidth="0.5" />
          <line x1="86" y1="50" x2="92" y2="50" stroke="#475569" strokeWidth="0.5" />
          
          <line x1="20" y1="20" x2="25" y2="25" stroke="#475569" strokeWidth="0.5" />
          <line x1="80" y1="20" x2="75" y2="25" stroke="#475569" strokeWidth="0.5" />
          <line x1="20" y1="80" x2="25" y2="75" stroke="#475569" strokeWidth="0.5" />
          <line x1="80" y1="80" x2="75" y2="75" stroke="#475569" strokeWidth="0.5" />

          {/* Labels for Sections */}
          <text x="50" y="12" fill="#94a3b8" fontSize="2.2" textAnchor="middle" fontWeight="bold">SEC 101</text>
          <text x="73" y="24" fill="#94a3b8" fontSize="2.2" textAnchor="middle" fontWeight="bold">SEC 102</text>
          <text x="83" y="51" fill="#94a3b8" fontSize="2.2" textAnchor="middle" fontWeight="bold">SEC 103</text>
          <text x="73" y="78" fill="#94a3b8" fontSize="2.2" textAnchor="middle" fontWeight="bold">SEC 104</text>
          <text x="50" y="89" fill="#94a3b8" fontSize="2.2" textAnchor="middle" fontWeight="bold">SEC 105</text>
          <text x="27" y="78" fill="#94a3b8" fontSize="2.2" textAnchor="middle" fontWeight="bold">SEC 106</text>
          <text x="17" y="51" fill="#94a3b8" fontSize="2.2" textAnchor="middle" fontWeight="bold">SEC 107</text>
          <text x="27" y="24" fill="#94a3b8" fontSize="2.2" textAnchor="middle" fontWeight="bold">SEC 108</text>

          {/* Crowds / Heatmap Layer */}
          {(mapLayer === 'all' || mapLayer === 'crowd') && (
            <>
              {/* Dynamic Heatmap over Gate A / Sec 108 (Often congested) */}
              {state.ticketing.gateStatuses['Gate A'] !== 'Normal' && (
                <circle cx="20" cy="32" r="11" fill="url(#heat-heavy)" className="animate-pulse" />
              )}
              {/* Gate C or B congestion simulation heatmaps */}
              {state.ticketing.gateStatuses['Gate C'] !== 'Normal' && (
                <circle cx="20" cy="68" r="10" fill="url(#heat-heavy)" />
              )}
              {/* Fan areas in concourses */}
              <circle cx="82" cy="50" r="12" fill="url(#heat-med)" /> {/* Concession East */}
              <circle cx="18" cy="50" r="8" fill="url(#heat-med)" />  {/* Concession West */}
            </>
          )}

          {/* Retractable Roof Outline */}
          <g opacity="0.8">
            {state.weather.roofStatus === 'Closed' && (
              <>
                <rect x="33" y="28" width="16" height="44" fill="#334155" fillOpacity="0.4" stroke="#475569" strokeWidth="0.5" />
                <rect x="51" y="28" width="16" height="44" fill="#334155" fillOpacity="0.4" stroke="#475569" strokeWidth="0.5" />
                <text x="50" y="51" fill="#10b981" fontSize="3" textAnchor="middle" fontWeight="bold">ROOF CLOSED</text>
              </>
            )}
            {state.weather.roofStatus === 'Closing' && (
              <>
                <rect x="30" y="28" width="12" height="44" fill="#334155" fillOpacity="0.3" stroke="#eab308" strokeWidth="0.5" className="animate-pulse" />
                <rect x="58" y="28" width="12" height="44" fill="#334155" fillOpacity="0.3" stroke="#eab308" strokeWidth="0.5" className="animate-pulse" />
                <text x="50" y="51" fill="#eab308" fontSize="2.5" textAnchor="middle" fontWeight="bold" className="animate-pulse">ROOF CLOSING</text>
              </>
            )}
            {state.weather.roofStatus === 'Opening' && (
              <>
                <rect x="33" y="28" width="6" height="44" fill="#334155" fillOpacity="0.2" stroke="#eab308" strokeWidth="0.5" />
                <rect x="61" y="28" width="6" height="44" fill="#334155" fillOpacity="0.2" stroke="#eab308" strokeWidth="0.5" />
                <text x="50" y="51" fill="#eab308" fontSize="2.5" textAnchor="middle" fontWeight="bold">ROOF OPENING</text>
              </>
            )}
            {state.weather.roofStatus === 'Open' && (
              <text x="50" y="51" fill="#334155" fontSize="2" textAnchor="middle" fontWeight="bold">ROOF OPEN</text>
            )}
          </g>

          {/* IoT Sensors Layer */}
          {(mapLayer === 'all' || mapLayer === 'sensors') && (
            <g id="iot-layer">
              {state.sensors.map((sensor) => {
                // Determine layout coordinates
                let x = 50, y = 50;
                if (sensor.name.includes('Trash Gate A')) { x = 16; y = 30; }
                else if (sensor.name.includes('Trash Gate B')) { x = 84; y = 30; }
                else if (sensor.name.includes('Trash Concourse West')) { x = 15; y = 48; }
                else if (sensor.name.includes('Trash Concourse East')) { x = 85; y = 48; }
                else if (sensor.name.includes('Restroom West')) { x = 18; y = 74; }
                else if (sensor.name.includes('Restroom East')) { x = 82; y = 26; }
                else if (sensor.name.includes('Decibel')) { x = 50; y = 24; }

                const isSelected = selectedSensorId === sensor.id;
                const color = sensor.status === 'Critical' ? '#ef4444' : sensor.status === 'Warning' ? '#f59e0b' : '#10b981';

                return (
                  <g key={sensor.id} className="cursor-pointer group" onClick={() => onSelectSensor(sensor)}>
                    {isSelected && (
                      <circle cx={x} cy={y} r="3.5" fill="none" stroke="#38bdf8" strokeWidth="0.5" className="animate-ping" />
                    )}
                    <circle cx={x} cy={y} r="1.8" fill={color} stroke="#1e293b" strokeWidth="0.4" />
                    {/* Tiny representation of type inside */}
                    <circle cx={x} cy={y} r="0.6" fill="#ffffff" />
                  </g>
                );
              })}
            </g>
          )}

          {/* Security CCTV Cameras (Interactive nodes) */}
          {(mapLayer === 'all' || mapLayer === 'crowd') && (
            <g id="cctv-layer">
              {state.cctvFeeds.map((cam) => {
                let x = 50, y = 50;
                if (cam.name.includes('Gate A')) { x = 24; y = 33; }
                else if (cam.name.includes('Gate B')) { x = 76; y = 33; }
                else if (cam.name.includes('Gate C')) { x = 24; y = 67; }
                else if (cam.name.includes('Gate D')) { x = 76; y = 67; }
                else if (cam.name.includes('Concourse East')) { x = 81; y = 54; }
                else if (cam.name.includes('Concourse West')) { x = 19; y = 46; }
                else if (cam.name.includes('Pitch/Field')) { x = 50; y = 46; }

                const isSelected = selectedCamId === cam.id;
                const statusColor = cam.status === 'Alert' ? '#ef4444' : cam.status === 'Congested' ? '#f59e0b' : '#38bdf8';

                return (
                  <g key={cam.id} className="cursor-pointer" onClick={() => onSelectCamera(cam)}>
                    {/* Ring indicator */}
                    <circle cx={x} cy={y} r={isSelected ? '2.8' : '1.8'} fill="none" stroke={statusColor} strokeWidth={isSelected ? '0.6' : '0.4'} />
                    <circle cx={x} cy={y} r="0.8" fill={statusColor} />
                    {/* Tiny icon background */}
                    <polygon points={`${x-1},${y+1} ${x+1},${y+1} ${x},${y-1.2}`} fill="none" stroke={statusColor} strokeWidth="0.2" />
                  </g>
                );
              })}
            </g>
          )}

          {/* Staff GPS Layer */}
          {(mapLayer === 'all' || mapLayer === 'staff') && (
            <g id="staff-layer">
              {state.staff.map((member) => {
                const x = member.gps.x;
                const y = member.gps.y;
                const roleColor = member.role === 'Security' ? '#3b82f6' : 
                                  member.role === 'Medical' ? '#f43f5e' : 
                                  member.role === 'Janitorial' ? '#d97706' : 
                                  member.role === 'Maintenance' ? '#a855f7' : '#10b981';

                // Status colors
                const statusRingColor = member.status === 'Idle' ? '#10b981' : 
                                         member.status === 'Dispatched' ? '#ef4444' : '#64748b';

                return (
                  <g 
                    key={member.id} 
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredStaff(member)}
                    onMouseLeave={() => setHoveredStaff(null)}
                  >
                    {/* Animated dynamic line connecting dispatched personnel directly to the active incident */}
                    {member.status === 'Dispatched' && member.activeTaskId && (() => {
                      const inc = state.incidents.find(i => i.id === member.activeTaskId);
                      if (inc) {
                        const coords = getIncidentCoords(inc.location);
                        return (
                          <line
                            x1={x}
                            y1={y}
                            x2={coords.x}
                            y2={coords.y}
                            stroke={roleColor}
                            strokeWidth="0.45"
                            className="live-telemetry-link"
                            opacity="0.85"
                          />
                        );
                      }
                      return null;
                    })()}

                    {/* Outer pulse warning beacon if busy / dispatched */}
                    {member.status === 'Dispatched' && (
                      <circle cx={x} cy={y} r="3" fill="none" stroke={statusRingColor} strokeWidth="0.4" className="animate-ping" />
                    )}

                    {/* Outer high-contrast status ring */}
                    <circle 
                      cx={x} 
                      cy={y} 
                      r="1.8" 
                      fill="#0f172a" 
                      stroke={statusRingColor} 
                      strokeWidth="0.5" 
                    />

                    {/* Inner core badge with role color */}
                    <circle 
                      cx={x} 
                      cy={y} 
                      r="0.9" 
                      fill={roleColor} 
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Active Incident Warning Pulsers */}
          {state.incidents.filter(inc => inc.status !== 'Resolved').map((inc) => {
            const coords = getIncidentCoords(inc.location);
            const severityColor = inc.severity === 'Critical' || inc.severity === 'High' ? '#ef4444' : '#f59e0b';
            
            return (
              <g key={inc.id} className="cursor-pointer" onClick={() => onSelectIncident(inc)}>
                {/* Large pulsating radial glow */}
                <circle cx={coords.x} cy={coords.y} r="6" fill="url(#incident-glow-pulse)" className="animate-pulse" />
                
                {/* Floating Alert Icon */}
                <circle cx={coords.x} cy={coords.y} r="2.2" fill="#0f172a" stroke={severityColor} strokeWidth="0.5" />
                <path d={`M ${coords.x} ${coords.y-1} L ${coords.x} ${coords.y+0.4}`} stroke={severityColor} strokeWidth="0.4" strokeLinecap="round" />
                <circle cx={coords.x} cy={coords.y+1} r="0.2" fill={severityColor} />
              </g>
            );
          })}
        </svg>

        {/* Responsive Staff Info Tooltip Overlay */}
        {hoveredStaff && (
          <div 
            className="absolute bg-slate-950/95 border border-slate-800 p-3 rounded-xl shadow-2xl z-30 text-left pointer-events-none backdrop-blur-md w-48 text-xs transition-all duration-150 border-indigo-500/30"
            style={{
              left: `${hoveredStaff.gps.x}%`,
              top: `${hoveredStaff.gps.y - 4}%`,
              transform: 'translate(-50%, -100%)',
            }}
          >
            {/* Tooltip pointing arrow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-slate-950 border-r border-b border-slate-800" />
            
            <div className="flex items-center justify-between gap-1 border-b border-slate-800/60 pb-1.5 mb-1.5">
              <span className="font-extrabold text-white text-[11px] tracking-tight truncate max-w-[110px]">
                {hoveredStaff.name}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold uppercase ${
                hoveredStaff.status === 'Idle' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                hoveredStaff.status === 'Dispatched' ? 'bg-red-500/10 border border-red-500/20 text-red-400 animate-pulse' :
                'bg-slate-500/10 border border-slate-500/20 text-slate-400'
              }`}>
                {hoveredStaff.status === 'Idle' ? 'Idle' : hoveredStaff.status === 'Dispatched' ? 'Busy' : 'Break'}
              </span>
            </div>

            <div className="space-y-1 text-[10px] text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase font-mono text-[9px]">Role:</span>
                <span className="font-bold font-mono" style={{ color: 
                  hoveredStaff.role === 'Security' ? '#3b82f6' : 
                  hoveredStaff.role === 'Medical' ? '#f43f5e' : 
                  hoveredStaff.role === 'Janitorial' ? '#d97706' : 
                  hoveredStaff.role === 'Maintenance' ? '#a855f7' : '#10b981'
                }}>{hoveredStaff.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 uppercase font-mono text-[9px]">Radio Link:</span>
                <span className="font-mono text-slate-400">{hoveredStaff.phone}</span>
              </div>
              {hoveredStaff.status === 'Dispatched' && hoveredStaff.activeTaskId && (() => {
                const activeInc = state.incidents.find(i => i.id === hoveredStaff.activeTaskId);
                return (
                  <div className="mt-1.5 pt-1.5 border-t border-slate-800/60">
                    <span className="text-red-400 font-bold uppercase font-mono text-[8px] block tracking-wider animate-pulse">Responding to:</span>
                    <span className="text-slate-200 block text-[10px] truncate leading-tight mt-0.5 font-bold">
                      ⚠️ {activeInc ? activeInc.title : 'Incident Rescue'}
                    </span>
                    <span className="text-slate-400 block text-[9px] mt-0.5 italic font-medium">
                      📍 {activeInc ? activeInc.location : 'Ground Zone'}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Floating Legends */}
        <div className="absolute bottom-2 left-2 bg-slate-900/95 border border-slate-800/85 backdrop-blur px-2.5 py-1.5 rounded-md text-[10px] space-y-1 shadow-md max-w-[130px] z-10">
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
              <span className="text-[9px] text-slate-400">Security</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block"></span>
              <span className="text-[9px] text-slate-400">Medical</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
              <span className="text-[9px] text-slate-400">Janitor</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 inline-block"></span>
              <span className="text-[9px] text-slate-400">Maint.</span>
            </div>
          </div>
          <div className="border-t border-slate-800/80 pt-1 mt-1 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border border-emerald-400 bg-emerald-950 inline-block"></span>
              <span className="text-[9px] text-slate-400">🟢 Idle (Standby)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border border-red-500 bg-red-950 inline-block animate-pulse"></span>
              <span className="text-[9px] text-slate-400">🔴 Busy (Active)</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-2 right-2 bg-slate-900/90 border border-slate-800/85 backdrop-blur px-2.5 py-1.5 rounded-md text-[10px] space-y-1.5 shadow-md z-10">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block border border-slate-800"></span>
            <span className="text-slate-400">IoT normal</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block border border-slate-800 animate-pulse"></span>
            <span className="text-slate-400">IoT caution</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block border border-slate-800 animate-pulse"></span>
            <span className="text-slate-400">Incident Alert</span>
          </div>
        </div>
      </div>

      {/* Detail overlay panel for selected map items */}
      <div className="mt-2 text-xs text-slate-400">
        💡 <span className="italic">Hover over pins or click camera/alert icons directly to stream real-time intelligence feeds.</span>
      </div>
    </div>
  );
}
