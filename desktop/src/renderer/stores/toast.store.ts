import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));

export function useToast() {
  const addToast = useToastStore((s) => s.addToast);

  return {
    success: (message: string, duration = 3500) =>
      addToast({ type: 'success', message, duration }),
    error: (message: string, duration = 5000) =>
      addToast({ type: 'error', message, duration }),
    warning: (message: string, duration = 4500) =>
      addToast({ type: 'warning', message, duration }),
    info: (message: string, duration = 3500) =>
      addToast({ type: 'info', message, duration }),
  };
}
