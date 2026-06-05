/**
 * Typed HTTP client for Video Summary & Auto-Notes API
 * Used by desktop and web applications to communicate with backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Session,
  Note,
  Summary,
  TranscriptSegment,
  ExportFormat,
} from '@vsnotes/shared-types';
import type {
  CreateSessionInput,
  UpdateSessionInput,
  CreateNoteInput,
  UpdateNoteInput,
  GenerateSummaryInput,
  RegisterUserInput,
  LoginUserInput,
  UpdateUserSettingsInput,
  UploadAudioInput,
} from '@vsnotes/validation';

export interface BaseResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface BaseErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
}

interface BackendAuthData {
  userId: string;
  email: string;
  name: string;
  token: string;
}

interface BackendRefreshData {
  token: string;
}

export interface UserProfile {
  _id: string;
  email: string;
  name: string;
  settings: {
    summaryLengthPref: 'short' | 'medium' | 'long';
    autoStartSession: boolean;
    notificationsEnabled: boolean;
    watchPlatforms: string[];
  };
  createdAt: string;
  updatedAt: string;
}

interface BackendNoteDto {
  noteId: string;
  sessionId: string;
  userId: string;
  timestampSec: number;
  text: string;
  type: 'auto' | 'manual';
  createdAt: string;
  updatedAt?: string;
}

function toNote(dto: BackendNoteDto): Note {
  return {
    _id: dto.noteId,
    sessionId: dto.sessionId,
    userId: dto.userId,
    timestampSec: dto.timestampSec,
    text: dto.text,
    type: dto.type,
    createdAt: new Date(dto.createdAt),
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(dto.createdAt),
  };
}

interface BackendSummaryDto {
  summaryId: string;
  sessionId: string;
  userId?: string;
  content: string;
  keyPoints: string[];
  lengthPref: 'short' | 'medium' | 'long';
  createdAt: string;
}

function toSummary(dto: BackendSummaryDto): Summary {
  return {
    _id: dto.summaryId,
    sessionId: dto.sessionId,
    userId: dto.userId ?? '',
    content: dto.content,
    keyPoints: dto.keyPoints,
    lengthPref: dto.lengthPref,
    createdAt: new Date(dto.createdAt),
  };
}

interface BackendSessionDto {
  sessionId: string;
  userId: string;
  videoTitle: string;
  sourceApp: string;
  sourceType: 'local' | 'streaming';
  startedAt: string;
  endedAt?: string;
  durationSec?: number;
  status: 'active' | 'completed' | 'dismissed';
  deviceId: string;
  createdAt?: string;
  updatedAt?: string;
}

function toSession(dto: BackendSessionDto): Session {
  return {
    _id: dto.sessionId,
    userId: dto.userId,
    videoTitle: dto.videoTitle,
    sourceApp: dto.sourceApp,
    sourceType: dto.sourceType,
    startedAt: new Date(dto.startedAt),
    endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
    durationSec: dto.durationSec,
    status: dto.status,
    deviceId: dto.deviceId,
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(dto.startedAt),
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(dto.startedAt),
  };
}

export class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshQueue: Array<(token: string) => void> = [];
  private onUnauthorized?: () => void;

  constructor(baseURL: string, token?: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    this.client.interceptors.response.use(
      (res) => res,
      async (error: AxiosError) => {
        const original = error.config as typeof error.config & { _retry?: boolean };
        const isAuthEndpoint = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/register') || original?.url?.includes('/auth/refresh');
        if (error.response?.status !== 401 || original?._retry || isAuthEndpoint) {
          return Promise.reject(error);
        }
        original._retry = true;

        if (this.isRefreshing) {
          return new Promise((resolve, reject) => {
            this.refreshQueue.push((token) => {
              original.headers = original.headers ?? {};
              original.headers['Authorization'] = `Bearer ${token}`;
              this.client(original).then(resolve).catch(reject);
            });
          });
        }

        this.isRefreshing = true;
        try {
          const { token } = await this.refreshToken();
          this.setToken(token);
          this.refreshQueue.forEach((cb) => cb(token));
          this.refreshQueue = [];
          original.headers = original.headers ?? {};
          original.headers['Authorization'] = `Bearer ${token}`;
          return this.client(original);
        } catch {
          this.refreshQueue = [];
          this.onUnauthorized?.();
          return Promise.reject(error);
        } finally {
          this.isRefreshing = false;
        }
      }
    );
  }

  setToken(token: string) {
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearToken() {
    delete this.client.defaults.headers.common['Authorization'];
  }

  setOnUnauthorized(callback: () => void) {
    this.onUnauthorized = callback;
  }

  // Auth endpoints
  async register(data: RegisterUserInput): Promise<AuthResponse> {
    const response = await this.client.post<BaseResponse<BackendAuthData>>(
      '/v1/auth/register',
      data
    );
    const d = response.data.data;
    return { token: d.token, user: { id: d.userId, email: d.email, name: d.name } };
  }

  async login(data: LoginUserInput): Promise<AuthResponse> {
    const response = await this.client.post<BaseResponse<BackendAuthData>>(
      '/v1/auth/login',
      data
    );
    const d = response.data.data;
    return { token: d.token, user: { id: d.userId, email: d.email, name: d.name } };
  }

  async refreshToken(): Promise<{ token: string }> {
    const response = await this.client.post<BaseResponse<BackendRefreshData>>(
      '/v1/auth/refresh'
    );
    return response.data.data;
  }

  async forgotPassword(email: string): Promise<void> {
    await this.client.post('/v1/auth/forgot-password', { email });
  }

  async resetPassword(token: string, password: string, confirmPassword: string): Promise<void> {
    await this.client.post('/v1/auth/reset-password', { token, password, confirmPassword });
  }

  // Session endpoints
  async createSession(data: CreateSessionInput): Promise<Session> {
    const response = await this.client.post<BaseResponse<BackendSessionDto>>(
      '/v1/sessions',
      data
    );
    return toSession(response.data.data);
  }

  async getSessions(params?: { page?: number; limit?: number }): Promise<Session[]> {
    const response = await this.client.get<BaseResponse<{ sessions: BackendSessionDto[]; total: number; page: number; pageSize: number }>>(
      '/v1/sessions',
      { params: { page: params?.page ?? 1, limit: params?.limit ?? 100 } }
    );
    return response.data.data.sessions.map(toSession);
  }

  async getSession(id: string): Promise<Session> {
    const response = await this.client.get<BaseResponse<BackendSessionDto>>(
      `/v1/sessions/${id}`
    );
    return toSession(response.data.data);
  }

  async updateSession(
    id: string,
    data: UpdateSessionInput
  ): Promise<Session> {
    const response = await this.client.patch<BaseResponse<BackendSessionDto>>(
      `/v1/sessions/${id}`,
      data
    );
    return toSession(response.data.data);
  }

  async deleteSession(id: string): Promise<void> {
    await this.client.delete(`/v1/sessions/${id}`);
  }

  // Audio upload endpoint
  async uploadAudio(sessionId: string, data: UploadAudioInput): Promise<void> {
    await this.client.post(`/v1/sessions/${sessionId}/audio`, data);
  }

  // Transcript endpoint
  async getTranscript(sessionId: string): Promise<TranscriptSegment[]> {
    const response = await this.client.get<BaseResponse<TranscriptSegment[]>>(
      `/v1/sessions/${sessionId}/transcript`
    );
    return response.data.data;
  }

  // Note endpoints
  async getNotes(sessionId: string): Promise<Note[]> {
    const response = await this.client.get<BaseResponse<{ sessionId: string; notes: BackendNoteDto[]; total: number }>>(
      `/v1/sessions/${sessionId}/notes`
    );
    return response.data.data.notes.map(toNote);
  }

  async createNote(sessionId: string, data: CreateNoteInput): Promise<Note> {
    const response = await this.client.post<BaseResponse<BackendNoteDto>>(
      `/v1/sessions/${sessionId}/notes`,
      data
    );
    return toNote(response.data.data);
  }

  async updateNote(id: string, data: UpdateNoteInput): Promise<Note> {
    const response = await this.client.patch<BaseResponse<BackendNoteDto>>(
      `/v1/notes/${id}`,
      data
    );
    return toNote(response.data.data);
  }

  async deleteNote(id: string): Promise<void> {
    await this.client.delete(`/v1/notes/${id}`);
  }

  // Summary endpoints
  async getSummary(sessionId: string): Promise<Summary> {
    const response = await this.client.get<BaseResponse<BackendSummaryDto>>(
      `/v1/sessions/${sessionId}/summary`
    );
    return toSummary(response.data.data);
  }

  async generateSummary(data: GenerateSummaryInput): Promise<Summary> {
    const response = await this.client.post<BaseResponse<BackendSummaryDto>>(
      `/v1/sessions/${data.sessionId}/summary`,
      data
    );
    return toSummary(response.data.data);
  }

  // Export endpoint
  async exportSession(
    sessionId: string,
    format: ExportFormat
  ): Promise<Blob> {
    const response = await this.client.get(
      `/v1/sessions/${sessionId}/export`,
      {
        params: { format },
        responseType: 'blob',
      }
    );
    return response.data;
  }

  // User profile & settings
  async getMe(): Promise<UserProfile> {
    const response = await this.client.get<BaseResponse<UserProfile>>('/v1/users/me');
    return response.data.data;
  }

  async updateUserSettings(data: UpdateUserSettingsInput): Promise<UserProfile> {
    const response = await this.client.patch<BaseResponse<UserProfile>>('/v1/users/me/settings', data);
    return response.data.data;
  }
}

export function createApiClient(baseURL: string, token?: string): ApiClient {
  return new ApiClient(baseURL, token);
}

export { AxiosError };
