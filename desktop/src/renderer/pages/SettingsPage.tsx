import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';

const DEFAULT_PLATFORMS = [
  'youtube', 'netflix', 'vimeo', 'twitch', 'prime video',
  'disney+', 'disney plus', 'hbo', 'hulu', 'peacock', 'apple tv',
  'udemy', 'coursera', 'edx', 'skillshare', 'linkedin learning',
  'pluralsight', 'udacity', 'khan academy',
];

// ============================================================================
// PlatformManager
// ============================================================================

function PlatformManager() {
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchPlatforms() {
      try {
        const profile = await apiClient.getMe();
        const fetched = profile?.settings?.watchPlatforms;
        if (Array.isArray(fetched) && fetched.length > 0) setPlatforms(fetched);
        else setPlatforms(DEFAULT_PLATFORMS);
      } catch {
        setPlatforms(DEFAULT_PLATFORMS);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPlatforms();
  }, []);

  const saveMutation = useMutation({
    mutationFn: (newPlatforms: string[]) =>
      apiClient.updateUserSettings({ watchPlatforms: newPlatforms }),
    onSuccess: (_data, newPlatforms) => {
      window.electronAPI.settings.updatePlatforms(newPlatforms);
    },
  });

  function handleAdd() {
    const val = inputValue.trim().toLowerCase();
    if (!val) return;
    if (val.length > 50) { setError('Nama platform terlalu panjang (maks 50 karakter)'); return; }
    if (platforms.includes(val)) { setError('Platform sudah ada dalam daftar'); return; }
    setError('');
    const updated = [...platforms, val];
    setPlatforms(updated);
    setInputValue('');
    saveMutation.mutate(updated);
    inputRef.current?.focus();
  }

  function handleRemove(platform: string) {
    if (platforms.length <= 1) { setError('Daftar platform tidak boleh kosong'); return; }
    setError('');
    const updated = platforms.filter((p) => p !== platform);
    setPlatforms(updated);
    saveMutation.mutate(updated);
  }

  function handleReset() {
    setError('');
    setPlatforms(DEFAULT_PLATFORMS);
    saveMutation.mutate(DEFAULT_PLATFORMS);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAdd();
  }

  if (isLoading) {
    return <p className="text-xs text-gray-400 py-2">Memuat daftar platform...</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 leading-relaxed">
        Aplikasi hanya mendeteksi video dari platform dalam daftar ini. Tambah platform
        dengan mengetik namanya (lowercase), misalnya: <span className="font-mono bg-gray-100 px-1 rounded">udemy</span>.
      </p>

      {/* Platform chips */}
      <div className="flex flex-wrap gap-1.5 min-h-[36px]">
        {platforms.map((platform) => (
          <span
            key={platform}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-medium border border-indigo-200"
          >
            {platform}
            <button
              onClick={() => handleRemove(platform)}
              className="ml-0.5 text-indigo-400 hover:text-indigo-700 transition-colors leading-none"
              aria-label={`Hapus ${platform}`}
            >
              ×
            </button>
          </span>
        ))}
        {platforms.length === 0 && (
          <span className="text-xs text-gray-400 py-1">Tidak ada platform terdaftar</span>
        )}
      </div>

      {/* Input tambah */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setError(''); }}
          onKeyDown={handleKeyDown}
          placeholder="Tambah platform, misal: skillshare"
          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
        <button
          onClick={handleAdd}
          disabled={!inputValue.trim()}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Tambah
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {saveMutation.isError && (
        <p className="text-xs text-red-500">Gagal menyimpan — coba lagi</p>
      )}

      {/* Reset */}
      <button
        onClick={handleReset}
        className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline"
      >
        Reset ke default
      </button>
    </div>
  );
}

// ============================================================================
// SettingsPage
// ============================================================================

export function SettingsPage() {
  const { user, logout, isLoading } = useAuthStore();
  const [confirming, setConfirming] = useState(false);

  async function handleLogout() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    await logout();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <h1 className="text-base font-semibold text-gray-900">Pengaturan</h1>
        <p className="text-xs text-gray-500 mt-0.5">Konfigurasi aplikasi dan akun</p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Platform Deteksi */}
        <section className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700">Platform Deteksi Video</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Aplikasi mendeteksi video dari platform streaming ini secara otomatis
            </p>
          </div>
          <div className="px-5 py-4">
            <PlatformManager />
          </div>
        </section>

        {/* Akun */}
        <section className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-700">Akun</h2>
          </div>

          <div className="px-5 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-700 font-semibold text-sm">
                {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name ?? '—'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email ?? '—'}</p>
            </div>
          </div>

          <div className="px-5 py-4">
            {confirming ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Yakin ingin keluar?</span>
                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  {isLoading ? 'Keluar...' : 'Ya, Keluar'}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Keluar dari Akun
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
