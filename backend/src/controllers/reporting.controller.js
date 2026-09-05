import { Router } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import {
  sequelize, Quotation, QuotationLine, Subscription,
  Invoice, FulfillmentOrder, Backorder, User, Product,
} from '../models/index.js';
import { authenticate, resolveOrgContext, requireRoles } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate, resolveOrgContext, requireRoles('admin', 'sales_manager', 'finance_ops', 'sales_rep'));

// Helper to build date range from period param
function getPeriodDateFilter(period) {
  const now = new Date();
  if (period === 'today') {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { [Op.gte]: start };
  }
  if (period === 'this_week') {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return { [Op.gte]: start };
  }
  if (period === 'this_month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { [Op.gte]: start };
  }
  return null;
}

// ──────────────────────────────────────────────
// GET /api/reports/kpi-summary
// Aggregate: Total Bookings, Total Discount Leakage, Pipeline Value, Active MRR, Avg Margin %, Slippage Rate (REP15-08/10)
// ──────────────────────────────────────────────
router.get('/kpi-summary', async (req, res) => {
  const org = req.orgContext.organizationId;
  const isRep = req.orgContext.membership?.role === 'sales_rep';
  const { period, category, approval_status, sales_rep_id } = req.query;

  const quoteWhere = { organization_id: org };
  if (isRep) quoteWhere.assigned_sales_rep_id = req.user.id;
  else if (sales_rep_id) quoteWhere.assigned_sales_rep_id = sales_rep_id;
  if (approval_status) quoteWhere.stage = approval_status;

  const dateFilter = getPeriodDateFilter(period);
  if (dateFilter) quoteWhere.createdAt = dateFilter;

  // Confirmed deals: bookings & discount leakage
  const bookings = await Quotation.findOne({
    where: {
      ...quoteWhere,
      stage: approval_status || 'confirmed',
    },
    attributes: [
      [fn('COALESCE', fn('SUM', col('grand_total')), 0), 'total_bookings'],
      [fn('COALESCE', fn('SUM', col('total_discount_amount')), 0), 'total_discount_leakage'],
      [fn('COALESCE', fn('AVG', col('blended_margin_percentage')), 0), 'average_margin'],
    ],
    raw: true,
  });

  // Total pipeline value: sum grand_total of active non-confirmed quotes
  const pipeline = await Quotation.findOne({
    where: {
      ...quoteWhere,
      stage: approval_status ? approval_status : { [Op.in]: ['draft', 'pending_approval', 'under_negotiation', 'approved'] },
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

  // Slippage rate: backorders / total fulfillment orders
  const totalOrders = await FulfillmentOrder.count({ where: { organization_id: org } });
  const backorderCount = await Backorder.count({
    where: { organization_id: org, status: 'open' },
  });
  const slippageRate = totalOrders ? ((backorderCount / totalOrders) * 100).toFixed(2) : '0.00';

  res.json({
    total_bookings: parseFloat(bookings?.total_bookings || 0),
    total_discount_leakage: parseFloat(bookings?.total_discount_leakage || 0),
    total_pipeline_value: parseFloat(pipeline?.total || 0),
    active_mrr: parseFloat(mrr?.total || 0),
    average_margin_percentage: parseFloat(parseFloat(bookings?.average_margin || 0).toFixed(2)),
    slippage_rate_percentage: parseFloat(slippageRate),
    total_fulfillment_orders: totalOrders,
    open_backorders: backorderCount,
    applied_filters: {
      period: period || 'all',
      category: category || 'all',
      approval_status: approval_status || 'all',
      sales_rep_id: sales_rep_id || (isRep ? req.user.id : 'all'),
    },
  });
});

// ──────────────────────────────────────────────
// GET /api/reports/sales-rep-discipline (REP15-12/13/14/15)
// ──────────────────────────────────────────────
router.get('/sales-rep-discipline', async (req, res) => {
  const org = req.orgContext.organizationId;
  const isRep = req.orgContext.membership?.role === 'sales_rep';
  const { period, sales_rep_id, approval_status } = req.query;

  const quoteWhere = { organization_id: org };
  if (isRep) quoteWhere.assigned_sales_rep_id = req.user.id;
  else if (sales_rep_id) quoteWhere.assigned_sales_rep_id = sales_rep_id;
  if (approval_status) quoteWhere.stage = approval_status;

  const dateFilter = getPeriodDateFilter(period);
  if (dateFilter) quoteWhere.createdAt = dateFilter;

  const quotes = await Quotation.findAll({
    where: quoteWhere,
    include: [
      { model: User, as: 'sales_rep', attributes: ['id', 'full_name', 'email'] },
      { model: QuotationLine, as: 'lines' }
    ],
  });

  const repStats = new Map();
  for (const q of quotes) {
    const rep = q.sales_rep;
    const repId = rep?.id || 'unassigned';
    if (!repStats.has(repId)) {
      repStats.set(repId, {
        rep_id: repId,
        sales_rep: rep?.full_name || 'Unassigned',
        email: rep?.email || '',
        team: 'Direct Sales',
        deals_closed: 0,
        net_revenue: 0,
        discounts: [],
        margins: [],
        quotes_flagged: 0,
      });
    }

    const item = repStats.get(repId);
    if (q.stage === 'confirmed') {
      item.deals_closed += 1;
      item.net_revenue += Number(q.grand_total || 0);
      if (q.blended_margin_percentage != null) {
        item.margins.push(Number(q.blended_margin_percentage));
      }
    }

    if (Number(q.blended_risk_score || 0) > 0 || q.risk_tier === 'high_risk_finance' || q.risk_tier === 'medium_risk_manager') {
      item.quotes_flagged += 1;
    }

    for (const line of q.lines || []) {
      if (line.applied_discount_percentage != null) {
        item.discounts.push(Number(line.applied_discount_percentage));
      }
    }
  }

  const result = Array.from(repStats.values()).map(r => ({
    rep_id: r.rep_id,
    sales_rep: r.sales_rep,
    email: r.email,
    team: r.team,
    deals_closed: r.deals_closed,
    net_revenue: Number(r.net_revenue.toFixed(2)),
    avg_discount_percentage: r.discounts.length
      ? Number((r.discounts.reduce((a, b) => a + b, 0) / r.discounts.length).toFixed(2))
      : 0,
    quotes_flagged: r.quotes_flagged,
    realized_margin_percentage: r.margins.length
      ? Number((r.margins.reduce((a, b) => a + b, 0) / r.margins.length).toFixed(2))
      : 0,
  }));

  res.json(result);
});

// ──────────────────────────────────────────────
// GET /api/reports/product-category-performance (REP15-16/17/18)
// ──────────────────────────────────────────────
router.get('/product-category-performance', async (req, res) => {
  const org = req.orgContext.organizationId;
  const { category, period } = req.query;

  const quoteWhere = { organization_id: org, stage: 'confirmed' };
  const dateFilter = getPeriodDateFilter(period);
  if (dateFilter) quoteWhere.confirmed_at = dateFilter;

  const confirmedQuotes = await Quotation.findAll({
    where: quoteWhere,
    include: [
      {
        model: QuotationLine,
        as: 'lines',
        include: [{ model: Product, as: 'product' }]
      }
    ]
  });

  const productStats = new Map();
  for (const q of confirmedQuotes) {
    for (const line of q.lines || []) {
      const prod = line.product;
      const prodCategory = line.category || prod?.category || 'general';
      if (category && prodCategory !== category) continue;

      const prodKey = prod?.id || line.product_id;
      if (!productStats.has(prodKey)) {
        productStats.set(prodKey, {
          product_id: prodKey,
          product_name: prod?.name || 'Standard Product',
          sku: prod?.sku || '',
          category: prodCategory,
          units_sold: 0,
          gross_revenue: 0,
          net_revenue: 0,
          discounts: [],
          margins: [],
        });
      }

      const p = productStats.get(prodKey);
      p.units_sold += Number(line.quantity || 1);
      p.gross_revenue += Number(line.line_gross_amount || (line.unit_list_price * line.quantity) || 0);
      p.net_revenue += Number(line.line_net_amount || (line.unit_net_price * line.quantity) || 0);
      if (line.applied_discount_percentage != null) {
        p.discounts.push(Number(line.applied_discount_percentage));
      }
      if (line.line_margin_percentage != null) {
        p.margins.push(Number(line.line_margin_percentage));
      }
    }
  }

  const result = Array.from(productStats.values()).map(p => {
    const totalDiscountDollar = Math.max(0, p.gross_revenue - p.net_revenue);
    return {
      product_id: p.product_id,
      product_name: p.product_name,
      sku: p.sku,
      category: p.category,
      units_sold: p.units_sold,
      gross_revenue: Number(p.gross_revenue.toFixed(2)),
      total_discount_given: Number(totalDiscountDollar.toFixed(2)),
      avg_discount_percentage: p.discounts.length
        ? Number((p.discounts.reduce((a, b) => a + b, 0) / p.discounts.length).toFixed(2))
        : 0,
      realized_gross_margin_percentage: p.margins.length
        ? Number((p.margins.reduce((a, b) => a + b, 0) / p.margins.length).toFixed(2))
        : 0,
    };
  });

  res.json(result);
});

// ──────────────────────────────────────────────
// GET /api/reports/pipeline-by-stage
// Deal count + value grouped by stage
// ──────────────────────────────────────────────
router.get('/pipeline-by-stage', async (req, res) => {
  const results = await Quotation.findAll({
    where: { organization_id: req.orgContext.organizationId },
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
      organization_id: req.orgContext.organizationId,
      status: { [Op.in]: ['posted', 'partially_paid', 'paid'] },
      issue_date: { [Op.gte]: twelveMonthsAgo },
    },
    attributes: ['issue_date', 'total_amount'],
    raw: true,
  });

  const byMonth = {};
  for (const inv of invoices) {
    const key = new Date(inv.issue_date).toISOString().slice(0, 7); // YYYY-MM
    byMonth[key] = (byMonth[key] || 0) + parseFloat(inv.total_amount);
  }

  const result = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({ month, revenue: parseFloat(amount.toFixed(2)) }));

  res.json(result);
});

// ──────────────────────────────────────────────
// GET /api/reports/export/pdf
// ──────────────────────────────────────────────
router.get('/export/pdf', (req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
  res.send(Buffer.from('%PDF-1.4 Mock PDF Report'));
});

// ──────────────────────────────────────────────
// GET /api/reports/export/xls
// ──────────────────────────────────────────────
router.get('/export/xls', (req, res) => {
  res.setHeader('Content-Type', 'application/vnd.ms-excel');
  res.setHeader('Content-Disposition', 'attachment; filename="report.xls"');
  res.send('SKU\tProduct\tCategory\tUnits\tGross\tNet\n');
});

export default router;
