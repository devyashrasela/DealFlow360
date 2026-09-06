import { Op } from 'sequelize';
import { Notification, ActivityEvent, User } from '../models/index.js';

// ── GET /api/notifications ──────────────────────────────────────────────────
export const listNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const organizationId = req.orgContext.organizationId;
    const { unread_only, limit = 20, offset = 0 } = req.query;

    const where = {
      user_id: userId,
      organization_id: organizationId,
      dismissed: false,
    };
    if (unread_only === 'true') {
      where.is_read = false;
    }

    const { count, rows } = await Notification.findAndCountAll({
      where,
      include: [{
        model: ActivityEvent,
        as: 'activity_event',
        include: [{
          model: User,
          as: 'actor',
          attributes: ['id', 'full_name', 'email'],
        }],
      }],
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(limit) || 20, 50),
      offset: parseInt(offset) || 0,
    });

    return res.status(200).json({
      notifications: rows,
      total: count,
      unread: rows.filter(n => !n.is_read).length,
    });
  } catch (error) {
    console.error('List notifications error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch notifications' });
  }
};

// ── GET /api/notifications/unread-count ──────────────────────────────────────
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const organizationId = req.orgContext.organizationId;

    const count = await Notification.count({
      where: {
        user_id: userId,
        organization_id: organizationId,
        is_read: false,
        dismissed: false,
      },
    });

    return res.status(200).json({ count });
  } catch (error) {
    console.error('Unread count error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch unread count' });
  }
};

// ── PATCH /api/notifications/:id/read ───────────────────────────────────────
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, user_id: userId },
    });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    await notification.update({ is_read: true, read_at: new Date() });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Mark as read error:', error);
    return res.status(500).json({ error: error.message || 'Failed to mark as read' });
  }
};

// ── POST /api/notifications/mark-all-read ───────────────────────────────────
export const markAllRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const organizationId = req.orgContext.organizationId;

    const [updated] = await Notification.update(
      { is_read: true, read_at: new Date() },
      {
        where: {
          user_id: userId,
          organization_id: organizationId,
          is_read: false,
        },
      }
    );

    return res.status(200).json({ success: true, updated });
  } catch (error) {
    console.error('Mark all read error:', error);
    return res.status(500).json({ error: error.message || 'Failed to mark all as read' });
  }
};

// ── PATCH /api/notifications/:id/dismiss ────────────────────────────────────
export const dismissNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, user_id: userId },
    });
    if (!notification) return res.status(404).json({ error: 'Notification not found' });

    await notification.update({ dismissed: true });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Dismiss notification error:', error);
    return res.status(500).json({ error: error.message || 'Failed to dismiss notification' });
  }
};

// ── GET /api/activity ───────────────────────────────────────────────────────
export const listActivityFeed = async (req, res) => {
  try {
    const organizationId = req.orgContext.organizationId;
    const { limit = 15, offset = 0, entity_type } = req.query;

    const where = { organization_id: organizationId };
    if (entity_type) {
      where.entity_type = entity_type;
    }

    const { count, rows } = await ActivityEvent.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'actor',
        attributes: ['id', 'full_name', 'email'],
      }],
      order: [['created_at', 'DESC']],
      limit: Math.min(parseInt(limit) || 15, 50),
      offset: parseInt(offset) || 0,
    });

    return res.status(200).json({
      events: rows,
      total: count,
    });
  } catch (error) {
    console.error('Activity feed error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch activity feed' });
  }
};
