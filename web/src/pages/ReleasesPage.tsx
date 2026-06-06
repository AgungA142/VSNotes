import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Download, Calendar, Monitor } from 'lucide-react';
import PageLayout from '../components/shared/PageLayout';
import { LANDING_CONFIG } from '../config/landing.config';

interface Release {
  version: string;
  date: string;
  latest: boolean;
  platform: string;
  fileSize: string;
  url: string;
  highlights: string[];
  notes?: string;
}

const RELEASES: Release[] = [
  {
    version: '1.0.0',
    date: 'Juni 2026',
    latest: true,
    platform: 'Windows 10/11 64-bit',
    fileSize: LANDING_CONFIG.downloads.windows.fileSize,
    url: LANDING_CONFIG.downloads.windows.url,
    highlights: [
      'Deteksi video otomatis (YouTube, Netflix, VLC, dan lainnya)',
      'Transkripsi audio real-time via Gemini AI (gemini-2.0-flash)',
      'Rangkuman AI tiga pilihan panjang: Singkat, Sedang, Panjang',
      'Auto-notes pada momen penting selama rekaman berlangsung',
      'Catatan manual dengan shortcut Ctrl+Shift+N',
      'Export ke PDF, Markdown, dan TXT',
      'Sync otomatis ke cloud dengan offline queue (SQLite cache lokal)',
      'Antarmuka penuh Bahasa Indonesia',
    ],
    notes: 'Rilis pertama VSNotes. Tersedia untuk Windows — versi macOS segera hadir.',
  },
];

function ReleaseCard({ release }: { release: Release }) {
  return (
    <article className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Card header */}
      <div
        className="px-6 py-5 flex flex-wrap items-start gap-4"
        style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)' }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap mb-1">
            <span className="text-2xl font-bold text-white">v{release.version}</span>
            {release.latest && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                Rilis Terbaru
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
              {release.date}
            </span>
            <span className="flex items-center gap-1">
              <Monitor className="w-3.5 h-3.5" aria-hidden="true" />
              {release.platform}
            </span>
          </div>
        </div>

        <a
          href={release.url}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 flex-shrink-0"
          aria-label={`Download VSNotes v${release.version} untuk ${release.platform}`}
        >
          <Download className="w-4 h-4" aria-hidden="true" />
          Download
          <span className="text-indigo-300 text-xs font-normal">{release.fileSize}</span>
        </a>
      </div>

      {/* Card body */}
      <div className="px-6 py-5 bg-white">
        {release.notes && (
          <p className="text-sm text-gray-500 italic mb-4">{release.notes}</p>
        )}

        <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Yang Baru
        </h3>
        <ul className="space-y-2">
          {release.highlights.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <svg
                className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-sm text-gray-700">{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
          <span>
            File:{' '}
            <code className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
              VSNotes-Setup-{release.version}.exe
            </code>
          </span>
          <span>·</span>
          <span>{release.fileSize}</span>
        </div>
      </div>
    </article>
  );
}

export default function ReleasesPage() {
  return (
    <>
      <Helmet>
        <title>Rilis — VSNotes</title>
        <meta
          name="description"
          content="Riwayat rilis VSNotes. Download versi terbaru dan lihat changelog setiap versi."
        />
        <meta property="og:title" content="Rilis — VSNotes" />
        <meta property="og:description" content="Riwayat rilis dan changelog VSNotes." />
        <meta property="og:url" content="https://vsnotes.space/releases" />
        <link rel="canonical" href="https://vsnotes.space/releases" />
      </Helmet>

      <PageLayout
        title="Rilis"
        description="Riwayat rilis VSNotes beserta changelog dan link download"
      >
        <div className="space-y-8">
          {RELEASES.map((release) => (
            <ReleaseCard key={release.version} release={release} />
          ))}
        </div>

        <div className="mt-10 p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
          <p className="text-sm text-slate-500">
            Versi macOS sedang dalam pengembangan.{' '}
            <a href="/#download" className="text-indigo-600 hover:underline font-medium">
              Daftar notifikasi
            </a>{' '}
            untuk mendapat kabar saat tersedia.
          </p>
        </div>
      </PageLayout>
    </>
  );
}
