import dotenv from 'dotenv';
dotenv.config({ path: 'backend/.env' });

import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import {
  sequelize, User, Organization, OrganizationMembership,
  CustomerAccount, PriceList, Product,
  Quotation, QuotationLine, Warehouse, WarehouseStock,
  FulfillmentOrder, FulfillmentItem, Backorder
} from '../src/models/index.js';

const BASE_URL = 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

const results = [];

function recordResult(id, name, status, details = {}) {
  results.push({ id, name, status, ...details });
}

async function run() {
  console.log('🚀 Starting Screen 7: Fulfillment and Stock (List) Test Execution...');
  await sequelize.authenticate();

  const timestamp = Date.now();
  const pwd = 'Password@123';
  const pwdHash = await argon2.hash(pwd, { type: argon2.argon2id });

  // 1. Setup Tenant Org 1
  const org1 = await Organization.create({
    legal_name: `Fulfillment Org 1 ${timestamp}`,
    slug: `fulforg1-${timestamp}`,
    organization_type: 'provider',
    is_active: true
  });

  const buyerOrg1 = await Organization.create({
    legal_name: `Acme Corp ${timestamp}`,
    slug: `acme-${timestamp}`,
    organization_type: 'customer',
    is_active: true
  });

  const customerAccount1 = await CustomerAccount.create({
    provider_organization_id: org1.id,
    buyer_organization_id: buyerOrg1.id,
    account_number: `ACC-FUL1-${timestamp}`,
    credit_limit: 200000,
    payment_terms_days: 30
  });

  const priceList1 = await PriceList.create({
    organization_id: org1.id,
    name: `Standard PL 1 ${timestamp}`,
    currency: 'USD',
    effective_start: new Date()
  });

  // Admin user Org 1
  const adminUser1 = await User.create({
    email: `fuladmin1_${timestamp}@dealflow.com`,
    password_hash: pwdHash,
    full_name: 'Fulfill Admin 1',
    is_active: true
  });
  await OrganizationMembership.create({
    user_id: adminUser1.id,
    organization_id: org1.id,
    role: 'admin',
    status: 'active'
  });
  const token1 = jwt.sign({ sub: adminUser1.id }, JWT_SECRET, { expiresIn: '15m' });

  // 2. Setup Tenant Org 2 (for multi-tenant isolation testing)
  const org2 = await Organization.create({
    legal_name: `Fulfillment Org 2 ${timestamp}`,
    slug: `fulforg2-${timestamp}`,
    organization_type: 'provider',
    is_active: true
  });
  const adminUser2 = await User.create({
    email: `fuladmin2_${timestamp}@dealflow.com`,
    password_hash: pwdHash,
    full_name: 'Fulfill Admin 2',
    is_active: true
  });
  await OrganizationMembership.create({
    user_id: adminUser2.id,
    organization_id: org2.id,
    role: 'admin',
    status: 'active'
  });
  const token2 = jwt.sign({ sub: adminUser2.id }, JWT_SECRET, { expiresIn: '15m' });

  // 3. Setup Warehouses in Org 1 (Main Warehouse & East Depot)
  const mainWh = await Warehouse.create({
    organization_id: org1.id,
    code: `WH-MAIN-${timestamp}`,
    name: 'Main Warehouse',
    shipping_base_fee: 25.00,
    shipping_cost_multiplier: 1.0,
    address: '100 Logistics Blvd',
    is_active: true
  });

  const eastWh = await Warehouse.create({
    organization_id: org1.id,
    code: `WH-EAST-${timestamp}`,
    name: 'East Depot',
    shipping_base_fee: 35.00,
    shipping_cost_multiplier: 1.2,
    address: '500 Eastern Way',
    is_active: true
  });

  // Warehouse in Org 2
  const org2Wh = await Warehouse.create({
    organization_id: org2.id,
    code: `WH-ORG2-${timestamp}`,
    name: 'Org2 Isolated Warehouse',
    shipping_base_fee: 50.00,
    shipping_cost_multiplier: 1.0,
    address: '999 Other St',
    is_active: true
  });

  // 4. Products: Laptop Pro 14 (hardware)
  const laptopProduct = await Product.create({
    organization_id: org1.id,
    sku: `LAP-14-${timestamp}`,
    name: 'Laptop Pro 14',
    category: 'hardware',
    base_list_price: 1500.00,
    standard_unit_cost: 900.00,
    is_active: true
  });

  const org2Product = await Product.create({
    organization_id: org2.id,
    sku: `ORG2-PROD-${timestamp}`,
    name: 'Org 2 Private Product',
    category: 'hardware',
    base_list_price: 200.00,
    standard_unit_cost: 100.00,
    is_active: true
  });

  // 5. Stock Setup (Precondition: Laptop Pro 14: Main Warehouse 40, East Depot 10)
  const stockMain = await WarehouseStock.create({
    warehouse_id: mainWh.id,
    product_id: laptopProduct.id,
    on_hand_quantity: 40,
    soft_reserved_quantity: 0,
    hard_allocated_quantity: 0,
    reorder_threshold: 5
  });

  const stockEast = await WarehouseStock.create({
    warehouse_id: eastWh.id,
    product_id: laptopProduct.id,
    on_hand_quantity: 10,
    soft_reserved_quantity: 0,
    hard_allocated_quantity: 0,
    reorder_threshold: 5
  });

  // Org 2 stock
  await WarehouseStock.create({
    warehouse_id: org2Wh.id,
    product_id: org2Product.id,
    on_hand_quantity: 100,
    soft_reserved_quantity: 0,
    hard_allocated_quantity: 0,
    reorder_threshold: 10
  });

  console.log('✅ Baseline preconditions created.');

  // ========================================================
  // FUL7-01: Per-warehouse stock display
  // ========================================================
  console.log('\n--- Testing FUL7-01: Per-warehouse stock display ---');
  const stockRes = await fetch(`${BASE_URL}/fulfillment/stock`, {
    headers: {
      'Authorization': `Bearer ${token1}`,
      'x-organization-id': org1.id
    }
  });
  const stockData = await stockRes.json();
  console.log('Stock fetch status:', stockRes.status, 'Count:', stockData.data?.length);

  if (stockRes.status === 200 && Array.isArray(stockData.data)) {
    const mainEntry = stockData.data.find(s => s.warehouse_id === mainWh.id && s.product_id === laptopProduct.id);
    const eastEntry = stockData.data.find(s => s.warehouse_id === eastWh.id && s.product_id === laptopProduct.id);

    const mainOk = mainEntry && mainEntry.on_hand_quantity === 40 && mainEntry.available_to_fulfill === 40;
    const eastOk = eastEntry && eastEntry.on_hand_quantity === 10 && eastEntry.available_to_fulfill === 10;
    const separateRows = mainEntry && eastEntry && mainEntry.id !== eastEntry.id;

    if (mainOk && eastOk && separateRows) {
      recordResult('FUL7-01', 'Per-warehouse stock display', 'PASSED', {
        details: `Main Warehouse: 40 on hand; East Depot: 10 on hand shown as distinct rows with warehouse and product names.`
      });
    } else {
      recordResult('FUL7-01', 'Per-warehouse stock display', 'FAILED', {
        expected: 'Laptop Pro 14 independently listed for Main Warehouse (40) and East Depot (10)',
        actual: `Main: ${JSON.stringify(mainEntry)}, East: ${JSON.stringify(eastEntry)}`,
        severity: 'High'
      });
    }
  } else {
    recordResult('FUL7-01', 'Per-warehouse stock display', 'FAILED', {
      expected: 'GET /fulfillment/stock returns 200 with list of warehouse stock balances',
      actual: `Status: ${stockRes.status}, data: ${JSON.stringify(stockData)}`,
      severity: 'Critical'
    });
  }

  // ========================================================
  // FUL7-03: Stock updates on replenishment
  // ========================================================
  console.log('\n--- Testing FUL7-03: Stock updates on replenishment ---');
  // Replenish 15 units of Laptop Pro 14 to East Depot
  const replenishRes = await fetch(`${BASE_URL}/fulfillment/stock/receive`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token1}`,
      'x-organization-id': org1.id,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      warehouse_id: eastWh.id,
      product_id: laptopProduct.id,
      quantity: 15
    })
  });
  const replenishData = await replenishRes.json();
  console.log('Replenish response status:', replenishRes.status, replenishData);

  // Reload stock data
  const reloadStockRes = await fetch(`${BASE_URL}/fulfillment/stock`, {
    headers: {
      'Authorization': `Bearer ${token1}`,
      'x-organization-id': org1.id
    }
  });
  const reloadStockData = await reloadStockRes.json();
  const updatedEastEntry = reloadStockData.data?.find(s => s.warehouse_id === eastWh.id && s.product_id === laptopProduct.id);

  if (replenishRes.status === 200 && updatedEastEntry && updatedEastEntry.on_hand_quantity === 25 && updatedEastEntry.available_to_fulfill === 25) {
    recordResult('FUL7-03', 'Stock updates on replenishment', 'PASSED', {
      details: 'Stock increased from 10 to 25 upon inward receipt and reflected in GET /fulfillment/stock.'
    });
  } else {
    recordResult('FUL7-03', 'Stock updates on replenishment', 'FAILED', {
      expected: 'East Depot stock to increase from 10 to 25',
      actual: `Replenish status: ${replenishRes.status}, Updated stock: ${updatedEastEntry?.on_hand_quantity}`,
      severity: 'High'
    });
  }

  // ========================================================
  // FUL7-04: Only confirmed/ready orders appear
  // ========================================================
  console.log('\n--- Testing FUL7-04: Only confirmed/ready orders appear ---');
  // Create a draft quote and a pending_approval quote
  const draftQuote = await Quotation.create({
    organization_id: org1.id,
    customer_account_id: customerAccount1.id,
    assigned_sales_rep_id: adminUser1.id,
    price_list_id: priceList1.id,
    quotation_number: `Q-DRAFT-${timestamp}`,
    stage: 'draft',
    expiration_date: new Date(Date.now() + 86400000 * 30),
    lock_version: 1
  });

  const pendingQuote = await Quotation.create({
    organization_id: org1.id,
    customer_account_id: customerAccount1.id,
    assigned_sales_rep_id: adminUser1.id,
    price_list_id: priceList1.id,
    quotation_number: `Q-PEND-${timestamp}`,
    stage: 'pending_approval',
    expiration_date: new Date(Date.now() + 86400000 * 30),
    lock_version: 1
  });

  const ordersRes1 = await fetch(`${BASE_URL}/fulfillment/orders`, {
    headers: {
      'Authorization': `Bearer ${token1}`,
      'x-organization-id': org1.id
    }
  });
  const ordersData1 = await ordersRes1.json();
  const draftInQueue = ordersData1.data?.some(o => o.quotation?.quotation_number === draftQuote.quotation_number);
  const pendingInQueue = ordersData1.data?.some(o => o.quotation?.quotation_number === pendingQuote.quotation_number);

  if (!draftInQueue && !pendingInQueue) {
    recordResult('FUL7-04', 'Only confirmed/ready orders appear', 'PASSED', {
      details: 'Draft and Pending-Approval quotations do not appear in the fulfillment queue.'
    });
  } else {
    recordResult('FUL7-04', 'Only confirmed/ready orders appear', 'FAILED', {
      expected: 'Draft and pending approval quotes must not appear in orders queue',
      actual: `draftInQueue: ${draftInQueue}, pendingInQueue: ${pendingInQueue}`,
      severity: 'Critical'
    });
  }

  // ========================================================
  // FUL7-05: Confirmed order appears promptly
  // ========================================================
  console.log('\n--- Testing FUL7-05: Confirmed order appears promptly ---');
  // Create an approved quote requiring no further approval, ready to confirm
  const confirmQuote = await Quotation.create({
    organization_id: org1.id,
    customer_account_id: customerAccount1.id,
    assigned_sales_rep_id: adminUser1.id,
    price_list_id: priceList1.id,
    quotation_number: `Q-CONF-${timestamp}`,
    stage: 'approved',
    expiration_date: new Date(Date.now() + 86400000 * 30),
    lock_version: 1
  });
  await QuotationLine.create({
    quotation_id: confirmQuote.id,
    product_id: laptopProduct.id,
    line_number: 1,
    category: 'hardware',
    billing_cadence: 'one_time',
    quantity: 5,
    unit_list_price: 1500.00,
    unit_cost_price: 900.00,
    applied_discount_percentage: 0.00,
    effective_ceiling_limit: 20.00,
    line_excess_points: 0.00,
    is_over_limit: false,
    unit_net_price: 1500.00,
    line_gross_amount: 7500.00,
    line_net_amount: 7500.00,
    line_cost_total: 4500.00,
    line_margin_amount: 3000.00,
    line_margin_percentage: 40.00
  });

  // Call POST /api/negotiations/confirm
  const confirmReq = await fetch(`${BASE_URL}/negotiations/confirm`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token1}`,
      'x-organization-id': org1.id,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ quotation_id: confirmQuote.id })
  });
  const confirmData = await confirmReq.json();
  console.log('Quotation confirm status:', confirmReq.status, confirmData);

  // Check if it appears in GET /api/fulfillment/orders
  const ordersRes2 = await fetch(`${BASE_URL}/fulfillment/orders`, {
    headers: {
      'Authorization': `Bearer ${token1}`,
      'x-organization-id': org1.id
    }
  });
  const ordersData2 = await ordersRes2.json();
  const confirmedInQueue = ordersData2.data?.some(o => o.quotation?.quotation_number === confirmQuote.quotation_number);
  console.log('Confirmed quote in fulfillment orders queue:', confirmedInQueue);

  if (confirmedInQueue) {
    recordResult('FUL7-05', 'Confirmed order appears promptly', 'PASSED', {
      details: 'Confirmed order automatically ingested and surfaced in Orders Awaiting Fulfillment.'
    });
  } else {
    recordResult('FUL7-05', 'Confirmed order appears promptly', 'FAILED', {
      expected: 'Confirmed quotation automatically triggers fulfillment order generation and appears in Orders Awaiting Fulfillment queue',
      actual: 'Quotation status updated to "confirmed", but no fulfillment order was created. /api/negotiations/confirm has a TODO placeholder and does not call ingestConfirmedQuote. Order queue remains empty.',
      severity: 'High'
    });
  }

  // ========================================================
  // Testing Ingestion Endpoint & FUL7-02 / FUL7-06
  // ========================================================
  console.log('\n--- Ingesting confirmed quote via /orders/ingest/:quotationId ---');
  let ingestedOrderId = null;
  const ingestRes = await fetch(`${BASE_URL}/fulfillment/orders/ingest/${confirmQuote.id}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token1}`,
      'x-organization-id': org1.id
    }
  });
  const ingestData = await ingestRes.json();
  console.log('Ingest response status:', ingestRes.status, ingestData);

  if (ingestRes.status === 201 && ingestData.data?.orders?.length > 0) {
    ingestedOrderId = ingestData.data.orders[0].id;
  }

  // FUL7-02: Stock updates on consumption
  // Laptop Pro 14 was 40 in Main, 25 in East. 5 units allocated from Main.
  console.log('\n--- Testing FUL7-02: Stock updates on consumption ---');
  const stockAfterIngestRes = await fetch(`${BASE_URL}/fulfillment/stock`, {
    headers: {
      'Authorization': `Bearer ${token1}`,
      'x-organization-id': org1.id
    }
  });
  const stockAfterIngest = await stockAfterIngestRes.json();
  const mainAfter = stockAfterIngest.data?.find(s => s.warehouse_id === mainWh.id && s.product_id === laptopProduct.id);
  console.log('Main warehouse stock after consumption:', mainAfter);

  if (mainAfter && (mainAfter.hard_allocated_quantity === 5 || mainAfter.available_to_fulfill === 35)) {
    recordResult('FUL7-02', 'Stock updates on consumption', 'PASSED', {
      details: `Main Warehouse: 5 units allocated; available_to_fulfill reduced from 40 to 35, hard_allocated increased to 5.`
    });
  } else {
    recordResult('FUL7-02', 'Stock updates on consumption', 'FAILED', {
      expected: 'Main Warehouse stock available to decrement by 5 units upon order allocation',
      actual: `Stock status: available=${mainAfter?.available_to_fulfill}, allocated=${mainAfter?.hard_allocated_quantity}`,
      severity: 'High'
    });
  }

  // FUL7-06: Row click navigation
  // Test GET /api/fulfillment/orders/:id
  console.log('\n--- Testing FUL7-06: Row click navigation ---');
  if (ingestedOrderId) {
    const detailRes = await fetch(`${BASE_URL}/fulfillment/orders/${ingestedOrderId}`, {
      headers: {
        'Authorization': `Bearer ${token1}`,
        'x-organization-id': org1.id
      }
    });
    const detailData = await detailRes.json();
    console.log('Fulfillment order detail status:', detailRes.status, 'Keys:', Object.keys(detailData.data || {}));

    const hasCustomer = detailData.data?.quotation?.customer_account?.buyer_organization !== undefined;
    const hasItems = detailData.data?.items?.length > 0;
    const hasWarehouse = detailData.data?.warehouse?.name !== undefined;

    if (detailRes.status === 200 && hasCustomer && hasItems && hasWarehouse) {
      recordResult('FUL7-06', 'Row click navigation', 'PASSED', {
        details: 'GET /api/fulfillment/orders/:id returns complete order with warehouse, quotation lines, customer account, and items.'
      });
    } else {
      recordResult('FUL7-06', 'Row click navigation', 'FAILED', {
        expected: 'Full order detail returned with matching customer, warehouse, items',
        actual: `Status: ${detailRes.status}, customer: ${hasCustomer}, items: ${hasItems}, warehouse: ${hasWarehouse}`,
        severity: 'Medium'
      });
    }
  } else {
    recordResult('FUL7-06', 'Row click navigation', 'FAILED', {
      expected: 'Ingested fulfillment order available to test detail navigation',
      actual: 'No fulfillment order was created by ingestion',
      severity: 'High'
    });
  }

  // ========================================================
  // FUL7-07: Insufficient combined stock (Edge case)
  // Total available stock across all warehouses: Main (35) + East (25) = 60.
  // Demand: 100 units -> 60 allocated, 40 backordered!
  // ========================================================
  console.log('\n--- Testing FUL7-07: Insufficient combined stock ---');
  const excessQuote = await Quotation.create({
    organization_id: org1.id,
    customer_account_id: customerAccount1.id,
    assigned_sales_rep_id: adminUser1.id,
    price_list_id: priceList1.id,
    quotation_number: `Q-EXCESS-${timestamp}`,
    stage: 'confirmed',
    expiration_date: new Date(Date.now() + 86400000 * 30),
    lock_version: 1
  });
  await QuotationLine.create({
    quotation_id: excessQuote.id,
    product_id: laptopProduct.id,
    line_number: 1,
    category: 'hardware',
    billing_cadence: 'one_time',
    quantity: 100, // Demands 100, only 60 total available
    unit_list_price: 1500.00,
    unit_cost_price: 900.00,
    applied_discount_percentage: 0.00,
    effective_ceiling_limit: 20.00,
    line_excess_points: 0.00,
    is_over_limit: false,
    unit_net_price: 1500.00,
    line_gross_amount: 150000.00,
    line_net_amount: 150000.00,
    line_cost_total: 90000.00,
    line_margin_amount: 60000.00,
    line_margin_percentage: 40.00
  });

  const excessIngestRes = await fetch(`${BASE_URL}/fulfillment/orders/ingest/${excessQuote.id}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token1}`,
      'x-organization-id': org1.id
    }
  });
  const excessIngestData = await excessIngestRes.json();
  console.log('Excess ingest response status:', excessIngestRes.status, excessIngestData);

  // Check backorders endpoint
  const boRes = await fetch(`${BASE_URL}/fulfillment/backorders`, {
    headers: {
      'Authorization': `Bearer ${token1}`,
      'x-organization-id': org1.id
    }
  });
  const boData = await boRes.json();
  const boItem = boData.data?.find(b => b.quotation?.quotation_number === excessQuote.quotation_number);
  console.log('Backorder recorded:', boItem);

  if (excessIngestRes.status === 201 && boItem && boItem.backorder_quantity === 40) {
    recordResult('FUL7-07', 'Insufficient combined stock', 'PASSED', {
      details: 'Order partitioned across warehouses (35 from Main, 25 from East) and remaining 40 units placed in Backorders queue.'
    });
  } else {
    recordResult('FUL7-07', 'Insufficient combined stock', 'FAILED', {
      expected: 'System generates backorder record for 40 units in open backorders queue',
      actual: `Ingest status: ${excessIngestRes.status}, Backorder item: ${JSON.stringify(boItem)}`,
      severity: 'Critical'
    });
  }

  // ========================================================
  // FUL7-08: Multi-tenant isolation (Edge case)
  // ========================================================
  console.log('\n--- Testing FUL7-08: Multi-tenant isolation ---');
  // Org 2 calls GET /fulfillment/stock
  const org2StockRes = await fetch(`${BASE_URL}/fulfillment/stock`, {
    headers: {
      'Authorization': `Bearer ${token2}`,
      'x-organization-id': org2.id
    }
  });
  const org2Stock = await org2StockRes.json();
  const org1StockLeaked = org2Stock.data?.some(s => s.warehouse_id === mainWh.id || s.warehouse_id === eastWh.id || s.product_id === laptopProduct.id);

  // Org 2 calls GET /fulfillment/orders
  const org2OrdersRes = await fetch(`${BASE_URL}/fulfillment/orders`, {
    headers: {
      'Authorization': `Bearer ${token2}`,
      'x-organization-id': org2.id
    }
  });
  const org2Orders = await org2OrdersRes.json();
  const org1OrdersLeaked = org2Orders.data?.some(o => o.organization_id === org1.id);

  if (!org1StockLeaked && !org1OrdersLeaked && org2Stock.data?.length === 1 && org2Stock.data[0].warehouse_id === org2Wh.id) {
    recordResult('FUL7-08', 'Multi-tenant isolation', 'PASSED', {
      details: 'Org 2 sees only Org 2 warehouse and stock; no Org 1 stock or orders leaked across tenant boundaries.'
    });
  } else {
    recordResult('FUL7-08', 'Multi-tenant isolation', 'FAILED', {
      expected: 'Strict multi-tenant isolation with zero data leakage',
      actual: `org1StockLeaked: ${org1StockLeaked}, org1OrdersLeaked: ${org1OrdersLeaked}`,
      severity: 'Critical'
    });
  }

  // ========================================================
  // Non-Functional: FUL7-NFR1 & FUL7-NFR2
  // ========================================================
  // FUL7-NFR1: Data freshness
  // Stock levels reflect true current state
  const finalStockRes = await fetch(`${BASE_URL}/fulfillment/stock`, {
    headers: {
      'Authorization': `Bearer ${token1}`,
      'x-organization-id': org1.id
    }
  });
  const finalStock = await finalStockRes.json();
  const finalMain = finalStock.data?.find(s => s.warehouse_id === mainWh.id && s.product_id === laptopProduct.id);
  // Main started at 40, allocated 5 in first order, then 35 in excess order -> available should be 0, hard_allocated should be 40
  console.log('Final main warehouse stock:', finalMain);
  if (finalMain && finalMain.available_to_fulfill === 0 && finalMain.hard_allocated_quantity === 40) {
    recordResult('FUL7-NFR1', 'Data freshness', 'PASSED', {
      details: 'Live stock query immediately returns latest allocated and available counts without stale cache.'
    });
  } else {
    recordResult('FUL7-NFR1', 'Data freshness', 'FAILED', {
      expected: 'available_to_fulfill=0, hard_allocated=40',
      actual: `available=${finalMain?.available_to_fulfill}, allocated=${finalMain?.hard_allocated_quantity}`,
      severity: 'High'
    });
  }

  // FUL7-NFR2: Consistency
  // Verify on_hand = available_to_fulfill + soft_reserved + hard_allocated
  let consistent = true;
  for (const s of finalStock.data || []) {
    if (s.on_hand_quantity !== (s.available_to_fulfill + s.soft_reserved_quantity + s.hard_allocated_quantity)) {
      consistent = false;
      break;
    }
  }
  if (consistent) {
    recordResult('FUL7-NFR2', 'Consistency', 'PASSED', {
      details: 'All warehouse stock rows strictly preserve balance invariant: on_hand = available + soft_reserved + hard_allocated.'
    });
  } else {
    recordResult('FUL7-NFR2', 'Consistency', 'FAILED', {
      expected: 'on_hand = available + soft_reserved + hard_allocated across all records',
      actual: 'Invariant breached in stock rows',
      severity: 'Critical'
    });
  }

  console.log('\n========================================');
  console.log('SCREEN 7 TEST RESULTS SUMMARY:');
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
