import fs from 'fs';

const p = '/home/mium/code/DealFlow360/backend/src/controllers/fulfillment.controller.js';
let content = fs.readFileSync(p, 'utf-8');

// Ensure FulfillmentAllocation is imported
if (!content.includes('FulfillmentAllocation,')) {
    content = content.replace('WarehouseStock,', 'WarehouseStock,\n  FulfillmentAllocation,');
}

// 1. Fix getFulfillmentOrders
const ordersBlockOld = `
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
          model: Quotation,`;

const ordersBlockNew = `
    // warehouse_id filtering must now be done on allocations
    const orders = await FulfillmentOrder.findAll({
      where,
      include: [
        {
          model: FulfillmentAllocation,
          as: 'allocations',
          include: [
            {
              model: Warehouse,
              as: 'warehouse',
              attributes: ['id', 'code', 'name'],
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
            }
          ]
        },
        {
          model: Quotation,`;

content = content.replace(ordersBlockOld, ordersBlockNew);

// Remove the old items include from getFulfillmentOrders
const oldItemsInclude = `
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
        },`;
content = content.replace(oldItemsInclude, '');

// 2. Fix getFulfillmentOrderById
const orderIdBlockOld = `
    const order = await FulfillmentOrder.findOne({
      where: { id, organization_id: orgId },
      include: [
        {
          model: Warehouse,
          as: 'warehouse',
          attributes: ['id', 'code', 'name', 'location_address'],
        },
        {
          model: Quotation,`;

const orderIdBlockNew = `
    const order = await FulfillmentOrder.findOne({
      where: { id, organization_id: orgId },
      include: [
        {
          model: FulfillmentAllocation,
          as: 'allocations',
          include: [
            {
              model: Warehouse,
              as: 'warehouse',
              attributes: ['id', 'code', 'name', 'location_address'],
            },
            {
              model: FulfillmentItem,
              as: 'items',
              include: [{ model: Product, as: 'product' }],
            }
          ]
        },
        {
          model: Quotation,`;

content = content.replace(orderIdBlockOld, orderIdBlockNew);

const oldItemsIncludeId = `
        {
          model: FulfillmentItem,
          as: 'items',
          include: [{ model: Product, as: 'product' }],
        },`;
content = content.replace(oldItemsIncludeId, '');

fs.writeFileSync(p, content, 'utf-8');
console.log('Fixed fulfillment controller');
