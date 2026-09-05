import express from 'express';
import {
  submitForApproval,
  listPendingApprovals,
  getApprovalDetail,
  approveQuotation,
  rejectQuotation,
  returnQuotation,
  listAuditLogs
} from '../controllers/approval.controller.js';
import { authenticate, resolveOrgContext, requireRoles } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);
router.use(resolveOrgContext);

router.get(
  '/pending',
  requireRoles('admin', 'sales_manager', 'finance_ops'),
  listPendingApprovals
);

router.post(
  '/:quotationId/submit',
  requireRoles('admin', 'sales_manager', 'sales_rep'),
  submitForApproval
);

router.get(
  '/:quotationId/approval',
  requireRoles('admin', 'sales_manager', 'finance_ops', 'sales_rep'),
  getApprovalDetail
);

router.post(
  '/:quotationId/approve',
  requireRoles('admin', 'sales_manager', 'finance_ops'),
  approveQuotation
);

router.post(
  '/:quotationId/reject',
  requireRoles('admin', 'sales_manager', 'finance_ops'),
  rejectQuotation
);

router.post(
  '/:quotationId/return',
  requireRoles('admin', 'sales_manager', 'finance_ops'),
  returnQuotation
);

router.get(
  '/:quotationId/audit-logs',
  requireRoles('admin', 'sales_manager', 'finance_ops'),
  listAuditLogs
);

export default router;
