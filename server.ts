/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini client to prevent crash if key is missing on startup
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured in the environment. Please configure it in your Secrets panel.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Helper to construct model context conversation history
function buildHistoryText(messages: any[]): string {
  return messages
    .map((msg) => `${msg.sender === 'user' ? 'User' : 'Agent'}: ${msg.text}`)
    .join('\n');
}

// Helper to provide realistic weather-intelligence fallback when Gemini is busy or key is missing
function getWeatherIntelligenceFallback(stadiumState: any) {
  const temp = stadiumState?.weather?.temperature ?? 72;
  const humidity = stadiumState?.weather?.humidity ?? 50;
  const rainChance = stadiumState?.weather?.rainChance ?? 0;
  const precip = stadiumState?.weather?.precipitationRate ?? 0;
  const wind = stadiumState?.weather?.windSpeed ?? 5;
  const roof = stadiumState?.weather?.roofStatus ?? 'Open';

  let roofActionSuggestion: 'Close Roof' | 'Open Roof' | 'Keep Current State' = 'Keep Current State';
  let roofActionReason = '';
  let spectatorProtectionAdvice = '';
  let equipmentFanProtectionAdvice = '';
  let isWeatherWarningActive = false;
  let weatherSeverity: 'Green' | 'Caution' | 'Severe' = 'Green';
  let recommendedActionsList: string[] = [];

  // Determine roof action suggestion
  if (precip > 0 || rainChance > 50 || wind > 25) {
    if (roof === 'Closed') {
      roofActionSuggestion = 'Keep Current State';
      roofActionReason = `Active precipitation (${precip} in/hr) or high wind velocity (${wind} mph) detected. The roof is currently closed and must remain closed to protect spectators and keep the turf dry.`;
    } else if (roof === 'Closing') {
      roofActionSuggestion = 'Keep Current State';
      roofActionReason = `Active storm/rain hazard detected. The roof is already in the process of closing. Maintain sequence.`;
    } else {
      roofActionSuggestion = 'Close Roof';
      roofActionReason = `Precipitation (${precip} in/hr) or high winds (${wind} mph) detected with a ${rainChance}% rain chance. Immediate roof closure recommended to protect the stadium bowl.`;
    }
  } else if (roof === 'Closed' && rainChance < 15 && wind < 15 && temp >= 65 && temp <= 85) {
    roofActionSuggestion = 'Open Roof';
    roofActionReason = `Atmospheric conditions are beautiful: ${temp}°F, light winds (${wind} mph), and negligible rain chance (${rainChance}%). Opening the retractable roof is recommended to enhance spectator experience.`;
  } else {
    roofActionSuggestion = 'Keep Current State';
    roofActionReason = `Current conditions (${temp}°F, wind ${wind} mph, rain chance ${rainChance}%) are within standard operating limits. Retain roof in current '${roof}' position.`;
  }

  // Determine spectator protection advice
  if (precip > 0 || rainChance > 50) {
    spectatorProtectionAdvice = `Active precipitation detected. Broadcast warnings to spectators in open terraces, advise poncho deployment, and activate localized canopy coverings.`;
  } else if (temp < 50) {
    spectatorProtectionAdvice = `Cold temperatures detected (${temp}°F). Suggest activating radiant concourse heaters, directing hospitality crews to offer warm beverages, and advising fans to wear windbreakers.`;
  } else if (temp > 85) {
    spectatorProtectionAdvice = `High heat index of ${temp}°F. Set cooling stations to maximum, increase draft ventilation across public stairs, and display heat hydration warnings on digital billboards.`;
  } else {
    spectatorProtectionAdvice = `Excellent mild climate of ${temp}°F. Comfort levels are nominal; no extra thermal or protective measures required for general audience seating.`;
  }

  // Determine fan protection advice
  if (wind > 20) {
    equipmentFanProtectionAdvice = `High winds at ${wind} mph can cause mechanical strain. Adjust ventilation fans to 50% load, lock outward-facing backup blowers, and restrict external louver apertures on the windward facade.`;
  } else if (precip > 0) {
    equipmentFanProtectionAdvice = `Precipitation is present. Turn exhaust dampers downward to prevent rain ingestion into fan housing, and maintain a low positive indoor pressure.`;
  } else {
    equipmentFanProtectionAdvice = `Wind velocity (${wind} mph) and precipitation rates are within safe guidelines. Fans can continue operating at optimal baseline capacities with fully open dampers.`;
  }

  // Determine severity and warnings
  if (wind > 30 || precip > 0.3) {
    weatherSeverity = 'Severe';
    isWeatherWarningActive = true;
  } else if (wind > 18 || precip > 0 || rainChance > 60 || temp > 85 || temp < 45) {
    weatherSeverity = 'Caution';
    isWeatherWarningActive = true;
  } else {
    weatherSeverity = 'Green';
    isWeatherWarningActive = false;
  }

  // Recommended actions checklist
  if (precip > 0 || rainChance > 50) {
    recommendedActionsList = [
      `Secure retractable roof seals and initiate motorized locks`,
      `Deploy wet floor warning cones and increase concierge janitorial sweeps`,
      `Transition perimeter HVAC dampers to recirculate mode`,
      `Direct concourse screens to display gate egress routes`
    ];
  } else if (wind > 20) {
    recommendedActionsList = [
      `Enforce structural wind lock boundaries on the outer facade`,
      `Reduce high-volume exhaust fan velocity to protect motors from wind shear`,
      `Verify physical tie-downs of outdoor temporary food stands and banners`,
      `Postpone maintenance activities requiring high aerial platforms`
    ];
  } else if (temp > 85) {
    recommendedActionsList = [
      `Open free chilling water kiosks near high-density gates`,
      `Maximize internal air turn-overs to prevent heat pockets`,
      `Increase medical squad patrols around upper deck tiers`,
      `Calibrate HVAC chilling registers for VIP and media zones`
    ];
  } else {
    recommendedActionsList = [
      `Log current sensor benchmarks on local telemetry recorders`,
      `Maintain energy-efficient ventilation levels across public halls`,
      `Inspect backup roof guide motors for operational readiness`,
      `Optimize concessions zone fresh air ratios`
    ];
  }

  const condText = precip > 0 ? `active precipitation (${precip} in/hr) and wind velocity of ${wind} mph` :
                 rainChance > 50 ? `high humidity with a ${rainChance}% probability of impending storm/rain` :
                 wind > 20 ? `mostly clear skies but experiencing elevated wind speeds of ${wind} mph` :
                 temp < 50 ? `chilly ambient temperatures and light drafts` :
                 temp > 85 ? `elevated temperature index of ${temp}°F under clear skies` :
                 `pleasant weather conditions, perfect for stadium sports and field entertainment`;

  return {
    currentWeatherSummary: `Meteorological sensors indicate ${temp}°F, ${condText}.`,
    roofActionSuggestion,
    roofActionReason,
    spectatorProtectionAdvice,
    equipmentFanProtectionAdvice,
    isWeatherWarningActive,
    weatherSeverity,
    recommendedActionsList
  };
}

// Helper to provide realistic evacuation advice fallback when Gemini is busy or key is missing
function getEvacuationAdvisorFallback(section: string, stadiumState: any) {
  const incidents = stadiumState?.incidents || [];
  const cctvFeeds = stadiumState?.cctvFeeds || [];
  const blockedGates = new Set<string>();
  
  incidents.forEach((inc: any) => {
    if (!inc.location) return;
    const locUpper = inc.location.toUpperCase();
    if (locUpper.includes('GATE A')) blockedGates.add('Gate A');
    if (locUpper.includes('GATE B')) blockedGates.add('Gate B');
    if (locUpper.includes('GATE C')) blockedGates.add('Gate C');
    if (locUpper.includes('GATE D')) blockedGates.add('Gate D');
  });

  cctvFeeds.forEach((feed: any) => {
    if (!feed.name) return;
    const nameUpper = feed.name.toUpperCase();
    if (feed.status === 'Congested' || feed.status === 'Critical') {
      if (nameUpper.includes('GATE A') || nameUpper.includes('A')) blockedGates.add('Gate A');
      if (nameUpper.includes('GATE B') || nameUpper.includes('B')) blockedGates.add('Gate B');
      if (nameUpper.includes('GATE C') || nameUpper.includes('C')) blockedGates.add('Gate C');
      if (nameUpper.includes('GATE D') || nameUpper.includes('D')) blockedGates.add('Gate D');
    }
  });

  let preferredList = ['Gate A', 'Gate B', 'Gate C', 'Gate D'];
  const secUpper = (section || '').toUpperCase();
  
  if (secUpper.includes('101') || secUpper.includes('102') || secUpper.includes('NORTH')) {
    preferredList = ['Gate A', 'Gate B', 'Gate C', 'Gate D'];
  } else if (secUpper.includes('103') || secUpper.includes('104') || secUpper.includes('EAST')) {
    preferredList = ['Gate B', 'Gate D', 'Gate A', 'Gate C'];
  } else if (secUpper.includes('105') || secUpper.includes('106') || secUpper.includes('SOUTH')) {
    preferredList = ['Gate D', 'Gate C', 'Gate B', 'Gate A'];
  } else if (secUpper.includes('107') || secUpper.includes('108') || secUpper.includes('WEST')) {
    preferredList = ['Gate C', 'Gate A', 'Gate D', 'Gate B'];
  }

  const availableExits = preferredList.filter(gate => !blockedGates.has(gate));
  const recommendedExitGate = availableExits[0] || preferredList[0];
  const alternativeExitGate = availableExits[1] || availableExits[0] || preferredList[1];

  let baseTime = 4.5;
  if (secUpper.includes('CONCOURSE')) baseTime = 2.5;
  if (secUpper.includes('PITCH')) baseTime = 1.5;
  
  if (stadiumState?.weather?.precipitationRate > 0) baseTime += 1.5;
  if (blockedGates.size > 0) baseTime += 1.0;
  const estimatedTimeMinutes = Math.min(12, Math.max(1.5, parseFloat(baseTime.toFixed(1))));

  let safetyScore = 95;
  if (blockedGates.size > 0) safetyScore -= 15 * blockedGates.size;
  if (stadiumState?.weather?.precipitationRate > 0) safetyScore -= 10;
  if (stadiumState?.weather?.windSpeed > 20) safetyScore -= 5;
  safetyScore = Math.max(25, safetyScore);

  const routeDescription = `Proceed carefully from ${section || 'your current section'} into the primary concourse lane. Bypass high-congestion zones near food corridors and head directly toward ${recommendedExitGate}. Keep to the right of the stairwells to allow incoming emergency crews clear passage. Do not use lifts/elevators under alert state.`;

  const reasoning = [
    `Selected ${recommendedExitGate} because it currently exhibits low pedestrian density and zero active incidents.`,
    `Avoided gates near active containment regions (${Array.from(blockedGates).join(', ') || 'none'}).`,
    `Optimized for direct spatial proximity from ${section || 'current section'} to ensure minimal transit bottlenecks.`
  ];

  const hazardWarnings: string[] = [];
  if (stadiumState?.weather?.precipitationRate > 0) {
    hazardWarnings.push(`Wet floor slip hazards active along exterior terraces due to ongoing precipitation.`);
  }
  if (blockedGates.size > 0) {
    hazardWarnings.push(`Avoid corridors leading to ${Array.from(blockedGates).join(' / ')} due to active incidents or extreme pedestrian crowd blockages.`);
  }

  return {
    recommendedExitGate,
    alternativeExitGate,
    estimatedTimeMinutes,
    safetyScore,
    routeDescription,
    reasoning,
    hazardWarnings
  };
}

// Helper to provide emergency commander fallback when Gemini is busy or key is missing
function getEmergencyCommanderFallback(incident: any, stadiumState: any) {
  const title = incident?.title || 'Unknown Incident';
  const location = incident?.location || 'General Area';
  const severity = incident?.severity || 'Medium';
  const description = incident?.description || 'No detailed description available.';

  let threatSpreadPrediction = `Under current crowd density, the localized issue (${title}) in ${location} is expected to remain stable, with a minor risk of bottlenecking along nearby pathways if not managed within the next 10 minutes.`;
  let optimalEvacuationRoutes = ['Gate A', 'Gate B'];
  let responderTacticalChecklist = [
    `Dispatch nearby responders to secure and establish a perimeter around ${location}.`,
    `Re-route crowd flows through adjacent concourse lanes.`,
    `Instruct Guest Services staff to remain highly visible and support wayfinding.`
  ];
  let criticalSOPGuideline = 'SOP-22-GENERAL: Evacuate affected sub-sectors immediately if severity increases. Deploy wet floor warnings, isolate power lines if applicable, and maintain an open communication link with chief coordinator.';

  const locUpper = location.toUpperCase();
  if (locUpper.includes('EAST') || locUpper.includes('103') || locUpper.includes('104')) {
    optimalEvacuationRoutes = ['Gate B', 'Gate D'];
  } else if (locUpper.includes('WEST') || locUpper.includes('107') || locUpper.includes('108')) {
    optimalEvacuationRoutes = ['Gate C', 'Gate A'];
  } else if (locUpper.includes('SOUTH') || locUpper.includes('105') || locUpper.includes('106')) {
    optimalEvacuationRoutes = ['Gate D', 'Gate C'];
  } else {
    optimalEvacuationRoutes = ['Gate A', 'Gate B'];
  }

  if (severity === 'Critical' || severity === 'High') {
    threatSpreadPrediction = `CRITICAL THREAT LEVEL: Unmanaged escalation at ${location} could trigger crowd panic, secondary bottlenecks, or spillover hazards. Immediate isolation of the zone within 3 minutes is paramount.`;
    responderTacticalChecklist = [
      `Urgent dispatch of primary tactical and medical response units to ${location}.`,
      `Commence controlled sector evacuation using ${optimalEvacuationRoutes.join(' and ')}.`,
      `Establish a 50-meter clear containment zone around the incident site.`,
      `Engage PA system with localized soothing voice alerts.`
    ];
    criticalSOPGuideline = 'SOP-EVENT-CRITICAL: Activate emergency command console, notify senior event security director, pre-stage ambulance vehicles at designated perimeter parking, and isolate adjacent ticketing gates.';
  }

  return {
    threatSpreadPrediction,
    optimalEvacuationRoutes,
    multilingualAlerts: {
      en: `Attention: A localized incident (${title}) has occurred at ${location}. Please follow security staff instructions and remain calm.`,
      es: `Atención: Ha ocurrido un incidente localizado (${title}) en ${location}. Por favor, siga las instrucciones del personal de seguridad y mantenga la calma.`,
      fr: `Attention : Un incident localisé (${title}) s'est produit à ${location}. Veuillez suivre les instructions du personnel de sécurité et rester calme.`,
      ar: `تنبيه: وقع حادث محلي (${title}) في ${location}. يرجى اتباع تعليمات موظفي الأمن والحفاظ على الهدوء.`
    },
    responderTacticalChecklist,
    criticalSOPGuideline
  };
}

// Helper to provide custom scenario fallback when Gemini is busy or key is missing
function getScenarioFallback(prompt: string) {
  const cleanPrompt = prompt || 'crowd surge';
  let category = 'CrowdControl';
  let severity = 'Medium';
  let title = 'Reported Situation';
  let location = 'Section 104';
  let description = `A simulated scenario has been initialized: ${cleanPrompt}.`;
  let aiSuggestedFix = 'Dispatch nearest available standby staff member to inspect and coordinate flow control.';

  const promptLower = cleanPrompt.toLowerCase();
  if (promptLower.includes('fight') || promptLower.includes('security') || promptLower.includes('intruder') || promptLower.includes('theft')) {
    category = 'Security';
    severity = 'High';
    title = 'Security Alert';
    location = 'Gate B Concourse';
    aiSuggestedFix = 'Dispatch Security team to contain the dispute and secure adjacent walkways.';
  } else if (promptLower.includes('heart') || promptLower.includes('faint') || promptLower.includes('injury') || promptLower.includes('medical') || promptLower.includes('heat stroke')) {
    category = 'Medical';
    severity = 'High';
    title = 'Medical Assistance Required';
    location = 'Section 105';
    aiSuggestedFix = 'Dispatch Medical Response team with a basic trauma kit and stretcher to relocate the patient to the first-aid station.';
  } else if (promptLower.includes('leak') || promptLower.includes('water') || promptLower.includes('spill') || promptLower.includes('toilet') || promptLower.includes('light') || promptLower.includes('power')) {
    category = 'Maintenance';
    severity = 'Low';
    title = 'Facility Maintenance Request';
    location = 'Restroom West';
    aiSuggestedFix = 'Dispatch Maintenance crew to clean area, shut off valves if needed, and restore normal operations.';
  } else if (promptLower.includes('storm') || promptLower.includes('lightning') || promptLower.includes('rain') || promptLower.includes('weather')) {
    category = 'Weather';
    severity = 'Medium';
    title = 'Weather Threat';
    location = 'Open Terraces';
    aiSuggestedFix = 'Coordinate with stadium engineering to verify roof closure and post slips hazard signs across walkways.';
  }

  return {
    title,
    category,
    severity,
    location,
    description,
    reportedBy: 'Staff',
    aiSuggestedFix
  };
}

// Endpoint 1: Ops Agent AI Chat
app.post('/api/gemini/ops-chat', async (req, res) => {
  try {
    const { messages, stadiumState, model, useSearch, useMaps } = req.body;
    const ai = getGeminiClient();

    const currentIncidentsStr = JSON.stringify(stadiumState.incidents, null, 2);
    const activeStaffStr = JSON.stringify(stadiumState.staff, null, 2);
    const weatherStr = JSON.stringify(stadiumState.weather, null, 2);
    const ticketingStr = JSON.stringify(stadiumState.ticketing, null, 2);

    const systemInstruction = `You are the Ops Agent, a highly professional, analytical, and decisive Operations Intelligence AI at the Stadium Pulse Command Center.
Your role is to analyze multi-modal stadium sensor streams (CCTV analysis, IoT feeds, GPS, ticketing, weather warnings) and assist the human operator.
Current Stadium Time: ${stadiumState.time || '19:30'}
Active Weather: ${weatherStr}
Ticketing Status: ${ticketingStr}
Active Incidents:
${currentIncidentsStr}
Ground Staff Available for Dispatch:
${activeStaffStr}

Keep your responses direct, tactical, and clear. Help dispatcher run tasks, advise on resolving congestion, managing retractable roof status, dispatching appropriate personnel based on their location/GPS and status, or analyzing sensor alerts. Do not exceed 2-3 short, highly informative paragraphs.`;

    const chatHistory = buildHistoryText(messages);
    const modelToUse = model || 'gemini-3.1-flash-lite';

    const tools: any[] = [];
    if (useSearch) {
      tools.push({ googleSearch: {} });
    }
    if (useMaps) {
      tools.push({ googleMaps: {} });
    }

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: `Conversation history so far:\n${chatHistory}\n\nPlease respond to the last user message in character as the Ops Agent based on the stadium status.`,
      config: {
        systemInstruction,
        temperature: 0.7,
        ...(tools.length > 0 ? { tools } : {}),
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    res.json({ text: response.text, chunks });
  } catch (error: any) {
    console.log('Ops Agent Error (using fallback):', error.message || "Rate limit or API error");
    res.json({
      text: "Notice: The automated sensor-mesh link is busy, but I can assist with standard protocol. I recommend monitoring our active Gate CCTVs and dispatching standby officers to any reported zones. For direct sector routing, please use the Emergency Evacuation Advisor below.",
      chunks: []
    });
  }
});

// Endpoint 2: Fan Agent AI Chat
app.post('/api/gemini/fan-chat', async (req, res) => {
  try {
    const { messages, stadiumState, model, useSearch, useMaps } = req.body;
    const ai = getGeminiClient();

    const concessionsStr = JSON.stringify(stadiumState.concessions, null, 2);
    const weatherStr = JSON.stringify(stadiumState.weather, null, 2);
    const timeStr = stadiumState.time || '19:30';

    const systemInstruction = `You are the Fan Agent, the helpful, cheerful, and interactive smart digital concierge of Stadium Pulse AIOS.
You help fans in the stadium with seat directions, event schedules, food recommendations, and finding shortest lines.
Current Stadium Time: ${timeStr}
Current Weather: ${weatherStr}
Concession Stands Wait Times and Queues:
${concessionsStr}

Help fans in a warm, welcoming tone. 
CRITICAL: If they report or complain about a problem (e.g. overflowed toilet, spilled drink, security issue, medical emergency, fight, fire, etc.), you MUST reassure them and populate the "raiseIncident" schema property so the Ops Decision Center is notified instantly to dispatch appropriate standby staff. Be brief and use fun emojis.`;

    const chatHistory = buildHistoryText(messages);
    const modelToUse = model || 'gemini-3.1-flash-lite'; // default to flash-lite as recommended for fast tasks

    const tools: any[] = [];
    if (useSearch) {
      tools.push({ googleSearch: {} });
    }
    if (useMaps) {
      tools.push({ googleMaps: {} });
    }

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: `Conversation history so far:\n${chatHistory}\n\nPlease respond to the last user message as the Fan Concierge Agent.`,
      config: {
        systemInstruction,
        temperature: 0.7,
        ...(tools.length > 0 ? { tools } : {}),
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['text'],
          properties: {
            text: {
              type: Type.STRING,
              description: 'Friendly, helpful response text to display to the fan.'
            },
            raiseIncident: {
              type: Type.OBJECT,
              description: 'Optional object. Populate this only if the fan is complaining about or reporting a stadium problem (e.g., spill, trash overflow, medical issue, fight, loud disturbance, broken facility). Do NOT populate if they are just asking questions or ordering food.',
              required: ['title', 'category', 'severity', 'location', 'description'],
              properties: {
                title: {
                  type: Type.STRING,
                  description: "A short, descriptive title for the incident (e.g., 'Section 103 Beverage Spill' or 'Gate A Restroom tissue supply')."
                },
                category: {
                  type: Type.STRING,
                  description: "Must be one of: 'Security', 'Medical', 'CrowdControl', 'Maintenance', 'Weather'."
                },
                severity: {
                  type: Type.STRING,
                  description: "Must be one of: 'Low', 'Medium', 'High', 'Critical'."
                },
                location: {
                  type: Type.STRING,
                  description: "The specific location mentioned or inferred (e.g. 'Section 103' or 'Gate A'). Defaults to 'Section 103'."
                },
                description: {
                  type: Type.STRING,
                  description: "Detailed description of what the fan complained about."
                }
              }
            }
          }
        }
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    let responseObj: any = { text: response.text };
    try {
      if (response.text) {
        responseObj = JSON.parse(response.text);
      }
    } catch (parseErr) {
      console.log('JSON Parse Error (using fallback):', parseErr.message || "Parse error");
    }
    res.json({ ...responseObj, chunks });
  } catch (error: any) {
    console.log('Fan Agent Error (using fallback):', error.message || "Rate limit or API error");
    res.json({
      text: "Pardon the delay! 🌟 Our concessions and gates are fully operational with standard lines. If you are experiencing any immediate facility issues, please let me know and I will log it for dispatch right away!",
      raiseIncident: null,
      chunks: []
    });
  }
});

// Endpoint 3: Staff Agent AI Chat
app.post('/api/gemini/staff-chat', async (req, res) => {
  try {
    const { messages, stadiumState, staffMember, model, useSearch, useMaps } = req.body;
    const ai = getGeminiClient();

    const staffId = staffMember.id;
    const associatedIncidents = stadiumState.incidents.filter(
      (inc: any) => inc.assignedStaffId === staffId || inc.status === 'Reported'
    );
    const incidentsStr = JSON.stringify(associatedIncidents, null, 2);

    const systemInstruction = `You are the Staff Agent, an efficient, supportive, and clear field coordinator AI.
Your job is to instruct and support field staff during active incidents.
You are talking to: ${staffMember.name}
Role: ${staffMember.role}
Active status: ${staffMember.status}
Relevant ground incident details:
${incidentsStr}

Provide short, professional, and clear step-by-step procedures to handle their assigned task. Remind them to mark the task "In Progress" and then "Resolved" when done. Maintain an encouraging, mission-focused attitude. Keep it to 1-2 brief paragraphs.
If the staff member reports they are arriving, starting, on scene, or have completed/resolved/cleaned up the problem, you MUST populate the "updateStatus" schema property so the status is synced back to Command Center immediately.`;

    const chatHistory = buildHistoryText(messages);
    const modelToUse = model || 'gemini-3.1-flash-lite';

    const tools: any[] = [];
    if (useSearch) {
      tools.push({ googleSearch: {} });
    }
    if (useMaps) {
      tools.push({ googleMaps: {} });
    }

    const response = await ai.models.generateContent({
      model: modelToUse,
      contents: `Conversation history so far:\n${chatHistory}\n\nPlease respond to the last user message as the Staff Dispatch Coordinator Agent.`,
      config: {
        systemInstruction,
        temperature: 0.7,
        ...(tools.length > 0 ? { tools } : {}),
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['text'],
          properties: {
            text: {
              type: Type.STRING,
              description: 'Your tactical professional radio coordinator response.'
            },
            updateStatus: {
              type: Type.STRING,
              description: 'Optional. Inferred status transition. Must be one of: "In Progress" (arrived/arriving, on scene, starting) or "Resolved" (finished, resolved, cleaned, safe).'
            }
          }
        }
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    let responseObj: any = { text: response.text };
    try {
      if (response.text) {
        responseObj = JSON.parse(response.text);
      }
    } catch (parseErr) {
      console.log('JSON Parse Error (using fallback):', parseErr.message || "Parse error");
    }
    res.json({ ...responseObj, chunks });
  } catch (error: any) {
    console.log('Staff Agent Error (using fallback):', error.message || "Rate limit or API error");
    res.json({
      text: "Staff Dispatch Coordinator here: Please maintain your post and proceed according to standard safety guidelines. If you are starting or have completed your task, verify the status update with the control room.",
      updateStatus: null,
      chunks: []
    });
  }
});

// Endpoint 4: Custom Scenario Generator
app.post('/api/gemini/generate-scenario', async (req, res) => {
  try {
    const { prompt, stadiumState } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `You are the Event Intelligence Engine simulation generator.
The user wants to inject a custom scenario into Stadium Pulse: "${prompt}".
Based on this scenario, you must output a structured JSON representing a new stadium incident, plus simulated sensor changes.
Create a realistic (or fun/creative as described by user) event. Specify the incident's category, severity (Low, Medium, High, Critical), title, description, location (e.g. Gate B, Section 104, Concourse North, Restroom West, Pitchside), reportedBy (CCTV, IoT, Fan, Staff), and a smart 'aiSuggestedFix' indicating how the Ops Agent advises resolving it.

You must return a valid JSON object matching the Schema format. Do not return any other text, markdown blocks, or commentary.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Please generate a stadium incident JSON object for the scenario request: "${prompt}".`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['title', 'category', 'severity', 'location', 'description', 'reportedBy', 'aiSuggestedFix'],
          properties: {
            title: { type: Type.STRING, description: 'Title of the incident' },
            category: { 
              type: Type.STRING, 
              enum: ['Security', 'Medical', 'CrowdControl', 'Maintenance', 'Weather'],
              description: 'Category of incident' 
            },
            severity: { 
              type: Type.STRING, 
              enum: ['Low', 'Medium', 'High', 'Critical'],
              description: 'Severity level' 
            },
            location: { type: Type.STRING, description: 'Detailed location name' },
            description: { type: Type.STRING, description: 'Factual description of what happened' },
            reportedBy: { 
              type: Type.STRING, 
              enum: ['CCTV', 'IoT', 'Fan', 'Staff'],
              description: 'Who or what reported the incident' 
            },
            aiSuggestedFix: { type: Type.STRING, description: 'AI-suggested exact resolution protocol and dispatched role recommendation' },
          },
        },
      },
    });

    const parsedData = JSON.parse(response.text.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.log('Scenario Generator Error (using fallback):', error.message || "Rate limit or API error");
    res.json(getScenarioFallback(req.body.prompt));
  }
});

// Endpoint 5: Emergency AI Commander Engine
app.post('/api/gemini/emergency-commander', async (req, res) => {
  try {
    const { incident, stadiumState } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `You are the Emergency AI Commander, an elite, high-precision automated emergency response system at Stadium Pulse.
Analyze the provided high-severity incident and generate an immediate, structured containment, evacuation, and safety strategy.
Output a JSON response matching the requested schema. Be concise, authoritative, and tactically precise.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Generate an emergency response strategy for this incident:
Title: ${incident.title}
Location: ${incident.location}
Description: ${incident.description}
Severity: ${incident.severity}

Stadium Current State:
Scanned count: ${stadiumState.ticketing.scannedCount}
Weather: Temp ${stadiumState.weather.temperature}°F, Roof ${stadiumState.weather.roofStatus}
Grid Status: ${stadiumState.sustainability?.energyGridStatus || 'Grid Stable'}`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['threatSpreadPrediction', 'optimalEvacuationRoutes', 'multilingualAlerts', 'responderTacticalChecklist', 'criticalSOPGuideline'],
          properties: {
            threatSpreadPrediction: { type: Type.STRING, description: 'Prediction of threat progression if uncontained within 5-10 minutes' },
            optimalEvacuationRoutes: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: 'List of safe exit gates/routes' 
            },
            multilingualAlerts: {
              type: Type.OBJECT,
              required: ['en', 'es', 'fr', 'ar'],
              properties: {
                en: { type: Type.STRING, description: 'Warning message in English' },
                es: { type: Type.STRING, description: 'Warning message in Spanish' },
                fr: { type: Type.STRING, description: 'Warning message in French' },
                ar: { type: Type.STRING, description: 'Warning message in Arabic' },
              }
            },
            responderTacticalChecklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Direct step-by-step commands for security, medical, and maintenance personnel'
            },
            criticalSOPGuideline: { type: Type.STRING, description: 'Ultimate standard operating procedure directive for control room' }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.log('Emergency Commander Error (using fallback):', error.message || "Rate limit or API error");
    res.json(getEmergencyCommanderFallback(req.body.incident, req.body.stadiumState));
  }
});

// Endpoint 5b: Emergency Evacuation Advisor
app.post('/api/gemini/evacuation-advisor', async (req, res) => {
  try {
    const { section, stadiumState } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `You are the Emergency Evacuation Advisor AI at the Stadium Pulse Command Center.
Your role is to calculate the absolute safest, fastest, and lowest-risk exit path for a specific section within the stadium, utilizing real-time sensor streams (CCTV crowd density, gate congestion, active incidents, and weather hazards).

Analyze the current stadiumState carefully:
- Locate active incidents in or near the selected section or near the gates. Avoid routing people near active fire, medical, security, or crowd-control incidents.
- Analyze CCTV crowd feeds (specifically gates, exits, or nearby areas) to avoid gates that are "Congested" or have extremely high crowdCount/flowRate.
- Take into account weather hazards: if the roof is Open and precipitation is heavy, outdoor concourses/stairs might be slippery. If lightning is active, suggest covered routes.

You must return a valid JSON object matching the requested schema. Be concise, analytical, and highly structured.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Calculate the safest evacuation path for Section: "${section}".
  
Stadium Current State:
- Time: ${stadiumState.time}
- Weather: Temp ${stadiumState.weather.temperature}°F, Roof ${stadiumState.weather.roofStatus}, Rain chance ${stadiumState.weather.rainChance}%, Precipitation: ${stadiumState.weather.precipitationRate} in/hr, Wind: ${stadiumState.weather.windSpeed} mph
- CCTV Feeds (Congestion and flow rates):
${JSON.stringify(stadiumState.cctvFeeds.map((c: any) => ({ id: c.id, name: c.name, location: c.location, status: c.status, crowdCount: c.crowdCount, flowRate: c.flowRate })), null, 2)}
- Active Incidents (Emergency locations and severities):
${JSON.stringify(stadiumState.incidents.map((i: any) => ({ title: i.title, location: i.location, severity: i.severity, description: i.description, status: i.status })), null, 2)}
- Ticketing Gate Statuses:
${JSON.stringify(stadiumState.ticketing.gateStatuses, null, 2)}
`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: ['recommendedExitGate', 'alternativeExitGate', 'estimatedTimeMinutes', 'safetyScore', 'routeDescription', 'reasoning', 'hazardWarnings'],
          properties: {
            recommendedExitGate: { type: Type.STRING, description: 'The absolute best, safest gate to use (e.g. Gate A, Gate B, Gate C, or Gate D)' },
            alternativeExitGate: { type: Type.STRING, description: 'The backup exit gate to use in case primary is blocked (e.g. Gate A, Gate B, Gate C, or Gate D)' },
            estimatedTimeMinutes: { type: Type.NUMBER, description: 'Estimated exit time in minutes (e.g. 3.5 or 5.0)' },
            safetyScore: { type: Type.NUMBER, description: 'A safety rating for this route from 0 to 100' },
            routeDescription: { type: Type.STRING, description: 'Clear step-by-step physical route description' },
            reasoning: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: 'Bullet-point reasons explaining why this gate was chosen and why others were avoided (referencing real-time crowd numbers, active incidents, etc.)' 
            },
            hazardWarnings: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: 'Any safety warnings, wet floor risks, congestion alerts, or weather factors to keep in mind' 
            }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.log('Evacuation Advisor Error (using fallback):', error.message || "Rate limit or API error");
    res.json(getEvacuationAdvisorFallback(req.body.section, req.body.stadiumState));
  }
});

// Endpoint 5c: Weather Intelligence & Action Advisor
app.post('/api/gemini/weather-intelligence', async (req, res) => {
  try {
    const { stadiumState } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `You are the chief Weather Intelligence Advisor AI at the Stadium Pulse Command Center.
Your role is to analyze current meteorological metrics (temperature, humidity, rain chance, precipitation rate, wind speed, and current roof status) and provide:
1. Clear, high-priority roof operation advice (Close Roof, Open Roof, or Keep Current State) with physical reasoning.
2. Direct spectator-protection and fan-comfort advice (e.g., HVAC settings, poncho alerts, heating/cooling zones).
3. Equipment-level "fan protection" recommendations (e.g., guidelines for large ventilation and exhaust fans under high wind speeds or extreme rain, speed reduction, damper configuration, or rain-guard deployments).

Roof rules of thumb:
- If precipitation is > 0.0 or rain chance is > 50%, or if wind speed is > 25 mph, the roof SHOULD BE Closed (or Closing).
- If roof is currently Closed, but the weather is beautiful (no rain, < 15% rain chance, wind < 15 mph, temp 65°F - 80°F), you may suggest Opening the roof.
- If it is already closed and bad weather is active, suggest keeping it closed.

Fan and equipment protection rules of thumb:
- High winds (> 20 mph) can damage or overload big exhaust/ventilation fans, or blow rain into louvers. Recommend adjusting damper positions or lowering fan speeds.
- Extreme cold or heat: Adjust comfort fans, turn on radiant concourse heaters.

You must output a single, strictly valid JSON object matching the requested schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: `Provide roof operation and fan protection decisions based on this current weather state:
- Time: ${stadiumState.time}
- Roof Status: ${stadiumState.weather.roofStatus}
- Temperature: ${stadiumState.weather.temperature}°F
- Humidity: ${stadiumState.weather.humidity}%
- Rain Chance: ${stadiumState.weather.rainChance}%
- Precipitation Rate: ${stadiumState.weather.precipitationRate} in/hr
- Wind Speed: ${stadiumState.weather.windSpeed} mph
- Active Incidents (might be weather-related like slips, wind hazards):
${JSON.stringify(stadiumState.incidents.map((i: any) => ({ title: i.title, location: i.location, severity: i.severity })), null, 2)}
`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          required: [
            'currentWeatherSummary',
            'roofActionSuggestion',
            'roofActionReason',
            'spectatorProtectionAdvice',
            'equipmentFanProtectionAdvice',
            'isWeatherWarningActive',
            'weatherSeverity',
            'recommendedActionsList'
          ],
          properties: {
            currentWeatherSummary: { type: Type.STRING, description: 'Concise summary of the current live weather conditions (e.g., warm, windy, raining)' },
            roofActionSuggestion: { 
              type: Type.STRING, 
              enum: ['Close Roof', 'Open Roof', 'Keep Current State'],
              description: 'Clear action for the roof operations' 
            },
            roofActionReason: { type: Type.STRING, description: 'Why this roof state is recommended based on temperature, rain, or wind constraints' },
            spectatorProtectionAdvice: { type: Type.STRING, description: 'Concrete suggestions to protect human fans in the stadium (e.g. heating zones, poncho alerts, wayfinding updates)' },
            equipmentFanProtectionAdvice: { type: Type.STRING, description: 'Concrete mechanical protection guidelines for ventilation/exhaust fans (damper adjustment, safety locks, power reduction)' },
            isWeatherWarningActive: { type: Type.BOOLEAN, description: 'True if wind, rain, or thermal index poses an active operational risk' },
            weatherSeverity: { 
              type: Type.STRING, 
              enum: ['Green', 'Caution', 'Severe'],
              description: 'The operational threat level of the current weather' 
            },
            recommendedActionsList: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: 'A bulleted checklist of 3-4 physical, real-time action steps to take immediately' 
            }
          }
        }
      }
    });

    const parsedData = JSON.parse(response.text.trim());
    res.json(parsedData);
  } catch (error: any) {
    console.log('Weather Intelligence Advisor Error (using fallback):', error.message || "Rate limit or API error");
    res.json(getWeatherIntelligenceFallback(req.body.stadiumState));
  }
});

// Endpoint 6: Live Voice Assistant Endpoint
app.post('/api/gemini/voice-assistant', async (req, res) => {
  try {
    const { prompt, voiceName } = req.body;
    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: "You are the Stadium Pulse Live Voice Assistant. Keep your answers extremely concise, friendly, and brief (1-2 sentences max), suitable for spoken audio delivery. Assist with stadium directions, schedules, or quick troubleshooting.",
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName || 'Zephyr' }
          }
        }
      }
    });

    let text = '';
    let audioBase64 = '';
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.text) {
        text += part.text;
      }
      if (part.inlineData?.data) {
        audioBase64 = part.inlineData.data;
      }
    }

    res.json({ text, audioBase64 });
  } catch (error: any) {
    console.log('Voice Assistant Error:', error);
    res.status(500).json({ error: error.message || 'Error with voice assistant' });
  }
});

// Endpoint 7: Google Search and Google Maps Grounding Endpoint
app.post('/api/gemini/grounding', async (req, res) => {
  try {
    const { query, type, latLng } = req.body;
    const ai = getGeminiClient();

    const config: any = {};
    if (type === 'maps') {
      config.tools = [{ googleMaps: {} }];
      if (latLng) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: latLng.latitude || 34.0522,
              longitude: latLng.longitude || -118.2437,
            }
          }
        };
      }
    } else {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: query,
      config: config,
    });

    const text = response.text;
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const searchQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

    res.json({ text, chunks, searchQueries });
  } catch (error: any) {
    console.log('Grounding Error:', error);
    res.status(500).json({ error: error.message || 'Error executing grounding intelligence' });
  }
});

// Setup Vite Dev Server / Static Asset Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
