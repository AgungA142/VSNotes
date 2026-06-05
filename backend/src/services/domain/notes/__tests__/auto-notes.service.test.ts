import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Note } from '@models/Note';
import { TranscriptSegment } from '@models/TranscriptSegment';
import { Session } from '@models/Session';
import { User } from '@models/User';
import { detectKeyMoments } from '../auto-notes.service';

vi.mock('@services/integrations/text/text.service', () => ({
  generateText: vi.fn(),
}));
vi.mock('@config/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { generateText } from '@services/integrations/text/text.service';

// ============================================================================
// Setup
// ============================================================================

beforeAll(async () => {
  await mongoose.connect('mongodb://127.0.0.1:27017/test-auto-notes-service');
  await Session.ensureIndexes();
  await User.ensureIndexes();
});
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});
beforeEach(async () => {
  await Note.deleteMany({});
  await TranscriptSegment.deleteMany({});
  await Session.deleteMany({});
  await User.deleteMany({});
  vi.clearAllMocks();
});

// ============================================================================
// Helpers
// ============================================================================

async function createFixtures(segmentTexts: string[] = []) {
  const user = await User.create({
    email: `an-${Date.now()}@example.com`,
    passwordHash: 'pw',
    name: 'Test',
  });
  const session = await Session.create({
    userId: user._id,
    videoTitle: 'Test Video',
    sourceApp: 'Chrome',
    sourceType: 'streaming',
    deviceId: 'device-1',
    status: 'active',
  });
  const sessionId = String(session._id);
  const userId = String(user._id);

  for (let i = 0; i < segmentTexts.length; i++) {
    await TranscriptSegment.create({ sessionId, userId, timestampSec: i * 30, text: segmentTexts[i] });
  }
  return { sessionId, userId };
}

function mockMoments(moments: Array<{ timestampSec: number; text: string; reason: string }>) {
  vi.mocked(generateText).mockResolvedValue(JSON.stringify(moments));
}

// ============================================================================
// Berbagai jenis transcript
// ============================================================================

describe('detectKeyMoments() — berbagai jenis transcript', () => {
  it('mendeteksi momen dari transcript edukatif', async () => {
    const { sessionId, userId } = await createFixtures([
      'Hari ini kita belajar tentang algoritma sorting.',
      'BubbleSort bekerja dengan membandingkan elemen berdekatan.',
      'QuickSort jauh lebih efisien dengan kompleksitas O(n log n).',
    ]);
    mockMoments([
      { timestampSec: 0, text: 'Pengenalan algoritma sorting.', reason: 'Konteks pembahasan' },
      { timestampSec: 60, text: 'QuickSort O(n log n).', reason: 'Konsep inti' },
    ]);

    const count = await detectKeyMoments(sessionId, userId);

    expect(count).toBe(2);
    const notes = await Note.find({ sessionId, type: 'auto' });
    expect(notes).toHaveLength(2);
    expect(notes[0].text).toBe('Pengenalan algoritma sorting.');
    expect(notes[1].timestampSec).toBe(60);
  });

  it('mendeteksi momen dari transcript hiburan/entertainment', async () => {
    const { sessionId, userId } = await createFixtures([
      'Film ini dibuka dengan adegan aksi yang spektakuler.',
      'Karakter utama diperkenalkan dengan latar belakang misterius.',
      'Plot twist di akhir babak kedua mengejutkan semua penonton.',
    ]);
    mockMoments([
      { timestampSec: 30, text: 'Pengenalan karakter utama.', reason: 'Karakter penting' },
      { timestampSec: 60, text: 'Plot twist di babak dua.', reason: 'Momen kunci cerita' },
    ]);

    const count = await detectKeyMoments(sessionId, userId);

    expect(count).toBe(2);
    const notes = await Note.find({ sessionId, type: 'auto' });
    expect(notes.every((n) => n.type === 'auto')).toBe(true);
  });

  it('mendeteksi momen dari transcript teknikal', async () => {
    const { sessionId, userId } = await createFixtures([
      'Kita akan setup Docker container untuk deployment.',
      'Konfigurasi nginx sebagai reverse proxy diperlukan.',
      'SSL certificate dari Let\'s Encrypt memastikan keamanan koneksi.',
    ]);
    mockMoments([
      { timestampSec: 0, text: 'Setup Docker container.', reason: 'Langkah awal deployment' },
      { timestampSec: 30, text: 'Konfigurasi nginx reverse proxy.', reason: 'Infrastruktur penting' },
      { timestampSec: 60, text: 'SSL certificate Let\'s Encrypt.', reason: 'Keamanan' },
    ]);

    const count = await detectKeyMoments(sessionId, userId);

    expect(count).toBe(3);
  });

  it('memformat prompt dengan baris transkrip bergaya [timestampSec] text', async () => {
    const { sessionId, userId } = await createFixtures([
      'Segmen pertama.',
      'Segmen kedua.',
      'Segmen ketiga.',
    ]);
    mockMoments([{ timestampSec: 0, text: 'Segmen penting.', reason: 'Test' }]);

    await detectKeyMoments(sessionId, userId);

    const prompt = vi.mocked(generateText).mock.calls[0][0] as string;
    expect(prompt).toContain('[0s] Segmen pertama.');
    expect(prompt).toContain('[30s] Segmen kedua.');
    expect(prompt).toContain('[60s] Segmen ketiga.');
  });
});

// ============================================================================
// Fallback saat Gemini error
// ============================================================================

describe('detectKeyMoments() — fallback saat AI error', () => {
  it('mengembalikan 0 dan tidak membuat catatan saat Gemini timeout', async () => {
    const { sessionId, userId } = await createFixtures([
      'Segmen pertama.', 'Segmen kedua.', 'Segmen ketiga.',
    ]);
    vi.mocked(generateText).mockRejectedValue(new Error('Gemini API timeout'));

    const count = await detectKeyMoments(sessionId, userId);

    expect(count).toBe(0);
    expect(await Note.countDocuments({ sessionId })).toBe(0);
  });

  it('mengembalikan 0 saat response JSON tidak valid', async () => {
    const { sessionId, userId } = await createFixtures([
      'Segmen pertama.', 'Segmen kedua.',
    ]);
    vi.mocked(generateText).mockResolvedValue('Ini bukan JSON valid sama sekali');

    const count = await detectKeyMoments(sessionId, userId);

    expect(count).toBe(0);
    expect(await Note.countDocuments({ sessionId })).toBe(0);
  });

  it('mengembalikan 0 saat response array kosong', async () => {
    const { sessionId, userId } = await createFixtures([
      'Segmen pertama.', 'Segmen kedua.',
    ]);
    vi.mocked(generateText).mockResolvedValue('[]');

    const count = await detectKeyMoments(sessionId, userId);

    expect(count).toBe(0);
  });

  it('mengembalikan 0 saat sesi tidak ditemukan (sudah dihapus)', async () => {
    const fakeSessionId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId().toString();

    const count = await detectKeyMoments(fakeSessionId, userId);

    expect(count).toBe(0);
    expect(generateText).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Handling transcript pendek (< 2 segmen)
// ============================================================================

describe('detectKeyMoments() — transcript pendek', () => {
  it('melewati deteksi jika tidak ada segmen baru', async () => {
    const { sessionId, userId } = await createFixtures([]);

    const count = await detectKeyMoments(sessionId, userId);

    expect(count).toBe(0);
    expect(generateText).not.toHaveBeenCalled();
  });

  it('melewati deteksi jika hanya ada 1 segmen (kurang dari minimum 2)', async () => {
    const { sessionId, userId } = await createFixtures(['Hanya satu segmen.']);

    const count = await detectKeyMoments(sessionId, userId);

    expect(count).toBe(0);
    expect(generateText).not.toHaveBeenCalled();
  });

  it('memproses jika tepat 2 segmen (batas minimum)', async () => {
    const { sessionId, userId } = await createFixtures([
      'Segmen pertama yang cukup panjang.',
      'Segmen kedua melengkapi informasi.',
    ]);
    mockMoments([{ timestampSec: 0, text: 'Momen penting.', reason: 'Alasan' }]);

    const count = await detectKeyMoments(sessionId, userId);

    expect(count).toBe(1);
    expect(generateText).toHaveBeenCalledOnce();
  });

  it('tidak memproses segmen yang sudah pernah diproses sebelumnya', async () => {
    const { sessionId, userId } = await createFixtures([
      'Segmen lama 1.',
      'Segmen lama 2.',
      'Segmen lama 3.',
    ]);
    // Simulasi: sudah ada auto-note dari sebelumnya
    await Note.create({
      sessionId, userId, timestampSec: 60, text: 'Catatan lama', type: 'auto',
    });
    // Tidak ada segmen baru (semua sudah diproses) → hanya ada 0 segmen baru
    mockMoments([{ timestampSec: 0, text: 'Tidak akan dibuat.', reason: '-' }]);

    const count = await detectKeyMoments(sessionId, userId);

    // Segmen yang sudah ada tidak diproses ulang
    expect(generateText).not.toHaveBeenCalled();
    expect(count).toBe(0);
  });
});
