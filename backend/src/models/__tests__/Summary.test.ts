import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Summary } from '../Summary';
import { User } from '../User';
import { Session } from '../Session';

describe('Summary Model', () => {
  let userId: mongoose.Types.ObjectId;
  let sessionId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/test-summaries');
    await Session.ensureIndexes();
    await User.ensureIndexes();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Summary.deleteMany({});
    await Session.deleteMany({});
    await User.deleteMany({});

    const user = await User.create({
      email: 'summary-test@example.com',
      passwordHash: 'hashedpassword123',
      name: 'Summary Test User',
    });
    userId = user._id as mongoose.Types.ObjectId;

    const session = await Session.create({
      userId,
      videoTitle: 'Test Video',
      sourceApp: 'Google Chrome',
      sourceType: 'streaming',
      deviceId: 'device-123',
    });
    sessionId = session._id as mongoose.Types.ObjectId;
  });

  it('should create a summary with required fields', async () => {
    const summary = await Summary.create({
      sessionId,
      userId,
      content: 'Ini adalah rangkuman video.',
      keyPoints: ['Poin pertama', 'Poin kedua'],
      lengthPref: 'medium',
    });

    expect(summary._id).toBeDefined();
    expect(summary.sessionId.toString()).toBe(sessionId.toString());
    expect(summary.userId.toString()).toBe(userId.toString());
    expect(summary.content).toBe('Ini adalah rangkuman video.');
    expect(summary.keyPoints).toEqual(['Poin pertama', 'Poin kedua']);
    expect(summary.lengthPref).toBe('medium');
    expect(summary.createdAt).toBeDefined();
  });

  it('should use default lengthPref "medium" when not provided', async () => {
    const summary = await Summary.create({
      sessionId,
      userId,
      content: 'Rangkuman dengan lengthPref default.',
    });

    expect(summary.lengthPref).toBe('medium');
  });

  it('should use default empty array for keyPoints when not provided', async () => {
    const summary = await Summary.create({
      sessionId,
      userId,
      content: 'Rangkuman tanpa keyPoints.',
    });

    expect(summary.keyPoints).toEqual([]);
  });

  it('should allow lengthPref "short"', async () => {
    const summary = await Summary.create({
      sessionId,
      userId,
      content: 'Rangkuman singkat.',
      lengthPref: 'short',
    });

    expect(summary.lengthPref).toBe('short');
  });

  it('should allow lengthPref "long"', async () => {
    const summary = await Summary.create({
      sessionId,
      userId,
      content: 'Rangkuman panjang dan detail.',
      lengthPref: 'long',
    });

    expect(summary.lengthPref).toBe('long');
  });

  it('should reject invalid lengthPref enum', async () => {
    const summary = new Summary({
      sessionId,
      userId,
      content: 'Rangkuman dengan panjang tidak valid.',
      lengthPref: 'extra-long' as any,
    });

    await expect(summary.save()).rejects.toThrow();
  });

  it('should enforce unique sessionId constraint', async () => {
    await Summary.create({
      sessionId,
      userId,
      content: 'Rangkuman pertama.',
    });

    const duplicate = new Summary({
      sessionId,
      userId,
      content: 'Rangkuman duplikat untuk sesi yang sama.',
    });

    await expect(duplicate.save()).rejects.toThrow();
  });

  it('should require sessionId', async () => {
    const summary = new Summary({
      userId,
      content: 'Rangkuman tanpa sessionId.',
    });

    await expect(summary.save()).rejects.toThrow();
  });

  it('should require userId', async () => {
    const summary = new Summary({
      sessionId,
      content: 'Rangkuman tanpa userId.',
    });

    await expect(summary.save()).rejects.toThrow();
  });

  it('should require content', async () => {
    const summary = new Summary({
      sessionId,
      userId,
    });

    await expect(summary.save()).rejects.toThrow();
  });

  it('should store multiple keyPoints correctly', async () => {
    const keyPoints = [
      'Konsep pertama yang penting',
      'Konsep kedua yang harus diingat',
      'Kesimpulan akhir video',
    ];

    const summary = await Summary.create({
      sessionId,
      userId,
      content: 'Rangkuman dengan banyak poin.',
      keyPoints,
    });

    expect(summary.keyPoints).toHaveLength(3);
    expect(summary.keyPoints).toEqual(keyPoints);
  });

  it('should have unique index on sessionId', () => {
    const indexes = Summary.schema.indexes();
    const uniqueSessionIndex = indexes.find(
      (idx) => idx[0].sessionId !== undefined && idx[1]?.unique === true
    );
    expect(uniqueSessionIndex).toBeDefined();
  });

  it('should have compound index on userId and sessionId', () => {
    const indexes = Summary.schema.indexes();
    const compoundIndex = indexes.find(
      (idx) => idx[0].userId !== undefined && idx[0].sessionId !== undefined
    );
    expect(compoundIndex).toBeDefined();
  });

  it('should allow summary for different sessions', async () => {
    const session2 = await Session.create({
      userId,
      videoTitle: 'Video Kedua',
      sourceApp: 'VLC',
      sourceType: 'local',
      deviceId: 'device-456',
      status: 'completed',  // tidak boleh ada 2 sesi aktif (partial unique index)
    });

    await Summary.create({ sessionId, userId, content: 'Rangkuman sesi 1.' });
    const summary2 = await Summary.create({
      sessionId: session2._id,
      userId,
      content: 'Rangkuman sesi 2.',
    });

    expect(summary2._id).toBeDefined();
    expect(summary2.content).toBe('Rangkuman sesi 2.');
  });
});
