import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const DiscountTierCeiling = sequelize.define('DiscountTierCeiling', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  tier: {
    type: DataTypes.ENUM('standard', 'bronze', 'silver', 'gold', 'custom'),
    allowNull: false,
  },
  max_discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: { min: 0, max: 100 },
  },
}, {
  tableName: 'discount_tier_ceilings',
  timestamps: true,
  underscored: true,
});

export const CategoryCeiling = sequelize.define('CategoryCeiling', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('hardware', 'services', 'subscriptions'),
    allowNull: false,
  },
  max_discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: { min: 0, max: 100 },
  },
}, {
  tableName: 'category_ceilings',
  timestamps: true,
  underscored: true,
});

export const ApprovalChain = sequelize.define('ApprovalChain', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  risk_tier: {
    type: DataTypes.ENUM('low_risk_auto', 'medium_risk_manager', 'high_risk_finance'),
    allowNull: false,
  },
  min_risk_score: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  max_risk_score: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: true,
  },
  requires_manager_approval: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  requires_finance_approval: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  minimum_upsell_margin_threshold: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 20.00,
  },
  absolute_margin_hard_stop: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 10.00,
  },
}, {
  tableName: 'approval_chains',
  timestamps: true,
  underscored: true,
});

export const ApprovalRule = sequelize.define('ApprovalRule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  approval_chain_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  rule_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  predicate_condition: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  escalate_to_role: {
    type: DataTypes.ENUM('sales_manager', 'finance_ops', 'executive'),
    allowNull: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'approval_rules',
  timestamps: true,
  underscored: true,
});
