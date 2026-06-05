import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { TranscriptSegment } from '../TranscriptSegment';
import { User } from '../User';
import { Session } from '../Session';

describe('TranscriptSegment Model', () => {
  let userId: mongoose.Types.ObjectId;
  let sessionId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/test-transcript-segments');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await TranscriptSegment.deleteMany({});
    await Session.deleteMany({});
    await User.deleteMany({});

    const user = await User.create({
      email: 'transcript-test@example.com',
      passwordHash: 'hashedpassword123',
      name: 'Transcript Test User',
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

  it('should create a transcript segment with required fields', async () => {
    const segment = await TranscriptSegment.create({
      sessionId,
      userId,
      timestampSec: 30,
      text: 'Ini adalah transkrip pertama.',
    });

    expect(segment._id).toBeDefined();
    expect(segment.sessionId.toString()).toBe(sessionId.toString());
    expect(segment.userId.toString()).toBe(userId.toString());
    expect(segment.timestampSec).toBe(30);
    expect(segment.text).toBe('Ini adalah transkrip pertama.');
    expect(segment.language).toBe('id');
    expect(segment.createdAt).toBeDefined();
  });

  it('should use default language "id" when not provided', async () => {
    const segment = await TranscriptSegment.create({
      sessionId,
      userId,
      timestampSec: 0,
      text: 'Transkrip dengan bahasa default.',
    });

    expect(segment.language).toBe('id');
  });

  it('should allow custom language', async () => {
    const segment = await TranscriptSegment.create({
      sessionId,
      userId,
      timestampSec: 60,
      text: 'This is an English transcript.',
      language: 'en',
    });

    expect(segment.language).toBe('en');
  });

  it('should reject negative timestampSec', async () => {
    const segment = new TranscriptSegment({
      sessionId,
      userId,
      timestampSec: -1,
      text: 'Invalid timestamp segment.',
    });

    await expect(segment.save()).rejects.toThrow();
  });

  it('should allow timestampSec of zero', async () => {
    const segment = await TranscriptSegment.create({
      sessionId,
      userId,
      timestampSec: 0,
      text: 'Segment di awal video.',
    });

    expect(segment.timestampSec).toBe(0);
  });

  it('should require sessionId', async () => {
    const segment = new TranscriptSegment({
      userId,
      timestampSec: 30,
      text: 'Segment tanpa sessionId.',
    });

    await expect(segment.save()).rejects.toThrow();
  });

  it('should require userId', async () => {
    const segment = new TranscriptSegment({
      sessionId,
      timestampSec: 30,
      text: 'Segment tanpa userId.',
    });

    await expect(segment.save()).rejects.toThrow();
  });

  it('should require text', async () => {
    const segment = new TranscriptSegment({
      sessionId,
      userId,
      timestampSec: 30,
    });

    await expect(segment.save()).rejects.toThrow();
  });

  it('should have compound index on sessionId and timestampSec', () => {
    const indexes = TranscriptSegment.schema.indexes();
    const compoundIndex = indexes.find(
      (idx) => idx[0].sessionId !== undefined && idx[0].timestampSec !== undefined
    );
    expect(compoundIndex).toBeDefined();
  });

  it('should have compound index on userId and sessionId', () => {
    const indexes = TranscriptSegment.schema.indexes();
    const compoundIndex = indexes.find(
      (idx) => idx[0].userId !== undefined && idx[0].sessionId !== undefined
    );
    expect(compoundIndex).toBeDefined();
  });

  it('should return segments sorted by timestampSec ascending', async () => {
    await TranscriptSegment.create([
      { sessionId, userId, timestampSec: 90, text: 'Segmen ketiga.' },
      { sessionId, userId, timestampSec: 30, text: 'Segmen pertama.' },
      { sessionId, userId, timestampSec: 60, text: 'Segmen kedua.' },
    ]);

    const segments = await TranscriptSegment.find({ sessionId }).sort({ timestampSec: 1 });

    expect(segments[0].timestampSec).toBe(30);
    expect(segments[1].timestampSec).toBe(60);
    expect(segments[2].timestampSec).toBe(90);
  });
});
