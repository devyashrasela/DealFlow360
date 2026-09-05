import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const Quotation = sequelize.define('Quotation', {
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
  quotation_number: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  stage: {
    type: DataTypes.ENUM('draft', 'pending_approval', 'approved', 'under_negotiation', 'confirmed', 'rejected', 'expired'),
    allowNull: false,
    defaultValue: 'draft',
  },
  assigned_sales_rep_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  price_list_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  gross_total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  total_discount_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  net_subtotal: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  total_tax_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  grand_total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  blended_margin_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  worst_line_excess: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  weighted_margin_bleed: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  blended_risk_score: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  risk_tier: {
    type: DataTypes.ENUM('low_risk_auto', 'medium_risk_manager', 'high_risk_finance'),
    allowNull: false,
    defaultValue: 'low_risk_auto',
  },
  margin_hard_stop_breached: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  customer_counter_total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  customer_counter_discount: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  expiration_date: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  confirmed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  lock_version: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
}, {
  tableName: 'quotations',
  timestamps: true,
  underscored: true,
});

export const QuotationLine = sequelize.define('QuotationLine', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  quotation_id: {
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
  line_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
  unit_list_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: { min: 0 },
  },
  unit_cost_price: {
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
  effective_ceiling_limit: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
  },
  line_excess_points: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  is_over_limit: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  unit_net_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  line_gross_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  line_net_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  line_cost_total: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  line_margin_amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  line_margin_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
  },
}, {
  tableName: 'quotation_lines',
  timestamps: true,
  underscored: true,
});

export const NegotiationThread = sequelize.define('NegotiationThread', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  quotation_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  quotation_line_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  author_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  is_customer_message: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  change_type: {
    type: DataTypes.ENUM('discount_request', 'quantity_change', 'general_inquiry', 'order_counter'),
    allowNull: false,
  },
  proposed_value: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  message_content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('submitted', 'accepted_by_rep', 'rejected_by_rep', 'superseded'),
    allowNull: false,
    defaultValue: 'submitted',
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'negotiation_threads',
  timestamps: true,
  underscored: true,
});

export const QuotationApproval = sequelize.define('QuotationApproval', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  quotation_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  step_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  required_role: {
    type: DataTypes.ENUM('sales_manager', 'finance_ops', 'executive'),
    allowNull: false,
  },
  assigned_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'escalated', 'bypassed'),
    allowNull: false,
    defaultValue: 'pending',
  },
  action_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  action_timestamp: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'quotation_approvals',
  timestamps: true,
  underscored: true,
});

export const ApprovalAuditLog = sequelize.define('ApprovalAuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  quotation_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  actor_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  action_taken: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  blended_risk_score_at_action: {
    type: DataTypes.DECIMAL(6, 2),
    allowNull: false,
  },
  payload_snapshot: {
    type: DataTypes.JSON,
    allowNull: false,
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'approval_audit_logs',
  timestamps: true,
  underscored: true,
  updatedAt: false,
});
