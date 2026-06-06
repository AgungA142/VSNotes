/**
 * Screen Monitor
 * Mendeteksi video yang sedang diputar di layar menggunakan desktopCapturer.
 *
 * Mode idle  : polling 3 detik, cari window video apapun
 * Mode locked: polling 10 detik, pantau satu window spesifik yang dikunci
 *              - jika window hilang > 5 detik  → onVideoTabClosed
 *              - jika tidak ada motion > 20 detik → onVideoPaused
 *              - jika motion muncul lagi setelah pause → onVideoResumed
 */

import { desktopCapturer, BrowserWindow } from 'electron';
import { VIDEO_DETECTED, VIDEO_STOPPED } from '@shared/events/ipc-events';
import { SCREEN_POLL_INTERVAL_IDLE, SCREEN_POLL_INTERVAL_ACTIVE } from '@shared/constants';
import type { VideoDetectionInfo } from '@shared/types';
import type { AudioSessionDetector } from '@main/audio-capture/audio-session-detector';

// ============================================================================
// Konstanta
// ============================================================================

const VIDEO_PROCESS_NAMES = [
  'vlc', 'mpv', 'mpc-hc', 'mpc-be', 'wmplayer', 'wmplayer.exe',
];

// Default platform list — akan di-override oleh user settings dari DB
const DEFAULT_STREAMING_PATTERNS = [
  'youtube', 'netflix', 'vimeo', 'twitch', 'prime video',
  'disney+', 'disney plus', 'hbo', 'hulu', 'peacock', 'apple tv',
  'udemy', 'coursera', 'edx', 'skillshare', 'linkedin learning',
  'pluralsight', 'udacity', 'khan academy',
];

const LOCAL_PLAYER_PATTERNS = ['vlc', 'mpv', 'mpc', 'media player'];

const MOTION_THRESHOLD = 0.05;
const NO_MOTION_TIMEOUT_SEC = 30;       // idle mode: detik tanpa motion → video berhenti
const VIDEO_PAUSE_TIMEOUT_SEC = 60;     // locked mode: detik tanpa motion DAN tanpa audio → video di-pause
const WINDOW_GONE_GRACE_MS = 5_000;     // locked mode: ms sebelum tab dianggap tertutup

// ============================================================================
// Tipe
// ============================================================================

interface DetectedSource {
  id: string;
  name: string;
  sourceType: 'local' | 'streaming';
  appName: string;
  thumbnail: Electron.NativeImage;
}

export interface ScreenMonitorCallbacks {
  onVideoDetected?: (info: VideoDetectionInfo) => void;
  onVideoStopped?: () => void;
  onVideoPaused?: () => void;
  onVideoResumed?: () => void;
  onVideoTabClosed?: () => void;
}

// ============================================================================
// ScreenMonitor
// ============================================================================

export class ScreenMonitor {
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private noMotionTimer: ReturnType<typeof setTimeout> | null = null;

  // Idle mode state
  private isSessionActive = false;
  private currentDetectedSource: DetectedSource | null = null;
  private lastThumbnailData: Buffer | null = null;
  private lastMotionAt: Date | null = null;

  // Locked mode state
  private lockedWindowTitle: string | null = null;
  private isVideoPaused = false;
  private windowGoneAt: Date | null = null;

  private mainWindow: BrowserWindow;
  private callbacks: ScreenMonitorCallbacks;
  private audioSessionDetector: AudioSessionDetector | null;
  private streamingTitlePatterns: string[];

  constructor(
    mainWindow: BrowserWindow,
    callbacks: ScreenMonitorCallbacks = {},
    audioSessionDetector: AudioSessionDetector | null = null
  ) {
    this.mainWindow = mainWindow;
    this.callbacks = callbacks;
    this.audioSessionDetector = audioSessionDetector;
    this.streamingTitlePatterns = [...DEFAULT_STREAMING_PATTERNS];
  }

  /** Update daftar platform streaming dari user settings (real-time). */
  setWatchPlatforms(platforms: string[]): void {
    this.streamingTitlePatterns = platforms.map((p) => p.toLowerCase().trim()).filter(Boolean);
  }

  // ============================================================================
  // Public API
  // ============================================================================

  start(): void {
    if (this.pollTimer) return;
    this.schedulePoll();
  }

  stop(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    this.clearNoMotionTimer();
    this.resetIdleState();
    this.resetLockedState();
  }

  setSessionActive(active: boolean): void {
    this.isSessionActive = active;
  }

  /** Kunci monitor ke window/tab spesifik saat sesi mulai merekam. */
  lockWindow(title: string): void {
    this.lockedWindowTitle = title;
    this.isVideoPaused = false;
    this.windowGoneAt = null;
    this.lastMotionAt = new Date();
    this.clearNoMotionTimer();
  }

  /** Lepas kunci saat sesi selesai. */
  unlockWindow(): void {
    this.resetLockedState();
    this.clearNoMotionTimer();
  }

  // ============================================================================
  // Poll dispatch
  // ============================================================================

  async detectVideo(): Promise<void> {
    let sources: Electron.DesktopCapturerSource[] = [];
    try {
      sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 160, height: 90 },
        fetchWindowIcons: false,
      });
    } catch {
      return;
    }

    if (this.isSessionActive && this.lockedWindowTitle) {
      await this.checkLockedWindow(sources);
    } else {
      await this.checkAnyVideo(sources);
    }
  }

  // ============================================================================
  // Locked-window mode
  // ============================================================================

  private async checkLockedWindow(sources: Electron.DesktopCapturerSource[]): Promise<void> {
    const lockedSource = this.findLockedWindow(sources);

    if (!lockedSource) {
      if (!this.windowGoneAt) {
        this.windowGoneAt = new Date();
      } else if (Date.now() - this.windowGoneAt.getTime() > WINDOW_GONE_GRACE_MS) {
        this.handleVideoTabClosed();
      }
      return;
    }

    // Window ditemukan — reset gone timer
    this.windowGoneAt = null;

    const hasMotion = this.checkMotion(lockedSource.thumbnail);

    // Cek audio — jika ada audio aktif, video pasti masih berjalan
    const audioSessions = this.audioSessionDetector
      ? await this.audioSessionDetector.getAudioSessions()
      : null;
    const hasAudio =
      audioSessions !== null && audioSessions.length > 0;

    const isPlaying = hasMotion || hasAudio;

    if (isPlaying) {
      this.lastMotionAt = new Date();

      if (this.isVideoPaused) {
        // Video dilanjutkan kembali
        this.isVideoPaused = false;
        this.clearNoMotionTimer();
        this.callbacks.onVideoResumed?.();
      }

      // Reset timer pause — hanya trigger jika tidak ada motion DAN tidak ada audio
      this.clearNoMotionTimer();
      this.noMotionTimer = setTimeout(() => {
        if (this.lockedWindowTitle && !this.isVideoPaused) {
          this.isVideoPaused = true;
          this.callbacks.onVideoPaused?.();
        }
      }, VIDEO_PAUSE_TIMEOUT_SEC * 1_000);
    }
    // Jika tidak ada motion dan tidak ada audio, biarkan timer berjalan
  }

  private findLockedWindow(
    sources: Electron.DesktopCapturerSource[]
  ): Electron.DesktopCapturerSource | null {
    if (!this.lockedWindowTitle) return null;

    // 1. Exact match
    const exact = sources.find((s) => s.name === this.lockedWindowTitle);
    if (exact) return exact;

    // 2. Match berdasarkan judul video (sebelum " - YouTube", dll.)
    const videoTitle = this.extractVideoTitle(this.lockedWindowTitle).toLowerCase();
    if (videoTitle.length > 4) {
      const partial = sources.find((s) => s.name.toLowerCase().includes(videoTitle));
      if (partial) return partial;
    }

    // 3. Fallback: cari window dengan app name yang sama dan pola streaming yang sama
    const lockedLower = this.lockedWindowTitle.toLowerCase();
    const matchedPattern = this.streamingTitlePatterns.find((p) => lockedLower.includes(p));
    if (matchedPattern) {
      const lockedApp = this.extractAppName(this.lockedWindowTitle).toLowerCase();
      return (
        sources.find((s) => {
          const sLower = s.name.toLowerCase();
          return (
            sLower.includes(matchedPattern) &&
            this.extractAppName(s.name).toLowerCase() === lockedApp
          );
        }) ?? null
      );
    }

    return null;
  }

  private extractVideoTitle(windowTitle: string): string {
    // "How to Learn React - YouTube — Microsoft Edge" → "How to Learn React"
    for (const marker of [' - YouTube', ' | YouTube', ' - Netflix', ' — ']) {
      const idx = windowTitle.indexOf(marker);
      if (idx > 0) return windowTitle.substring(0, idx).trim();
    }
    return windowTitle.split(' - ')[0].trim();
  }

  private handleVideoTabClosed(): void {
    this.clearNoMotionTimer();
    this.resetLockedState();
    this.callbacks.onVideoTabClosed?.();
  }

  // ============================================================================
  // Idle mode (any video detection)
  // ============================================================================

  private async checkAnyVideo(sources: Electron.DesktopCapturerSource[]): Promise<void> {
    // Lapis 2:
    //   null       = pycaw tidak tersedia atau detector tidak jalan → lewati cek audio
    //   Set kosong = pycaw aktif, tidak ada yang memutar audio → blokir streaming
    //   Set berisi = ada audio dari proses tertentu → periksa apakah berasal dari browser
    const rawSessions = this.audioSessionDetector
      ? await this.audioSessionDetector.getAudioSessions()
      : null;
    const audioSessions: Set<string> | null = rawSessions !== null ? new Set(rawSessions) : null;

    const videoSource = await this.findVideoSource(sources, audioSessions);

    if (videoSource) {
      const hasMotion = this.checkMotion(videoSource.thumbnail);

      if (hasMotion) {
        this.lastMotionAt = new Date();
        this.clearNoMotionTimer();

        if (!this.currentDetectedSource || this.currentDetectedSource.id !== videoSource.id) {
          this.currentDetectedSource = videoSource;
          this.emitVideoDetected(videoSource);
        }

        this.startNoMotionTimer();
      }
    } else if (this.currentDetectedSource) {
      this.handleVideoStopped();
    }
  }

  private async findVideoSource(
    sources: Electron.DesktopCapturerSource[],
    audioSessions: Set<string> | null  // null = detector tidak tersedia, degradasi graceful
  ): Promise<DetectedSource | null> {
    for (const source of sources) {
      const titleLower = source.name.toLowerCase();

      // Lapis 1: judul cocok platform streaming dari user settings
      const streamingMatch = this.streamingTitlePatterns.some((p) => titleLower.includes(p));
      if (streamingMatch) {
        // Lapis 2: cek audio hanya jika detector tersedia
        if (audioSessions !== null) {
          // Detector aktif: Set kosong = tidak ada yang memutar audio → skip
          if (audioSessions.size === 0) continue;

          // Ada audio: pastikan berasal dari browser (bukan app lain)
          const hasAudio = [...audioSessions].some(
            (proc) =>
              proc.includes('chrome') ||
              proc.includes('firefox') ||
              proc.includes('edge') ||
              proc.includes('msedge') ||
              proc.includes('opera') ||
              proc.includes('brave') ||
              proc.includes('vivaldi')
          );
          if (!hasAudio) continue;
        }
        // null = detector tidak tersedia → lewati cek audio (degrade ke title+motion only)
        return {
          id: source.id,
          name: source.name,
          sourceType: 'streaming',
          appName: this.extractAppName(source.name),
          thumbnail: source.thumbnail,
        };
      }

      // Local video player — Lapis 2 dilewati (proses player = sumber audio itu sendiri)
      const localMatch =
        VIDEO_PROCESS_NAMES.some((proc) => titleLower.includes(proc)) ||
        LOCAL_PLAYER_PATTERNS.some((pattern) => titleLower.includes(pattern));

      if (localMatch) {
        return {
          id: source.id,
          name: source.name,
          sourceType: 'local',
          appName: this.extractAppName(source.name),
          thumbnail: source.thumbnail,
        };
      }
    }
    return null;
  }

  private startNoMotionTimer(): void {
    this.clearNoMotionTimer();
    this.noMotionTimer = setTimeout(
      () => this.handleVideoStopped(),
      NO_MOTION_TIMEOUT_SEC * 1_000
    );
  }

  private handleVideoStopped(): void {
    this.clearNoMotionTimer();
    this.resetIdleState();

    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(VIDEO_STOPPED);
    }
    this.callbacks.onVideoStopped?.();
  }

  // ============================================================================
  // Motion detection
  // ============================================================================

  private checkMotion(thumbnail: Electron.NativeImage): boolean {
    if (thumbnail.isEmpty()) return false;

    const currentData = thumbnail.getBitmap();

    if (!this.lastThumbnailData || this.lastThumbnailData.length !== currentData.length) {
      // Simpan frame pertama sebagai baseline — tidak laporkan motion dulu.
      // Poll berikutnya (3 detik kemudian) akan punya data perbandingan.
      this.lastThumbnailData = currentData;
      return false;
    }

    const diffRatio = this.calculatePixelDiff(this.lastThumbnailData, currentData);
    this.lastThumbnailData = currentData;
    return diffRatio > MOTION_THRESHOLD;
  }

  private calculatePixelDiff(prev: Buffer, current: Buffer): number {
    const totalPixels = prev.length / 4;
    let diffPixels = 0;
    for (let i = 0; i < prev.length; i += 4) {
      const rDiff = Math.abs(prev[i] - current[i]);
      const gDiff = Math.abs(prev[i + 1] - current[i + 1]);
      const bDiff = Math.abs(prev[i + 2] - current[i + 2]);
      if ((rDiff + gDiff + bDiff) / 3 > 15) diffPixels++;
    }
    return diffPixels / totalPixels;
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private extractAppName(windowTitle: string): string {
    const separators = [' - ', ' | ', ' — '];
    for (const sep of separators) {
      const parts = windowTitle.split(sep);
      if (parts.length > 1) return parts[parts.length - 1].trim();
    }
    return windowTitle;
  }

  private emitVideoDetected(source: DetectedSource): void {
    if (this.mainWindow.isDestroyed()) return;
    const payload: VideoDetectionInfo = {
      windowTitle: source.name,
      appName: source.appName,
      sourceType: source.sourceType,
      detectedAt: new Date(),
    };
    this.mainWindow.webContents.send(VIDEO_DETECTED, payload);
    this.callbacks.onVideoDetected?.(payload);
  }

  private clearNoMotionTimer(): void {
    if (this.noMotionTimer) {
      clearTimeout(this.noMotionTimer);
      this.noMotionTimer = null;
    }
  }

  private resetIdleState(): void {
    this.currentDetectedSource = null;
    this.lastThumbnailData = null;
    this.lastMotionAt = null;
  }

  private resetLockedState(): void {
    this.lockedWindowTitle = null;
    this.isVideoPaused = false;
    this.windowGoneAt = null;
  }

  // ============================================================================
  // Scheduling
  // ============================================================================

  private schedulePoll(): void {
    const interval = this.isSessionActive
      ? SCREEN_POLL_INTERVAL_ACTIVE
      : SCREEN_POLL_INTERVAL_IDLE;

    this.pollTimer = setTimeout(async () => {
      await this.detectVideo();
      this.schedulePoll();
    }, interval);
  }
}
