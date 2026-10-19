export interface GpsPing {
  truckId: string;
  lat: number;
  lng: number;
  timestamp: string;
  engineHours: number;
  odometerKm: number;
  speedKph: number;
}

export type TripStage = 'loading' | 'loaded_travel' | 'dumping' | 'empty_travel' | 'idle' | 'signal_lost';

export interface StageSegment {
  stage: TripStage;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface TruckData {
  truckId: string;
  truckNumber: string;
  pings: GpsPing[];
  analysis: {
    segments: StageSegment[];
    tripsCount: number;
    avgCycleTimeMinutes: number | null;
    workingHours: number;
    availableHours: number;
    utilizationPct: number;
    totalDistanceKm: number;
  };
  currentStatus: 'working' | 'idle' | 'signal_lost' | 'available';
  maintenance: { totalEngineHours: number; status: 'ok' | 'due' | 'overdue' };
}
