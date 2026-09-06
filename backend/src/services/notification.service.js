import { ActivityEvent, Notification, OrganizationMembership, User } from '../models/index.js';

// ── Role-based notification routing map ─────────────────────────────────────
// Maps event_type patterns to the roles that should receive notifications.
const ROLE_ROUTING = {
  'quotation.submitted':     ['admin', 'sales_manager', 'finance_ops'],
  'quotation.approved':      ['__actor_quote_rep__'],
  'quotation.rejected':      ['__actor_quote_rep__'],
  'quotation.confirmed':     ['__actor_quote_rep__', 'finance_ops'],
  'negotiation.received':    ['__actor_quote_rep__'],
  'negotiation.responded':   ['sales_manager'],
  'fulfillment.shipped':     ['__actor_quote_rep__'],
  'fulfillment.delivered':   ['__actor_quote_rep__'],
  'fulfillment.backorder':   ['sales_manager', 'admin'],
  'invoice.issued':          ['finance_ops', '__actor_quote_rep__'],
  'invoice.paid':            ['finance_ops', '__actor_quote_rep__'],
  'invoice.overdue':         ['finance_ops', 'sales_manager'],
  'subscription.provisioned':['__actor_quote_rep__', 'finance_ops'],
  'subscription.cancelled':  ['sales_manager', 'finance_ops'],
  'deal_health.warning':     ['__actor_quote_rep__', 'sales_manager'],
  'deal_health.critical':    ['sales_manager', 'admin'],
  'deal_health.nudge':       ['__actor_quote_rep__'],
  'role.changed':            ['admin'],
};

/**
 * Emit an activity event and fan out notifications to relevant users.
 *
 * @param {Object} opts
 * @param {string} opts.organizationId - Tenant scope
 * @param {string|null} opts.actorUserId - User who triggered event (null for system)
 * @param {string} opts.eventType - Event category (e.g. 'quotation.submitted')
 * @param {string} opts.entityType - Target entity type (e.g. 'quotation')
 * @param {string} opts.entityId - Target entity ID
 * @param {string} opts.title - Human-readable summary
 * @param {string} [opts.description] - Optional detail text
 * @param {Object} [opts.metadata] - Structured payload
 * @param {string} [opts.severity] - 'info' | 'warning' | 'critical'
 * @param {string[]} [opts.targetUserIds] - Explicit user IDs to notify (overrides role routing)
 * @returns {Promise<ActivityEvent>}
 */
export const emitEvent = async ({
  organizationId,
  actorUserId = null,
  eventType,
  entityType,
  entityId,
  title,
  description = null,
  metadata = {},
  severity = 'info',
  targetUserIds = null,
}) => {
  try {
    // 1. Write the activity event
    const event = await ActivityEvent.create({
      organization_id: organizationId,
      actor_user_id: actorUserId,
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      title,
      description,
      metadata,
      severity,
    });

    // 2. Determine notification recipients
    let recipientUserIds = [];

    if (targetUserIds && targetUserIds.length > 0) {
      // Explicit targeting (e.g., nudge to specific rep)
      recipientUserIds = targetUserIds;
    } else {
      // Role-based routing
      const routingRoles = ROLE_ROUTING[eventType] || [];
      if (routingRoles.length === 0) return event;

      // Separate special markers from real roles
      const realRoles = routingRoles.filter(r => !r.startsWith('__'));
      const needsQuoteRep = routingRoles.includes('__actor_quote_rep__');

      // Fetch org members with matching roles
      if (realRoles.length > 0) {
        const memberships = await OrganizationMembership.findAll({
          where: {
            organization_id: organizationId,
            role: realRoles,
            status: 'active',
          },
          attributes: ['user_id'],
        });
        recipientUserIds = memberships.map(m => m.user_id);
      }

      // Add specific quote rep if needed (from metadata)
      if (needsQuoteRep && metadata.salesRepUserId) {
        if (!recipientUserIds.includes(metadata.salesRepUserId)) {
          recipientUserIds.push(metadata.salesRepUserId);
        }
      }
    }

    // 3. Exclude the actor from their own notifications
    if (actorUserId) {
      recipientUserIds = recipientUserIds.filter(uid => uid !== actorUserId);
    }

    // 4. Fan out notifications
    if (recipientUserIds.length > 0) {
      const notificationRows = recipientUserIds.map(userId => ({
        organization_id: organizationId,
        user_id: userId,
        activity_event_id: event.id,
      }));
      await Notification.bulkCreate(notificationRows);
    }

    return event;
  } catch (error) {
    // Non-blocking: notification failure should never break business flows
    console.error('[NotificationService] emitEvent error:', error);
    return null;
  }
};
