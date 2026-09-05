import { Router } from 'express';
import { listCustomers } from '../controllers/customer.controller.js';
import { authenticate, resolveOrgContext } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate);
router.use(resolveOrgContext);
router.get('/', listCustomers);

export default router;
