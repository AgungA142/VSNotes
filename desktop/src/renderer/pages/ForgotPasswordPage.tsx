import React, { useState, useRef, useEffect } from 'react';

interface ForgotPasswordPageProps {
  onBack: () => void;
}

type Status = 'idle' | 'loading' | 'success' | 'rate-limited' | 'error';

export function ForgotPasswordPage({ onBack }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  function validateEmail(value: string): string {
    if (!value.trim()) return 'Email wajib diisi';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Format email tidak valid';
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) {
      setEmailError(err);
      return;
    }
    setEmailError('');
    setStatus('loading');

    try {
      const result = await window.electronAPI.auth.forgotPassword(email.trim().toLowerCase());
      if (!result.success && result.error === 'RATE_LIMIT_EXCEEDED') {
        setStatus('rate-limited');
      } else {
        setStatus('success');
      }
    } catch {
      setErrorMessage('Terjadi kesalahan. Pastikan koneksi internet Anda aktif dan coba lagi.');
      setStatus('error');
    }
  }

  // ── Success state ────────────────────────────────────────────────────────
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <AppLogo />
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
            <div className="mx-auto mb-4 flex items-center justify-center w-12 h-12 rounded-full bg-green-100">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-2">Email Terkirim</h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-1">
              Jika email <span className="font-medium text-gray-800">{email}</span> terdaftar,
              kami telah mengirim tautan reset password.
            </p>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Periksa kotak masuk (dan folder spam) lalu klik tautan di email untuk membuat password baru.
              Tautan berlaku <span className="font-medium">15 menit</span>.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              Kembali ke Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main form state ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <AppLogo />
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100">
            <button
              type="button"
              onClick={onBack}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Kembali ke login"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-gray-700">Lupa Password</span>
          </div>

          <div className="p-6">
            <p className="text-sm text-gray-500 mb-5 leading-relaxed">
              Masukkan email akun Anda. Kami akan mengirimkan tautan untuk membuat password baru.
            </p>

            {/* Rate limit error */}
            {status === 'rate-limited' && (
              <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm text-amber-800">
                Terlalu banyak permintaan. Silakan coba lagi dalam 1 jam.
              </div>
            )}

            {/* Generic error */}
            {status === 'error' && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(validateEmail(e.target.value));
                  }}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  disabled={status === 'loading'}
                  className={`w-full px-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors disabled:opacity-60 ${
                    emailError ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
                  }`}
                />
                {emailError && (
                  <p className="mt-1 text-xs text-red-600">{emailError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {status === 'loading' ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Mengirim…
                  </span>
                ) : (
                  'Kirim Email Reset'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function AppLogo() {
  return (
    <div className="text-center mb-8">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
        <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </div>
      <h1 className="text-xl font-semibold text-gray-900">VSNotes</h1>
      <p className="text-sm text-gray-500 mt-1">Catatan otomatis dari video yang kamu tonton</p>
    </div>
  );
}
