/**
 * @file protectedRoutes.js
 * @module src/routes/protectedRoutes
 * @description Example protected routes demonstrating RBAC middleware and
 *              audit logger integration across different role combinations.
 *
 * These routes serve as integration reference patterns for the downstream
 * IDMS modules (Transportation, Catering, Classroom Allocation, etc.).
 * Each route documents clearly which roles are permitted and why.
 *
 * Routes:
 *   GET /api/admin/dashboard          — Directors only.
 *   GET /api/catering/meal-summary    — Directors and Catering Staff.
 *   GET /api/transport/route-overview — Directors and Transport Coordinators.
 *   GET /api/me                       — Any authenticated user (own profile).
 */

import { Router } from 'express';
import pool from '../config/db.js';
import { authenticate, checkRole } from '../middleware/auth.js';
import { logAction, AuditAction } from '../utils/logger.js';

const router = Router();

// =============================================================================
// GET /api/admin/dashboard
// Access: Director only
// =============================================================================

/**
 * @route   GET /api/admin/dashboard
 * @access  Director
 * @desc    Returns a high-level system summary (user counts by role, recent
 *          audit activity). Restricted to the Daycare Director as this
 *          surface exposes organisation-wide operational data.
 */
router.get(
  '/admin/dashboard',
  authenticate,
  checkRole('Director'),
  async (req, res) => {
    try {
      // Aggregate user counts per role for the KPI panel.
      const [userStats] = await pool.execute(
        `SELECT r.role_name,
                COUNT(u.user_id) AS total_users,
                SUM(u.is_active) AS active_users
         FROM   roles r
         LEFT JOIN users u ON u.role_id = r.role_id
         GROUP BY r.role_id, r.role_name
         ORDER BY r.role_id`
      );

      // Fetch the 10 most recent audit entries for the activity feed.
      const [recentAudit] = await pool.execute(
        `SELECT al.log_id,
                al.action,
                al.target_module,
                al.ip_address,
                al.created_at,
                u.full_name AS actor_name
         FROM   audit_logs al
         LEFT JOIN users u ON u.user_id = al.user_id
         ORDER BY al.created_at DESC
         LIMIT  10`
      );

      // Log that the director accessed this sensitive dashboard.
      await logAction({
        userId:       req.user.userId,
        action:       AuditAction.RESOURCE_ACCESSED,
        targetModule: 'admin',
        ipAddress:    req.ip,
        metadata:     { endpoint: '/admin/dashboard' },
      });

      return res.status(200).json({
        success: true,
        data: {
          userStatsByRole: userStats,
          recentAuditActivity: recentAudit,
        },
      });
    } catch (err) {
      console.error('[Protected] Dashboard error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
  }
);

// =============================================================================
// GET /api/catering/meal-summary
// Access: Director, Catering Staff
// =============================================================================

/**
 * @route   GET /api/catering/meal-summary
 * @access  Director, Catering Staff
 * @desc    Placeholder meal summary endpoint. Demonstrates multi-role RBAC.
 *          In the full Module 4 implementation this would query the meals
 *          and allergen tables.
 */
router.get(
  '/catering/meal-summary',
  authenticate,
  checkRole('Director', 'Catering Staff'),
  async (req, res) => {
    await logAction({
      userId:       req.user.userId,
      action:       AuditAction.RESOURCE_ACCESSED,
      targetModule: 'catering',
      ipAddress:    req.ip,
      metadata:     { endpoint: '/catering/meal-summary', role: req.user.roleName },
    });

    return res.status(200).json({
      success: true,
      message: 'Catering meal summary endpoint — Module 4 implementation pending.',
      accessedBy: {
        userId:   req.user.userId,
        roleName: req.user.roleName,
      },
    });
  }
);

// =============================================================================
// GET /api/transport/route-overview
// Access: Director, Transport Coordinators
// =============================================================================

/**
 * @route   GET /api/transport/route-overview
 * @access  Director, Transport Coordinator
 * @desc    Placeholder transport overview endpoint. Demonstrates that the same
 *          checkRole factory works cleanly with any role combination.
 */
router.get(
  '/transport/route-overview',
  authenticate,
  checkRole('Director', 'Transport Coordinator'),
  async (req, res) => {
    await logAction({
      userId:       req.user.userId,
      action:       AuditAction.RESOURCE_ACCESSED,
      targetModule: 'transport',
      ipAddress:    req.ip,
      metadata:     { endpoint: '/transport/route-overview', role: req.user.roleName },
    });

    return res.status(200).json({
      success: true,
      message: 'Transport route overview endpoint — Module 3 implementation pending.',
      accessedBy: {
        userId:   req.user.userId,
        roleName: req.user.roleName,
      },
    });
  }
);

// =============================================================================
// GET /api/me
// Access: Any authenticated user (own profile only)
// =============================================================================

/**
 * @route   GET /api/me
 * @access  Any authenticated user
 * @desc    Returns the calling user's own profile data.
 *          No checkRole() call — any valid JWT is sufficient.
 *          Demonstrates that authenticate() alone is a valid guard.
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.user_id,
              u.full_name,
              u.email,
              u.is_active,
              u.created_at,
              r.role_name
       FROM   users u
       JOIN   roles r ON r.role_id = u.role_id
       WHERE  u.user_id = ?`,
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }

    return res.status(200).json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('[Protected] /me error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
});

export default router;
