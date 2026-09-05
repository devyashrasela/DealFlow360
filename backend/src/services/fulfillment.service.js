import { Op } from 'sequelize';
import {
  sequelize,
  Warehouse,
  WarehouseStock,
  FulfillmentOrder,
  FulfillmentItem,
  Backorder,
  Quotation,
  QuotationLine,
  Product,
} from '../models/index.js';

/**
 * Service: Fulfillment & Multi-Warehouse Logistics
 * Strict ACID transactional boundaries and deterministic row locking.
 */

/**
 * Real-time stock lookup with computed available_to_fulfill
 */
export const getStockBalances = async (orgId, { warehouse_id, product_id } = {}) => {
  const where = {};
  if (warehouse_id) where.warehouse_id = warehouse_id;
  if (product_id) where.product_id = product_id;

  const warehouseWhere = { organization_id: orgId };

  const stocks = await WarehouseStock.findAll({
    where,
    include: [
      {
        model: Warehouse,
        as: 'warehouse',
        where: warehouseWhere,
        attributes: ['id', 'code', 'name', 'shipping_base_fee', 'shipping_cost_multiplier', 'address', 'is_active'],
      },
      {
        model: Product,
        as: 'product',
        attributes: ['id', 'sku', 'name', 'category', 'is_active'],
      },
    ],
    order: [['warehouse_id', 'ASC'], ['product_id', 'ASC']],
  });

  return stocks.map((s) => {
    const onHand = Number(s.on_hand_quantity || 0);
    const softReserved = Number(s.soft_reserved_quantity || 0);
    const hardAllocated = Number(s.hard_allocated_quantity || 0);
    const available = onHand - softReserved - hardAllocated;

    return {
      id: s.id,
      warehouse_id: s.warehouse_id,
      warehouse: s.warehouse ? {
        id: s.warehouse.id,
        code: s.warehouse.code,
        name: s.warehouse.name,
        shipping_base_fee: Number(s.warehouse.shipping_base_fee),
        shipping_cost_multiplier: Number(s.warehouse.shipping_cost_multiplier),
      } : null,
      product_id: s.product_id,
      product: s.product ? {
        id: s.product.id,
        sku: s.product.sku,
        name: s.product.name,
      } : null,
      product_variant_id: s.product_variant_id,
      on_hand_quantity: onHand,
      soft_reserved_quantity: softReserved,
      hard_allocated_quantity: hardAllocated,
      available_to_fulfill: Math.max(0, available),
      reorder_threshold: s.reorder_threshold,
      is_low_stock: available <= s.reorder_threshold,
    };
  });
};

/**
 * Pure optimization calculation.
 * Evaluates single-depot fulfillment first to minimize shipments.
 * Fallback to multi-warehouse greedy split based on shipping cost factors.
 */
export const optimizeFulfillmentSplit = (physicalLines, activeWarehouses, stockMap) => {
  // stockMap key: `${warehouse_id}:${product_id}:${product_variant_id || 'null'}`
  // returns { allocations: Map(warehouse_id => items), backorders: [], estimatedCost: 0, isSplit: false }

  const warehouseList = activeWarehouses.map((w) => ({
    ...w,
    costFactor: Number(w.shipping_base_fee || 0) * Number(w.shipping_cost_multiplier || 1.0),
  })).sort((a, b) => a.costFactor - b.costFactor);

  // 1. Single warehouse check: can one warehouse satisfy 100% of all physical lines?
  let bestSingleWarehouse = null;
  for (const wh of warehouseList) {
    let canFulfillAll = true;
    for (const line of physicalLines) {
      const key = `${wh.id}:${line.product_id}:${line.product_variant_id || 'null'}`;
      const stock = stockMap.get(key);
      const available = stock ? (stock.on_hand_quantity - stock.soft_reserved_quantity - stock.hard_allocated_quantity) : 0;
      if (available < line.quantity) {
        canFulfillAll = false;
        break;
      }
    }
    if (canFulfillAll) {
      bestSingleWarehouse = wh;
      break; // lowest costFactor that can fulfill 100%
    }
  }

  if (bestSingleWarehouse) {
    const allocations = new Map();
    allocations.set(bestSingleWarehouse.id, {
      warehouse: bestSingleWarehouse,
      items: physicalLines.map((line) => ({
        quotation_line_id: line.id,
        product_id: line.product_id,
        product_variant_id: line.product_variant_id,
        quantity_allocated: line.quantity,
      })),
      estimated_shipping_cost: bestSingleWarehouse.costFactor,
    });

    return {
      allocationsByWarehouse: allocations,
      backorders: [],
      estimatedTotalShippingCost: bestSingleWarehouse.costFactor,
      isSplit: false,
      singleDepotChosen: bestSingleWarehouse.name,
    };
  }

  // 2. Multi-warehouse split + backorders
  // Track remaining available stock dynamically in simulation
  const simulatedAvailable = new Map();
  for (const [key, stock] of stockMap.entries()) {
    const avail = stock.on_hand_quantity - stock.soft_reserved_quantity - stock.hard_allocated_quantity;
    simulatedAvailable.set(key, Math.max(0, avail));
  }

  const allocations = new Map();
  const backorders = [];

  for (const line of physicalLines) {
    let unallocated = line.quantity;

    for (const wh of warehouseList) {
      if (unallocated <= 0) break;
      const key = `${wh.id}:${line.product_id}:${line.product_variant_id || 'null'}`;
      const avail = simulatedAvailable.get(key) || 0;

      if (avail > 0) {
        const toAllocate = Math.min(unallocated, avail);
        simulatedAvailable.set(key, avail - toAllocate);
        unallocated -= toAllocate;

        if (!allocations.has(wh.id)) {
          allocations.set(wh.id, {
            warehouse: wh,
            items: [],
            estimated_shipping_cost: wh.costFactor,
          });
        }

        allocations.get(wh.id).items.push({
          quotation_line_id: line.id,
          product_id: line.product_id,
          product_variant_id: line.product_variant_id,
          quantity_allocated: toAllocate,
        });
      }
    }

    // Remainder dumps to backorder
    if (unallocated > 0) {
      backorders.push({
        quotation_line_id: line.id,
        product_id: line.product_id,
        product_variant_id: line.product_variant_id,
        backorder_quantity: unallocated,
      });
    }
  }

  let totalCost = 0;
  for (const alloc of allocations.values()) {
    totalCost += alloc.estimated_shipping_cost;
  }

  return {
    allocationsByWarehouse: allocations,
    backorders,
    estimatedTotalShippingCost: totalCost,
    isSplit: allocations.size > 1,
    singleDepotChosen: null,
  };
};

/**
 * Preview optimal split for an order without committing locks
 */
export const previewQuoteSplit = async (orgId, quotationId) => {
  const quotation = await Quotation.findOne({
    where: { id: quotationId, organization_id: orgId },
    include: [
      {
        model: QuotationLine,
        as: 'lines',
        where: { category: 'hardware' },
        required: false,
      },
    ],
  });

  if (!quotation) {
    const err = new Error(`Quotation not found: ${quotationId}`);
    err.status = 404;
    throw err;
  }

  const physicalLines = quotation.lines || [];
  if (physicalLines.length === 0) {
    return {
      quotation_id: quotationId,
      message: 'No physical hardware lines to fulfill.',
      allocations: [],
      backorders: [],
      total_shipping_cost: 0,
    };
  }

  const activeWarehouses = await Warehouse.findAll({
    where: { organization_id: quotation.organization_id, is_active: true },
  });

  const productIds = physicalLines.map((l) => l.product_id);
  const stockRows = await WarehouseStock.findAll({
    where: { product_id: productIds },
  });

  const stockMap = new Map();
  for (const s of stockRows) {
    const key = `${s.warehouse_id}:${s.product_id}:${s.product_variant_id || 'null'}`;
    stockMap.set(key, s.toJSON());
  }

  const result = optimizeFulfillmentSplit(
    physicalLines.map((l) => l.toJSON()),
    activeWarehouses.map((w) => w.toJSON()),
    stockMap
  );

  const serializedAllocations = [];
  for (const [whId, alloc] of result.allocationsByWarehouse.entries()) {
    serializedAllocations.push({
      warehouse_id: whId,
      warehouse_name: alloc.warehouse.name,
      warehouse_code: alloc.warehouse.code,
      estimated_shipping_cost: alloc.estimated_shipping_cost,
      items: alloc.items,
    });
  }

  return {
    quotation_id: quotationId,
    is_split: result.isSplit,
    single_depot_chosen: result.singleDepotChosen,
    estimated_total_shipping_cost: result.estimatedTotalShippingCost,
    allocations: serializedAllocations,
    backorders: result.backorders,
  };
};

/**
 * Execute Stock Allocation with strict SELECT ... FOR UPDATE concurrency locking.
 * Enforces deterministic ascending PK order to prevent deadlocks.
 */
export const executeFulfillmentAllocation = async (orgId, {
  quotationId,
  isManualOverride = false,
  manualAllocations = null,
  manualBackorders = null,
  parentTransaction = null,
}) => {
  const runInTransaction = async (t) => {
    // 1. Fetch quote and physical lines
    const quotation = await Quotation.findOne({
      where: { id: quotationId, organization_id: orgId },
      include: [
        {
          model: QuotationLine,
          as: 'lines',
          where: { category: 'hardware' },
          required: false,
        },
      ],
      transaction: t,
    });

    if (!quotation) {
      const err = new Error(`Quotation not found: ${quotationId}`);
      err.status = 404;
      throw err;
    }

    const physicalLines = quotation.lines || [];
    if (physicalLines.length === 0) {
      return { quotation_id: quotationId, orders: [], backorders: [], message: 'No physical lines to allocate' };
    }

    // 2. Fetch all warehouses for this org
    const warehouses = await Warehouse.findAll({
      where: { organization_id: quotation.organization_id, is_active: true },
      transaction: t,
    });
    const warehouseMap = new Map(warehouses.map((w) => [w.id, w]));

    const productIds = physicalLines.map((l) => l.product_id);

    // 3. Find IDs of all matching WarehouseStock rows first to sort deterministically
    const candidateStockRows = await WarehouseStock.findAll({
      attributes: ['id'],
      where: {
        warehouse_id: Array.from(warehouseMap.keys()),
        product_id: productIds,
      },
      order: [['id', 'ASC']],
      transaction: t,
    });

    const deterministicStockIds = candidateStockRows.map((r) => r.id);

    // 4. ACQUIRE EXCLUSIVE ROW LOCKS in deterministic ASC order
    let lockedStocks = [];
    if (deterministicStockIds.length > 0) {
      lockedStocks = await WarehouseStock.findAll({
        where: { id: deterministicStockIds },
        order: [['id', 'ASC']],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
    }

    const stockMap = new Map();
    for (const s of lockedStocks) {
      const key = `${s.warehouse_id}:${s.product_id}:${s.product_variant_id || 'null'}`;
      stockMap.set(key, s);
    }

    let planAllocationsByWarehouse = new Map();
    let planBackorders = [];

    if (isManualOverride && manualAllocations) {
      // Validate manual override matrix
      // manualAllocations format: [{ warehouse_id, product_id, product_variant_id, quotation_line_id, quantity }]
      const lineDemands = new Map(physicalLines.map((l) => [l.id, l.quantity]));
      const allocatedPerLine = new Map();

      for (const item of manualAllocations) {
        const wh = warehouseMap.get(item.warehouse_id);
        if (!wh) {
          const err = new Error(`Invalid warehouse: ${item.warehouse_id}`);
          err.status = 400;
          throw err;
        }

        const key = `${item.warehouse_id}:${item.product_id}:${item.product_variant_id || 'null'}`;
        const stockRecord = stockMap.get(key);
        if (!stockRecord) {
          const err = new Error(`No stock entry for product ${item.product_id} at warehouse ${item.warehouse_id}`);
          err.status = 400;
          throw err;
        }

        const available = stockRecord.on_hand_quantity - stockRecord.soft_reserved_quantity - stockRecord.hard_allocated_quantity;
        if (item.quantity > available) {
          const err = new Error(
            `Requested quantity ${item.quantity} exceeds available stock (${available}) at depot ${wh.name}`
          );
          err.status = 400;
          throw err;
        }

        allocatedPerLine.set(
          item.quotation_line_id,
          (allocatedPerLine.get(item.quotation_line_id) || 0) + item.quantity
        );

        if (!planAllocationsByWarehouse.has(item.warehouse_id)) {
          planAllocationsByWarehouse.set(item.warehouse_id, {
            warehouse: wh,
            items: [],
            estimated_shipping_cost: Number(wh.shipping_base_fee) * Number(wh.shipping_cost_multiplier),
          });
        }

        planAllocationsByWarehouse.get(item.warehouse_id).items.push({
          quotation_line_id: item.quotation_line_id,
          product_id: item.product_id,
          product_variant_id: item.product_variant_id || null,
          quantity_allocated: item.quantity,
        });
      }

      // Check remaining line balances as backorders
      for (const line of physicalLines) {
        const allocated = allocatedPerLine.get(line.id) || 0;
        const totalNeeded = lineDemands.get(line.id) || 0;
        if (allocated > totalNeeded) {
          const err = new Error(`Allocated quantity ${allocated} exceeds required ${totalNeeded} for line ${line.id}`);
          err.status = 400;
          throw err;
        }
        if (allocated < totalNeeded) {
          planBackorders.push({
            quotation_line_id: line.id,
            product_id: line.product_id,
            product_variant_id: line.product_variant_id || null,
            backorder_quantity: totalNeeded - allocated,
          });
        }
      }
    } else {
      // Run automatic optimization calculation
      const optResult = optimizeFulfillmentSplit(
        physicalLines.map((l) => l.toJSON()),
        warehouses.map((w) => w.toJSON()),
        stockMap
      );
      planAllocationsByWarehouse = optResult.allocationsByWarehouse;
      planBackorders = optResult.backorders;
    }

    // 5. Commit Fulfillment Orders, Items, and Update Hard Allocated Quantities
    const createdFulfillmentOrders = [];

    let orderCounter = 1;
    for (const [whId, alloc] of planAllocationsByWarehouse.entries()) {
      if (alloc.items.length === 0) continue;

      const foNumber = `FO-${quotation.quotation_number}-${alloc.warehouse.code || orderCounter}-${Date.now().toString().slice(-4)}`;
      orderCounter++;

      const fulfillmentOrder = await FulfillmentOrder.create({
        organization_id: quotation.organization_id,
        quotation_id: quotation.id,
        fulfillment_number: foNumber,
        warehouse_id: whId,
        status: 'allocated',
        is_manual_override: isManualOverride,
        estimated_shipping_cost: alloc.estimated_shipping_cost || 0.00,
      }, { transaction: t });

      for (const item of alloc.items) {
        await FulfillmentItem.create({
          fulfillment_order_id: fulfillmentOrder.id,
          quotation_line_id: item.quotation_line_id,
          product_id: item.product_id,
          product_variant_id: item.product_variant_id || null,
          quantity_allocated: item.quantity_allocated,
        }, { transaction: t });

        // Update locked stock row: increment hard_allocated_quantity
        const stockKey = `${whId}:${item.product_id}:${item.product_variant_id || 'null'}`;
        const stockRecord = stockMap.get(stockKey);
        if (stockRecord) {
          stockRecord.hard_allocated_quantity += item.quantity_allocated;
          await stockRecord.save({ transaction: t });
        }
      }

      createdFulfillmentOrders.push(fulfillmentOrder);
    }

    // 6. Persist Backorders
    const createdBackorders = [];
    for (const bo of planBackorders) {
      if (bo.backorder_quantity > 0) {
        const backorderRecord = await Backorder.create({
          organization_id: quotation.organization_id,
          quotation_id: quotation.id,
          quotation_line_id: bo.quotation_line_id,
          product_id: bo.product_id,
          product_variant_id: bo.product_variant_id || null,
          backorder_quantity: bo.backorder_quantity,
          status: 'open',
        }, { transaction: t });
        createdBackorders.push(backorderRecord);
      }
    }

    return {
      quotation_id: quotation.id,
      is_split: createdFulfillmentOrders.length > 1,
      orders: createdFulfillmentOrders,
      backorders: createdBackorders,
    };
  };

  if (parentTransaction) {
    return runInTransaction(parentTransaction);
  }
  return sequelize.transaction(runInTransaction);
};

/**
 * Scan for Consolidation Prompts:
 * Trigger when inward stock matches an open backorder AND existing parcel state < 'pickpack'.
 */
export const findConsolidationPrompts = async (organizationId) => {
  const openBackorders = await Backorder.findAll({
    where: {
      organization_id: organizationId,
      status: { [Op.in]: ['open', 'stock_received_pending_consolidation'] },
    },
    include: [
      {
        model: Quotation,
        as: 'quotation',
        attributes: ['id', 'quotation_number', 'customer_account_id'],
        include: [
          {
            model: FulfillmentOrder,
            as: 'fulfillment_orders',
            where: {
              status: { [Op.in]: ['draft', 'allocated', 'assigned'] }, // strictly < pickpack
            },
            required: false,
          },
        ],
      },
      {
        model: Product,
        as: 'product',
        attributes: ['id', 'sku', 'name'],
      },
    ],
  });

  const prompts = [];

  for (const bo of openBackorders) {
    // Check available stock across warehouses for this product
    const stockRows = await WarehouseStock.findAll({
      where: { product_id: bo.product_id },
      include: [{ model: Warehouse, as: 'warehouse' }],
    });

    for (const stock of stockRows) {
      const avail = stock.on_hand_quantity - stock.soft_reserved_quantity - stock.hard_allocated_quantity;
      if (avail >= bo.backorder_quantity) {
        // Find existing eligible fulfillment orders
        const eligibleOrders = bo.quotation?.fulfillment_orders || [];
        const matchingWarehouseOrder = eligibleOrders.find((fo) => fo.warehouse_id === stock.warehouse_id);

        prompts.push({
          backorder_id: bo.id,
          quotation_id: bo.quotation_id,
          quotation_number: bo.quotation?.quotation_number,
          product_id: bo.product_id,
          product_name: bo.product?.name,
          backorder_quantity: bo.backorder_quantity,
          available_stock: avail,
          warehouse_id: stock.warehouse_id,
          warehouse_name: stock.warehouse?.name,
          eligible_fulfillment_order_id: matchingWarehouseOrder ? matchingWarehouseOrder.id : (eligibleOrders[0]?.id || null),
          recommendation: matchingWarehouseOrder
            ? `Consolidate ${bo.backorder_quantity} units into existing shipment #${matchingWarehouseOrder.fulfillment_number}`
            : `Fulfill backorder directly from ${stock.warehouse?.name}`,
        });
      }
    }
  }

  return prompts;
};

/**
 * Mid-fulfillment consolidation:
 * Merges open backorder into existing active parcel (< pickpack) under row locks.
 */
export const consolidateBackorder = async (orgId, {
  backorderId,
  targetWarehouseId,
  targetFulfillmentOrderId,
}) => {
  return sequelize.transaction(async (t) => {
    // 1. Lock Backorder
    const backorder = await Backorder.findOne({
      where: { id: backorderId, organization_id: orgId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!backorder) {
      const err = new Error(`Backorder not found: ${backorderId}`);
      err.status = 404;
      throw err;
    }

    if (backorder.status === 'consolidated') {
      const err = new Error('Backorder has already been consolidated.');
      err.status = 400;
      throw err;
    }

    // 2. Lock Target Fulfillment Order
    const fulfillmentOrder = await FulfillmentOrder.findOne({
      where: { id: targetFulfillmentOrderId, organization_id: orgId },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!fulfillmentOrder) {
      const err = new Error(`Target FulfillmentOrder not found: ${targetFulfillmentOrderId}`);
      err.status = 404;
      throw err;
    }

    // Strict Gate: parcel state must be < pickpack
    const allowableStatuses = ['draft', 'allocated', 'assigned'];
    if (!allowableStatuses.includes(fulfillmentOrder.status)) {
      const err = new Error(
        `Consolidation rejected: order ${fulfillmentOrder.fulfillment_number} is already in state '${fulfillmentOrder.status}'. Must be prior to 'pickpack'.`
      );
      err.status = 400;
      throw err;
    }

    const warehouseIdToUse = targetWarehouseId || fulfillmentOrder.warehouse_id;

    // 3. Lock WarehouseStock deterministically
    const stock = await WarehouseStock.findOne({
      where: {
        warehouse_id: warehouseIdToUse,
        product_id: backorder.product_id,
      },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!stock) {
      const err = new Error('No warehouse stock record found for backordered product at target depot.');
      err.status = 404;
      throw err;
    }

    const avail = stock.on_hand_quantity - stock.soft_reserved_quantity - stock.hard_allocated_quantity;
    if (avail < backorder.backorder_quantity) {
      const err = new Error(
        `Insufficient available stock (${avail}) to satisfy backorder quantity (${backorder.backorder_quantity}).`
      );
      err.status = 400;
      throw err;
    }

    // 4. Update Stock hard allocated
    stock.hard_allocated_quantity += backorder.backorder_quantity;
    await stock.save({ transaction: t });

    // 5. Add/Update FulfillmentItem in target FulfillmentOrder
    let item = await FulfillmentItem.findOne({
      where: {
        fulfillment_order_id: fulfillmentOrder.id,
        quotation_line_id: backorder.quotation_line_id,
      },
      transaction: t,
    });

    if (item) {
      item.quantity_allocated += backorder.backorder_quantity;
      await item.save({ transaction: t });
    } else {
      item = await FulfillmentItem.create({
        fulfillment_order_id: fulfillmentOrder.id,
        quotation_line_id: backorder.quotation_line_id,
        product_id: backorder.product_id,
        product_variant_id: backorder.product_variant_id,
        quantity_allocated: backorder.backorder_quantity,
      }, { transaction: t });
    }

    // 6. Close Backorder
    backorder.status = 'consolidated';
    backorder.target_warehouse_id = warehouseIdToUse;
    backorder.resolved_fulfillment_order_id = fulfillmentOrder.id;
    await backorder.save({ transaction: t });

    return {
      message: 'Backorder consolidated successfully.',
      backorder_id: backorder.id,
      fulfillment_order_id: fulfillmentOrder.id,
      consolidated_quantity: backorder.backorder_quantity,
    };
  });
};

/**
 * Record replenishment inward stock receipt & trigger consolidation flags
 */
export const receiveInwardStockReceipt = async (orgId, { warehouseId, productId, productVariantId, quantity }) => {
  return sequelize.transaction(async (t) => {
    const warehouse = await Warehouse.findOne({ where: { id: warehouseId, organization_id: orgId }, transaction: t });
    if (!warehouse) throw new Error('Warehouse not found');

    let stock = await WarehouseStock.findOne({
      where: {
        warehouse_id: warehouseId,
        product_id: productId,
      },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!stock) {
      stock = await WarehouseStock.create({
        warehouse_id: warehouseId,
        product_id: productId,
        product_variant_id: productVariantId || null,
        on_hand_quantity: quantity,
        soft_reserved_quantity: 0,
        hard_allocated_quantity: 0,
      }, { transaction: t });
    } else {
      stock.on_hand_quantity += quantity;
      await stock.save({ transaction: t });
    }

    // Flag matching open backorders
    await Backorder.update(
      { status: 'stock_received_pending_consolidation', target_warehouse_id: warehouseId },
      {
        where: {
          product_id: productId,
          status: 'open',
        },
        transaction: t,
      }
    );

    return stock;
  });
};
