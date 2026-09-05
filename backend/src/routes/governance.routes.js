import { Router } from 'express';
import { authenticate, resolveOrgContext, requireRoles } from '../middleware/auth.middleware.js';
import {
  listTierCeilings,
  upsertTierCeiling,
  deleteTierCeiling,
  listCategoryCeilings,
  upsertCategoryCeiling,
  deleteCategoryCeiling,
  listApprovalChains,
  createApprovalChain,
  updateApprovalChain,
  deleteApprovalChain,
  addApprovalRule,
  updateApprovalRule,
  deleteApprovalRule
} from '../controllers/governance.controller.js';

const router = Router();

// Governance configuration requires authentication, org context, and specific roles
router.use(authenticate);
router.use(resolveOrgContext);
router.use(requireRoles('admin', 'sales_manager'));

// Discount Tier Ceilings
router.get('/tier-ceilings', listTierCeilings);
router.put('/tier-ceilings', upsertTierCeiling);
router.delete('/tier-ceilings/:id', deleteTierCeiling);

// Category Ceilings
router.get('/category-ceilings', listCategoryCeilings);
router.put('/category-ceilings', upsertCategoryCeiling);
router.delete('/category-ceilings/:id', deleteCategoryCeiling);

// Approval Chains
router.get('/approval-chains', listApprovalChains);
router.post('/approval-chains', createApprovalChain);
router.put('/approval-chains/:id', updateApprovalChain);
router.delete('/approval-chains/:id', deleteApprovalChain);

// Approval Rules
router.post('/approval-chains/:chainId/rules', addApprovalRule);
router.put('/approval-chains/:chainId/rules/:ruleId', updateApprovalRule);
router.delete('/approval-chains/:chainId/rules/:ruleId', deleteApprovalRule);

export default router;
