import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { ActiveSessionPage } from './pages/ActiveSessionPage';
import { HistoryPage } from './pages/HistoryPage';
import { SessionDetailPage } from './pages/SessionDetailPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthPage } from './pages/AuthPage';
import { ConfirmationPopup } from './popup/ConfirmationPopup';
import { ToastContainer } from './components/ToastContainer';
import { useAuthStore } from './stores/auth.store';
import { useAuthEvents } from './hooks/useAuthEvents';
import { SplashScreen } from './components/SplashScreen';

const SPLASH_MIN_MS = 3200;
const SPLASH_EXIT_MS = 580;

function App() {
  const { isAuthenticated, isInitialized, checkAuth } = useAuthStore();
  const [splashDone, setSplashDone] = useState(false);
  const [splashLeaving, setSplashLeaving] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  useAuthEvents();

  // Forward main-process debug logs to DevTools console (Ctrl+Shift+I)
  useEffect(() => {
    return window.electronAPI.debug.onLog((level, message) => {
      if (level === 'error') console.error('[Main]', message);
      else if (level === 'warn') console.warn('[Main]', message);
      else console.log('[Main]', message);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSplashDone(true), SPLASH_MIN_MS);
    checkAuth();
    return () => clearTimeout(timer);
  }, [checkAuth]);

  // Effect 1 — mulai animasi exit saat kedua kondisi terpenuhi
  useEffect(() => {
    if (!isInitialized || !splashDone) return;
    setSplashLeaving(true);
  }, [isInitialized, splashDone]);

  // Effect 2 — unmount splash setelah animasi exit selesai
  // Dipisah agar cleanup Effect 1 tidak membatalkan timer ini
  useEffect(() => {
    if (!splashLeaving) return;
    const timer = setTimeout(() => setSplashVisible(false), SPLASH_EXIT_MS);
    return () => clearTimeout(timer);
  }, [splashLeaving]);

  return (
    <>
      {/* Konten di-render di balik splash segera setelah auth diketahui.
          Splash overlay menutupinya, lalu fade-out menyingkap konten yang sudah siap. */}
      {isInitialized && (
        isAuthenticated ? (
          <>
            <ToastContainer />
            <HashRouter>
              <Routes>
                <Route element={<MainLayout />}>
                  <Route index element={<ActiveSessionPage />} />
                  <Route path="history" element={<HistoryPage />} />
                  <Route path="history/:sessionId" element={<SessionDetailPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
              <ConfirmationPopup />
            </HashRouter>
          </>
        ) : (
          <>
            <ToastContainer />
            <AuthPage />
          </>
        )
      )}

      {/* Splash sebagai fixed overlay — fade-out menyingkap konten di bawahnya */}
      {splashVisible && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: splashLeaving ? 'none' : 'auto' }}>
          <SplashScreen isLeaving={splashLeaving} />
        </div>
      )}
    </>
  );
}

export default App;
