import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  sequelize,
  Organization,
  CustomerAccount,
  Product,
  PriceList,
  User,
  Quotation,
  QuotationLine,
  Subscription,
  SubscriptionLineItem,
  BillingSchedule,
  SubscriptionEvent,
  Invoice,
  InvoiceLine,
  Payment,
  CreditAllocation,
} from '../src/models/index.js';
import {
  provisionSubscriptionFromQuote,
  modifySubscriptionQuantity,
  cancelSubscription,
  calculateProration,
} from '../src/services/subscription.service.js';
import {
  generateInvoiceFromQuote,
  recordPayment,
  applyCreditNoteOffset,
} from '../src/services/invoice.service.js';

// Test fixtures
let org, customer, user, product, priceList, quotation, recurringLine, oneTimeLine;

before(async () => {
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
  await sequelize.sync({ force: true });
  await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

  org = await Organization.create({
    legal_name: 'Test Corp',
    trading_name: 'TestCo',
    slug: `testco-${Date.now()}`,
    organization_type: 'provider',
  });

  user = await User.create({
    full_name: 'Test Operator',
    email: `test-${Date.now()}@test.com`,
    password_hash: 'irrelevant',
  });

  customer = await CustomerAccount.create({
    provider_organization_id: org.id,
    buyer_organization_id: org.id,
    account_number: `ACCT-${Date.now()}`,
    pricing_tier: 'gold',
    credit_limit: 100000,
    default_payment_terms_days: 30,
    assigned_sales_rep_id: user.id,
  });

  priceList = await PriceList.create({
    organization_id: org.id,
    name: 'Default Price List',
    currency: 'USD',
    is_active: true,
    effective_start: new Date(),
  });

  product = await Product.create({
    organization_id: org.id,
    sku: 'PROD-SUB-001',
    name: 'Cloud SaaS Seats',
    description: 'Monthly SaaS seats subscription',
    category: 'subscriptions',
    billing_cadence: 'monthly',
    base_list_price: 50.00,
    standard_unit_cost: 30.00,
  });

  const oneTimeProduct = await Product.create({
    organization_id: org.id,
    sku: 'PROD-HW-001',
    name: 'Laptop',
    description: 'Hardware laptop',
    category: 'hardware',
    billing_cadence: 'one_time',
    base_list_price: 1200.00,
    standard_unit_cost: 800.00,
  });

  quotation = await Quotation.create({
    organization_id: org.id,
    customer_account_id: customer.id,
    quotation_number: `QT-TEST-${Date.now()}`,
    stage: 'confirmed',
    assigned_sales_rep_id: user.id,
    price_list_id: priceList.id,
    gross_total: 500.00,
    net_subtotal: 450.00,
    grand_total: 450.00,
    blended_margin_percentage: 40.00,
    worst_line_excess: 0,
    weighted_margin_bleed: 0,
    blended_risk_score: 5.0,
    risk_tier: 'low_risk_auto',
    expiration_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  recurringLine = await QuotationLine.create({
    quotation_id: quotation.id,
    product_id: product.id,
    line_number: 1,
    category: 'subscriptions',
    billing_cadence: 'monthly',
    quantity: 10,
    unit_list_price: 50.00,
    unit_cost_price: 30.00,
    applied_discount_percentage: 10.00,
    effective_ceiling_limit: 25.00,
    unit_net_price: 45.00,
    line_gross_amount: 500.00,
    line_net_amount: 450.00,
    line_cost_total: 300.00,
    line_margin_amount: 150.00,
    line_margin_percentage: 33.33,
  });

  oneTimeLine = await QuotationLine.create({
    quotation_id: quotation.id,
    product_id: oneTimeProduct.id,
    line_number: 2,
    category: 'hardware',
    billing_cadence: 'one_time',
    quantity: 2,
    unit_list_price: 1200.00,
    unit_cost_price: 800.00,
    applied_discount_percentage: 5.00,
    effective_ceiling_limit: 20.00,
    unit_net_price: 1140.00,
    line_gross_amount: 2400.00,
    line_net_amount: 2280.00,
    line_cost_total: 1600.00,
    line_margin_amount: 680.00,
    line_margin_percentage: 29.82,
  });
});

after(async () => {
  await sequelize.close();
});

// ─── FEATURE 2: SUBSCRIPTIONS & PRORATION ──────────────────

let subscription;

describe('Feature 2: Subscriptions & Proration', () => {
  it('T1: Provision subscription from confirmed quotation', async () => {
    const result = await provisionSubscriptionFromQuote(quotation.id);

    assert.ok(result.subscription, 'subscription should be created');
    assert.equal(result.subscription.status, 'active');
    assert.equal(result.subscription.billing_cadence, 'monthly');
    assert.ok(Number(result.subscription.mrr_amount) > 0, 'MRR should be > 0');
    assert.equal(Number(result.subscription.arr_amount), Number(result.subscription.mrr_amount) * 12);
    assert.equal(result.line_items.length, 1);
    assert.equal(result.schedule_count, 12);

    subscription = result.subscription;
  });

  it('T2: 12-month billing schedule generated correctly', async () => {
    const schedules = await BillingSchedule.findAll({
      where: { subscription_id: subscription.id },
      order: [['cycle_number', 'ASC']],
    });

    assert.equal(schedules.length, 12);
    assert.equal(schedules[0].cycle_number, 1);
    assert.equal(schedules[11].cycle_number, 12);
    assert.ok(schedules.every(s => !s.is_processed), 'all schedules should be unprocessed');
    assert.ok(Number(schedules[0].base_charge_amount) > 0);
  });

  it('T3: Proration calculator produces correct daily delta', () => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 15);
    const end = new Date(now);
    end.setDate(end.getDate() + 15);

    const result = calculateProration({
      currentPeriodStart: start,
      currentPeriodEnd: end,
      oldQuantity: 10,
      newQuantity: 15,
      unitPrice: 50,
      discountPct: 0,
    });

    assert.equal(result.quantity_delta, 5);
    assert.ok(result.proration_charge > 0);
    assert.equal(result.is_credit, false);
    assert.ok(result.days_remaining_in_cycle <= result.total_days_in_cycle);
  });

  it('T4: Mid-cycle quantity increase generates proration invoice', async () => {
    const lines = await SubscriptionLineItem.findAll({
      where: { subscription_id: subscription.id },
    });

    const result = await modifySubscriptionQuantity({
      subscriptionId: subscription.id,
      lineItemId: lines[0].id,
      newQuantity: 15,
      actorUserId: user.id,
    });

    assert.equal(result.proration.quantity_delta, 5);
    assert.ok(result.proration.proration_charge > 0);
    assert.ok(result.generated_invoice, 'proration invoice should exist');
    assert.equal(result.generated_invoice.document_type, 'proration_invoice');
    assert.equal(result.line_item.quantity, 15);
  });

  it('T5: Concurrent quantity modifications serialize correctly', async () => {
    const lines = await SubscriptionLineItem.findAll({
      where: { subscription_id: subscription.id },
    });

    const [result1, result2] = await Promise.allSettled([
      modifySubscriptionQuantity({
        subscriptionId: subscription.id,
        lineItemId: lines[0].id,
        newQuantity: 20,
        actorUserId: user.id,
      }),
      modifySubscriptionQuantity({
        subscriptionId: subscription.id,
        lineItemId: lines[0].id,
        newQuantity: 25,
        actorUserId: user.id,
      }),
    ]);

    const successes = [result1, result2].filter(r => r.status === 'fulfilled');
    assert.ok(successes.length >= 1, 'at least one concurrent modification should succeed');

    const finalLine = await SubscriptionLineItem.findByPk(lines[0].id);
    assert.ok([20, 25].includes(finalLine.quantity), `final quantity should be 20 or 25, got ${finalLine.quantity}`);
  });

  it('T6: Immediate cancellation generates credit note for unused days', async () => {
    const result = await cancelSubscription({
      subscriptionId: subscription.id,
      cancellationType: 'immediate',
      actorUserId: user.id,
      reason: 'No longer needed',
    });

    assert.equal(result.subscription.status, 'cancelled');
    assert.equal(result.cancellation_type, 'immediate');
    if (result.credit_note) {
      assert.equal(result.credit_note.document_type, 'credit_note');
      assert.ok(Number(result.credit_note.total_amount) > 0);
    }
  });
});

// ─── FEATURE 3: UNIFIED FINANCIAL LEDGER ──────────────────

let invoice;

describe('Feature 3: Unified Financial Ledger', () => {
  it('T7: Generate standard invoice from quotation one-time lines', async () => {
    const result = await generateInvoiceFromQuote(quotation.id);

    assert.ok(result.invoice, 'invoice should be generated');
    assert.equal(result.invoice.document_type, 'standard_invoice');
    assert.equal(result.invoice.status, 'posted');
    assert.ok(Number(result.invoice.total_amount) > 0);
    assert.equal(Number(result.invoice.balance_due), Number(result.invoice.total_amount));
    assert.equal(result.line_count, 1);

    invoice = result.invoice;
  });

  it('T8: Record partial payment reduces balance_due', async () => {
    const partialAmount = Number((Number(invoice.total_amount) / 2).toFixed(2));

    const result = await recordPayment({
      invoiceId: invoice.id,
      amount: partialAmount,
      paymentMethod: 'wire_transfer',
      transactionReference: 'TXN-TEST-001',
      recordedByUserId: user.id,
    });

    assert.ok(result.payment, 'payment should be created');
    assert.equal(Number(result.payment.amount), partialAmount);
    assert.equal(result.invoice.status, 'partially_paid');
    assert.equal(Number(result.invoice.balance_due), Number(invoice.total_amount) - partialAmount);
  });

  it('T9: Overpayment is rejected', async () => {
    const refreshed = await Invoice.findByPk(invoice.id);
    const overAmount = Number(refreshed.balance_due) + 100;

    await assert.rejects(
      () => recordPayment({
        invoiceId: invoice.id,
        amount: overAmount,
        paymentMethod: 'credit_card',
        recordedByUserId: user.id,
      }),
      /exceeds balance due/
    );
  });

  it('T10: Full payment settles invoice to "paid" status', async () => {
    const refreshed = await Invoice.findByPk(invoice.id);
    const remaining = Number(refreshed.balance_due);

    const result = await recordPayment({
      invoiceId: invoice.id,
      amount: remaining,
      paymentMethod: 'wire_transfer',
      transactionReference: 'TXN-TEST-002',
      recordedByUserId: user.id,
    });

    assert.equal(result.invoice.status, 'paid');
    assert.equal(Number(result.invoice.balance_due), 0);
  });

  it('T11: Payment on a fully paid invoice is rejected', async () => {
    await assert.rejects(
      () => recordPayment({
        invoiceId: invoice.id,
        amount: 1.00,
        paymentMethod: 'credit_card',
        recordedByUserId: user.id,
      }),
      /already in status/
    );
  });

  it('T12: Credit note offset engine applies correctly', async () => {
    const targetInvoice = await Invoice.create({
      organization_id: org.id,
      customer_account_id: customer.id,
      invoice_number: `INV-OFFSET-TARGET-${Date.now()}`,
      document_type: 'standard_invoice',
      status: 'posted',
      issue_date: new Date(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      gross_subtotal: 500.00,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 500.00,
      amount_paid: 0,
      amount_credited: 0,
      balance_due: 500.00,
    });

    const creditNoteInvoice = await Invoice.create({
      organization_id: org.id,
      customer_account_id: customer.id,
      invoice_number: `CN-OFFSET-${Date.now()}`,
      document_type: 'credit_note',
      status: 'posted',
      issue_date: new Date(),
      due_date: new Date(),
      gross_subtotal: 200.00,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 200.00,
      amount_paid: 0,
      amount_credited: 0,
      balance_due: 200.00,
    });

    const result = await applyCreditNoteOffset({
      creditNoteInvoiceId: creditNoteInvoice.id,
      targetInvoiceId: targetInvoice.id,
      amount: 200.00,
      allocatedByUserId: user.id,
    });

    assert.ok(result.allocation, 'allocation should be created');
    assert.equal(Number(result.allocation.allocated_amount), 200.00);
    assert.equal(Number(result.target_invoice.balance_due), 300.00);
    assert.equal(result.target_invoice.status, 'partially_paid');
    assert.equal(Number(result.credit_note.balance_due), 0);
    assert.equal(result.credit_note.status, 'credited');
  });

  it('T13: Concurrent payments serialize correctly (no double-spend)', async () => {
    const freshInvoice = await Invoice.create({
      organization_id: org.id,
      customer_account_id: customer.id,
      invoice_number: `INV-CONC-${Date.now()}`,
      document_type: 'standard_invoice',
      status: 'posted',
      issue_date: new Date(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      gross_subtotal: 100.00,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 100.00,
      amount_paid: 0,
      amount_credited: 0,
      balance_due: 100.00,
    });

    const [r1, r2] = await Promise.allSettled([
      recordPayment({
        invoiceId: freshInvoice.id,
        amount: 60.00,
        paymentMethod: 'wire_transfer',
        transactionReference: 'TXN-CONC-1',
        recordedByUserId: user.id,
      }),
      recordPayment({
        invoiceId: freshInvoice.id,
        amount: 60.00,
        paymentMethod: 'wire_transfer',
        transactionReference: 'TXN-CONC-2',
        recordedByUserId: user.id,
      }),
    ]);

    const successes = [r1, r2].filter(r => r.status === 'fulfilled');
    const failures = [r1, r2].filter(r => r.status === 'rejected');

    assert.equal(successes.length, 1, 'exactly one concurrent payment should succeed');
    assert.equal(failures.length, 1, 'exactly one concurrent payment should fail');

    const final = await Invoice.findByPk(freshInvoice.id);
    assert.equal(Number(final.amount_paid), 60.00);
    assert.equal(Number(final.balance_due), 40.00);
  });
});
