import { Router } from 'express';
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllRead,
  dismissNotification,
  listActivityFeed,
} from '../controllers/notification.controller.js';
import { authenticate, resolveOrgContext } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(resolveOrgContext);

// Notification endpoints
router.get('/', listNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/:id/read', markAsRead);
router.post('/mark-all-read', markAllRead);
router.patch('/:id/dismiss', dismissNotification);

export default router;
