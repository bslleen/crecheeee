/**
 * @file notifications.js
 * @module src/utils/notifications
 * @description In-app notification helper. Inserts rows into the
 *              `notifications` table; non-throwing so a delivery failure
 *              cannot abort a workflow transition.
 *
 * Use `notifyRegistrationEvent` for any registration lifecycle event —
 * it resolves the child's linked parents and fans out one row each.
 */

import pool from '../config/db.js';

export const NotificationKind = Object.freeze({
  REGISTRATION_SUBMITTED:   'registration_submitted',
  REGISTRATION_APPROVED:    'registration_approved',
  REGISTRATION_REJECTED:    'registration_rejected',
  REGISTRATION_ENROLLED:    'registration_enrolled',
  REGISTRATION_ACTIVATED:   'registration_activated',
  REGISTRATION_WITHDRAWN:   'registration_withdrawn',
  REGISTRATION_RESUBMITTED: 'registration_resubmitted',
});

/**
 * Insert a single notification row. Connection is optional — pass the
 * caller's transaction connection when delivery must be atomic with the
 * status change; omit to use a one-shot pool connection.
 */
export async function createNotification({
  conn = pool,
  recipientId,
  kind,
  title,
  body     = null,
  metadata = null,
}) {
  if (!recipientId || !kind || !title) {
    console.warn('[Notifications] createNotification missing required fields:', { recipientId, kind, title });
    return;
  }
  try {
    await conn.execute(
      `INSERT INTO notifications (recipient_id, kind, title, body, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [recipientId, kind, title, body, metadata ? JSON.stringify(metadata) : null]
    );
  } catch (err) {
    console.error('[Notifications] insert failed:', { error: err.message, recipientId, kind });
  }
}

/**
 * Fan out a registration-lifecycle event to every parent linked to the child.
 * Uses the same connection if provided (atomic with the status update),
 * otherwise reads parents through the pool.
 *
 * @param {object}  opts
 * @param {object} [opts.conn]    optional transaction connection
 * @param {number}  opts.childId
 * @param {string}  opts.kind     one of NotificationKind.*
 * @param {string}  opts.title
 * @param {string} [opts.body]
 * @param {object} [opts.metadata]
 */
export async function notifyRegistrationEvent({
  conn = pool,
  childId,
  kind,
  title,
  body     = null,
  metadata = null,
}) {
  try {
    const [parents] = await conn.execute(
      `SELECT parent_user_id FROM child_parent_link WHERE child_id = ?`,
      [childId]
    );
    for (const { parent_user_id } of parents) {
      await createNotification({
        conn,
        recipientId: parent_user_id,
        kind, title, body,
        metadata: { childId, ...(metadata ?? {}) },
      });
    }
  } catch (err) {
    console.error('[Notifications] fan-out failed:', { error: err.message, childId, kind });
  }
}
