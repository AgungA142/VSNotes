import React from 'react';

export default function AuthenticatedApp() {
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">VSNotes</h1>
          <p className="text-sm text-gray-500 mt-1">Web Access</p>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 px-4">
        <p className="text-gray-600">Web app — implementation coming soon</p>
      </main>
    </div>
  );
}
