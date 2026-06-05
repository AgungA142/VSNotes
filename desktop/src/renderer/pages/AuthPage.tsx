import React, { useState } from 'react';
import { useAuthForm } from '../hooks/useAuthForm';
import { ForgotPasswordPage } from './ForgotPasswordPage';

export function AuthPage() {
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const {
    tab,
    switchTab,
    loginData,
    setLoginData,
    loginErrors,
    registerData,
    setRegisterData,
    registerErrors,
    submitLogin,
    submitRegister,
    isLoading,
    emailInputRef,
  } = useAuthForm();

  if (showForgotPassword) {
    return <ForgotPasswordPage onBack={() => setShowForgotPassword(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 mb-4">
            <svg
              className="w-6 h-6 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">VSNotes</h1>
          <p className="text-sm text-gray-500 mt-1">Catatan otomatis dari video yang kamu tonton</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <TabButton label="Masuk" active={tab === 'login'} onClick={() => switchTab('login')} />
            <TabButton label="Daftar" active={tab === 'register'} onClick={() => switchTab('register')} />
          </div>

          <div className="p-6">
            {tab === 'login' && (
              <form onSubmit={submitLogin} noValidate className="space-y-4">
                <FormField
                  label="Email"
                  type="email"
                  value={loginData.email}
                  onChange={(v) => setLoginData((d) => ({ ...d, email: v }))}
                  error={loginErrors.email}
                  inputRef={emailInputRef}
                  autoComplete="email"
                />
                <FormField
                  label="Password"
                  type="password"
                  value={loginData.password}
                  onChange={(v) => setLoginData((d) => ({ ...d, password: v }))}
                  error={loginErrors.password}
                  autoComplete="current-password"
                />
                <SubmitButton loading={isLoading} label="Masuk" loadingLabel="Memproses…" />
                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
                  >
                    Lupa Password?
                  </button>
                </div>
              </form>
            )}

            {tab === 'register' && (
              <form onSubmit={submitRegister} noValidate className="space-y-4">
                <FormField
                  label="Nama"
                  type="text"
                  value={registerData.name}
                  onChange={(v) => setRegisterData((d) => ({ ...d, name: v }))}
                  error={registerErrors.name}
                  inputRef={emailInputRef}
                  autoComplete="name"
                />
                <FormField
                  label="Email"
                  type="email"
                  value={registerData.email}
                  onChange={(v) => setRegisterData((d) => ({ ...d, email: v }))}
                  error={registerErrors.email}
                  autoComplete="email"
                />
                <FormField
                  label="Password"
                  type="password"
                  value={registerData.password}
                  onChange={(v) => setRegisterData((d) => ({ ...d, password: v }))}
                  error={registerErrors.password}
                  hint="Min. 8 karakter, huruf kapital, dan angka/simbol"
                  autoComplete="new-password"
                />
                <FormField
                  label="Konfirmasi Password"
                  type="password"
                  value={registerData.confirmPassword}
                  onChange={(v) => setRegisterData((d) => ({ ...d, confirmPassword: v }))}
                  error={registerErrors.confirmPassword}
                  autoComplete="new-password"
                />
                <SubmitButton loading={isLoading} label="Buat Akun" loadingLabel="Memproses…" />
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TabButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function TabButton({ label, active, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 py-3 text-sm font-medium transition-colors ${
        active
          ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

interface FormFieldProps {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  autoComplete?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

function FormField({ label, type, value, onChange, error, hint, autoComplete, inputRef }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        ref={inputRef}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className={`w-full px-3 py-2 rounded-lg border text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
          error ? 'border-red-400 bg-red-50' : 'border-gray-300 bg-white'
        }`}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {!error && hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

interface SubmitButtonProps {
  loading: boolean;
  label: string;
  loadingLabel: string;
}

function SubmitButton({ loading, label, loadingLabel }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
    >
      {loading ? loadingLabel : label}
    </button>
  );
}
