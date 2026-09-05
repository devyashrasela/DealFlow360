import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

// Rotating refresh token sessions — FR-1.2
export const Session = sequelize.define('Session', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  refresh_token_hash: {
    type: DataTypes.STRING(64),  // SHA-256 hex
    allowNull: false,
    unique: true,
  },
  expires_at: {
    type: DataTypes.DATE,
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
  is_revoked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
  },
}, {
  tableName: 'sessions',
  timestamps: true,
  underscored: true,
});

// Customer invitation tokens — FR-2.2 (SHA-256 hashed, 72h TTL)
export const Invitation = sequelize.define('Invitation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  token_hash: {
    type: DataTypes.STRING(64),   // SHA-256 hex of raw token
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  invited_by_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  organization_id: {       // provider's org
    type: DataTypes.UUID,
    allowNull: false,
  },
  customer_organization_id: {
    type: DataTypes.UUID,
    allowNull: true,        // created if null on accept
  },
  role: {
    type: DataTypes.ENUM('admin', 'sales_manager', 'sales_rep', 'finance_ops', 'customer_portal'),
    allowNull: false,
    defaultValue: 'customer_portal',
  },
  status: {
    type: DataTypes.ENUM('pending', 'accepted', 'expired', 'revoked'),
    allowNull: false,
    defaultValue: 'pending',
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'invitations',
  timestamps: true,
  underscored: true,
});

// Organization-to-organization bilateral relationships — FR-2.1 / FR-3.2
export const OrganizationRelationship = sequelize.define('OrganizationRelationship', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  provider_organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  customer_organization_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'suspended', 'terminated'),
    allowNull: false,
    defaultValue: 'active',
  },
}, {
  tableName: 'organization_relationships',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, name: 'uq_org_rel_prov_cust', fields: ['provider_organization_id', 'customer_organization_id'] }
  ]
});

// ABAC scoping — provider reps restricted to assigned relationships — FR-3.2
export const RelationshipAssignment = sequelize.define('RelationshipAssignment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  relationship_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  membership_id: {        // OrganizationMembership of the sales rep
    type: DataTypes.UUID,
    allowNull: false,
  },
}, {
  tableName: 'relationship_assignments',
  timestamps: true,
  underscored: true,
  indexes: [
    { unique: true, name: 'uq_rel_assign_rel_mem', fields: ['relationship_id', 'membership_id'] }
  ]
});

// Immutable audit trail — FR-5.1
export const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  actor_user_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  actor_membership_id: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  entity_type: {
    type: DataTypes.STRING(64),  // 'quotation', 'membership', 'relationship', etc.
    allowNull: false,
  },
  entity_id: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  action: {
    type: DataTypes.STRING(64),  // 'status_change', 'margin_override', 'invite_sent', etc.
    allowNull: false,
  },
  payload_before: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  payload_after: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
  },
}, {
  tableName: 'audit_logs',
  timestamps: true,
  underscored: true,
  updatedAt: false,   // immutable — no updates
});
