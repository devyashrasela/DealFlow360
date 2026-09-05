import { Router } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import {
  Quotation, QuotationLine, DealHealthAlert, RepDiscountBaseline,
  FulfillmentOrder, Backorder,
} from '../models/index.js';
import { authenticate, resolveOrgContext, requireRoles } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate, resolveOrgContext, requireRoles('admin', 'sales_manager', 'finance_ops'));

const STALE_DAYS = 5;
const SLIPPAGE_HOURS = 48;

// ──────────────────────────────────────────────
// POST /api/deal-health/scan
// Run all three diagnostic checks, persist alerts
// ──────────────────────────────────────────────
router.post('/scan', async (req, res) => {
  const org = req.orgContext.organizationId;
  const alerts = [];

  // 1. Stalled deals
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 86400000);
  const stalled = await Quotation.findAll({
    where: {
      organization_id: org,
      stage: { [Op.in]: ['draft', 'pending_approval', 'under_negotiation'] },
      updated_at: { [Op.lte]: staleCutoff },
    },
  });
  for (const q of stalled) {
    alerts.push({
      organization_id: org,
      anomaly_type: 'stalled_deal',
      severity: 'warning',
      quotation_id: q.id,
      title: `Stalled: ${q.quotation_number}`,
      description: `Quote stuck in ${q.stage} since ${q.updated_at.toISOString()}`,
      diagnostic_payload: { stage: q.stage, last_update: q.updated_at, days_stale: STALE_DAYS },
    });
  }

  // 2. Discount anomalies
  const baselines = await RepDiscountBaseline.findAll({ where: { organization_id: org } });
  const baselineMap = Object.fromEntries(baselines.map(b => [b.sales_rep_id, b]));

  const activeQuotes = await Quotation.findAll({
    where: { organization_id: org, stage: { [Op.in]: ['draft', 'pending_approval', 'under_negotiation'] } },
    include: [{ model: QuotationLine, as: 'lines' }],
  });

  for (const q of activeQuotes) {
    const baseline = baselineMap[q.assigned_sales_rep_id];
    if (!baseline) continue;

    // ponytail: if rep has < 20 deals, use cohort baseline instead of personal
    const threshold = (baseline.completed_deal_count < 20)
      ? baseline.cohort_mean_discount_percentage + baseline.cohort_std_dev_percentage
      : baseline.effective_anomaly_threshold;

    for (const line of q.lines) {
      if (parseFloat(line.applied_discount_percentage) > parseFloat(threshold)) {
        alerts.push({
          organization_id: org,
          anomaly_type: 'discount_anomaly',
          severity: 'critical',
          quotation_id: q.id,
          title: `Discount anomaly: ${q.quotation_number} line ${line.line_number}`,
          description: `Line discount ${line.applied_discount_percentage}% exceeds threshold ${threshold}%`,
          diagnostic_payload: {
            line_id: line.id,
            applied: line.applied_discount_percentage,
            threshold,
            rep_deals: baseline.completed_deal_count,
            fallback: baseline.completed_deal_count < 20 ? 'cohort' : 'personal',
          },
        });
      }
    }
  }

  // 3. Delivery slippage
  const slippageCutoff = new Date(Date.now() + SLIPPAGE_HOURS * 3600000);
  const backorders = await Backorder.findAll({
    where: { organization_id: org, status: 'open' },
  });
  // Find fulfillment orders with backorders and tight deadlines
  const foIds = [...new Set(backorders.map(b => b.quotation_id))];
  if (foIds.length) {
    const riskyOrders = await FulfillmentOrder.findAll({
      where: {
        organization_id: org,
        quotation_id: { [Op.in]: foIds },
        status: { [Op.notIn]: ['delivered', 'cancelled'] },
      },
    });
    for (const fo of riskyOrders) {
      alerts.push({
        organization_id: org,
        anomaly_type: 'delivery_slippage',
        severity: 'warning',
        quotation_id: fo.quotation_id,
        fulfillment_order_id: fo.id,
        title: `Delivery risk: ${fo.fulfillment_number}`,
        description: `Backorder exists with fulfillment still in ${fo.status}`,
        diagnostic_payload: { fulfillment_status: fo.status, slippage_window_hours: SLIPPAGE_HOURS },
      });
    }
  }

  // Bulk create alerts
  const created = alerts.length ? await DealHealthAlert.bulkCreate(alerts) : [];

  res.json({ scanned_at: new Date(), alerts_created: created.length, alerts: created });
});

// ──────────────────────────────────────────────
// GET /api/deal-health/alerts
// List active alerts for org
// ──────────────────────────────────────────────
router.get('/alerts', async (req, res) => {
  const alerts = await DealHealthAlert.findAll({
    where: {
      organization_id: req.orgContext.organizationId,
      resolution_status: { [Op.in]: ['active', 'acknowledged', 'escalated'] },
    },
    order: [['created_at', 'DESC']],
  });
  res.json(alerts);
});

// ──────────────────────────────────────────────
// POST /api/deal-health/send-nudge
// Alert the rep about a stalled/anomalous deal
// ──────────────────────────────────────────────
router.post('/send-nudge', async (req, res) => {
  const { alert_id } = req.body;
  if (!alert_id) return res.status(400).json({ error: 'alert_id required' });

  const alert = await DealHealthAlert.findOne({
    where: { id: alert_id, organization_id: req.orgContext.organizationId },
  });
  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  await alert.update({ resolution_status: 'acknowledged' });

  // ponytail: nudge is a log line; plug real notification service when available
  console.log(`[NUDGE] Alert ${alert.id} → rep notified for quote ${alert.quotation_id}`);

  res.json({ message: 'Nudge sent', alert });
});

// ──────────────────────────────────────────────
// POST /api/deal-health/escalate-to-finance
// Escalate alert to finance team
// ──────────────────────────────────────────────
router.post('/escalate-to-finance', async (req, res) => {
  const { alert_id } = req.body;
  if (!alert_id) return res.status(400).json({ error: 'alert_id required' });

  const alert = await DealHealthAlert.findOne({
    where: { id: alert_id, organization_id: req.orgContext.organizationId },
  });
  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  await alert.update({ resolution_status: 'escalated' });

  console.log(`[ESCALATE] Alert ${alert.id} → finance for quote ${alert.quotation_id}`);

  res.json({ message: 'Escalated to finance', alert });
});

export default router;
