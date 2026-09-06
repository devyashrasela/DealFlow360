import { Router } from 'express';
import { globalSearch } from '../controllers/search.controller.js';
import { authenticate, resolveOrgContext } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(resolveOrgContext);

router.get('/', globalSearch);

export default router;
