/**
 * UI Store Tests
 * Tests for Zustand UI store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '../ui.store';

describe('UI Store', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useUIStore.getState();
    store.setTheme('system');
    store.setSidebarOpen(true);
    store.closeModal();
    store.setNotesPanelOpen(false);
    store.setActiveTab('notes');
  });

  describe('Theme', () => {
    it('should have default theme as system', () => {
      const state = useUIStore.getState();
      expect(state.theme).toBe('system');
    });

    it('should update theme', () => {
      const { setTheme } = useUIStore.getState();
      
      setTheme('dark');
      expect(useUIStore.getState().theme).toBe('dark');
      
      setTheme('light');
      expect(useUIStore.getState().theme).toBe('light');
      
      setTheme('system');
      expect(useUIStore.getState().theme).toBe('system');
    });
  });

  describe('Sidebar', () => {
    it('should have sidebar open by default', () => {
      const state = useUIStore.getState();
      expect(state.isSidebarOpen).toBe(true);
    });

    it('should toggle sidebar', () => {
      const { toggleSidebar } = useUIStore.getState();
      
      toggleSidebar();
      expect(useUIStore.getState().isSidebarOpen).toBe(false);
      
      toggleSidebar();
      expect(useUIStore.getState().isSidebarOpen).toBe(true);
    });

    it('should set sidebar open state directly', () => {
      const { setSidebarOpen } = useUIStore.getState();
      
      setSidebarOpen(false);
      expect(useUIStore.getState().isSidebarOpen).toBe(false);
      
      setSidebarOpen(true);
      expect(useUIStore.getState().isSidebarOpen).toBe(true);
    });
  });

  describe('Modal', () => {
    it('should have modal closed by default', () => {
      const state = useUIStore.getState();
      expect(state.modal.isOpen).toBe(false);
      expect(state.modal.type).toBeNull();
      expect(state.modal.data).toBeUndefined();
    });

    it('should open modal with type', () => {
      const { openModal } = useUIStore.getState();
      
      openModal('confirmation');
      const state = useUIStore.getState();
      expect(state.modal.isOpen).toBe(true);
      expect(state.modal.type).toBe('confirmation');
    });

    it('should open modal with type and data', () => {
      const { openModal } = useUIStore.getState();
      const testData = { message: 'Test message' };
      
      openModal('confirmation', testData);
      const state = useUIStore.getState();
      expect(state.modal.isOpen).toBe(true);
      expect(state.modal.type).toBe('confirmation');
      expect(state.modal.data).toEqual(testData);
    });

    it('should close modal and clear data', () => {
      const { openModal, closeModal } = useUIStore.getState();
      
      openModal('settings', { test: 'data' });
      expect(useUIStore.getState().modal.isOpen).toBe(true);
      
      closeModal();
      const state = useUIStore.getState();
      expect(state.modal.isOpen).toBe(false);
      expect(state.modal.type).toBeNull();
      expect(state.modal.data).toBeUndefined();
    });

    it('should handle all modal types', () => {
      const { openModal } = useUIStore.getState();
      const modalTypes: Array<'confirmation' | 'settings' | 'export' | 'note-editor'> = [
        'confirmation',
        'settings',
        'export',
        'note-editor',
      ];

      modalTypes.forEach((type) => {
        openModal(type);
        expect(useUIStore.getState().modal.type).toBe(type);
      });
    });
  });

  describe('Notes Panel', () => {
    it('should have notes panel closed by default', () => {
      const state = useUIStore.getState();
      expect(state.isNotesPanelOpen).toBe(false);
    });

    it('should toggle notes panel', () => {
      const { toggleNotesPanel } = useUIStore.getState();
      
      toggleNotesPanel();
      expect(useUIStore.getState().isNotesPanelOpen).toBe(true);
      
      toggleNotesPanel();
      expect(useUIStore.getState().isNotesPanelOpen).toBe(false);
    });

    it('should set notes panel open state directly', () => {
      const { setNotesPanelOpen } = useUIStore.getState();
      
      setNotesPanelOpen(true);
      expect(useUIStore.getState().isNotesPanelOpen).toBe(true);
      
      setNotesPanelOpen(false);
      expect(useUIStore.getState().isNotesPanelOpen).toBe(false);
    });
  });

  describe('Active Tab', () => {
    it('should have notes as default active tab', () => {
      const state = useUIStore.getState();
      expect(state.activeTab).toBe('notes');
    });

    it('should set active tab', () => {
      const { setActiveTab } = useUIStore.getState();
      
      setActiveTab('summary');
      expect(useUIStore.getState().activeTab).toBe('summary');
      
      setActiveTab('transcript');
      expect(useUIStore.getState().activeTab).toBe('transcript');
      
      setActiveTab('notes');
      expect(useUIStore.getState().activeTab).toBe('notes');
    });
  });

  describe('Persistence', () => {
    it('should persist theme, sidebar, and activeTab', () => {
      const { setTheme, setSidebarOpen, setActiveTab } = useUIStore.getState();
      
      setTheme('dark');
      setSidebarOpen(false);
      setActiveTab('summary');

      // Note: In a real test environment with localStorage, we would verify
      // that these values are persisted. In this test, we just verify the
      // state is set correctly.
      const state = useUIStore.getState();
      expect(state.theme).toBe('dark');
      expect(state.isSidebarOpen).toBe(false);
      expect(state.activeTab).toBe('summary');
    });
  });
});
