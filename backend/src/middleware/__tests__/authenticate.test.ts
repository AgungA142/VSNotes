import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../authenticate';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@utils/jwt/jwt.util', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('@config/env', () => ({
  env: { JWT_SECRET: 'test-secret', JWT_EXPIRES_IN: '7d' },
}));

const { mockUserFindById } = vi.hoisted(() => ({
  mockUserFindById: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(null),
  }),
}));

vi.mock('@models/User', () => ({
  User: { findById: mockUserFindById },
}));

import { verifyToken } from '@utils/jwt/jwt.util';

// ============================================================================
// Helpers
// ============================================================================

function makeReq(authHeader?: string): Request {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as unknown as Request;
}

function makeRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  return { res, status, json };
}

// ============================================================================
// Tests
// ============================================================================

describe('authenticate middleware', () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn() as unknown as NextFunction;
    vi.clearAllMocks();
    // Default: user tidak punya passwordChangedAt
    mockUserFindById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(null),
    });
  });

  it('memanggil next() dan melampirkan user saat token valid', async () => {
    const payload = { userId: 'user-123', email: 'test@example.com', iat: 1000 };
    vi.mocked(verifyToken).mockReturnValue(payload);

    const req = makeReq('Bearer valid-token');
    const { res } = makeRes();

    await authenticate(req, res, next);

    expect(verifyToken).toHaveBeenCalledWith('valid-token');
    expect(req.user).toEqual(payload);
    expect(next).toHaveBeenCalledWith();
  });

  it('mengembalikan 401 jika header Authorization tidak ada', async () => {
    const req = makeReq();
    const { res, status, json } = makeRes();

    await authenticate(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });

  it('mengembalikan 401 jika header tidak diawali "Bearer "', async () => {
    const req = makeReq('Basic some-token');
    const { res, status, json } = makeRes();

    await authenticate(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    expect(next).not.toHaveBeenCalled();
  });

  it('meneruskan error ke next() saat token invalid', async () => {
    const jwtError = new Error('invalid signature');
    vi.mocked(verifyToken).mockImplementation(() => { throw jwtError; });

    const req = makeReq('Bearer invalid-token');
    const { res } = makeRes();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(jwtError);
  });

  it('meneruskan error ke next() saat token expired', async () => {
    const expiredError = Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' });
    vi.mocked(verifyToken).mockImplementation(() => { throw expiredError; });

    const req = makeReq('Bearer expired-token');
    const { res } = makeRes();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith(expiredError);
  });

  it('mengekstrak token dengan benar dari header Bearer', async () => {
    const payload = { userId: 'u1', email: 'a@b.com', iat: 1000 };
    vi.mocked(verifyToken).mockReturnValue(payload);

    const req = makeReq('Bearer my.jwt.token');
    const { res } = makeRes();

    await authenticate(req, res, next);

    expect(verifyToken).toHaveBeenCalledWith('my.jwt.token');
  });

  it('mengembalikan 401 TOKEN_INVALIDATED jika password diubah setelah token diterbitkan', async () => {
    const issuedAtSec = 1_700_000_000;
    const payload = { userId: 'user-1', email: 'x@y.com', iat: issuedAtSec };
    vi.mocked(verifyToken).mockReturnValue(payload);

    // passwordChangedAt 1 detik setelah iat
    const passwordChangedAt = new Date((issuedAtSec + 1) * 1000);
    mockUserFindById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ passwordChangedAt }),
    });

    const req = makeReq('Bearer stale-token');
    const { res, status, json } = makeRes();

    await authenticate(req, res, next);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'TOKEN_INVALIDATED' }) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('meloloskan request jika passwordChangedAt sebelum token diterbitkan', async () => {
    const issuedAtSec = 1_700_000_000;
    const payload = { userId: 'user-2', email: 'a@b.com', iat: issuedAtSec };
    vi.mocked(verifyToken).mockReturnValue(payload);

    // passwordChangedAt 1 detik sebelum iat → token masih valid
    const passwordChangedAt = new Date((issuedAtSec - 1) * 1000);
    mockUserFindById.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue({ passwordChangedAt }),
    });

    const req = makeReq('Bearer fresh-token');
    const { res } = makeRes();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toEqual(payload);
  });
});
