import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { Op } from 'sequelize';
import {
  sequelize,
  User,
  Organization,
  OrganizationMembership,
  CustomerAccount,
  PriceList,
  Quotation,
  QuotationLine,
  Product,
  DealHealthAlert,
  RepDiscountBaseline,
  FulfillmentOrder,
  Backorder,
  Warehouse,
} from '../src/models/index.js';

const BASE_URL = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const fetchOpts = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  };
  if (options.body) {
    fetchOpts.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, fetchOpts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function runTests() {
  console.log('--- Starting Screen 14: Deal Health & Anomaly Dashboard Test Suite ---');
  const results = [];

  function record(testId, passed, message, data = {}) {
    results.push({ testId, passed, message, data });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testId}: ${message}`);
  }

  try {
    await sequelize.authenticate();

    const timestamp = Date.now();
    const pwdHash = await argon2.hash('Password@123', { type: argon2.argon2id });

    // 1. Setup Test Organization A
    const orgA = await Organization.create({
      legal_name: `DealHealth Org A ${timestamp}`,
      slug: `dhorg-a-${timestamp}`,
      organization_type: 'provider',
      is_active: true,
    });

    const orgB = await Organization.create({
      legal_name: `DealHealth Org B ${timestamp}`,
      slug: `dhorg-b-${timestamp}`,
      organization_type: 'provider',
      is_active: true,
    });

    const buyerOrg = await Organization.create({
      legal_name: `DealHealth Buyer ${timestamp}`,
      slug: `dhbuyer-${timestamp}`,
      organization_type: 'customer',
      is_active: true,
    });

    const customerAccount = await CustomerAccount.create({
      provider_organization_id: orgA.id,
      buyer_organization_id: buyerOrg.id,
      account_number: `ACC-DH-${timestamp}`,
      credit_limit: 100000,
      default_payment_terms_days: 30,
    });

    const priceList = await PriceList.create({
      organization_id: orgA.id,
      name: `PriceList DH ${timestamp}`,
      currency: 'USD',
      effective_start: new Date(),
    });

    // Admin User for Org A
    const adminUserA = await User.create({
      email: `dhadmin_${timestamp}@dealflow.com`,
      password_hash: pwdHash,
      full_name: 'DH Admin A',
      is_active: true,
    });
    await OrganizationMembership.create({
      user_id: adminUserA.id,
      organization_id: orgA.id,
      role: 'admin',
      status: 'active',
    });
    const tokenA = jwt.sign({ sub: adminUserA.id }, JWT_SECRET, { expiresIn: '15m' });
    const headersA = { 'Authorization': `Bearer ${tokenA}`, 'x-organization-id': orgA.id };

    // Sales Rep User for Org A
    const repUserA = await User.create({
      email: `dhrep_${timestamp}@dealflow.com`,
      password_hash: pwdHash,
      full_name: 'DH Rep A',
      is_active: true,
    });
    await OrganizationMembership.create({
      user_id: repUserA.id,
      organization_id: orgA.id,
      role: 'sales_rep',
      status: 'active',
    });

    // Product
    const product = await Product.create({
      organization_id: orgA.id,
      sku: `SKU-DH-${timestamp}`,
      name: 'Deal Health Test Product',
      standard_unit_cost: 100.00,
      base_list_price: 200.00,
      category: 'hardware',
    });

    // ── Test Stream A: Stalled Deals (HLT14-04 to HLT14-07) ──
    const now = Date.now();
    const sixDaysAgo = new Date(now - 6 * 86400000);
    const fourDaysAgo = new Date(now - 4 * 86400000);

    const expDate = new Date(now + 30 * 86400000);

    // Q1: Inactive 6 days, stage: under_negotiation (Expected: STALLED)
    const quoteStalled = await Quotation.create({
      organization_id: orgA.id,
      customer_account_id: customerAccount.id,
      price_list_id: priceList.id,
      assigned_sales_rep_id: repUserA.id,
      quotation_number: `Q-STALL-${timestamp}`,
      stage: 'under_negotiation',
      grand_total: 5000.00,
      expiration_date: expDate,
    });
    // Set actual updated_at in the database to 6 days ago
    await sequelize.query(
      `UPDATE quotations SET updated_at = :stale WHERE id = :id`,
      { replacements: { stale: sixDaysAgo.toISOString(), id: quoteStalled.id } }
    );

    // Q2: Inactive 4 days, stage: draft (Expected: NOT STALLED)
    const quoteFresh = await Quotation.create({
      organization_id: orgA.id,
      customer_account_id: customerAccount.id,
      price_list_id: priceList.id,
      assigned_sales_rep_id: repUserA.id,
      quotation_number: `Q-FRESH-${timestamp}`,
      stage: 'draft',
      grand_total: 3000.00,
      expiration_date: expDate,
      updated_at: fourDaysAgo,
    });

    // Q3: Inactive 6 days, stage: confirmed (Expected: NOT STALLED due to stage)
    const quoteConfirmed = await Quotation.create({
      organization_id: orgA.id,
      customer_account_id: customerAccount.id,
      price_list_id: priceList.id,
      assigned_sales_rep_id: repUserA.id,
      quotation_number: `Q-CONF-${timestamp}`,
      stage: 'confirmed',
      grand_total: 8000.00,
      expiration_date: expDate,
      updated_at: sixDaysAgo,
    });

    // ── Test Stream B: Discount Anomaly (HLT14-12, HLT14-13) ──
    // Create baseline for rep: avg 7%, std dev 2%, completed deals: 25 (> 20), effective threshold: 10.00%
    await RepDiscountBaseline.create({
      organization_id: orgA.id,
      sales_rep_id: repUserA.id,
      completed_deal_count: 25,
      mean_discount_percentage: 7.00,
      std_dev_percentage: 2.00,
      effective_anomaly_threshold: 10.00,
    });

    // Q4: Quote with 24% discount (Expected: DISCOUNT ANOMALY)
    const quoteAnom = await Quotation.create({
      organization_id: orgA.id,
      customer_account_id: customerAccount.id,
      price_list_id: priceList.id,
      assigned_sales_rep_id: repUserA.id,
      quotation_number: `Q-ANOM-${timestamp}`,
      stage: 'draft',
      grand_total: 1000.00,
      expiration_date: expDate,
    });
    await QuotationLine.create({
      quotation_id: quoteAnom.id,
      product_id: product.id,
      line_number: 1,
      quantity: 5,
      unit_list_price: 200.00,
      unit_cost_price: 100.00,
      applied_discount_percentage: 24.00,
      effective_ceiling_limit: 15.00,
      line_excess_points: 9.00,
      is_over_limit: true,
      category: 'hardware',
      billing_cadence: 'one_time',
      unit_net_price: 152.00,
      line_gross_amount: 1000.00,
      line_net_amount: 760.00,
      line_cost_total: 500.00,
      line_margin_amount: 260.00,
      line_margin_percentage: 34.21,
    });

    // Q5: Quote with 9% discount (within normal variance <= 10.00%) (Expected: NO ANOMALY)
    const quoteNormal = await Quotation.create({
      organization_id: orgA.id,
      customer_account_id: customerAccount.id,
      price_list_id: priceList.id,
      assigned_sales_rep_id: repUserA.id,
      quotation_number: `Q-NORM-${timestamp}`,
      stage: 'draft',
      grand_total: 1000.00,
      expiration_date: expDate,
    });
    await QuotationLine.create({
      quotation_id: quoteNormal.id,
      product_id: product.id,
      line_number: 1,
      quantity: 5,
      unit_list_price: 200.00,
      unit_cost_price: 100.00,
      applied_discount_percentage: 9.00,
      effective_ceiling_limit: 15.00,
      line_excess_points: 0.00,
      is_over_limit: false,
      category: 'hardware',
      billing_cadence: 'one_time',
      unit_net_price: 182.00,
      line_gross_amount: 1000.00,
      line_net_amount: 910.00,
      line_cost_total: 500.00,
      line_margin_amount: 410.00,
      line_margin_percentage: 45.05,
    });

    // ── Test Stream C: Delivery Slippage (HLT14-18, HLT14-19) ──
    const warehouse = await Warehouse.create({
      organization_id: orgA.id,
      name: `WH-DH-${timestamp}`,
      code: `WH-${timestamp}`,
    });

    // Backorder for order with delivery far in future (e.g., 30 days)
    const quoteFulfillFar = await Quotation.create({
      organization_id: orgA.id,
      customer_account_id: customerAccount.id,
      price_list_id: priceList.id,
      assigned_sales_rep_id: repUserA.id,
      quotation_number: `Q-FO-FAR-${timestamp}`,
      stage: 'confirmed',
      grand_total: 2000.00,
      expiration_date: expDate,
    });
    const foLine = await QuotationLine.create({
      quotation_id: quoteFulfillFar.id,
      product_id: product.id,
      line_number: 1,
      quantity: 10,
      unit_list_price: 200.00,
      unit_cost_price: 100.00,
      applied_discount_percentage: 0.00,
      effective_ceiling_limit: 15.00,
      line_excess_points: 0.00,
      is_over_limit: false,
      category: 'hardware',
      billing_cadence: 'one_time',
      unit_net_price: 200.00,
      line_gross_amount: 2000.00,
      line_net_amount: 2000.00,
      line_cost_total: 1000.00,
      line_margin_amount: 1000.00,
      line_margin_percentage: 50.00,
    });

    const foFar = await FulfillmentOrder.create({
      organization_id: orgA.id,
      quotation_id: quoteFulfillFar.id,
      warehouse_id: warehouse.id,
      fulfillment_number: `FO-FAR-${timestamp}`,
      status: 'pending',
      estimated_delivery_date: new Date(now + 30 * 86400000), // 30 days out
    });
    await Backorder.create({
      organization_id: orgA.id,
      quotation_id: quoteFulfillFar.id,
      quotation_line_id: foLine.id,
      product_id: product.id,
      backorder_quantity: 4,
      target_warehouse_id: warehouse.id,
      status: 'open',
    });

    // ── 1. Execute Diagnostic Scan (HLT14-01) ──
    const scanRes = await api('/deal-health/scan', { method: 'POST', headers: headersA });
    record('HLT14-01', !!scanRes.scanned_at, `Diagnostic scan executed successfully: ${scanRes.alerts_created} alerts generated`);

    // ── Check Scan Idempotency / Duplicate Alert Generation ──
    const scanRes2 = await api('/deal-health/scan', { method: 'POST', headers: headersA });
    const isIdempotent = scanRes2.alerts_created === 0;
    record('HLT14-IDEMPOTENCY', isIdempotent, isIdempotent ? 'Scan is idempotent' : `Scan created ${scanRes2.alerts_created} DUPLICATE alerts on second run (lacks deduplication check)`);

    // ── Fetch Alerts (HLT14-03) ──
    const alertsRes = await api('/deal-health/alerts', { headers: headersA });
    const allAlerts = alertsRes;

    const stalledAlerts = allAlerts.filter(a => a.anomaly_type === 'stalled_deal');
    const discountAlerts = allAlerts.filter(a => a.anomaly_type === 'discount_anomaly');
    const slippageAlerts = allAlerts.filter(a => a.anomaly_type === 'delivery_slippage');

    console.log(`Alerts breakdown: Stalled=${stalledAlerts.length}, Discount=${discountAlerts.length}, Slippage=${slippageAlerts.length}`);

    // HLT14-04: Stalled deal detected
    const foundStalled = stalledAlerts.find(a => a.quotation_id === quoteStalled.id);
    record('HLT14-04', !!foundStalled, `Quote Q1 (inactive 6 days) detected as stalled: ${foundStalled?.title}`);

    // HLT14-05: Just-under-threshold excluded
    const foundFresh = stalledAlerts.find(a => a.quotation_id === quoteFresh.id);
    record('HLT14-05', !foundFresh, 'Quote Q2 (inactive 4 days) correctly excluded from stalled deals');

    // HLT14-07: Stage restriction: Confirmed quote not stalled
    const foundConfirmed = stalledAlerts.find(a => a.quotation_id === quoteConfirmed.id);
    record('HLT14-07', !foundConfirmed, 'Quote Q3 (confirmed stage) correctly excluded from stalled deals');

    // Check days_stale payload: does it report actual days inactive or hardcoded 5?
    const reportsActualDays = foundStalled && foundStalled.diagnostic_payload?.days_stale > 5;
    record('HLT14-STALE-PAYLOAD', reportsActualDays, `Diagnostic payload reports days_stale: ${foundStalled?.diagnostic_payload?.days_stale} (hardcoded 5 vs actual elapsed)`);

    // HLT14-12: Discount anomaly detected for 24% discount
    const foundAnom = discountAlerts.find(a => a.quotation_id === quoteAnom.id);
    record('HLT14-12', !!foundAnom, `Quote Q4 (24% discount) detected as discount anomaly: ${foundAnom?.title}`);

    // HLT14-13: Within-normal-variance (9%) excluded
    const foundNorm = discountAlerts.find(a => a.quotation_id === quoteNormal.id);
    record('HLT14-13', !foundNorm, 'Quote Q5 (9% discount within 10% threshold) correctly excluded from anomaly feed');

    // HLT14-18 & HLT14-19: Delivery slippage 48-hour deadline check
    // FO is 30 days in the future, yet had backorder. Does the backend flag it?
    const foundSlippageFar = slippageAlerts.find(a => a.fulfillment_order_id === foFar.id);
    const slippageRespects48h = !foundSlippageFar;
    record('HLT14-19', slippageRespects48h, slippageRespects48h
      ? 'Fulfillment 30 days out excluded from slippage alert'
      : 'Fulfillment 30 days out erroneously flagged as slippage risk (48-hour deadline is ignored in query)');

    // ── Test Actions: Send Nudge (HLT14-09, HLT14-23) ──
    if (foundStalled) {
      const nudgeRes = await api('/deal-health/send-nudge', {
        method: 'POST',
        headers: headersA,
        body: { alert_id: foundStalled.id },
      });
      const updatedAlert = await DealHealthAlert.findByPk(foundStalled.id);
      const isAck = updatedAlert.resolution_status === 'acknowledged';
      record('HLT14-23', isAck, `Send nudge updated alert resolution_status to '${updatedAlert.resolution_status}'`);
    }

    // ── Test Actions: Escalate to Finance / Re-route to Approval (HLT14-16) ──
    if (foundAnom) {
      const escRes = await api('/deal-health/escalate-to-finance', {
        method: 'POST',
        headers: headersA,
        body: { alert_id: foundAnom.id },
      });
      const updatedAnomAlert = await DealHealthAlert.findByPk(foundAnom.id);
      const isEsc = updatedAnomAlert.resolution_status === 'escalated';

      // Check if quotation actually routed to finance approval queue (Screen 5/6)
      const refreshedQuoteAnom = await Quotation.findByPk(quoteAnom.id);
      const routedToApproval = refreshedQuoteAnom.stage === 'pending_approval';
      record('HLT14-16', routedToApproval, `Re-route to Finance Approval: Alert marked '${updatedAnomAlert.resolution_status}', Quotation stage=${refreshedQuoteAnom.stage} (expected pending_approval)`);
    }

    // ── Check Threshold Configuration Endpoint (HLT14-02) ──
    try {
      await api('/deal-health/thresholds', { headers: headersA });
      record('HLT14-02', true, 'Thresholds configuration endpoint exists');
    } catch (err) {
      record('HLT14-02', false, `Thresholds configuration endpoint missing: ${err.message}`);
    }

    // ── Test Multi-Tenant Isolation (HLT14-NFR3) ──
    // Admin for Org B
    const adminUserB = await User.create({
      email: `dhadminb_${timestamp}@dealflow.com`,
      password_hash: pwdHash,
      full_name: 'DH Admin B',
      is_active: true,
    });
    await OrganizationMembership.create({
      user_id: adminUserB.id,
      organization_id: orgB.id,
      role: 'admin',
      status: 'active',
    });
    const tokenB = jwt.sign({ sub: adminUserB.id }, JWT_SECRET, { expiresIn: '15m' });
    const headersB = { 'Authorization': `Bearer ${tokenB}`, 'x-organization-id': orgB.id };

    const alertsB = await api('/deal-health/alerts', { headers: headersB });
    const leakedAlert = alertsB.some(bAlert => allAlerts.some(aAlert => aAlert.id === bAlert.id));
    record('HLT14-NFR3', !leakedAlert, `Multi-tenant isolation verified: Org B sees 0 of Org A's ${allAlerts.length} alerts`);

    console.log('\n--- Summary of Test Results ---');
    results.forEach(r => console.log(`${r.testId}: ${r.passed ? 'PASS' : 'FAIL'} - ${r.message}`));

  } catch (err) {
    console.error('Test execution error:', err.stack, err.data || err);
  } finally {
    process.exit(0);
  }
}

runTests();
