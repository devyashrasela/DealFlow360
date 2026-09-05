import { Op } from 'sequelize';
import {
  sequelize,
  Subscription,
  SubscriptionLineItem,
  BillingSchedule,
  SubscriptionEvent,
  Invoice,
  InvoiceLine,
  Quotation,
  QuotationLine,
  CustomerAccount,
  Organization,
  Product,
} from '../models/index.js';

/**
 * Service: Subscriptions & Proration Engine
 * Handles provisioning, billing schedule generation, mid-cycle proration, and cancellation flows.
 */

/**
 * Generate a 12-month forward-looking billing schedule from a start date and cadence.
 */
export const generateBillingSchedule = (subscription, lineItems) => {
  const cadenceMonths = { monthly: 1, quarterly: 3, annual: 12 };
  const intervalMonths = cadenceMonths[subscription.billing_cadence] || 1;
  const cycleCount = Math.ceil(12 / intervalMonths);

  const baseCharge = lineItems.reduce((sum, li) => {
    const netPrice = Number(li.unit_price) * (1 - Number(li.applied_discount_percentage || 0) / 100);
    return sum + netPrice * Number(li.quantity);
  }, 0);

  const schedules = [];
  let currentDate = new Date(subscription.current_period_start);

  for (let i = 0; i < cycleCount; i++) {
    const scheduledDate = new Date(currentDate);
    scheduledDate.setMonth(scheduledDate.getMonth() + intervalMonths * i);

    schedules.push({
      subscription_id: subscription.id,
      cycle_number: i + 1,
      scheduled_date: scheduledDate,
      base_charge_amount: Number(baseCharge.toFixed(2)),
      proration_adjustment: 0.00,
      expected_total: Number(baseCharge.toFixed(2)),
      is_processed: false,
    });
  }

  return schedules;
};

/**
 * Calculate daily proration delta for mid-cycle quantity changes.
 * Formula: (daysRemaining / totalDays) * (newQty - oldQty) * unitPrice
 */
export const calculateProration = ({ currentPeriodStart, currentPeriodEnd, oldQuantity, newQuantity, unitPrice, discountPct = 0 }) => {
  const start = new Date(currentPeriodStart);
  const end = new Date(currentPeriodEnd);
  const now = new Date();

  const totalDaysInCycle = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

  const netUnitPrice = Number(unitPrice) * (1 - Number(discountPct) / 100);
  const quantityDelta = Number(newQuantity) - Number(oldQuantity);
  const prorationCharge = Number(((daysRemaining / totalDaysInCycle) * quantityDelta * netUnitPrice).toFixed(2));

  return {
    total_days_in_cycle: totalDaysInCycle,
    days_remaining_in_cycle: daysRemaining,
    quantity_delta: quantityDelta,
    net_unit_price: netUnitPrice,
    proration_charge: prorationCharge,
    is_credit: prorationCharge < 0,
  };
};

/**
 * Provision a subscription from a confirmed quotation's recurring lines.
 */
export const provisionSubscriptionFromQuote = async (quotationId) => {
  return sequelize.transaction(async (t) => {
    const quotation = await Quotation.findByPk(quotationId, {
      include: [
        {
          model: QuotationLine,
          as: 'lines',
          where: { category: 'subscriptions' },
          required: false,
          include: [{ model: Product, as: 'product' }],
        },
      ],
      transaction: t,
    });

    if (!quotation) {
      const err = new Error(`Quotation not found: ${quotationId}`);
      err.status = 404;
      throw err;
    }

    const recurringLines = quotation.lines || [];
    if (recurringLines.length === 0) {
      return { message: 'No recurring subscription lines found in this quotation.', subscription: null };
    }

    // Determine billing cadence from the first recurring line
    const primaryCadence = recurringLines[0].billing_cadence || 'monthly';
    const now = new Date();
    const cadenceMonths = { monthly: 1, quarterly: 3, annual: 12 };
    const intervalMonths = cadenceMonths[primaryCadence] || 1;
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + intervalMonths);
    const nextInvoiceDate = new Date(periodEnd);

    // Calculate MRR
    let totalPeriodAmount = 0;
    for (const line of recurringLines) {
      const netPrice = Number(line.unit_list_price) * (1 - Number(line.applied_discount_percentage || 0) / 100);
      totalPeriodAmount += netPrice * Number(line.quantity);
    }

    const mrrAmount = primaryCadence === 'monthly'
      ? totalPeriodAmount
      : primaryCadence === 'quarterly'
      ? Number((totalPeriodAmount / 3).toFixed(2))
      : Number((totalPeriodAmount / 12).toFixed(2));
    const arrAmount = Number((mrrAmount * 12).toFixed(2));

    const subscription = await Subscription.create({
      organization_id: quotation.organization_id,
      customer_account_id: quotation.customer_account_id,
      origin_quotation_id: quotation.id,
      subscription_code: `SUB-${quotation.quotation_number}-${Date.now().toString().slice(-4)}`,
      status: 'active',
      billing_cadence: primaryCadence,
      start_date: now,
      current_period_start: now,
      current_period_end: periodEnd,
      next_invoice_date: nextInvoiceDate,
      mrr_amount: mrrAmount,
      arr_amount: arrAmount,
    }, { transaction: t });

    // Create subscription line items
    const subLineItems = [];
    for (const line of recurringLines) {
      const netPrice = Number(line.unit_list_price) * (1 - Number(line.applied_discount_percentage || 0) / 100);
      const periodAmt = netPrice * Number(line.quantity);

      const subLine = await SubscriptionLineItem.create({
        subscription_id: subscription.id,
        product_id: line.product_id,
        quantity: line.quantity,
        unit_price: line.unit_list_price,
        applied_discount_percentage: line.applied_discount_percentage || 0,
        period_amount: Number(periodAmt.toFixed(2)),
      }, { transaction: t });
      subLineItems.push(subLine);
    }

    // Generate 12-month billing schedule
    const scheduleData = generateBillingSchedule(subscription, subLineItems);
    for (const sched of scheduleData) {
      await BillingSchedule.create(sched, { transaction: t });
    }

    // Record provisioning event
    await SubscriptionEvent.create({
      subscription_id: subscription.id,
      actor_user_id: quotation.assigned_sales_rep_id,
      event_type: 'provisioned',
      notes: `Provisioned from quotation ${quotation.quotation_number}`,
    }, { transaction: t });

    return { subscription, line_items: subLineItems, schedule_count: scheduleData.length };
  });
};

/**
 * Mid-cycle quantity change with immediate proration invoice.
 */
export const modifySubscriptionQuantity = async ({ subscriptionId, lineItemId, newQuantity, actorUserId }) => {
  return sequelize.transaction(async (t) => {
    const subscription = await Subscription.findByPk(subscriptionId, {
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!subscription) {
      const err = new Error(`Subscription not found: ${subscriptionId}`);
      err.status = 404;
      throw err;
    }

    if (!['active', 'pending_proration'].includes(subscription.status)) {
      const err = new Error(`Cannot modify subscription in status: ${subscription.status}`);
      err.status = 400;
      throw err;
    }

    const lineItem = await SubscriptionLineItem.findByPk(lineItemId, {
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!lineItem || lineItem.subscription_id !== subscriptionId) {
      const err = new Error('Subscription line item not found or does not belong to this subscription.');
      err.status = 404;
      throw err;
    }

    const oldQuantity = lineItem.quantity;
    const proration = calculateProration({
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      oldQuantity,
      newQuantity,
      unitPrice: lineItem.unit_price,
      discountPct: lineItem.applied_discount_percentage,
    });

    // Update line item quantity and recalculate period amount
    const netPrice = Number(lineItem.unit_price) * (1 - Number(lineItem.applied_discount_percentage || 0) / 100);
    lineItem.quantity = newQuantity;
    lineItem.period_amount = Number((netPrice * newQuantity).toFixed(2));
    await lineItem.save({ transaction: t });

    // Recalculate MRR
    const allLines = await SubscriptionLineItem.findAll({
      where: { subscription_id: subscriptionId },
      transaction: t,
    });

    let totalPeriodAmount = 0;
    for (const li of allLines) {
      totalPeriodAmount += Number(li.period_amount);
    }

    const cadenceMonths = { monthly: 1, quarterly: 3, annual: 12 };
    const interval = cadenceMonths[subscription.billing_cadence] || 1;
    subscription.mrr_amount = Number((totalPeriodAmount / interval).toFixed(2));
    subscription.arr_amount = Number((subscription.mrr_amount * 12).toFixed(2));
    await subscription.save({ transaction: t });

    // Generate immediate proration invoice
    let generatedInvoice = null;
    if (proration.proration_charge !== 0) {
      const invoiceType = proration.is_credit ? 'credit_note' : 'proration_invoice';
      const absAmount = Math.abs(proration.proration_charge);

      generatedInvoice = await Invoice.create({
        organization_id: subscription.organization_id,
        customer_account_id: subscription.customer_account_id,
        origin_subscription_id: subscription.id,
        invoice_number: `INV-PRO-${subscription.subscription_code}-${Date.now().toString().slice(-4)}`,
        document_type: invoiceType,
        status: 'posted',
        issue_date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        gross_subtotal: absAmount,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: absAmount,
        amount_paid: 0,
        amount_credited: 0,
        balance_due: absAmount,
      }, { transaction: t });

      await InvoiceLine.create({
        invoice_id: generatedInvoice.id,
        product_id: lineItem.product_id,
        line_description: `Mid-cycle proration: ${oldQuantity} → ${newQuantity} seats (${proration.days_remaining_in_cycle}/${proration.total_days_in_cycle} days remaining)`,
        category: 'subscriptions',
        billing_cadence: subscription.billing_cadence,
        quantity: Math.abs(proration.quantity_delta),
        unit_price: proration.net_unit_price,
        discount_amount: 0,
        net_amount: absAmount,
        tax_rate_percentage: 0,
        line_total_with_tax: absAmount,
      }, { transaction: t });
    }

    // Record event
    const eventType = newQuantity > oldQuantity ? 'quantity_increase' : 'quantity_decrease';
    await SubscriptionEvent.create({
      subscription_id: subscription.id,
      actor_user_id: actorUserId,
      event_type: eventType,
      days_remaining_in_cycle: proration.days_remaining_in_cycle,
      total_days_in_cycle: proration.total_days_in_cycle,
      prior_quantity: oldQuantity,
      new_quantity: newQuantity,
      calculated_proration_charge: proration.proration_charge,
      generated_invoice_id: generatedInvoice?.id || null,
      notes: `Quantity changed from ${oldQuantity} to ${newQuantity}. Proration: ${proration.proration_charge}`,
    }, { transaction: t });

    // Update future billing schedules
    await BillingSchedule.update(
      {
        base_charge_amount: totalPeriodAmount,
        expected_total: totalPeriodAmount,
      },
      {
        where: {
          subscription_id: subscriptionId,
          is_processed: false,
          scheduled_date: { [Op.gt]: new Date() },
        },
        transaction: t,
      }
    );

    return {
      subscription,
      line_item: lineItem,
      proration,
      generated_invoice: generatedInvoice,
    };
  });
};

/**
 * Cancel subscription with two-tier logic:
 * - 'period_end': remains active until current cycle ends, no refund.
 * - 'immediate': deactivate now, auto-generate credit note for unused days.
 */
export const cancelSubscription = async ({ subscriptionId, cancellationType, actorUserId, reason }) => {
  return sequelize.transaction(async (t) => {
    const subscription = await Subscription.findByPk(subscriptionId, {
      lock: t.LOCK.UPDATE,
      include: [{ model: SubscriptionLineItem, as: 'lines' }],
      transaction: t,
    });

    if (!subscription) {
      const err = new Error(`Subscription not found: ${subscriptionId}`);
      err.status = 404;
      throw err;
    }

    if (['cancelled', 'pending_cancellation'].includes(subscription.status)) {
      const err = new Error('Subscription is already cancelled or pending cancellation.');
      err.status = 400;
      throw err;
    }

    let creditNoteInvoice = null;

    if (cancellationType === 'immediate') {
      // Calculate unused days credit
      const now = new Date();
      const end = new Date(subscription.current_period_end);
      const start = new Date(subscription.current_period_start);

      const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      const unusedDays = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

      const totalPeriodCharge = subscription.lines.reduce((sum, li) => sum + Number(li.period_amount), 0);
      const dailyRate = totalPeriodCharge / totalDays;
      const creditAmount = Number((unusedDays * dailyRate).toFixed(2));

      if (creditAmount > 0) {
        creditNoteInvoice = await Invoice.create({
          organization_id: subscription.organization_id,
          customer_account_id: subscription.customer_account_id,
          origin_subscription_id: subscription.id,
          invoice_number: `CN-${subscription.subscription_code}-${Date.now().toString().slice(-4)}`,
          document_type: 'credit_note',
          status: 'posted',
          issue_date: now,
          due_date: now,
          gross_subtotal: creditAmount,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: creditAmount,
          amount_paid: 0,
          amount_credited: 0,
          balance_due: creditAmount,
        }, { transaction: t });

        await InvoiceLine.create({
          invoice_id: creditNoteInvoice.id,
          line_description: `Cancellation credit: ${unusedDays} unused days of ${totalDays} day cycle`,
          category: 'subscriptions',
          billing_cadence: subscription.billing_cadence,
          quantity: 1,
          unit_price: creditAmount,
          discount_amount: 0,
          net_amount: creditAmount,
          tax_rate_percentage: 0,
          line_total_with_tax: creditAmount,
        }, { transaction: t });
      }

      subscription.status = 'cancelled';
      subscription.cancelled_at = now;
      subscription.cancellation_reason = reason || 'Immediate cancellation by operator';

      // Cancel all future billing schedules
      await BillingSchedule.update(
        { is_processed: true },
        {
          where: {
            subscription_id: subscriptionId,
            is_processed: false,
          },
          transaction: t,
        }
      );
    } else {
      // period_end cancellation
      subscription.status = 'pending_cancellation';
      subscription.cancellation_reason = reason || 'Cancellation at period end';
    }

    await subscription.save({ transaction: t });

    const eventType = cancellationType === 'immediate' ? 'cancelled_immediate' : 'cancelled_period_end';
    await SubscriptionEvent.create({
      subscription_id: subscription.id,
      actor_user_id: actorUserId,
      event_type: eventType,
      generated_invoice_id: creditNoteInvoice?.id || null,
      notes: `${cancellationType} cancellation. ${reason || ''}`.trim(),
    }, { transaction: t });

    return {
      subscription,
      cancellation_type: cancellationType,
      credit_note: creditNoteInvoice,
    };
  });
};
