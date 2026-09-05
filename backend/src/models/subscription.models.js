import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  customer_account_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  origin_quotation_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  subscription_code: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'paused', 'pending_proration', 'past_due', 'pending_cancellation', 'cancelled'),
    allowNull: false,
    defaultValue: 'active',
  },
  billing_cadence: {
    type: DataTypes.ENUM('monthly', 'quarterly', 'annual'),
    allowNull: false,
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  current_period_start: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  current_period_end: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  next_invoice_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  mrr_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  arr_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  cancellation_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  lock_version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  transaction_currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'INR',
  },
  exchange_rate_to_base: {
    type: DataTypes.DECIMAL(15, 6),
    allowNull: false,
    defaultValue: 1.000000,
  },
  mrr_amount_transaction: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  arr_amount_transaction: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
}, {
  tableName: 'subscriptions',
  timestamps: true,
  underscored: true,
});

export const SubscriptionLineItem = sequelize.define('SubscriptionLineItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  subscription_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: { min: 0 },
  },
  applied_discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
    validate: { min: 0, max: 100 },
  },
  period_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
}, {
  tableName: 'subscription_line_items',
  timestamps: true,
  underscored: true,
});

export const BillingSchedule = sequelize.define('BillingSchedule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  subscription_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  cycle_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  scheduled_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  base_charge_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  proration_adjustment: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  expected_total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  generated_invoice_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  is_processed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'billing_schedules',
  timestamps: true,
  underscored: true,
  updatedAt: false,
});

export const SubscriptionEvent = sequelize.define('SubscriptionEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  subscription_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  actor_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  event_type: {
    type: DataTypes.ENUM(
      'provisioned',
      'quantity_increase',
      'quantity_decrease',
      'plan_change',
      'paused',
      'resumed',
      'cancelled_period_end',
      'cancelled_immediate'
    ),
    allowNull: false,
  },
  days_remaining_in_cycle: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  total_days_in_cycle: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  prior_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  new_quantity: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  calculated_proration_charge: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  generated_invoice_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'subscription_events',
  timestamps: true,
  underscored: true,
  updatedAt: false,
});
