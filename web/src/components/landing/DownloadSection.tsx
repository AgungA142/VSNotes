import React from 'react';
import { Download, Monitor, Apple } from 'lucide-react';
import AnimatedSection from '../shared/AnimatedSection';
import Button from '../shared/Button';
import EmailNotifyForm from './EmailNotifyForm';
import { LANDING_CONFIG } from '../../config/landing.config';

export default function DownloadSection() {
  const { windows, macos } = LANDING_CONFIG.downloads;

  return (
    <section
      id="download"
      aria-label="Download"
      className="py-20 md:py-28"
      style={{ background: 'linear-gradient(160deg, #020617 0%, #0f172a 60%, #1e1b4b 100%)' }}
    >
      <div className="max-w-4xl mx-auto px-6 md:px-12 text-center">
        <AnimatedSection animation="fade-up">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-3">Download</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Download Aplikasi
          </h2>
          <p className="text-slate-400 text-lg mb-12">
            Gratis, tanpa langganan, tanpa batasan. Install sekali, gunakan selamanya.
          </p>
        </AnimatedSection>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Windows — available */}
          <AnimatedSection animation="fade-up" delay={0.1}>
            <div className="flex flex-col gap-5 p-7 rounded-2xl bg-white/5 border border-indigo-500/30 shadow-lg shadow-indigo-900/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-white">Windows</p>
                  <p className="text-xs text-slate-400">Windows 10/11 64-bit</p>
                </div>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  Tersedia
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>v{windows.version}</span>
                <span>·</span>
                <span>{windows.fileSize}</span>
              </div>

              <Button
                as="a"
                href={windows.url}
                variant="primary"
                size="lg"
                icon={Download}
                className="w-full justify-center"
              >
                Download untuk Windows
              </Button>

              <p className="text-[11px] text-slate-600">
                File .exe — klik untuk download langsung
              </p>
            </div>
          </AnimatedSection>

          {/* macOS — not available */}
          <AnimatedSection animation="fade-up" delay={0.18}>
            <div className="flex flex-col gap-5 p-7 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-700/50 flex items-center justify-center">
                  <Apple className="w-5 h-5 text-slate-400" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-slate-300">macOS</p>
                  <p className="text-xs text-slate-500">macOS 11+</p>
                </div>
                <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-400 border border-slate-600/40">
                  Segera
                </span>
              </div>

              <p className="text-sm text-slate-400 text-left">
                Versi macOS sedang dalam pengembangan. Daftarkan email Anda untuk mendapat notifikasi saat tersedia.
              </p>

              <EmailNotifyForm />
            </div>
          </AnimatedSection>
        </div>

        {/* Install note */}
        <AnimatedSection animation="fade-up" delay={0.3} className="mt-10 text-xs text-slate-600 space-y-1">
          <p>Setelah download, jalankan installer dan ikuti petunjuk di layar.</p>
          <p>Pastikan memberikan izin screen recording dan audio capture saat diminta.</p>
        </AnimatedSection>
      </div>
    </section>
  );
}
