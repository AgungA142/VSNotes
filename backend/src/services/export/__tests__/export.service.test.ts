import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Session } from '@models/Session';
import { Note } from '@models/Note';
import { Summary } from '@models/Summary';
import { User } from '@models/User';
import { exportSession } from '../export.service';

const { mockClose, mockPdf, mockSetContent, mockLaunch } = vi.hoisted(() => {
  const mockClose = vi.fn();
  const mockPdf = vi.fn().mockResolvedValue(Buffer.from('%PDF-test'));
  const mockSetContent = vi.fn().mockResolvedValue(undefined);
  const mockNewPage = vi.fn().mockResolvedValue({ setContent: mockSetContent, pdf: mockPdf });
  const mockLaunch = vi.fn().mockResolvedValue({ newPage: mockNewPage, close: mockClose });
  return { mockClose, mockPdf, mockSetContent, mockLaunch };
});

vi.mock('puppeteer', () => ({
  default: { launch: mockLaunch },
}));

vi.mock('@config/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ============================================================================
// Setup
// ============================================================================

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/test-export-unit');
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

async function setup(opts: {
  videoTitle?: string;
  notes?: Array<{ text: string; timestampSec: number; type: 'auto' | 'manual' }>;
  summary?: { content: string; keyPoints: string[] } | null;
  durationSec?: number;
}) {
  const user = await User.create({
    email: `ex-${Date.now()}@test.com`,
    passwordHash: 'pw',
    name: 'Test',
  });
  const session = await Session.create({
    userId: user._id,
    videoTitle: opts.videoTitle ?? 'Tutorial React Hooks',
    sourceApp: 'Google Chrome',
    sourceType: 'streaming',
    deviceId: 'device-1',
    status: 'completed',
    durationSec: opts.durationSec ?? 3600,
    startedAt: new Date('2026-01-15T10:00:00Z'),
  });
  const sessionId = String(session._id);
  const userId = String(user._id);

  for (const n of opts.notes ?? []) {
    await Note.create({ sessionId, userId, ...n });
  }

  if (opts.summary !== null && opts.summary !== undefined) {
    await Summary.create({ sessionId, userId, ...opts.summary, lengthPref: 'medium' });
  }

  return { sessionId, userId };
}

// ============================================================================
// Markdown output
// ============================================================================

describe('exportSession() — Markdown format', () => {
  it('menyertakan judul video di header', async () => {
    const { sessionId, userId } = await setup({ videoTitle: 'Belajar TypeScript Dasar' });

    const result = await exportSession(sessionId, userId, 'md');

    expect(result.kind).toBe('text');
    if (result.kind === 'text') {
      expect(result.content).toContain('# Belajar TypeScript Dasar');
    }
  });

  it('menyertakan metadata sumber, tanggal, dan durasi', async () => {
    const { sessionId, userId } = await setup({ durationSec: 5400 });

    const result = await exportSession(sessionId, userId, 'md');

    if (result.kind === 'text') {
      expect(result.content).toContain('**Sumber:**');
      expect(result.content).toContain('Google Chrome');
      expect(result.content).toContain('**Tanggal:**');
      expect(result.content).toContain('**Durasi:**');
      expect(result.content).toContain('01:30:00'); // 5400s = 1h30m
    }
  });

  it('menyertakan seksi rangkuman saat summary ada', async () => {
    const { sessionId, userId } = await setup({
      summary: { content: 'Ini adalah rangkuman.', keyPoints: ['Poin A', 'Poin B'] },
    });

    const result = await exportSession(sessionId, userId, 'md');

    if (result.kind === 'text') {
      expect(result.content).toContain('## Rangkuman');
      expect(result.content).toContain('Ini adalah rangkuman.');
      expect(result.content).toContain('## Poin Utama');
      expect(result.content).toContain('- Poin A');
      expect(result.content).toContain('- Poin B');
    }
  });

  it('tidak menyertakan seksi rangkuman jika summary null', async () => {
    const { sessionId, userId } = await setup({ summary: null });

    const result = await exportSession(sessionId, userId, 'md');

    if (result.kind === 'text') {
      expect(result.content).not.toContain('## Rangkuman');
      expect(result.content).not.toContain('## Poin Utama');
    }
  });

  it('format note: `- \\`[HH:MM:SS]\\` teks`', async () => {
    const { sessionId, userId } = await setup({
      notes: [{ text: 'Konsep penting', timestampSec: 125, type: 'manual' }],
    });

    const result = await exportSession(sessionId, userId, 'md');

    if (result.kind === 'text') {
      expect(result.content).toContain('- `[00:02:05]` Konsep penting');
    }
  });

  it('memisahkan auto notes dan manual notes ke subseksi berbeda', async () => {
    const { sessionId, userId } = await setup({
      notes: [
        { text: 'Auto note 1', timestampSec: 0, type: 'auto' },
        { text: 'Manual note 1', timestampSec: 60, type: 'manual' },
      ],
    });

    const result = await exportSession(sessionId, userId, 'md');

    if (result.kind === 'text') {
      expect(result.content).toContain('### Otomatis');
      expect(result.content).toContain('### Manual');
      // Otomatis sebelum Manual
      const autoIdx = result.content.indexOf('### Otomatis');
      const manualIdx = result.content.indexOf('### Manual');
      expect(autoIdx).toBeLessThan(manualIdx);
    }
  });

  it('tidak menyertakan seksi catatan jika tidak ada notes', async () => {
    const { sessionId, userId } = await setup({ notes: [] });

    const result = await exportSession(sessionId, userId, 'md');

    if (result.kind === 'text') {
      expect(result.content).not.toContain('## Catatan');
    }
  });

  it('diakhiri newline (file yang valid)', async () => {
    const { sessionId, userId } = await setup({});

    const result = await exportSession(sessionId, userId, 'md');

    if (result.kind === 'text') {
      expect(result.content.endsWith('\n')).toBe(true);
    }
  });

  it('mimeType dan filename benar', async () => {
    const { sessionId, userId } = await setup({ videoTitle: 'Tutorial React' });

    const result = await exportSession(sessionId, userId, 'md');

    expect(result.mimeType).toContain('text/markdown');
    expect(result.filename).toMatch(/Tutorial React-\d{4}-\d{2}-\d{2}\.md$/);
  });
});

// ============================================================================
// TXT output
// ============================================================================

describe('exportSession() — TXT format', () => {
  it('menyertakan judul video di header', async () => {
    const { sessionId, userId } = await setup({ videoTitle: 'Intro to Docker' });

    const result = await exportSession(sessionId, userId, 'txt');

    if (result.kind === 'text') {
      expect(result.content.startsWith('Intro to Docker')).toBe(true);
    }
  });

  it('seksi RANGKUMAN muncul jika summary ada', async () => {
    const { sessionId, userId } = await setup({
      summary: { content: 'Rangkuman singkat.', keyPoints: ['K1'] },
    });

    const result = await exportSession(sessionId, userId, 'txt');

    if (result.kind === 'text') {
      expect(result.content).toContain('RANGKUMAN');
      expect(result.content).toContain('POIN UTAMA');
      expect(result.content).toContain('* K1');
    }
  });

  it('format note TXT: `[HH:MM:SS] teks`', async () => {
    const { sessionId, userId } = await setup({
      notes: [{ text: 'Poin penting', timestampSec: 3661, type: 'auto' }],
    });

    const result = await exportSession(sessionId, userId, 'txt');

    if (result.kind === 'text') {
      expect(result.content).toContain('[01:01:01] Poin penting');
    }
  });

  it('seksi [Otomatis] dan [Manual] dipisah', async () => {
    const { sessionId, userId } = await setup({
      notes: [
        { text: 'Auto', timestampSec: 10, type: 'auto' },
        { text: 'Manual', timestampSec: 20, type: 'manual' },
      ],
    });

    const result = await exportSession(sessionId, userId, 'txt');

    if (result.kind === 'text') {
      expect(result.content).toContain('[Otomatis]');
      expect(result.content).toContain('[Manual]');
    }
  });

  it('valid jika tidak ada catatan dan tidak ada rangkuman', async () => {
    const { sessionId, userId } = await setup({ notes: [], summary: null });

    const result = await exportSession(sessionId, userId, 'txt');

    expect(result.kind).toBe('text');
    if (result.kind === 'text') {
      expect(result.content).toBeTruthy();
      expect(result.content.endsWith('\n')).toBe(true);
      expect(result.content).not.toContain('RANGKUMAN');
      expect(result.content).not.toContain('CATATAN');
    }
  });

  it('mimeType dan filename benar', async () => {
    const { sessionId, userId } = await setup({ videoTitle: 'Test Video' });

    const result = await exportSession(sessionId, userId, 'txt');

    expect(result.mimeType).toContain('text/plain');
    expect(result.filename).toMatch(/\.txt$/);
  });
});

// ============================================================================
// PDF generation flow
// ============================================================================

describe('exportSession() — PDF format', () => {
  beforeEach(() => {
    mockPdf.mockResolvedValue(Buffer.from('%PDF-test'));
    mockSetContent.mockResolvedValue(undefined);
  });

  it('memanggil Puppeteer dan mengembalikan buffer binary', async () => {
    const { sessionId, userId } = await setup({ summary: null });

    const result = await exportSession(sessionId, userId, 'pdf');

    expect(mockLaunch).toHaveBeenCalledOnce();
    expect(result.kind).toBe('binary');
    if (result.kind === 'binary') {
      expect(Buffer.isBuffer(result.buffer)).toBe(true);
    }
  });

  it('HTML yang dikirim ke Puppeteer mengandung judul video', async () => {
    const { sessionId, userId } = await setup({ videoTitle: 'Machine Learning Basics' });

    let capturedHtml = '';
    mockSetContent.mockImplementation((html: string) => { capturedHtml = html; });

    await exportSession(sessionId, userId, 'pdf');

    expect(capturedHtml).toContain('Machine Learning Basics');
  });

  it('menutup browser setelah selesai (resource cleanup)', async () => {
    const { sessionId, userId } = await setup({});

    await exportSession(sessionId, userId, 'pdf');

    expect(mockClose).toHaveBeenCalledOnce();
  });

  it('melempar error saat PDF generation gagal dan tetap menutup browser', async () => {
    const { sessionId, userId } = await setup({});
    mockPdf.mockRejectedValue(new Error('Chromium crash'));

    let thrown: Error | undefined;
    try {
      await exportSession(sessionId, userId, 'pdf');
    } catch (e) {
      thrown = e as Error;
    }

    expect(thrown).toBeDefined();
    expect((thrown as { statusCode?: number }).statusCode).toBe(500);
    expect((thrown as { code?: string }).code).toBe('PDF_GENERATION_FAILED');
    // finally block tetap dipanggil meski error
    expect(mockClose).toHaveBeenCalledOnce();
  });

  it('mimeType dan filename benar untuk PDF', async () => {
    const { sessionId, userId } = await setup({ videoTitle: 'Python Dasar' });

    const result = await exportSession(sessionId, userId, 'pdf');

    expect(result.mimeType).toBe('application/pdf');
    expect(result.filename).toMatch(/Python Dasar-\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});

// ============================================================================
// Filename sanitization
// ============================================================================

describe('filename sanitization', () => {
  it('mengganti karakter tidak valid dengan underscore', async () => {
    const { sessionId, userId } = await setup({
      videoTitle: 'Video: "Penting" <Tutorial> | Part/1',
    });

    const result = await exportSession(sessionId, userId, 'md');

    // Karakter :, ", <, >, |, / diganti _
    expect(result.filename).not.toMatch(/[:"/\\|?*<>]/);
    expect(result.filename).toContain('_');
  });

  it('memotong nama file jika lebih dari 80 karakter', async () => {
    const longTitle = 'A'.repeat(100);
    const { sessionId, userId } = await setup({ videoTitle: longTitle });

    const result = await exportSession(sessionId, userId, 'md');

    // Base name maks 80 char + tanggal + ekstensi
    const basePart = result.filename.replace(/-\d{4}-\d{2}-\d{2}\.\w+$/, '');
    expect(basePart.length).toBeLessThanOrEqual(80);
  });

  it('nama file mengandung tanggal sesi (YYYY-MM-DD)', async () => {
    const { sessionId, userId } = await setup({ videoTitle: 'Test' });

    const result = await exportSession(sessionId, userId, 'txt');

    expect(result.filename).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});

// ============================================================================
// Error handling
// ============================================================================

describe('error handling', () => {
  it('melempar 404 jika sesi tidak ditemukan', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId().toString();

    await expect(exportSession(fakeId, userId, 'md')).rejects.toMatchObject({
      statusCode: 404,
      code: 'SESSION_NOT_FOUND',
    });
  });

  it('sesi milik user lain tidak bisa diekspor (data isolation)', async () => {
    const { sessionId } = await setup({});
    const otherUserId = new mongoose.Types.ObjectId().toString();

    await expect(exportSession(sessionId, otherUserId, 'md')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
