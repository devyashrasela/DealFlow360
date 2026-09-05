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

// Governance configuration requires authentication and org context
router.use(authenticate);
router.use(resolveOrgContext);

const readRoles = requireRoles('admin', 'finance_ops', 'sales_manager');
const writeRoles = requireRoles('admin');

// Discount Tier Ceilings
router.get('/tier-ceilings', readRoles, listTierCeilings);
router.put('/tier-ceilings', writeRoles, upsertTierCeiling);
router.delete('/tier-ceilings/:id', writeRoles, deleteTierCeiling);

// Category Ceilings
router.get('/category-ceilings', readRoles, listCategoryCeilings);
router.put('/category-ceilings', writeRoles, upsertCategoryCeiling);
router.delete('/category-ceilings/:id', writeRoles, deleteCategoryCeiling);

// Approval Chains
router.get('/approval-chains', readRoles, listApprovalChains);
router.post('/approval-chains', writeRoles, createApprovalChain);
router.put('/approval-chains/:id', writeRoles, updateApprovalChain);
router.delete('/approval-chains/:id', writeRoles, deleteApprovalChain);

// Approval Rules
router.post('/approval-chains/:chainId/rules', writeRoles, addApprovalRule);
router.put('/approval-chains/:chainId/rules/:ruleId', writeRoles, updateApprovalRule);
router.delete('/approval-chains/:chainId/rules/:ruleId', writeRoles, deleteApprovalRule);

export default router;
