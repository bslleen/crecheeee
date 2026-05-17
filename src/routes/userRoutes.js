/**
 * @file userRoutes.js
 * @module src/routes/userRoutes
 * @description Director-only user management endpoints.
 *
 * All routes require authenticate + checkRole('Director').
 *
 * Routes:
 *   GET   /api/admin/users           — List all users.
 *   GET   /api/admin/users/:id       — Get a single user.
 *   PATCH /api/admin/users/:id/suspend  — Suspend an active account.
 *   PATCH /api/admin/users/:id/activate — Re-activate a suspended account.
 *   PATCH /api/admin/users/:id/role     — Change a user's role.
 */

import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, checkRole } from '../middleware/auth.js';
import { logAction, AuditAction }  from '../utils/logger.js';

const router = Router();

// All routes in this file require a valid JWT AND the Director role.
router.use(authenticate, checkRole('Director'));

// =============================================================================
// GET /api/admin/users
// =============================================================================

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.user_id, u.full_name, u.email, u.is_active, u.created_at, u.updated_at,
              r.role_id, r.role_name
       FROM   users u
       JOIN   roles r ON r.role_id = u.role_id
       ORDER BY u.created_at DESC`
    );
    return res.status(200).json({ success: true, users: rows });
  } catch (err) {
    console.error('[Users] List error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// =============================================================================
// GET /api/admin/users/:id
// =============================================================================

router.get('/:id', async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ success: false, message: 'Invalid user ID.' });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT u.user_id, u.full_name, u.email, u.is_active, u.created_at, u.updated_at,
              r.role_id, r.role_name
       FROM   users u
       JOIN   roles r ON r.role_id = u.role_id
       WHERE  u.user_id = ?`,
      [userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.status(200).json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('[Users] Get error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// =============================================================================
// PATCH /api/admin/users/:id/suspend
// =============================================================================

router.patch('/:id/suspend', async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ success: false, message: 'Invalid user ID.' });
  }
  if (userId === req.user.userId) {
    return res.status(400).json({ success: false, message: 'You cannot suspend your own account.' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE users SET is_active = 0 WHERE user_id = ? AND is_active = 1',
      [userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found or already suspended.' });
    }

    await logAction({
      userId:       req.user.userId,
      action:       AuditAction.USER_SUSPENDED,
      targetModule: 'admin',
      ipAddress:    req.ip,
      metadata:     { targetUserId: userId },
    });

    return res.status(200).json({ success: true, message: 'User account suspended.' });
  } catch (err) {
    console.error('[Users] Suspend error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// =============================================================================
// PATCH /api/admin/users/:id/activate
// =============================================================================

router.patch('/:id/activate', async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ success: false, message: 'Invalid user ID.' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE users SET is_active = 1 WHERE user_id = ? AND is_active = 0',
      [userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found or already active.' });
    }

    await logAction({
      userId:       req.user.userId,
      action:       AuditAction.USER_ACTIVATED,
      targetModule: 'admin',
      ipAddress:    req.ip,
      metadata:     { targetUserId: userId },
    });

    return res.status(200).json({ success: true, message: 'User account activated.' });
  } catch (err) {
    console.error('[Users] Activate error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// =============================================================================
// PATCH /api/admin/users/:id/role
// =============================================================================

router.patch('/:id/role', async (req, res) => {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ success: false, message: 'Invalid user ID.' });
  }

  const parsedRoleId = Number(req.body.roleId);
  if (!req.body.roleId || !Number.isInteger(parsedRoleId) || parsedRoleId < 1) {
    return res.status(400).json({ success: false, message: 'roleId must be a positive integer.' });
  }

  try {
    const [roleRows] = await pool.execute(
      'SELECT role_id, role_name FROM roles WHERE role_id = ?',
      [parsedRoleId]
    );
    if (roleRows.length === 0) {
      return res.status(400).json({ success: false, message: `roleId ${parsedRoleId} is not a valid role.` });
    }

    const [result] = await pool.execute(
      'UPDATE users SET role_id = ? WHERE user_id = ?',
      [parsedRoleId, userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await logAction({
      userId:       req.user.userId,
      action:       AuditAction.USER_ROLE_CHANGED,
      targetModule: 'admin',
      ipAddress:    req.ip,
      metadata:     { targetUserId: userId, newRoleId: parsedRoleId, newRoleName: roleRows[0].role_name },
    });

    return res.status(200).json({
      success: true,
      message: `User role updated to ${roleRows[0].role_name}.`,
    });
  } catch (err) {
    console.error('[Users] Role change error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

export default router;
