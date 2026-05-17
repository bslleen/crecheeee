/**
 * @file classroomRoutes.js
 * @module src/routes/classroomRoutes
 * @description Classroom management endpoints for Module 2.
 *
 * Routes:
 *   GET   /api/classrooms          — List all classrooms (Director, Educator)
 *   POST  /api/classrooms          — Create a classroom (Director only)
 *   GET   /api/classrooms/:id      — Get a single classroom + children count (Director, Educator)
 *   PATCH /api/classrooms/:id      — Update name / capacity / color / educator (Director only)
 *   PATCH /api/classrooms/:id/deactivate — Soft-delete (Director only)
 */

import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, checkRole } from '../middleware/auth.js';
import { logAction, AuditAction }  from '../utils/logger.js';

const router = Router();

// =============================================================================
// GET /api/classrooms
// Access: Director, Educator
// Returns every classroom with its enrolled child count.
// =============================================================================
router.get(
  '/',
  authenticate,
  checkRole('Director', 'Educator'),
  async (req, res) => {
    try {
      const [rows] = await pool.execute(
        `SELECT cl.classroom_id,
                cl.name,
                cl.max_capacity,
                cl.color_tag,
                cl.is_active,
                cl.created_at,
                u.user_id   AS educator_id,
                u.full_name AS educator_name,
                COUNT(ch.child_id) AS enrolled_count
         FROM   classrooms cl
         LEFT JOIN users u  ON u.user_id    = cl.educator_id
         LEFT JOIN children ch ON ch.classroom_id = cl.classroom_id
                               AND ch.is_active   = 1
         GROUP BY cl.classroom_id
         ORDER BY cl.name`
      );
      return res.status(200).json({ success: true, classrooms: rows });
    } catch (err) {
      console.error('[Classrooms] List error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// =============================================================================
// POST /api/classrooms
// Access: Director only
// Body: { name, maxCapacity?, colorTag?, educatorId? }
// =============================================================================
router.post(
  '/',
  authenticate,
  checkRole('Director'),
  async (req, res) => {
    const { name, maxCapacity = 10, colorTag = '#2BB39B', educatorId = null } = req.body;

    if (!name || String(name).trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Classroom name is required.' });
    }

    try {
      const [result] = await pool.execute(
        `INSERT INTO classrooms (name, max_capacity, color_tag, educator_id)
         VALUES (?, ?, ?, ?)`,
        [String(name).trim(), Number(maxCapacity), String(colorTag), educatorId]
      );

      await logAction({
        userId:       req.user.userId,
        action:       AuditAction.RESOURCE_MODIFIED,
        targetModule: 'classrooms',
        ipAddress:    req.ip,
        metadata:     { action: 'create', classroomId: result.insertId, name },
      });

      return res.status(201).json({
        success:     true,
        message:     `Classroom "${name}" created.`,
        classroomId: result.insertId,
      });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, message: `A classroom named "${name}" already exists.` });
      }
      console.error('[Classrooms] Create error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// =============================================================================
// GET /api/classrooms/:id
// Access: Director, Educator
// Returns classroom detail + list of enrolled children.
// =============================================================================
router.get(
  '/:id',
  authenticate,
  checkRole('Director', 'Educator'),
  async (req, res) => {
    const classroomId = Number(req.params.id);
    if (!Number.isInteger(classroomId) || classroomId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid classroom ID.' });
    }

    try {
      const [[classroom]] = await pool.execute(
        `SELECT cl.classroom_id, cl.name, cl.max_capacity, cl.color_tag, cl.is_active,
                u.user_id AS educator_id, u.full_name AS educator_name
         FROM   classrooms cl
         LEFT JOIN users u ON u.user_id = cl.educator_id
         WHERE  cl.classroom_id = ?`,
        [classroomId]
      );

      if (!classroom) {
        return res.status(404).json({ success: false, message: 'Classroom not found.' });
      }

      const [children] = await pool.execute(
        `SELECT child_id, first_name, last_name, date_of_birth, gender, is_active
         FROM   children
         WHERE  classroom_id = ? AND is_active = 1
         ORDER BY last_name, first_name`,
        [classroomId]
      );

      return res.status(200).json({ success: true, classroom: { ...classroom, children } });
    } catch (err) {
      console.error('[Classrooms] Get error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// =============================================================================
// PATCH /api/classrooms/:id
// Access: Director only
// Body: { name?, maxCapacity?, colorTag?, educatorId? }
// =============================================================================
router.patch(
  '/:id',
  authenticate,
  checkRole('Director'),
  async (req, res) => {
    const classroomId = Number(req.params.id);
    if (!Number.isInteger(classroomId) || classroomId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid classroom ID.' });
    }

    const { name, maxCapacity, colorTag, educatorId } = req.body;
    const fields = [];
    const values = [];

    if (name       !== undefined) { fields.push('name = ?');         values.push(String(name).trim()); }
    if (maxCapacity !== undefined) { fields.push('max_capacity = ?'); values.push(Number(maxCapacity)); }
    if (colorTag   !== undefined) { fields.push('color_tag = ?');    values.push(String(colorTag)); }
    if (educatorId !== undefined) { fields.push('educator_id = ?');  values.push(educatorId); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided to update.' });
    }
    values.push(classroomId);

    try {
      const [result] = await pool.execute(
        `UPDATE classrooms SET ${fields.join(', ')} WHERE classroom_id = ?`,
        values
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Classroom not found.' });
      }

      await logAction({
        userId:       req.user.userId,
        action:       AuditAction.RESOURCE_MODIFIED,
        targetModule: 'classrooms',
        ipAddress:    req.ip,
        metadata:     { action: 'update', classroomId, fields: Object.keys(req.body) },
      });

      return res.status(200).json({ success: true, message: 'Classroom updated.' });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, message: 'Another classroom already has that name.' });
      }
      console.error('[Classrooms] Update error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// =============================================================================
// PATCH /api/classrooms/:id/deactivate
// Access: Director only
// Soft-deletes the classroom (is_active = 0).
// =============================================================================
router.patch(
  '/:id/deactivate',
  authenticate,
  checkRole('Director'),
  async (req, res) => {
    const classroomId = Number(req.params.id);
    if (!Number.isInteger(classroomId) || classroomId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid classroom ID.' });
    }

    try {
      const [result] = await pool.execute(
        'UPDATE classrooms SET is_active = 0 WHERE classroom_id = ? AND is_active = 1',
        [classroomId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Classroom not found or already inactive.' });
      }

      await logAction({
        userId:       req.user.userId,
        action:       AuditAction.RESOURCE_MODIFIED,
        targetModule: 'classrooms',
        ipAddress:    req.ip,
        metadata:     { action: 'deactivate', classroomId },
      });

      return res.status(200).json({ success: true, message: 'Classroom deactivated.' });
    } catch (err) {
      console.error('[Classrooms] Deactivate error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

export default router;
