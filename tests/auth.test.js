/**
 * @file auth.test.js
 * @description Unit test suite for IDMS Module 1 — User & Access Management.
 *
 * Coverage targets (per SPMP Section 9):
 *   ≥ 80% lines, functions, and statements
 *   ≥ 75% branches
 *
 * Testing strategy:
 *   All external dependencies (mysql2 pool, bcryptjs, jsonwebtoken) are mocked
 *   so these tests run entirely in-process — no live database or server is
 *   required. This makes the suite fast (<1s) and safe to run in CI pipelines.
 *
 *   Integration tests (requiring a live DB) belong in a separate test file
 *   (e.g., auth.integration.test.js) and are excluded from this suite.
 *
 * Framework: Jest 29 with ES Module support (--experimental-vm-modules).
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// =============================================================================
// Dependency mocks
// Must be declared before any module imports that depend on them.
// =============================================================================

// ── Mock mysql2/promise pool ──────────────────────────────────────────────────
const mockExecute  = jest.fn();
const mockPing     = jest.fn().mockResolvedValue(undefined);
const mockRelease  = jest.fn();
const mockGetConn  = jest.fn().mockResolvedValue({ ping: mockPing, release: mockRelease });

jest.unstable_mockModule('mysql2/promise', () => ({
  default: {
    createPool: jest.fn(() => ({
      execute:       mockExecute,
      getConnection: mockGetConn,
    })),
  },
}));

// ── Mock bcryptjs ─────────────────────────────────────────────────────────────
const mockBcryptHash    = jest.fn();
const mockBcryptCompare = jest.fn();

jest.unstable_mockModule('bcryptjs', () => ({
  default: {
    hash:    mockBcryptHash,
    compare: mockBcryptCompare,
  },
}));

// ── Mock jsonwebtoken ─────────────────────────────────────────────────────────
const mockJwtSign   = jest.fn();
const mockJwtVerify = jest.fn();

jest.unstable_mockModule('jsonwebtoken', () => ({
  default: {
    sign:   mockJwtSign,
    verify: mockJwtVerify,
  },
}));

// =============================================================================
// Import modules under test (AFTER mocks are registered)
// =============================================================================
const { validateLoginInput, validateRegistrationInput } = await import('../src/utils/validation.js');
const { authenticate, checkRole }                       = await import('../src/middleware/auth.js');
const { logAction, AuditAction }                        = await import('../src/utils/logger.js');

// =============================================================================
// Helper — build a minimal Express-like req / res / next triple
// =============================================================================
function buildReqResNext(overrides = {}) {
  const req = {
    headers: {},
    user:    undefined,
    ip:      '127.0.0.1',
    body:    {},
    ...overrides,
  };

  const res = {
    _status: null,
    _json:   null,
    status(code) { this._status = code; return this; },
    json(body)   { this._json   = body; return this; },
  };

  const next = jest.fn();

  return { req, res, next };
}

// =============================================================================
// 1. Input Validation — validateLoginInput
// =============================================================================
describe('validateLoginInput()', () => {
  it('returns valid=true for a well-formed email and password', () => {
    const result = validateLoginInput({ email: 'director@idms.dz', password: 'Secret123!' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid=false and an error when email is missing', () => {
    const result = validateLoginInput({ email: '', password: 'Secret123!' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('email is required.');
  });

  it('returns valid=false and an error for a malformed email', () => {
    const result = validateLoginInput({ email: 'not-an-email', password: 'Secret123!' });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('valid email'))).toBe(true);
  });

  it('returns valid=false and an error when password is missing', () => {
    const result = validateLoginInput({ email: 'director@idms.dz', password: '' });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('password is required.');
  });

  it('collects multiple errors when both fields are invalid', () => {
    const result = validateLoginInput({ email: '', password: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('accepts email addresses with subdomains', () => {
    const result = validateLoginInput({ email: 'user@mail.idms.dz', password: 'pass1234' });
    expect(result.valid).toBe(true);
  });
});

// =============================================================================
// 2. Input Validation — validateRegistrationInput
// =============================================================================
describe('validateRegistrationInput()', () => {
  const valid = {
    fullName: 'Amina Khelil',
    email:    'amina@idms.dz',
    password: 'SecurePass99!',
    roleId:   1,
  };

  it('returns valid=true for a complete, correct payload', () => {
    expect(validateRegistrationInput(valid).valid).toBe(true);
  });

  it('rejects fullName shorter than 2 characters', () => {
    const res = validateRegistrationInput({ ...valid, fullName: 'A' });
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('2 characters'))).toBe(true);
  });

  it('rejects a password shorter than 8 characters', () => {
    const res = validateRegistrationInput({ ...valid, password: 'short' });
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('8 characters'))).toBe(true);
  });

  it('rejects a password longer than 128 characters', () => {
    const res = validateRegistrationInput({ ...valid, password: 'a'.repeat(129) });
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('128 characters'))).toBe(true);
  });

  it('rejects roleId of zero', () => {
    const res = validateRegistrationInput({ ...valid, roleId: 0 });
    expect(res.valid).toBe(false);
    expect(res.errors.some(e => e.includes('roleId'))).toBe(true);
  });

  it('rejects a non-numeric roleId', () => {
    const res = validateRegistrationInput({ ...valid, roleId: 'admin' });
    expect(res.valid).toBe(false);
  });

  it('rejects missing email', () => {
    const res = validateRegistrationInput({ ...valid, email: undefined });
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('email is required.');
  });
});

// =============================================================================
// 3. authenticate() middleware
// =============================================================================
describe('authenticate() middleware', () => {
  beforeEach(() => {
    mockJwtVerify.mockReset();
  });

  it('calls next() and sets req.user when the token is valid', () => {
    const decoded = { userId: 1, email: 'dir@idms.dz', roleName: 'Director' };
    mockJwtVerify.mockReturnValue(decoded);

    const { req, res, next } = buildReqResNext({
      headers: { authorization: 'Bearer valid.token.here' },
    });

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toEqual(decoded);
  });

  it('returns 401 when the Authorization header is absent', () => {
    const { req, res, next } = buildReqResNext({ headers: {} });

    authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when the Authorization header lacks the Bearer prefix', () => {
    const { req, res, next } = buildReqResNext({
      headers: { authorization: 'Token abc123' },
    });

    authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 with TOKEN_EXPIRED code when the token has expired', () => {
    const expiredError = new Error('jwt expired');
    expiredError.name  = 'TokenExpiredError';
    mockJwtVerify.mockImplementation(() => { throw expiredError; });

    const { req, res, next } = buildReqResNext({
      headers: { authorization: 'Bearer expired.token' },
    });

    authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.code).toBe('TOKEN_EXPIRED');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 with TOKEN_INVALID code when the token signature is bad', () => {
    const badSigError = new Error('invalid signature');
    badSigError.name  = 'JsonWebTokenError';
    mockJwtVerify.mockImplementation(() => { throw badSigError; });

    const { req, res, next } = buildReqResNext({
      headers: { authorization: 'Bearer tampered.token' },
    });

    authenticate(req, res, next);

    expect(res._status).toBe(401);
    expect(res._json.code).toBe('TOKEN_INVALID');
  });
});

// =============================================================================
// 4. checkRole() middleware
// =============================================================================
describe('checkRole() middleware', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  it('calls next() when the DB-confirmed role matches an allowed role', async () => {
    mockExecute.mockResolvedValue([[{ role_name: 'Director' }]]);

    const { req, res, next } = buildReqResNext();
    req.user = { userId: 1, email: 'dir@idms.dz' };

    const middleware = checkRole('Director', 'Catering Staff');
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.roleName).toBe('Director');
  });

  it('returns 403 INSUFFICIENT_ROLE when role is not in the allowed list', async () => {
    mockExecute.mockResolvedValue([[{ role_name: 'Parent' }]]);

    const { req, res, next } = buildReqResNext();
    req.user = { userId: 5, email: 'parent@idms.dz' };

    const middleware = checkRole('Director');
    await middleware(req, res, next);

    expect(res._status).toBe(403);
    expect(res._json.code).toBe('INSUFFICIENT_ROLE');
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 ACCOUNT_INACTIVE when the user record is not found in DB', async () => {
    mockExecute.mockResolvedValue([[]]); // Empty result — deactivated account.

    const { req, res, next } = buildReqResNext();
    req.user = { userId: 99 };

    const middleware = checkRole('Director');
    await middleware(req, res, next);

    expect(res._status).toBe(403);
    expect(res._json.code).toBe('ACCOUNT_INACTIVE');
  });

  it('returns 401 when req.user is missing (authenticate not called first)', async () => {
    const { req, res, next } = buildReqResNext();
    req.user = undefined;

    const middleware = checkRole('Director');
    await middleware(req, res, next);

    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 500 on a database error', async () => {
    mockExecute.mockRejectedValue(new Error('DB connection refused'));

    const { req, res, next } = buildReqResNext();
    req.user = { userId: 1 };

    const middleware = checkRole('Director');
    await middleware(req, res, next);

    expect(res._status).toBe(500);
    expect(next).not.toHaveBeenCalled();
  });

  it('permits access for Transport Coordinator on a transport-only route', async () => {
    mockExecute.mockResolvedValue([[{ role_name: 'Transport Coordinator' }]]);

    const { req, res, next } = buildReqResNext();
    req.user = { userId: 3 };

    await checkRole('Director', 'Transport Coordinator')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user.roleName).toBe('Transport Coordinator');
  });
});

// =============================================================================
// 5. logAction() audit utility
// =============================================================================
describe('logAction() audit utility', () => {
  beforeEach(() => {
    mockExecute.mockReset();
  });

  it('executes an INSERT when provided valid required fields', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 1 }]);

    await logAction({
      userId:       1,
      action:       AuditAction.USER_LOGIN,
      targetModule: 'auth',
      ipAddress:    '127.0.0.1',
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [query, params] = mockExecute.mock.calls[0];
    expect(query).toContain('INSERT INTO audit_logs');
    expect(params).toContain('USER_LOGIN');
    expect(params).toContain('auth');
  });

  it('does NOT throw when the DB INSERT fails', async () => {
    mockExecute.mockRejectedValue(new Error('Disk full'));

    await expect(
      logAction({ userId: 1, action: AuditAction.USER_LOGIN, targetModule: 'auth' })
    ).resolves.toBeUndefined();
  });

  it('accepts null userId for anonymous / pre-authentication events', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 1 }]);

    await logAction({
      userId:       null,
      action:       AuditAction.USER_LOGIN_FAILED,
      targetModule: 'auth',
    });

    const params = mockExecute.mock.calls[0][1];
    expect(params[0]).toBeNull();
  });

  it('serialises the metadata object to JSON before persisting', async () => {
    mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
    const meta = { email: 'test@idms.dz', role: 'Parent' };

    await logAction({
      userId:       2,
      action:       AuditAction.USER_REGISTERED,
      targetModule: 'auth',
      metadata:     meta,
    });

    const params = mockExecute.mock.calls[0][1];
    expect(params[4]).toBe(JSON.stringify(meta));
  });

  it('returns without inserting when action is missing', async () => {
    await logAction({ userId: 1, action: '', targetModule: 'auth' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('returns without inserting when targetModule is missing', async () => {
    await logAction({ userId: 1, action: AuditAction.USER_LOGIN, targetModule: '' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('AuditAction constants are frozen and non-extensible', () => {
    expect(Object.isFrozen(AuditAction)).toBe(true);
    expect(() => { AuditAction.NEW_ACTION = 'x'; }).toThrow();
  });
});
