import React, { useEffect } from 'react';
import { useToastStore, type Toast } from '../stores/toast.store';

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      aria-live="polite"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, removeToast]);

  const styles: Record<Toast['type'], string> = {
    success: 'bg-white border-green-500 text-gray-800',
    error:   'bg-white border-red-500 text-gray-800',
    warning: 'bg-white border-amber-400 text-gray-800',
    info:    'bg-white border-indigo-500 text-gray-800',
  };

  const iconColor: Record<Toast['type'], string> = {
    success: 'text-green-500',
    error:   'text-red-500',
    warning: 'text-amber-400',
    info:    'text-indigo-500',
  };

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg border-l-4 shadow-lg ${styles[toast.type]} animate-[slideIn_0.2s_ease-out]`}
    >
      <ToastIcon type={toast.type} className={`w-4 h-4 mt-0.5 flex-shrink-0 ${iconColor[toast.type]}`} />
      <p className="text-sm flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Tutup"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <path d="M1 1l12 12M13 1L1 13" />
        </svg>
      </button>
    </div>
  );
}

function ToastIcon({ type, className }: { type: Toast['type']; className: string }) {
  if (type === 'success') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    );
  }
  if (type === 'error') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  }
  if (type === 'warning') {
    return (
      <svg className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  );
}
