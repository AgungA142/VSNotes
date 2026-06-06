import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import AuthenticatedApp from './pages/AuthenticatedApp';
import { PlaceholderPage } from './pages/PlaceholderPage';

const DocsPage = lazy(() => import('./pages/DocsPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/*" element={<AuthenticatedApp />} />
      <Route path="/docs" element={<Suspense fallback={<div className="min-h-screen bg-slate-950" />}><DocsPage /></Suspense>} />
      <Route path="/faq" element={<Suspense fallback={<div className="min-h-screen bg-slate-950" />}><FAQPage /></Suspense>} />
      <Route path="/privacy" element={<PlaceholderPage title="Privacy Policy" />} />
      <Route
        path="/releases"
        element={
          <PlaceholderPage
            title="Rilis"
            description="Halaman riwayat rilis desktop app. Segera hadir."
          />
        }
      />
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
