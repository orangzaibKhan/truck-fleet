export type Screen =
  | 'login'
  | 'home'
  | 'inspection'
  | 'trip'
  | 'chat'
  | 'map'
  | 'breakdown'
  | 'accident'
  | 'history'
  | 'fuel'
  | 'leaderboard'
  | 'notifications'
  | 'profile'
  | 'workshop';

export interface HomeData {
  driver: { id: string; name: string; employeeId: string };
  truck: { id: string; truckNumber: string; capacityTons: number | null } | null;
  shiftActive: boolean;
  shiftId: string | null;
  shiftStartedAt: string | null;
  safetyScore: number;
  today: { trips: number; distanceKm: number };
  recentActivity: {
    lastTripCompletedAt: string | null;
    lastInspection: { createdAt: string; hasFail: boolean } | null;
  };
}

export interface HistoryData {
  score: number;
  hoursActive: number;
  trips: number;
  distanceKm: number;
  tripList: { id: string; startedAt: string; completedAt: string; distanceKm: number }[];
}

export interface LeaderboardEntry {
  rank: number;
  driverId: string;
  name: string;
  truckNumber: string | null;
  score: number;
  isMe: boolean;
}

export interface ActiveTrip {
  id: string;
  stage: 'loading' | 'traveling' | 'dumping' | 'returning' | 'completed';
  started_at: string;
}

export interface WorkshopPart {
  id: string;
  name: string;
  status: string;
  eta: string | null;
}

export interface WorkshopTicket {
  id: string;
  issue: string;
  openedAt: string;
  steps: string[];
  currentStepIndex: number;
  parts: WorkshopPart[];
}

export interface WorkshopHistoryEntry {
  id: string;
  serviceType: string;
  cost: number;
  workshopName: string;
  servicedAt: string;
}

export interface WorkshopData {
  truck: { id: string; truckNumber: string } | null;
  nextService: { type: string; dueDate: string } | null;
  ticket: WorkshopTicket | null;
  history: WorkshopHistoryEntry[];
}

/** Context passed to every screen - the app shell's shared state and actions. */
export interface AppCtx {
  lang: 'en' | 'ar';
  dir: 'ltr' | 'rtl';
  t: (key: string) => string;
  tList: (key: string) => readonly string[];
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setLang: (l: 'en' | 'ar') => void;
  navigate: (screen: Screen) => void;
  toast: (msg: string) => void;
  isOnline: boolean;
  toggleOnline: () => void;
  queueOffline: () => void;
  home: HomeData | null;
  refreshHome: () => Promise<void>;
  openHandover: () => void;
  logout: () => void;
}
