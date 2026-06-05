import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { User, IUser } from '../User';

describe('User Model', () => {
  beforeAll(async () => {
    await mongoose.connect('mongodb://127.0.0.1:27017/test-users');
    await User.ensureIndexes();
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  it('should create a user with required fields', async () => {
    const userData = {
      email: 'test@example.com',
      passwordHash: 'hashedpassword123',
      name: 'Test User',
    };

    const user = new User(userData);
    const savedUser = await user.save();

    expect(savedUser._id).toBeDefined();
    expect(savedUser.email).toBe('test@example.com');
    expect(savedUser.passwordHash).toBe('hashedpassword123');
    expect(savedUser.name).toBe('Test User');
    expect(savedUser.settings.summaryLengthPref).toBe('medium');
    expect(savedUser.settings.autoStartSession).toBe(true);
    expect(savedUser.settings.notificationsEnabled).toBe(true);
    expect(savedUser.createdAt).toBeDefined();
    expect(savedUser.updatedAt).toBeDefined();
  });

  it('should enforce unique email constraint', async () => {
    const userData = {
      email: 'duplicate@example.com',
      passwordHash: 'hashedpassword123',
      name: 'User One',
    };

    await new User(userData).save();

    const duplicateUser = new User({
      ...userData,
      name: 'User Two',
    });

    await expect(duplicateUser.save()).rejects.toThrow();
  });

  it('should lowercase and trim email', async () => {
    const user = new User({
      email: '  LOWERCASE@EXAMPLE.COM  ',
      passwordHash: 'hashedpassword123',
      name: 'Test User',
    });

    const savedUser = await user.save();
    expect(savedUser.email).toBe('lowercase@example.com');
  });

  it('should validate summaryLengthPref enum', async () => {
    const user = new User({
      email: 'enum-test@example.com',
      passwordHash: 'hashedpassword123',
      name: 'Test User',
      settings: {
        summaryLengthPref: 'invalid' as any,
        autoStartSession: true,
        notificationsEnabled: true,
      },
    });

    await expect(user.save()).rejects.toThrow();
  });

  it('should allow custom settings', async () => {
    const user = new User({
      email: 'settings@example.com',
      passwordHash: 'hashedpassword123',
      name: 'Test User',
      settings: {
        summaryLengthPref: 'long',
        autoStartSession: false,
        notificationsEnabled: false,
      },
    });

    const savedUser = await user.save();
    expect(savedUser.settings.summaryLengthPref).toBe('long');
    expect(savedUser.settings.autoStartSession).toBe(false);
    expect(savedUser.settings.notificationsEnabled).toBe(false);
  });
});
