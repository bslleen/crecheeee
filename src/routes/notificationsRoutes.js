/**
 * @file notificationsRoutes.js
 * @module src/routes/notificationsRoutes
 * @description In-app notification inbox endpoints.
 *
 * Every authenticated user sees only their own notifications.
 *
 * Routes:
 *   GET   /api/notifications              — List (newest first, optional ?unread=1)
 *   GET   /api/notifications/unread-count — Bell badge count
 *   PATCH /api/notifications/:id/read     — Mark a single notification read
 *   PATCH /api/notifications/read-all     — Mark every unread one read
 */

import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// =============================================================================
// GET /api/notifications
// Query: ?unread=1  → return only unread
//        ?limit=50  → cap (default 50, max 200)
// =============================================================================
router.get('/', authenticate, async (req, res) => {
  const unreadOnly = req.query.unread === '1' || req.query.unread === 'true';
  let limit = Number(req.query.limit) || 50;
  if (!Number.isFinite(limit) || limit < 1) limit = 50;
  if (limit > 200) limit = 200;

  try {
    const where = unreadOnly
      ? 'WHERE recipient_id = ? AND is_read = 0'
      : 'WHERE recipient_id = ?';

    const [rows] = await pool.query(
      `SELECT notification_id, kind, title, body, metadata,
              is_read, read_at, created_at
       FROM   notifications
       ${where}
       ORDER BY is_read ASC, created_at DESC
       LIMIT ${limit}`,
      [req.user.userId]
    );

    return res.status(200).json({ success: true, notifications: rows });
  } catch (err) {
    console.error('[Notifications] List error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// =============================================================================
// GET /api/notifications/unread-count
// =============================================================================
router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const [[row]] = await pool.execute(
      `SELECT COUNT(*) AS unread
       FROM   notifications
       WHERE  recipient_id = ? AND is_read = 0`,
      [req.user.userId]
    );
    return res.status(200).json({ success: true, unread: Number(row.unread) });
  } catch (err) {
    console.error('[Notifications] Count error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// =============================================================================
// PATCH /api/notifications/:id/read
// =============================================================================
router.patch('/:id/read', authenticate, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ success: false, message: 'Invalid notification ID.' });
  }
  try {
    const [result] = await pool.execute(
      `UPDATE notifications
       SET    is_read = 1, read_at = NOW()
       WHERE  notification_id = ? AND recipient_id = ? AND is_read = 0`,
      [id, req.user.userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found or already read.' });
    }
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[Notifications] Mark-read error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

// =============================================================================
// PATCH /api/notifications/read-all
// =============================================================================
router.patch('/read-all', authenticate, async (req, res) => {
  try {
    const [result] = await pool.execute(
      `UPDATE notifications
       SET    is_read = 1, read_at = NOW()
       WHERE  recipient_id = ? AND is_read = 0`,
      [req.user.userId]
    );
    return res.status(200).json({ success: true, updated: result.affectedRows });
  } catch (err) {
    console.error('[Notifications] Read-all error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

export default router;
