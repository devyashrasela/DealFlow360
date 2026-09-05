import 'dotenv/config';
import { sequelize, User, Organization, OrganizationMembership } from '../src/models/index.js';
import argon2 from 'argon2';

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    const password_hash = await argon2.hash('password123', { type: argon2.argon2id });

    // 1. Create User
    const [user] = await User.findOrCreate({
      where: { email: 'admin@dealflow.com' },
      defaults: {
        password_hash,
        full_name: 'DealFlow Admin',
        phone_number: '555-0100',
        is_active: true
      }
    });

    // 2. Create Provider Org
    const [org] = await Organization.findOrCreate({
      where: { slug: 'acme' },
      defaults: {
        legal_name: 'ACME Corp',
        trading_name: 'ACME',
        organization_type: 'provider',
        is_active: true
      }
    });

    // 3. Create Membership
    await OrganizationMembership.findOrCreate({
      where: { user_id: user.id, organization_id: org.id },
      defaults: {
        role: 'admin',
        employee_identifier: 'EMP-001',
        status: 'active'
      }
    });

    // 4. Create Finance User
    const [financeUser] = await User.findOrCreate({
      where: { email: 'finance@dealflow.com' },
      defaults: {
        password_hash,
        full_name: 'Finance Operator',
        phone_number: '555-0101',
        is_active: true
      }
    });
    
    await OrganizationMembership.findOrCreate({
      where: { user_id: financeUser.id, organization_id: org.id },
      defaults: {
        role: 'finance_ops',
        employee_identifier: 'EMP-002',
        status: 'active'
      }
    });

    console.log('Successfully seeded test users:');
    console.log('1. admin@dealflow.com / password123 (Role: admin)');
    console.log('2. finance@dealflow.com / password123 (Role: finance_ops)');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

seed();
