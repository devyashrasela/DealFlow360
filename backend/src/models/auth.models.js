import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Organization = sequelize.define('Organization', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  legal_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  trading_name: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  tax_identifier: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  slug: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  organization_type: {
    type: DataTypes.ENUM('provider', 'customer', 'partner'),
    allowNull: false,
    defaultValue: 'provider',
  },
  default_currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
  },
  billing_address: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },
  shipping_address: {
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
  tableName: 'organizations',
  timestamps: true,
  underscored: true,
});

export const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  full_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  phone_number: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  last_login_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
});

export const OrganizationMembership = sequelize.define('OrganizationMembership', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  role: {
    type: DataTypes.ENUM('admin', 'sales_manager', 'sales_rep', 'finance_ops', 'customer_portal'),
    allowNull: false,
  },
  employee_identifier: {
    type: DataTypes.STRING(64),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'invited'),
    allowNull: false,
    defaultValue: 'active',
  },
}, {
  tableName: 'organization_memberships',
  timestamps: true,
  underscored: true,
});

export const CustomerAccount = sequelize.define('CustomerAccount', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  provider_organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  buyer_organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  account_number: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  pricing_tier: {
    type: DataTypes.ENUM('standard', 'bronze', 'silver', 'gold', 'custom'),
    allowNull: false,
    defaultValue: 'bronze',
  },
  default_payment_terms_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30,
  },
  credit_limit: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  assigned_sales_rep_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
}, {
  tableName: 'customer_accounts',
  timestamps: true,
  underscored: true,
});
