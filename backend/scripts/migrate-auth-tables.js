/**
 * migrate-auth-tables.js
 * Creates new auth extension tables: sessions, invitations,
 * organization_relationships, relationship_assignments, audit_logs
 * Safe to run multiple times (ALTER IF NOT EXISTS style via sync force:false).
 */

import dotenv from 'dotenv';
dotenv.config();

import sequelize from '../src/config/db.js';

// Import new models so Sequelize registers them
import { Session, Invitation, OrganizationRelationship, RelationshipAssignment, AuditLog } from '../src/models/session.models.js';

async function migrate() {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected.');

    console.log('📦 Syncing Session table...');
    await Session.sync({ alter: true });

    console.log('📦 Syncing Invitation table...');
    await Invitation.sync({ alter: true });

    console.log('📦 Syncing OrganizationRelationship table...');
    await OrganizationRelationship.sync({ alter: true });

    console.log('📦 Syncing RelationshipAssignment table...');
    await RelationshipAssignment.sync({ alter: true });

    console.log('📦 Syncing AuditLog table...');
    await AuditLog.sync({ alter: true });

    // Safe column migrations for existing tables
    const [foCols] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'fulfillment_orders' AND COLUMN_NAME = 'estimated_delivery_date'
    `);
    if (foCols.length === 0) {
      console.log('📦 Adding estimated_delivery_date to fulfillment_orders...');
      await sequelize.query('ALTER TABLE fulfillment_orders ADD COLUMN estimated_delivery_date DATETIME NULL');
    }

    const [aalCols] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'approval_audit_logs' AND COLUMN_NAME = 'organization_id'
    `);
    if (aalCols.length === 0) {
      console.log('📦 Adding organization_id to approval_audit_logs...');
      await sequelize.query('ALTER TABLE approval_audit_logs ADD COLUMN organization_id CHAR(36) BINARY NULL');
    }

    console.log('✅ All auth extension tables created/updated successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
