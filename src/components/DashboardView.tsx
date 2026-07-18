/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  BarChart, Bar, CartesianGrid 
} from 'recharts';
import { 
  ShieldAlert, UserCheck, Wind, CloudRain, Shield, AlertTriangle, 
  Send, Brain, Activity, Clock, LogOut, CheckCircle2, UserCheck2, Eye,
  Loader2, Mic, Volume2, VolumeX, Search, MapPin, Sparkles, Compass,
  Thermometer, Sun, Cloud, Fan, Radio, Megaphone
} from 'lucide-react';
import { StadiumState, Incident, StaffMember, CCTVFeed, ChatMessage } from '../types';

interface DashboardViewProps {
  state: StadiumState;
  onUpdateState: (newState: StadiumState) => void;
  selectedCamera: CCTVFeed;
  onSelectCamera: (feed: CCTVFeed) => void;
  selectedIncident: Incident | null;
  onSelectIncident: (incident: Incident | null) => void;
}

export default function DashboardView({
  state,
  onUpdateState,
  selectedCamera,
  onSelectCamera,
  selectedIncident,
  onSelectIncident,
}: DashboardViewProps) {
  const dictationRecRef = React.useRef<any>(null);
  const dictationStartingRef = React.useRef<boolean>(false);

  // Sound Alarm and Unacknowledged Critical Incidents State
  const [unacknowledgedCriticalIncidents, setUnacknowledgedCriticalIncidents] = useState<Incident[]>([]);
  const [audioAlertEnabled, setAudioAlertEnabled] = useState<boolean>(true);
  const [cctvFilter, setCctvFilter] = useState<'normal' | 'night' | 'thermal' | 'blueprint'>('normal');

  const getAiAnalysisText = () => {
    let base = selectedCamera?.aiAnalysis || "";
    if (cctvFilter === 'night') return `[NV MODE] ${base} Low-light enhancement active. No anomalies detected in shadow regions.`;
    if (cctvFilter === 'thermal') return `[THERMAL MODE] ${base} Heat signatures nominal. Safe temperature thresholds maintained.`;
    if (cctvFilter === 'blueprint') return `[BLUEPRINT MODE] ${base} Spatial mapping verified against structural limits.`;
    return base;
  };

  
  // Weather automated alert safety threshold states
  const [acknowledgedWeatherAlerts, setAcknowledgedWeatherAlerts] = useState<Set<string>>(new Set());
  const [lastAnnouncedWeatherAlerts, setLastAnnouncedWeatherAlerts] = useState<Set<string>>(new Set());
  
  // Real-time local clock state
  const [realTime, setRealTime] = useState<string>('');

  // Emergency Broadcast State
  const [broadcastText, setBroadcastText] = useState('');

  const handleSendBroadcast = () => {
    if (!broadcastText.trim()) return;
    onUpdateState({
      ...state,
      emergencyBroadcast: {
        message: broadcastText.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      }
    });
    setBroadcastText('');
    alert('Emergency broadcast sent to Fan App simulator.');
  };
  
  // Track already seen incident IDs to only alert on newly-injected ones
  const seenIncidentIdsRef = React.useRef<Set<string>>(new Set(state.incidents.map(i => i.id)));

  // Web Audio API emergency chime synthesizer
  const playCriticalAlertSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      // Pulse dynamic sweeps (urgent cyber security alarm vibe)
      for (let i = 0; i < 3; i++) {
        const pulseStart = now + i * 0.4;
        
        const osc1 = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(800, pulseStart);
        osc1.frequency.exponentialRampToValueAtTime(1200, pulseStart + 0.15);
        osc1.frequency.exponentialRampToValueAtTime(800, pulseStart + 0.3);
        
        gainNode.gain.setValueAtTime(0, pulseStart);
        gainNode.gain.linearRampToValueAtTime(0.12, pulseStart + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, pulseStart + 0.35);
        
        osc1.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc1.start(pulseStart);
        osc1.stop(pulseStart + 0.36);
      }
    } catch (err) {
      console.error('Failed to play critical alert sound:', err);
    }
  };

  // Text-to-speech announcement
  const announceCriticalIncident = (title: string) => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(`Critical Emergency Alert: ${title}`);
        utterance.rate = 1.0;
        utterance.pitch = 0.95;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.warn('Speech synthesis failed:', err);
      }
    }
  };

  // Sound alarm on new critical incidents
  React.useEffect(() => {
    state.incidents.forEach((incident) => {
      if (incident.severity === 'Critical') {
        if (!seenIncidentIdsRef.current.has(incident.id)) {
          seenIncidentIdsRef.current.add(incident.id);
          
          if (audioAlertEnabled) {
            playCriticalAlertSound();
            announceCriticalIncident(incident.title);
          }
          
          onSelectIncident(incident);
          
          setUnacknowledgedCriticalIncidents((prev) => {
            if (prev.some(p => p.id === incident.id)) return prev;
            return [incident, ...prev];
          });
        }
      } else {
        seenIncidentIdsRef.current.add(incident.id);
      }
    });
  }, [state.incidents, audioAlertEnabled, onSelectIncident]);

  const handleAcknowledgeIncident = (id: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setUnacknowledgedCriticalIncidents((prev) => prev.filter(p => p.id !== id));
  };

  const handleSilenceAll = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setUnacknowledgedCriticalIncidents([]);
  };

  // Define weather safety alerts based on current state
  const currentAlerts = React.useMemo(() => {
    const alerts: Array<{
      code: string;
      severity: 'Severe' | 'Caution';
      title: string;
      description: string;
      type: 'wind' | 'rain' | 'temperature';
      valueString: string;
      thresholdString: string;
    }> = [];

    const w = state.weather;
    if (!w) return alerts;

    // 1. Wind Threshold (>= 20 mph)
    if (w.windSpeed >= 20) {
      alerts.push({
        code: 'WIND_HAZARD',
        severity: 'Severe',
        title: 'High Wind Operational Hazard Detected',
        description: `Active wind speed of ${w.windSpeed} mph exceeds the safe threshold of 20 mph. Securing of all overhead equipment, cameras, and tents is required. Close the stadium roof if open.`,
        type: 'wind',
        valueString: `${w.windSpeed} mph`,
        thresholdString: '20 mph'
      });
    }

    // 2. Rain / Precipitation Threshold (Rain Chance >= 70% OR Precipitation Rate >= 0.2 in/hr)
    if (w.rainChance >= 70 || w.precipitationRate >= 0.2) {
      alerts.push({
        code: 'RAIN_HAZARD',
        severity: 'Severe',
        title: 'Heavy Precipitation Risk Alert',
        description: `Sensors indicate a ${w.rainChance}% chance of rain and precipitation rate of ${w.precipitationRate} in/hr (safe limit: 0.2 in/hr). Close the stadium roof immediately to protect spectators and play field.`,
        type: 'rain',
        valueString: `${w.rainChance}% / ${w.precipitationRate} in/hr`,
        thresholdString: '70% / 0.2 in/hr'
      });
    }

    // 3. Hot Temperature Threshold (>= 92°F)
    if (w.temperature >= 92) {
      alerts.push({
        code: 'HEAT_HAZARD',
        severity: 'Caution',
        title: 'Extreme Heat Index Warning',
        description: `Ambient temperature has reached ${w.temperature}°F. This exceeds the maximum comfort guidelines of 92°F. Supply lines should prepare extra cold hydration products, and medical crews must monitor fans.`,
        type: 'temperature',
        valueString: `${w.temperature}°F`,
        thresholdString: '92°F'
      });
    }

    // 4. Cold Temperature Threshold (<= 40°F)
    if (w.temperature <= 40) {
      alerts.push({
        code: 'COLD_HAZARD',
        severity: 'Caution',
        title: 'Extreme Cold Advisory',
        description: `Ambient temperature has dropped to ${w.temperature}°F. This falls below standard comfort guidelines of 40°F. Activate heater fans in open stadium corridors and tunnels.`,
        type: 'temperature',
        valueString: `${w.temperature}°F`,
        thresholdString: '40°F'
      });
    }

    return alerts;
  }, [state.weather]);

  // Effect to handle sirens and voice warnings for new weather events
  React.useEffect(() => {
    const unannounced = currentAlerts.filter(a => !lastAnnouncedWeatherAlerts.has(a.code));
    if (unannounced.length > 0) {
      if (audioAlertEnabled) {
        playCriticalAlertSound();
        announceCriticalIncident(unannounced[0].title);
      }
      setLastAnnouncedWeatherAlerts(new Set(currentAlerts.map(a => a.code)));
    }

    // Auto-clean up acknowledged/announced states when condition clears
    const activeCodes = new Set(currentAlerts.map(a => a.code));
    
    setAcknowledgedWeatherAlerts(prev => {
      const nextSet = new Set<string>();
      prev.forEach(code => {
        if (activeCodes.has(code)) nextSet.add(code);
      });
      return nextSet;
    });

    setLastAnnouncedWeatherAlerts(prev => {
      const nextSet = new Set<string>();
      prev.forEach(code => {
        if (activeCodes.has(code)) nextSet.add(code);
      });
      return nextSet;
    });
  }, [currentAlerts, audioAlertEnabled]);

  // Synchronize dynamic browser title with current real-time clock and live weather parameters
  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      setRealTime(timeStr);
      
      const temp = state.weather ? ` | ${state.weather.temperature}°F` : '';
      const loc = state.weather && state.weather.locationName ? ` | ${state.weather.locationName}` : '';
      const alertsCount = currentAlerts.length;
      const alertPrefix = alertsCount > 0 ? `⚠️ (${alertsCount}) ` : '';
      
      // Update HTML document title directly
      document.title = `${alertPrefix}[${timeStr}] Stadium Pulse AIOS${temp}${loc}`;
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => {
      clearInterval(interval);
      document.title = "Stadium Pulse AIOS";
    };
  }, [state.weather, currentAlerts]);

  // Chat with Ops Agent state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'ops-1',
      sender: 'agent',
      agentName: 'Ops Agent',
      text: "Stadium Pulse AIOS Ops System online. I'm monitoring weather, ticketing flow, IoT sensors, and CCTV heatmaps. Ask me any questions or request dispatcher guidelines.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  // Dynamic Gemini Intelligence options
  const [selectedModel, setSelectedModel] = useState<'gemini-3.1-flash-lite' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite'>('gemini-3.1-flash-lite');
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [useMapsGrounding, setUseMapsGrounding] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isDictating, setIsDictating] = useState(false);

  // Manual roof control state
  const [controllingRoof, setControllingRoof] = useState(false);

  // Emergency AI Commander State
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [emergencyData, setEmergencyData] = useState<{
    threatSpreadPrediction: string;
    optimalEvacuationRoutes: string[];
    multilingualAlerts: { en: string; es: string; fr: string; ar: string };
    responderTacticalChecklist: string[];
    criticalSOPGuideline: string;
  } | null>(null);
  const [loadingEmergency, setLoadingEmergency] = useState(false);

  // Emergency Evacuation Advisor State
  const [selectedSection, setSelectedSection] = useState('Section 101');
  const [evacuationLoading, setEvacuationLoading] = useState(false);
  const [evacuationResult, setEvacuationResult] = useState<{
    recommendedExitGate: string;
    alternativeExitGate: string;
    estimatedTimeMinutes: number;
    safetyScore: number;
    routeDescription: string;
    reasoning: string[];
    hazardWarnings: string[];
  } | null>(null);
  const [evacuationError, setEvacuationError] = useState<string | null>(null);

  // Weather Intelligence State
  const [weatherIntelLoading, setWeatherIntelLoading] = useState(false);
  const [weatherIntelResult, setWeatherIntelResult] = useState<{
    currentWeatherSummary: string;
    roofActionSuggestion: 'Close Roof' | 'Open Roof' | 'Keep Current State';
    roofActionReason: string;
    spectatorProtectionAdvice: string;
    equipmentFanProtectionAdvice: string;
    isWeatherWarningActive: boolean;
    weatherSeverity: 'Green' | 'Caution' | 'Severe';
    recommendedActionsList: string[];
  } | null>(null);
  const [weatherIntelError, setWeatherIntelError] = useState<string | null>(null);

  const handleFetchWeatherIntelligence = async () => {
    setWeatherIntelLoading(true);
    setWeatherIntelError(null);
    try {
      const response = await fetch('/api/gemini/weather-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stadiumState: state,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load weather intelligence data.');
      }

      const data = await response.json();
      setWeatherIntelResult(data);
    } catch (err: any) {
      console.error(err);
      setWeatherIntelError(err.message || 'An error occurred fetching weather advice.');
    } finally {
      setWeatherIntelLoading(false);
    }
  };

  // Weather Geolocation and Real-Time Sync State
  const [syncingLocation, setSyncingLocation] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [weatherSearchQuery, setWeatherSearchQuery] = useState('');

  const syncWeatherForCoordinates = async (lat: number, lon: number, name: string) => {
    setSyncingLocation(true);
    setSyncError(null);
    try {
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch`;
      const response = await fetch(weatherUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch Open-Meteo weather data.');
      }
      const data = await response.json();
      const current = data.current;

      const humidity = Math.round(current.relative_humidity_2m ?? 50);
      const rainAmount = current.rain ?? 0;
      const rainChance = rainAmount > 0 ? 95 : (humidity > 80 ? 60 : (humidity > 60 ? 30 : 10));

      const updatedWeather = {
        ...state.weather,
        temperature: Math.round(current.temperature_2m ?? 72),
        humidity,
        rainChance,
        precipitationRate: parseFloat((current.precipitation ?? 0.0).toFixed(2)),
        windSpeed: Math.round(current.wind_speed_10m ?? 5),
        lat,
        lon,
        locationName: name,
        isRealLive: true,
      };

      onUpdateState({
        ...state,
        weather: updatedWeather,
      });
    } catch (err: any) {
      console.error(err);
      setSyncError(`Weather Sync Error: ${err.message || 'Unable to load weather details.'}`);
    } finally {
      setSyncingLocation(false);
    }
  };

  const handleSyncWithBrowserLocation = () => {
    if (!navigator.geolocation) {
      setSyncError('Geolocation is not supported by your browser.');
      return;
    }

    setSyncingLocation(true);
    setSyncError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let name = `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`, {
            headers: { 'Accept-Language': 'en', 'User-Agent': 'Stadium Pulse-AI-OS-Applet' }
          });
          if (res.ok) {
            const data = await res.json();
            const addr = data.address;
            name = addr.city || addr.town || addr.suburb || addr.village || addr.state || addr.country || name;
          }
        } catch (e) {
          console.warn('Reverse geocoding failed, using coordinates as name', e);
        }
        await syncWeatherForCoordinates(latitude, longitude, name);
      },
      (error) => {
        console.warn('Geolocation failed', error);
        let errorMsg = 'Access to location denied.';
        if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = 'Location information is unavailable.';
        } else if (error.code === error.TIMEOUT) {
          errorMsg = 'Location request timed out.';
        }
        setSyncError(`${errorMsg} Please search for your city manually below.`);
        setSyncingLocation(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSearchCityWeather = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weatherSearchQuery.trim()) return;

    setSyncingLocation(true);
    setSyncError(null);

    try {
      const searchUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(weatherSearchQuery)}&format=json&limit=1`;
      const res = await fetch(searchUrl, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'Stadium Pulse-AI-OS-Applet' }
      });
      if (!res.ok) {
        throw new Error('Geocoding service unavailable.');
      }
      const data = await res.json();
      if (!data || data.length === 0) {
        throw new Error('City not found. Please verify spelling.');
      }

      const match = data[0];
      const lat = parseFloat(match.lat);
      const lon = parseFloat(match.lon);
      const displayName = match.display_name.split(',')[0];

      await syncWeatherForCoordinates(lat, lon, displayName);
      setWeatherSearchQuery('');
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || 'An error occurred during search.');
      setSyncingLocation(false);
    }
  };

  // Auto-fetch on mount and when relevant weather data changes
  React.useEffect(() => {
    handleFetchWeatherIntelligence();
  }, [
    state.weather.temperature,
    state.weather.rainChance,
    state.weather.precipitationRate,
    state.weather.windSpeed,
    state.weather.roofStatus
  ]);

  const handleCalculateEvacuation = async () => {
    setEvacuationLoading(true);
    setEvacuationError(null);
    try {
      const response = await fetch('/api/gemini/evacuation-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section: selectedSection,
          stadiumState: state,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to compute evacuation routes.');
      }

      const data = await response.json();
      setEvacuationResult(data);
    } catch (err: any) {
      console.error(err);
      setEvacuationError(err.message || 'An error occurred during calculation.');
    } finally {
      setEvacuationLoading(false);
    }
  };

  // Trigger Emergency AI Commander Function
  const handleTriggerEmergency = async (incidentToUse?: Incident) => {
    setEmergencyActive(true);
    setLoadingEmergency(true);
    setEmergencyData(null);

    const fallbackIncident = incidentToUse || selectedIncident || {
      id: 'emergency-manual',
      title: 'Manual Evacuation Trigger',
      category: 'CrowdControl',
      severity: 'Critical',
      location: 'Stadium-wide',
      description: 'Human operator triggered a manual evacuation directive for stadium safety containment.',
      status: 'Reported',
      aiSuggestedFix: 'Commence immediate structured egress through Gate A, D and C. Clear pitch access routing.',
    };

    try {
      const response = await fetch('/api/gemini/emergency-commander', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incident: fallbackIncident,
          stadiumState: state,
        }),
      });

      if (!response.ok) throw new Error('Failed to query Emergency Commander');
      const data = await response.json();
      setEmergencyData(data);
    } catch (error) {
      console.error('Emergency trigger error:', error);
      // Offline fallback safety protocol data
      setEmergencyData({
        threatSpreadPrediction: 'Localized crowd density fluctuation. High potential of gate friction if crowd is uncontained.',
        optimalEvacuationRoutes: ['Primary Route: Gate A & Gate D', 'Secondary Route: Section 104 Overpass to Concourse North'],
        multilingualAlerts: {
          en: 'ATTENTION: Please proceed calmly to the nearest exit gates. Follow steward instructions.',
          es: 'ATENCIÓN: Por favor diríjase con calma a las puertas de salida más cercanas.',
          fr: 'ATTENTION: Veuillez vous diriger calmement vers les sorties les plus proches.',
          ar: 'انتباه: يرجى التوجه بهدوء إلى أقرب بوابات الخروج واتباع تعليمات المنظمين.'
        },
        responderTacticalChecklist: [
          'Officer Miller: Deploy crowd separation barriers at East Concourse instantly.',
          'EMT Sarah: Move primary medical triaging station to Gate A entrance area.',
          'Marcus: Enable high-visibility directional floor escape pathway lighting.'
        ],
        criticalSOPGuideline: 'STADIUM CRITICAL ESCAPE SOP: Disengage electronic gate turnstiles immediately. Enable open escape flow.'
      });
    } finally {
      setLoadingEmergency(false);
    }
  };

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

  // Send message to Ops Agent
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
      const response = await fetch('/api/gemini/ops-chat', {
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

      if (!response.ok) throw new Error('Failed to fetch Ops Agent reply');
      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          id: `agent-${Date.now()}`,
          sender: 'agent',
          agentName: 'Ops Agent',
          text: data.text,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);

      // If voice output is enabled, synthesize and speak the reply
      if (voiceEnabled) {
        try {
          const voiceRes = await fetch('/api/gemini/voice-assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: `Synthesize the following statement for operational radio: "${data.text}"`,
              voiceName: 'Charon',
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
          agentName: 'Ops Agent',
          text: '⚠️ Communication timeout. Ops system is busy securing the channels. Please check network secrets.',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setLoadingChat(false);
    }
  };

  // Dispatch selected staff member to selected incident
  const handleDispatchStaff = (staffId: string) => {
    if (!selectedIncident) return;

    // Update staff member to be dispatched with active task ID
    const updatedStaff = state.staff.map((s) => {
      if (s.id === staffId) {
        return { ...s, status: 'Dispatched' as const, activeTaskId: selectedIncident.id };
      }
      return s;
    });

    // Update incident status to Assigned and link staff member ID
    const updatedIncidents = state.incidents.map((inc) => {
      if (inc.id === selectedIncident.id) {
        const updatedInc = { 
          ...inc, 
          status: 'Assigned' as const, 
          assignedStaffId: staffId 
        };
        // Keep selected incident updated in panel state too
        onSelectIncident(updatedInc);
        return updatedInc;
      }
      return inc;
    });

    onUpdateState({
      ...state,
      staff: updatedStaff,
      incidents: updatedIncidents,
    });
  };

  // AI Auto-Dispatch Helper: Analyze incident and suggest the best/nearest staff member
  const getAutoDispatchSuggestion = (incident: Incident, staffList: StaffMember[]) => {
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

    const incidentCoords = getIncidentCoords(incident.location);

    // Map incident categories to primary preferred staff roles
    const getPreferredRoles = (category: string): string[] => {
      switch (category) {
        case 'Security': return ['Security'];
        case 'Medical': return ['Medical'];
        case 'CrowdControl': return ['Security', 'GuestServices'];
        case 'Maintenance': return ['Maintenance', 'Janitorial'];
        case 'Weather': return ['Maintenance', 'Security'];
        default: return [];
      }
    };

    const preferredRoles = getPreferredRoles(incident.category);

    const scoredStaff = staffList.map(member => {
      const dx = member.gps.x - incidentCoords.x;
      const dy = member.gps.y - incidentCoords.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Heuristic score calculation:
      // Starting base score of 100, subtracting distance penalty
      let score = 100 - (distance * 1.5);

      // Status adjustment: 'Idle' gets major priority, busy/dispatched gets severe penalty
      if (member.status === 'Idle') {
        score += 80;
      } else if (member.status === 'OnBreak') {
        score -= 20;
      } else {
        score -= 150; // Already busy/dispatched
      }

      // Role match bonus
      const roleMatches = preferredRoles.includes(member.role);
      if (roleMatches) {
        score += 60;
      }

      return {
        member,
        distance,
        score,
        roleMatches,
      };
    });

    // Sort by score descending
    scoredStaff.sort((a, b) => b.score - a.score);

    return scoredStaff[0] || null;
  };

  // Toggle roof manually
  const handleToggleRoof = () => {
    setControllingRoof(true);
    const targetStatus = state.weather.roofStatus === 'Open' ? 'Closing' : 'Opening';
    
    onUpdateState({
      ...state,
      weather: { ...state.weather, roofStatus: targetStatus as any },
    });

    // Simulate completion in 4 seconds
    setTimeout(() => {
      const finalStatus = targetStatus === 'Closing' ? 'Closed' : 'Open';
      onUpdateState({
        ...state,
        weather: { ...state.weather, roofStatus: finalStatus as any },
      });
      setControllingRoof(false);
    }, 4000);
  };

  // Weather safety automated handlers
  const unacknowledgedWeatherAlerts = React.useMemo(() => {
    return currentAlerts.filter(a => !acknowledgedWeatherAlerts.has(a.code));
  }, [currentAlerts, acknowledgedWeatherAlerts]);

  const handleAcknowledgeWeatherAlert = (code: string) => {
    setAcknowledgedWeatherAlerts(prev => {
      const next = new Set(prev);
      next.add(code);
      return next;
    });
  };

  const handleAcknowledgeAllWeatherAlerts = () => {
    setAcknowledgedWeatherAlerts(new Set(currentAlerts.map(a => a.code)));
  };

  // Ticket Scanned Data for Recharts
  const ticketingChartData = state.ticketing.scanRateHistory.map((val, idx) => ({
    time: `${idx * 10}m ago`,
    rate: val,
  }));

  // Concession Line Wait times for Recharts
  const concessionChartData = state.concessions.map((c) => ({
    name: c.name,
    wait: c.avgWaitMinutes,
    queue: c.queueLength,
  }));

  return (
    <div id="ops-command-dashboard" className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-slate-200">
      
      {/* 🚨 UNACKNOWLEDGED CRITICAL EMERGENCIES BANNER */}
      {unacknowledgedCriticalIncidents.length > 0 && (
        <div className="lg:col-span-12 border-2 border-red-500 bg-red-950/40 rounded-2xl p-4 shadow-2xl relative overflow-hidden backdrop-blur-md animate-pulse">
          {/* Neon warning flashing strip */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500 animate-pulse" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-red-500/30 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-500 text-white rounded-xl animate-bounce">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-wider font-mono">
                    CRITICAL FIELD EMERGENCY
                  </span>
                  <span className="text-slate-300 text-xs font-mono">
                    Active Audio Alarm & Voice Announcer
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-white tracking-tight mt-1">
                  Ops Command Center Alert: Immediate Attention Required!
                </h3>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Sound Settings Control inside the Banner */}
              <button
                onClick={() => setAudioAlertEnabled(!audioAlertEnabled)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                  audioAlertEnabled 
                    ? 'bg-red-900/60 hover:bg-red-900 border-red-500/40 text-red-200' 
                    : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title={audioAlertEnabled ? "Mute Emergency Sirens" : "Enable Emergency Sirens"}
              >
                {audioAlertEnabled ? (
                  <>
                    <Volume2 className="h-4 w-4 text-red-400" />
                    <span>Alarm: ON</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="h-4 w-4 text-slate-500" />
                    <span>Alarm: MUTED</span>
                  </>
                )}
              </button>

              <button
                onClick={playCriticalAlertSound}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs font-mono px-3 py-1.5 rounded-lg transition-colors"
              >
                🔊 Test Siren
              </button>

              <button
                onClick={handleSilenceAll}
                className="bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs font-mono px-4 py-1.5 rounded-lg transition-all shadow-md shadow-red-900/40 uppercase"
              >
                Silence All
              </button>
            </div>
          </div>

          <div className="mt-3.5 space-y-3">
            {unacknowledgedCriticalIncidents.map((incident) => (
              <div 
                key={incident.id} 
                className="bg-slate-950/80 p-3.5 rounded-xl border border-red-500/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all hover:bg-black"
              >
                <div className="space-y-1 text-left flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-black text-red-400 uppercase tracking-tight">
                      ⚠️ {incident.title}
                    </span>
                    <span className="bg-slate-900 border border-slate-800 text-[10px] text-slate-400 px-2 py-0.5 rounded font-mono">
                      📍 {incident.location}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ⏱️ {incident.timestamp}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-normal italic mt-1">
                    "{incident.description}"
                  </p>
                  <p className="text-[11px] text-emerald-400 font-medium font-mono mt-1.5">
                    Suggested Dispatch Action: {incident.aiSuggestedFix}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleTriggerEmergency(incident)}
                    className="flex-1 sm:flex-initial bg-red-950 hover:bg-red-900 border border-red-700 text-red-300 font-bold text-[10px] px-3 py-2 rounded-lg transition-colors font-mono uppercase"
                  >
                    Escalate AI Commander
                  </button>
                  <button
                    onClick={() => handleAcknowledgeIncident(incident.id)}
                    className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] px-4 py-2 rounded-lg transition-colors font-mono uppercase"
                  >
                    Acknowledge
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 🌤️ AUTOMATED METEOROLOGICAL SAFETY ALARM BANNER */}
      {unacknowledgedWeatherAlerts.length > 0 && (
        <div className="lg:col-span-12 border-2 border-amber-500 bg-amber-950/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-md animate-pulse">
          {/* Top orange neon warning line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-amber-500/20 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500 text-slate-950 rounded-xl font-bold flex items-center justify-center animate-bounce">
                <Sun className="h-6 w-6 text-slate-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded tracking-wider font-mono">
                    METEOROLOGICAL COMPLIANCE HAZARD
                  </span>
                  <span className="text-slate-300 text-xs font-mono">
                    Automated Weather Safety Watchdog Active
                  </span>
                </div>
                <h3 className="font-extrabold text-base text-white tracking-tight mt-1">
                  Weather Alert System: Exceeded Safe Operational Limits!
                </h3>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleAcknowledgeAllWeatherAlerts}
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold text-xs font-mono px-4 py-2 rounded-lg transition-all shadow-md shadow-amber-900/40 uppercase cursor-pointer"
              >
                Acknowledge All Alerts
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {unacknowledgedWeatherAlerts.map((alert) => {
              const isRainOrWind = alert.type === 'rain' || alert.type === 'wind';
              const showRoofControl = isRainOrWind && state.weather.roofStatus !== 'Closed' && state.weather.roofStatus !== 'Closing';

              return (
                <div 
                  key={alert.code} 
                  className="bg-slate-950/80 p-4 rounded-xl border border-amber-500/20 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all hover:border-amber-500/40"
                >
                  <div className="space-y-1.5 text-left flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-amber-400 uppercase tracking-tight flex items-center gap-1.5">
                        {alert.type === 'wind' && <Wind className="h-4 w-4 text-sky-400" />}
                        {alert.type === 'rain' && <CloudRain className="h-4 w-4 text-sky-400" />}
                        {alert.type === 'temperature' && <Thermometer className="h-4 w-4 text-amber-400" />}
                        {alert.title}
                      </span>
                      <span className="bg-slate-900 border border-slate-800 text-[10px] text-amber-500 px-2.5 py-0.5 rounded font-mono font-bold">
                        CURRENT: {alert.valueString} (Safe Limit: &lt; {alert.thresholdString})
                      </span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                        alert.severity === 'Severe' 
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-normal font-medium">
                      {alert.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                      <Brain className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      <span className="text-[11px] text-indigo-300 font-mono">
                        <strong className="text-indigo-200">Mitigation Strategy:</strong> {
                          alert.type === 'wind' ? 'Deploy ground crew to verify wind screens; secure aerial payloads. Close roof canopy.' :
                          alert.type === 'rain' ? 'Close retractable roof canopy immediately. Redirect ground conduits; prep ticket queue canopies.' :
                          alert.type === 'temperature' && alert.code === 'HEAT_HAZARD' ? 'Enable hydration hubs; stock cold reserves; log cooling tent readiness.' :
                          'Mobilize perimeter heating system; check insulation status.'
                        }
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch md:items-end lg:items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                    {showRoofControl && (
                      <button
                        onClick={handleToggleRoof}
                        disabled={controllingRoof}
                        className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-extrabold text-[10px] px-3 py-2 rounded-lg transition-colors font-mono uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {controllingRoof ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin text-white" />
                            Deploying...
                          </>
                        ) : (
                          <>
                            Auto-Deploy Roof
                          </>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleAcknowledgeWeatherAlert(alert.code)}
                      className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-[10px] px-3.5 py-2 rounded-lg transition-colors font-mono uppercase tracking-wider text-center cursor-pointer"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* 🔴 EMERGENCY AI COMMANDER PORTAL PANEL */}
      {emergencyActive && (
        <div className="lg:col-span-12 border border-red-500/50 bg-red-950/25 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden backdrop-blur-md">
          {/* Neon warning accents */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-red-500/30 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
              <span className="bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded font-mono tracking-wider">EMERGENCY AI COMMANDER MODE</span>
              <h3 className="font-black text-sm text-white uppercase tracking-tight">Active Evacuation & Response Engine</h3>
            </div>
            <button
              onClick={() => setEmergencyActive(false)}
              className="bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 hover:text-red-100 font-bold text-[10px] font-mono px-3 py-1.5 rounded-lg transition-colors uppercase cursor-pointer"
            >
              Disengage Emergency Mode
            </button>
          </div>

          {loadingEmergency ? (
            <div className="flex items-center gap-3 py-8 justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-red-500" />
              <span className="text-sm font-mono text-red-400">Querying Emergency Commander Intelligence...</span>
            </div>
          ) : emergencyData ? (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 text-left">
              
              {/* Box 1: Threat Spread Prediction */}
              <div className="md:col-span-4 bg-slate-950/80 p-4 rounded-xl border border-red-900/30 space-y-2">
                <span className="text-[10px] font-bold text-red-400 font-mono block uppercase">1. Threat Spread Prediction:</span>
                <p className="text-slate-300 text-xs leading-relaxed italic">
                  "{emergencyData.threatSpreadPrediction}"
                </p>
              </div>

              {/* Box 2: Optimal Evacuation Routes */}
              <div className="md:col-span-4 bg-slate-950/80 p-4 rounded-xl border border-red-900/30 space-y-2">
                <span className="text-[10px] font-bold text-red-400 font-mono block uppercase">2. AI-OS Evacuation Routes:</span>
                <div className="space-y-1.5">
                  {emergencyData.optimalEvacuationRoutes.map((route, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs text-slate-200">
                      <span className="text-emerald-500">✔</span>
                      <span>{route}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 3: Multilingual Warnings */}
              <div className="md:col-span-4 bg-slate-950/80 p-4 rounded-xl border border-red-900/30 space-y-2">
                <span className="text-[10px] font-bold text-red-400 font-mono block uppercase">3. Multilingual Alert Broadcast:</span>
                <div className="space-y-2 text-[11px] leading-snug">
                  <div><span className="text-blue-400 font-bold uppercase font-mono mr-1">EN:</span> <span className="text-slate-300">"{emergencyData.multilingualAlerts.en}"</span></div>
                  <div><span className="text-amber-400 font-bold uppercase font-mono mr-1">ES:</span> <span className="text-slate-300">"{emergencyData.multilingualAlerts.es}"</span></div>
                  <div><span className="text-rose-400 font-bold uppercase font-mono mr-1">FR:</span> <span className="text-slate-300">"{emergencyData.multilingualAlerts.fr}"</span></div>
                  <div><span className="text-emerald-400 font-bold uppercase font-mono mr-1">AR:</span> <span className="text-slate-300">"{emergencyData.multilingualAlerts.ar}"</span></div>
                </div>
              </div>

              {/* Box 4: Tactical Responder dispatches */}
              <div className="md:col-span-8 bg-slate-950/80 p-4 rounded-xl border border-red-900/30 space-y-2">
                <span className="text-[10px] font-bold text-red-400 font-mono block uppercase">4. First Responder Tactical Directives:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {emergencyData.responderTacticalChecklist.map((task, idx) => (
                    <div key={idx} className="bg-slate-900/60 p-2 rounded border border-slate-800 text-slate-300">
                      {task}
                    </div>
                  ))}
                </div>
              </div>

              {/* Box 5: SOP Guideline */}
              <div className="md:col-span-4 bg-slate-950/80 p-4 rounded-xl border border-red-900/30 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-red-400 font-mono block uppercase">5. Critical Control Room SOP:</span>
                  <p className="text-xs text-red-300 font-bold mt-1.5 uppercase leading-normal">
                    {emergencyData.criticalSOPGuideline}
                  </p>
                </div>
                <div className="text-[9px] text-slate-500 font-mono mt-3 uppercase">
                  Telemetry Channel: SECURE ENCRYPTED • AI-OS BRAIN ACTIVE
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-6 text-red-400 text-xs font-mono">
              Ready to generate emergency response strategy.
            </div>
          )}
        </div>
      )}

      {/* 🧭 EMERGENCY EVACUATION ADVISOR PANEL */}
      {(() => {
        const sectionOptions = [
          'Section 101', 'Section 102', 'Section 103', 'Section 104',
          'Section 105', 'Section 106', 'Section 107', 'Section 108',
          'Pitch', 'Concourse East', 'Concourse West', 'Concourse North', 'Concourse South'
        ];

        const locationCoords: Record<string, { x: number, y: number }> = {
          "Section 101": { x: 250, y: 70 },
          "Section 102": { x: 340, y: 95 },
          "Section 103": { x: 380, y: 150 },
          "Section 104": { x: 340, y: 205 },
          "Section 105": { x: 250, y: 230 },
          "Section 106": { x: 160, y: 205 },
          "Section 107": { x: 120, y: 150 },
          "Section 108": { x: 160, y: 95 },
          "Pitch": { x: 250, y: 150 },
          "Concourse East": { x: 420, y: 150 },
          "Concourse West": { x: 80, y: 150 },
          "Concourse North": { x: 250, y: 40 },
          "Concourse South": { x: 250, y: 260 },
        };

        const gateCoords: Record<string, { x: number, y: number }> = {
          "Gate A": { x: 80, y: 60 },
          "Gate B": { x: 420, y: 60 },
          "Gate C": { x: 80, y: 240 },
          "Gate D": { x: 420, y: 240 },
        };

        const findGateCoord = (gateName: string) => {
          if (!gateName) return null;
          const normalized = gateName.toUpperCase();
          if (normalized.includes('GATE A') || normalized.includes('A')) return gateCoords['Gate A'];
          if (normalized.includes('GATE B') || normalized.includes('B')) return gateCoords['Gate B'];
          if (normalized.includes('GATE C') || normalized.includes('C')) return gateCoords['Gate C'];
          if (normalized.includes('GATE D') || normalized.includes('D')) return gateCoords['Gate D'];
          return null;
        };

        return (
          <div className="lg:col-span-12 border border-slate-800 bg-slate-900/60 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden backdrop-blur-md">
            {/* Accent indicator */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500" />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                  <Compass className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white uppercase tracking-tight">Emergency Evacuation Advisor</h3>
                  <p className="text-[10px] text-slate-500 font-mono uppercase">AI-OS Real-Time Exit Optimizations & Threat Containment Routing</p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs px-3 py-1.5 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 font-medium font-mono cursor-pointer"
                >
                  {sectionOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>

                <button
                  onClick={handleCalculateEvacuation}
                  disabled={evacuationLoading}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors font-mono uppercase cursor-pointer disabled:opacity-55"
                >
                  {evacuationLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Brain className="h-3.5 w-3.5" />
                      Calculate exit path
                    </>
                  )}
                </button>
              </div>
            </div>

            {evacuationError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg font-mono flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{evacuationError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left / Top Side: Blueprint Map representation */}
              <div className="lg:col-span-5 flex flex-col justify-center min-h-[260px]">
                <style>{`
                  @keyframes dash {
                    to {
                      stroke-dashoffset: -20;
                    }
                  }
                `}</style>
                <div className="relative w-full aspect-[5/3]">
                  <svg viewBox="0 0 500 300" className="w-full h-full bg-slate-950 border border-slate-800/80 rounded-xl p-2 shadow-inner">
                    {/* Grid Pattern */}
                    <defs>
                      <pattern id="grid-evac" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#0f172a" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid-evac)" />

                    {/* Outer Stadium Ellipse */}
                    <ellipse cx="250" cy="150" rx="190" ry="110" fill="none" stroke="#1e293b" strokeWidth="1.5" />
                    <ellipse cx="250" cy="150" rx="200" ry="118" fill="none" stroke="#0f172a" strokeWidth="1" />
                    <ellipse cx="250" cy="150" rx="170" ry="95" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 2" />

                    {/* Pitch */}
                    <rect x="180" y="110" width="140" height="80" rx="3" fill="#022c22" stroke="#065f46" strokeWidth="1" className="opacity-20" />
                    <circle cx="250" cy="150" r="15" fill="none" stroke="#065f46" strokeWidth="0.8" className="opacity-30" />
                    <line x1="250" y1="110" x2="250" y2="190" stroke="#065f46" strokeWidth="0.8" className="opacity-30" />

                    {/* Gates */}
                    {Object.entries(gateCoords).map(([name, coords]) => (
                      <g key={name}>
                        <circle cx={coords.x} cy={coords.y} r="10" fill="#020617" stroke="#475569" strokeWidth="1" />
                        <text x={coords.x} y={coords.y + 3.2} textAnchor="middle" fill="#64748b" className="text-[8px] font-mono font-bold">{name.replace('Gate ', '')}</text>
                      </g>
                    ))}

                    {/* Draw other sections */}
                    {Object.entries(locationCoords).map(([name, coords]) => {
                      const isSelected = name === selectedSection;
                      if (isSelected) return null;
                      return (
                        <circle key={name} cx={coords.x} cy={coords.y} r="3" fill="#334155" />
                      );
                    })}

                    {/* Paths */}
                    {evacuationResult && (() => {
                      const sCoords = locationCoords[selectedSection];
                      const rCoords = findGateCoord(evacuationResult.recommendedExitGate);
                      const aCoords = findGateCoord(evacuationResult.alternativeExitGate);

                      return (
                        <>
                          {rCoords && (
                            <g>
                              <path
                                d={`M ${sCoords.x} ${sCoords.y} L ${rCoords.x} ${rCoords.y}`}
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                strokeDasharray="6 4"
                                style={{ animation: 'dash 1.2s linear infinite' }}
                              />
                              <circle cx={rCoords.x} cy={rCoords.y} r="15" fill="none" stroke="#10b981" strokeWidth="2" className="animate-ping opacity-75" />
                              <circle cx={rCoords.x} cy={rCoords.y} r="10" fill="#064e3b" stroke="#10b981" strokeWidth="2" />
                              <text x={rCoords.x} y={rCoords.y + 3.2} textAnchor="middle" fill="#ffffff" className="text-[8px] font-mono font-bold">
                                {evacuationResult.recommendedExitGate.replace('Gate ', '').replace('GATE ', '')}
                              </text>
                            </g>
                          )}

                          {aCoords && (
                            <g>
                              <path
                                d={`M ${sCoords.x} ${sCoords.y} L ${aCoords.x} ${aCoords.y}`}
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeDasharray="4 4"
                              />
                              <circle cx={aCoords.x} cy={aCoords.y} r="10" fill="#78350f" stroke="#f59e0b" strokeWidth="1.5" />
                              <text x={aCoords.x} y={aCoords.y + 3.2} textAnchor="middle" fill="#ffffff" className="text-[7px] font-mono font-bold">
                                {evacuationResult.alternativeExitGate.replace('Gate ', '').replace('GATE ', '')}
                              </text>
                            </g>
                          )}
                        </>
                      );
                    })()}

                    {/* Selected starting location marker */}
                    {(() => {
                      const coords = locationCoords[selectedSection];
                      if (coords) {
                        return (
                          <g>
                            <circle cx={coords.x} cy={coords.y} r="10" fill="none" stroke="#3b82f6" strokeWidth="1.5" className="animate-ping opacity-70" />
                            <circle cx={coords.x} cy={coords.y} r="5" fill="#2563eb" stroke="#ffffff" strokeWidth="1" />
                            <text x={coords.x} y={coords.y - 8} textAnchor="middle" fill="#3b82f6" className="text-[8px] font-mono font-extrabold bg-slate-950 px-1 py-0.5 rounded border border-blue-500/15">
                              {selectedSection}
                            </text>
                          </g>
                        );
                      }
                      return null;
                    })()}
                  </svg>
                </div>
              </div>

              {/* Right / Bottom Side: Evacuation advisor report output */}
              <div className="lg:col-span-7 flex flex-col justify-between">
                {evacuationLoading ? (
                  <div className="flex flex-col items-center justify-center h-full py-10 space-y-3 bg-slate-950/40 rounded-xl border border-slate-800/60">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                    <div className="text-center">
                      <span className="text-xs font-mono text-indigo-400 block font-bold uppercase tracking-widest">GEMINI BRAIN INJECTING EVACUATION INTEL...</span>
                      <span className="text-[10px] font-mono text-slate-500 block mt-1">Cross-referencing live weather streams, CCTV flow matrices, and crowd counts</span>
                    </div>
                  </div>
                ) : evacuationResult ? (
                  <div className="space-y-4">
                    {/* 3 Metric Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-slate-950 border border-emerald-500/20 p-3 rounded-xl flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500" />
                        <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">Recommended Exit</span>
                        <span className="text-sm font-black text-emerald-400 font-mono tracking-tight uppercase mt-1">
                          {evacuationResult.recommendedExitGate}
                        </span>
                      </div>

                      <div className="bg-slate-950 border border-amber-500/20 p-3 rounded-xl flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500" />
                        <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">Safety Rating</span>
                        <span className="text-sm font-black text-amber-400 font-mono tracking-tight mt-1">
                          {evacuationResult.safetyScore}/100
                        </span>
                      </div>

                      <div className="bg-slate-950 border border-indigo-500/20 p-3 rounded-xl flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500" />
                        <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">Estimated Transit</span>
                        <span className="text-sm font-black text-indigo-400 font-mono tracking-tight mt-1">
                          {evacuationResult.estimatedTimeMinutes} Min
                        </span>
                      </div>
                    </div>

                    {/* Route Directives */}
                    <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                      <span className="text-[9px] font-bold font-mono text-slate-500 uppercase block mb-1">Route Instructions</span>
                      <p className="text-xs text-slate-200 leading-relaxed font-sans">
                        {evacuationResult.routeDescription}
                      </p>
                    </div>

                    {/* Reasoning & Warnings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Reasoning list */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold font-mono text-indigo-400 uppercase block">AI Route Optimizations:</span>
                        <div className="space-y-1 text-xs text-slate-300">
                          {evacuationResult.reasoning.map((reason, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 bg-slate-950/60 p-2 rounded border border-slate-800/60">
                              <span className="text-indigo-400 font-bold">•</span>
                              <span className="leading-relaxed">{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Warnings list */}
                      <div className="space-y-1.5">
                        <span className="text-[9px] font-bold font-mono text-amber-500 uppercase block">Hazard Warnings:</span>
                        <div className="space-y-1 text-xs text-slate-300">
                          {evacuationResult.hazardWarnings.length === 0 ? (
                            <div className="flex items-center gap-1.5 bg-emerald-950/10 p-2 rounded border border-emerald-800/20 text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>No hazard warnings along path.</span>
                            </div>
                          ) : (
                            evacuationResult.hazardWarnings.map((warn, idx) => (
                              <div key={idx} className="flex items-start gap-1.5 bg-amber-950/10 p-2 rounded border border-amber-800/20 text-amber-400">
                                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                <span className="leading-relaxed">{warn}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Alternative Backup Exit banner */}
                    <div className="bg-slate-950/50 p-2 rounded border border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
                      <span>BACKUP ESCAPE ROUTING SYSTEM ACTIVE:</span>
                      <span className="font-bold text-amber-400 uppercase">USE {evacuationResult.alternativeExitGate} IN CASE OF PRIMARY OVERFLOW</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-10 bg-slate-950/20 border border-slate-800/50 rounded-xl space-y-2.5">
                    <Compass className="h-10 w-10 text-slate-700 animate-pulse" />
                    <div className="text-center px-4">
                      <span className="text-xs text-slate-400 font-bold block uppercase font-mono">Select a section and calculate path</span>
                      <span className="text-[10px] text-slate-600 block mt-1">AI-OS will execute dynamic graph matching to find paths around high crowd density, wet zones, and incidents.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* 🌤️ WEATHER INTELLIGENCE PANEL */}
      <div className="lg:col-span-12 border border-slate-800 bg-slate-900/60 rounded-2xl p-5 shadow-2xl space-y-4 relative overflow-hidden backdrop-blur-md">
        {/* Accent indicator */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-sky-500" />

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-sky-500/10 rounded-lg text-sky-400">
              <Sun className="h-5 w-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-sm text-white uppercase tracking-tight">Weather Intelligence Advisor</h3>
                {currentAlerts.length > 0 ? (
                  <span className="bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-mono px-2 py-0.5 rounded font-bold animate-pulse uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    Warning: Threshold Exceeded ({currentAlerts.length})
                  </span>
                ) : (
                  <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    🟢 Safety Nominal
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-mono uppercase">AI-OS Live Meteorological Analytics & Automated Facility Safeguards</p>
            </div>
          </div>

          <button
            onClick={handleFetchWeatherIntelligence}
            disabled={weatherIntelLoading}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-bold text-xs px-4 py-2 rounded-lg transition-colors font-mono uppercase cursor-pointer disabled:opacity-55"
          >
            {weatherIntelLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
                Analyzing live streams...
              </>
            ) : (
              <>
                <Brain className="h-3.5 w-3.5 text-sky-400" />
                Analyze Weather
              </>
            )}
          </button>
        </div>

        {weatherIntelError && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 rounded-lg font-mono flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>{weatherIntelError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Side: Live Meteorological Indicators */}
          <div className="lg:col-span-4 grid grid-cols-2 gap-3">
            {/* Live Roof Status */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
              <span className="text-[9px] font-bold font-mono text-slate-500 uppercase">Roof Status</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-black font-mono text-white uppercase tracking-tight">
                  {state.weather.roofStatus}
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  state.weather.roofStatus === 'Open' ? 'bg-emerald-500 animate-pulse' :
                  state.weather.roofStatus === 'Closed' ? 'bg-blue-500' : 'bg-amber-500 animate-ping'
                }`} />
              </div>
              <span className="text-[9px] font-mono text-slate-500 mt-1 block">MANUAL OVERRIDE AVAILABLE</span>
            </div>

            {/* Temperature & Humidity */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
              <span className="text-[9px] font-bold font-mono text-slate-500 uppercase">Temp / Humidity</span>
              <div className="flex items-center gap-1.5 mt-2">
                <Thermometer className="h-4 w-4 text-rose-400" />
                <span className="text-sm font-black font-mono text-white">
                  {state.weather.temperature}°F
                </span>
                <span className="text-[10px] text-slate-400 font-mono">({state.weather.humidity}%)</span>
              </div>
              <span className="text-[9px] font-mono text-slate-500 mt-1 block">STADIUM SENSOR BULB</span>
            </div>

            {/* Rain Chance */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
              <span className="text-[9px] font-bold font-mono text-slate-500 uppercase">Rain Chance</span>
              <div className="flex items-center gap-1.5 mt-2">
                <CloudRain className="h-4 w-4 text-sky-400" />
                <span className="text-sm font-black font-mono text-white">
                  {state.weather.rainChance}%
                </span>
                <span className="text-[9px] text-slate-400 font-mono">({state.weather.precipitationRate} in/h)</span>
              </div>
              <span className="text-[9px] font-mono text-slate-500 mt-1 block">PRECIPITATION STREAM</span>
            </div>

            {/* Wind Speed */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between">
              <span className="text-[9px] font-bold font-mono text-slate-500 uppercase">Wind Velocity</span>
              <div className="flex items-center gap-1.5 mt-2">
                <Wind className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-black font-mono text-white">
                  {state.weather.windSpeed} mph
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-500 mt-1 block">ANEMOMETER ARRAY</span>
            </div>

            {/* 🌍 Real-Time Location & Weather Sync Panel */}
            <div className="col-span-2 bg-slate-950 p-3.5 rounded-xl border border-slate-800/85 space-y-3 shadow-inner">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-sky-400" />
                  <span className="text-[10px] font-bold font-mono text-slate-300 uppercase">Real-Time Sync</span>
                </div>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wide flex items-center gap-1 ${
                  state.weather.isRealLive 
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                    : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${state.weather.isRealLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                  {state.weather.isRealLive ? 'Live GPS Active' : 'Simulator Preset'}
                </span>
              </div>

              {/* Status and Active Location Info */}
              <div className="bg-slate-900/60 border border-slate-800/50 p-2.5 rounded-lg text-[10px]">
                {state.weather.isRealLive ? (
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-mono">Location:</span>
                      <span className="font-bold text-white tracking-tight">{state.weather.locationName}</span>
                    </div>
                    {state.weather.lat !== undefined && state.weather.lon !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-mono">Coordinates:</span>
                        <span className="font-mono text-slate-300">{state.weather.lat.toFixed(4)}°N, {state.weather.lon.toFixed(4)}°E</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-slate-400 leading-normal font-sans text-[10px]">
                    Currently tracking simulated World Cup Stadium environment. Synchronize below to lock onto your device coordinates and stream live meteorological telemetry.
                  </div>
                )}
              </div>

              {/* Geolocation Button */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSyncWithBrowserLocation}
                  disabled={syncingLocation}
                  className="w-full flex items-center justify-center gap-1.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white font-bold text-xs py-2 rounded-lg transition-all font-mono uppercase tracking-wide cursor-pointer disabled:text-slate-500"
                >
                  {syncingLocation ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                      Streaming Local Position...
                    </>
                  ) : (
                    <>
                      <Compass className="h-3.5 w-3.5 text-sky-200" />
                      Sync Browser GPS
                    </>
                  )}
                </button>

                {/* City Search Field */}
                <form onSubmit={handleSearchCityWeather} className="relative">
                  <input
                    type="text"
                    value={weatherSearchQuery}
                    onChange={(e) => setWeatherSearchQuery(e.target.value)}
                    placeholder="Or type city (e.g. London, Austin)..."
                    disabled={syncingLocation}
                    className="w-full bg-slate-900/80 border border-slate-800 rounded-lg text-[10px] p-2 pl-2.5 pr-8 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:bg-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={syncingLocation || !weatherSearchQuery.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-sky-400 disabled:text-slate-600 cursor-pointer"
                  >
                    <Search className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>

              {/* Error messages */}
              {syncError && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] p-2 rounded-lg font-mono flex items-start gap-1.5 leading-snug">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-400" />
                  <span>{syncError}</span>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: Gemini-powered intelligence output */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            {weatherIntelLoading ? (
              <div className="flex flex-col items-center justify-center h-full py-10 space-y-3 bg-slate-950/40 rounded-xl border border-slate-800/60 w-full">
                <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
                <div className="text-center">
                  <span className="text-xs font-mono text-sky-400 block font-bold uppercase tracking-widest">GEMINI WEATHER EXPERT INJECTING INSIGHTS...</span>
                  <span className="text-[10px] font-mono text-slate-500 block mt-1">Calculating wind shear load, moisture index, and fan hazard containment rules</span>
                </div>
              </div>
            ) : weatherIntelResult ? (
              <div className="space-y-4">
                {/* Weather summary banner with severity rating */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold font-mono text-slate-500 uppercase block">Met-Office Synthesis</span>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
                      {weatherIntelResult.currentWeatherSummary}
                    </p>
                  </div>
                  <div className={`px-3 py-1 rounded-full border text-[10px] font-bold font-mono uppercase tracking-wider ${
                    weatherIntelResult.weatherSeverity === 'Severe' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                    weatherIntelResult.weatherSeverity === 'Caution' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {weatherIntelResult.weatherSeverity} risk
                  </div>
                </div>

                {/* Grid for Roof Suggestion & Fan protections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Roof Recommendation Column */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col justify-between gap-3 relative overflow-hidden">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black font-mono text-indigo-400 uppercase tracking-wider">Roof Recommendation:</span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                          weatherIntelResult.roofActionSuggestion === 'Close Roof' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          weatherIntelResult.roofActionSuggestion === 'Open Roof' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          {weatherIntelResult.roofActionSuggestion}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {weatherIntelResult.roofActionReason}
                      </p>
                    </div>

                    {/* Action buttons inside weather intelligence for roof control */}
                    {weatherIntelResult.roofActionSuggestion === 'Close Roof' && state.weather.roofStatus !== 'Closed' && (
                      <button
                        onClick={handleToggleRoof}
                        disabled={controllingRoof}
                        className="w-full mt-2 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded text-xs font-bold font-mono uppercase cursor-pointer transition-colors"
                      >
                        {controllingRoof ? 'Initiating Roof Close...' : 'Confirm Roof Closure'}
                      </button>
                    )}
                    {weatherIntelResult.roofActionSuggestion === 'Open Roof' && state.weather.roofStatus !== 'Open' && (
                      <button
                        onClick={handleToggleRoof}
                        disabled={controllingRoof}
                        className="w-full mt-2 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded text-xs font-bold font-mono uppercase cursor-pointer transition-colors"
                      >
                        {controllingRoof ? 'Initiating Roof Open...' : 'Confirm Roof Opening'}
                      </button>
                    )}
                    {state.weather.roofStatus === (weatherIntelResult.roofActionSuggestion === 'Close Roof' ? 'Closed' : 'Open') && (
                      <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono mt-2 font-bold uppercase">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Roof is in recommended state
                      </div>
                    )}
                  </div>

                  {/* Fan Protections Column */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                    {/* Spectator/Comfort Fan Protection */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black font-mono text-sky-400 uppercase tracking-wider block">1. Spectator comfort & shelter:</span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {weatherIntelResult.spectatorProtectionAdvice}
                      </p>
                    </div>

                    {/* Mechanical Fan Protection */}
                    <div className="space-y-1 pt-1.5 border-t border-slate-800/85">
                      <span className="text-[9px] font-black font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <Fan className="h-3.5 w-3.5 animate-spin-slow inline-block text-emerald-400" />
                        2. Ventilation & Fan Safeguards:
                      </span>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {weatherIntelResult.equipmentFanProtectionAdvice}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Checklist Action Items */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold font-mono text-sky-400 uppercase block">Weather Tactical Action Steps:</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-300">
                    {weatherIntelResult.recommendedActionsList.map((action, idx) => (
                      <div key={idx} className="flex items-start gap-1.5 bg-slate-950/60 p-2.5 rounded border border-slate-800/60">
                        <span className="text-sky-400 font-bold">•</span>
                        <span className="leading-relaxed">{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-10 bg-slate-950/20 border border-slate-800/50 rounded-xl space-y-2.5 w-full">
                <Sun className="h-10 w-10 text-slate-700 animate-pulse" />
                <div className="text-center px-4">
                  <span className="text-xs text-slate-400 font-bold block uppercase font-mono">Live Weather intelligence pending</span>
                  <span className="text-[10px] text-slate-600 block mt-1">AI-OS analyzes wind shear, relative humidity, precipitation, and incident logs to generate building safety recommendations.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🟢 SUSTAINABILITY & INFRASTRUCTURE COMMAND CENTER */}
      <div className="lg:col-span-12 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
        {/* KPI: Energy consumption */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <span className="text-[10px] font-bold text-emerald-400 font-mono uppercase tracking-wider">ENERGY GRID DEMAND</span>
          <div className="my-1.5">
            <span className="text-xl font-black tracking-tight text-white">{(state.sustainability?.energyUsageKw || 342).toLocaleString()} kW</span>
            <span className="text-[9px] text-emerald-500 font-medium block mt-0.5">Status: {state.sustainability?.energyGridStatus || 'Grid Stable'}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div className="bg-emerald-500 h-full w-4/5" />
          </div>
        </div>

        {/* KPI: Water consumption */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <span className="text-[10px] font-bold text-blue-400 font-mono uppercase tracking-wider">WATER CONSUMPTION TRACKER</span>
          <div className="my-1.5">
            <span className="text-xl font-black tracking-tight text-white">{(state.sustainability?.waterConsumptionLiters || 41250).toLocaleString()} L</span>
            <span className="text-[9px] text-blue-500 font-medium block mt-0.5">Pressure: {state.sustainability?.waterPressurePsi || 65} PSI</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div className="bg-blue-500 h-full w-11/12" />
          </div>
        </div>

        {/* KPI: Waste diversion */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <span className="text-[10px] font-bold text-amber-500 font-mono uppercase tracking-wider">RECYCLABLE WASTE DIVERSION</span>
          <div className="my-1.5">
            <span className="text-xl font-black tracking-tight text-white">{state.sustainability?.wasteRecyclablePercentage || 88}%</span>
            <span className="text-[9px] text-amber-500 font-medium block mt-0.5">General Waste: {state.sustainability?.wasteGeneralBinPercentage || 12}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div className="bg-amber-500 h-full w-5/6" />
          </div>
        </div>

        {/* KPI: Metro transit */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <span className="text-[10px] font-bold text-indigo-400 font-mono uppercase tracking-wider">METRO TRANSIT FLOW</span>
          <div className="my-1.5">
            <span className="text-xl font-black tracking-tight text-white">{(state.sustainability?.transportMetroFlowRate || 12840).toLocaleString()} p/h</span>
            <span className="text-[9px] text-indigo-500 font-medium block mt-0.5">Parking: {state.sustainability?.transportParkingOccupancy || 74}% | Shuttles: {state.sustainability?.transportShuttlesActive || 8}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div className="bg-indigo-500 h-full w-3/4" />
          </div>
        </div>
      </div>

      {/* SECTION 1: Metrics telemetry (Top Row) */}
      <div className="lg:col-span-12 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* KPI 1: Ticket Entrance count */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="absolute right-2 top-2 text-indigo-500/20"><UserCheck className="h-10 w-10" /></div>
          <span className="text-xs text-slate-400 font-medium tracking-tight">TICKET SCANS</span>
          <div className="my-2">
            <span className="text-2xl font-bold tracking-tight text-white">
              {state.ticketing.scannedCount.toLocaleString()}
            </span>
            <span className="text-xs text-slate-500 font-medium ml-1">/ {state.ticketing.capacity.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-indigo-500 h-full transition-all duration-500" 
              style={{ width: `${(state.ticketing.scannedCount / state.ticketing.capacity) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-2 font-mono">VIP entries: {state.ticketing.vipScannedCount}</span>
        </div>

        {/* KPI 2: Active Incidents alerts */}
        <div className={`bg-slate-900 border rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden transition-colors ${
          state.incidents.filter(i => i.status !== 'Resolved').length > 0 ? 'border-red-900/50 bg-red-950/10' : 'border-slate-800'
        }`}>
          <div className="absolute right-2 top-2 text-red-500/20"><ShieldAlert className="h-10 w-10" /></div>
          <span className="text-xs text-slate-400 font-medium tracking-tight">ACTIVE INCIDENTS</span>
          <div className="my-2">
            <span className={`text-2xl font-bold tracking-tight ${
              state.incidents.filter(i => i.status !== 'Resolved').length > 0 ? 'text-red-400' : 'text-emerald-400'
            }`}>
              {state.incidents.filter(i => i.status !== 'Resolved').length}
            </span>
            <span className="text-xs text-slate-500 ml-1">unresolved</span>
          </div>
          <div className="flex gap-2 items-center text-[10px] text-slate-400">
            <span className="bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30">
              Critical: {state.incidents.filter(i => i.severity === 'Critical' && i.status !== 'Resolved').length}
            </span>
            <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30">
              High: {state.incidents.filter(i => i.severity === 'High' && i.status !== 'Resolved').length}
            </span>
          </div>
        </div>

        {/* KPI 3: Operational Staff on Ground */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="absolute right-2 top-2 text-emerald-500/20"><Shield className="h-10 w-10" /></div>
          <span className="text-xs text-slate-400 font-medium tracking-tight">FIELD PERSONNEL</span>
          <div className="my-2">
            <span className="text-2xl font-bold tracking-tight text-white">
              {state.staff.filter(s => s.status === 'Dispatched').length}
            </span>
            <span className="text-xs text-slate-500 ml-1">/ {state.staff.length} dispatched</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-500" 
              style={{ width: `${(state.staff.filter(s => s.status === 'Dispatched').length / state.staff.length) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-2 font-mono">Idle: {state.staff.filter(s => s.status === 'Idle').length} on standby</span>
        </div>

        {/* KPI 4: Weather & Roof Automation */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="absolute right-2 top-2 text-amber-500/20"><Wind className="h-10 w-10" /></div>
          <span className="text-xs text-slate-400 font-medium tracking-tight">ROOF OPERATIONS</span>
          <div className="my-2 flex items-center justify-between">
            <div>
              <span className="text-lg font-bold tracking-tight text-white block">
                {state.weather.roofStatus}
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <CloudRain className="h-3 w-3 text-sky-400" /> Rain: {state.weather.rainChance}%
              </span>
            </div>
            <button
              onClick={handleToggleRoof}
              disabled={controllingRoof}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md border ${
                controllingRoof 
                  ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-600/30'
              }`}
            >
              {controllingRoof ? 'Moving...' : state.weather.roofStatus === 'Open' ? 'Close Roof' : 'Open Roof'}
            </button>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${
                state.weather.roofStatus === 'Closed' ? 'w-full bg-emerald-500' :
                state.weather.roofStatus === 'Open' ? 'w-0 bg-slate-500' : 'w-1/2 bg-amber-500 animate-pulse'
              }`}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-2 font-mono">Wind speed: {state.weather.windSpeed} mph | Temp: {state.weather.temperature}°F</span>
        </div>
      </div>

      {/* SECTION 2: CCTV Live Stream & Metric Visualizations (Left Panel) */}
      <div className="lg:col-span-5 flex flex-col gap-5">
        {/* Sub-component: Live CCTV player */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col shadow-lg">
          <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Eye className="h-4.5 w-4.5 text-indigo-400 animate-pulse" />
              <h4 className="font-semibold text-xs text-slate-200 tracking-tight uppercase">CCTV FEED ANALYSIS</h4>
            </div>
            <div className="flex bg-slate-950 px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping inline-block"></span>
              LIVE STREAMS
            </div>
          </div>

          {/* Camera Selector dropdown */}
          <select 
            value={selectedCamera.id}
            onChange={(e) => {
              const selected = state.cctvFeeds.find(c => c.id === e.target.value);
              if (selected) onSelectCamera(selected);
            }}
            className="w-full bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-slate-200 mb-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            {state.cctvFeeds.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.status})</option>
            ))}
          </select>

          {/* CCTV Vision Mode Tabs */}
          <div className="grid grid-cols-4 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800/80 mb-3 text-[9px] font-mono font-bold uppercase">
            <button
              onClick={() => setCctvFilter('normal')}
              className={`py-1 rounded text-center transition-all cursor-pointer ${
                cctvFilter === 'normal' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setCctvFilter('night')}
              className={`py-1 rounded text-center transition-all cursor-pointer ${
                cctvFilter === 'night' ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              NV Green
            </button>
            <button
              onClick={() => setCctvFilter('thermal')}
              className={`py-1 rounded text-center transition-all cursor-pointer ${
                cctvFilter === 'thermal' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Thermal
            </button>
            <button
              onClick={() => setCctvFilter('blueprint')}
              className={`py-1 rounded text-center transition-all cursor-pointer ${
                cctvFilter === 'blueprint' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Blueprint
            </button>
          </div>

          {/* Simulated CCTV Camera Display */}
          <div className="relative bg-black rounded-lg aspect-video flex flex-col justify-between p-3 border border-slate-800 overflow-hidden shadow-inner group">
            <style>{`
              @keyframes track-move-1 {
                0% { transform: translate(15%, 20%) scale(1); }
                30% { transform: translate(65%, 45%) scale(1.15); }
                70% { transform: translate(45%, 70%) scale(0.9); }
                100% { transform: translate(15%, 20%) scale(1); }
              }
              @keyframes track-move-2 {
                0% { transform: translate(75%, 60%) scale(1.1); }
                40% { transform: translate(25%, 35%) scale(0.95); }
                80% { transform: translate(55%, 15%) scale(1.05); }
                100% { transform: translate(75%, 60%) scale(1.1); }
              }
              .hud-tracker-1 {
                animation: track-move-1 9s infinite ease-in-out;
              }
              .hud-tracker-2 {
                animation: track-move-2 13s infinite ease-in-out;
              }
            `}</style>

            {/* Real Looping Video Feed with Dynamic Filter */}
            {selectedCamera.feedUrl ? (
              <video
                key={selectedCamera.id}
                src={selectedCamera.feedUrl}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover transition-all duration-300 pointer-events-none"
                style={{
                  filter: 
                    cctvFilter === 'night' ? 'sepia(100%) hue-rotate(90deg) saturate(320%) contrast(140%) brightness(85%)' :
                    cctvFilter === 'thermal' ? 'hue-rotate(240deg) saturate(450%) contrast(180%) invert(10%)' :
                    cctvFilter === 'blueprint' ? 'sepia(100%) hue-rotate(190deg) saturate(280%) contrast(120%) brightness(85%)' :
                    'brightness(1.1) contrast(1.1)',
                }}
              />
            ) : (
              <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
                <span className="text-[10px] font-mono text-slate-500">NO SIGNAL</span>
              </div>
            )}

            {/* HUD Scanlines overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none opacity-45" />

            {/* Grid overlay for camera matrix look */}
            <div className="absolute inset-0 bg-radial-grid opacity-20 pointer-events-none" />
            
            {/* Camera ID and metadata */}
            <div className="flex justify-between items-start z-10 text-[10px] font-mono text-emerald-400 bg-black/60 p-1.5 rounded border border-emerald-500/10 backdrop-blur-xs">
              <span className="uppercase font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                {selectedCamera.name}
              </span>
              <span>FPS: 30.0 / FLOW: {selectedCamera.flowRate} p/m</span>
            </div>

            {/* AI Object Tracking HUD boxes overlaying the live feed */}
            <div className="absolute inset-0 pointer-events-none z-10">
              {/* Dynamic Target tracker box 1 */}
              <div className={`hud-tracker-1 absolute top-0 left-0 w-16 h-16 border-2 border-emerald-500/80 rounded-sm`}>
                <span className={`absolute -top-3.5 left-0 bg-emerald-500 text-black font-mono font-black text-[7px] px-1 rounded uppercase tracking-wider scale-[0.8] origin-left`}>
                  CROWD_DENSE_{selectedCamera.crowdCount}
                </span>
                {/* Crosshair */}
                <div className={`absolute inset-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 border border-emerald-500/40 rounded-full`} />
              </div>

              {/* Dynamic Target tracker box 2 */}
              <div className="hud-tracker-2 absolute top-0 left-0 w-20 h-12 border border-blue-500/70 rounded">
                <span className="absolute -bottom-3.5 left-0 bg-blue-500 text-white font-mono font-extrabold text-[7px] px-1 rounded scale-[0.8] origin-left uppercase">
                  FLOW_SPD_{selectedCamera.flowRate}
                </span>
              </div>

              {/* Status and Lens Reticle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-white/10 rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-red-500/50 rounded-full" />
              </div>
            </div>

            {/* Simulated Live visual status banner */}
            <div className="absolute inset-x-0 bottom-12 flex items-center justify-center pointer-events-none z-10">
              <div className="text-center px-4 py-1.5 rounded bg-black/60 border border-white/5 backdrop-blur-xs">
                <span className="text-[9px] font-mono tracking-widest text-white/40 block">AI DETECT MODULE ACTIVATED</span>
                {selectedCamera.status === 'Alert' ? (
                  <span className="text-[11px] font-mono font-black text-red-500 animate-pulse block uppercase mt-0.5 tracking-wider">⚠️ DANGER: INCIDENT ON SITE</span>
                ) : selectedCamera.status === 'Congested' ? (
                  <span className="text-[11px] font-mono font-black text-amber-400 animate-pulse block uppercase mt-0.5 tracking-wider">⚠️ ALERT: HEAVY CONGESTION</span>
                ) : (
                  <span className="text-[11px] font-mono font-black text-emerald-400 block uppercase mt-0.5 tracking-wider">● SYSTEM STREAM ONLINE</span>
                )}
              </div>
            </div>

            {/* Bottom details and real time clock */}
            <div className="flex justify-between items-end z-10 text-[9px] font-mono text-slate-300 bg-black/60 p-1.5 rounded border border-white/5 backdrop-blur-xs">
              <span className="flex items-center gap-1 font-bold">
                CROWD: <span className="text-emerald-400">{selectedCamera.crowdCount}</span>
              </span>
              <span className="flex items-center gap-1 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                REC <Clock className="h-2.5 w-2.5 ml-1 inline-block animate-pulse text-red-500" /> {realTime}
              </span>
            </div>
          </div>

          {/* AI Vision Log translation box */}
          <div className="mt-3 bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-start gap-2.5">
            <Brain className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">AI CCTV Vision Analysis:</span>
              <p className="text-[11px] text-slate-300 leading-relaxed mt-1 italic">
                {getAiAnalysisText()}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-component: Mini charts section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col shadow-lg gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Gate Scanning Speeds (1hr Rate)</h4>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ticketingChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" stroke="#475569" fontSize={9} />
                  <YAxis stroke="#475569" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: '10px' }} />
                  <Area type="monotone" dataKey="rate" stroke="#6366f1" fill="#6366f1" fillOpacity={0.1} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Concession Stand Wait Times</h4>
            <div className="h-[120px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={concessionChartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#475569" fontSize={8} />
                  <YAxis stroke="#475569" fontSize={9} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', fontSize: '10px' }} />
                  <Bar dataKey="wait" fill="#10b981" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Active Incident Reports & Dispatching Console (Middle Panel) */}
      <div className="lg:col-span-4 flex flex-col gap-5">
        
        {/* Ground Incident Reports */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col shadow-lg flex-1 min-h-[300px]">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-semibold text-xs text-slate-200 tracking-tight uppercase">GROUND REPORT FEED</h4>
            <span className="bg-slate-950 px-2 py-0.5 rounded text-[10px] text-slate-400 font-mono">
              TOTAL: {state.incidents.length}
            </span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[290px] pr-1 flex-1">
            {state.incidents.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <CheckCircle2 className="h-10 w-10 text-slate-700 mx-auto mb-2" />
                <span className="text-xs">No active incident reports log.</span>
              </div>
            ) : (
              state.incidents.map((incident) => {
                const isSelected = selectedIncident?.id === incident.id;
                const severityColors = 
                  incident.severity === 'Critical' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                  incident.severity === 'High' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                  incident.severity === 'Medium' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                  'bg-slate-500/10 border-slate-500/30 text-slate-400';

                return (
                  <div
                    key={incident.id}
                    onClick={() => onSelectIncident(incident)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-slate-800 border-indigo-500 shadow-indigo-500/10' 
                        : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-950/90'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-white truncate max-w-[170px]">{incident.title}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${severityColors}`}>
                        {incident.severity}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                      <span>📍 {incident.location}</span>
                      <span>•</span>
                      <span className="capitalize">{incident.status}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Incident Details & Ground Dispatch Box */}
          {selectedIncident && (
            <div className="mt-4 border-t border-slate-800 pt-3 flex flex-col gap-3">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3.5 text-left">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">INSPECTING INCIDENT LOG</span>
                  <button 
                    onClick={() => onSelectIncident(null)} 
                    className="text-slate-400 hover:text-white text-[10px] font-mono"
                  >
                    CLOSE
                  </button>
                </div>
                
                <h5 className="font-extrabold text-xs text-white uppercase">{selectedIncident.title}</h5>

                <div className="space-y-2.5 text-[11px] leading-relaxed">
                  {/* 1. What happened */}
                  <div className="border-l-2 border-indigo-500 pl-2">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase font-mono">1. WHAT HAPPENED:</span>
                    <p className="text-slate-300 italic">"{selectedIncident.description}"</p>
                  </div>

                  {/* 2. Why it happened */}
                  <div className="border-l-2 border-amber-500 pl-2">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase font-mono">2. WHY IT HAPPENED:</span>
                    <p className="text-slate-300">
                      {selectedIncident.category === 'Security' ? 'Unplanned perimeter grouping or localized friction at entrance corridors leading to bottlenecking.' :
                       selectedIncident.category === 'Medical' ? 'Elevated relative humidity coupled with intense match-day exertion and physical heat stress.' :
                       selectedIncident.category === 'CrowdControl' ? 'Simultaneous spectator arrival patterns converging on a single entry/exit choke point.' :
                       selectedIncident.category === 'Maintenance' ? 'System mechanical fatigue and valve/electrical load limits under peak event capacity.' :
                       'Rapid micro-climate fluctuation, sudden rain ingress, or pressure shifts.'}
                    </p>
                  </div>

                  {/* 3. Recommended Action */}
                  <div className="border-l-2 border-blue-500 pl-2">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase font-mono">3. RECOMMENDED PROTOCOL:</span>
                    <p className="text-blue-300 bg-blue-950/10 p-2 rounded border border-blue-900/30 mt-0.5">
                      {selectedIncident.aiSuggestedFix}
                    </p>
                  </div>

                  {/* 4. Expected Outcome */}
                  <div className="border-l-2 border-emerald-500 pl-2">
                    <span className="text-[9px] font-bold text-slate-400 block uppercase font-mono">4. EXPECTED OUTCOME:</span>
                    <p className="text-slate-300">
                      {selectedIncident.category === 'Security' ? 'Full de-escalation of gate tension and resumption of steady spectator scanning in 8 minutes.' :
                       selectedIncident.category === 'Medical' ? 'Immediate vital stabilization, rapid AED positioning, and safe paramedic ambulance transport.' :
                       selectedIncident.category === 'CrowdControl' ? 'Orderly multi-gate spectator redistribution and bottleneck resolution.' :
                       selectedIncident.category === 'Maintenance' ? 'Complete hardware repair, system pressure stabilization, and hazard elimination.' :
                       'Safe roof deployment and dynamic environmental hazard mitigation.'}
                    </p>
                  </div>
                </div>

                {/* Emergency Commander Escalation Action */}
                <button
                  onClick={() => handleTriggerEmergency(selectedIncident)}
                  className="w-full bg-red-950/40 hover:bg-red-900/40 border border-red-500/40 text-red-400 hover:text-red-300 font-bold text-[10px] uppercase py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-red-950/30 font-mono tracking-wider"
                >
                  <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                  Escalate to Emergency AI Commander
                </button>
              </div>

              {/* Ground Dispatch */}
              {selectedIncident.status === 'Reported' ? (
                <div className="flex flex-col gap-3">
                  {/* AI AUTO-DISPATCH SUGGESTION CARD */}
                  {(() => {
                    const sugg = getAutoDispatchSuggestion(selectedIncident, state.staff);
                    if (!sugg) return null;
                    const { member, distance, roleMatches } = sugg;
                    const etaMins = Math.max(1, Math.round(distance * 0.08));
                    
                    return (
                      <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-3 text-left space-y-2 relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-indigo-500/10 text-indigo-400 font-mono text-[8px] px-2 py-0.5 rounded-bl font-extrabold tracking-widest uppercase flex items-center gap-1">
                          <Sparkles className="h-2.5 w-2.5" /> AI Recommended
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${member.status === 'Idle' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
                          <span className="font-extrabold text-xs text-white">{member.name}</span>
                          <span className="text-[9px] text-slate-400 font-mono">({member.role})</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
                          <div>
                            <span className="text-slate-500 block text-[8px] uppercase font-mono">GPS Delta</span>
                            <span className="font-mono font-bold text-slate-200">
                              {distance.toFixed(1)}m radial
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[8px] uppercase font-mono">Est. ETA</span>
                            <span className="font-mono font-bold text-emerald-400">
                              ~{etaMins} {etaMins === 1 ? 'min' : 'mins'}
                            </span>
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-400 leading-normal italic pt-0.5">
                          "{member.name} is {member.status === 'Idle' ? 'on active standby (Idle)' : 'On Break'} and is physically the closest qualified {roleMatches ? `${member.role} officer` : 'agent'} to {selectedIncident.location}."
                        </p>

                        <button
                          onClick={() => handleDispatchStaff(member.id)}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-extrabold text-[10px] uppercase py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 shadow-md shadow-indigo-950/50 cursor-pointer"
                        >
                          <Sparkles className="h-3 w-3 text-emerald-300" />
                          Auto-Dispatch {member.name.split(' ')[0]} Now
                        </button>
                      </div>
                    );
                  })()}

                  <span className="text-[10px] font-mono text-slate-500 uppercase block">ALL STANDBY FIELD FORCES:</span>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                    {state.staff
                      .filter(s => s.status === 'Idle')
                      .map((staff) => (
                        <div key={staff.id} className="flex justify-between items-center bg-slate-950/60 p-2 rounded border border-slate-800 text-[11px]">
                          <div>
                            <span className="font-medium text-slate-200 block">{staff.name}</span>
                            <span className="text-[9px] text-slate-400 uppercase">{staff.role} • STANDBY</span>
                          </div>
                          <button
                            onClick={() => handleDispatchStaff(staff.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] px-2 py-1 rounded cursor-pointer"
                          >
                            Dispatch
                          </button>
                        </div>
                      ))}
                    {state.staff.filter(s => s.status === 'Idle').length === 0 && (
                      <span className="text-[10px] text-red-400 italic">No field staff members are currently on standby.</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 p-2 rounded border border-slate-800 flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">Dispatched Team:</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <UserCheck2 className="h-3.5 w-3.5" /> 
                    {state.staff.find(s => s.id === selectedIncident.assignedStaffId)?.name || 'Ground Unit'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SECTION 4: AI Ops Agent Intelligence Chat (Right Panel) */}
      <div className="lg:col-span-3 flex flex-col gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col shadow-lg h-[500px]">
          <div className="flex flex-col gap-2 border-b border-slate-800 pb-2 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Brain className="h-4.5 w-4.5 text-indigo-400" />
                <h4 className="font-semibold text-xs text-slate-200 tracking-tight uppercase">OPS INTEL CENTER</h4>
              </div>
              <select
                value={selectedModel}
                onChange={(e: any) => setSelectedModel(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-[10px] text-indigo-400 font-bold px-1.5 py-0.5 rounded focus:outline-none"
              >
                <option value="gemini-3.1-flash-lite">Flash (General)</option>
                <option value="gemini-3.1-pro-preview">Pro (Deep Intel)</option>
                <option value="gemini-3.1-flash-lite">Lite (Fast Tasks)</option>
              </select>
            </div>

            {/* Grounding and Voice Controls Toolbar */}
            <div className="flex items-center justify-between gap-1.5 pt-1">
              <div className="flex gap-2">
                <label className="flex items-center gap-1 text-[9px] text-slate-400 cursor-pointer hover:text-white select-none">
                  <input
                    type="checkbox"
                    checked={useSearchGrounding}
                    onChange={(e) => setUseSearchGrounding(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 h-3 w-3"
                  />
                  <span>🌐 Search</span>
                </label>
                <label className="flex items-center gap-1 text-[9px] text-slate-400 cursor-pointer hover:text-white select-none">
                  <input
                    type="checkbox"
                    checked={useMapsGrounding}
                    onChange={(e) => setUseMapsGrounding(e.target.checked)}
                    className="rounded border-slate-800 bg-slate-950 text-indigo-600 focus:ring-0 h-3 w-3"
                  />
                  <span>🗺️ Maps</span>
                </label>
              </div>

              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors ${
                  voiceEnabled 
                    ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400' 
                    : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
                title="Toggle real-time speech responses"
              >
                <Volume2 className="h-3 w-3" />
                <span>{voiceEnabled ? 'Voice: On' : 'Voice: Off'}</span>
              </button>
            </div>
          </div>

          {/* Messages scrollarea */}
          <div className="flex-1 overflow-y-auto space-y-3 mb-3 pr-1 text-xs">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${
                  msg.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {msg.sender === 'agent' && (
                  <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider mb-0.5">
                    {msg.agentName}
                  </span>
                )}
                <div 
                  className={`p-2.5 rounded-lg max-w-[90%] leading-relaxed ${
                    msg.sender === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-slate-950 border border-slate-800 text-slate-300 rounded-tl-none'
                  }`}
                >
                  {msg.text}

                  {/* Render Search & Maps Grounding Chunk references if present */}
                  {msg.sender === 'agent' && msg.chunks && msg.chunks.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-slate-800/80 text-[9px] text-slate-400 space-y-1">
                      <span className="font-bold uppercase font-mono block">Grounding Resources:</span>
                      {msg.chunks.map((chunk: any, ci: number) => {
                        const title = chunk.web?.title || chunk.maps?.title || `Resource #${ci + 1}`;
                        const uri = chunk.web?.uri || chunk.maps?.uri;
                        if (!uri) return null;
                        return (
                          <a 
                            key={ci} 
                            href={uri} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="block hover:text-indigo-400 truncate text-indigo-500 underline"
                          >
                            🔗 {title}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[9px] text-slate-500 font-mono">{msg.timestamp}</span>
                  {msg.sender === 'agent' && (
                    <button
                      onClick={() => {
                        fetch('/api/gemini/voice-assistant', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ prompt: msg.text, voiceName: 'Charon' })
                        })
                        .then(r => r.json())
                        .then(d => {
                          if (d.audioBase64) playPcmAudio(d.audioBase64);
                        });
                      }}
                      className="text-[9px] text-slate-500 hover:text-indigo-400 flex items-center gap-0.5"
                      title="Speak response"
                    >
                      <Volume2 className="h-2.5 w-2.5" />
                      <span>Speak</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loadingChat && (
              <div className="flex items-center gap-1 text-[10px] text-slate-500 italic animate-pulse pl-1">
                <Brain className="h-3 w-3 animate-spin text-indigo-400" />
                Ops Agent is compiling telemetry...
              </div>
            )}
          </div>

          {/* Send Input form */}
          <form onSubmit={handleSendMessage} className="flex gap-1.5 border-t border-slate-800 pt-3">
            <button
              type="button"
              onClick={startDictation}
              className={`p-2 rounded-lg border transition-colors ${
                isDictating 
                  ? 'bg-red-950/60 border-red-500/40 text-red-400 animate-pulse' 
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Dictate message"
            >
              <Mic className="h-4 w-4" />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask Ops Agent for advice..."
              disabled={loadingChat}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-2 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={loadingChat || !inputText.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-lg transition-colors flex items-center justify-center disabled:opacity-40 disabled:hover:bg-indigo-600"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>

        {/* Emergency Broadcast Panel */}
        <div className="bg-red-950/20 border border-red-900/50 rounded-xl p-4 flex flex-col shadow-lg shadow-red-900/10 mt-2">
          <div className="flex items-center gap-2 border-b border-red-900/30 pb-2 mb-3">
            <Radio className="h-4 w-4 text-red-500 animate-pulse" />
            <h3 className="font-bold text-sm text-red-400">Emergency Broadcast</h3>
          </div>
          <p className="text-[10px] text-red-300/70 mb-3 uppercase font-mono">
            Push urgent notification to Fan App simulator
          </p>
          <div className="flex flex-col gap-2">
            <textarea
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              placeholder="Enter emergency message..."
              className="bg-slate-950 border border-red-900/50 rounded-lg text-xs px-3 py-2 text-slate-200 placeholder-red-900/50 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 resize-none h-20"
            />
            <button
              onClick={handleSendBroadcast}
              disabled={!broadcastText.trim()}
              className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Megaphone className="h-4 w-4" />
              Broadcast to Fans
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
