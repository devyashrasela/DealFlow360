import { Op } from 'sequelize';
import {
  provisionSubscriptionFromQuote,
  modifySubscriptionQuantity,
  cancelSubscription,
  calculateProration,
} from '../services/subscription.service.js';
import { emitEvent } from '../services/notification.service.js';
import {
  Subscription,
  SubscriptionLineItem,
  BillingSchedule,
  SubscriptionEvent,
  CustomerAccount,
  Organization,
  Product,
  Quotation,
} from '../models/index.js';

/**
 * GET /api/subscriptions
 */
export const listSubscriptions = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = { organization_id: req.orgContext.organizationId };
    if (status) where.status = status;

    const subscriptions = await Subscription.findAll({
      where,
      include: [
        {
          model: CustomerAccount,
          as: 'customer_account',
          include: [{ model: Organization, as: 'buyer_organization', attributes: ['id', 'legal_name', 'trading_name'] }],
        },
        { model: SubscriptionLineItem, as: 'lines', include: [{ model: Product, as: 'product', attributes: ['id', 'sku', 'name'] }] },
        { model: Quotation, as: 'origin_quotation', attributes: ['id', 'quotation_number'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Calculate KPI aggregates
    const activeCount = subscriptions.filter((s) => s.status === 'active').length;
    const totalMRR = subscriptions
      .filter((s) => s.status === 'active')
      .reduce((sum, s) => sum + Number(s.mrr_amount || 0), 0);
    const now = new Date();
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const renewalsNext30 = subscriptions.filter(
      (s) => s.status === 'active' && new Date(s.next_invoice_date) <= thirtyDaysLater
    ).length;

    return res.status(200).json({
      success: true,
      count: subscriptions.length,
      kpis: {
        active_subscriptions: activeCount,
        total_mrr: Number(totalMRR.toFixed(2)),
        renewals_next_30_days: renewalsNext30,
      },
      data: subscriptions,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/subscriptions/:id
 */
export const getSubscriptionDetail = async (req, res, next) => {
  try {
    const subscription = await Subscription.findByPk(req.params.id, {
      include: [
        {
          model: CustomerAccount,
          as: 'customer_account',
          include: [{ model: Organization, as: 'buyer_organization' }],
        },
        { model: SubscriptionLineItem, as: 'lines', include: [{ model: Product, as: 'product' }] },
        { model: BillingSchedule, as: 'billing_schedules', order: [['cycle_number', 'ASC']] },
        { model: SubscriptionEvent, as: 'events', order: [['createdAt', 'DESC']] },
        { model: Quotation, as: 'origin_quotation', attributes: ['id', 'quotation_number'] },
      ],
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found.' });
    }

    return res.status(200).json({ success: true, data: subscription });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/subscriptions/provision/:quotationId
 */
export const provisionFromQuote = async (req, res, next) => {
  try {
    const result = await provisionSubscriptionFromQuote(req.params.quotationId);
    return res.status(201).json({
      success: true,
      message: result.subscription ? 'Subscription provisioned successfully.' : result.message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/subscriptions/:id/modify
 * Body: { line_item_id, new_quantity, actor_user_id }
 */
export const modifyQuantity = async (req, res, next) => {
  try {
    const { line_item_id, new_quantity, actor_user_id } = req.body;

    if (!line_item_id || !new_quantity || !actor_user_id) {
      return res.status(400).json({
        success: false,
        error: 'line_item_id, new_quantity, and actor_user_id are required.',
      });
    }

    const result = await modifySubscriptionQuantity({
      subscriptionId: req.params.id,
      lineItemId: line_item_id,
      newQuantity: Number(new_quantity),
      actorUserId: actor_user_id,
    });

    return res.status(200).json({
      success: true,
      message: `Quantity updated. Proration charge: ${result.proration.proration_charge}`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/subscriptions/:id/cancel
 * Body: { cancellation_type: 'immediate' | 'period_end', actor_user_id, reason? }
 */
export const cancelSub = async (req, res, next) => {
  try {
    const { cancellation_type, reason } = req.body;
    const actor_user_id = req.body.actor_user_id || req.user?.id;

    if (!cancellation_type) {
      return res.status(400).json({
        success: false,
        error: 'cancellation_type is required.',
      });
    }

    if (!['immediate', 'period_end'].includes(cancellation_type)) {
      return res.status(400).json({
        success: false,
        error: 'cancellation_type must be "immediate" or "period_end".',
      });
    }

    const result = await cancelSubscription({
      subscriptionId: req.params.id,
      cancellationType: cancellation_type,
      actorUserId: actor_user_id,
      reason,
    });

    return res.status(200).json({
      success: true,
      message: `Subscription ${cancellation_type === 'immediate' ? 'cancelled immediately' : 'set to cancel at period end'}.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/subscriptions/:id/proration-preview
 * Body: { line_item_id, new_quantity }
 */
export const previewProration = async (req, res, next) => {
  try {
    const { line_item_id, new_quantity } = req.body;
    const subscription = await Subscription.findByPk(req.params.id);
    if (!subscription) {
      return res.status(404).json({ success: false, error: 'Subscription not found.' });
    }

    const lineItem = await SubscriptionLineItem.findByPk(line_item_id);
    if (!lineItem) {
      return res.status(404).json({ success: false, error: 'Line item not found.' });
    }

    const proration = calculateProration({
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      oldQuantity: lineItem.quantity,
      newQuantity: Number(new_quantity),
      unitPrice: lineItem.unit_price,
      discountPct: lineItem.applied_discount_percentage,
    });

    return res.status(200).json({ success: true, data: proration });
  } catch (err) {
    next(err);
  }
};
