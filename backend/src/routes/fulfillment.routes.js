import { Router } from 'express';
import {
  getStock,
  getFulfillmentOrders,
  getFulfillmentOrderDetail,
  getSplitPreview,
  ingestConfirmedQuote,
  applyManualSplit,
  getBackorders,
  getConsolidationPrompts,
  executeConsolidationAction,
  receiveStock,
  updateOrderStatus,
} from '../controllers/fulfillment.controller.js';
import { authenticate, resolveOrgContext, requireRoles } from '../middleware/auth.middleware.js';

const router = Router();

// Apply auth middlewares
router.use(authenticate);
router.use(resolveOrgContext);

const requireFulfillmentRoles = requireRoles('admin', 'finance_ops', 'sales_manager');
router.use(requireFulfillmentRoles);

// Inventory & Warehouse Balances
router.get('/stock', getStock);
router.post('/stock/receive', receiveStock);

// Fulfillment Orders & Detail
router.get('/orders', getFulfillmentOrders);
router.get('/orders/:id', getFulfillmentOrderDetail);
router.patch('/orders/:id/status', updateOrderStatus);

// Split Optimization & Manual Overrides
router.get('/split-preview/:quotationId', getSplitPreview);
router.post('/orders/ingest/:quotationId', ingestConfirmedQuote);
router.post('/manual-split/:quotationId', applyManualSplit);

// Backorders & Mid-Fulfillment Consolidation
router.get('/backorders', getBackorders);
router.get('/consolidation-prompts', getConsolidationPrompts);
router.post('/backorders/:id/consolidate', executeConsolidationAction);

export default router;
