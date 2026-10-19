const TOKEN_KEY = 'fleet_monitor_token';
const USER_KEY = 'fleet_monitor_user';

export interface AuthUser {
  userId: string;
  customerId: string;
  email: string;
  role: 'super_admin' | 'customer_admin' | 'fleet_manager' | 'viewer';
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function setSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// VITE_API_BASE_URL is set at build time (e.g. in a deployed .env.production) -
// defaults to localhost for local dev. Empty string means "same origin"
// (useful if the backend is reverse-proxied under the same domain).
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

/** fetch wrapper that attaches the auth token and clears the session on 401. */
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
