/**
 * @file attendanceRoutes.js
 * @module src/routes/attendanceRoutes
 * @description Attendance management endpoints for Module 2.
 *
 * Routes:
 *   GET  /api/attendance/today         — Today's summary (Director, Educator)
 *   POST /api/attendance/mark          — Mark / update a child's attendance (Director, Educator)
 *   GET  /api/attendance/child/:id     — Full history for one child (Director, Educator, Parent)
 *   GET  /api/attendance/summary       — Week-level stats by classroom (Director only)
 */

import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, checkRole } from '../middleware/auth.js';
import { logAction, AuditAction }  from '../utils/logger.js';

const router = Router();

// =============================================================================
// GET /api/attendance/today
// Access: Director (all classrooms), Educator (own classroom only)
// Returns every active child with their attendance status for today.
// Children with no log entry yet appear as status = null.
// =============================================================================
router.get(
  '/today',
  authenticate,
  checkRole('Director', 'Educator'),
  async (req, res) => {
    try {
      let rows;

      if (req.user.roleName === 'Director') {
        [rows] = await pool.execute(
          `SELECT ch.child_id,
                  ch.first_name,
                  ch.last_name,
                  ch.date_of_birth,
                  ch.dietary_notes,
                  ch.classroom_id,
                  cl.name       AS classroom_name,
                  cl.color_tag,
                  al.log_id,
                  al.status,
                  al.check_in_time,
                  al.check_out_time,
                  al.notes
           FROM   children ch
           LEFT JOIN classrooms  cl ON cl.classroom_id = ch.classroom_id
           LEFT JOIN attendance_logs al
                  ON al.child_id        = ch.child_id
                 AND al.attendance_date = CURDATE()
           WHERE  ch.is_active = 1
           ORDER BY cl.name, ch.last_name, ch.first_name`
        );
      } else {
        [rows] = await pool.execute(
          `SELECT ch.child_id,
                  ch.first_name,
                  ch.last_name,
                  ch.date_of_birth,
                  ch.dietary_notes,
                  ch.classroom_id,
                  cl.name       AS classroom_name,
                  cl.color_tag,
                  al.log_id,
                  al.status,
                  al.check_in_time,
                  al.check_out_time,
                  al.notes
           FROM   children ch
           JOIN   classrooms cl ON cl.classroom_id = ch.classroom_id
                               AND cl.educator_id  = ?
           LEFT JOIN attendance_logs al
                  ON al.child_id        = ch.child_id
                 AND al.attendance_date = CURDATE()
           WHERE  ch.is_active = 1
           ORDER BY ch.last_name, ch.first_name`,
          [req.user.userId]
        );
      }

      // Build summary counters
      const total   = rows.length;
      const present = rows.filter(r => r.status === 'present').length;
      const absent  = rows.filter(r => r.status === 'absent').length;
      const late    = rows.filter(r => r.status === 'late').length;
      const excused = rows.filter(r => r.status === 'excused').length;
      const unmarked = rows.filter(r => !r.status).length;

      return res.status(200).json({
        success: true,
        date:    new Date().toISOString().slice(0, 10),
        summary: { total, present, absent, late, excused, unmarked },
        children: rows,
      });
    } catch (err) {
      console.error('[Attendance] Today error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// =============================================================================
// POST /api/attendance/mark
// Access: Director, Educator
// Body: { childId, status, checkInTime?, checkOutTime?, notes?, date? }
// Uses INSERT … ON DUPLICATE KEY UPDATE so a second call updates the row.
// =============================================================================
router.post(
  '/mark',
  authenticate,
  checkRole('Director', 'Educator'),
  async (req, res) => {
    const {
      childId,
      status,
      checkInTime  = null,
      checkOutTime = null,
      notes        = null,
      date,              // optional — defaults to today
    } = req.body;

    if (!childId || !status) {
      return res.status(400).json({ success: false, message: 'childId and status are required.' });
    }

    const VALID_STATUSES = ['present', 'absent', 'late', 'excused'];
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${VALID_STATUSES.join(', ')}.`,
      });
    }

    const attendanceDate = date ?? new Date().toISOString().slice(0, 10);

    try {
      // Educators may only mark children in their own classroom
      if (req.user.roleName === 'Educator') {
        const [[child]] = await pool.execute(
          `SELECT ch.child_id
           FROM   children ch
           JOIN   classrooms cl ON cl.classroom_id = ch.classroom_id
                               AND cl.educator_id  = ?
           WHERE  ch.child_id = ?`,
          [req.user.userId, Number(childId)]
        );
        if (!child) {
          return res.status(403).json({ success: false, message: 'You may only mark attendance for children in your classroom.' });
        }
      }

      await pool.execute(
        `INSERT INTO attendance_logs
           (child_id, attendance_date, status, check_in_time, check_out_time, notes, marked_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           status         = VALUES(status),
           check_in_time  = VALUES(check_in_time),
           check_out_time = VALUES(check_out_time),
           notes          = VALUES(notes),
           marked_by      = VALUES(marked_by)`,
        [Number(childId), attendanceDate, status, checkInTime, checkOutTime, notes, req.user.userId]
      );

      await logAction({
        userId:       req.user.userId,
        action:       AuditAction.RESOURCE_MODIFIED,
        targetModule: 'attendance',
        ipAddress:    req.ip,
        metadata:     { childId, status, date: attendanceDate },
      });

      return res.status(200).json({
        success: true,
        message: `Attendance recorded: ${status} for child #${childId} on ${attendanceDate}.`,
      });
    } catch (err) {
      console.error('[Attendance] Mark error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// =============================================================================
// GET /api/attendance/child/:id
// Access: Director, Educator (own classroom), Parent (own child only)
// Returns last 60 days of attendance history for one child.
// =============================================================================
router.get(
  '/child/:id',
  authenticate,
  checkRole('Director', 'Educator', 'Parent'),
  async (req, res) => {
    const childId = Number(req.params.id);
    if (!Number.isInteger(childId) || childId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid child ID.' });
    }

    try {
      // Scope enforcement
      if (req.user.roleName === 'Parent') {
        const [[link]] = await pool.execute(
          'SELECT 1 FROM child_parent_link WHERE child_id = ? AND parent_user_id = ?',
          [childId, req.user.userId]
        );
        if (!link) {
          return res.status(403).json({ success: false, message: 'Access denied.' });
        }
      } else if (req.user.roleName === 'Educator') {
        const [[child]] = await pool.execute(
          `SELECT ch.child_id FROM children ch
           JOIN classrooms cl ON cl.classroom_id = ch.classroom_id
                             AND cl.educator_id  = ?
           WHERE ch.child_id = ?`,
          [req.user.userId, childId]
        );
        if (!child) {
          return res.status(403).json({ success: false, message: 'This child is not in your classroom.' });
        }
      }

      const [[child]] = await pool.execute(
        `SELECT ch.child_id, ch.first_name, ch.last_name,
                cl.name AS classroom_name
         FROM   children ch
         LEFT JOIN classrooms cl ON cl.classroom_id = ch.classroom_id
         WHERE  ch.child_id = ?`,
        [childId]
      );
      if (!child) {
        return res.status(404).json({ success: false, message: 'Child not found.' });
      }

      const [logs] = await pool.execute(
        `SELECT al.log_id, al.attendance_date, al.status,
                al.check_in_time, al.check_out_time, al.notes,
                u.full_name AS marked_by_name
         FROM   attendance_logs al
         LEFT JOIN users u ON u.user_id = al.marked_by
         WHERE  al.child_id = ?
           AND  al.attendance_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
         ORDER BY al.attendance_date DESC`,
        [childId]
      );

      // Quick stat summary over the returned window
      const presentDays = logs.filter(l => l.status === 'present').length;
      const absentDays  = logs.filter(l => l.status === 'absent').length;
      const lateDays    = logs.filter(l => l.status === 'late').length;
      const excusedDays = logs.filter(l => l.status === 'excused').length;
      const rate = logs.length
        ? Math.round(((presentDays + lateDays) / logs.length) * 100)
        : null;

      return res.status(200).json({
        success: true,
        child,
        stats: { total: logs.length, presentDays, absentDays, lateDays, excusedDays, attendanceRate: rate },
        logs,
      });
    } catch (err) {
      console.error('[Attendance] History error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// =============================================================================
// GET /api/attendance/summary
// Access: Director only
// Returns per-classroom attendance counts for today.
// =============================================================================
router.get(
  '/summary',
  authenticate,
  checkRole('Director'),
  async (req, res) => {
    try {
      const [rows] = await pool.execute(
        `SELECT cl.classroom_id,
                cl.name        AS classroom_name,
                cl.color_tag,
                COUNT(ch.child_id)                                          AS total_enrolled,
                SUM(al.status = 'present')                                  AS present,
                SUM(al.status = 'absent')                                   AS absent,
                SUM(al.status = 'late')                                     AS late,
                SUM(al.status = 'excused')                                  AS excused,
                SUM(al.status IS NULL)                                      AS unmarked
         FROM   classrooms cl
         JOIN   children ch ON ch.classroom_id = cl.classroom_id
                            AND ch.is_active   = 1
         LEFT JOIN attendance_logs al
                ON al.child_id        = ch.child_id
               AND al.attendance_date = CURDATE()
         WHERE  cl.is_active = 1
         GROUP BY cl.classroom_id
         ORDER BY cl.name`
      );

      return res.status(200).json({
        success: true,
        date:    new Date().toISOString().slice(0, 10),
        classrooms: rows,
      });
    } catch (err) {
      console.error('[Attendance] Summary error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

export default router;
