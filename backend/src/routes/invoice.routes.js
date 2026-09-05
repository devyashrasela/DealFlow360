import { Router } from 'express';
import {
  listInvoices,
  getInvoiceDetail,
  generateFromQuote,
  recordPaymentHandler,
  applyCreditOffset,
} from '../controllers/invoice.controller.js';

const router = Router();

// List all invoices (filterable by organization_id, status, document_type)
router.get('/', listInvoices);

// Get invoice detail with lines, payments, credit allocations
router.get('/:id', getInvoiceDetail);

// Generate a standard invoice from a confirmed quotation's one-time lines
router.post('/generate/:quotationId', generateFromQuote);

// Record a payment against an invoice
router.post('/:id/payments', recordPaymentHandler);

// Apply a credit note offset against a target invoice
router.post('/:id/apply-credit', applyCreditOffset);

export default router;
