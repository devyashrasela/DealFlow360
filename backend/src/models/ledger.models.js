import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Invoice = sequelize.define('Invoice', {
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
    allowNull: true,
  },
  origin_subscription_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  invoice_number: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  document_type: {
    type: DataTypes.ENUM('standard_invoice', 'recurring_cycle_invoice', 'proration_invoice', 'credit_note'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('draft', 'posted', 'partially_paid', 'paid', 'credited', 'overdue', 'void'),
    allowNull: false,
    defaultValue: 'posted',
  },
  issue_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  gross_subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  discount_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  tax_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  total_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  amount_paid: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  amount_credited: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  balance_due: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  payment_terms_notes: {
    type: DataTypes.STRING(255),
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
  fx_realized_gain_loss: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
}, {
  tableName: 'invoices',
  timestamps: true,
  underscored: true,
});

export const InvoiceLine = sequelize.define('InvoiceLine', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  invoice_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  product_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  line_description: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  category: {
    type: DataTypes.ENUM('hardware', 'services', 'subscriptions'),
    allowNull: false,
  },
  billing_cadence: {
    type: DataTypes.ENUM('one_time', 'monthly', 'quarterly', 'annual'),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  discount_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  net_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  tax_rate_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  line_total_with_tax: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
}, {
  tableName: 'invoice_lines',
  timestamps: true,
  underscored: true,
  updatedAt: false,
});

export const Payment = sequelize.define('Payment', {
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
  invoice_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  payment_number: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: { min: 0.01 },
  },
  payment_method: {
    type: DataTypes.ENUM('wire_transfer', 'ach_check', 'credit_card', 'credit_note_offset'),
    allowNull: false,
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'succeeded', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'succeeded',
  },
  transaction_reference: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  payment_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  recorded_by_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  transaction_currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'INR',
  },
  amount_in_transaction_currency: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: true,
  },
  exchange_rate_used: {
    type: DataTypes.DECIMAL(15, 6),
    allowNull: true,
  },
  fx_gain_loss: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
}, {
  tableName: 'payments',
  timestamps: true,
  underscored: true,
  updatedAt: false,
});

export const CreditAllocation = sequelize.define('CreditAllocation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  credit_note_invoice_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  target_invoice_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  allocated_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: { min: 0.01 },
  },
  is_origin_debt_offset: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  allocated_by_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  allocated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'credit_allocations',
  timestamps: false,
  underscored: true,
});
