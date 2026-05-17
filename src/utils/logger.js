import pool from '../config/db.js';

export const AuditAction = Object.freeze({
  USER_REGISTERED:     'USER_REGISTERED',
  USER_LOGIN:          'USER_LOGIN',
  USER_LOGIN_FAILED:   'USER_LOGIN_FAILED',
  USER_LOGOUT:         'USER_LOGOUT',
  USER_SUSPENDED:      'USER_SUSPENDED',
  USER_ACTIVATED:      'USER_ACTIVATED',
  USER_ROLE_CHANGED:   'USER_ROLE_CHANGED',
  RESOURCE_ACCESSED:   'RESOURCE_ACCESSED',
  RESOURCE_MODIFIED:   'RESOURCE_MODIFIED',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
});

/**
 * Writes a structured audit record to the `audit_logs` table.
 * Non-throwing by design — a logging failure must never abort the parent operation.
 *
 * @param {{ userId: number|null, action: string, targetModule: string, ipAddress?: string|null, metadata?: object|null }} params
 */
export async function logAction({
  userId       = null,
  action,
  targetModule,
  ipAddress    = null,
  metadata     = null,
}) {
  if (!action || !targetModule) {
    console.warn('[Audit] logAction called with missing required fields:', { action, targetModule });
    return;
  }

  try {
    await pool.execute(
      `INSERT INTO audit_logs (user_id, action, target_module, ip_address, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      [
        userId    ?? null,
        action,
        targetModule,
        ipAddress ?? null,
        metadata  ? JSON.stringify(metadata) : null,
      ]
    );
  } catch (err) {
    console.error('[Audit] Failed to write audit log entry:', {
      error: err.message, userId, action, targetModule,
    });
  }
}
