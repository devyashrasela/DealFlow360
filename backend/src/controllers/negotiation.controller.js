import { Router } from 'express';
import { Op } from 'sequelize';
import {
  Quotation, QuotationLine, NegotiationThread,
  FulfillmentOrder, Invoice, InvoiceLine,
  CustomerAccount, OrganizationMembership, Organization,
  Product, User
} from '../models/index.js';
import { authenticate, resolveOrgContext } from '../middleware/auth.middleware.js';
import { generateInvoiceFromQuote } from '../services/invoice.service.js';
import { executeFulfillmentAllocation } from '../services/fulfillment.service.js';
import { provisionSubscriptionFromQuote } from '../services/subscription.service.js';
import { recalcQuotation } from './quotation.controller.js';
import { emitEvent } from '../services/notification.service.js';

const router = Router();
router.use(authenticate, resolveOrgContext);

// ── Scope helper: quotes belonging to caller's org or customer account ──
async function getScopeWhere(req) {
  const customerAccountId = req.headers['x-customer-account-id'];
  if (customerAccountId) {
    const account = await CustomerAccount.findByPk(customerAccountId);
    if (!account) return { id: null };

    // Verify user has active membership in either provider org or buyer org
    const userMemberships = await OrganizationMembership.findAll({
      where: {
        user_id: req.user.id,
        organization_id: { [Op.in]: [account.provider_organization_id, account.buyer_organization_id] },
        status: 'active'
      }
    });

    if (userMemberships.length === 0) {
      return { id: null }; // Unauthorized access
    }

    return { customer_account_id: customerAccountId };
  }

  // If no explicit customer account ID is provided, check if the user is a customer portal user
  if (req.orgContext?.membership?.role === 'customer_portal') {
    const accounts = await CustomerAccount.findAll({
      where: { buyer_organization_id: req.orgContext.organizationId }
    });
    const accountIds = accounts.map(a => a.id);
    return { customer_account_id: { [Op.in]: accountIds } };
  }

  // Default to provider organization scope
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

  const scope = await getScopeWhere(req);
  const quote = await Quotation.findOne({ where: { id: quotation_id, ...scope } });
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });

  if (!['draft', 'pending_approval', 'under_negotiation', 'approved'].includes(quote.stage)) {
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

  await emitEvent({
    organizationId: quote.organization_id,
    actorUserId: req.user.id,
    eventType: thread.is_customer_message ? 'negotiation.received' : 'negotiation.responded',
    entityType: 'quotation',
    entityId: thread.quotation_id,
    title: `New ${thread.is_customer_message ? 'customer' : 'rep'} message on ${quote.quotation_number}`,
    metadata: { changeType: thread.change_type, salesRepUserId: quote.assigned_sales_rep_id },
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

  const scope = await getScopeWhere(req);
  const quote = await Quotation.findOne({ where: { id: quotation_id, ...scope } });
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });

  if (!['draft', 'pending_approval', 'under_negotiation', 'approved'].includes(quote.stage)) {
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

  await emitEvent({
    organizationId: quote.organization_id,
    actorUserId: req.user.id,
    eventType: thread.is_customer_message ? 'negotiation.received' : 'negotiation.responded',
    entityType: 'quotation',
    entityId: thread.quotation_id,
    title: `New ${thread.is_customer_message ? 'customer' : 'rep'} message on ${quote.quotation_number}`,
    metadata: { changeType: thread.change_type, salesRepUserId: quote.assigned_sales_rep_id },
  });

  res.status(201).json({ quotation: quote, negotiation: thread });
});

// ──────────────────────────────────────────────
// POST /api/negotiations/respond
// Sales rep responds to counter / accepts / rejects
// ──────────────────────────────────────────────
router.post('/respond', async (req, res) => {
  const { quotation_id, action, message_content } = req.body;
  if (!quotation_id || !action) {
    return res.status(400).json({ error: 'quotation_id and action (accept_counter | reject_counter | reply) required' });
  }

  const quote = await Quotation.findOne({
    where: { id: quotation_id, organization_id: req.orgContext.organizationId },
    include: [{ model: QuotationLine, as: 'lines' }]
  });
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });

  if (action === 'accept_counter') {
    if (quote.customer_counter_discount != null) {
      const disc = Number(quote.customer_counter_discount);
      for (const line of (quote.lines || [])) {
        await line.update({ applied_discount_percentage: disc });
      }
    }
    await quote.update({
      stage: 'draft',
      customer_counter_total: null,
      customer_counter_discount: null
    });
    await recalcQuotation(quote.id, req.orgContext.organizationId);
  } else if (action === 'reject_counter') {
    await quote.update({
      stage: 'draft',
      customer_counter_total: null,
      customer_counter_discount: null
    });
  }

  const thread = await NegotiationThread.create({
    quotation_id,
    quotation_line_id: null,
    author_user_id: req.user.id,
    is_customer_message: false,
    change_type: 'general_inquiry',
    status: action === 'accept_counter' ? 'accepted_by_rep' : action === 'reject_counter' ? 'rejected_by_rep' : 'submitted',
    message_content: message_content || `Sales Rep action: ${action.replace('_', ' ')}`
  });

  await emitEvent({
    organizationId: quote.organization_id,
    actorUserId: req.user.id,
    eventType: thread.is_customer_message ? 'negotiation.received' : 'negotiation.responded',
    entityType: 'quotation',
    entityId: thread.quotation_id,
    title: `New ${thread.is_customer_message ? 'customer' : 'rep'} message on ${quote.quotation_number}`,
    metadata: { changeType: thread.change_type, salesRepUserId: quote.assigned_sales_rep_id },
  });

  res.json({ message: 'Response recorded', quotation: quote, thread });
});

// ──────────────────────────────────────────────
// GET /api/negotiations/threads/:quotationId
// Get conversation thread for a quotation
// ──────────────────────────────────────────────
router.get('/threads/:quotationId', async (req, res) => {
  const { quotationId } = req.params;
  const threads = await NegotiationThread.findAll({
    where: { quotation_id: quotationId },
    order: [['createdAt', 'ASC']]
  });
  res.json(threads);
});

// ──────────────────────────────────────────────
// POST /api/negotiations/confirm
// One-click confirm: lock lines, transition to confirmed
// ──────────────────────────────────────────────
router.post('/confirm', async (req, res) => {
  const { quotation_id } = req.body;
  if (!quotation_id) return res.status(400).json({ error: 'quotation_id required' });

  const scope = await getScopeWhere(req);
  const quote = await Quotation.findOne({
    where: { id: quotation_id, ...scope },
    include: [{ model: QuotationLine, as: 'lines' }],
  });
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });

  if (quote.stage !== 'approved') {
    return res.status(409).json({ error: `Cannot confirm from stage: ${quote.stage}. Quotation must be approved before confirmation.` });
  }

  await quote.update({ stage: 'confirmed', confirmed_at: new Date() });

  // Downstream event processing on quotation confirmation
  try {
    await generateInvoiceFromQuote(quote.id);
  } catch (invoiceErr) {
    console.error(`[EVENT] invoice generation failed for ${quote.id}:`, invoiceErr.message);
  }

  try {
    await executeFulfillmentAllocation(quote.organization_id, { quotationId: quote.id });
  } catch (fulfillErr) {
    console.error(`[EVENT] fulfillment allocation failed for ${quote.id}:`, fulfillErr.message);
  }

  const hasRecurringLines = quote.lines?.some(l => l.category === 'subscriptions' || (l.billing_cadence && l.billing_cadence !== 'one_time'));
  if (hasRecurringLines) {
    try {
      await provisionSubscriptionFromQuote(quote.id);
    } catch (subErr) {
      console.error(`[EVENT] subscription provisioning failed for ${quote.id}:`, subErr.message);
    }
  }

  res.json({ message: 'Quotation confirmed', quotation: quote });
});

// ──────────────────────────────────────────────
// GET /api/negotiations/my-quotes
// List quotes for portal customer
// ──────────────────────────────────────────────
router.get('/my-quotes', async (req, res) => {
  const scope = await getScopeWhere(req);
  const quotes = await Quotation.findAll({
    where: scope,
    attributes: { exclude: ['blended_margin_percentage', 'blended_risk_score', 'worst_line_excess', 'weighted_margin_bleed', 'margin_hard_stop_breached', 'risk_tier'] },
    include: [
      {
        model: QuotationLine,
        as: 'lines',
        attributes: { exclude: ['unit_cost_price', 'line_margin_percentage', 'line_cost_total', 'line_margin_amount', 'effective_ceiling_limit'] },
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'sku'] }]
      },
      {
        model: CustomerAccount,
        as: 'customer_account',
        include: [{ model: Organization, as: 'buyer_organization', attributes: ['legal_name'] }]
      }
    ],
    order: [['createdAt', 'DESC']],
  });
  res.json(quotes);
});

export default router;
