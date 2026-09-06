import { Router } from 'express';
import { listActivityFeed } from '../controllers/notification.controller.js';
import { authenticate, resolveOrgContext } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(resolveOrgContext);

router.get('/', listActivityFeed);

export default router;
