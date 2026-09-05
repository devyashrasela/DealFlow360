import { Router } from 'express';
import {
  listSubscriptions,
  getSubscriptionDetail,
  provisionFromQuote,
  modifyQuantity,
  cancelSub,
  previewProration,
} from '../controllers/subscription.controller.js';

const router = Router();

// List all subscriptions (filterable by organization_id, status)
router.get('/', listSubscriptions);

// Get subscription detail with line items, billing schedule, events
router.get('/:id', getSubscriptionDetail);

// Provision a subscription from a confirmed quotation's recurring lines
router.post('/provision/:quotationId', provisionFromQuote);

// Mid-cycle quantity modification with automatic proration
router.post('/:id/modify', modifyQuantity);

// Cancel a subscription (immediate or at period end)
router.post('/:id/cancel', cancelSub);

// Preview proration charges before committing
router.post('/:id/proration-preview', previewProration);

export default router;
