import type { AuthUser } from './auth';
import InstallButton from './InstallButton';

export type PageKey = 'dashboard' | 'trucks' | 'drivers' | 'reports' | 'admin' | 'settings';

const NAV_ITEMS: { key: PageKey; label: string; adminOnly?: boolean }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'trucks', label: 'Trucks' },
  { key: 'drivers', label: 'Drivers' },
  { key: 'reports', label: 'Reports' },
  { key: 'admin', label: 'Admin', adminOnly: true },
  { key: 'settings', label: 'Settings' },
];

export default function Sidebar({
  user,
  current,
  onNavigate,
  onLogout,
}: {
  user: AuthUser;
  current: PageKey;
  onNavigate: (page: PageKey) => void;
  onLogout: () => void;
}) {
  const isAdmin = user.role === 'super_admin' || user.role === 'customer_admin';

  return (
    <nav className="sidebar">
      <div style={{ padding: '0 var(--space-2)', marginBottom: 'var(--space-5)' }}>
        <div style={{ fontWeight: 650, fontSize: 15 }}>Fleet Monitor</div>
        <div className="label-sm" style={{ textTransform: 'none', marginTop: 2 }}>
          {user.email}
        </div>
      </div>

      <div className="sidebar-nav">
        {NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
          <button
            key={item.key}
            onClick={() => onNavigate(item.key)}
            className="sidebar-link"
            data-active={current === item.key}
          >
            {item.label}
          </button>
        ))}
      </div>

      <InstallButton className="sidebar-link" style={{ marginTop: 'var(--space-4)' }} />
      <button onClick={onLogout} className="sidebar-link sidebar-logout">
        Log out
      </button>
    </nav>
  );
}
