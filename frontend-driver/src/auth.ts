const TOKEN_KEY = 'fleet_driver_token';
const DRIVER_KEY = 'fleet_driver_info';

export interface DriverInfo {
  driverId: string;
  name: string;
  employeeId: string;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredDriver(): DriverInfo | null {
  const raw = localStorage.getItem(DRIVER_KEY);
  return raw ? (JSON.parse(raw) as DriverInfo) : null;
}

export function setSession(token: string, driver: DriverInfo): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(DRIVER_KEY, JSON.stringify(driver));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(DRIVER_KEY);
}

// Build-time configurable, same convention as the admin frontend.
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

  const res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearSession();
  }
  return res;
}
