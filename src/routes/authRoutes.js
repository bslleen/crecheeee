import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt    from 'jsonwebtoken';
import pool   from '../config/db.js';
import { logAction, AuditAction }                         from '../utils/logger.js';
import { validateRegistrationInput, validateLoginInput }  from '../utils/validation.js';
import { authenticate, checkRole }                        from '../middleware/auth.js';

const router = Router();

const {
  JWT_SECRET        = 'replace_with_a_strong_random_secret_before_production',
  JWT_EXPIRES_IN    = '8h',
  BCRYPT_ROUNDS     = '12',
  OPEN_REGISTRATION = 'false',
} = process.env;

const SALT_ROUNDS = Number(BCRYPT_ROUNDS);

// =============================================================================
// POST /api/auth/register
// Access: Director only (unless OPEN_REGISTRATION=true for initial setup)
// =============================================================================

/**
 * @route   POST /api/auth/register
 * @access  Director (set OPEN_REGISTRATION=true in .env only for first bootstrap)
 * @desc    Creates a new user account. Validates input, hashes the password,
 *          inserts the record, and writes an audit entry.
 *
 * Request body: { fullName, email, password, roleId }
 * Response 201: { success: true, userId, message }
 */
const registerGuard = OPEN_REGISTRATION === 'true'
  ? []
  : [authenticate, checkRole('Director')];

router.post('/register', ...registerGuard, async (req, res) => {
  const { valid, errors } = validateRegistrationInput(req.body);
  if (!valid) {
    return res.status(422).json({ success: false, errors });
  }

  const { fullName, email, password, roleId } = req.body;
  const normalisedEmail = email.trim().toLowerCase();

  try {
    const [roleRows] = await pool.execute(
      'SELECT role_id FROM roles WHERE role_id = ?',
      [Number(roleId)]
    );
    if (roleRows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `roleId ${roleId} does not correspond to a valid system role.`,
      });
    }

    const [existingRows] = await pool.execute(
      'SELECT user_id FROM users WHERE email = ?',
      [normalisedEmail]
    );
    if (existingRows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, password_hash, role_id)
       VALUES (?, ?, ?, ?)`,
      [fullName.trim(), normalisedEmail, passwordHash, Number(roleId)]
    );

    const newUserId = result.insertId;

    await logAction({
      userId:       newUserId,
      action:       AuditAction.USER_REGISTERED,
      targetModule: 'auth',
      ipAddress:    req.ip,
      metadata:     { email: normalisedEmail, roleId: Number(roleId) },
    });

    return res.status(201).json({
      success: true,
      userId:  newUserId,
      message: 'Account created successfully.',
    });
  } catch (err) {
    console.error('[Auth] Registration error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during registration.',
    });
  }
});

// =============================================================================
// POST /api/auth/login
// =============================================================================

/**
 * @route   POST /api/auth/login
 * @access  Public
 * @desc    Verifies credentials and returns a signed JWT on success.
 *
 * Request body: { email, password }
 * Response 200: { success: true, token, user: { userId, fullName, email, role } }
 */
router.post('/login', async (req, res) => {
  const { valid, errors } = validateLoginInput(req.body);
  if (!valid) {
    return res.status(422).json({ success: false, errors });
  }

  const { email, password } = req.body;
  const normalisedEmail = email.trim().toLowerCase();

  try {
    const [rows] = await pool.execute(
      `SELECT u.user_id, u.full_name, u.email, u.password_hash,
              u.is_active, u.role_id, r.role_name
       FROM   users u
       JOIN   roles r ON r.role_id = u.role_id
       WHERE  u.email = ?
       LIMIT  1`,
      [normalisedEmail]
    );

    // Always run bcrypt to prevent timing-based user enumeration.
    const DUMMY_HASH  = '$2a$12$invalidhashusedtopreventimenumerationattacks000000000000';
    const storedHash  = rows.length > 0 ? rows[0].password_hash : DUMMY_HASH;
    const passwordMatch = await bcrypt.compare(password, storedHash);

    if (rows.length === 0 || !passwordMatch) {
      await logAction({
        userId:       null,
        action:       AuditAction.USER_LOGIN_FAILED,
        targetModule: 'auth',
        ipAddress:    req.ip,
        metadata:     { email: normalisedEmail, reason: rows.length === 0 ? 'USER_NOT_FOUND' : 'WRONG_PASSWORD' },
      });
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'This account has been suspended. Please contact your system administrator.',
      });
    }

    const token = jwt.sign(
      { userId: user.user_id, email: user.email, roleId: user.role_id, roleName: user.role_name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN, issuer: 'idms-api', subject: String(user.user_id) }
    );

    await logAction({
      userId:       user.user_id,
      action:       AuditAction.USER_LOGIN,
      targetModule: 'auth',
      ipAddress:    req.ip,
      metadata:     { email: user.email, role: user.role_name },
    });

    return res.status(200).json({
      success: true,
      token,
      user: {
        userId:   user.user_id,
        fullName: user.full_name,
        email:    user.email,
        role:     user.role_name,
      },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during authentication.',
    });
  }
});

// =============================================================================
// POST /api/auth/logout
// =============================================================================

/**
 * @route   POST /api/auth/logout
 * @access  Any authenticated user
 * @desc    Records the logout event in the audit log and instructs the client
 *          to discard its token. JWTs are stateless — revocation requires the
 *          client to delete the stored token; the server cannot invalidate it
 *          without a token blacklist store (e.g. Redis).
 */
router.post('/logout', authenticate, async (req, res) => {
  await logAction({
    userId:       req.user.userId,
    action:       AuditAction.USER_LOGOUT,
    targetModule: 'auth',
    ipAddress:    req.ip,
    metadata:     { email: req.user.email },
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please discard your token.',
  });
});

export default router;
