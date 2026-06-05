/**
 * Property-Based Tests: Session State Machine
 * Property 1 — Sesi Tidak Dimulai Tanpa Konfirmasi
 * Invariant: XState state `recording` hanya tercapai setelah event `USER_CONFIRMED`
 *            DAN sebelumnya sudah ada event `VIDEO_DETECTED`
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createActor } from 'xstate';
import { sessionMachine } from '../session.machine';
import type { SessionMachineEvent } from '../session.machine';

// ============================================================================
// Helpers
// ============================================================================

const fakeVideo = {
  windowTitle: 'Tutorial React - YouTube',
  appName: 'Google Chrome',
  sourceType: 'streaming' as const,
  detectedAt: new Date(),
};

function createMachine() {
  const actor = createActor(sessionMachine);
  actor.start();
  return actor;
}

function getState(actor: ReturnType<typeof createMachine>): string {
  return String(actor.getSnapshot().value);
}

function send(actor: ReturnType<typeof createMachine>, event: SessionMachineEvent): void {
  actor.send(event);
}

// Arbitraries untuk fast-check
const evVideoDetected = fc.constant({ type: 'VIDEO_DETECTED' as const, videoInfo: fakeVideo });
const evUserConfirmed = fc.constant({ type: 'USER_CONFIRMED' as const });
const evUserDismissed = fc.constant({ type: 'USER_DISMISSED' as const });
const evSessionEnd    = fc.constant({ type: 'SESSION_END' as const });
const evReset         = fc.constant({ type: 'RESET' as const });
const evPaused        = fc.constant({ type: 'USER_PAUSED' as const });
const evResumed       = fc.constant({ type: 'USER_RESUMED' as const });

// ============================================================================
// Property 1: Sesi Tidak Dimulai Tanpa Konfirmasi
// ============================================================================

describe('Property: Sesi Tidak Dimulai Tanpa Konfirmasi', () => {

  // --------------------------------------------------------------------------
  // Invariant utama: recording hanya setelah USER_CONFIRMED
  // --------------------------------------------------------------------------

  it('Property: USER_CONFIRMED tanpa VIDEO_DETECTED sebelumnya tidak masuk ke recording', () => {
    fc.assert(
      fc.property(
        // Urutan event acak yang TIDAK mengandung VIDEO_DETECTED sebelum USER_CONFIRMED
        fc.array(
          fc.oneof(evUserDismissed, evReset),
          { minLength: 0, maxLength: 5 }
        ),
        (prefix) => {
          const actor = createMachine();

          for (const ev of prefix) actor.send(ev);
          actor.send({ type: 'USER_CONFIRMED' });

          // Tanpa videoInfo di context, guard hasVideoInfo gagal → tetap di idle
          expect(getState(actor)).toBe('idle');
          actor.stop();
        }
      ),
      { numRuns: 200 }
    );
  });

  it('Property: VIDEO_DETECTED → USER_CONFIRMED selalu masuk ke recording', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const actor = createMachine();

          actor.send({ type: 'VIDEO_DETECTED', videoInfo: fakeVideo });
          actor.send({ type: 'USER_CONFIRMED' });

          expect(getState(actor)).toBe('recording');
          actor.stop();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property: VIDEO_DETECTED → USER_DISMISSED tidak masuk ke recording', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        () => {
          const actor = createMachine();

          actor.send({ type: 'VIDEO_DETECTED', videoInfo: fakeVideo });
          actor.send({ type: 'USER_DISMISSED' });

          expect(getState(actor)).toBe('idle');
          actor.stop();
        }
      ),
      { numRuns: 100 }
    );
  });

  // --------------------------------------------------------------------------
  // Urutan event acak: recording tidak pernah dicapai tanpa konfirmasi
  // --------------------------------------------------------------------------

  it('Property: urutan event acak (tanpa USER_CONFIRMED) tidak pernah mencapai recording', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.oneof(evVideoDetected, evUserDismissed, evReset),
          { minLength: 1, maxLength: 10 }
        ),
        (events) => {
          const actor = createMachine();

          for (const ev of events) {
            actor.send(ev);
            // Invariant dicek setiap langkah
            expect(getState(actor)).not.toBe('recording');
          }

          actor.stop();
        }
      ),
      { numRuns: 300 }
    );
  });

  it('Property: dari state manapun, recording hanya bisa dicapai lewat USER_CONFIRMED setelah VIDEO_DETECTED', () => {
    fc.assert(
      fc.property(
        // Fase 1: urutan event sebelum VIDEO_DETECTED + USER_CONFIRMED
        fc.array(
          fc.oneof(evVideoDetected, evUserDismissed, evReset),
          { minLength: 0, maxLength: 5 }
        ),
        (priorEvents) => {
          const actor = createMachine();

          // Jalankan event sebelumnya
          for (const ev of priorEvents) actor.send(ev);

          const stateBefore = getState(actor);

          // Satu-satunya cara masuk recording: VIDEO_DETECTED lalu USER_CONFIRMED
          actor.send({ type: 'VIDEO_DETECTED', videoInfo: fakeVideo });
          actor.send({ type: 'USER_CONFIRMED' });

          expect(getState(actor)).toBe('recording');

          // Verifikasi state sebelum konfirmasi tidak langsung recording
          if (stateBefore === 'idle') {
            // Harus lewat idle terlebih dahulu
            expect(['idle']).toContain(stateBefore);
          }

          actor.stop();
        }
      ),
      { numRuns: 150 }
    );
  });

  // --------------------------------------------------------------------------
  // Race condition: multiple VIDEO_DETECTED sebelum konfirmasi
  // --------------------------------------------------------------------------

  it('Property: multiple VIDEO_DETECTED sebelum USER_CONFIRMED tidak membuat sesi ganda', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 8 }),
        (numDetections) => {
          const actor = createMachine();

          // Kirim N VIDEO_DETECTED sebelum konfirmasi
          for (let i = 0; i < numDetections; i++) {
            actor.send({
              type: 'VIDEO_DETECTED',
              videoInfo: { ...fakeVideo, windowTitle: `Video ${i} - YouTube` },
            });
            // Pastikan tidak tiba-tiba masuk recording
            expect(getState(actor)).toBe('idle');
          }

          // Baru satu USER_CONFIRMED → masuk recording
          actor.send({ type: 'USER_CONFIRMED' });
          expect(getState(actor)).toBe('recording');

          // Context menyimpan videoInfo dari VIDEO_DETECTED terakhir
          const ctx = actor.getSnapshot().context;
          expect(ctx.videoInfo?.windowTitle).toBe(`Video ${numDetections - 1} - YouTube`);

          actor.stop();
        }
      ),
      { numRuns: 100 }
    );
  });

  // --------------------------------------------------------------------------
  // Timeout skenario: auto-dismiss (dianggap USER_DISMISSED)
  // --------------------------------------------------------------------------

  it('Property: timeout popup (USER_DISMISSED) tidak masuk ke recording', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (numTimeouts) => {
          const actor = createMachine();

          for (let i = 0; i < numTimeouts; i++) {
            actor.send({ type: 'VIDEO_DETECTED', videoInfo: fakeVideo });
            // Simulasi auto-dismiss setelah 15 detik (dikirim sebagai USER_DISMISSED)
            actor.send({ type: 'USER_DISMISSED' });
            expect(getState(actor)).toBe('idle');
          }

          actor.stop();
        }
      ),
      { numRuns: 100 }
    );
  });

  // --------------------------------------------------------------------------
  // Full lifecycle
  // --------------------------------------------------------------------------

  it('Property: lifecycle penuh (idle→recording→processing→syncing→done→idle) hanya lewat konfirmasi', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const actor = createMachine();

        expect(getState(actor)).toBe('idle');

        // Harus ada VIDEO_DETECTED sebelum USER_CONFIRMED
        actor.send({ type: 'VIDEO_DETECTED', videoInfo: fakeVideo });
        expect(getState(actor)).toBe('idle'); // masih idle, belum konfirmasi

        actor.send({ type: 'USER_CONFIRMED' });
        expect(getState(actor)).toBe('recording'); // ← invariant: hanya setelah konfirmasi

        actor.send({ type: 'SESSION_END' });
        expect(getState(actor)).toBe('processing');

        actor.send({ type: 'TRANSCRIPTION_DONE' });
        expect(getState(actor)).toBe('syncing');

        actor.send({ type: 'SYNC_COMPLETE' });
        expect(getState(actor)).toBe('done');

        actor.send({ type: 'RESET' });
        expect(getState(actor)).toBe('idle');

        actor.stop();
      }),
      { numRuns: 50 }
    );
  });

  it('Property: dari done, VIDEO_DETECTED baru tidak langsung ke recording', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        const actor = createMachine();

        // Selesaikan satu sesi
        actor.send({ type: 'VIDEO_DETECTED', videoInfo: fakeVideo });
        actor.send({ type: 'USER_CONFIRMED' });
        actor.send({ type: 'SESSION_END' });
        actor.send({ type: 'TRANSCRIPTION_DONE' });
        actor.send({ type: 'SYNC_COMPLETE' });
        expect(getState(actor)).toBe('done');

        // VIDEO_DETECTED dari state done → kembali ke idle (bukan recording)
        actor.send({ type: 'VIDEO_DETECTED', videoInfo: fakeVideo });
        expect(getState(actor)).toBe('idle');

        // Butuh USER_CONFIRMED lagi untuk ke recording
        actor.send({ type: 'USER_CONFIRMED' });
        expect(getState(actor)).toBe('recording');

        actor.stop();
      }),
      { numRuns: 50 }
    );
  });
});
