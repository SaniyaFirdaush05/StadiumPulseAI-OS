/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface WeatherInfo {
  temperature: number; // °F
  humidity: number; // %
  rainChance: number; // %
  precipitationRate: number; // in/hr
  windSpeed: number; // mph
  roofStatus: 'Open' | 'Closed' | 'Opening' | 'Closing';
  lat?: number;
  lon?: number;
  locationName?: string;
  isRealLive?: boolean;
}

export interface TicketingData {
  capacity: number;
  scannedCount: number;
  vipScannedCount: number;
  scanRateHistory: number[]; // ticket scans per minute (last 6 data points)
  gateStatuses: {
    [key: string]: 'Normal' | 'Congested' | 'Warning';
  };
}

export interface ConcessionStand {
  id: string;
  name: string;
  category: 'Food' | 'Drinks' | 'Merch';
  location: string;
  queueLength: number;
  avgWaitMinutes: number;
  staffCount: number;
}

export interface IoTSensor {
  id: string;
  name: string;
  location: string;
  type: 'TrashCan' | 'RestroomSupply' | 'SoundLevel' | 'Temperature';
  value: number; // % full, supply %, dB, °F
  status: 'Normal' | 'Warning' | 'Critical';
}

export interface CCTVFeed {
  id: string;
  name: string;
  location: string;
  status: 'Normal' | 'Alert' | 'Congested';
  feedUrl?: string;
  crowdCount: number;
  flowRate: number; // people/min
  aiAnalysis: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: 'Security' | 'Medical' | 'Janitorial' | 'Maintenance' | 'GuestServices';
  status: 'Idle' | 'Dispatched' | 'OnBreak';
  gps: { x: number; y: number }; // Percentage coords on stadium layout
  activeTaskId?: string;
  phone: string;
}

export interface Incident {
  id: string;
  title: string;
  category: 'Security' | 'Medical' | 'CrowdControl' | 'Maintenance' | 'Weather';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  location: string;
  description: string;
  status: 'Reported' | 'Assigned' | 'In Progress' | 'Resolved';
  timestamp: string;
  reportedBy: 'CCTV' | 'IoT' | 'Fan' | 'Staff';
  assignedStaffId?: string;
  aiSuggestedFix: string;
}

export interface SustainabilityMetrics {
  energyUsageKw: number;
  energyGridStatus: 'Grid Stable' | 'Backup Generator Active' | 'Spike Detected';
  waterConsumptionLiters: number;
  waterPressurePsi: number;
  wasteRecyclablePercentage: number;
  wasteGeneralBinPercentage: number;
  transportShuttlesActive: number;
  transportMetroFlowRate: number; // people/hr
  transportParkingOccupancy: number; // %
}

export interface StadiumState {
  time: string;
  eventActive: boolean;
  eventName: string;
  weather: WeatherInfo;
  ticketing: TicketingData;
  concessions: ConcessionStand[];
  sensors: IoTSensor[];
  cctvFeeds: CCTVFeed[];
  staff: StaffMember[];
  incidents: Incident[];
  sustainability: SustainabilityMetrics;
  emergencyBroadcast?: { message: string; timestamp: string } | null;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  agentName?: 'Fan Agent' | 'Ops Agent' | 'Staff Agent' | 'Emergency AI Commander';
}
