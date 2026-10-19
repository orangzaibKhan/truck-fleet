import { useEffect, useState } from 'react';
import Landing from './Landing';
import Login from './Login';
import Sidebar, { type PageKey } from './Sidebar';
import Dashboard from './pages/Dashboard';
import Trucks from './pages/Trucks';
import DriversPage from './pages/Drivers';
import Reports from './pages/Reports';
import AdminPage from './pages/Admin';
import SettingsPage from './pages/Settings';
import { apiFetch, clearSession, getStoredUser, getToken, type AuthUser } from './auth';
import type { TruckData } from './types';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(() => (getToken() ? getStoredUser() : null));
  const [showLogin, setShowLogin] = useState(false);
  const [page, setPage] = useState<PageKey>('dashboard');
  const [trucks, setTrucks] = useState<TruckData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    apiFetch('/api/fleet-shift')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setTrucks(data.trucks))
      .catch(() => setError('Could not reach the backend - is it running?'));
  }, [user]);

  if (!user) {
    return showLogin ? <Login onLoggedIn={setUser} /> : <Landing onSignIn={() => setShowLogin(true)} />;
  }

  function handleLogout() {
    clearSession();
    setUser(null);
    setTrucks(null);
    setPage('dashboard');
  }

  return (
    <div className="app-shell">
      <Sidebar user={user} current={page} onNavigate={setPage} onLogout={handleLogout} />
      <main className="content">
        {error ? (
          <p>{error}</p>
        ) : !trucks ? (
          <p>Loading simulated shift...</p>
        ) : page === 'dashboard' ? (
          <Dashboard trucks={trucks} />
        ) : page === 'trucks' ? (
          <Trucks trucks={trucks} />
        ) : page === 'drivers' ? (
          <DriversPage />
        ) : page === 'reports' ? (
          <Reports trucks={trucks} />
        ) : page === 'admin' ? (
          <AdminPage currentUser={user} />
        ) : (
          <SettingsPage user={user} />
        )}
      </main>
    </div>
  );
}
