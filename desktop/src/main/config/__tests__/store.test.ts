/**
 * Unit tests for electron-store configuration
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { store, storeHelpers } from '../store';

describe('Electron Store Configuration', () => {
  beforeEach(() => {
    // Clear store before each test
    store.clear();
  });

  describe('Gemini API Key', () => {
    it('should store and retrieve Gemini API key', () => {
      const testKey = 'test-gemini-api-key-12345';
      storeHelpers.setGeminiApiKey(testKey);
      expect(storeHelpers.getGeminiApiKey()).toBe(testKey);
    });

    it('should clear Gemini API key', () => {
      storeHelpers.setGeminiApiKey('test-key');
      storeHelpers.clearGeminiApiKey();
      expect(storeHelpers.getGeminiApiKey()).toBeUndefined();
    });
  });

  describe('Auth Token', () => {
    it('should store and retrieve auth token', () => {
      const testToken = 'jwt-token-12345';
      storeHelpers.setAuthToken(testToken);
      expect(storeHelpers.getAuthToken()).toBe(testToken);
    });

    it('should clear auth token', () => {
      storeHelpers.setAuthToken('test-token');
      storeHelpers.clearAuthToken();
      expect(storeHelpers.getAuthToken()).toBeUndefined();
    });
  });

  describe('User Settings', () => {
    it('should have default settings', () => {
      const settings = storeHelpers.getSettings();
      expect(settings).toEqual({
        summaryLengthPref: 'medium',
        autoStartSession: false,
        notificationsEnabled: true,
        theme: 'system',
      });
    });

    it('should update settings partially', () => {
      storeHelpers.updateSettings({ summaryLengthPref: 'long' });
      const settings = storeHelpers.getSettings();
      expect(settings.summaryLengthPref).toBe('long');
      expect(settings.autoStartSession).toBe(false); // unchanged
    });

    it('should update multiple settings', () => {
      storeHelpers.updateSettings({
        summaryLengthPref: 'short',
        autoStartSession: true,
        theme: 'dark',
      });
      const settings = storeHelpers.getSettings();
      expect(settings.summaryLengthPref).toBe('short');
      expect(settings.autoStartSession).toBe(true);
      expect(settings.theme).toBe('dark');
    });
  });

  describe('Permissions', () => {
    it('should have default permission status', () => {
      expect(storeHelpers.getPermission('screen')).toBe('not-determined');
      expect(storeHelpers.getPermission('audio')).toBe('not-determined');
    });

    it('should update screen permission', () => {
      storeHelpers.setPermission('screen', 'granted');
      expect(storeHelpers.getPermission('screen')).toBe('granted');
    });

    it('should update audio permission', () => {
      storeHelpers.setPermission('audio', 'denied');
      expect(storeHelpers.getPermission('audio')).toBe('denied');
    });
  });

  describe('Sync Timestamp', () => {
    it('should return null when no sync has occurred', () => {
      expect(storeHelpers.getLastSyncAt()).toBeNull();
    });

    it('should store and retrieve last sync timestamp', () => {
      const now = new Date();
      storeHelpers.setLastSyncAt(now);
      const retrieved = storeHelpers.getLastSyncAt();
      expect(retrieved).toBeInstanceOf(Date);
      expect(retrieved?.toISOString()).toBe(now.toISOString());
    });
  });

  describe('Clear All', () => {
    it('should clear all stored data', () => {
      // Set some data
      storeHelpers.setGeminiApiKey('test-key');
      storeHelpers.setAuthToken('test-token');
      storeHelpers.setUserId('user-123');
      storeHelpers.updateSettings({ summaryLengthPref: 'long' });

      // Clear all
      storeHelpers.clearAll();

      // Verify everything is cleared
      expect(storeHelpers.getGeminiApiKey()).toBeUndefined();
      expect(storeHelpers.getAuthToken()).toBeUndefined();
      expect(storeHelpers.getUserId()).toBeUndefined();
      
      // Settings should be back to defaults
      const settings = storeHelpers.getSettings();
      expect(settings.summaryLengthPref).toBe('medium');
    });
  });
});
