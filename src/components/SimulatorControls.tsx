/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Tv, Zap, CloudRain, Shield, AlertCircle, Sparkles, Loader2, Play
} from 'lucide-react';
import { StadiumState, Incident } from '../types';

interface SimulatorControlsProps {
  state: StadiumState;
  onUpdateState: (newState: StadiumState) => void;
  onSelectIncident: (incident: Incident) => void;
}

export default function SimulatorControls({
  state,
  onUpdateState,
  onSelectIncident,
}: SimulatorControlsProps) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [generatingScenario, setGeneratingScenario] = useState(false);

  // PRESET 1: Gates Rush Hour
  const triggerGatesRush = () => {
    const updatedGateStatuses = {
      ...state.ticketing.gateStatuses,
      'Gate A': 'Congested' as const,
      'Gate C': 'Warning' as const,
    };

    const newIncident: Incident = {
      id: `inc-preset-rush-${Date.now()}`,
      title: 'Gate A Entry Overload',
      category: 'CrowdControl',
      severity: 'Medium',
      location: 'Gate A Entrance',
      description: 'Rapid ticketing scan spikes are causing massive bottlenecks at Gate A. Queue lines extending past external safety barricades.',
      status: 'Reported',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      reportedBy: 'CCTV',
      aiSuggestedFix: 'Ops Agent: Direct GuestServices personnel to pre-scan tickets with mobile scanners. Security units should guide overflow fans to nearby Gate B.',
    };

    // Spike gate CCTV camera feeds
    const updatedCctv = state.cctvFeeds.map((feed) => {
      if (feed.name.includes('Gate A')) {
        return { ...feed, status: 'Congested' as const, crowdCount: 450, flowRate: 210, aiAnalysis: 'Gate A entry turnstiles heavily backlogged. Crowd density critical near perimeter.' };
      }
      return feed;
    });

    onUpdateState({
      ...state,
      ticketing: {
        ...state.ticketing,
        scannedCount: Math.min(state.ticketing.scannedCount + 3500, state.ticketing.capacity),
        gateStatuses: updatedGateStatuses,
      },
      incidents: [newIncident, ...state.incidents],
      cctvFeeds: updatedCctv,
    });
    
    onSelectIncident(newIncident);
  };

  // PRESET 2: Heavy Sudden Downpour
  const triggerStorm = () => {
    const newIncident: Incident = {
      id: `inc-preset-storm-${Date.now()}`,
      title: 'Gate D Slippery Walkway',
      category: 'Maintenance',
      severity: 'Medium',
      location: 'Gate D Entrance',
      description: 'Sudden downpour is creating a slip hazard on the tile ramp leading to Gate D entrance. Fans slipping.',
      status: 'Reported',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      reportedBy: 'Fan',
      aiSuggestedFix: 'Ops Agent: Close the Stadium Retractable Roof immediately to shelter internal concourses. Dispatch Janitorial team with wet-floor warning signs and mops to Gate D ramp.',
    };

    onUpdateState({
      ...state,
      weather: {
        temperature: 61,
        humidity: 94,
        rainChance: 98,
        precipitationRate: 0.95,
        windSpeed: 21,
        roofStatus: 'Closing', // Trigger automatic closure simulation
      },
      incidents: [newIncident, ...state.incidents],
    });

    // Automatically complete roof closure in 4s
    setTimeout(() => {
      onUpdateState({
        ...state,
        weather: {
          temperature: 61,
          humidity: 94,
          rainChance: 98,
          precipitationRate: 0.95,
          windSpeed: 21,
          roofStatus: 'Closed',
        },
        incidents: [newIncident, ...state.incidents],
      });
    }, 4000);

    onSelectIncident(newIncident);
  };

  // PRESET 3: Medical Emergency Sec 102
  const triggerMedical = () => {
    const newIncident: Incident = {
      id: `inc-preset-med-${Date.now()}`,
      title: 'Chest Pain Complaint Section 102',
      category: 'Medical',
      severity: 'High',
      location: 'Section 102, Row C',
      description: 'An elderly fan reports chest pain, dizziness, and difficulty breathing near the aisle exit in Section 102.',
      status: 'Reported',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      reportedBy: 'Staff',
      aiSuggestedFix: 'Ops Agent: Critical dispatch required. Alert EMT ground unit Sarah to move immediately to Section 102 with a cardiac defibrillator pack. GuestServices to assist with row clearance.',
    };

    onUpdateState({
      ...state,
      incidents: [newIncident, ...state.incidents],
    });

    onSelectIncident(newIncident);
  };

  // PRESET 4: Half-time Food Rush
  const triggerFoodRush = () => {
    const updatedConcessions = state.concessions.map((c) => ({
      ...c,
      queueLength: c.queueLength + Math.floor(Math.random() * 15) + 12,
      avgWaitMinutes: c.avgWaitMinutes + Math.floor(Math.random() * 8) + 6,
    }));

    const newIncident: Incident = {
      id: `inc-preset-food-${Date.now()}`,
      title: 'East Concourse Hotdog Overrun',
      category: 'CrowdControl',
      severity: 'Low',
      location: 'Concession East',
      description: 'Massive half-time rush has caused concession queue blockages near East Concourse. Fans are spilling onto security walkways.',
      status: 'Reported',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      reportedBy: 'IoT',
      aiSuggestedFix: 'Ops Agent: Direct Concession stand staff to open mobile ordering lanes. Direct GuestServices to establish rope lines to keep main concourse pathways clear.',
    };

    onUpdateState({
      ...state,
      concessions: updatedConcessions,
      incidents: [newIncident, ...state.incidents],
    });

    onSelectIncident(newIncident);
  };

  // PRESET 5: Intruder Alert
  const triggerIntruder = () => {
    const newIncident: Incident = {
      id: `inc-preset-intruder-${Date.now()}`,
      title: 'Field Pitch Intruder',
      category: 'Security',
      severity: 'Critical',
      location: 'Pitch / Field East',
      description: 'A fan has jumped the barrier near Section 104 and is currently running onto the east side of the pitch.',
      status: 'Reported',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      reportedBy: 'CCTV',
      aiSuggestedFix: 'Ops Agent: High Priority. Alert Security officer Miller to intercept immediately from the Southeast pitch corner. Camera 4 (Pitch) is tracking position.',
    };

    const updatedCctv = state.cctvFeeds.map((feed) => {
      if (feed.name.includes('Pitch')) {
        return {
          ...feed,
          status: 'Alert' as const,
          crowdCount: 22, // players + referees + intruder
          aiAnalysis: 'SECURITY INTRUDER TRACKED. Moving in Southeast quadrant near Section 104 penalty arch.',
        };
      }
      return feed;
    });

    onUpdateState({
      ...state,
      incidents: [newIncident, ...state.incidents],
      cctvFeeds: updatedCctv,
    });

    onSelectIncident(newIncident);
  };

  // PROMPT-BASED AI SCENARIO GENERATION
  const handleGenerateCustomScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;

    setGeneratingScenario(true);
    try {
      const response = await fetch('/api/gemini/generate-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: customPrompt,
          stadiumState: state,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate scenario');
      const data = await response.json();

      const newIncident: Incident = {
        id: `inc-ai-${Date.now()}`,
        title: data.title || 'AI Simulated Incident',
        category: data.category || 'Maintenance',
        severity: data.severity || 'Medium',
        location: data.location || 'Stadium East',
        description: data.description || `AI generated: ${customPrompt}`,
        status: 'Reported',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
        reportedBy: data.reportedBy || 'CCTV',
        aiSuggestedFix: data.aiSuggestedFix || 'Ops recommendation compiling...',
      };

      onUpdateState({
        ...state,
        incidents: [newIncident, ...state.incidents],
      });

      setCustomPrompt('');
      onSelectIncident(newIncident);
    } catch (error) {
      console.error(error);
      alert('⚠️ Unable to connect to Gemini Simulation Engine. Please verify API key setup.');
    } finally {
      setGeneratingScenario(false);
    }
  };

  return (
    <div id="simulation-panel" className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-full text-slate-100 shadow-xl">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-2">
        <Tv className="h-5 w-5 text-emerald-400" />
        <h3 className="font-semibold text-sm tracking-tight text-slate-200">Event Simulator Control Center</h3>
      </div>

      <div className="flex-1 flex flex-col gap-4">
        {/* Preset Injectors */}
        <div>
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2">Preset Scenario Injectors:</span>
          <div className="grid grid-cols-2 gap-2">
            
            <button
              onClick={triggerGatesRush}
              className="flex items-center justify-between text-left px-3 py-2 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-800 hover:border-indigo-500/50 text-xs transition-all text-slate-200 group"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span>Gate Rush Hour</span>
              </div>
              <Play className="h-3 w-3 text-slate-600 group-hover:text-slate-400" />
            </button>

            <button
              onClick={triggerStorm}
              className="flex items-center justify-between text-left px-3 py-2 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-800 hover:border-sky-500/50 text-xs transition-all text-slate-200 group"
            >
              <div className="flex items-center gap-2">
                <CloudRain className="h-3.5 w-3.5 text-sky-400 group-hover:scale-110 transition-transform" />
                <span>Heavy Downpour</span>
              </div>
              <Play className="h-3 w-3 text-slate-600 group-hover:text-slate-400" />
            </button>

            <button
              onClick={triggerMedical}
              className="flex items-center justify-between text-left px-3 py-2 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-800 hover:border-rose-500/50 text-xs transition-all text-slate-200 group"
            >
              <div className="flex items-center gap-2">
                <AlertCircle className="h-3.5 w-3.5 text-rose-400 group-hover:scale-110 transition-transform" />
                <span>Medical Emergency</span>
              </div>
              <Play className="h-3 w-3 text-slate-600 group-hover:text-slate-400" />
            </button>

            <button
              onClick={triggerFoodRush}
              className="flex items-center justify-between text-left px-3 py-2 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-800 hover:border-amber-500/50 text-xs transition-all text-slate-200 group"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-3.5 w-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Half-time Food Rush</span>
              </div>
              <Play className="h-3 w-3 text-slate-600 group-hover:text-slate-400" />
            </button>

            <button
              onClick={triggerIntruder}
              className="col-span-2 flex items-center justify-between text-left px-3 py-2 bg-slate-950 hover:bg-slate-850 rounded-lg border border-slate-800 hover:border-red-500/50 text-xs font-semibold text-red-400 hover:text-red-300 transition-all group"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-red-500 animate-pulse group-hover:scale-110 transition-transform" />
                <span>Critical Pitch Intruder Alert</span>
              </div>
              <Play className="h-3 w-3 text-slate-600 group-hover:text-slate-400" />
            </button>

          </div>
        </div>

        {/* AI-Powered Scenario Generator */}
        <div className="mt-2 border-t border-slate-800 pt-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Gemini Custom Scenario Engine:
          </span>
          
          <form onSubmit={handleGenerateCustomScenario} className="flex flex-col gap-2">
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="e.g. A suspicious drone hovers over Gate C..."
              disabled={generatingScenario}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg text-xs p-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              required
            />
            
            <button
              type="submit"
              disabled={generatingScenario || !customPrompt.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-xs py-2 rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              {generatingScenario ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Synthesizing Scenario...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  Inject AI Custom Scenario
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
