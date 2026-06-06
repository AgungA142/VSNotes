import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { LANDING_CONFIG } from '../../config/landing.config';

function AppLogo() {
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: 'linear-gradient(145deg, #4338ca 0%, #6d28d9 100%)' }}
    >
      <svg width="16" height="16" viewBox="0 0 52 52" fill="none" aria-hidden="true">
        <rect x="3" y="10" width="46" height="30" rx="4" stroke="white" strokeWidth="1.5" strokeOpacity=".3" fill="none" />
        <path d="M21 17.5L33 25L21 32.5V17.5Z" fill="white" fillOpacity=".9" />
      </svg>
    </div>
  );
}

interface PageLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function PageLayout({ title, description, children }: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Nav */}
      <nav
        aria-label="Navigasi utama"
        className="sticky top-0 z-30 border-b border-white/8"
        style={{ background: '#020617' }}
      >
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-2.5 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:rounded"
          >
            <AppLogo />
            <span className="font-bold text-white text-sm">VSNotes</span>
          </Link>

          <div className="flex-1" />

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:rounded"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Beranda
          </Link>

          <a
            href={LANDING_CONFIG.downloads.windows.url}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Download</span>
          </a>
        </div>
      </nav>

      {/* Page hero */}
      <div
        className="py-12 md:py-16 text-center"
        style={{ background: 'linear-gradient(160deg, #020617 0%, #0f172a 60%, #1e1b4b 100%)' }}
      >
        <div className="max-w-3xl mx-auto px-6">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{title}</h1>
          {description && (
            <p className="text-slate-400 text-base md:text-lg">{description}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <main id="main-content" className="flex-1">
        <div className="max-w-3xl mx-auto px-6 py-12">
          {children}
        </div>
      </main>

      {/* Footer strip */}
      <footer className="border-t border-slate-100 py-6 text-center">
        <p className="text-xs text-slate-400">© 2026 VSNotes</p>
      </footer>
    </div>
  );
}
