import { Router } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import {
  Quotation, QuotationLine, DealHealthAlert, RepDiscountBaseline,
  FulfillmentOrder, Backorder, QuotationApproval, ApprovalAuditLog,
  CustomerAccount, User, Organization, Warehouse
} from '../models/index.js';
import { authenticate, resolveOrgContext, requireRoles } from '../middleware/auth.middleware.js';

const router = Router();
router.use(authenticate, resolveOrgContext, requireRoles('admin', 'sales_manager', 'finance_ops'));

const STALE_DAYS = 5;
const SLIPPAGE_HOURS = 48;

const orgThresholds = new Map();

export function getOrgThresholds(orgId) {
  if (!orgThresholds.has(orgId)) {
    orgThresholds.set(orgId, {
      stale_days: STALE_DAYS,
      slippage_hours: SLIPPAGE_HOURS,
      anomaly_std_dev_multiplier: 1.5,
    });
  }
  return orgThresholds.get(orgId);
}

// ──────────────────────────────────────────────
// GET /api/deal-health/thresholds
// ──────────────────────────────────────────────
router.get('/thresholds', async (req, res) => {
  const org = req.orgContext.organizationId;
  res.json(getOrgThresholds(org));
});

// ──────────────────────────────────────────────
// PUT /api/deal-health/thresholds
// ──────────────────────────────────────────────
router.put('/thresholds', async (req, res) => {
  const org = req.orgContext.organizationId;
  const current = getOrgThresholds(org);
  const { stale_days, slippage_hours, anomaly_std_dev_multiplier } = req.body;
  if (stale_days != null) current.stale_days = Number(stale_days);
  if (slippage_hours != null) current.slippage_hours = Number(slippage_hours);
  if (anomaly_std_dev_multiplier != null) current.anomaly_std_dev_multiplier = Number(anomaly_std_dev_multiplier);
  orgThresholds.set(org, current);
  res.json(current);
});

// ──────────────────────────────────────────────
// POST /api/deal-health/scan
// Run all three diagnostic checks, persist alerts
// ──────────────────────────────────────────────
router.post('/scan', async (req, res) => {
  try {
    const org = req.orgContext.organizationId;
    const thresholds = getOrgThresholds(org);
    const staleDays = thresholds.stale_days || STALE_DAYS;
    const slippageHours = thresholds.slippage_hours || SLIPPAGE_HOURS;
    const alerts = [];

    // 1. Stalled deals
    const staleCutoff = new Date(Date.now() - staleDays * 86400000);
    const stalled = await Quotation.findAll({
      attributes: { include: [[literal('updated_at'), 'raw_updated_at']] },
      where: {
        organization_id: org,
        stage: { [Op.in]: ['draft', 'pending_approval', 'under_negotiation'] },
        updated_at: { [Op.lte]: staleCutoff },
      },
    });
    for (const q of stalled) {
      const rawDate = q.get('raw_updated_at') || q.updated_at || q.updatedAt;
      const d = rawDate ? new Date(rawDate) : new Date();
      const validDate = isNaN(d.getTime()) ? new Date() : d;
      const daysStale = Math.max(1, Math.floor((Date.now() - validDate.getTime()) / 86400000));
      alerts.push({
        organization_id: org,
        anomaly_type: 'stalled_deal',
        severity: 'warning',
        quotation_id: q.id,
        title: `Stalled: ${q.quotation_number}`,
        description: `Quote stuck in ${q.stage} since ${validDate.toISOString()}`,
        diagnostic_payload: { stage: q.stage, last_update: validDate.toISOString(), days_stale: daysStale },
      });
    }

    // 2. Discount anomalies
    const baselines = await RepDiscountBaseline.findAll({ where: { organization_id: org } });
    const baselineMap = new Map(baselines.map(b => [b.sales_rep_id, b]));

    const activeQuotes = await Quotation.findAll({
      where: {
        organization_id: org,
        stage: { [Op.in]: ['draft', 'pending_approval', 'under_negotiation'] },
      },
      include: [{ model: QuotationLine, as: 'lines' }],
    });

    for (const q of activeQuotes) {
      const baseline = baselineMap.get(q.assigned_sales_rep_id);
      if (!baseline) continue;

      const threshold = baseline.effective_anomaly_threshold != null
        ? parseFloat(baseline.effective_anomaly_threshold)
        : baseline.completed_deal_count >= 20
        ? parseFloat(baseline.mean_discount_percentage) + 2 * parseFloat(baseline.std_dev_percentage)
        : parseFloat(baseline.cohort_mean_discount_percentage) + 1.5 * parseFloat(baseline.cohort_std_dev_percentage);

      for (const line of q.lines || []) {
        if (parseFloat(line.applied_discount_percentage) > threshold) {
          alerts.push({
            organization_id: org,
            anomaly_type: 'discount_anomaly',
            severity: 'critical',
            quotation_id: q.id,
            title: `Discount leak: ${q.quotation_number}`,
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

    // 3. Delivery slippage (flag fulfillments when backordered items have delivery deadlines within slippage window)
    const slippageCutoff = new Date(Date.now() + slippageHours * 3600000);
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
          estimated_delivery_date: { [Op.lte]: slippageCutoff },
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
          diagnostic_payload: { fulfillment_status: fo.status, slippage_window_hours: slippageHours },
        });
      }
    }

    // Deduplicate before creating (idempotent scan - HLT14-IDEMPOTENCY)
    const existingAlerts = await DealHealthAlert.findAll({
      where: {
        organization_id: org,
        resolution_status: { [Op.in]: ['active', 'acknowledged', 'escalated'] },
      },
      attributes: ['quotation_id', 'fulfillment_order_id', 'anomaly_type'],
    });
    const existingKeySet = new Set(
      existingAlerts.map(a => `${a.quotation_id || ''}-${a.fulfillment_order_id || ''}-${a.anomaly_type}`)
    );

    const newAlerts = alerts.filter(
      a => !existingKeySet.has(`${a.quotation_id || ''}-${a.fulfillment_order_id || ''}-${a.anomaly_type}`)
    );

    const created = newAlerts.length ? await DealHealthAlert.bulkCreate(newAlerts) : [];

    res.json({ scanned_at: new Date(), alerts_created: created.length, alerts: created });
  } catch (err) {
    console.error('Scan error:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// ──────────────────────────────────────────────
// GET /api/deal-health/alerts
// List active alerts for org with business context
// ──────────────────────────────────────────────
router.get('/alerts', async (req, res) => {
  const alerts = await DealHealthAlert.findAll({
    where: {
      organization_id: req.orgContext.organizationId,
      resolution_status: { [Op.in]: ['active', 'acknowledged', 'escalated'] },
    },
    include: [
      {
        model: Quotation,
        as: 'quotation',
        include: [
          {
            model: CustomerAccount,
            as: 'customer_account',
            include: [{ model: Organization, as: 'buyer_organization', attributes: ['id', 'legal_name', 'trading_name'] }]
          },
          {
            model: User,
            as: 'sales_rep',
            attributes: ['id', 'full_name', 'email']
          }
        ]
      },
      {
        model: FulfillmentOrder,
        as: 'fulfillment_order',
        include: [
          { model: Warehouse, as: 'warehouse', attributes: ['id', 'name', 'code'] },
          {
            model: Quotation,
            as: 'quotation',
            include: [
              {
                model: CustomerAccount,
                as: 'customer_account',
                include: [{ model: Organization, as: 'buyer_organization', attributes: ['id', 'legal_name', 'trading_name'] }]
              },
              {
                model: User,
                as: 'sales_rep',
                attributes: ['id', 'full_name', 'email']
              }
            ]
          }
        ]
      }
    ],
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

  if (alert.quotation_id) {
    await ApprovalAuditLog.create({
      organization_id: req.orgContext.organizationId,
      quotation_id: alert.quotation_id,
      actor_user_id: req.user.id,
      blended_risk_score_at_action: 0,
      payload_snapshot: { alert_id: alert.id, nudge: 'Management nudge dispatched to sales rep' },
      ip_address: req.ip,
      user_agent: req.get('User-Agent'),
      action_taken: 'nudge_dispatched'
    });
  }

  res.json({ message: 'Nudge sent', alert });
});

// ──────────────────────────────────────────────
// POST /api/deal-health/escalate-to-finance
// Escalate alert to finance team with QuotationApproval creation (HLT14-16)
// ──────────────────────────────────────────────
router.post('/escalate-to-finance', async (req, res) => {
  const { alert_id } = req.body;
  if (!alert_id) return res.status(400).json({ error: 'alert_id required' });

  const alert = await DealHealthAlert.findOne({
    where: { id: alert_id, organization_id: req.orgContext.organizationId },
  });
  if (!alert) return res.status(404).json({ error: 'Alert not found' });

  await alert.update({ resolution_status: 'escalated' });

  if (alert.quotation_id) {
    const quote = await Quotation.findByPk(alert.quotation_id);
    if (quote) {
      await quote.update({ stage: 'pending_approval', risk_tier: 'high_risk_finance' });
      const existingApproval = await QuotationApproval.findOne({
        where: { quotation_id: quote.id, status: 'pending', required_role: 'finance_ops' }
      });
      if (!existingApproval) {
        await QuotationApproval.create({
          quotation_id: quote.id,
          step_order: 1,
          required_role: 'finance_ops',
          status: 'pending',
          comments: `Escalated from Deal Health: ${alert.title}`
        });
      }
      await ApprovalAuditLog.create({
        organization_id: req.orgContext.organizationId,
        quotation_id: quote.id,
        actor_user_id: req.user.id,
        blended_risk_score_at_action: quote.blended_risk_score || 0,
        payload_snapshot: { alert_id: alert.id, reason: alert.title },
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        action_taken: 'escalated_to_finance'
      });
    }
  }

  res.json({ message: 'Escalated to finance', alert });
});

export default router;
