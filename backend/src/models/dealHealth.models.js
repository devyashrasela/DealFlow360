import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const DealHealthAlert = sequelize.define('DealHealthAlert', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  anomaly_type: {
    type: DataTypes.ENUM('stalled_deal', 'discount_anomaly', 'delivery_slippage', 'margin_leak'),
    allowNull: false,
  },
  severity: {
    type: DataTypes.ENUM('info', 'warning', 'critical'),
    allowNull: false,
    defaultValue: 'warning',
  },
  quotation_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  fulfillment_order_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  diagnostic_payload: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },
  resolution_status: {
    type: DataTypes.ENUM('active', 'acknowledged', 'escalated', 'resolved', 'dismissed'),
    allowNull: false,
    defaultValue: 'active',
  },
  resolved_by_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'deal_health_alerts',
  timestamps: true,
  underscored: true,
});

export const RepDiscountBaseline = sequelize.define('RepDiscountBaseline', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  sales_rep_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  rolling_window_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 90,
  },
  completed_deal_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  mean_discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  std_dev_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0.00,
  },
  peer_cohort_type: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'user_role',
  },
  peer_cohort_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  cohort_mean_discount_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 8.00,
  },
  cohort_std_dev_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 2.50,
  },
  hierarchical_fallback_level: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'cohort',
  },
  effective_anomaly_threshold: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 11.75,
  },
  last_recalculated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'rep_discount_baselines',
  timestamps: false,
  underscored: true,
});
