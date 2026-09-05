import { AuditLog } from '../models/session.models.js';

/**
 * Write an immutable audit log entry.
 * Fails silently (only logs) so audit errors never break the main flow.
 */
export async function writeAuditLog({
  actor_user_id = null,
  actor_membership_id = null,
  entity_type,
  entity_id,
  action,
  payload_before = null,
  payload_after = null,
  ip_address = null,
}) {
  try {
    await AuditLog.create({
      actor_user_id,
      actor_membership_id,
      entity_type,
      entity_id,
      action,
      payload_before,
      payload_after,
      ip_address,
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write audit log:', err.message);
  }
}
