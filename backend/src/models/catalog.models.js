import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  sku: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  category: {
    type: DataTypes.ENUM('hardware', 'services', 'subscriptions'),
    allowNull: false,
  },
  billing_cadence: {
    type: DataTypes.ENUM('one_time', 'monthly', 'quarterly', 'annual'),
    allowNull: false,
    defaultValue: 'one_time',
  },
  base_list_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: { min: 0 },
  },
  standard_unit_cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: { min: 0 },
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'products',
  timestamps: true,
  underscored: true,
});

export const ProductVariant = sequelize.define('ProductVariant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  variant_sku: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  variant_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  price_delta: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  cost_delta: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  attributes: {
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
  tableName: 'product_variants',
  timestamps: true,
  underscored: true,
});

export const PriceList = sequelize.define('PriceList', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  tier: {
    type: DataTypes.ENUM('standard', 'bronze', 'silver', 'gold', 'custom'),
    allowNull: false,
    defaultValue: 'standard',
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
  },
  effective_start: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  effective_end: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'price_lists',
  timestamps: true,
  underscored: true,
});

export const PriceListItem = sequelize.define('PriceListItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  price_list_id: {
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
  custom_unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: { min: 0 },
  },
}, {
  tableName: 'price_list_items',
  timestamps: true,
  underscored: true,
});

export const UpsellRule = sequelize.define('UpsellRule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  trigger_product_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  recommended_product_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  priority_rank: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  promotional_discount_percent: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: { min: 0, max: 100 },
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'upsell_rules',
  timestamps: true,
  underscored: true,
});

export const ProductAttachment = sequelize.define('ProductAttachment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  parent_product_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  attached_product_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  is_mandatory: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  quantity_ratio: {
    type: DataTypes.DECIMAL(8, 4),
    allowNull: false,
    defaultValue: 1.0000,
  },
}, {
  tableName: 'product_attachments',
  timestamps: true,
  underscored: true,
});
