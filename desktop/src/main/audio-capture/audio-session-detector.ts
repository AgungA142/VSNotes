/**
 * AudioSessionDetector
 * Spawns a persistent Python audio_agent.py process (separate from AudioCaptureManager)
 * and queries it for processes currently outputting audio.
 * Used as Layer 2 in screen monitor detection to filter browser windows that are
 * open but not playing video.
 */

import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from 'electron';

// ============================================================================
// Config
// ============================================================================

const CACHE_TTL_MS = 3_000; // reuse result within one poll cycle

function getAudioAgentCommand(): { exe: string; args: string[] } {
  if (app.isPackaged && process.platform === 'win32') {
    return { exe: path.join(process.resourcesPath, 'python', 'audio_agent.exe'), args: [] };
  }
  if (app.isPackaged) {
    const script = path.join(process.resourcesPath, 'python', 'audio_agent.py');
    return { exe: 'python3', args: [script] };
  }
  const script = path.join(app.getAppPath(), 'python', 'audio_agent.py');
  const pyExe = process.platform === 'win32' ? 'python' : 'python3';
  return { exe: pyExe, args: [script] };
}

// ============================================================================
// AudioSessionDetector
// ============================================================================

export class AudioSessionDetector {
  private process: ChildProcess | null = null;
  private lineBuffer: string = '';
  private pendingResolvers: Array<(processes: string[] | null) => void> = [];
  private cachedResult: string[] | null = null;  // null = pycaw tidak tersedia
  private cacheTimestamp: number = 0;
  private pycawUnavailable = false;              // sekali false, tetap false

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  start(): void {
    if (this.process) return;

    const { exe, args } = getAudioAgentCommand();

    this.process = spawn(exe, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.process.stdout!.on('data', (data: Buffer) => this.onStdoutData(data));
    this.process.stderr!.on('data', (data: Buffer) => {
      console.log(`[AudioSessionDetector] ${data.toString().trim()}`);
    });
    this.process.on('error', (err) => {
      console.error('[AudioSessionDetector] Process error:', err.message);
      this.process = null;
      this.resolveAllPending([]);
    });
    this.process.on('exit', () => {
      this.process = null;
    });
  }

  stop(): void {
    if (!this.process) return;
    try {
      this.process.kill();
    } catch {
      // already dead
    }
    this.process = null;
    this.resolveAllPending([]);
  }

  /**
   * Returns process names currently outputting audio, or null if pycaw is unavailable.
   * - string[]  → pycaw aktif; kosong = tidak ada yang memutar audio
   * - null      → pycaw tidak tersedia; ScreenMonitor harus skip cek audio
   */
  getAudioSessions(): Promise<string[] | null> {
    // pycaw sudah diketahui tidak tersedia — selalu null
    if (this.pycawUnavailable) return Promise.resolve(null);

    // Return cached result if fresh
    if (Date.now() - this.cacheTimestamp < CACHE_TTL_MS) {
      return Promise.resolve(this.cachedResult);
    }

    if (!this.process?.stdin?.writable) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingResolvers = this.pendingResolvers.filter((r) => r !== resolve);
        resolve(null);
      }, 2_000);

      this.pendingResolvers.push((result) => {
        clearTimeout(timeout);
        resolve(result);
      });

      this.process!.stdin!.write(JSON.stringify({ action: 'audio_sessions' }) + '\n');
    });
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private onStdoutData(data: Buffer): void {
    this.lineBuffer += data.toString();
    const lines = this.lineBuffer.split('\n');
    this.lineBuffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) this.handleLine(trimmed);
    }
  }

  private handleLine(line: string): void {
    let event: { type: string };
    try {
      event = JSON.parse(line);
    } catch {
      return;
    }

    if (event.type === 'audio_sessions') {
      const { processes, available } = event as { type: string; processes: string[]; available?: boolean };

      if (available === false) {
        // pycaw tidak tersedia — tandai permanen, kembalikan null ke semua caller
        this.pycawUnavailable = true;
        this.cachedResult = null;
        console.log('[AudioSessionDetector] pycaw tidak tersedia — deteksi audio dinonaktifkan');
      } else {
        this.cachedResult = processes;
      }
      this.cacheTimestamp = Date.now();
      this.resolveAllPending(this.cachedResult);
    }
  }

  private resolveAllPending(result: string[] | null): void {
    const resolvers = this.pendingResolvers.splice(0);
    for (const resolve of resolvers) {
      resolve(result);
    }
  }
}
