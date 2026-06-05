import React from 'react';
import { useSessionStore } from '../stores/session.store';
import { NotesPanel } from '../components/NotesPanel';
import { SummaryPanel } from '../components/SummaryPanel';

// ============================================================================
// Active session header
// ============================================================================

function SessionHeader() {
  const { status, videoTitle, sourceApp, startedAt } = useSessionStore();

  const statusLabel: Record<string, string> = {
    idle: 'Menunggu video',
    recording: 'Merekam',
    paused: 'Dijeda',
    processing: 'Memproses',
    syncing: 'Menyinkron',
    done: 'Selesai',
  };

  const statusColor: Record<string, string> = {
    idle: 'bg-gray-100 text-gray-600',
    recording: 'bg-red-100 text-red-700',
    paused: 'bg-yellow-100 text-yellow-700',
    processing: 'bg-blue-100 text-blue-700',
    syncing: 'bg-indigo-100 text-indigo-700',
    done: 'bg-green-100 text-green-700',
  };

  const [, forceUpdate] = React.useState(0);
  React.useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const elapsedLabel = (() => {
    if (!startedAt) return null;
    const secs = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  })();

  const isActive = status === 'recording' || status === 'paused';

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      <div className="min-w-0">
        <h1 className="text-base font-semibold text-gray-900 truncate">
          {videoTitle ?? 'Sesi Aktif'}
        </h1>
        {sourceApp && (
          <p className="text-xs text-gray-500 mt-0.5">{sourceApp}</p>
        )}
      </div>

      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
        {elapsedLabel && (
          <span className="text-sm text-gray-500 font-mono">{elapsedLabel}</span>
        )}

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[status] ?? statusColor['idle']}`}
        >
          {status === 'recording' && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
          )}
          {statusLabel[status] ?? status}
        </span>

        {/* Pause / Resume */}
        {status === 'recording' && (
          <button
            type="button"
            onClick={() => window.electronAPI.session.pause()}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Jeda
          </button>
        )}
        {status === 'paused' && (
          <button
            type="button"
            onClick={() => window.electronAPI.session.resume()}
            className="px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors"
          >
            Lanjutkan
          </button>
        )}

        {/* End session */}
        {isActive && (
          <button
            type="button"
            onClick={() => window.electronAPI.session.end()}
            className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg transition-colors"
          >
            Akhiri Sesi
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ActiveSessionPage
// ============================================================================

export function ActiveSessionPage() {
  return (
    <div className="flex flex-col h-full">
      <SessionHeader />

      {/* Two-panel layout: notes left, summary right */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">
        <NotesPanel />
        <SummaryPanel />
      </div>
    </div>
  );
}
