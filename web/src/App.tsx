import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import AuthenticatedApp from './pages/AuthenticatedApp';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app/*" element={<AuthenticatedApp />} />
    </Routes>
  );
}
