/**
 * Property-Based Tests: Export Engine
 * Property 5 — Ekspor Mengandung Semua Catatan Sesi
 * Invariant: notes_in_export(sessionId) == notes_in_db(sessionId)
 *            untuk semua format (MD, TXT, PDF/HTML)
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { Session } from '@models/Session';
import { Note } from '@models/Note';
import { Summary } from '@models/Summary';
import { User } from '@models/User';
import { exportSession } from '../export.service';

// Mock Puppeteer — tidak perlu launch Chromium nyata untuk property test
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn().mockResolvedValue({
      newPage: vi.fn().mockResolvedValue({
        setContent: vi.fn(),
        pdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-fake')),
      }),
      close: vi.fn(),
    }),
  },
}));

vi.mock('@config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ============================================================================
// Setup
// ============================================================================

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/test-export-pbt');
  await Session.ensureIndexes();
  await User.ensureIndexes();
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

beforeEach(async () => {
  await Note.deleteMany({});
  await Summary.deleteMany({});
  await Session.deleteMany({});
  await User.deleteMany({});
  vi.clearAllMocks();
});

// ============================================================================
// Helpers
// ============================================================================

async function createFixtures(noteCount: number, hasSummary = false) {
  const user = await User.create({
    email: `exp-${Date.now()}-${Math.random()}@test.com`,
    passwordHash: 'pw',
    name: 'Test',
  });
  const session = await Session.create({
    userId: user._id,
    videoTitle: 'Test Video',
    sourceApp: 'Chrome',
    sourceType: 'streaming',
    deviceId: 'device-1',
    status: 'completed',
    durationSec: noteCount * 30 + 60,
  });
  const sessionId = String(session._id);
  const userId = String(user._id);

  for (let i = 0; i < noteCount; i++) {
    await Note.create({
      sessionId,
      userId,
      timestampSec: i * 30,
      text: `Catatan nomor ${i + 1} tentang topik penting.`,
      type: i % 2 === 0 ? 'auto' : 'manual',
    });
  }

  if (hasSummary) {
    await Summary.create({
      sessionId,
      userId,
      content: 'Rangkuman singkat dari video ini.',
      keyPoints: ['Poin pertama', 'Poin kedua'],
      lengthPref: 'medium',
    });
  }

  return { sessionId, userId };
}

/**
 * Hitung note di output Markdown.
 * Pola: `- \`[HH:MM:SS]\` teks`
 */
function countNotesInMarkdown(content: string): number {
  const matches = content.match(/^- `\[[\d:]+\]`/gm);
  return matches?.length ?? 0;
}

/**
 * Hitung note di output TXT.
 * Pola: `[HH:MM:SS] teks` (di dalam seksi CATATAN)
 */
function countNotesInTxt(content: string): number {
  const matches = content.match(/^\[[\d:]+\] .+/gm);
  return matches?.length ?? 0;
}

/**
 * Hitung note di HTML (untuk PDF path).
 * Pola: `<li><span class="ts">[HH:MM:SS]</span>`
 */
function countNotesInHtml(html: string): number {
  const matches = html.match(/<li><span class="ts">/g);
  return matches?.length ?? 0;
}

// ============================================================================
// Property 5: Ekspor Mengandung Semua Catatan Sesi
// ============================================================================

describe('Property: Ekspor Mengandung Semua Catatan Sesi', () => {

  // --------------------------------------------------------------------------
  // Format Markdown
  // --------------------------------------------------------------------------

  it('Property: MD — jumlah note di ekspor == jumlah note di DB', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 20 }),
        fc.boolean(),
        async (noteCount, hasSummary) => {
          await Note.deleteMany({});
          await Summary.deleteMany({});
          await Session.deleteMany({});
          await User.deleteMany({});

          const { sessionId, userId } = await createFixtures(noteCount, hasSummary);
          const notesInDb = await Note.countDocuments({ sessionId });

          const result = await exportSession(sessionId, userId, 'md');
          expect(result.kind).toBe('text');

          if (result.kind === 'text') {
            const notesInExport = countNotesInMarkdown(result.content);
            expect(notesInExport).toBe(notesInDb);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  // --------------------------------------------------------------------------
  // Format TXT
  // --------------------------------------------------------------------------

  it('Property: TXT — jumlah note di ekspor == jumlah note di DB', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 20 }),
        fc.boolean(),
        async (noteCount, hasSummary) => {
          await Note.deleteMany({});
          await Summary.deleteMany({});
          await Session.deleteMany({});
          await User.deleteMany({});

          const { sessionId, userId } = await createFixtures(noteCount, hasSummary);
          const notesInDb = await Note.countDocuments({ sessionId });

          const result = await exportSession(sessionId, userId, 'txt');
          expect(result.kind).toBe('text');

          if (result.kind === 'text') {
            const notesInExport = countNotesInTxt(result.content);
            expect(notesInExport).toBe(notesInDb);
          }
        }
      ),
      { numRuns: 25 }
    );
  });

  // --------------------------------------------------------------------------
  // Format PDF (via HTML builder — Puppeteer di-mock)
  // --------------------------------------------------------------------------

  it('Property: PDF/HTML — jumlah note di HTML template == jumlah note di DB', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 20 }),
        fc.boolean(),
        async (noteCount, hasSummary) => {
          await Note.deleteMany({});
          await Summary.deleteMany({});
          await Session.deleteMany({});
          await User.deleteMany({});

          const { sessionId, userId } = await createFixtures(noteCount, hasSummary);
          const notesInDb = await Note.countDocuments({ sessionId });

          // Intercept HTML yang dikirim ke Puppeteer
          let capturedHtml = '';
          const puppeteer = await import('puppeteer');
          vi.mocked(puppeteer.default.launch).mockResolvedValue({
            newPage: vi.fn().mockResolvedValue({
              setContent: vi.fn().mockImplementation((html: string) => {
                capturedHtml = html;
              }),
              pdf: vi.fn().mockResolvedValue(Buffer.from('%PDF-fake')),
            }),
            close: vi.fn(),
          } as never);

          await exportSession(sessionId, userId, 'pdf');

          const notesInHtml = countNotesInHtml(capturedHtml);
          expect(notesInHtml).toBe(notesInDb);
        }
      ),
      { numRuns: 20 }
    );
  });

  // --------------------------------------------------------------------------
  // Edge cases
  // --------------------------------------------------------------------------

  it('sesi tanpa catatan — semua format menghasilkan 0 catatan di ekspor', async () => {
    const { sessionId, userId } = await createFixtures(0, true);

    const [md, txt] = await Promise.all([
      exportSession(sessionId, userId, 'md'),
      exportSession(sessionId, userId, 'txt'),
    ]);

    expect(md.kind === 'text' && countNotesInMarkdown(md.content)).toBe(0);
    expect(txt.kind === 'text' && countNotesInTxt(txt.content)).toBe(0);
  });

  it('sesi tanpa rangkuman — notes tetap lengkap di ekspor', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (noteCount) => {
          await Note.deleteMany({});
          await Session.deleteMany({});
          await User.deleteMany({});

          const { sessionId, userId } = await createFixtures(noteCount, false); // tanpa summary
          const notesInDb = await Note.countDocuments({ sessionId });

          const mdResult = await exportSession(sessionId, userId, 'md');
          const txtResult = await exportSession(sessionId, userId, 'txt');

          expect(mdResult.kind === 'text' && countNotesInMarkdown(mdResult.content)).toBe(notesInDb);
          expect(txtResult.kind === 'text' && countNotesInTxt(txtResult.content)).toBe(notesInDb);
        }
      ),
      { numRuns: 15 }
    );
  });

  it('Property: banyak catatan (25–100) — tidak ada catatan yang terlewat di MD dan TXT', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 25, max: 100 }),
        async (noteCount) => {
          await Note.deleteMany({});
          await Session.deleteMany({});
          await User.deleteMany({});

          const { sessionId, userId } = await createFixtures(noteCount, true);
          const notesInDb = await Note.countDocuments({ sessionId });

          const [md, txt] = await Promise.all([
            exportSession(sessionId, userId, 'md'),
            exportSession(sessionId, userId, 'txt'),
          ]);

          expect(md.kind === 'text' && countNotesInMarkdown(md.content)).toBe(notesInDb);
          expect(txt.kind === 'text' && countNotesInTxt(txt.content)).toBe(notesInDb);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('auto notes dan manual notes keduanya muncul di ekspor', async () => {
    const { sessionId, userId } = await createFixtures(6, false); // 3 auto, 3 manual

    const [md, txt] = await Promise.all([
      exportSession(sessionId, userId, 'md'),
      exportSession(sessionId, userId, 'txt'),
    ]);

    const autoCount = await Note.countDocuments({ sessionId, type: 'auto' });
    const manualCount = await Note.countDocuments({ sessionId, type: 'manual' });

    if (md.kind === 'text') {
      // Markdown mengelompokkan ke "### Otomatis" dan "### Manual"
      expect(md.content).toContain('### Otomatis');
      expect(md.content).toContain('### Manual');
      expect(countNotesInMarkdown(md.content)).toBe(autoCount + manualCount);
    }
    if (txt.kind === 'text') {
      // TXT mengelompokkan ke "[Otomatis]" dan "[Manual]"
      expect(txt.content).toContain('[Otomatis]');
      expect(txt.content).toContain('[Manual]');
      expect(countNotesInTxt(txt.content)).toBe(autoCount + manualCount);
    }
  });

  it('404 jika sesi tidak ditemukan', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId().toString();

    await expect(exportSession(fakeId, userId, 'md')).rejects.toMatchObject({
      statusCode: 404,
      code: 'SESSION_NOT_FOUND',
    });
  });
});
