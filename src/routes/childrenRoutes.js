/**
 * @file childrenRoutes.js
 * @module src/routes/childrenRoutes
 * @description Child profile management endpoints for Module 2.
 *
 * Role-based data scoping:
 *   Director          → sees ALL children across all classrooms
 *   Educator          → sees only children in the classroom where educator_id = their user_id
 *   Parent            → sees only their own linked children (via child_parent_link)
 *
 * Routes:
 *   GET   /api/children              — List children (role-filtered)
 *   POST  /api/children              — Enrol a new child (Director, Educator)
 *   GET   /api/children/:id          — Get child profile + parent links (Director, Educator, Parent)
 *   PATCH /api/children/:id          — Update child profile (Director, Educator)
 *   PATCH /api/children/:id/withdraw — Soft-withdraw a child (Director only)
 *   POST  /api/children/:id/parents  — Link a parent account to a child (Director only)
 */

import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, checkRole } from '../middleware/auth.js';
import { logAction, AuditAction }  from '../utils/logger.js';

const router = Router();

// =============================================================================
// GET /api/children
// Access: Director, Educator, Parent (each sees a different scope)
// =============================================================================
router.get(
  '/',
  authenticate,
  checkRole('Director', 'Educator', 'Parent'),
  async (req, res) => {
    try {
      let rows;

      if (req.user.roleName === 'Director') {
        // Directors see every enrolled child with classroom info
        [rows] = await pool.execute(
          `SELECT ch.child_id, ch.first_name, ch.last_name, ch.date_of_birth,
                  ch.gender, ch.is_active, ch.enrolled_at,
                  ch.dietary_notes, ch.medical_notes,
                  ch.emergency_contact, ch.emergency_phone,
                  cl.classroom_id, cl.name AS classroom_name, cl.color_tag
           FROM   children ch
           LEFT JOIN classrooms cl ON cl.classroom_id = ch.classroom_id
           WHERE  ch.is_active = 1
           ORDER BY ch.last_name, ch.first_name`
        );

      } else if (req.user.roleName === 'Educator') {
        // Educators see only the children assigned to their classroom
        [rows] = await pool.execute(
          `SELECT ch.child_id, ch.first_name, ch.last_name, ch.date_of_birth,
                  ch.gender, ch.is_active, ch.enrolled_at,
                  ch.dietary_notes, ch.medical_notes,
                  ch.emergency_contact, ch.emergency_phone,
                  cl.classroom_id, cl.name AS classroom_name, cl.color_tag
           FROM   children ch
           JOIN   classrooms cl ON cl.classroom_id = ch.classroom_id
                               AND cl.educator_id  = ?
           WHERE  ch.is_active = 1
           ORDER BY ch.last_name, ch.first_name`,
          [req.user.userId]
        );

      } else {
        // Parents see their active children plus any approved/enrolled
        // registrations that haven't been activated yet — so the dashboard
        // reflects every child they have a relationship with.
        [rows] = await pool.execute(
          `SELECT ch.child_id, ch.first_name, ch.last_name, ch.date_of_birth,
                  ch.gender, ch.is_active, ch.enrolled_at,
                  ch.enrollment_status,
                  cl.classroom_id, cl.name AS classroom_name, cl.color_tag,
                  cpl.relationship, cpl.is_primary_contact
           FROM   child_parent_link cpl
           JOIN   children  ch ON ch.child_id    = cpl.child_id
           LEFT JOIN classrooms cl ON cl.classroom_id = ch.classroom_id
           WHERE  cpl.parent_user_id = ?
             AND  ch.enrollment_status IN ('approved', 'enrolled', 'active')
           ORDER BY FIELD(ch.enrollment_status, 'active', 'enrolled', 'approved'),
                    ch.last_name, ch.first_name`,
          [req.user.userId]
        );
      }

      return res.status(200).json({ success: true, children: rows });
    } catch (err) {
      console.error('[Children] List error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// =============================================================================
// POST /api/children
// Access: Director, Educator
// Body: { firstName, lastName, dateOfBirth, gender?, classroomId?,
//         medicalNotes?, dietaryNotes?, emergencyContact?, emergencyPhone?, enrolledAt? }
// =============================================================================
router.post(
  '/',
  authenticate,
  checkRole('Director', 'Educator'),
  async (req, res) => {
    const {
      firstName, lastName, dateOfBirth,
      gender        = 'Other',
      classroomId   = null,
      medicalNotes  = null,
      dietaryNotes  = null,
      emergencyContact = null,
      emergencyPhone   = null,
      enrolledAt    = null,
    } = req.body;

    if (!firstName || !lastName || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, and dateOfBirth are required.',
      });
    }

    // Educators can only enrol into their own classroom
    let resolvedClassroomId = classroomId;
    if (req.user.roleName === 'Educator') {
      const [[cls]] = await pool.execute(
        'SELECT classroom_id FROM classrooms WHERE educator_id = ? AND is_active = 1 LIMIT 1',
        [req.user.userId]
      );
      if (!cls) {
        return res.status(403).json({ success: false, message: 'You are not assigned to any active classroom.' });
      }
      resolvedClassroomId = cls.classroom_id;
    }

    try {
      const [result] = await pool.execute(
        `INSERT INTO children
           (first_name, last_name, date_of_birth, gender, classroom_id,
            medical_notes, dietary_notes, emergency_contact, emergency_phone, enrolled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, CURDATE()))`,
        [
          String(firstName).trim(), String(lastName).trim(),
          dateOfBirth, gender, resolvedClassroomId,
          medicalNotes, dietaryNotes, emergencyContact, emergencyPhone, enrolledAt,
        ]
      );

      await logAction({
        userId:       req.user.userId,
        action:       AuditAction.RESOURCE_MODIFIED,
        targetModule: 'children',
        ipAddress:    req.ip,
        metadata:     { action: 'enrol', childId: result.insertId, firstName, lastName },
      });

      return res.status(201).json({
        success: true,
        message: `${firstName} ${lastName} enrolled.`,
        childId: result.insertId,
      });
    } catch (err) {
      console.error('[Children] Create error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// =============================================================================
// GET /api/children/:id
// Access: Director, Educator (any classroom), Parent (only their own child)
// Returns full child profile + parent links + today's attendance status.
// =============================================================================
router.get(
  '/:id',
  authenticate,
  checkRole('Director', 'Educator', 'Parent'),
  async (req, res) => {
    const childId = Number(req.params.id);
    if (!Number.isInteger(childId) || childId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid child ID.' });
    }

    try {
      // Enforce parent scope — parents may only fetch their own child
      if (req.user.roleName === 'Parent') {
        const [[link]] = await pool.execute(
          'SELECT 1 FROM child_parent_link WHERE child_id = ? AND parent_user_id = ?',
          [childId, req.user.userId]
        );
        if (!link) {
          return res.status(403).json({ success: false, message: 'Access denied.' });
        }
      }

      const [[child]] = await pool.execute(
        `SELECT ch.*,
                cl.name AS classroom_name, cl.color_tag
         FROM   children ch
         LEFT JOIN classrooms cl ON cl.classroom_id = ch.classroom_id
         WHERE  ch.child_id = ?`,
        [childId]
      );
      if (!child) {
        return res.status(404).json({ success: false, message: 'Child not found.' });
      }

      const [parents] = await pool.execute(
        `SELECT u.user_id, u.full_name, u.email,
                cpl.relationship, cpl.is_primary_contact
         FROM   child_parent_link cpl
         JOIN   users u ON u.user_id = cpl.parent_user_id
         WHERE  cpl.child_id = ?`,
        [childId]
      );

      const [[todayAttendance]] = await pool.execute(
        `SELECT status, check_in_time, check_out_time, notes
         FROM   attendance_logs
         WHERE  child_id = ? AND attendance_date = CURDATE()`,
        [childId]
      );

      return res.status(200).json({
        success: true,
        child: { ...child, parents, todayAttendance: todayAttendance || null },
      });
    } catch (err) {
      console.error('[Children] Get error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// =============================================================================
// PATCH /api/children/:id
// Access: Director, Educator
// Body: any subset of child fields
// =============================================================================
router.patch(
  '/:id',
  authenticate,
  checkRole('Director', 'Educator'),
  async (req, res) => {
    const childId = Number(req.params.id);
    if (!Number.isInteger(childId) || childId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid child ID.' });
    }

    const allowed = [
      'first_name', 'last_name', 'date_of_birth', 'gender', 'classroom_id',
      'medical_notes', 'dietary_notes', 'emergency_contact', 'emergency_phone',
    ];

    // Map camelCase body keys to snake_case column names
    const keyMap = {
      firstName:        'first_name',
      lastName:         'last_name',
      dateOfBirth:      'date_of_birth',
      gender:           'gender',
      classroomId:      'classroom_id',
      medicalNotes:     'medical_notes',
      dietaryNotes:     'dietary_notes',
      emergencyContact: 'emergency_contact',
      emergencyPhone:   'emergency_phone',
    };

    const fields = [];
    const values = [];
    for (const [bodyKey, colName] of Object.entries(keyMap)) {
      if (req.body[bodyKey] !== undefined && allowed.includes(colName)) {
        fields.push(`${colName} = ?`);
        values.push(req.body[bodyKey]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided to update.' });
    }
    values.push(childId);

    try {
      const [result] = await pool.execute(
        `UPDATE children SET ${fields.join(', ')} WHERE child_id = ?`,
        values
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Child not found.' });
      }

      await logAction({
        userId:       req.user.userId,
        action:       AuditAction.RESOURCE_MODIFIED,
        targetModule: 'children',
        ipAddress:    req.ip,
        metadata:     { action: 'update', childId, fields: Object.keys(req.body) },
      });

      return res.status(200).json({ success: true, message: 'Child profile updated.' });
    } catch (err) {
      console.error('[Children] Update error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// =============================================================================
// PATCH /api/children/:id/withdraw
// Access: Director only — soft-withdrawal (is_active = 0)
// =============================================================================
router.patch(
  '/:id/withdraw',
  authenticate,
  checkRole('Director'),
  async (req, res) => {
    const childId = Number(req.params.id);
    if (!Number.isInteger(childId) || childId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid child ID.' });
    }

    try {
      const [result] = await pool.execute(
        'UPDATE children SET is_active = 0 WHERE child_id = ? AND is_active = 1',
        [childId]
      );
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Child not found or already withdrawn.' });
      }

      await logAction({
        userId:       req.user.userId,
        action:       AuditAction.RESOURCE_MODIFIED,
        targetModule: 'children',
        ipAddress:    req.ip,
        metadata:     { action: 'withdraw', childId },
      });

      return res.status(200).json({ success: true, message: 'Child withdrawn.' });
    } catch (err) {
      console.error('[Children] Withdraw error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// =============================================================================
// POST /api/children/:id/parents
// Access: Director only
// Body: { parentUserId, relationship?, isPrimaryContact? }
// Links an existing Parent account to this child.
// =============================================================================
router.post(
  '/:id/parents',
  authenticate,
  checkRole('Director'),
  async (req, res) => {
    const childId = Number(req.params.id);
    if (!Number.isInteger(childId) || childId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid child ID.' });
    }

    const { parentUserId, relationship = 'Parent', isPrimaryContact = 0 } = req.body;
    if (!parentUserId) {
      return res.status(400).json({ success: false, message: 'parentUserId is required.' });
    }

    try {
      await pool.execute(
        `INSERT INTO child_parent_link (child_id, parent_user_id, relationship, is_primary_contact)
         VALUES (?, ?, ?, ?)`,
        [childId, Number(parentUserId), String(relationship), isPrimaryContact ? 1 : 0]
      );

      await logAction({
        userId:       req.user.userId,
        action:       AuditAction.RESOURCE_MODIFIED,
        targetModule: 'children',
        ipAddress:    req.ip,
        metadata:     { action: 'link_parent', childId, parentUserId },
      });

      return res.status(201).json({ success: true, message: 'Parent linked to child.' });
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, message: 'This parent is already linked to the child.' });
      }
      if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(404).json({ success: false, message: 'Child or parent user not found.' });
      }
      console.error('[Children] Link parent error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

export default router;
