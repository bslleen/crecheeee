/**
 * @file registrationRoutes.js
 * @module src/routes/registrationRoutes
 * @description Multi-step child registration workflow for Module 2.
 *
 * State machine (enforced both in SQL UPDATE and at the application layer):
 *   pending   → approved | rejected | withdrawn
 *   approved  → enrolled | rejected
 *   enrolled  → active   | rejected
 *   rejected  → pending           (parent resubmits)
 *   active    → withdrawn         (handled by childrenRoutes)
 *
 * Routes:
 *   POST  /api/registrations                   — Submit new registration (Director, Parent)
 *   GET   /api/registrations                   — List (Director: all, Parent: their own)
 *   GET   /api/registrations/:id               — Detail (Director)
 *   PATCH /api/registrations/:id/approve       — pending → approved (Director)
 *   PATCH /api/registrations/:id/reject        — pending|approved → rejected (Director)
 *   PATCH /api/registrations/:id/enroll        — approved → enrolled (Director)
 *   PATCH /api/registrations/:id/activate      — enrolled → active (Director)
 *   PATCH /api/registrations/:id/withdraw      — pending → withdrawn (Parent owns child)
 *   PATCH /api/registrations/:id/resubmit      — rejected → pending  (Parent owns child)
 */

import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, checkRole } from '../middleware/auth.js';
import { logAction, AuditAction }  from '../utils/logger.js';
import {
  notifyRegistrationEvent,
  createNotification,
  NotificationKind,
} from '../utils/notifications.js';

const router = Router();

const IN_PROGRESS  = ['pending', 'approved', 'enrolled'];
const ALL_STATUSES = ['pending', 'approved', 'enrolled', 'rejected', 'withdrawn'];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Verify that the calling parent is linked to the given child.
 * Returns true / false.
 */
async function parentOwnsChild(conn, childId, parentUserId) {
  const [[link]] = await conn.execute(
    'SELECT 1 AS ok FROM child_parent_link WHERE child_id = ? AND parent_user_id = ?',
    [childId, parentUserId]
  );
  return Boolean(link);
}

/**
 * Pretty name of a child for notification text. Falls back to ID.
 */
function childName(row) {
  return row?.first_name && row?.last_name
    ? `${row.first_name} ${row.last_name}`
    : `Child #${row?.child_id ?? ''}`;
}

// =============================================================================
// POST /api/registrations
// Access: Director, Parent
// Creates a child with enrollment_status='pending', is_active=0.
// Parent caller is auto-linked as primary guardian.
// Notifies all Directors of the new submission.
// =============================================================================
router.post(
  '/',
  authenticate,
  checkRole('Director', 'Parent'),
  async (req, res) => {
    const {
      firstName, lastName, dateOfBirth,
      gender           = 'Other',
      medicalNotes     = null,
      dietaryNotes     = null,
      emergencyContact = null,
      emergencyPhone   = null,
    } = req.body;

    if (!firstName || !lastName || !dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: 'firstName, lastName, and dateOfBirth are required.',
      });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO children
           (first_name, last_name, date_of_birth, gender,
            medical_notes, dietary_notes, emergency_contact, emergency_phone,
            is_active, enrollment_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 'pending')`,
        [
          String(firstName).trim(), String(lastName).trim(),
          dateOfBirth, gender,
          medicalNotes || null,
          dietaryNotes || null,
          emergencyContact || null,
          emergencyPhone   || null,
        ]
      );

      const childId = result.insertId;

      if (req.user.roleName === 'Parent') {
        await conn.execute(
          `INSERT INTO child_parent_link
             (child_id, parent_user_id, relationship, is_primary_contact)
           VALUES (?, ?, 'Parent', 1)`,
          [childId, req.user.userId]
        );
      }

      // Notify every active Director so the new request shows up in their inbox.
      const [directors] = await conn.execute(
        `SELECT u.user_id
         FROM   users u JOIN roles r ON r.role_id = u.role_id
         WHERE  r.role_name = 'Director' AND u.is_active = 1`
      );
      const fullName = `${String(firstName).trim()} ${String(lastName).trim()}`;
      for (const d of directors) {
        await createNotification({
          conn,
          recipientId: d.user_id,
          kind:        NotificationKind.REGISTRATION_SUBMITTED,
          title:       'New registration request',
          body:        `${fullName} has been submitted for review.`,
          metadata:    { childId, submittedBy: req.user.userId },
        });
      }

      await conn.commit();

      await logAction({
        userId:       req.user.userId,
        action:       AuditAction.RESOURCE_MODIFIED,
        targetModule: 'registrations',
        ipAddress:    req.ip,
        metadata:     { action: 'submit', childId, firstName, lastName },
      });

      return res.status(201).json({
        success: true,
        message: `Registration for ${firstName} ${lastName} submitted. Status: pending.`,
        childId,
      });
    } catch (err) {
      await conn.rollback();
      console.error('[Registrations] Create error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    } finally {
      conn.release();
    }
  }
);

// =============================================================================
// GET /api/registrations
// =============================================================================
router.get(
  '/',
  authenticate,
  checkRole('Director', 'Parent'),
  async (req, res) => {
    const { status = 'in-progress' } = req.query;

    let statusFilter;
    if (status === 'all')         statusFilter = ALL_STATUSES;
    else if (status === 'in-progress') statusFilter = IN_PROGRESS;
    else if (ALL_STATUSES.includes(status)) statusFilter = [status];
    else statusFilter = IN_PROGRESS;

    const ph = statusFilter.map(() => '?').join(', ');

    try {
      let rows;

      if (req.user.roleName === 'Director') {
        [rows] = await pool.execute(
          `SELECT ch.child_id, ch.first_name, ch.last_name, ch.date_of_birth, ch.gender,
                  ch.enrollment_status, ch.rejection_reason,
                  ch.reviewed_by, ch.reviewed_at,
                  ch.medical_notes, ch.dietary_notes,
                  ch.emergency_contact, ch.emergency_phone,
                  ch.classroom_id, cl.name AS classroom_name, cl.color_tag,
                  ch.created_at,
                  rev.full_name AS reviewed_by_name
           FROM   children ch
           LEFT JOIN classrooms cl ON cl.classroom_id = ch.classroom_id
           LEFT JOIN users      rev ON rev.user_id    = ch.reviewed_by
           WHERE  ch.enrollment_status IN (${ph})
           ORDER BY ch.created_at DESC`,
          statusFilter
        );
      } else {
        [rows] = await pool.execute(
          `SELECT ch.child_id, ch.first_name, ch.last_name, ch.date_of_birth, ch.gender,
                  ch.enrollment_status, ch.rejection_reason,
                  ch.reviewed_at,
                  ch.classroom_id, cl.name AS classroom_name, cl.color_tag,
                  ch.created_at, cpl.relationship
           FROM   child_parent_link cpl
           JOIN   children ch ON ch.child_id = cpl.child_id
           LEFT JOIN classrooms cl ON cl.classroom_id = ch.classroom_id
           WHERE  cpl.parent_user_id = ?
             AND  ch.enrollment_status IN (${ph})
           ORDER BY ch.created_at DESC`,
          [req.user.userId, ...statusFilter]
        );
      }

      let parentMap = {};
      if (req.user.roleName === 'Director' && rows.length > 0) {
        const childIds = rows.map(r => r.child_id);
        const parentPh = childIds.map(() => '?').join(', ');
        const [parentRows] = await pool.execute(
          `SELECT cpl.child_id, u.user_id, u.full_name, u.email,
                  cpl.relationship, cpl.is_primary_contact
           FROM   child_parent_link cpl
           JOIN   users u ON u.user_id = cpl.parent_user_id
           WHERE  cpl.child_id IN (${parentPh})`,
          childIds
        );
        for (const pr of parentRows) {
          if (!parentMap[pr.child_id]) parentMap[pr.child_id] = [];
          const { child_id, ...rest } = pr;
          parentMap[child_id].push(rest);
        }
      }

      const registrations = rows.map(r => ({
        ...r,
        parents: parentMap[r.child_id] ?? [],
      }));

      const [[summary]] = await pool.execute(
        `SELECT
           SUM(enrollment_status = 'pending')  AS pending,
           SUM(enrollment_status = 'approved') AS approved,
           SUM(enrollment_status = 'enrolled') AS enrolled,
           SUM(enrollment_status = 'rejected') AS rejected
         FROM children
         WHERE enrollment_status IN ('pending','approved','enrolled','rejected')`
      );

      return res.status(200).json({ success: true, registrations, summary });
    } catch (err) {
      console.error('[Registrations] List error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// =============================================================================
// GET /api/registrations/:id
// =============================================================================
router.get(
  '/:id',
  authenticate,
  checkRole('Director'),
  async (req, res) => {
    const childId = Number(req.params.id);
    if (!Number.isInteger(childId) || childId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid child ID.' });
    }

    try {
      const [[child]] = await pool.execute(
        `SELECT ch.*,
                cl.name AS classroom_name, cl.color_tag,
                rev.full_name AS reviewed_by_name
         FROM   children ch
         LEFT JOIN classrooms cl ON cl.classroom_id = ch.classroom_id
         LEFT JOIN users      rev ON rev.user_id    = ch.reviewed_by
         WHERE  ch.child_id = ?
           AND  ch.enrollment_status NOT IN ('active', 'withdrawn')`,
        [childId]
      );

      if (!child) {
        return res.status(404).json({ success: false, message: 'Registration not found.' });
      }

      const [parents] = await pool.execute(
        `SELECT u.user_id, u.full_name, u.email,
                cpl.relationship, cpl.is_primary_contact
         FROM   child_parent_link cpl
         JOIN   users u ON u.user_id = cpl.parent_user_id
         WHERE  cpl.child_id = ?`,
        [childId]
      );

      return res.status(200).json({ success: true, registration: { ...child, parents } });
    } catch (err) {
      console.error('[Registrations] Get error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// =============================================================================
// PATCH /api/registrations/:id/approve   (Director)   pending → approved
// =============================================================================
router.patch(
  '/:id/approve',
  authenticate,
  checkRole('Director'),
  async (req, res) => {
    const childId = Number(req.params.id);
    if (!Number.isInteger(childId) || childId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid child ID.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[child]] = await conn.execute(
        `SELECT child_id, first_name, last_name, enrollment_status
         FROM   children WHERE child_id = ? FOR UPDATE`,
        [childId]
      );
      if (!child) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Registration not found.' });
      }
      if (child.enrollment_status !== 'pending') {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          message: `Cannot approve a registration that is ${child.enrollment_status}.`,
        });
      }

      await conn.execute(
        `UPDATE children
         SET    enrollment_status = 'approved',
                rejection_reason  = NULL,
                reviewed_by       = ?,
                reviewed_at       = NOW()
         WHERE  child_id = ?`,
        [req.user.userId, childId]
      );

      await notifyRegistrationEvent({
        conn,
        childId,
        kind:  NotificationKind.REGISTRATION_APPROVED,
        title: 'Registration approved',
        body:  `Your registration for ${childName(child)} was approved. A classroom will be assigned shortly.`,
      });

      await conn.commit();

      await logAction({
        userId: req.user.userId, action: AuditAction.RESOURCE_MODIFIED,
        targetModule: 'registrations', ipAddress: req.ip,
        metadata: { action: 'approve', childId },
      });

      return res.status(200).json({ success: true, message: 'Registration approved.' });
    } catch (err) {
      await conn.rollback();
      console.error('[Registrations] Approve error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    } finally {
      conn.release();
    }
  }
);

// =============================================================================
// PATCH /api/registrations/:id/reject   (Director)   pending|approved → rejected
// Body: { reason? }
// =============================================================================
router.patch(
  '/:id/reject',
  authenticate,
  checkRole('Director'),
  async (req, res) => {
    const childId = Number(req.params.id);
    if (!Number.isInteger(childId) || childId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid child ID.' });
    }
    const reason = req.body.reason ? String(req.body.reason).trim().slice(0, 255) : null;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[child]] = await conn.execute(
        `SELECT child_id, first_name, last_name, enrollment_status
         FROM   children WHERE child_id = ? FOR UPDATE`,
        [childId]
      );
      if (!child) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Registration not found.' });
      }
      if (!['pending', 'approved'].includes(child.enrollment_status)) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          message: `Cannot reject a registration that is ${child.enrollment_status}.`,
        });
      }

      await conn.execute(
        `UPDATE children
         SET    enrollment_status = 'rejected',
                rejection_reason  = ?,
                reviewed_by       = ?,
                reviewed_at       = NOW()
         WHERE  child_id = ?`,
        [reason, req.user.userId, childId]
      );

      await notifyRegistrationEvent({
        conn,
        childId,
        kind:  NotificationKind.REGISTRATION_REJECTED,
        title: 'Registration not approved',
        body:  reason
          ? `Your registration for ${childName(child)} was not approved. Reason: ${reason}`
          : `Your registration for ${childName(child)} was not approved.`,
        metadata: { reason },
      });

      await conn.commit();

      await logAction({
        userId: req.user.userId, action: AuditAction.RESOURCE_MODIFIED,
        targetModule: 'registrations', ipAddress: req.ip,
        metadata: { action: 'reject', childId, reason },
      });

      return res.status(200).json({ success: true, message: 'Registration rejected.' });
    } catch (err) {
      await conn.rollback();
      console.error('[Registrations] Reject error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    } finally {
      conn.release();
    }
  }
);

// =============================================================================
// PATCH /api/registrations/:id/enroll   (Director)   approved → enrolled
// Body: { classroomId }
// Locks the classroom row to make the capacity check concurrency-safe.
// =============================================================================
router.patch(
  '/:id/enroll',
  authenticate,
  checkRole('Director'),
  async (req, res) => {
    const childId = Number(req.params.id);
    if (!Number.isInteger(childId) || childId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid child ID.' });
    }
    const classroomId = req.body.classroomId ? Number(req.body.classroomId) : null;
    if (!classroomId || !Number.isInteger(classroomId)) {
      return res.status(400).json({ success: false, message: 'classroomId is required.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Lock the child row and verify state
      const [[child]] = await conn.execute(
        `SELECT child_id, first_name, last_name, enrollment_status
         FROM   children WHERE child_id = ? FOR UPDATE`,
        [childId]
      );
      if (!child) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Registration not found.' });
      }
      if (child.enrollment_status !== 'approved') {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          message: `Cannot assign a classroom to a registration that is ${child.enrollment_status}.`,
        });
      }

      // Lock the classroom row, then count currently-occupying children in the same transaction.
      const [[cls]] = await conn.execute(
        `SELECT classroom_id, name, max_capacity, is_active
         FROM   classrooms WHERE classroom_id = ? FOR UPDATE`,
        [classroomId]
      );
      if (!cls || !cls.is_active) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Classroom not found or inactive.' });
      }

      const [[{ enrolled_count }]] = await conn.execute(
        `SELECT COUNT(*) AS enrolled_count
         FROM   children
         WHERE  classroom_id = ?
           AND  (is_active = 1 OR enrollment_status = 'enrolled')`,
        [classroomId]
      );
      if (Number(enrolled_count) >= Number(cls.max_capacity)) {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          message: `Classroom ${cls.name} is at full capacity (${cls.max_capacity} children).`,
        });
      }

      await conn.execute(
        `UPDATE children
         SET    enrollment_status = 'enrolled',
                classroom_id      = ?
         WHERE  child_id = ?`,
        [classroomId, childId]
      );

      await notifyRegistrationEvent({
        conn,
        childId,
        kind:  NotificationKind.REGISTRATION_ENROLLED,
        title: 'Classroom assigned',
        body:  `${childName(child)} has been assigned to the ${cls.name} classroom.`,
        metadata: { classroomId, classroomName: cls.name },
      });

      await conn.commit();

      await logAction({
        userId: req.user.userId, action: AuditAction.RESOURCE_MODIFIED,
        targetModule: 'registrations', ipAddress: req.ip,
        metadata: { action: 'enroll', childId, classroomId },
      });

      return res.status(200).json({ success: true, message: 'Child enrolled and assigned to classroom.' });
    } catch (err) {
      await conn.rollback();
      console.error('[Registrations] Enroll error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    } finally {
      conn.release();
    }
  }
);

// =============================================================================
// PATCH /api/registrations/:id/activate   (Director)   enrolled → active
// =============================================================================
router.patch(
  '/:id/activate',
  authenticate,
  checkRole('Director'),
  async (req, res) => {
    const childId = Number(req.params.id);
    if (!Number.isInteger(childId) || childId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid child ID.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [[child]] = await conn.execute(
        `SELECT child_id, first_name, last_name, enrollment_status
         FROM   children WHERE child_id = ? FOR UPDATE`,
        [childId]
      );
      if (!child) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Registration not found.' });
      }
      if (child.enrollment_status !== 'enrolled') {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          message: `Cannot activate a registration that is ${child.enrollment_status}.`,
        });
      }

      await conn.execute(
        `UPDATE children
         SET    enrollment_status = 'active',
                is_active         = 1,
                enrolled_at       = CURDATE()
         WHERE  child_id = ?`,
        [childId]
      );

      await notifyRegistrationEvent({
        conn,
        childId,
        kind:  NotificationKind.REGISTRATION_ACTIVATED,
        title: 'Welcome to IDMS!',
        body:  `${childName(child)} is now active and will appear in daily attendance.`,
      });

      await conn.commit();

      await logAction({
        userId: req.user.userId, action: AuditAction.RESOURCE_MODIFIED,
        targetModule: 'registrations', ipAddress: req.ip,
        metadata: { action: 'activate', childId },
      });

      return res.status(200).json({
        success: true,
        message: 'Child activated. They now appear in attendance and daily operations.',
      });
    } catch (err) {
      await conn.rollback();
      console.error('[Registrations] Activate error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    } finally {
      conn.release();
    }
  }
);

// =============================================================================
// PATCH /api/registrations/:id/withdraw   (Parent who owns the child)
// Transition: pending → withdrawn
// A parent can pull back a request that hasn't been actioned yet.
// =============================================================================
router.patch(
  '/:id/withdraw',
  authenticate,
  checkRole('Parent'),
  async (req, res) => {
    const childId = Number(req.params.id);
    if (!Number.isInteger(childId) || childId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid child ID.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (!(await parentOwnsChild(conn, childId, req.user.userId))) {
        await conn.rollback();
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }

      const [[child]] = await conn.execute(
        `SELECT child_id, first_name, last_name, enrollment_status
         FROM   children WHERE child_id = ? FOR UPDATE`,
        [childId]
      );
      if (!child) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Registration not found.' });
      }
      if (child.enrollment_status !== 'pending') {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          message: `Only pending registrations can be withdrawn (current status: ${child.enrollment_status}).`,
        });
      }

      await conn.execute(
        `UPDATE children
         SET    enrollment_status = 'withdrawn'
         WHERE  child_id = ?`,
        [childId]
      );

      // Let directors know the request was pulled back.
      const [directors] = await conn.execute(
        `SELECT u.user_id
         FROM   users u JOIN roles r ON r.role_id = u.role_id
         WHERE  r.role_name = 'Director' AND u.is_active = 1`
      );
      for (const d of directors) {
        await createNotification({
          conn,
          recipientId: d.user_id,
          kind:        NotificationKind.REGISTRATION_WITHDRAWN,
          title:       'Registration withdrawn',
          body:        `${childName(child)} was withdrawn by the parent before review.`,
          metadata:    { childId },
        });
      }

      await conn.commit();

      await logAction({
        userId: req.user.userId, action: AuditAction.RESOURCE_MODIFIED,
        targetModule: 'registrations', ipAddress: req.ip,
        metadata: { action: 'withdraw', childId },
      });

      return res.status(200).json({ success: true, message: 'Registration withdrawn.' });
    } catch (err) {
      await conn.rollback();
      console.error('[Registrations] Withdraw error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    } finally {
      conn.release();
    }
  }
);

// =============================================================================
// PATCH /api/registrations/:id/resubmit   (Parent who owns the child)
// Transition: rejected → pending
// Body: any subset of { medicalNotes, dietaryNotes, emergencyContact, emergencyPhone }
// Lets the parent address the rejection reason and put the request back in the queue.
// =============================================================================
router.patch(
  '/:id/resubmit',
  authenticate,
  checkRole('Parent'),
  async (req, res) => {
    const childId = Number(req.params.id);
    if (!Number.isInteger(childId) || childId < 1) {
      return res.status(400).json({ success: false, message: 'Invalid child ID.' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      if (!(await parentOwnsChild(conn, childId, req.user.userId))) {
        await conn.rollback();
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }

      const [[child]] = await conn.execute(
        `SELECT child_id, first_name, last_name, enrollment_status
         FROM   children WHERE child_id = ? FOR UPDATE`,
        [childId]
      );
      if (!child) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Registration not found.' });
      }
      if (child.enrollment_status !== 'rejected') {
        await conn.rollback();
        return res.status(409).json({
          success: false,
          message: `Only rejected registrations can be resubmitted (current status: ${child.enrollment_status}).`,
        });
      }

      // Optionally let the parent revise the editable detail fields when resubmitting.
      const editable = {
        medicalNotes:     'medical_notes',
        dietaryNotes:     'dietary_notes',
        emergencyContact: 'emergency_contact',
        emergencyPhone:   'emergency_phone',
      };
      const fields = [];
      const values = [];
      for (const [k, col] of Object.entries(editable)) {
        if (req.body[k] !== undefined) {
          fields.push(`${col} = ?`);
          values.push(req.body[k] || null);
        }
      }

      const setClause = [
        `enrollment_status = 'pending'`,
        `rejection_reason  = NULL`,
        `reviewed_by       = NULL`,
        `reviewed_at       = NULL`,
        ...fields,
      ].join(', ');

      await conn.execute(
        `UPDATE children SET ${setClause} WHERE child_id = ?`,
        [...values, childId]
      );

      const [directors] = await conn.execute(
        `SELECT u.user_id
         FROM   users u JOIN roles r ON r.role_id = u.role_id
         WHERE  r.role_name = 'Director' AND u.is_active = 1`
      );
      for (const d of directors) {
        await createNotification({
          conn,
          recipientId: d.user_id,
          kind:        NotificationKind.REGISTRATION_RESUBMITTED,
          title:       'Registration resubmitted',
          body:        `${childName(child)} has been resubmitted for review.`,
          metadata:    { childId },
        });
      }

      await conn.commit();

      await logAction({
        userId: req.user.userId, action: AuditAction.RESOURCE_MODIFIED,
        targetModule: 'registrations', ipAddress: req.ip,
        metadata: { action: 'resubmit', childId },
      });

      return res.status(200).json({ success: true, message: 'Registration resubmitted for review.' });
    } catch (err) {
      await conn.rollback();
      console.error('[Registrations] Resubmit error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    } finally {
      conn.release();
    }
  }
);

export default router;
