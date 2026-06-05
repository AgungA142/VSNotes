/**
 * ConfirmationPopup
 * Muncul di pojok kanan bawah saat video terdeteksi, meminta konfirmasi user.
 *
 * Flow:
 * 1. Terima IPC event video:detected → tampilkan popup
 * 2. User klik "Ya" → kirim session:start → main process mulai recording
 * 3. User klik "Lewati" / timeout 15 detik → kirim session:dismiss
 * 4. Popup hilang dengan animasi exit
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { VideoDetectionInfo } from '@shared/types';

const DISMISS_TIMEOUT_SEC = 15;

// ============================================================================
// ConfirmationPopup (container + tampilan)
// ============================================================================

export function ConfirmationPopup() {
  const navigate = useNavigate();
  const [videoInfo, setVideoInfo] = useState<VideoDetectionInfo | null>(null);
  const [countdown, setCountdown] = useState(DISMISS_TIMEOUT_SEC);
  const [isVisible, setIsVisible] = useState(false);

  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (exitTimerRef.current) {
      clearTimeout(exitTimerRef.current);
      exitTimerRef.current = null;
    }
  }, []);

  // close: jalankan animasi exit lalu eksekusi aksi dan bersihkan state
  const close = useCallback(
    (action: 'confirm' | 'dismiss') => {
      clearAllTimers();
      setIsVisible(false);

      // Tunggu animasi exit (200ms) sebelum benar-benar bersihkan dan kirim IPC
      exitTimerRef.current = setTimeout(() => {
        setVideoInfo(null);
        if (action === 'confirm') {
          window.electronAPI.session.start();
          navigate('/');
        } else {
          window.electronAPI.session.dismiss();
        }
      }, 200);
    },
    [clearAllTimers]
  );

  // Subscribe ke video:detected satu kali saat mount
  useEffect(() => {
    window.electronAPI.screenMonitor.onVideoDetected((info) => {
      clearAllTimers();
      setVideoInfo(info);
      setCountdown(DISMISS_TIMEOUT_SEC);
      // requestAnimationFrame memastikan initial state (opacity-0) sudah di-paint
      // sebelum transisi ke opacity-100 dimulai
      requestAnimationFrame(() => setIsVisible(true));
    });

    return clearAllTimers;
  }, [clearAllTimers]);

  // Countdown timer — hanya berjalan saat popup tampil
  useEffect(() => {
    if (!videoInfo) return;

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          close('dismiss');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [videoInfo, close]);

  if (!videoInfo) return null;

  const progressPercent = ((DISMISS_TIMEOUT_SEC - countdown) / DISMISS_TIMEOUT_SEC) * 100;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Konfirmasi video terdeteksi"
      className={[
        'fixed bottom-6 right-6 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-100',
        'transition-all duration-200 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
      ].join(' ')}
    >
      {/* Progress bar — mengecil dari kiri ke kanan seiring countdown */}
      <div className="h-1 bg-gray-100 rounded-t-xl overflow-hidden">
        <div
          className="h-full bg-blue-500 transition-[width] duration-1000 ease-linear"
          style={{ width: `${100 - progressPercent}%` }}
        />
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
              Video Terdeteksi
            </p>
            <h3
              className="text-sm font-semibold text-gray-900 truncate leading-snug"
              title={videoInfo.windowTitle}
            >
              {videoInfo.windowTitle}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{videoInfo.appName}</p>
          </div>

          {/* Countdown badge */}
          <span className="flex-shrink-0 text-xs font-mono text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5 leading-5">
            {countdown}s
          </span>
        </div>

        {/* Source type badge */}
        <div className="mb-4">
          <span
            className={[
              'inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium',
              videoInfo.sourceType === 'streaming'
                ? 'bg-purple-50 text-purple-700'
                : 'bg-orange-50 text-orange-700',
            ].join(' ')}
          >
            {videoInfo.sourceType === 'streaming' ? '● Streaming' : '▶ Video Lokal'}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => close('confirm')}
            className={[
              'flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
              'text-white text-sm font-medium py-2 px-3 rounded-lg',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
            ].join(' ')}
          >
            Ya, buat rangkuman
          </button>
          <button
            type="button"
            onClick={() => close('dismiss')}
            className={[
              'px-3 py-2 text-sm text-gray-500 hover:text-gray-900',
              'hover:bg-gray-100 active:bg-gray-200 rounded-lg',
              'transition-colors duration-150',
              'focus:outline-none focus:ring-2 focus:ring-gray-300',
            ].join(' ')}
          >
            Lewati
          </button>
        </div>
      </div>
    </div>
  );
}
