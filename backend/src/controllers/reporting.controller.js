import { Router } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import {
  sequelize, Quotation, QuotationLine, Subscription,
  Invoice, FulfillmentOrder, Backorder,
} from '../models/index.js';
import { authenticate, requireInternal } from '../middleware/auth.js';

const router = Router();
router.use(authenticate, requireInternal('admin', 'sales_manager', 'finance_ops'));

// ──────────────────────────────────────────────
// GET /api/reports/kpi-summary
// Aggregate: Pipeline Value, Active MRR, Avg Margin %, Slippage Rate
// ──────────────────────────────────────────────
router.get('/kpi-summary', async (req, res) => {
  const org = req.user.organization_id;

  // Total pipeline value: sum grand_total of non-terminal quotes
  const pipeline = await Quotation.findOne({
    where: {
      organization_id: org,
      stage: { [Op.in]: ['draft', 'pending_approval', 'under_negotiation', 'approved'] },
    },
    attributes: [[fn('COALESCE', fn('SUM', col('grand_total')), 0), 'total']],
    raw: true,
  });

  // Active MRR: sum from active subscriptions
  const mrr = await Subscription.findOne({
    where: { organization_id: org, status: 'active' },
    attributes: [[fn('COALESCE', fn('SUM', col('mrr_amount')), 0), 'total']],
    raw: true,
  });

  // Average margin %: from confirmed quotes
  const margin = await Quotation.findOne({
    where: { organization_id: org, stage: 'confirmed' },
    attributes: [[fn('COALESCE', fn('AVG', col('blended_margin_percentage')), 0), 'average']],
    raw: true,
  });

  // Slippage rate: backorders / total fulfillment orders
  const totalOrders = await FulfillmentOrder.count({ where: { organization_id: org } });
  const backorderCount = await Backorder.count({
    where: { organization_id: org, status: 'open' },
  });
  const slippageRate = totalOrders ? ((backorderCount / totalOrders) * 100).toFixed(2) : '0.00';

  res.json({
    total_pipeline_value: parseFloat(pipeline.total),
    active_mrr: parseFloat(mrr.total),
    average_margin_percentage: parseFloat(parseFloat(margin.average).toFixed(2)),
    slippage_rate_percentage: parseFloat(slippageRate),
    total_fulfillment_orders: totalOrders,
    open_backorders: backorderCount,
  });
});

// ──────────────────────────────────────────────
// GET /api/reports/pipeline-by-stage
// Deal count + value grouped by stage
// ──────────────────────────────────────────────
router.get('/pipeline-by-stage', async (req, res) => {
  const results = await Quotation.findAll({
    where: { organization_id: req.user.organization_id },
    attributes: [
      'stage',
      [fn('COUNT', col('id')), 'count'],
      [fn('COALESCE', fn('SUM', col('grand_total')), 0), 'total_value'],
    ],
    group: ['stage'],
    raw: true,
  });
  res.json(results);
});

// ──────────────────────────────────────────────
// GET /api/reports/revenue-by-month
// Monthly confirmed revenue (last 12 months)
// ──────────────────────────────────────────────
router.get('/revenue-by-month', async (req, res) => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const invoices = await Invoice.findAll({
    where: {
      organization_id: req.user.organization_id,
      status: { [Op.in]: ['posted', 'partially_paid', 'paid'] },
      issue_date: { [Op.gte]: twelveMonthsAgo },
    },
    attributes: ['issue_date', 'total_amount'],
    raw: true,
  });

  // ponytail: group in JS instead of dialect-specific DATE_FORMAT
  const byMonth = {};
  for (const inv of invoices) {
    const key = new Date(inv.issue_date).toISOString().slice(0, 7); // YYYY-MM
    byMonth[key] = (byMonth[key] || 0) + parseFloat(inv.total_amount);
  }

  res.json(Object.entries(byMonth).sort().map(([month, revenue]) => ({ month, revenue })));
});

export default router;
