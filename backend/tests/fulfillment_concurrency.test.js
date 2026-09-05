import dotenv from 'dotenv';
dotenv.config();

import {
  sequelize,
  Warehouse,
  WarehouseStock,
  FulfillmentOrder,
  FulfillmentItem,
  Backorder,
  Quotation,
  QuotationLine,
  Organization,
  User,
  CustomerAccount,
  Product,
  PriceList,
} from '../src/models/index.js';
import {
  getStockBalances,
  previewQuoteSplit,
  executeFulfillmentAllocation,
  findConsolidationPrompts,
  consolidateBackorder,
  receiveInwardStockReceipt,
} from '../src/services/fulfillment.service.js';

const runTests = async () => {
  console.log('=== STARTING FULFILLMENT & CONCURRENCY TEST SUITE ===');
  await sequelize.authenticate();
  console.log('Database connected.');
  await sequelize.sync();

  // 1. Setup isolation fixtures
  const testOrg = await Organization.create({
    legal_name: `Test Org ${Date.now()}`,
    trading_name: `Test Org ${Date.now()}`,
    slug: `test-org-${Date.now()}`,
    is_active: true,
  });

  const testUser = await User.create({
    email: `engineer-${Date.now()}@test.com`,
    password_hash: 'dummyhash123',
    full_name: 'Test Engineer',
    is_active: true,
  });

  const buyerOrg = await Organization.create({
    legal_name: `Buyer Corp ${Date.now()}`,
    trading_name: `Buyer Corp ${Date.now()}`,
    slug: `buyer-corp-${Date.now()}`,
    organization_type: 'customer',
    is_active: true,
  });

  const customerAccount = await CustomerAccount.create({
    provider_organization_id: testOrg.id,
    buyer_organization_id: buyerOrg.id,
    account_number: `ACC-${Date.now()}`,
    assigned_sales_rep_id: testUser.id,
    status: 'active',
  });

  const priceList = await PriceList.create({
    organization_id: testOrg.id,
    name: 'Standard Catalog',
    currency: 'USD',
    effective_start: new Date(),
    is_active: true,
  });

  const warehouseA = await Warehouse.create({
    organization_id: testOrg.id,
    code: 'W-NORTH',
    name: 'North Logistics Hub',
    shipping_base_fee: 20.00,
    shipping_cost_multiplier: 1.00, // costFactor = 20
    is_active: true,
  });

  const warehouseB = await Warehouse.create({
    organization_id: testOrg.id,
    code: 'W-SOUTH',
    name: 'South Logistics Hub',
    shipping_base_fee: 35.00,
    shipping_cost_multiplier: 1.20, // costFactor = 42
    is_active: true,
  });

  const productHardware = await Product.create({
    organization_id: testOrg.id,
    sku: `HW-SRV-${Date.now()}`,
    name: 'Enterprise Rack Server',
    category: 'hardware',
    billing_cadence: 'one_time',
    base_list_price: 1000.00,
    standard_unit_cost: 600.00,
    is_active: true,
  });

  // Setup stock: Warehouse A = 20, Warehouse B = 10 (Total Network = 30)
  const stockA = await WarehouseStock.create({
    warehouse_id: warehouseA.id,
    product_id: productHardware.id,
    on_hand_quantity: 20,
    soft_reserved_quantity: 0,
    hard_allocated_quantity: 0,
    reorder_threshold: 5,
  });

  const stockB = await WarehouseStock.create({
    warehouse_id: warehouseB.id,
    product_id: productHardware.id,
    on_hand_quantity: 10,
    soft_reserved_quantity: 0,
    hard_allocated_quantity: 0,
    reorder_threshold: 5,
  });

  console.log('Fixtures initialized. Stock: Depot A=20, Depot B=10.');

  // TEST 1: Inventory Lookup Balance Verification
  console.log('\n[TEST 1] Inventory Balance Lookup');
  const balances = await getStockBalances({ organization_id: testOrg.id, product_id: productHardware.id });
  if (balances.length !== 2) throw new Error(`Expected 2 warehouse records, got ${balances.length}`);
  const bA = balances.find((b) => b.warehouse_id === warehouseA.id);
  const bB = balances.find((b) => b.warehouse_id === warehouseB.id);
  if (bA.available_to_fulfill !== 20 || bB.available_to_fulfill !== 10) {
    throw new Error(`Inventory balance mismatch: A=${bA.available_to_fulfill}, B=${bB.available_to_fulfill}`);
  }
  console.log('✓ TEST 1 PASSED: Stock ledger accurate (A: 20 avail, B: 10 avail).');

  // TEST 2: Single Warehouse Fit Optimization (Shipment Count = 1)
  console.log('\n[TEST 2] Single Warehouse Fit Optimization (Order 15 units)');
  const quote1 = await Quotation.create({
    organization_id: testOrg.id,
    customer_account_id: customerAccount.id,
    quotation_number: `Q-TEST-001-${Date.now()}`,
    stage: 'confirmed',
    assigned_sales_rep_id: testUser.id,
    price_list_id: priceList.id,
    expiration_date: new Date(Date.now() + 86400000),
  });
  const createTestQuotationLine = async (data) => {
    const qty = data.quantity || 1;
    const listPrice = data.unit_list_price || 1000.00;
    const costPrice = data.unit_cost_price || 600.00;
    const discount = data.applied_discount_percentage || 0;
    const netPrice = listPrice * (1 - discount / 100);
    const gross = listPrice * qty;
    const net = netPrice * qty;
    const costTot = costPrice * qty;
    const marginAmt = net - costTot;
    const marginPct = (marginAmt / net) * 100;

    return QuotationLine.create({
      quotation_id: data.quotation_id,
      product_id: data.product_id,
      line_number: data.line_number || 1,
      category: data.category || 'hardware',
      billing_cadence: data.billing_cadence || 'one_time',
      quantity: qty,
      unit_list_price: listPrice,
      unit_cost_price: costPrice,
      applied_discount_percentage: discount,
      effective_ceiling_limit: data.effective_ceiling_limit || 15.00,
      unit_net_price: netPrice,
      line_gross_amount: gross,
      line_net_amount: net,
      line_cost_total: costTot,
      line_margin_amount: marginAmt,
      line_margin_percentage: marginPct,
    });
  };

  const q1Line = await createTestQuotationLine({
    quotation_id: quote1.id,
    product_id: productHardware.id,
    line_number: 1,
    category: 'hardware',
    billing_cadence: 'one_time',
    quantity: 15,
    unit_list_price: 1000.00,
    unit_cost_price: 600.00,
    effective_ceiling_limit: 15.00,
  });

  const preview1 = await previewQuoteSplit(quote1.id);
  if (preview1.is_split !== false) throw new Error('Expected single warehouse routing, but was split!');
  if (preview1.allocations.length !== 1 || preview1.allocations[0].warehouse_id !== warehouseA.id) {
    throw new Error('Expected 100% allocation to lowest-cost Warehouse A');
  }
  console.log('✓ TEST 2 PASSED: Single warehouse greedy choice picked Warehouse A exclusively.');

  // Execute Allocation for quote 1
  const alloc1Result = await executeFulfillmentAllocation({ quotationId: quote1.id });
  if (alloc1Result.orders.length !== 1 || alloc1Result.backorders.length !== 0) {
    throw new Error('Allocation 1 mismatch.');
  }
  await stockA.reload();
  if (stockA.hard_allocated_quantity !== 15) {
    throw new Error(`Expected Warehouse A hard_allocated = 15, got ${stockA.hard_allocated_quantity}`);
  }
  console.log(`✓ Allocation committed: Depot A hard_allocated = 15, available = ${stockA.on_hand_quantity - stockA.hard_allocated_quantity}.`);

  // TEST 3: Multi-Warehouse Auto-Split + Backorder Generation
  // Depot A now has 5 available. Depot B has 10 available. Total network = 15.
  // Order 20 units -> 5 from A, 10 from B, 5 backordered!
  console.log('\n[TEST 3] Multi-Warehouse Split + Backorder Allocation (Order 20 units)');
  const quote2 = await Quotation.create({
    organization_id: testOrg.id,
    customer_account_id: customerAccount.id,
    quotation_number: `Q-TEST-002-${Date.now()}`,
    stage: 'confirmed',
    assigned_sales_rep_id: testUser.id,
    price_list_id: priceList.id,
    expiration_date: new Date(Date.now() + 86400000),
  });
  await createTestQuotationLine({
    quotation_id: quote2.id,
    product_id: productHardware.id,
    line_number: 1,
    category: 'hardware',
    billing_cadence: 'one_time',
    quantity: 20,
    unit_list_price: 1000.00,
    unit_cost_price: 600.00,
    effective_ceiling_limit: 15.00,
  });

  const alloc2Result = await executeFulfillmentAllocation({ quotationId: quote2.id });
  if (alloc2Result.orders.length !== 2) {
    throw new Error(`Expected 2 fulfillment orders (split across A and B), got ${alloc2Result.orders.length}`);
  }
  if (alloc2Result.backorders.length !== 1 || alloc2Result.backorders[0].backorder_quantity !== 5) {
    throw new Error(`Expected 1 backorder of 5 units, got ${JSON.stringify(alloc2Result.backorders)}`);
  }
  await stockA.reload();
  await stockB.reload();
  if (stockA.hard_allocated_quantity !== 20 || stockB.hard_allocated_quantity !== 10) {
    throw new Error(`Stock allocation mismatch after split. A=${stockA.hard_allocated_quantity}, B=${stockB.hard_allocated_quantity}`);
  }
  console.log('✓ TEST 3 PASSED: Split 5 from Depot A, 10 from Depot B, 5 backordered. Network stock fully exhausted (0 avail).');

  const backorderRecord = alloc2Result.backorders[0];

  // TEST 4: Consolidation Prompt & Gatekeeper Enforcement
  console.log('\n[TEST 4] Replenishment & Mid-Fulfillment Consolidation Gatekeeper');
  // 1. Simulate inward receipt of 10 units at Depot A
  await receiveInwardStockReceipt({
    warehouseId: warehouseA.id,
    productId: productHardware.id,
    quantity: 10,
  });
  console.log('Inward stock receipt processed: 10 units received at Depot A.');

  // Check consolidation prompts
  const prompts = await findConsolidationPrompts(testOrg.id);
  if (prompts.length === 0) throw new Error('Expected consolidation prompt, none found.');
  console.log(`✓ Consolidation prompt generated: "${prompts[0].recommendation}"`);

  // Verify gatekeeper: if parcel is already at 'pickpack', consolidation MUST be rejected
  const eligibleOrder = alloc2Result.orders.find((o) => o.warehouse_id === warehouseA.id);
  eligibleOrder.status = 'pickpack';
  await eligibleOrder.save();

  let gatekeeperBlocked = false;
  try {
    await consolidateBackorder({
      backorderId: backorderRecord.id,
      targetWarehouseId: warehouseA.id,
      targetFulfillmentOrderId: eligibleOrder.id,
    });
  } catch (err) {
    gatekeeperBlocked = true;
    console.log(`✓ Gatekeeper successfully blocked consolidation on 'pickpack' state: "${err.message}"`);
  }
  if (!gatekeeperBlocked) throw new Error('Gatekeeper failed to block consolidation on pickpack parcel!');

  // Reset status to 'allocated' (< pickpack) and execute consolidation
  eligibleOrder.status = 'allocated';
  await eligibleOrder.save();

  const consolidationResult = await consolidateBackorder({
    backorderId: backorderRecord.id,
    targetWarehouseId: warehouseA.id,
    targetFulfillmentOrderId: eligibleOrder.id,
  });

  await backorderRecord.reload();
  if (backorderRecord.status !== 'consolidated') {
    throw new Error(`Backorder status should be 'consolidated', got '${backorderRecord.status}'`);
  }
  console.log('✓ TEST 4 PASSED: Backorder successfully consolidated into shipment prior to pickpack.');

  // TEST 5: High-Concurrency Deadlock & Anti-Overselling Verification
  console.log('\n[TEST 5] Concurrent Transaction Race Test (5 Concurrent Checkouts)');
  // Create a new product with exactly 10 units available
  const raceProduct = await Product.create({
    organization_id: testOrg.id,
    sku: `RACE-SKU-${Date.now()}`,
    name: 'High Demand Switch',
    category: 'hardware',
    billing_cadence: 'one_time',
    base_list_price: 500.00,
    standard_unit_cost: 300.00,
    is_active: true,
  });

  const raceStockA = await WarehouseStock.create({
    warehouse_id: warehouseA.id,
    product_id: raceProduct.id,
    on_hand_quantity: 6,
    soft_reserved_quantity: 0,
    hard_allocated_quantity: 0,
  });

  const raceStockB = await WarehouseStock.create({
    warehouse_id: warehouseB.id,
    product_id: raceProduct.id,
    on_hand_quantity: 4,
    soft_reserved_quantity: 0,
    hard_allocated_quantity: 0,
  });

  // Spawn 5 concurrent quote orders, each requesting 3 units (5 x 3 = 15 units demanded, 10 available)
  const concurrentQuotes = [];
  for (let i = 0; i < 5; i++) {
    const q = await Quotation.create({
      organization_id: testOrg.id,
      customer_account_id: customerAccount.id,
      quotation_number: `Q-RACE-${i}-${Date.now()}`,
      stage: 'confirmed',
      assigned_sales_rep_id: testUser.id,
      price_list_id: priceList.id,
      expiration_date: new Date(Date.now() + 86400000),
    });
    await createTestQuotationLine({
      quotation_id: q.id,
      product_id: raceProduct.id,
      line_number: 1,
      category: 'hardware',
      billing_cadence: 'one_time',
      quantity: 3,
      unit_list_price: 500.00,
      unit_cost_price: 300.00,
      effective_ceiling_limit: 10.00,
    });
    concurrentQuotes.push(q);
  }

  console.log('Firing 5 concurrent allocation transactions simultaneously under SELECT ... FOR UPDATE locks...');
  const raceResults = await Promise.all(
    concurrentQuotes.map((q) => executeFulfillmentAllocation({ quotationId: q.id }))
  );

  // Sum total allocated items across all 5 orders
  let totalRaceAllocated = 0;
  let totalRaceBackordered = 0;

  for (const res of raceResults) {
    for (const ord of res.orders) {
      const items = await FulfillmentItem.findAll({ where: { fulfillment_order_id: ord.id } });
      for (const it of items) {
        totalRaceAllocated += it.quantity_allocated;
      }
    }
    for (const bo of res.backorders) {
      totalRaceBackordered += bo.backorder_quantity;
    }
  }

  await raceStockA.reload();
  await raceStockB.reload();

  console.log(`Concurrency Results:
    Total Physical Network Stock: 10
    Total Demanded across 5 orders: 15
    Total Actually Allocated: ${totalRaceAllocated}
    Total Routed to Backorders: ${totalRaceBackordered}
    Stock A Hard Allocated: ${raceStockA.hard_allocated_quantity} / ${raceStockA.on_hand_quantity}
    Stock B Hard Allocated: ${raceStockB.hard_allocated_quantity} / ${raceStockB.on_hand_quantity}
  `);

  if (totalRaceAllocated !== 10) {
    throw new Error(`CRITICAL INVARIANT VIOLATION: Expected exactly 10 units allocated, got ${totalRaceAllocated}!`);
  }
  if (totalRaceBackordered !== 5) {
    throw new Error(`Expected exactly 5 units backordered, got ${totalRaceBackordered}!`);
  }
  if (raceStockA.hard_allocated_quantity > raceStockA.on_hand_quantity || raceStockB.hard_allocated_quantity > raceStockB.on_hand_quantity) {
    throw new Error('Oversell detected! Allocated units exceed on_hand capacity!');
  }

  console.log('✓ TEST 5 PASSED: ZERO DEADLOCKS. ZERO OVERSELL. ACID Invariants 100% Intact.');

  console.log('\n======================================================');
  console.log('ALL 5 FULFILLMENT & CONCURRENCY TESTS COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  process.exit(0);
};

runTests().catch((err) => {
  console.error('\n❌ TEST FAILURE:', err);
  process.exit(1);
});
