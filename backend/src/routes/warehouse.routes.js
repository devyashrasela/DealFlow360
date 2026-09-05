import { Router } from 'express';
import { authenticate, resolveOrgContext, requireRoles } from '../middleware/auth.middleware.js';
import { listWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../controllers/warehouse.controller.js';

const router = Router();

router.use(authenticate);
router.use(resolveOrgContext);
router.use(requireRoles('admin'));

router.get('/', listWarehouses);
router.post('/', createWarehouse);
router.put('/:id', updateWarehouse);
router.delete('/:id', deleteWarehouse);

export default router;
