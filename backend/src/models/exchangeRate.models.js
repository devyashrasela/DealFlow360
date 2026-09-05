import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

export const ExchangeRate = sequelize.define('ExchangeRate', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  base_currency: { type: DataTypes.STRING(3), allowNull: false, defaultValue: 'INR' },
  target_currency: { type: DataTypes.STRING(3), allowNull: false },
  rate: { type: DataTypes.DECIMAL(15, 6), allowNull: false },
  fetched_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  source: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'exchangerate-api' },
}, {
  tableName: 'exchange_rates',
  timestamps: true,
  underscored: true,
  indexes: [{ unique: true, fields: ['base_currency', 'target_currency'] }],
});

export const ExchangeRateHistory = sequelize.define('ExchangeRateHistory', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  base_currency: { type: DataTypes.STRING(3), allowNull: false },
  target_currency: { type: DataTypes.STRING(3), allowNull: false },
  rate: { type: DataTypes.DECIMAL(15, 6), allowNull: false },
  recorded_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  tableName: 'exchange_rate_history',
  timestamps: false,
  underscored: true,
});
