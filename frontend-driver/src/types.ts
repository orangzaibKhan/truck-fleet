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
  | 'profile';

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
