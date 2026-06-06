import React, { useCallback } from 'react';
import { useSummary, useGenerateSummary } from '../hooks/useSummary';
import { useNotes } from '../hooks/useNotes';
import { useSessionStore } from '../stores/session.store';
import { useUIStore } from '../stores/ui.store';
import type { LengthPreference } from '@vsnotes/shared-types';

// ============================================================================
// Length segmented control
// ============================================================================

interface LengthOption {
  value: LengthPreference;
  label: string;
}

const LENGTH_OPTIONS: LengthOption[] = [
  { value: 'short', label: 'Singkat' },
  { value: 'medium', label: 'Sedang' },
  { value: 'long', label: 'Panjang' },
];

interface LengthSelectorProps {
  value: LengthPreference;
  onChange: (value: LengthPreference) => void;
  disabled: boolean;
}

function LengthSelector({ value, onChange, disabled }: LengthSelectorProps) {
  return (
    <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
      {LENGTH_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          disabled={disabled}
          className={[
            'flex-1 px-3 py-1.5 transition-colors disabled:cursor-not-allowed',
            value === opt.value
              ? 'bg-indigo-600 text-white'
              : 'text-gray-500 hover:bg-gray-50 disabled:opacity-50',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Loading skeleton
// ============================================================================

function SummarySkeleton() {
  return (
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="h-3 bg-gray-200 rounded animate-pulse" />
      <div className="h-3 bg-gray-200 rounded animate-pulse w-5/6" />
      <div className="h-3 bg-gray-200 rounded animate-pulse w-4/5" />
      <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="mt-4 h-4 bg-gray-200 rounded animate-pulse w-1/3" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="w-4 h-4 rounded-full bg-gray-200 animate-pulse flex-shrink-0 mt-0.5" />
            <div className="h-3 bg-gray-200 rounded animate-pulse flex-1" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Empty / not-yet-generated state
// ============================================================================

interface SummaryEmptyProps {
  onGenerate: () => void;
  isGenerating: boolean;
  lengthPref: LengthPreference;
  onLengthChange: (pref: LengthPreference) => void;
  sessionCompleted: boolean;
  readOnly?: boolean;
}

function SummaryEmpty({ onGenerate, isGenerating, lengthPref, onLengthChange, sessionCompleted, readOnly }: SummaryEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-4">
      <svg className="w-12 h-12 opacity-30 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>

      {readOnly ? (
        <div>
          <p className="text-sm font-medium text-gray-500">Belum ada rangkuman</p>
          <p className="text-xs text-gray-400 mt-1">Rangkuman belum dibuat untuk sesi ini</p>
        </div>
      ) : sessionCompleted ? (
        <>
          <div>
            <p className="text-sm font-medium text-gray-600">Rangkuman belum dibuat</p>
            <p className="text-xs text-gray-400 mt-1">Pilih panjang lalu klik Generate</p>
          </div>
          <LengthSelector value={lengthPref} onChange={onLengthChange} disabled={isGenerating} />
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Membuat Rangkuman...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Generate Rangkuman
              </>
            )}
          </button>
          {isGenerating && (
            <p className="text-xs text-gray-400">Proses ini dapat memakan waktu 10â€“30 detik</p>
          )}
        </>
      ) : (
        <div>
          <p className="text-sm font-medium text-gray-500">Rangkuman akan tersedia setelah sesi selesai</p>
          <p className="text-xs text-gray-400 mt-1">Selesaikan sesi untuk generate rangkuman otomatis</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Error state
// ============================================================================

interface SummaryErrorProps {
  onRetry: () => void;
  isRetrying: boolean;
}

function SummaryError({ onRetry, isRetrying }: SummaryErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
      <svg className="w-10 h-10 text-red-400 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      <div>
        <p className="text-sm font-medium text-gray-600">Gagal membuat rangkuman</p>
        <p className="text-xs text-gray-400 mt-0.5">Periksa koneksi internet dan coba lagi</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="px-4 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {isRetrying ? 'Mencoba...' : 'Coba Lagi'}
      </button>
    </div>
  );
}

// ============================================================================
// Summary content display
// ============================================================================

interface SummaryContentProps {
  content: string;
  keyPoints: string[];
  onCopy: () => void;
  copied: boolean;
  onRegenerate: () => void;
  isRegenerating: boolean;
  lengthPref: LengthPreference;
  onLengthChange: (pref: LengthPreference) => void;
  readOnly?: boolean;
}

function SummaryContent({ content, keyPoints, onCopy, copied, onRegenerate, isRegenerating, lengthPref, onLengthChange, readOnly }: SummaryContentProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 flex-shrink-0 flex-wrap">
        {!readOnly && <LengthSelector value={lengthPref} onChange={onLengthChange} disabled={isRegenerating} />}
        <div className={`flex gap-2 ${readOnly ? '' : 'ml-auto'}`}>
          <button
            type="button"
            onClick={onCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Tersalin!
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Salin Semua
              </>
            )}
          </button>
          {!readOnly && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-indigo-600 border border-indigo-200 rounded-md hover:bg-indigo-50 disabled:opacity-50 transition-colors"
            >
              {isRegenerating ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Membuat...
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Generate Ulang
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Rangkuman prose â€” split by \n\n agar multi-paragraf tampil benar */}
        <div className="space-y-3">
          {content.split('\n\n').filter(Boolean).map((para, idx) => (
            <p key={idx} className="text-sm text-gray-700 leading-relaxed">{para}</p>
          ))}
        </div>

        {/* Key points */}
        {keyPoints.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Poin Utama</h3>
            <ul className="space-y-1.5">
              {keyPoints.map((point, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-sm text-gray-700 leading-snug">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SummaryPanel
// ============================================================================

interface SummaryPanelProps {
  sessionId?: string;
  readOnly?: boolean;
  sessionCompleted?: boolean; // override untuk historical sessions (SessionDetailPage)
}

export function SummaryPanel({ sessionId: propSessionId, readOnly = false, sessionCompleted: propSessionCompleted }: SummaryPanelProps) {
  const { sessionId: storeSessionId, status } = useSessionStore();
  const sessionId = propSessionId ?? storeSessionId;
  const { summaryLengthPref, setSummaryLengthPref } = useUIStore();

  // Gunakan prop override jika ada, fallback ke XState status (untuk sesi aktif)
  const sessionCompleted = propSessionCompleted ?? (status === 'completed');
  const summaryEnabled = !!sessionId && (readOnly ? true : sessionCompleted);

  const {
    data: summary,
    isLoading,
    isError: isFetchError,
  } = useSummary(sessionId, summaryEnabled);

  const { mutate: generateSummary, isPending: isGenerating, isError: isGenError, reset: resetGenError } = useGenerateSummary();
  const { data: notes } = useNotes(sessionId, summaryEnabled);

  const [copied, setCopied] = React.useState(false);

  const handleGenerate = useCallback(() => {
    if (!sessionId) return;
    resetGenError();
    generateSummary({ sessionId, lengthPref: summaryLengthPref });
  }, [sessionId, summaryLengthPref, generateSummary, resetGenError]);

  const handleCopy = useCallback(() => {
    if (!summary) return;

    const lines: string[] = ['RANGKUMAN', ''];
    lines.push(summary.content, '');

    if (summary.keyPoints.length > 0) {
      lines.push('POIN UTAMA');
      for (const kp of summary.keyPoints) lines.push(`â€¢ ${kp}`);
      lines.push('');
    }

    if (notes && notes.length > 0) {
      lines.push('---', 'CATATAN', '');
      const sorted = [...notes].sort((a, b) => a.timestampSec - b.timestampSec);
      const formatTs = (s: number) => {
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
        return h > 0
          ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
          : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
      };
      const autoNotes = sorted.filter((n) => n.type === 'auto');
      const manualNotes = sorted.filter((n) => n.type === 'manual');
      if (autoNotes.length > 0) {
        lines.push('[Otomatis]');
        for (const n of autoNotes) lines.push(`[${formatTs(n.timestampSec)}] ${n.text}`);
        lines.push('');
      }
      if (manualNotes.length > 0) {
        lines.push('[Manual]');
        for (const n of manualNotes) lines.push(`[${formatTs(n.timestampSec)}] ${n.text}`);
      }
    }

    const text = lines.join('\n').trimEnd();
    const doWrite = window.electronAPI?.clipboard?.write
      ? () => window.electronAPI.clipboard.write(text)
      : () => navigator.clipboard.writeText(text);

    doWrite()
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(console.error);
  }, [summary, notes]);

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-sm font-semibold text-gray-700">Rangkuman</h2>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <SummarySkeleton />
        ) : isGenError ? (
          <SummaryError onRetry={handleGenerate} isRetrying={isGenerating} />
        ) : summary ? (
          <SummaryContent
            content={summary.content}
            keyPoints={summary.keyPoints}
            onCopy={handleCopy}
            copied={copied}
            onRegenerate={handleGenerate}
            isRegenerating={isGenerating}
            lengthPref={summaryLengthPref}
            onLengthChange={setSummaryLengthPref}
            readOnly={readOnly}
          />
        ) : (
          <SummaryEmpty
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            lengthPref={summaryLengthPref}
            onLengthChange={setSummaryLengthPref}
            sessionCompleted={sessionCompleted}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
}
