import React from 'react';
import { Download } from 'lucide-react';
import Button from '../shared/Button';
import { LANDING_CONFIG } from '../../config/landing.config';

function AppLogo() {
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{
        background: 'linear-gradient(145deg, #4338ca 0%, #6d28d9 100%)',
        boxShadow: '0 0 0 1px rgba(255,255,255,.08) inset',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 52 52" fill="none">
        <rect x="3" y="10" width="46" height="30" rx="4" stroke="white" strokeWidth="1.5" strokeOpacity=".3" fill="none" />
        <path d="M21 17.5L33 25L21 32.5V17.5Z" fill="white" fillOpacity=".9" />
        <line x1="14" y1="44" x2="38" y2="44" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity=".4" />
      </svg>
    </div>
  );
}

const LINKS = [
  { label: 'Dokumentasi', href: LANDING_CONFIG.contact.docs },
  { label: 'FAQ', href: LANDING_CONFIG.contact.faq },
  { label: 'Kontak', href: `mailto:${LANDING_CONFIG.contact.email}` },
  { label: 'Privacy Policy', href: '/privacy' },
];

export default function Footer() {
  return (
    <footer
      aria-label="Footer"
      className="border-t border-white/8 py-14 md:py-16"
      style={{ background: '#020617' }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <AppLogo />
              <span className="font-bold text-white text-base">VSNotes</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              Catatan otomatis dari video yang Anda tonton — gratis, tanpa langganan.
            </p>
            <p className="text-xs text-slate-600">Aplikasi tersedia dalam Bahasa Indonesia</p>
          </div>

          {/* Links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">Tautan</p>
            <ul className="space-y-2.5">
              {LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:rounded min-h-[44px] inline-flex items-center"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Download</p>
            <p className="text-sm text-slate-400">Windows 10/11 · v{LANDING_CONFIG.downloads.windows.version}</p>
            <Button
              as="a"
              href={LANDING_CONFIG.downloads.windows.url}
              variant="primary"
              size="md"
              icon={Download}
              className="w-fit"
            >
              Download Sekarang
            </Button>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/8 flex items-center justify-center">
          <p className="text-xs text-slate-600">
            © 2026 VSNotes. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
