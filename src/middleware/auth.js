/**
 * @file auth.js
 * @module src/middleware/auth
 * @description JWT verification and Role-Based Access Control (RBAC) middleware.
 *
 * Two middleware factories are exported:
 *
 *  1. `authenticate`  — Extracts and verifies the Bearer JWT from the
 *     Authorization header. On success it attaches the decoded payload to
 *     `req.user` for downstream handlers.
 *
 *  2. `checkRole(...allowedRoles)` — Higher-order function that returns an
 *     Express middleware. Queries the database to resolve the requesting
 *     user's current role (preventing stale JWT role claims from granting
 *     excess access) and rejects the request with HTTP 403 if the role is
 *     not in the caller-supplied allowedRoles list.
 *
 * Design decision — database re-check in checkRole:
 *   JWT payloads are self-contained but can become stale if a user's role is
 *   changed after token issuance. Performing a lightweight DB lookup on each
 *   protected request ensures that role changes take effect immediately without
 *   requiring token revocation infrastructure.
 */

import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

const { JWT_SECRET = 'replace_with_a_strong_random_secret_before_production' } = process.env;

// ---------------------------------------------------------------------------
// authenticate
// ---------------------------------------------------------------------------

/**
 * Express middleware — verifies the JWT present in the Authorization header.
 *
 * Expected header format:
 *   Authorization: Bearer <token>
 *
 * On success:
 *   Sets `req.user` to the decoded JWT payload and calls `next()`.
 *
 * On failure:
 *   Responds with HTTP 401 and a structured JSON error body.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  // Validate that the header is present and follows the Bearer scheme.
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please provide a valid Bearer token.',
    });
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix (7 characters).

  try {
    // jwt.verify throws synchronously on invalid / expired tokens.
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach the decoded payload to the request object.
    // Shape: { userId, email, role, roleName, iat, exp }
    req.user = decoded;

    next();
  } catch (err) {
    // Distinguish between an expired token and a malformed / tampered one
    // so the client can differentiate "please log in again" from "bad token".
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
        code:    'TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
      code:    'TOKEN_INVALID',
    });
  }
}

// ---------------------------------------------------------------------------
// checkRole
// ---------------------------------------------------------------------------

/**
 * RBAC middleware factory.
 *
 * Returns an Express middleware that permits access only to users whose
 * current database role matches one of the provided `allowedRoles`.
 *
 * Usage example:
 *   router.get('/reports', authenticate, checkRole('Director'), handler);
 *   router.get('/meals',   authenticate, checkRole('Director', 'Catering Staff'), handler);
 *
 * IMPORTANT: `authenticate` MUST run before `checkRole` in the middleware
 * chain so that `req.user` is populated.
 *
 * @param  {...string} allowedRoles - One or more role names permitted to access
 *                                   the route (must match `roles.role_name` exactly).
 * @returns {import('express').RequestHandler}
 */
export function checkRole(...allowedRoles) {
  return async (req, res, next) => {
    // Defensive check — authenticate() should always precede checkRole().
    if (!req.user?.userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication context missing. Ensure authenticate() runs first.',
      });
    }

    try {
      // Re-query the current role from the database.
      // This ensures a role change applied after JWT issuance is respected
      // immediately, without requiring token revocation.
      const [rows] = await pool.execute(
        `SELECT r.role_name
         FROM   users u
         JOIN   roles r ON r.role_id = u.role_id
         WHERE  u.user_id  = ?
           AND  u.is_active = 1`,
        [req.user.userId]
      );

      // Handle the edge case where the account was deactivated after login.
      if (rows.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Account not found or has been deactivated.',
          code:    'ACCOUNT_INACTIVE',
        });
      }

      const currentRole = rows[0].role_name;

      // Case-sensitive comparison against the allowedRoles list.
      if (!allowedRoles.includes(currentRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. ` +
                   `Your current role: ${currentRole}.`,
          code:    'INSUFFICIENT_ROLE',
        });
      }

      // Enrich req.user with the freshly fetched role name so downstream
      // handlers always work with the current (not JWT-cached) role.
      req.user.roleName = currentRole;

      next();
    } catch (err) {
      console.error('[RBAC] Database error during role check:', err);
      return res.status(500).json({
        success: false,
        message: 'An internal server error occurred during authorisation.',
      });
    }
  };
}
