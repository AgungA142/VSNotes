import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiClient } from '../lib/api-client';
import { useSession, useDeleteSession } from '../hooks/useSessions';
import { useToast } from '../stores/toast.store';
import { NotesPanel } from '../components/NotesPanel';
import { SummaryPanel } from '../components/SummaryPanel';

type ExportFormat = 'pdf' | 'md' | 'txt';
const TEXT_FORMATS = new Set<ExportFormat>(['md', 'txt']);

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
  if (!secs) return '—';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================================================
// Export menu
// ============================================================================

interface ExportMenuProps {
  sessionId: string;
}

function ExportMenu({ sessionId }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const toast = useToast();

  async function handleExport(format: ExportFormat) {
    setOpen(false);
    if (exporting) return;
    setExporting(format);
    try {
      const blob = await apiClient.exportSession(sessionId, format);

      const filename = `sesi-${sessionId}.${format}`;

      // Gunakan Electron save dialog jika tersedia (app sudah di-restart setelah update preload)
      if (window.electronAPI?.export?.save) {
        let content: string | Uint8Array;
        let mimeType: string;

        if (TEXT_FORMATS.has(format)) {
          content = await blob.text();
          mimeType = format === 'md' ? 'text/markdown' : 'text/plain';
        } else {
          content = new Uint8Array(await blob.arrayBuffer());
          mimeType = 'application/pdf';
        }

        const result = await window.electronAPI.export.save({ content, filename, mimeType });

        if (result.success && result.filePath) {
          toast.success(`File berhasil diekspor ke ${result.filePath}`);
        }
        // result.success === false berarti user membatalkan dialog — tidak perlu pesan error
      } else {
        // Fallback: download langsung via browser (jika preload belum di-restart)
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        toast.success(`File diekspor: ${filename}`);
      }
    } catch (err) {
      console.error('[Export] Gagal:', err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401') || msg.includes('Unauthorized')) {
        toast.error('Sesi login berakhir. Silakan login ulang.');
      } else if (msg.includes('404') || msg.includes('Not Found')) {
        toast.error('Sesi tidak ditemukan di server.');
      } else if (msg.includes('Network') || msg.includes('ECONNREFUSED')) {
        toast.error('Server tidak dapat dihubungi. Pastikan backend berjalan.');
      } else {
        toast.error(`Gagal mengekspor: ${msg.slice(0, 80)}`);
      }
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={!!exporting}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {exporting ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            {exporting === 'pdf' ? 'Membuat PDF...' : 'Mengekspor...'}
          </>
        ) : (
          <>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Ekspor
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20 min-w-[160px]">
            {([
              { fmt: 'pdf' as ExportFormat, label: 'PDF', note: '5–15 detik' },
              { fmt: 'md' as ExportFormat, label: 'Markdown', note: '.md' },
              { fmt: 'txt' as ExportFormat, label: 'Plain Text', note: '.txt' },
            ]).map(({ fmt, label, note }) => (
              <button
                key={fmt}
                type="button"
                onClick={() => handleExport(fmt)}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3"
              >
                <span className="font-medium">{label}</span>
                <span className="text-xs text-gray-400">{note}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// Session info header
// ============================================================================

interface SessionDetailHeaderProps {
  sessionId: string;
}

function SessionDetailHeader({ sessionId }: SessionDetailHeaderProps) {
  const navigate = useNavigate();
  const { data: session, isLoading } = useSession(sessionId);
  const deleteSession = useDeleteSession();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [understood, setUnderstood] = useState(false);

  function handleDeleteConfirm() {
    deleteSession.mutate(sessionId, {
      onSuccess: () => navigate('/history'),
      onSettled: () => { setConfirmDelete(false); setUnderstood(false); },
    });
  }

  return (
    <>
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 flex-shrink-0">
        {/* Back button + info */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => navigate('/history')}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Riwayat
          </button>

          <span className="text-gray-300 flex-shrink-0">/</span>

          {isLoading ? (
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
          ) : session ? (
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">
                {session.videoTitle}
              </h1>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                <span>{session.sourceApp}</span>
                <span>·</span>
                <span>{formatDate(session.startedAt)}</span>
                <span>·</span>
                <span>{formatDuration(session.durationSec)}</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
          {/* Export button — only for completed sessions */}
          {session?.status === 'completed' && (
            <ExportMenu sessionId={sessionId} />
          )}

          {/* Delete button */}
          {session && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              title="Hapus sesi"
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              aria-label="Hapus sesi"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Modal konfirmasi hapus */}
      {confirmDelete && session && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDelete(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-5">
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

            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm text-red-700">
                Yakin ingin menghapus sesi ini? Semua catatan dan rangkuman akan dihapus permanen dan
                <strong> tidak dapat dipulihkan</strong>.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer flex-shrink-0"
              />
              <span className="text-sm text-gray-600">Saya mengerti bahwa data ini tidak dapat dipulihkan</span>
            </label>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setConfirmDelete(false); setUnderstood(false); }}
                disabled={deleteSession.isPending}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={!understood || deleteSession.isPending}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteSession.isPending ? (
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
      )}
    </>
  );
}

// ============================================================================
// SessionDetailPage
// ============================================================================

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: session } = useSession(sessionId ?? null);

  if (!sessionId) return null;

  const sessionCompleted = session?.status === 'completed';

  return (
    <div className="flex flex-col h-full">
      <SessionDetailHeader sessionId={sessionId} />

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-hidden">
        <NotesPanel sessionId={sessionId} readOnly />
        <SummaryPanel sessionId={sessionId} readOnly={false} sessionCompleted={sessionCompleted} />
      </div>
    </div>
  );
}
