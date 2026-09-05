import { Router } from 'express';
import { Op } from 'sequelize';
import {
  Quotation, QuotationLine, NegotiationThread,
  FulfillmentOrder, Invoice, InvoiceLine,
} from '../models/index.js';
import { authenticate, resolveOrgContext } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate, resolveOrgContext);

// ── Scope helper: quotes belonging to caller's org or customer account ──
function scopeWhere(req) {
  if (req.headers['x-customer-account-id']) {
    return { customer_account_id: req.headers['x-customer-account-id'] };
  }
  return { organization_id: req.orgContext.organizationId };
}

// ──────────────────────────────────────────────
// POST /api/negotiations/line-request
// Submit line-level discount / qty / remark
// ──────────────────────────────────────────────
router.post('/line-request', async (req, res) => {
  const { quotation_id, quotation_line_id, change_type, proposed_value, message_content } = req.body;
  if (!quotation_id || !change_type || !message_content) {
    return res.status(400).json({ error: 'quotation_id, change_type, message_content required' });
  }
  const allowed = ['discount_request', 'quantity_change', 'general_inquiry'];
  if (!allowed.includes(change_type)) {
    return res.status(400).json({ error: `change_type must be: ${allowed.join('|')}` });
  }

  const quote = await Quotation.findOne({ where: { id: quotation_id, ...scopeWhere(req) } });
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });

  if (!['draft', 'pending_approval', 'under_negotiation'].includes(quote.stage)) {
    return res.status(409).json({ error: `Cannot negotiate in stage: ${quote.stage}` });
  }

  if (quote.stage !== 'under_negotiation') {
    await quote.update({ stage: 'under_negotiation' });
  }

  const thread = await NegotiationThread.create({
    quotation_id,
    quotation_line_id: quotation_line_id || null,
    author_user_id: req.user.id,
    is_customer_message: true,
    change_type,
    proposed_value: proposed_value ?? null,
    message_content,
  });

  res.status(201).json(thread);
});

// ──────────────────────────────────────────────
// POST /api/negotiations/counter-offer
// Order-level counter: target total or counter discount %
// ──────────────────────────────────────────────
router.post('/counter-offer', async (req, res) => {
  const { quotation_id, target_total, counter_discount_percentage, message_content } = req.body;
  if (!quotation_id) return res.status(400).json({ error: 'quotation_id required' });
  if (target_total == null && counter_discount_percentage == null) {
    return res.status(400).json({ error: 'Provide target_total or counter_discount_percentage' });
  }

  const quote = await Quotation.findOne({ where: { id: quotation_id, ...scopeWhere(req) } });
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });

  if (!['draft', 'pending_approval', 'under_negotiation'].includes(quote.stage)) {
    return res.status(409).json({ error: `Cannot counter-offer in stage: ${quote.stage}` });
  }

  await quote.update({
    stage: 'under_negotiation',
    customer_counter_total: target_total ?? quote.customer_counter_total,
    customer_counter_discount: counter_discount_percentage ?? quote.customer_counter_discount,
  });

  const thread = await NegotiationThread.create({
    quotation_id,
    quotation_line_id: null,
    author_user_id: req.user.id,
    is_customer_message: true,
    change_type: 'order_counter',
    proposed_value: target_total ?? counter_discount_percentage,
    message_content: message_content || `Counter-offer submitted`,
  });

  res.status(201).json({ quotation: quote, negotiation: thread });
});

// ──────────────────────────────────────────────
// POST /api/negotiations/confirm
// One-click confirm: lock lines, transition to confirmed
// ──────────────────────────────────────────────
router.post('/confirm', async (req, res) => {
  const { quotation_id } = req.body;
  if (!quotation_id) return res.status(400).json({ error: 'quotation_id required' });

  const quote = await Quotation.findOne({
    where: { id: quotation_id, ...scopeWhere(req) },
    include: [{ model: QuotationLine, as: 'lines' }],
  });
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });

  if (!['under_negotiation', 'approved'].includes(quote.stage)) {
    return res.status(409).json({ error: `Cannot confirm from stage: ${quote.stage}` });
  }

  await quote.update({ stage: 'confirmed', confirmed_at: new Date() });

  // ponytail: downstream fulfillment/billing events are placeholder console.log
  // Wire real event bus when event infrastructure exists
  console.log(`[EVENT] quotation_confirmed: ${quote.id}`);

  res.json({ message: 'Quotation confirmed', quotation: quote });
});

// ──────────────────────────────────────────────
// GET /api/negotiations/my-quotes
// List quotes for portal customer
// ──────────────────────────────────────────────
router.get('/my-quotes', async (req, res) => {
  const quotes = await Quotation.findAll({
    where: scopeWhere(req),
    include: [{ model: QuotationLine, as: 'lines' }],
    order: [['updated_at', 'DESC']],
  });
  res.json(quotes);
});

export default router;
