import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#020617' }}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: 'linear-gradient(145deg, #4338ca 0%, #6d28d9 100%)' }}
      >
        <svg width="24" height="24" viewBox="0 0 52 52" fill="none">
          <rect x="3" y="10" width="46" height="30" rx="4" stroke="white" strokeWidth="1.5" strokeOpacity=".3" fill="none" />
          <path d="M21 17.5L33 25L21 32.5V17.5Z" fill="white" fillOpacity=".9" />
          <line x1="14" y1="44" x2="38" y2="44" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity=".4" />
        </svg>
      </div>

      <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
      <p className="text-slate-400 text-base mb-8 max-w-xs">
        {description ?? 'Halaman ini sedang dalam pengembangan. Segera hadir.'}
      </p>

      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Kembali ke Beranda
      </Link>
    </div>
  );
}
