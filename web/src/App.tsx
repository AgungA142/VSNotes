import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import AuthenticatedApp from './pages/AuthenticatedApp';

const DocsPage = lazy(() => import('./pages/DocsPage'));
const FAQPage = lazy(() => import('./pages/FAQPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const ReleasesPage = lazy(() => import('./pages/ReleasesPage'));

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/*" element={<AuthenticatedApp />} />
      <Route path="/docs" element={<Suspense fallback={<div className="min-h-screen bg-slate-950" />}><DocsPage /></Suspense>} />
      <Route path="/faq" element={<Suspense fallback={<div className="min-h-screen bg-slate-950" />}><FAQPage /></Suspense>} />
      <Route path="/privacy" element={<Suspense fallback={<div className="min-h-screen bg-slate-950" />}><PrivacyPage /></Suspense>} />
      <Route path="/releases" element={<Suspense fallback={<div className="min-h-screen bg-slate-950" />}><ReleasesPage /></Suspense>} />
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
