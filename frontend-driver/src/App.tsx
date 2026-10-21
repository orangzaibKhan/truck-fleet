import { useCallback, useEffect, useState } from 'react';
import { dict, type Lang } from './i18n';
import type { AppCtx, HomeData, Screen } from './types';
import { apiFetch, clearSession, getStoredDriver, getToken, setSession } from './auth';
import Login from './screens/Login';
import Home from './screens/Home';
import Inspection from './screens/Inspection';
import Trip from './screens/Trip';
import Chat from './screens/Chat';
import MapScreen from './screens/Map';
import Breakdown from './screens/Breakdown';
import Accident from './screens/Accident';
import History from './screens/History';
import Fuel from './screens/Fuel';
import Leaderboard from './screens/Leaderboard';
import Notifications from './screens/Notifications';
import Profile from './screens/Profile';
import BottomNav from './components/BottomNav';
import HandoverModal from './components/HandoverModal';
import InstallPrompt from './components/InstallPrompt';

const SCREENS_WITH_BOTTOM_NAV: Screen[] = ['home', 'trip', 'map', 'notifications', 'profile'];

export default function App() {
  const [lang, setLangState] = useState<Lang>('en');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [screen, setScreen] = useState<Screen>(getToken() ? 'home' : 'login');
  const [driver, setDriver] = useState(getStoredDriver());
  const [home, setHome] = useState<HomeData | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const [alert, setAlert] = useState<{ title: string; body: string; icon: string; target: Screen } | null>(null);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [unreadChat, setUnreadChat] = useState(false);

  const t = useCallback((key: string): string => {
    const entry = (dict[lang] as unknown as Record<string, unknown>)[key];
    return typeof entry === 'string' ? entry : key;
  }, [lang]);
  const tList = useCallback((key: string): readonly string[] => {
    const entry = (dict[lang] as unknown as Record<string, unknown>)[key];
    return Array.isArray(entry) ? entry : [];
  }, [lang]);
  const dir: 'ltr' | 'rtl' = lang === 'ar' ? 'rtl' : 'ltr';

  function toast(msg: string) {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, msg }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 2600);
  }

  function queueOffline() {
    setOfflineQueueCount((c) => c + 1);
    toast(t('toast_queued'));
  }

  const refreshHome = useCallback(async () => {
    if (!getToken()) return;
    try {
      const res = await apiFetch('/api/driver/home');
      if (res.ok) setHome(await res.json());
    } catch {
      /* Home screen tolerates stale/missing data - this is a best-effort refresh. */
    }
  }, []);

  useEffect(() => {
    if (driver) refreshHome();
  }, [driver, refreshHome]);

  useEffect(() => {
    document.documentElement.setAttribute('dir', dir);
    document.body.classList.toggle('lang-ar', lang === 'ar');
  }, [lang, dir]);

  function navigate(next: Screen) {
    setScreen(next);
    if (next === 'chat') setUnreadChat(false);
  }

  function handleLoggedIn(token: string, driverInfo: { driverId: string; name: string; employeeId: string }) {
    setSession(token, driverInfo);
    setDriver(driverInfo);
    navigate('home');
  }

  function logout() {
    clearSession();
    setDriver(null);
    setHome(null);
    setScreen('login');
  }

  function toggleOnline() {
    setIsOnline((prev) => {
      const next = !prev;
      if (next) {
        setOfflineQueueCount((count) => {
          if (count > 0) toast(`${t('toast_synced')} (${count})`);
          return 0;
        });
      }
      return next;
    });
  }

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  // Simulated incoming supervisor alert, matching the prototype's demo behavior.
  useEffect(() => {
    if (!driver) return;
    const timeout = setTimeout(() => {
      setAlert({ title: t('alert1_t'), body: t('alert1_b'), icon: '🔧', target: 'home' });
    }, 4000);
    return () => clearTimeout(timeout);
  }, [driver, t]);

  useEffect(() => {
    if (!alert) return;
    const timeout = setTimeout(() => setAlert(null), 4200);
    return () => clearTimeout(timeout);
  }, [alert]);

  const ctx: AppCtx = {
    lang,
    dir,
    t,
    tList,
    theme,
    toggleTheme,
    setLang: setLangState,
    navigate,
    toast,
    isOnline,
    toggleOnline,
    queueOffline,
    home,
    refreshHome,
    openHandover: () => setHandoverOpen(true),
    logout,
  };

  if (!driver) {
    return (
      <div className={`app-root ${theme === 'light' ? 'light-theme' : ''}`} dir={dir}>
        <Login ctx={ctx} onLoggedIn={handleLoggedIn} />
      </div>
    );
  }

  const showBottomNav = SCREENS_WITH_BOTTOM_NAV.includes(screen);

  return (
    <div className={`app-root ${theme === 'light' ? 'light-theme' : ''}`} dir={dir}>
      <div className={`offline-pill ${!isOnline ? 'show' : ''}`}>
        <span className="pdot" />
        <span>{t('offline_pill')}</span>
      </div>

      <div className="screens-container">
        {screen === 'home' && <Home ctx={ctx} />}
        {screen === 'inspection' && <Inspection ctx={ctx} />}
        {screen === 'trip' && <Trip ctx={ctx} unreadChat={unreadChat} />}
        {screen === 'chat' && <Chat ctx={ctx} />}
        {screen === 'map' && <MapScreen ctx={ctx} />}
        {screen === 'breakdown' && <Breakdown ctx={ctx} />}
        {screen === 'accident' && <Accident ctx={ctx} />}
        {screen === 'history' && <History ctx={ctx} />}
        {screen === 'fuel' && <Fuel ctx={ctx} />}
        {screen === 'leaderboard' && <Leaderboard ctx={ctx} />}
        {screen === 'notifications' && <Notifications ctx={ctx} />}
        {screen === 'profile' && <Profile ctx={ctx} />}
        {showBottomNav && <BottomNav ctx={ctx} current={screen} unreadChat={unreadChat} />}
      </div>

      <HandoverModal ctx={ctx} open={handoverOpen} onClose={() => setHandoverOpen(false)} />

      {alert && (
        <div className="alert-banner show" onClick={() => { navigate(alert.target); setAlert(null); }}>
          <span className="ic">{alert.icon}</span>
          <div>
            <div className="tt">{alert.title}</div>
            <div className="bd">{alert.body}</div>
          </div>
        </div>
      )}

      <div id="toastHost">
        {toasts.map((tst) => (
          <div key={tst.id} className="toast show">
            {tst.msg}
          </div>
        ))}
      </div>

      <InstallPrompt ctx={ctx} />

      {/* Demo-only control, not part of the real design - lets a reviewer exercise the
          offline-queue behavior without pulling a real network cable. */}
      <button
        onClick={toggleOnline}
        style={{
          position: 'absolute',
          bottom: showBottomNav ? 78 : 14,
          right: 14,
          zIndex: 50,
          background: isOnline ? 'var(--bg-elevated)' : 'var(--red)',
          color: isOnline ? 'var(--text-secondary)' : '#fff',
          border: '1px solid var(--border-default)',
          borderRadius: 999,
          padding: '6px 12px',
          fontSize: 11,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {isOnline ? '📶 Go Offline (demo)' : '📴 Go Online (demo)'}
      </button>
    </div>
  );
}
