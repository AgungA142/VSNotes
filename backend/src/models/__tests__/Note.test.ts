import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { Note } from '../Note';
import { User } from '../User';
import { Session } from '../Session';

describe('Note Model', () => {
  let userId: mongoose.Types.ObjectId;
  let sessionId: mongoose.Types.ObjectId;

  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/test-notes');
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Note.deleteMany({});
    await Session.deleteMany({});
    await User.deleteMany({});

    const user = await User.create({
      email: 'note-test@example.com',
      passwordHash: 'hashedpassword123',
      name: 'Note Test User',
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

  it('should create a note with required fields', async () => {
    const note = await Note.create({
      sessionId,
      userId,
      timestampSec: 120,
      text: 'Ini catatan penting.',
      type: 'manual',
    });

    expect(note._id).toBeDefined();
    expect(note.sessionId.toString()).toBe(sessionId.toString());
    expect(note.userId.toString()).toBe(userId.toString());
    expect(note.timestampSec).toBe(120);
    expect(note.text).toBe('Ini catatan penting.');
    expect(note.type).toBe('manual');
    expect(note.createdAt).toBeDefined();
    expect(note.updatedAt).toBeDefined();
  });

  it('should use default type "manual" when not provided', async () => {
    const note = await Note.create({
      sessionId,
      userId,
      timestampSec: 60,
      text: 'Catatan dengan tipe default.',
    });

    expect(note.type).toBe('manual');
  });

  it('should allow type "auto"', async () => {
    const note = await Note.create({
      sessionId,
      userId,
      timestampSec: 45,
      text: 'Catatan otomatis dari AI.',
      type: 'auto',
    });

    expect(note.type).toBe('auto');
  });

  it('should reject invalid type enum', async () => {
    const note = new Note({
      sessionId,
      userId,
      timestampSec: 30,
      text: 'Catatan dengan tipe tidak valid.',
      type: 'invalid' as any,
    });

    await expect(note.save()).rejects.toThrow();
  });

  it('should reject negative timestampSec', async () => {
    const note = new Note({
      sessionId,
      userId,
      timestampSec: -5,
      text: 'Catatan dengan timestamp negatif.',
      type: 'manual',
    });

    await expect(note.save()).rejects.toThrow();
  });

  it('should allow timestampSec of zero', async () => {
    const note = await Note.create({
      sessionId,
      userId,
      timestampSec: 0,
      text: 'Catatan di awal video.',
      type: 'manual',
    });

    expect(note.timestampSec).toBe(0);
  });

  it('should require sessionId', async () => {
    const note = new Note({
      userId,
      timestampSec: 60,
      text: 'Catatan tanpa sessionId.',
      type: 'manual',
    });

    await expect(note.save()).rejects.toThrow();
  });

  it('should require userId', async () => {
    const note = new Note({
      sessionId,
      timestampSec: 60,
      text: 'Catatan tanpa userId.',
      type: 'manual',
    });

    await expect(note.save()).rejects.toThrow();
  });

  it('should require text', async () => {
    const note = new Note({
      sessionId,
      userId,
      timestampSec: 60,
      type: 'manual',
    });

    await expect(note.save()).rejects.toThrow();
  });

  it('should have compound index on sessionId and timestampSec', () => {
    const indexes = Note.schema.indexes();
    const compoundIndex = indexes.find(
      (idx) => idx[0].sessionId !== undefined && idx[0].timestampSec !== undefined
    );
    expect(compoundIndex).toBeDefined();
  });

  it('should have compound index on userId and sessionId', () => {
    const indexes = Note.schema.indexes();
    const compoundIndex = indexes.find(
      (idx) => idx[0].userId !== undefined && idx[0].sessionId !== undefined
    );
    expect(compoundIndex).toBeDefined();
  });

  it('should filter notes by type', async () => {
    await Note.create([
      { sessionId, userId, timestampSec: 10, text: 'Auto 1', type: 'auto' },
      { sessionId, userId, timestampSec: 20, text: 'Manual 1', type: 'manual' },
      { sessionId, userId, timestampSec: 30, text: 'Auto 2', type: 'auto' },
    ]);

    const autoNotes = await Note.find({ sessionId, type: 'auto' });
    const manualNotes = await Note.find({ sessionId, type: 'manual' });

    expect(autoNotes).toHaveLength(2);
    expect(manualNotes).toHaveLength(1);
  });

  it('should filter notes by userId for data isolation', async () => {
    const otherUser = await User.create({
      email: 'other@example.com',
      passwordHash: 'hashedpassword456',
      name: 'Other User',
    });

    await Note.create([
      { sessionId, userId, timestampSec: 10, text: 'Catatan user utama', type: 'manual' },
      { sessionId, userId: otherUser._id, timestampSec: 20, text: 'Catatan user lain', type: 'manual' },
    ]);

    const userNotes = await Note.find({ userId });
    expect(userNotes).toHaveLength(1);
    expect(userNotes[0].text).toBe('Catatan user utama');
  });
});
