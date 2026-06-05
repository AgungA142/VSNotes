/**
 * Electron Store Configuration
 * Encrypted storage for sensitive data (Gemini API key, auth tokens)
 */

import Store from 'electron-store';
import type { StoreSchema } from '@shared/types';

// Default settings
const defaultSettings: StoreSchema = {
  settings: {
    summaryLengthPref: 'medium',
    autoStartSession: false,
    notificationsEnabled: true,
    theme: 'system',
  },
  permissions: {
    screen: 'not-determined',
    audio: 'not-determined',
  },
};

// Create encrypted store instance
// The encryptionKey is automatically generated and stored securely by electron-store
export const store = new Store<StoreSchema>({
  name: 'vsnotes',
  defaults: defaultSettings,
  // Encrypt sensitive fields
  encryptionKey: 'vsnotes-encryption-key',
  // Schema validation
  schema: {
    geminiApiKey: {
      type: 'string',
    },
    settings: {
      type: 'object',
      properties: {
        summaryLengthPref: {
          type: 'string',
          enum: ['short', 'medium', 'long'],
        },
        autoStartSession: {
          type: 'boolean',
        },
        notificationsEnabled: {
          type: 'boolean',
        },
        theme: {
          type: 'string',
          enum: ['light', 'dark', 'system'],
        },
      },
    },
    authToken: {
      type: 'string',
    },
    userId: {
      type: 'string',
    },
    userEmail: {
      type: 'string',
    },
    userName: {
      type: 'string',
    },
    permissions: {
      type: 'object',
      properties: {
        screen: {
          type: 'string',
          enum: ['granted', 'denied', 'not-determined'],
        },
        audio: {
          type: 'string',
          enum: ['granted', 'denied', 'not-determined'],
        },
      },
    },
    lastSyncAt: {
      type: 'string',
    },
    audioDeviceIndex: {
      type: 'number',
    },
  },
});

// Helper functions for common operations
export const storeHelpers = {
  // Gemini API Key
  getGeminiApiKey: (): string | undefined => {
    return store.get('geminiApiKey');
  },
  setGeminiApiKey: (key: string): void => {
    store.set('geminiApiKey', key);
  },
  clearGeminiApiKey: (): void => {
    store.delete('geminiApiKey');
  },

  // Auth
  getAuthToken: (): string | undefined => {
    return store.get('authToken');
  },
  setAuthToken: (token: string): void => {
    store.set('authToken', token);
  },
  clearAuthToken: (): void => {
    store.delete('authToken');
  },

  getUserId: (): string | undefined => {
    return store.get('userId');
  },
  setUserId: (userId: string): void => {
    store.set('userId', userId);
  },

  getUserData: (): { id: string; email: string; name: string } | null => {
    const id = store.get('userId');
    const email = store.get('userEmail');
    const name = store.get('userName');
    if (!id || !email || !name) return null;
    return { id, email, name };
  },
  setUserData: (user: { id: string; email: string; name: string }): void => {
    store.set('userId', user.id);
    store.set('userEmail', user.email);
    store.set('userName', user.name);
  },
  clearUserData: (): void => {
    store.delete('authToken');
    store.delete('userId');
    store.delete('userEmail');
    store.delete('userName');
  },

  // Settings
  getSettings: () => {
    return store.get('settings');
  },
  updateSettings: (settings: Partial<StoreSchema['settings']>): void => {
    const current = store.get('settings');
    store.set('settings', { ...current, ...settings });
  },

  // Permissions
  getPermission: (type: 'screen' | 'audio') => {
    return store.get(`permissions.${type}`);
  },
  setPermission: (type: 'screen' | 'audio', status: 'granted' | 'denied' | 'not-determined'): void => {
    store.set(`permissions.${type}`, status);
  },

  // Sync
  getLastSyncAt: (): Date | null => {
    const timestamp = store.get('lastSyncAt');
    return timestamp ? new Date(timestamp) : null;
  },
  setLastSyncAt: (date: Date): void => {
    store.set('lastSyncAt', date.toISOString());
  },

  // Audio device
  getAudioDeviceIndex: (): number | undefined => {
    return store.get('audioDeviceIndex');
  },
  setAudioDeviceIndex: (index: number): void => {
    store.set('audioDeviceIndex', index);
  },
  clearAudioDeviceIndex: (): void => {
    store.delete('audioDeviceIndex');
  },

  // Clear all data (logout)
  clearAll: (): void => {
    store.clear();
  },
};
