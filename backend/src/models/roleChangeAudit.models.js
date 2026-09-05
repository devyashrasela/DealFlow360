import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

/**
 * RoleChangeAuditLog model — FR-RBAC-09 & Section 10 of PRD
 * Dedicated, immutable audit log capturing all role promotions, demotions,
 * suspensions, removals, and cross-boundary transitions.
 */
export const RoleChangeAuditLog = sequelize.define('RoleChangeAuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Organization context where role modification occurred',
  },
  membership_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'The membership being changed',
  },
  target_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'The user whose role/status was changed',
  },
  actor_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: 'Admin who performed the change',
  },
  actor_membership_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: 'Admin membership ID at execution time',
  },
  action: {
    type: DataTypes.ENUM('role_change', 'cross_boundary_promotion', 'suspend', 'reactivate', 'remove'),
    allowNull: false,
    defaultValue: 'role_change',
  },
  prior_role: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  new_role: {
    type: DataTypes.STRING(64),
    allowNull: false,
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Mandatory justification for this governed role change',
  },
  is_cross_boundary: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: 'True if moving between customer portal and internal organization roles',
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
}, {
  tableName: 'role_change_audit_logs',
  timestamps: true,
  underscored: true,
  updatedAt: false, // Immutable audit log
  indexes: [
    { fields: ['organization_id'] },
    { fields: ['membership_id'] },
    { fields: ['target_user_id'] },
    { fields: ['created_at'] },
  ],
});

export default RoleChangeAuditLog;
