import React, { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useSessionStore } from '../stores/session.store';
import { useSyncStore } from '../stores/sync.store';
import { OfflineBanner } from '../components/OfflineBanner';
import { useSession } from '../hooks/useSession';

// ============================================================================
// Icons (inline SVG — no external dependency)
// ============================================================================

function VideoIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="12 8 12 12 14 14" />
      <path d="M3.05 11a9 9 0 1 0 .5-4.5" />
      <polyline points="3 3 3 7 7 7" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

// ============================================================================
// NavItem
// ============================================================================

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  badge?: React.ReactNode;
  end?: boolean;
}

function NavItem({ to, icon, label, collapsed, badge, end }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        [
          'flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors duration-150',
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-gray-400 hover:bg-gray-700 hover:text-white',
        ].join(' ')
      }
    >
      <span className="relative">
        {icon}
        {badge && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </span>
      {!collapsed && <span className="truncate">{label}</span>}
    </NavLink>
  );
}

// ============================================================================
// SyncStatusBar
// ============================================================================

function SyncStatusBar({ collapsed }: { collapsed: boolean }) {
  const { isOnline, isSyncing, pendingCount } = useSyncStore();

  const dotColor = isSyncing
    ? 'bg-yellow-400 animate-pulse'
    : isOnline
    ? 'bg-green-400'
    : 'bg-red-500';

  const label = isSyncing
    ? 'Menyinkron...'
    : isOnline
    ? pendingCount > 0
      ? `${pendingCount} menunggu sync`
      : 'Tersinkron'
    : 'Offline';

  return (
    <div
      className="flex items-center gap-2 px-4 py-3 border-t border-gray-700 text-xs text-gray-400"
      title={collapsed ? label : undefined}
    >
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
      {!collapsed && <span className="truncate">{label}</span>}
    </div>
  );
}

// ============================================================================
// SessionStatusBadge — shown on "Sesi Aktif" nav item
// ============================================================================

function useIsSessionActive() {
  const status = useSessionStore((s) => s.status);
  return status === 'recording' || status === 'paused';
}

// ============================================================================
// MainLayout
// ============================================================================

const COLLAPSED_KEY = 'sidebar_collapsed';

export function MainLayout() {
  // Mount IPC subscription — keeps Zustand session store in sync with XState main process
  useSession();

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const isSessionActive = useIsSessionActive();

  // Auto-collapse when window is narrow (< 768px)
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) {
        setCollapsed(true);
      }
    }
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, String(next));
      } catch {}
      return next;
    });
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={[
          'flex flex-col bg-gray-900 text-white flex-shrink-0',
          'transition-all duration-200 ease-in-out',
          collapsed ? 'w-16' : 'w-60',
        ].join(' ')}
      >
        {/* Header */}
        <div
          className={[
            'flex items-center border-b border-gray-700 h-14',
            collapsed ? 'justify-center px-0' : 'justify-between px-4',
          ].join(' ')}
        >
          {!collapsed && (
            <span className="font-bold text-sm text-white truncate tracking-wide">
              Video Notes
            </span>
          )}
          <button
            onClick={toggleCollapsed}
            className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          >
            <MenuIcon />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 space-y-0.5 overflow-y-auto">
          <NavItem
            to="/"
            end
            icon={<VideoIcon />}
            label="Sesi Aktif"
            collapsed={collapsed}
            badge={isSessionActive ? true : undefined}
          />
          <NavItem
            to="/history"
            icon={<HistoryIcon />}
            label="Riwayat"
            collapsed={collapsed}
          />
          <NavItem
            to="/settings"
            icon={<SettingsIcon />}
            label="Pengaturan"
            collapsed={collapsed}
          />
        </nav>

        {/* Sync status footer */}
        <SyncStatusBar collapsed={collapsed} />
      </aside>

      <main className="flex-1 overflow-auto min-w-0 flex flex-col">
        <OfflineBanner />
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
