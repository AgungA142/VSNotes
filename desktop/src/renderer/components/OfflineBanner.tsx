import React from 'react';
import { useSyncStore } from '../stores/sync.store';
import { useAuthStore } from '../stores/auth.store';

export function OfflineBanner() {
  const isOnline = useSyncStore((s) => s.isOnline);
  const isExpiredOffline = useAuthStore((s) => s.isExpiredOffline);

  if (isOnline && !isExpiredOffline) return null;

  if (isExpiredOffline) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white text-sm">
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>Sesi Anda telah berakhir. Silakan login kembali saat online.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-sm">
      <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 6s3-6 11-6 11 6 11 6" />
        <path d="M1 6s3 6 11 6 11-6 11-6" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </svg>
      <span>Anda sedang offline. Perubahan akan disinkronkan saat koneksi pulih.</span>
    </div>
  );
}
