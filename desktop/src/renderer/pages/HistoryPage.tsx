import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@vsnotes/shared-types';
import { useSessions, useEndSession, useDeleteSession } from '../hooks/useSessions';

// ============================================================================
// Constants
// ============================================================================

const ITEMS_PER_PAGE = 12;

// ============================================================================
// Types
// ============================================================================

type SortField = 'date-desc' | 'date-asc' | 'duration-desc' | 'duration-asc';

interface FilterState {
  search: string;
  sourceApp: string;
  dateFrom: string;
  dateTo: string;
}

interface SessionCardProps {
  session: Session;
  onDeleteRequest: (session: Session) => void;
}

interface ConfirmDeleteModalProps {
  session: Session;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}

// ============================================================================
// Formatters
// ============================================================================

function formatDate(date: Date | string): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month} ${year}, ${h}:${m}`;
}

function formatDuration(secs?: number): string {
  if (!secs) return 'â€”';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================================================
// Source app icon â€” colored initial badge
// ============================================================================

const APP_COLORS: Record<string, string> = {
  vlc: 'bg-orange-100 text-orange-700',
  chrome: 'bg-blue-100 text-blue-700',
  firefox: 'bg-red-100 text-red-700',
  safari: 'bg-sky-100 text-sky-700',
  edge: 'bg-indigo-100 text-indigo-700',
  youtube: 'bg-red-100 text-red-700',
  netflix: 'bg-red-100 text-red-700',
};

interface SourceAppBadgeProps {
  sourceApp: string;
}

function SourceAppBadge({ sourceApp }: SourceAppBadgeProps) {
  const key = sourceApp.toLowerCase().split(' ')[0];
  const colorClass = APP_COLORS[key] ?? 'bg-gray-100 text-gray-600';
  const initial = sourceApp.charAt(0).toUpperCase();

  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${colorClass}`}
      title={sourceApp}
    >
      {initial}
    </span>
  );
}

// ============================================================================
// Session status badge
// ============================================================================

interface StatusBadgeProps {
  status: Session['status'];
}

function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<Session['status'], { label: string; cls: string }> = {
    active: { label: 'Aktif', cls: 'bg-red-100 text-red-700' },
    completed: { label: 'Selesai', cls: 'bg-green-100 text-green-700' },
    dismissed: { label: 'Diabaikan', cls: 'bg-gray-100 text-gray-500' },
  };
  const { label, cls } = config[status] ?? config.dismissed;
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

// ============================================================================
// Confirm delete modal
// ============================================================================

function ConfirmDeleteModal({ session, onConfirm, onCancel, isPending }: ConfirmDeleteModalProps) {
  const [understood, setUnderstood] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5">
        {/* Icon + title */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-gray-900">Hapus Sesi</h2>
            <p className="text-sm text-gray-500 mt-0.5 truncate">{session.videoTitle}</p>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700">
            Yakin ingin menghapus sesi ini? Semua catatan dan rangkuman akan dihapus permanen dan
            <strong> tidak dapat dipulihkan</strong>.
          </p>
        </div>

        {/* Checkbox */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer flex-shrink-0"
          />
          <span className="text-sm text-gray-600">Saya mengerti bahwa data ini tidak dapat dipulihkan</span>
        </label>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!understood || isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Menghapus...
              </>
            ) : (
              'Hapus Permanen'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Session card
// ============================================================================

function SessionCard({ session, onDeleteRequest }: SessionCardProps) {
  const navigate = useNavigate();
  const endSession = useEndSession();

  function handleEndSession(e: React.MouseEvent) {
    e.stopPropagation();
    endSession.mutate(session._id);
  }

  function handleDeleteRequest(e: React.MouseEvent) {
    e.stopPropagation();
    onDeleteRequest(session);
  }

  return (
    <div
      className="group bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-indigo-200 transition-all duration-150 cursor-pointer flex flex-col gap-3 relative"
      onClick={() => navigate(`/history/${session._id}`)}
    >
      {/* Tombol hapus â€” muncul saat hover */}
      <button
        type="button"
        onClick={handleDeleteRequest}
        title="Hapus sesi"
        className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-150 z-10"
        aria-label="Hapus sesi"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
        </svg>
      </button>

      {/* Header row */}
      <div className="flex items-start gap-3 pr-7">
        <SourceAppBadge sourceApp={session.sourceApp} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate leading-snug">
            {session.videoTitle}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">{session.sourceApp}</p>
        </div>
        <StatusBadge status={session.status} />
      </div>

      {/* Metadata row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {/* Date */}
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{formatDate(session.startedAt)}</span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{formatDuration(session.durationSec)}</span>
          </div>
        </div>

        {/* Tutup sesi â€” hanya tampil jika masih aktif */}
        {session.status === 'active' && (
          <button
            type="button"
            onClick={handleEndSession}
            disabled={endSession.isPending}
            className="flex-shrink-0 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 active:bg-red-200 rounded-lg transition-colors disabled:opacity-50"
          >
            {endSession.isPending ? 'Menutup...' : 'Tutup Sesi'}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Loading skeleton
// ============================================================================

function HistorySkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="h-3 bg-gray-200 rounded animate-pulse w-28" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Empty state
// ============================================================================

interface HistoryEmptyProps {
  isFiltered: boolean;
}

function HistoryEmpty({ isFiltered }: HistoryEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-gray-400 text-center">
      <svg className="w-14 h-14 mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="12 8 12 12 14 14" />
        <path d="M3.05 11a9 9 0 1 0 .5-4.5" />
        <polyline points="3 3 3 7 7 7" />
      </svg>
      {isFiltered ? (
        <>
          <p className="text-sm font-medium text-gray-500">Tidak ada sesi yang cocok</p>
          <p className="text-xs mt-1">Coba ubah filter atau kata kunci pencarian</p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-500">Belum ada sesi tersimpan</p>
          <p className="text-xs mt-1">Mulai menonton video untuk membuat sesi pertama</p>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Filter & sort toolbar
// ============================================================================

interface FilterToolbarProps {
  filter: FilterState;
  sort: SortField;
  sourceApps: string[];
  onFilterChange: (next: Partial<FilterState>) => void;
  onSortChange: (sort: SortField) => void;
}

function FilterToolbar({ filter, sort, sourceApps, onFilterChange, onSortChange }: FilterToolbarProps) {
  return (
    <div className="flex flex-wrap gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[180px]">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Cari judul video..."
          value={filter.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />
      </div>

      {/* Source app filter */}
      <select
        value={filter.sourceApp}
        onChange={(e) => onFilterChange({ sourceApp: e.target.value })}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
      >
        <option value="">Semua Aplikasi</option>
        {sourceApps.map((app) => (
          <option key={app} value={app}>{app}</option>
        ))}
      </select>

      {/* Date from */}
      <input
        type="date"
        value={filter.dateFrom}
        onChange={(e) => onFilterChange({ dateFrom: e.target.value })}
        title="Dari tanggal"
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
      />

      {/* Date to */}
      <input
        type="date"
        value={filter.dateTo}
        onChange={(e) => onFilterChange({ dateTo: e.target.value })}
        title="Sampai tanggal"
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
      />

      {/* Sort */}
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value as SortField)}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
      >
        <option value="date-desc">Terbaru</option>
        <option value="date-asc">Terlama</option>
        <option value="duration-desc">Durasi Terpanjang</option>
        <option value="duration-asc">Durasi Terpendek</option>
      </select>
    </div>
  );
}

// ============================================================================
// Pagination controls
// ============================================================================

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
      >
        â† Sebelumnya
      </button>

      <div className="flex gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
            acc.push(p);
            return acc;
          }, [])
          .map((p, idx) =>
            p === 'ellipsis' ? (
              <span key={`e-${idx}`} className="px-2 py-1.5 text-sm text-gray-400">â€¦</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={[
                  'min-w-[32px] px-2 py-1.5 text-sm rounded-lg transition-colors',
                  p === page
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'border border-gray-200 hover:bg-gray-50',
                ].join(' ')}
              >
                {p}
              </button>
            )
          )}
      </div>

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
      >
        Berikutnya â†’
      </button>
    </div>
  );
}

// ============================================================================
// HistoryPage
// ============================================================================

export function HistoryPage() {
  const { data: sessions, isLoading, isError } = useSessions();
  const deleteSession = useDeleteSession();

  const [filter, setFilter] = useState<FilterState>({
    search: '',
    sourceApp: '',
    dateFrom: '',
    dateTo: '',
  });
  const [sort, setSort] = useState<SortField>('date-desc');
  const [page, setPage] = useState(1);
  const [deletingSession, setDeletingSession] = useState<Session | null>(null);

  function handleDeleteConfirm() {
    if (!deletingSession) return;
    deleteSession.mutate(deletingSession._id, {
      onSettled: () => setDeletingSession(null),
    });
  }

  function handleFilterChange(next: Partial<FilterState>) {
    setFilter((prev) => ({ ...prev, ...next }));
    setPage(1); // reset ke halaman pertama saat filter berubah
  }

  function handleSortChange(nextSort: SortField) {
    setSort(nextSort);
    setPage(1);
  }

  // Daftar source app unik untuk dropdown filter
  const sourceApps = useMemo<string[]>(() => {
    if (!sessions) return [];
    return [...new Set(sessions.map((s) => s.sourceApp))].sort();
  }, [sessions]);

  // Filter + sort
  const filtered = useMemo<Session[]>(() => {
    if (!sessions) return [];

    let result = [...sessions];

    if (filter.search) {
      const q = filter.search.toLowerCase();
      result = result.filter((s) => s.videoTitle.toLowerCase().includes(q));
    }

    if (filter.sourceApp) {
      result = result.filter((s) => s.sourceApp === filter.sourceApp);
    }

    if (filter.dateFrom) {
      const from = new Date(filter.dateFrom).getTime();
      result = result.filter((s) => new Date(s.startedAt).getTime() >= from);
    }

    if (filter.dateTo) {
      const to = new Date(filter.dateTo).getTime() + 86_400_000; // inklusif hari itu
      result = result.filter((s) => new Date(s.startedAt).getTime() <= to);
    }

    result.sort((a, b) => {
      switch (sort) {
        case 'date-desc':
          return new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime();
        case 'date-asc':
          return new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime();
        case 'duration-desc':
          return (b.durationSec ?? 0) - (a.durationSec ?? 0);
        case 'duration-asc':
          return (a.durationSec ?? 0) - (b.durationSec ?? 0);
      }
    });

    return result;
  }, [sessions, filter, sort]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const isFiltered =
    !!filter.search || !!filter.sourceApp || !!filter.dateFrom || !!filter.dateTo;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Riwayat Sesi</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {sessions
                ? `${filtered.length} dari ${sessions.length} sesi`
                : 'Memuat...'}
            </p>
          </div>
        </div>

        <FilterToolbar
          filter={filter}
          sort={sort}
          sourceApps={sourceApps}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {isLoading ? (
          <HistorySkeleton />
        ) : isError ? (
          <div className="flex items-center justify-center py-20 text-sm text-red-500">
            Gagal memuat riwayat sesi
          </div>
        ) : paginated.length === 0 ? (
          <HistoryEmpty isFiltered={isFiltered} />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginated.map((session) => (
                <SessionCard
                  key={session._id}
                  session={session}
                  onDeleteRequest={setDeletingSession}
                />
              ))}
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {/* Modal konfirmasi hapus */}
      {deletingSession && (
        <ConfirmDeleteModal
          session={deletingSession}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingSession(null)}
          isPending={deleteSession.isPending}
        />
      )}
    </div>
  );
}
