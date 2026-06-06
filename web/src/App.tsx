import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import AuthenticatedApp from './pages/AuthenticatedApp';
import { PlaceholderPage } from './pages/PlaceholderPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/*" element={<AuthenticatedApp />} />
      <Route path="/docs" element={<PlaceholderPage title="Dokumentasi" />} />
      <Route path="/faq" element={<PlaceholderPage title="FAQ" />} />
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
