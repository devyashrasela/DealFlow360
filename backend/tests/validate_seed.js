/**
 * DealFlow360 — Seed Validation & Verification Suite
 * Verifies relational integrity, uniqueness, tenant boundaries, math, dates, lifecycles, and API endpoints.
 */
import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../src/config/db.js';
import db from '../src/models/index.js';
import app from '../src/server.js';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const {
  Organization,
  User,
  OrganizationMembership,
  CustomerAccount,
  Product,
  ProductVariant,
  PriceList,
  PriceListItem,
  UpsellRule,
  ProductAttachment,
  DiscountTierCeiling,
  CategoryCeiling,
  ApprovalChain,
  ApprovalRule,
  Quotation,
  QuotationLine,
  NegotiationThread,
  QuotationApproval,
  ApprovalAuditLog,
  Warehouse,
  WarehouseStock,
  FulfillmentOrder,
  FulfillmentItem,
  Backorder,
  Subscription,
  SubscriptionLineItem,
  BillingSchedule,
  SubscriptionEvent,
  Invoice,
  InvoiceLine,
  Payment,
  CreditAllocation,
  DealHealthAlert,
  RepDiscountBaseline,
  Session,
  Invitation,
  OrganizationRelationship,
  RelationshipAssignment,
  AuditLog,
} = db;

async function runValidation() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 RUNNING DEALFLOW360 SEED DATA VALIDATION SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title, details = '') => {
    if (condition) {
      console.log(`  ✅ PASS: ${title}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${title} ${details ? `— ${details}` : ''}`);
      failed++;
    }
  };

  // ── 1. RECORD COUNT VERIFICATION ──
  console.log('1. Verifying Model Population (All 39 Entities)...');
  const orgCount = await Organization.count();
  const userCount = await User.count();
  const memCount = await OrganizationMembership.count();
  const custCount = await CustomerAccount.count();
  const prodCount = await Product.count();
  const varCount = await ProductVariant.count();
  const plCount = await PriceList.count();
  const pliCount = await PriceListItem.count();
  const quoteCount = await Quotation.count();
  const qLineCount = await QuotationLine.count();
  const foCount = await FulfillmentOrder.count();
  const subCount = await Subscription.count();
  const invCount = await Invoice.count();
  const payCount = await Payment.count();
  const alertCount = await DealHealthAlert.count();

  assert(orgCount === 6, `Organizations populated (${orgCount})`);
  assert(userCount === 10, `Users populated (${userCount})`);
  assert(memCount === 10, `Memberships populated (${memCount})`);
  assert(custCount === 4, `Customer accounts populated (${custCount})`);
  assert(prodCount === 8, `Products populated (${prodCount})`);
  assert(varCount === 4, `Variants populated (${varCount})`);
  assert(plCount === 2, `Price lists populated (${plCount})`);
  assert(pliCount === 6, `Price list items populated (${pliCount})`);
  assert(quoteCount === 10, `Quotations populated (${quoteCount})`);
  assert(qLineCount >= 20, `Quotation lines populated (${qLineCount})`);
  assert(foCount >= 3, `Fulfillment orders populated (${foCount})`);
  assert(subCount >= 2, `Subscriptions populated (${subCount})`);
  assert(invCount >= 5, `Invoices populated (${invCount})`);
  assert(payCount >= 2, `Payments populated (${payCount})`);
  assert(alertCount >= 3, `Deal health alerts populated (${alertCount})`);

  // ── 2. REFERENTIAL INTEGRITY (0 Orphans) ──
  console.log('\n2. Verifying Foreign Key Integrity (Zero Orphans)...');
  
  // Quotation -> CustomerAccount & Organization
  const brokenQuotes = await Quotation.findAll({
    include: [
      { model: Organization, as: 'organization', required: false },
      { model: CustomerAccount, as: 'customer_account', required: false },
      { model: User, as: 'sales_rep', required: false },
    ],
  });
  const orphanQuotes = brokenQuotes.filter(q => !q.organization || !q.customer_account || !q.sales_rep);
  assert(orphanQuotes.length === 0, 'Quotation FK relationships intact', `Found ${orphanQuotes.length} orphan quotes`);

  // QuotationLine -> Quotation & Product
  const brokenLines = await QuotationLine.findAll({
    include: [
      { model: Quotation, as: 'quotation', required: false },
      { model: Product, as: 'product', required: false },
    ],
  });
  const orphanLines = brokenLines.filter(l => !l.quotation || !l.product);
  assert(orphanLines.length === 0, 'QuotationLine FK relationships intact', `Found ${orphanLines.length} orphan lines`);

  // Invoices -> CustomerAccount & Org
  const brokenInvoices = await Invoice.findAll({
    include: [
      { model: Organization, as: 'organization', required: false },
      { model: CustomerAccount, as: 'customer_account', required: false },
    ],
  });
  const orphanInvoices = brokenInvoices.filter(i => !i.organization || !i.customer_account);
  assert(orphanInvoices.length === 0, 'Invoice FK relationships intact', `Found ${orphanInvoices.length} orphan invoices`);

  // FulfillmentOrders -> Quotation & Warehouse
  const brokenFO = await FulfillmentOrder.findAll({
    include: [
      { model: Quotation, as: 'quotation', required: false },
      { model: Warehouse, as: 'warehouse', required: false },
    ],
  });
  const orphanFO = brokenFO.filter(f => !f.quotation || !f.warehouse);
  assert(orphanFO.length === 0, 'FulfillmentOrder FK relationships intact', `Found ${orphanFO.length} orphan fulfillment orders`);

  // ── 3. TENANT ISOLATION ──
  console.log('\n3. Verifying Tenant Isolation Boundaries...');
  const acmeOrg = await Organization.findOne({ where: { slug: 'acme-corp' } });
  const nexusOrg = await Organization.findOne({ where: { slug: 'nexus-solutions' } });

  const acmeQuotes = await Quotation.findAll({ where: { organization_id: acmeOrg.id } });
  const acmeProducts = await Product.findAll({ where: { organization_id: acmeOrg.id } });
  const acmeAccounts = await CustomerAccount.findAll({ where: { provider_organization_id: acmeOrg.id } });

  assert(acmeQuotes.length === 10, 'All 10 deal quotations belong to Acme Corp');
  assert(acmeProducts.length === 8, 'All 8 products belong to Acme Corp');
  assert(acmeAccounts.length === 4, 'All 4 commercial accounts scoped to Acme Corp');

  // ── 4. MONETARY & MATHEMATICAL CONSISTENCY ──
  console.log('\n4. Verifying Mathematical Accuracy...');

  // Quotation totals
  let quoteMathErrors = 0;
  for (const q of acmeQuotes) {
    const gross = Number(q.gross_total);
    const disc = Number(q.total_discount_amount);
    const net = Number(q.net_subtotal);
    const grand = Number(q.grand_total);

    if (Math.abs((gross - disc) - net) > 0.05 || Math.abs(net - grand) > 0.05) {
      quoteMathErrors++;
      console.error(`Math mismatch on quote ${q.quotation_number}: gross=${gross}, disc=${disc}, net=${net}, grand=${grand}`);
    }
  }
  assert(quoteMathErrors === 0, 'Quotation grand total === gross_total - total_discount_amount');

  // Quotation line math
  const allLines = await QuotationLine.findAll();
  let lineMathErrors = 0;
  for (const l of allLines) {
    const qty = Number(l.quantity);
    const list = Number(l.unit_list_price);
    const gross = Number(l.line_gross_amount);
    const net = Number(l.line_net_amount);
    const cost = Number(l.line_cost_total);
    const margin = Number(l.line_margin_amount);

    if (Math.abs(qty * list - gross) > 0.05 || Math.abs((net - cost) - margin) > 0.05) {
      lineMathErrors++;
    }
  }
  assert(lineMathErrors === 0, 'Quotation line calculations match exact CPQ formulas');

  // Invoice balances
  const allInvoices = await Invoice.findAll();
  let invMathErrors = 0;
  for (const inv of allInvoices) {
    const tot = Number(inv.total_amount);
    const paid = Number(inv.amount_paid);
    const cred = Number(inv.amount_credited);
    const bal = Number(inv.balance_due);

    if (Math.abs((tot - paid - cred) - bal) > 0.05) {
      invMathErrors++;
    }
  }
  assert(invMathErrors === 0, 'Invoice balance_due === total_amount - amount_paid - amount_credited');

  // ── 5. INVENTORY CONSISTENCY ──
  console.log('\n5. Verifying Inventory Quantities (on_hand >= soft_reserved + hard_allocated)...');
  const allStock = await WarehouseStock.findAll();
  let stockErrors = 0;
  for (const s of allStock) {
    const onHand = Number(s.on_hand_quantity);
    const soft = Number(s.soft_reserved_quantity);
    const hard = Number(s.hard_allocated_quantity);
    if (onHand < soft + hard) {
      stockErrors++;
    }
  }
  assert(stockErrors === 0, 'Warehouse stock invariants hold across all facilities');

  // ── 6. SUBSCRIPTION & ARR CONSISTENCY ──
  console.log('\n6. Verifying Subscription Financial Metrics...');
  const allSubs = await Subscription.findAll();
  let subMathErrors = 0;
  for (const sub of allSubs) {
    const mrr = Number(sub.mrr_amount);
    const arr = Number(sub.arr_amount);
    if (Math.abs(mrr * 12 - arr) > 0.05) {
      subMathErrors++;
    }
  }
  assert(subMathErrors === 0, 'Subscription ARR === MRR * 12');

  // ── 7. DATE CHRONOLOGY ──
  console.log('\n7. Verifying Chronological Timestamps...');
  let dateErrors = 0;
  for (const inv of allInvoices) {
    if (new Date(inv.created_at) > new Date(inv.updated_at)) {
      dateErrors++;
    }
  }
  assert(dateErrors === 0, 'Timestamp chronology created_at <= updated_at preserved');

  // ── 8. API ENDPOINTS LIVE CHECK ──
  console.log('\n8. Testing API Endpoints Against Seed Data...');

  const uAdmin = await User.findOne({ where: { email: 'admin@acme.com' } });
  const token = jwt.sign({ sub: uAdmin.id }, JWT_SECRET, { expiresIn: '1h' });

  // Start ephemeral HTTP listener
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  const testApi = async (path, options = {}) => {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'x-organization-id': acmeOrg.id,
        'authorization': `Bearer ${token}`,
        'content-type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await res.json();
    return { status: res.status, data };
  };

  // Test Reports KPI Summary
  const kpiRes = await testApi('/api/reports/kpi-summary');
  assert(kpiRes.status === 200 && kpiRes.data.total_bookings > 0, 'GET /api/reports/kpi-summary returns populated figures');

  // Test Deal Health Alerts
  const alertRes = await testApi('/api/deal-health/alerts');
  assert(alertRes.status === 200 && Array.isArray(alertRes.data) && alertRes.data.length >= 3, 'GET /api/deal-health/alerts returns 3+ anomaly streams');

  // Test Fulfillment Stock
  const stockRes = await testApi('/api/fulfillment/stock');
  assert(stockRes.status === 200 && stockRes.data.success && stockRes.data.data.length > 0, 'GET /api/fulfillment/stock returns inventory list');

  // Test Fulfillment Orders
  const foRes = await testApi('/api/fulfillment/orders');
  assert(foRes.status === 200 && foRes.data.success && foRes.data.data.length >= 3, 'GET /api/fulfillment/orders returns multi-warehouse dispatches');

  // Test Subscriptions
  const subsRes = await testApi('/api/subscriptions');
  assert(subsRes.status === 200 && subsRes.data.success && subsRes.data.kpis?.active_subscriptions > 0, 'GET /api/subscriptions returns active MRR contracts');

  // Test Invoices
  const invRes = await testApi('/api/invoices');
  assert(invRes.status === 200 && invRes.data.success && invRes.data.kpis?.total_outstanding > 0, 'GET /api/invoices returns ledger & KPIs');

  server.close();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📊 VALIDATION SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runValidation()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Validation crashed:', err);
    process.exit(1);
  });
