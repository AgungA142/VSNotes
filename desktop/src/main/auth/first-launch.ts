import { BrowserWindow } from 'electron';
import { AuthManager } from './auth-manager';
import * as IPC from '@shared/events/ipc-events';

const EXPIRY_REFRESH_THRESHOLD_MS = 10 * 60 * 1000;

interface FirstLaunchCallbacks {
  onAuthenticated: () => void;
  onUnauthenticated: () => void;
}

export class FirstLaunchHandler {
  constructor(
    private readonly authManager: AuthManager,
    private readonly mainWindow: BrowserWindow,
  ) {}

  async run(callbacks: FirstLaunchCallbacks): Promise<void> {
    await this.waitForRendererReady();

    const hasToken = !!this.authManager.getStoredToken();

    if (!hasToken) {
      callbacks.onUnauthenticated();
    } else if (this.authManager.isAuthenticated()) {
      if (this.authManager.isTokenExpiringSoon(EXPIRY_REFRESH_THRESHOLD_MS)) {
        await this.authManager.refreshToken();
      }
      callbacks.onAuthenticated();
    } else {
      // Token exists but expired — attempt silent refresh before showing app
      const refreshed = await this.authManager.refreshToken();
      if (refreshed) {
        callbacks.onAuthenticated();
      } else {
        callbacks.onUnauthenticated();
      }
    }

    this.mainWindow.webContents.send(IPC.APP_READY);
  }

  private waitForRendererReady(): Promise<void> {
    return new Promise((resolve) => {
      if (this.mainWindow.webContents.isLoading()) {
        this.mainWindow.webContents.once('did-finish-load', () => resolve());
      } else {
        resolve();
      }
    });
  }
}
