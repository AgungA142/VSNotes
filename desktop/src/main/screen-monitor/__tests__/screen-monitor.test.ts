import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScreenMonitor } from '../screen-monitor';

// ============================================================================
// Mocks
// ============================================================================

const mockSend = vi.fn();

vi.mock('electron', () => ({
  desktopCapturer: { getSources: vi.fn() },
  BrowserWindow: vi.fn(),
}));

vi.mock('@shared/events/ipc-events', () => ({
  VIDEO_DETECTED: 'video:detected',
  VIDEO_STOPPED: 'video:stopped',
}));

vi.mock('@shared/constants', () => ({
  SCREEN_POLL_INTERVAL_IDLE: 3000,
  SCREEN_POLL_INTERVAL_ACTIVE: 10000,
}));

import { desktopCapturer } from 'electron';

// ============================================================================
// Helpers
// ============================================================================

function makeWindow() {
  return { isDestroyed: () => false, webContents: { send: mockSend } } as never;
}

function makeAudioDetector(sessions: string[] | null) {
  return { getAudioSessions: vi.fn().mockResolvedValue(sessions) } as never;
}

/**
 * Buat NativeImage mock dengan data bitmap tertentu.
 * Gunakan nilai berbeda untuk trigger motion detection.
 */
function makeThumbnail(fillByte = 0): Electron.NativeImage {
  const size = 160 * 90 * 4; // 160x90 RGBA
  const data = Buffer.alloc(size, fillByte);
  return {
    isEmpty: () => false,
    getBitmap: () => data,
  } as never;
}

function makeSource(
  name: string,
  thumbnailFill = 0,
): Electron.DesktopCapturerSource {
  return {
    id: `window:${name}`,
    name,
    thumbnail: makeThumbnail(thumbnailFill),
    appIcon: null,
    display_id: '',
  } as never;
}

function makeMonitor(
  audioDetector: ReturnType<typeof makeAudioDetector> | null = null,
  callbacks: ConstructorParameters<typeof ScreenMonitor>[1] = {},
) {
  return new ScreenMonitor(makeWindow(), callbacks, audioDetector);
}

async function runDetect(
  monitor: ScreenMonitor,
  sources: Electron.DesktopCapturerSource[],
) {
  vi.mocked(desktopCapturer.getSources).mockResolvedValue(sources);
  await monitor.detectVideo();
}

// ============================================================================
// Tests
// ============================================================================

describe('ScreenMonitor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // Deteksi streaming — Layer 1: judul window
  // =========================================================================

  describe('deteksi streaming — judul window', () => {
    it('mendeteksi window YouTube setelah 2 poll (motion detection)', async () => {
      const onVideoDetected = vi.fn();
      const monitor = makeMonitor(null, { onVideoDetected });

      // Poll 1: set baseline thumbnail
      await runDetect(monitor, [makeSource('Video React Hooks - YouTube', 0)]);
      expect(onVideoDetected).not.toHaveBeenCalled();

      // Poll 2: thumbnail berbeda → motion → terdeteksi
      await runDetect(monitor, [makeSource('Video React Hooks - YouTube', 128)]);
      expect(onVideoDetected).toHaveBeenCalledOnce();
      expect(onVideoDetected.mock.calls[0][0].sourceType).toBe('streaming');
    });

    it('tidak mendeteksi window tanpa judul streaming', async () => {
      const onVideoDetected = vi.fn();
      const monitor = makeMonitor(null, { onVideoDetected });

      await runDetect(monitor, [makeSource('Dokumen - Microsoft Word', 0)]);
      await runDetect(monitor, [makeSource('Dokumen - Microsoft Word', 128)]);

      expect(onVideoDetected).not.toHaveBeenCalled();
    });

    it('mendeteksi platform default: netflix, vimeo, twitch', async () => {
      for (const platform of ['Netflix', 'Vimeo', 'Twitch.tv']) {
        const onVideoDetected = vi.fn();
        const monitor = makeMonitor(null, { onVideoDetected });

        await runDetect(monitor, [makeSource(`Film seru - ${platform}`, 0)]);
        await runDetect(monitor, [makeSource(`Film seru - ${platform}`, 200)]);

        expect(onVideoDetected).toHaveBeenCalledOnce();
        vi.clearAllMocks();
      }
    });

    it('mendeteksi platform edukasi: udemy, coursera, edx', async () => {
      for (const platform of ['Udemy', 'Coursera', 'edX']) {
        const onVideoDetected = vi.fn();
        const monitor = makeMonitor(null, { onVideoDetected });

        await runDetect(monitor, [makeSource(`Belajar Python - ${platform}`, 0)]);
        await runDetect(monitor, [makeSource(`Belajar Python - ${platform}`, 200)]);

        expect(onVideoDetected).toHaveBeenCalledOnce();
        vi.clearAllMocks();
      }
    });
  });

  // =========================================================================
  // setWatchPlatforms() — dynamic platform list
  // =========================================================================

  describe('setWatchPlatforms()', () => {
    it('platform baru berlaku di poll berikutnya', async () => {
      const onVideoDetected = vi.fn();
      const monitor = makeMonitor(null, { onVideoDetected });

      // Tambah 'bilibili' ke daftar platform
      monitor.setWatchPlatforms([...['youtube', 'netflix'], 'bilibili']);

      await runDetect(monitor, [makeSource('Stream keren - Bilibili', 0)]);
      await runDetect(monitor, [makeSource('Stream keren - Bilibili', 200)]);

      expect(onVideoDetected).toHaveBeenCalledOnce();
    });

    it('platform lama tidak lagi cocok setelah setWatchPlatforms dengan list baru', async () => {
      const onVideoDetected = vi.fn();
      const monitor = makeMonitor(null, { onVideoDetected });

      // Ganti seluruh platform list — YouTube tidak ada di sini
      monitor.setWatchPlatforms(['bilibili', 'niconico']);

      await runDetect(monitor, [makeSource('Tutorial React - YouTube', 0)]);
      await runDetect(monitor, [makeSource('Tutorial React - YouTube', 200)]);

      // YouTube tidak ada di list baru → tidak terdeteksi
      expect(onVideoDetected).not.toHaveBeenCalled();
    });

    it('list kosong → tidak ada streaming yang terdeteksi', async () => {
      const onVideoDetected = vi.fn();
      const monitor = makeMonitor(null, { onVideoDetected });

      monitor.setWatchPlatforms([]);

      await runDetect(monitor, [makeSource('Film - Netflix', 0)]);
      await runDetect(monitor, [makeSource('Film - Netflix', 200)]);

      expect(onVideoDetected).not.toHaveBeenCalled();
    });

    it('platform baru (case-insensitive): "BILIBILI" cocok dengan "Bilibili"', async () => {
      const onVideoDetected = vi.fn();
      const monitor = makeMonitor(null, { onVideoDetected });

      monitor.setWatchPlatforms(['BILIBILI']);

      await runDetect(monitor, [makeSource('Stream - Bilibili', 0)]);
      await runDetect(monitor, [makeSource('Stream - Bilibili', 200)]);

      expect(onVideoDetected).toHaveBeenCalledOnce();
    });
  });

  // =========================================================================
  // Layer 2: Audio session detector
  // =========================================================================

  describe('Layer 2 — audio session filter', () => {
    it('null (detector tidak tersedia) → skip cek audio, deteksi berdasarkan judul saja', async () => {
      const onVideoDetected = vi.fn();
      // null = tidak ada AudioSessionDetector
      const monitor = makeMonitor(null, { onVideoDetected });

      await runDetect(monitor, [makeSource('Tutorial - YouTube', 0)]);
      await runDetect(monitor, [makeSource('Tutorial - YouTube', 200)]);

      expect(onVideoDetected).toHaveBeenCalledOnce();
    });

    it('empty Set (pycaw aktif, tidak ada audio) → blokir streaming', async () => {
      const onVideoDetected = vi.fn();
      const detector = makeAudioDetector([]); // Set kosong = tidak ada audio
      const monitor = makeMonitor(detector, { onVideoDetected });

      await runDetect(monitor, [makeSource('Tutorial - YouTube', 0)]);
      await runDetect(monitor, [makeSource('Tutorial - YouTube', 200)]);

      expect(onVideoDetected).not.toHaveBeenCalled();
    });

    it('audio dari chrome.exe → streaming diizinkan', async () => {
      const onVideoDetected = vi.fn();
      const detector = makeAudioDetector(['chrome.exe', 'discord.exe']);
      const monitor = makeMonitor(detector, { onVideoDetected });

      await runDetect(monitor, [makeSource('Tutorial - YouTube', 0)]);
      await runDetect(monitor, [makeSource('Tutorial - YouTube', 200)]);

      expect(onVideoDetected).toHaveBeenCalledOnce();
    });

    it('audio dari msedge.exe → streaming diizinkan', async () => {
      const onVideoDetected = vi.fn();
      const detector = makeAudioDetector(['msedge.exe']);
      const monitor = makeMonitor(detector, { onVideoDetected });

      await runDetect(monitor, [makeSource('Tutorial - YouTube', 0)]);
      await runDetect(monitor, [makeSource('Tutorial - YouTube', 200)]);

      expect(onVideoDetected).toHaveBeenCalledOnce();
    });

    it('audio hanya dari vlc.exe (bukan browser) → streaming diblokir', async () => {
      const onVideoDetected = vi.fn();
      const detector = makeAudioDetector(['vlc.exe']); // ada audio tapi bukan dari browser
      const monitor = makeMonitor(detector, { onVideoDetected });

      await runDetect(monitor, [makeSource('Tutorial - YouTube', 0)]);
      await runDetect(monitor, [makeSource('Tutorial - YouTube', 200)]);

      expect(onVideoDetected).not.toHaveBeenCalled();
    });

    it('local video player (VLC) melewati cek audio meskipun Set kosong', async () => {
      const onVideoDetected = vi.fn();
      const detector = makeAudioDetector([]); // tidak ada audio
      const monitor = makeMonitor(detector, { onVideoDetected });

      // VLC sebagai local player — audio check dilewati
      await runDetect(monitor, [makeSource('Film.mp4 - VLC media player', 0)]);
      await runDetect(monitor, [makeSource('Film.mp4 - VLC media player', 200)]);

      expect(onVideoDetected).toHaveBeenCalledOnce();
      expect(onVideoDetected.mock.calls[0][0].sourceType).toBe('local');
    });
  });

  // =========================================================================
  // Motion detection
  // =========================================================================

  describe('motion detection', () => {
    it('frame pertama tidak melaporkan motion (set baseline)', async () => {
      const onVideoDetected = vi.fn();
      const monitor = makeMonitor(null, { onVideoDetected });

      await runDetect(monitor, [makeSource('Tutorial - YouTube', 0)]);

      // Poll pertama: baseline saja, tidak ada deteksi
      expect(onVideoDetected).not.toHaveBeenCalled();
    });

    it('frame identik tidak dianggap motion', async () => {
      const onVideoDetected = vi.fn();
      const monitor = makeMonitor(null, { onVideoDetected });

      // Dua poll dengan thumbnail identik (fillByte sama)
      await runDetect(monitor, [makeSource('Tutorial - YouTube', 50)]);
      await runDetect(monitor, [makeSource('Tutorial - YouTube', 50)]);

      expect(onVideoDetected).not.toHaveBeenCalled();
    });

    it('frame berbeda signifikan dianggap motion', async () => {
      const onVideoDetected = vi.fn();
      const monitor = makeMonitor(null, { onVideoDetected });

      await runDetect(monitor, [makeSource('Tutorial - YouTube', 0)]);    // baseline
      await runDetect(monitor, [makeSource('Tutorial - YouTube', 200)]);  // sangat berbeda

      expect(onVideoDetected).toHaveBeenCalledOnce();
    });

    it('ukuran bitmap berbeda mereset baseline dan tidak melaporkan motion', async () => {
      const onVideoDetected = vi.fn();
      const monitor = makeMonitor(null, { onVideoDetected });

      // Poll 1: baseline dengan ukuran normal
      await runDetect(monitor, [makeSource('Tutorial - YouTube', 0)]);

      // Poll 2: ukuran thumbnail berbeda (reset baseline)
      const smallThumb = {
        isEmpty: () => false,
        getBitmap: () => Buffer.alloc(100 * 50 * 4, 200), // ukuran berbeda
      } as never;
      const source = { id: 'w1', name: 'Tutorial - YouTube', thumbnail: smallThumb } as never;
      vi.mocked(desktopCapturer.getSources).mockResolvedValue([source]);
      await monitor.detectVideo();

      // Reset baseline → tidak melaporkan motion
      expect(onVideoDetected).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Callbacks & IPC
  // =========================================================================

  describe('callbacks & IPC', () => {
    it('emits VIDEO_DETECTED via IPC ke renderer saat video terdeteksi', async () => {
      const monitor = makeMonitor(null);

      await runDetect(monitor, [makeSource('Tutorial - YouTube', 0)]);
      await runDetect(monitor, [makeSource('Tutorial - YouTube', 200)]);

      expect(mockSend).toHaveBeenCalledWith('video:detected', expect.objectContaining({
        windowTitle: 'Tutorial - YouTube',
        sourceType: 'streaming',
      }));
    });

    it('onVideoDetected callback dipanggil dengan VideoDetectionInfo yang benar', async () => {
      const onVideoDetected = vi.fn();
      const monitor = makeMonitor(null, { onVideoDetected });

      await runDetect(monitor, [makeSource('Belajar TypeScript - YouTube', 0)]);
      await runDetect(monitor, [makeSource('Belajar TypeScript - YouTube', 200)]);

      expect(onVideoDetected).toHaveBeenCalledWith(expect.objectContaining({
        windowTitle: 'Belajar TypeScript - YouTube',
        sourceType: 'streaming',
        detectedAt: expect.any(Date),
      }));
    });
  });
});
