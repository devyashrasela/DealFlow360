import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Warehouse = sequelize.define('Warehouse', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING(32),
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  shipping_base_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 25.00,
  },
  shipping_cost_multiplier: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 1.00,
  },
  address: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'warehouses',
  timestamps: true,
  underscored: true,
});

export const WarehouseStock = sequelize.define('WarehouseStock', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  warehouse_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  product_variant_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  on_hand_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  soft_reserved_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  hard_allocated_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: { min: 0 },
  },
  reorder_threshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10,
  },
}, {
  tableName: 'warehouse_stock',
  timestamps: true,
  underscored: true,
  getterMethods: {
    available_to_fulfill() {
      return this.on_hand_quantity - this.soft_reserved_quantity - this.hard_allocated_quantity;
    },
  },
});

export const FulfillmentOrder = sequelize.define('FulfillmentOrder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  quotation_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  fulfillment_number: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('draft', 'allocated', 'assigned', 'pickpack', 'shipped', 'delivered', 'cancelled'),
    allowNull: false,
    defaultValue: 'draft',
  },
  is_manual_override: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  estimated_shipping_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  shipped_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  delivered_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  estimated_delivery_date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'fulfillment_orders',
  timestamps: true,
  underscored: true,
});

export const FulfillmentAllocation = sequelize.define('FulfillmentAllocation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fulfillment_order_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  warehouse_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('allocated', 'picked', 'shipped'),
    allowNull: false,
    defaultValue: 'allocated',
  },
  estimated_shipping_cost: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
}, {
  tableName: 'fulfillment_allocations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
  underscored: true,
});

export const FulfillmentItem = sequelize.define('FulfillmentItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  fulfillment_allocation_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  quotation_line_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  product_variant_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  quantity_allocated: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
}, {
  tableName: 'fulfillment_items',
  timestamps: true,
  underscored: true,
  updatedAt: false,
});

export const Backorder = sequelize.define('Backorder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  quotation_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  quotation_line_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  product_variant_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  backorder_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
  status: {
    type: DataTypes.ENUM('open', 'stock_received_pending_consolidation', 'consolidated', 'cancelled'),
    allowNull: false,
    defaultValue: 'open',
  },
  target_warehouse_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  resolved_fulfillment_order_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'backorders',
  timestamps: true,
  underscored: true,
});
