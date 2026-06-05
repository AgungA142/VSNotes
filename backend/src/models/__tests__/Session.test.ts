import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Session } from '../Session';
import { User } from '../User';

describe('Session Model', () => {
  let userId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/test-sessions');
    await Session.ensureIndexes();
    await User.ensureIndexes();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await Session.deleteMany({});
    await User.deleteMany({});
    
    // Create a test user
    const user = await User.create({
      email: 'session-test@example.com',
      passwordHash: 'hashedpassword123',
      name: 'Session Test User',
    });
    userId = user._id as mongoose.Types.ObjectId;
  });

  it('should create a session with required fields', async () => {
    const sessionData = {
      userId,
      videoTitle: 'Test Video',
      sourceApp: 'Google Chrome',
      sourceType: 'streaming' as const,
      deviceId: 'device-123',
    };

    const session = new Session(sessionData);
    const savedSession = await session.save();

    expect(savedSession._id).toBeDefined();
    expect(savedSession.userId.toString()).toBe(userId.toString());
    expect(savedSession.videoTitle).toBe('Test Video');
    expect(savedSession.sourceApp).toBe('Google Chrome');
    expect(savedSession.sourceType).toBe('streaming');
    expect(savedSession.status).toBe('active');
    expect(savedSession.deviceId).toBe('device-123');
    expect(savedSession.startedAt).toBeDefined();
    expect(savedSession.createdAt).toBeDefined();
    expect(savedSession.updatedAt).toBeDefined();
  });

  it('should validate sourceType enum', async () => {
    const session = new Session({
      userId,
      videoTitle: 'Test Video',
      sourceApp: 'VLC',
      sourceType: 'invalid' as any,
      deviceId: 'device-123',
    });

    await expect(session.save()).rejects.toThrow();
  });

  it('should validate status enum', async () => {
    const session = new Session({
      userId,
      videoTitle: 'Test Video',
      sourceApp: 'VLC',
      sourceType: 'local',
      status: 'invalid' as any,
      deviceId: 'device-123',
    });

    await expect(session.save()).rejects.toThrow();
  });

  it('should allow optional endedAt and durationSec', async () => {
    const session = await Session.create({
      userId,
      videoTitle: 'Test Video',
      sourceApp: 'VLC',
      sourceType: 'local',
      deviceId: 'device-123',
      endedAt: new Date(),
      durationSec: 3600,
    });

    expect(session.endedAt).toBeDefined();
    expect(session.durationSec).toBe(3600);
  });

  it('should have userId index', async () => {
    const indexes = Session.schema.indexes();
    const userIdIndex = indexes.find((idx) => idx[0].userId);
    expect(userIdIndex).toBeDefined();
  });

  it('should have status index', async () => {
    const indexes = Session.schema.indexes();
    const statusIndex = indexes.find((idx) => idx[0].status);
    expect(statusIndex).toBeDefined();
  });

  it('should have compound userId and status index', async () => {
    const indexes = Session.schema.indexes();
    const compoundIndex = indexes.find(
      (idx) => idx[0].userId && idx[0].status
    );
    expect(compoundIndex).toBeDefined();
  });

  it('should have partial unique index for one active session per user', async () => {
    const indexes = Session.schema.indexes();
    const partialUniqueIndex = indexes.find(
      (idx) => idx[1]?.unique === true && idx[1]?.name === 'one_active_session_per_user'
    );
    expect(partialUniqueIndex).toBeDefined();
  });

  it('should reject creating second active session for same user', async () => {
    await Session.create({
      userId,
      videoTitle: 'Sesi Pertama',
      sourceApp: 'Chrome',
      sourceType: 'streaming',
      deviceId: 'device-123',
      status: 'active',
    });

    const duplicate = new Session({
      userId,
      videoTitle: 'Sesi Kedua',
      sourceApp: 'Chrome',
      sourceType: 'streaming',
      deviceId: 'device-456',
      status: 'active',
    });

    await expect(duplicate.save()).rejects.toThrow();
  });

  it('should allow multiple completed sessions for same user', async () => {
    await Session.create({
      userId,
      videoTitle: 'Sesi 1',
      sourceApp: 'Chrome',
      sourceType: 'streaming',
      deviceId: 'device-1',
      status: 'completed',
    });
    const second = await Session.create({
      userId,
      videoTitle: 'Sesi 2',
      sourceApp: 'Chrome',
      sourceType: 'streaming',
      deviceId: 'device-2',
      status: 'completed',
    });
    expect(second._id).toBeDefined();
  });

  it('should validate durationSec minimum value', async () => {
    const session = new Session({
      userId,
      videoTitle: 'Test Video',
      sourceApp: 'VLC',
      sourceType: 'local',
      deviceId: 'device-123',
      durationSec: -10,
    });

    await expect(session.save()).rejects.toThrow();
  });
});
