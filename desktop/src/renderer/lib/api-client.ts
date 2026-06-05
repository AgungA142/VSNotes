import { createApiClient } from '@vsnotes/api-client';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export const apiClient = createApiClient(BASE_URL);

apiClient.setOnUnauthorized(() => {
  window.electronAPI.auth.logout().catch(() => {});
});

export function setApiToken(token: string): void {
  apiClient.setToken(token);
}

export function clearApiToken(): void {
  apiClient.clearToken();
}
