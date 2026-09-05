import { Router } from 'express';
import {
  createQuotation,
  listQuotations,
  getQuotation,
  updateQuotation,
  deleteQuotation,
  confirmQuotation,
  addLine,
  updateLine,
  removeLine,
  getUpsells
} from '../controllers/quotation.controller.js';
import { authenticate, resolveOrgContext, requireRoles } from '../middleware/auth.middleware.js';

const router = Router();

router.use(authenticate);
router.use(resolveOrgContext);

const allowedRoles = requireRoles('admin', 'sales_manager', 'sales_rep');

router.post('/', allowedRoles, createQuotation);
router.get('/', allowedRoles, listQuotations);
router.get('/:quotationId', allowedRoles, getQuotation);
router.put('/:quotationId', allowedRoles, updateQuotation);
router.delete('/:quotationId', allowedRoles, deleteQuotation);
router.post('/:quotationId/confirm', allowedRoles, confirmQuotation);

router.post('/:quotationId/lines', allowedRoles, addLine);
router.put('/:quotationId/lines/:lineId', allowedRoles, updateLine);
router.delete('/:quotationId/lines/:lineId', allowedRoles, removeLine);

router.get('/:quotationId/upsells', allowedRoles, getUpsells);

export default router;

