import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

// ── Activity Events — cross-module event source ─────────────────────────────
export const ActivityEvent = sequelize.define('ActivityEvent', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  actor_user_id: {
    type: DataTypes.UUID,
    allowNull: true, // NULL for system-generated events
  },
  event_type: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  entity_type: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {},
  },
  severity: {
    type: DataTypes.STRING(16),
    allowNull: false,
    defaultValue: 'info',
    validate: { isIn: [['info', 'warning', 'critical']] },
  },
}, {
  tableName: 'activity_events',
  timestamps: true,
  underscored: true,
  updatedAt: false, // Write-once event log
});

// ── Notifications — per-user delivery queue ─────────────────────────────────
export const Notification = sequelize.define('Notification', {
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
  activity_event_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  dismissed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  updatedAt: false, // Only created_at matters
});
