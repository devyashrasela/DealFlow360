import {
  getStockBalances,
  previewQuoteSplit,
  executeFulfillmentAllocation,
  findConsolidationPrompts,
  consolidateBackorder,
  receiveInwardStockReceipt,
} from '../services/fulfillment.service.js';
import {
  FulfillmentOrder,
  FulfillmentItem,
  Warehouse,
  Backorder,
  WarehouseStock,
  Quotation,
  QuotationLine,
  CustomerAccount,
  Organization,
  Product,
} from '../models/index.js';

/**
 * Controller: Fulfillment, Warehouse Auto-Split & Stock Inventory Cockpit
 */

/**
 * GET /api/fulfillment/stock
 * Inventory lookup endpoint: returns on_hand, soft_reserved, hard_allocated, available_to_fulfill
 */
export const getStock = async (req, res, next) => {
  try {
    const orgId = req.orgContext.organizationId;
    const { warehouse_id, product_id } = req.query;
    const stockList = await getStockBalances(orgId, {
      warehouse_id,
      product_id,
    });
    return res.status(200).json({ success: true, count: stockList.length, data: stockList });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fulfillment/orders
 * Returns list of orders awaiting fulfillment (Cockpit Screen 7)
 */
export const getFulfillmentOrders = async (req, res, next) => {
  try {
    const orgId = req.orgContext.organizationId;
    const { status, warehouse_id } = req.query;
    const where = { organization_id: orgId };
    if (status) where.status = status;
    if (warehouse_id) where.warehouse_id = warehouse_id;

    const orders = await FulfillmentOrder.findAll({
      where,
      include: [
        {
          model: Warehouse,
          as: 'warehouse',
          attributes: ['id', 'code', 'name'],
        },
        {
          model: Quotation,
          as: 'quotation',
          attributes: ['id', 'quotation_number', 'stage', 'customer_account_id', 'grand_total', 'createdAt'],
          include: [
            {
              model: CustomerAccount,
              as: 'customer_account',
              attributes: ['id', 'buyer_organization_id', 'credit_limit', 'outstanding_balance'],
              include: [
                {
                  model: Organization,
                  as: 'buyer_organization',
                  attributes: ['id', 'name'],
                },
              ],
            },
          ],
        },
        {
          model: FulfillmentItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['id', 'sku', 'name', 'category'],
            },
          ],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fulfillment/orders/:id
 * Single fulfillment order detail
 */
export const getFulfillmentOrderDetail = async (req, res, next) => {
  try {
    const orgId = req.orgContext.organizationId;
    const { id } = req.params;
    const order = await FulfillmentOrder.findOne({
      where: { id, organization_id: orgId },
      include: [
        { model: Warehouse, as: 'warehouse' },
        {
          model: Quotation,
          as: 'quotation',
          include: [
            {
              model: CustomerAccount,
              as: 'customer_account',
              include: [{ model: Organization, as: 'buyer_organization' }],
            },
            {
              model: QuotationLine,
              as: 'lines',
              where: { category: 'hardware' },
              required: false,
              include: [{ model: Product, as: 'product' }],
            },
            {
              model: Backorder,
              as: 'backorders',
              include: [{ model: Product, as: 'product' }],
            },
          ],
        },
        {
          model: FulfillmentItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }],
        },
      ],
    });

    if (!order) {
      return res.status(404).json({ success: false, error: `Fulfillment order ${id} not found.` });
    }

    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fulfillment/split-preview/:quotationId
 * Calculates algorithm-recommended warehouse split without committing
 */
export const getSplitPreview = async (req, res, next) => {
  try {
    const orgId = req.orgContext.organizationId;
    const { quotationId } = req.params;
    const preview = await previewQuoteSplit(orgId, quotationId);
    return res.status(200).json({ success: true, data: preview });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fulfillment/orders/ingest/:quotationId
 * Order ingestion hook: triggers on quote stage = 'confirmed'
 */
export const ingestConfirmedQuote = async (req, res, next) => {
  try {
    const orgId = req.orgContext.organizationId;
    const { quotationId } = req.params;
    const result = await executeFulfillmentAllocation(orgId, {
      quotationId,
      isManualOverride: false,
    });
    return res.status(201).json({
      success: true,
      message: 'Fulfillment orders and backorders successfully generated.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fulfillment/manual-split/:quotationId
 * Manual split override submitted from Screen 8
 */
export const applyManualSplit = async (req, res, next) => {
  try {
    const orgId = req.orgContext.organizationId;
    const { quotationId } = req.params;
    const { allocations } = req.body;

    if (!Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'allocations array is required for manual split override.',
      });
    }

    const result = await executeFulfillmentAllocation(orgId, {
      quotationId,
      isManualOverride: true,
      manualAllocations: allocations,
    });

    return res.status(200).json({
      success: true,
      message: 'Manual split applied and stock locked successfully.',
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fulfillment/backorders
 * List open backorders with customer context
 */
export const getBackorders = async (req, res, next) => {
  try {
    const orgId = req.orgContext.organizationId;
    const { status } = req.query;
    const where = { organization_id: orgId };
    if (status) where.status = status;

    const backorders = await Backorder.findAll({
      where,
      include: [
        {
          model: Quotation,
          as: 'quotation',
          attributes: ['id', 'quotation_number'],
        },
        {
          model: Product,
          as: 'product',
          attributes: ['id', 'sku', 'name'],
        },
        {
          model: Warehouse,
          as: 'target_warehouse',
          attributes: ['id', 'code', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({ success: true, count: backorders.length, data: backorders });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/fulfillment/consolidation-prompts
 * Identifies open backorders with eligible inward stock and parcel status < 'pickpack'
 */
export const getConsolidationPrompts = async (req, res, next) => {
  try {
    const orgId = req.orgContext.organizationId;
    const prompts = await findConsolidationPrompts(orgId);
    return res.status(200).json({ success: true, count: prompts.length, data: prompts });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fulfillment/backorders/:id/consolidate
 * Merges backordered units into active shipment prior to pickpack
 */
export const executeConsolidationAction = async (req, res, next) => {
  try {
    const orgId = req.orgContext.organizationId;
    const { id: backorderId } = req.params;
    const { target_warehouse_id, target_fulfillment_order_id } = req.body;

    if (!target_fulfillment_order_id) {
      return res.status(400).json({
        success: false,
        error: 'target_fulfillment_order_id is required for consolidation.',
      });
    }

    const result = await consolidateBackorder(orgId, {
      backorderId,
      targetWarehouseId: target_warehouse_id,
      targetFulfillmentOrderId: target_fulfillment_order_id,
    });

    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/fulfillment/stock/receive
 * Inward replenishment receipt hook: increases on_hand and flags consolidation opportunities
 */
export const receiveStock = async (req, res, next) => {
  try {
    const orgId = req.orgContext.organizationId;
    const { warehouse_id, product_id, product_variant_id, quantity } = req.body;

    if (!warehouse_id || !product_id || !quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'warehouse_id, product_id, and positive integer quantity required.',
      });
    }

    const updatedStock = await receiveInwardStockReceipt(orgId, {
      warehouseId: warehouse_id,
      productId: product_id,
      productVariantId: product_variant_id,
      quantity: Number(quantity),
    });

    return res.status(200).json({
      success: true,
      message: `Received ${quantity} units inward stock.`,
      data: updatedStock,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/fulfillment/orders/:id/status
 * State machine status updates: draft -> allocated -> assigned -> pickpack -> shipped -> delivered
 */
export const updateOrderStatus = async (req, res, next) => {
  try {
    const orgId = req.orgContext.organizationId;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['draft', 'allocated', 'assigned', 'pickpack', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: `Invalid status: ${status}` });
    }

    const order = await FulfillmentOrder.findOne({ where: { id, organization_id: orgId } });
    if (!order) {
      return res.status(404).json({ success: false, error: `Fulfillment order ${id} not found.` });
    }

    order.status = status;
    if (status === 'shipped' && !order.shipped_at) {
      order.shipped_at = new Date();
    }
    if (status === 'delivered' && !order.delivered_at) {
      order.delivered_at = new Date();
    }

    await order.save();
    return res.status(200).json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
};
