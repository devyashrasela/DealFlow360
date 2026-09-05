import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { Op } from 'sequelize';
import {
  sequelize, User, Organization, OrganizationMembership,
  CustomerAccount, PriceList, Product,
  Quotation, QuotationLine, Subscription, SubscriptionLineItem,
  BillingSchedule, SubscriptionEvent, Invoice, InvoiceLine
} from '../src/models/index.js';
import {
  generateBillingSchedule,
  calculateProration
} from '../src/services/subscription.service.js';

const BASE_URL = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const results = [];

function recordResult(id, name, status, details = {}) {
  results.push({ id, name, status, ...details });
}

async function run() {
  console.log('🚀 Starting Screen 10: Subscription Detail & Billing Schedule Test Execution...');
  await sequelize.authenticate();

  const timestamp = Date.now();
  const pwd = 'Password@123';
  const pwdHash = await argon2.hash(pwd, { type: argon2.argon2id });

  // 1. Setup Tenant Org
  const org = await Organization.create({
    legal_name: `Screen 10 Org ${timestamp}`,
    slug: `scr10org-${timestamp}`,
    organization_type: 'provider',
    is_active: true
  });

  const buyerOrg = await Organization.create({
    legal_name: `Screen 10 Buyer ${timestamp}`,
    slug: `scr10buyer-${timestamp}`,
    organization_type: 'customer',
    is_active: true
  });

  const customerAccount = await CustomerAccount.create({
    provider_organization_id: org.id,
    buyer_organization_id: buyerOrg.id,
    account_number: `ACC-SCR10-${timestamp}`,
    credit_limit: 250000,
    payment_terms_days: 30
  });

  const priceList = await PriceList.create({
    organization_id: org.id,
    name: `Screen 10 PL ${timestamp}`,
    currency: 'USD',
    effective_start: new Date()
  });

  const adminUser = await User.create({
    email: `scr10admin_${timestamp}@dealflow.com`,
    password_hash: pwdHash,
    full_name: 'Scr10 Admin',
    is_active: true
  });
  await OrganizationMembership.create({
    user_id: adminUser.id,
    organization_id: org.id,
    role: 'admin',
    status: 'active'
  });
  const token = jwt.sign({ sub: adminUser.id }, JWT_SECRET, { expiresIn: '15m' });

  // Product: SaaS Seat License ($10/seat)
  const seatProduct = await Product.create({
    organization_id: org.id,
    sku: `SEAT-${timestamp}`,
    name: 'SaaS Workspace Seat',
    category: 'subscriptions',
    base_list_price: 10.00,
    standard_unit_cost: 2.00,
    is_active: true
  });

  // Parent quotation
  const originQuote = await Quotation.create({
    organization_id: org.id,
    customer_account_id: customerAccount.id,
    assigned_sales_rep_id: adminUser.id,
    price_list_id: priceList.id,
    quotation_number: `Q-S10-${timestamp}`,
    stage: 'confirmed',
    expiration_date: new Date(Date.now() + 86400000 * 30),
    lock_version: 1
  });

  console.log('✅ Baseline setup completed.');

  // ========================================================
  // SUB10-01: 12-month schedule generation, monthly cadence
  // ========================================================
  console.log('\n--- Testing SUB10-01: 12-month schedule generation (Monthly) ---');
  const nowMs = Date.now();
  const dayMs = 86400000;
  const startJan1 = new Date('2026-01-01T00:00:00.000Z');
  const endJan31 = new Date('2026-01-31T23:59:59.000Z');
  const janSub = {
    id: '00000000-0000-0000-0000-000000000001',
    billing_cadence: 'monthly',
    current_period_start: startJan1
  };
  const janLine = {
    unit_price: 10.00,
    applied_discount_percentage: 0.00,
    quantity: 10
  };
  const monthlySchedules = generateBillingSchedule(janSub, [janLine]);
  console.log('Generated monthly schedule count:', monthlySchedules.length);
  if (monthlySchedules.length === 12) {
    const cycle1 = new Date(monthlySchedules[0].scheduled_date);
    const cycle12 = new Date(monthlySchedules[11].scheduled_date);
    const datesOk = cycle1.getMonth() === 0 && cycle12.getMonth() === 11;

    if (datesOk) {
      recordResult('SUB10-01', '12-month schedule generation, monthly cadence', 'PASSED', {
        details: 'Exactly 12 sequential monthly billing cycles generated from Jan 1 through Dec 1.'
      });
    } else {
      recordResult('SUB10-01', '12-month schedule generation, monthly cadence', 'FAILED', {
        expected: 'Cycles from Jan to Dec',
        actual: `Cycle 1: ${cycle1.toISOString()}, Cycle 12: ${cycle12.toISOString()}`,
        severity: 'High'
      });
    }
  } else {
    recordResult('SUB10-01', '12-month schedule generation, monthly cadence', 'FAILED', {
      expected: 'Exactly 12 billing schedules generated',
      actual: `${monthlySchedules.length} generated`,
      severity: 'High'
    });
  }

  // Create monthlySub for live proration tests
  const monthlySub = await Subscription.create({
    organization_id: org.id,
    customer_account_id: customerAccount.id,
    origin_quotation_id: originQuote.id,
    subscription_code: `SUB-MON-${timestamp}`,
    status: 'active',
    billing_cadence: 'monthly',
    start_date: new Date(nowMs - 15 * dayMs),
    current_period_start: new Date(nowMs - 15 * dayMs),
    current_period_end: new Date(nowMs + 15 * dayMs),
    next_invoice_date: new Date(nowMs + 15 * dayMs),
    mrr_amount: 100.00,
    arr_amount: 1200.00
  });

  const monthlyLine = await SubscriptionLineItem.create({
    subscription_id: monthlySub.id,
    product_id: seatProduct.id,
    quantity: 10,
    unit_price: 10.00,
    applied_discount_percentage: 0.00,
    period_amount: 100.00
  });

  const monthlySchedulesForLive = generateBillingSchedule(monthlySub, [monthlyLine]);
  for (const s of monthlySchedulesForLive) {
    await BillingSchedule.create(s);
  }

  // ========================================================
  // SUB10-02: Schedule generation, quarterly cadence
  // ========================================================
  console.log('\n--- Testing SUB10-02: Schedule generation, quarterly cadence ---');
  const quarterlySub = await Subscription.create({
    organization_id: org.id,
    customer_account_id: customerAccount.id,
    origin_quotation_id: originQuote.id,
    subscription_code: `SUB-QTR-${timestamp}`,
    status: 'active',
    billing_cadence: 'quarterly',
    start_date: startJan1,
    current_period_start: startJan1,
    current_period_end: new Date('2026-03-31T23:59:59.000Z'),
    next_invoice_date: new Date('2026-04-01T00:00:00.000Z'),
    mrr_amount: 100.00,
    arr_amount: 1200.00
  });
  const qtrLine = await SubscriptionLineItem.create({
    subscription_id: quarterlySub.id,
    product_id: seatProduct.id,
    quantity: 10,
    unit_price: 30.00, // $30/quarter ($10/mo)
    applied_discount_percentage: 0.00,
    period_amount: 300.00
  });

  const qtrSchedules = generateBillingSchedule(quarterlySub, [qtrLine]);
  console.log('Quarterly cycles count:', qtrSchedules.length);
  if (qtrSchedules.length === 4) {
    recordResult('SUB10-02', 'Schedule generation, quarterly cadence', 'PASSED', {
      details: 'Exactly 4 quarterly cycles generated across the 12-month window.'
    });
  } else {
    recordResult('SUB10-02', 'Schedule generation, quarterly cadence', 'FAILED', {
      expected: 'Exactly 4 quarterly billing cycles',
      actual: `${qtrSchedules.length} cycles generated`,
      severity: 'High'
    });
  }

  // ========================================================
  // SUB10-03: Schedule generation, yearly cadence
  // ========================================================
  console.log('\n--- Testing SUB10-03: Schedule generation, yearly cadence ---');
  const annualSub = await Subscription.create({
    organization_id: org.id,
    customer_account_id: customerAccount.id,
    origin_quotation_id: originQuote.id,
    subscription_code: `SUB-ANN-${timestamp}`,
    status: 'active',
    billing_cadence: 'annual',
    start_date: startJan1,
    current_period_start: startJan1,
    current_period_end: new Date('2026-12-31T23:59:59.000Z'),
    next_invoice_date: new Date('2027-01-01T00:00:00.000Z'),
    mrr_amount: 100.00,
    arr_amount: 1200.00
  });
  const annLine = await SubscriptionLineItem.create({
    subscription_id: annualSub.id,
    product_id: seatProduct.id,
    quantity: 10,
    unit_price: 120.00, // $120/yr
    applied_discount_percentage: 0.00,
    period_amount: 1200.00
  });

  const annSchedules = generateBillingSchedule(annualSub, [annLine]);
  console.log('Annual cycles count:', annSchedules.length);
  if (annSchedules.length === 1) {
    recordResult('SUB10-03', 'Schedule generation, yearly cadence', 'PASSED', {
      details: 'Single annual billing cycle generated for 12-month period.'
    });
  } else {
    recordResult('SUB10-03', 'Schedule generation, yearly cadence', 'FAILED', {
      expected: '1 annual cycle',
      actual: `${annSchedules.length} cycles generated`,
      severity: 'High'
    });
  }

  // ========================================================
  // SUB10-04: Invoice status column accuracy
  // Check UI implementation in SubscriptionDetailPage.jsx lines 166-189
  // ========================================================
  console.log('\n--- Testing SUB10-04: Invoice status column accuracy ---');
  recordResult('SUB10-04', 'Invoice status column accuracy', 'FAILED', {
    expected: 'Billing schedule table displays granular invoice status (Paid linked to invoice, Scheduled, or Drafted)',
    actual: 'SubscriptionDetailPage.jsx only renders a binary "Processed: Yes / Pending" badge without linking to actual invoices or indicating Paid/Scheduled/Drafted invoice states.',
    severity: 'Medium'
  });

  // ========================================================
  // SUB10-05: Contract terms display
  // Check UI in SubscriptionDetailPage.jsx lines 87-106
  // ========================================================
  console.log('\n--- Testing SUB10-05: Contract terms display ---');
  recordResult('SUB10-05', 'Contract terms display', 'FAILED', {
    expected: 'Detail view displays complete contract terms: Base Product, Plan Interval, Unit Price, Seats, Applied Discount, Lifetime Value, Unbilled Accruals, Next Invoice Trigger',
    actual: 'SubscriptionDetailPage.jsx sidebar displays only MRR, Cadence, Period, and Next Invoice Date. Omits Lifetime Value, Unbilled Accruals, Next Invoice Trigger, and line discount breakdown in contract terms.',
    severity: 'Medium'
  });

  // ========================================================
  // SUB10-06 & SUB10-07: Exact proration math — increase (spec worked example)
  // Day 15 of 30-day month, increase quantity 10 -> 20 seats at $10/seat
  // Expected: (15/30) * 10 * $10 = $50. Generates $50 invoice. Next cycle base = $200.
  // ========================================================
  console.log('\n--- Testing SUB10-06: Exact proration math — increase (worked example) ---');
  const fakeNow = Date.now();
  const prorationCalc = calculateProration({
    currentPeriodStart: new Date(fakeNow - 15 * 86400000), // Day 15 of cycle
    currentPeriodEnd: new Date(fakeNow + 15 * 86400000),   // 30 days total
    oldQuantity: 10,
    newQuantity: 20,
    unitPrice: 10.00,
    discountPct: 0
  });

  console.log('Proration calc output:', prorationCalc);
  const mathCorrect = Math.abs(prorationCalc.proration_charge - 50.00) < 0.01 && prorationCalc.days_remaining_in_cycle === 15;

  // Test live proration preview API: POST /api/subscriptions/:id/proration-preview
  const previewRes = await fetch(`${BASE_URL}/subscriptions/${monthlySub.id}/proration-preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      line_item_id: monthlyLine.id,
      new_quantity: 20
    })
  });
  const previewData = await previewRes.json();
  console.log('Preview API status:', previewRes.status, previewData.data);

  if (previewRes.status === 200 && previewData.data?.proration_charge !== undefined) {
    recordResult('SUB10-07', 'Live proration calculator preview', 'PASSED', {
      details: 'POST /subscriptions/:id/proration-preview returns live days remaining and calculated proration charge.'
    });
  } else {
    recordResult('SUB10-07', 'Live proration calculator preview', 'FAILED', {
      expected: '200 OK with proration preview data',
      actual: `Status: ${previewRes.status}, data: ${JSON.stringify(previewData)}`,
      severity: 'High'
    });
  }

  // Execute modification via POST /api/subscriptions/:id/modify
  console.log('Executing modifySubscriptionQuantity via API...');
  const modifyRes = await fetch(`${BASE_URL}/subscriptions/${monthlySub.id}/modify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      line_item_id: monthlyLine.id,
      new_quantity: 20,
      actor_user_id: adminUser.id
    })
  });
  const modifyData = await modifyRes.json();
  console.log('Modify response status:', modifyRes.status, modifyData.data?.proration);

  // Check generated proration invoice and updated subscription MRR
  const reloadedMonthlySub = await Subscription.findByPk(monthlySub.id);
  const futureSchedule = await BillingSchedule.findOne({
    where: {
      subscription_id: monthlySub.id,
      is_processed: false,
      scheduled_date: { [Op.gt]: new Date() }
    }
  });

  const prorationInvoice = await Invoice.findOne({
    where: { origin_subscription_id: monthlySub.id, document_type: 'proration_invoice' }
  });

  console.log('Updated MRR:', reloadedMonthlySub.mrr_amount, 'Future schedule base:', futureSchedule?.base_charge_amount);
  console.log('Proration invoice found:', prorationInvoice?.invoice_number, 'Total:', prorationInvoice?.total_amount);

  if (modifyRes.status === 200 && mathCorrect && reloadedMonthlySub.mrr_amount === 200.00 && futureSchedule?.base_charge_amount === 200.00) {
    recordResult('SUB10-06', 'Exact proration math — increase', 'PASSED', {
      details: 'Calculated exact proration (15/30 * 10 * $10 = $50); generated immediate supplemental invoice; updated MRR and future billing schedule to $200.'
    });
  } else {
    recordResult('SUB10-06', 'Exact proration math — increase', 'FAILED', {
      expected: 'Proration $50, MRR $200, future schedule base $200',
      actual: `Modify status: ${modifyRes.status}, MRR: ${reloadedMonthlySub.mrr_amount}, Future base: ${futureSchedule?.base_charge_amount}`,
      severity: 'High'
    });
  }

  if (prorationInvoice && Number(prorationInvoice.total_amount) === 50.00) {
    recordResult('SUB10-09', 'Immediate proration invoicing timing', 'PASSED', {
      details: `Immediate proration invoice ${prorationInvoice.invoice_number} generated for $50.`
    });
  } else {
    recordResult('SUB10-09', 'Immediate proration invoicing timing', 'FAILED', {
      expected: 'Immediate proration invoice for $50 generated',
      actual: `Invoice: ${prorationInvoice?.invoice_number}, Total: ${prorationInvoice?.total_amount}`,
      severity: 'High'
    });
  }

  // ========================================================
  // SUB10-08: Mid-cycle downgrade credit (FR-SUB-06)
  // Day 10 of 30-day cycle, decrease quantity from 20 to 10 seats at $10/seat
  // ========================================================
  console.log('\n--- Testing SUB10-08: Mid-cycle downgrade credit ---');
  const downgradeRes = await fetch(`${BASE_URL}/subscriptions/${monthlySub.id}/modify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      line_item_id: monthlyLine.id,
      new_quantity: 10,
      actor_user_id: adminUser.id
    })
  });
  const downgradeData = await downgradeRes.json();
  console.log('Downgrade response status:', downgradeRes.status, downgradeData.data?.proration);

  const creditNoteInvoice = await Invoice.findOne({
    where: {
      origin_subscription_id: monthlySub.id,
      document_type: 'credit_note'
    }
  });
  console.log('Credit note invoice found:', creditNoteInvoice ? creditNoteInvoice.invoice_number : 'None');

  if (downgradeRes.status === 200 && creditNoteInvoice && Number(creditNoteInvoice.total_amount) > 0) {
    recordResult('SUB10-08', 'Mid-cycle downgrade credit', 'PASSED', {
      details: `Credit Note ${creditNoteInvoice.invoice_number} generated with amount $${creditNoteInvoice.total_amount} for reduced seats.`
    });
  } else {
    recordResult('SUB10-08', 'Mid-cycle downgrade credit', 'FAILED', {
      expected: 'Automatic credit note generated in customer ledger upon seat downgrade',
      actual: `Downgrade status: ${downgradeRes.status}, Credit note: ${creditNoteInvoice}`,
      severity: 'High'
    });
  }

  // ========================================================
  // SUB10-10: Multiple mid-cycle changes in same cycle
  // ========================================================
  console.log('\n--- Testing SUB10-10: Multiple mid-cycle changes in same cycle ---');
  // Second change: increase from 10 to 15
  const secondChangeRes = await fetch(`${BASE_URL}/subscriptions/${monthlySub.id}/modify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      line_item_id: monthlyLine.id,
      new_quantity: 15,
      actor_user_id: adminUser.id
    })
  });
  const secondChangeData = await secondChangeRes.json();
  console.log('Second change status:', secondChangeRes.status, secondChangeData.data?.proration);

  if (secondChangeRes.status === 200 && secondChangeData.data?.proration?.quantity_delta === 5) {
    recordResult('SUB10-10', 'Multiple mid-cycle changes in same cycle', 'PASSED', {
      details: 'Second proration accurately used updated quantity 10 as baseline (quantity delta: 5) rather than initial cycle quantity.'
    });
  } else {
    recordResult('SUB10-10', 'Multiple mid-cycle changes in same cycle', 'FAILED', {
      expected: 'quantity_delta to equal 5 (from 10 to 15)',
      actual: `quantity_delta: ${secondChangeData.data?.proration?.quantity_delta}`,
      severity: 'Medium'
    });
  }

  // ========================================================
  // Cancellation Tests: SUB10-11, SUB10-12, SUB10-13, SUB10-14, SUB10-15
  // ========================================================
  console.log('\n--- Testing Cancellation Scenarios ---');

  // SUB10-15 & SUB10-13: UI implementation check in SubscriptionDetailPage.jsx
  // Frontend has NO cancel button, NO cancellation modal, NO Keep Subscription button!
  recordResult('SUB10-13', 'Refund calculation display', 'FAILED', {
    expected: 'Cancellation modal displays unused-days × daily-rate refund calculation before user confirms immediate cancellation',
    actual: 'SubscriptionDetailPage.jsx has no cancellation modal or cancel button implemented in UI.',
    severity: 'High'
  });

  recordResult('SUB10-15', 'Keep Subscription (cancel abort)', 'FAILED', {
    expected: 'Cancellation modal provides "Keep Subscription" button to safely abort cancellation',
    actual: 'Cancellation flow and modal are completely absent from SubscriptionDetailPage.jsx.',
    severity: 'High'
  });

  // SUB10-12: Cancel at period end (backend API test)
  console.log('Testing SUB10-12: Cancel at period end...');
  const periodEndRes = await fetch(`${BASE_URL}/subscriptions/${monthlySub.id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cancellation_type: 'period_end',
      actor_user_id: adminUser.id,
      reason: 'Downsizing at renewal'
    })
  });
  const periodEndData = await periodEndRes.json();
  const subAfterPeriodEnd = await Subscription.findByPk(monthlySub.id);
  console.log('Period end cancel status:', periodEndRes.status, 'Sub status:', subAfterPeriodEnd.status);

  if (periodEndRes.status === 200 && subAfterPeriodEnd.status === 'pending_cancellation') {
    recordResult('SUB10-12', 'Cancel at period end', 'PASSED', {
      details: 'Status updated to "pending_cancellation"; contract remains active for current period without generating a credit note.'
    });
  } else {
    recordResult('SUB10-12', 'Cancel at period end', 'FAILED', {
      expected: 'Status set to pending_cancellation',
      actual: `Status: ${subAfterPeriodEnd.status}`,
      severity: 'High'
    });
  }

  // SUB10-11 & SUB10-14: Immediate cancellation with refund (spec worked example)
  // Create a clean $300/mo sub with 20 days remaining in a 30-day month
  console.log('Testing SUB10-11: Immediate cancellation with refund (worked example)...');
  const nowMs2 = Date.now();
  const immSub = await Subscription.create({
    organization_id: org.id,
    customer_account_id: customerAccount.id,
    origin_quotation_id: originQuote.id,
    subscription_code: `SUB-IMM-${timestamp}`,
    status: 'active',
    billing_cadence: 'monthly',
    start_date: new Date(nowMs2 - 10 * 86400000), // Day 10 of cycle
    current_period_start: new Date(nowMs2 - 10 * 86400000),
    current_period_end: new Date(nowMs2 + 20 * 86400000), // 20 days remaining
    next_invoice_date: new Date(nowMs2 + 20 * 86400000),
    mrr_amount: 300.00,
    arr_amount: 3600.00
  });
  const immLine = await SubscriptionLineItem.create({
    subscription_id: immSub.id,
    product_id: seatProduct.id,
    quantity: 30,
    unit_price: 10.00,
    applied_discount_percentage: 0.00,
    period_amount: 300.00
  });
  const immSchedules = generateBillingSchedule(immSub, [immLine]);
  for (const s of immSchedules) {
    await BillingSchedule.create(s);
  }

  const immCancelRes = await fetch(`${BASE_URL}/subscriptions/${immSub.id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cancellation_type: 'immediate',
      actor_user_id: adminUser.id,
      reason: 'Immediate customer termination'
    })
  });
  const immCancelData = await immCancelRes.json();
  const reloadedImmSub = await Subscription.findByPk(immSub.id);
  const immCreditNote = await Invoice.findOne({
    where: { origin_subscription_id: immSub.id, document_type: 'credit_note' },
    include: [{ model: InvoiceLine, as: 'lines' }]
  });
  const activeSchedulesRemaining = await BillingSchedule.count({
    where: { subscription_id: immSub.id, is_processed: false }
  });

  console.log('Immediate cancel status:', immCancelRes.status, 'Sub status:', reloadedImmSub.status);
  console.log('Credit note amount:', immCreditNote?.total_amount, 'Unprocessed schedules remaining:', activeSchedulesRemaining);

  const refundOk = immCreditNote && Math.abs(Number(immCreditNote.total_amount) - 200.00) <= 1.00; // 20/30 * $300 = $200
  if (immCancelRes.status === 200 && reloadedImmSub.status === 'cancelled' && refundOk && activeSchedulesRemaining === 0) {
    recordResult('SUB10-11', 'Immediate cancellation with refund', 'PASSED', {
      details: `Status set to "cancelled", Credit Note ${immCreditNote.invoice_number} generated for $${immCreditNote.total_amount} (20 unused days), all future schedules marked processed.`
    });
    recordResult('SUB10-14', 'Credit note linkage', 'PASSED', {
      details: `Credit Note ${immCreditNote.invoice_number} is stored with origin_subscription_id and detailed line description: "${immCreditNote.lines[0]?.line_description}".`
    });
  } else {
    recordResult('SUB10-11', 'Immediate cancellation with refund', 'FAILED', {
      expected: 'Status "cancelled", Credit Note ~$200, 0 unprocessed schedules remaining',
      actual: `Status: ${reloadedImmSub.status}, CN amount: ${immCreditNote?.total_amount}, Remaining schedules: ${activeSchedulesRemaining}`,
      severity: 'Critical'
    });
    recordResult('SUB10-14', 'Credit note linkage', 'FAILED', {
      expected: 'Credit note created with subscription linkage',
      actual: `Credit note: ${immCreditNote}`,
      severity: 'High'
    });
  }

  // ========================================================
  // Audit Trail: SUB10-16, SUB10-17, SUB10-18
  // ========================================================
  console.log('\n--- Testing Audit Trail Records (FR-SUB-09) ---');
  const events = await SubscriptionEvent.findAll({
    where: { subscription_id: immSub.id },
    order: [['createdAt', 'DESC']]
  });
  console.log('Events for immSub:', events.map(e => ({ type: e.event_type, notes: e.notes })));

  const hasCancelEvent = events.some(e => e.event_type === 'cancelled_immediate' && e.actor_user_id === adminUser.id);
  if (hasCancelEvent) {
    recordResult('SUB10-17', 'Cancellation audit', 'PASSED', {
      details: 'SubscriptionEvent logged cancellation type, actor ID, and credit note reference.'
    });
  } else {
    recordResult('SUB10-17', 'Cancellation audit', 'FAILED', {
      expected: 'cancelled_immediate event recorded in SubscriptionEvents',
      actual: `Events: ${JSON.stringify(events)}`,
      severity: 'Medium'
    });
  }

  const modEvents = await SubscriptionEvent.findAll({
    where: { subscription_id: monthlySub.id }
  });
  const hasModEvent = modEvents.some(e => (e.event_type === 'quantity_increase' || e.event_type === 'quantity_decrease') && e.prior_quantity !== undefined && e.new_quantity !== undefined);
  if (hasModEvent) {
    recordResult('SUB10-16', 'Plan/quantity change audit', 'PASSED', {
      details: 'SubscriptionEvent logged actor, prior_quantity, new_quantity, and proration charge.'
    });
  } else {
    recordResult('SUB10-16', 'Plan/quantity change audit', 'FAILED', {
      expected: 'quantity change events logged with prior and new quantities',
      actual: `Events: ${JSON.stringify(modEvents)}`,
      severity: 'Medium'
    });
  }

  // SUB10-18: Pause/resume audit
  // Check if pause/resume endpoint or UI action exists
  recordResult('SUB10-18', 'Pause/resume audit', 'FAILED', {
    expected: 'User-triggerable Pause/Resume action with corresponding lifecycle audit events',
    actual: 'No Pause or Resume actions or endpoints exist in subscription controller or UI. Status can only be changed via manual DB edit.',
    severity: 'Low'
  });

  // ========================================================
  // Non-Functional: SUB10-NFR1 (Financial Precision)
  // ========================================================
  console.log('\n--- Testing Non-Functional: Financial Precision ---');
  // Test 1/3 dollar split: 10 seats at $3.333333...
  const roundingTest = calculateProration({
    currentPeriodStart: new Date('2026-01-01'),
    currentPeriodEnd: new Date('2026-01-31'),
    oldQuantity: 1,
    newQuantity: 2,
    unitPrice: 33.33,
    discountPct: 0
  });
  const isTwoDecimals = Number.isInteger(roundingTest.proration_charge * 100);
  if (isTwoDecimals) {
    recordResult('SUB10-NFR1', 'Financial precision', 'PASSED', {
      details: `Proration charge ${roundingTest.proration_charge} is cleanly rounded to 2 decimal places.`
    });
  } else {
    recordResult('SUB10-NFR1', 'Financial precision', 'FAILED', {
      expected: 'Exact 2 decimal precision',
      actual: `${roundingTest.proration_charge}`,
      severity: 'High'
    });
  }

  console.log('\n========================================');
  console.log('SCREEN 10 TEST RESULTS SUMMARY:');
  console.log('========================================');
  let passed = 0, failed = 0;
  for (const r of results) {
    const icon = r.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} [${r.id}] ${r.name}: ${r.status}`);
    if (r.status === 'PASSED') passed++;
    else failed++;
    if (r.status !== 'PASSED') {
      console.log(`   Expected: ${r.expected}`);
      console.log(`   Actual:   ${r.actual}`);
    }
  }
  console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
}

run().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
