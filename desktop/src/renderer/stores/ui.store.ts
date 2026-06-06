/**
 * UI Store (Zustand)
 * Manages UI state: modals, sidebar, theme preferences
 * 
 * This store handles local UI state that doesn't need to be synced with main process.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LengthPreference } from '@vsnotes/shared-types';

type Theme = 'light' | 'dark' | 'system';

interface Modal {
  isOpen: boolean;
  type: 'confirmation' | 'settings' | 'export' | 'note-editor' | null;
  data?: unknown;
}

interface UIStore {
  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;

  // Sidebar
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;

  // Modal
  modal: Modal;
  openModal: (type: Modal['type'], data?: unknown) => void;
  closeModal: () => void;

  // Notes panel
  isNotesPanelOpen: boolean;
  toggleNotesPanel: () => void;
  setNotesPanelOpen: (isOpen: boolean) => void;

  // Active tab
  activeTab: 'notes' | 'summary' | 'transcript';
  setActiveTab: (tab: 'notes' | 'summary' | 'transcript') => void;

  // Summary length preference
  summaryLengthPref: LengthPreference;
  setSummaryLengthPref: (pref: LengthPreference) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      // Theme
      theme: 'system',
      setTheme: (theme) => set({ theme }),

      // Sidebar
      isSidebarOpen: true,
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),

      // Modal
      modal: { isOpen: false, type: null },
      openModal: (type, data) => set({ modal: { isOpen: true, type, data } }),
      closeModal: () => set({ modal: { isOpen: false, type: null, data: undefined } }),

      // Notes panel
      isNotesPanelOpen: false,
      toggleNotesPanel: () => set((state) => ({ isNotesPanelOpen: !state.isNotesPanelOpen })),
      setNotesPanelOpen: (isOpen) => set({ isNotesPanelOpen: isOpen }),

      // Active tab
      activeTab: 'notes',
      setActiveTab: (tab) => set({ activeTab: tab }),

      // Summary length preference
      summaryLengthPref: 'medium',
      setSummaryLengthPref: (pref) => set({ summaryLengthPref: pref }),
    }),
    {
      name: 'ui-store', // localStorage key
      partialize: (state) => ({
        theme: state.theme,
        isSidebarOpen: state.isSidebarOpen,
        activeTab: state.activeTab,
        summaryLengthPref: state.summaryLengthPref,
      }),
    }
  )
);
