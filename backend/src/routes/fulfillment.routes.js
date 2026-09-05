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

const router = Router();

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
