import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { Op } from 'sequelize';
import {
  sequelize,
  User,
  Organization,
  OrganizationMembership,
  OrganizationRelationship,
  RoleChangeAuditLog,
} from '../src/models/index.js';

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5001/api';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const fetchOpts = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  };
  if (options.body) {
    fetchOpts.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, fetchOpts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.error || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

function makeToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      full_name: user.full_name,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 RUNNING SCREEN 19: RBAC & ROLE PROMOTION AUTHORITY TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const results = [];
  function record(testId, passed, message, data = {}) {
    results.push({ testId, passed, message });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] Test #${testId}: ${message}`);
  }

  try {
    await sequelize.authenticate();
    await RoleChangeAuditLog.sync({ alter: false });

    const timestamp = Date.now();
    const pwdHash = await argon2.hash('SecretPassword@123', { type: argon2.argon2id });

    // ── Setup Organizations ────────────────────────────────────────────────
    const orgA = await Organization.create({
      legal_name: `Alpha Corp ${timestamp}`,
      slug: `alpha-${timestamp}`,
      organization_type: 'provider',
      is_active: true,
    });

    const orgB = await Organization.create({
      legal_name: `Beta Corp ${timestamp}`,
      slug: `beta-${timestamp}`,
      organization_type: 'provider',
      is_active: true,
    });

    const clientOrg = await Organization.create({
      legal_name: `Client Org ${timestamp}`,
      slug: `client-${timestamp}`,
      organization_type: 'customer',
      is_active: true,
    });

    // Bilateral relationship: Alpha Corp <-> Client Org
    await OrganizationRelationship.create({
      provider_organization_id: orgA.id,
      customer_organization_id: clientOrg.id,
      status: 'active',
    });

    // ── Setup Users ────────────────────────────────────────────────────────
    const adminUser = await User.create({
      email: `admin_${timestamp}@alpha.com`,
      full_name: 'Alice Admin',
      password_hash: pwdHash,
      is_active: true,
    });
    const adminMembership = await OrganizationMembership.create({
      organization_id: orgA.id,
      user_id: adminUser.id,
      role: 'admin',
      status: 'active',
    });
    const adminToken = makeToken(adminUser);

    const salesRepUser = await User.create({
      email: `rep_${timestamp}@alpha.com`,
      full_name: 'Bob Rep',
      password_hash: pwdHash,
      is_active: true,
    });
    const salesRepMembership = await OrganizationMembership.create({
      organization_id: orgA.id,
      user_id: salesRepUser.id,
      role: 'sales_rep',
      status: 'active',
    });
    const salesRepToken = makeToken(salesRepUser);

    const salesManagerUser = await User.create({
      email: `manager_${timestamp}@alpha.com`,
      full_name: 'Charlie Manager',
      password_hash: pwdHash,
      is_active: true,
    });
    const salesManagerMembership = await OrganizationMembership.create({
      organization_id: orgA.id,
      user_id: salesManagerUser.id,
      role: 'sales_manager',
      status: 'active',
    });
    const salesManagerToken = makeToken(salesManagerUser);

    const customerUser = await User.create({
      email: `cust_${timestamp}@client.com`,
      full_name: 'David Customer',
      password_hash: pwdHash,
      is_active: true,
    });
    const customerMembership = await OrganizationMembership.create({
      organization_id: clientOrg.id,
      user_id: customerUser.id,
      role: 'customer_portal',
      status: 'active',
    });

    // User belonging to both Org A and Org B
    const dualUser = await User.create({
      email: `dual_${timestamp}@dual.com`,
      full_name: 'Eve Dual',
      password_hash: pwdHash,
      is_active: true,
    });
    const dualMembershipA = await OrganizationMembership.create({
      organization_id: orgA.id,
      user_id: dualUser.id,
      role: 'sales_rep',
      status: 'active',
    });
    const dualMembershipB = await OrganizationMembership.create({
      organization_id: orgB.id,
      user_id: dualUser.id,
      role: 'finance_ops',
      status: 'active',
    });

    // ──────────────────────────────────────────────────────────────────────
    // TEST 1: Standard Promotion (Sales Rep -> Sales Manager)
    // ──────────────────────────────────────────────────────────────────────
    try {
      const res = await api(`/team/members/${salesRepMembership.id}/change-role`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'x-organization-id': orgA.id,
        },
        body: {
          new_role: 'sales_manager',
          reason: 'Promoted after stellar Q3 performance review',
        },
      });

      const updatedMem = await OrganizationMembership.findByPk(salesRepMembership.id);
      const auditLog = await RoleChangeAuditLog.findOne({
        where: {
          membership_id: salesRepMembership.id,
          action: 'role_change',
          new_role: 'sales_manager',
        },
      });

      const passed = updatedMem.role === 'sales_manager' && auditLog && auditLog.actor_user_id === adminUser.id;
      record(1, passed, 'Admin successfully promotes Sales Rep to Sales Manager with audit entry');
    } catch (err) {
      record(1, false, `Standard promotion failed: ${err.message}`);
    }

    // ──────────────────────────────────────────────────────────────────────
    // TEST 2: Non-Admin Rejection (Sales Manager / Rep attempt role change)
    // ──────────────────────────────────────────────────────────────────────
    try {
      let rejected = false;
      try {
        await api(`/team/members/${salesRepMembership.id}/change-role`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${salesManagerToken}`,
            'x-organization-id': orgA.id,
          },
          body: {
            new_role: 'admin',
            reason: 'Attempted self-promotion by manager',
          },
        });
      } catch (err) {
        if (err.status === 403) rejected = true;
      }
      record(2, rejected, 'Non-Admin (Sales Manager) is strictly rejected with 403 Forbidden');
    } catch (err) {
      record(2, false, `Non-admin rejection failed: ${err.message}`);
    }

    // ──────────────────────────────────────────────────────────────────────
    // TEST 3: Cross-Org Authority Boundary
    // ──────────────────────────────────────────────────────────────────────
    try {
      let rejected = false;
      try {
        // Admin of Org A tries to change dualUser's membership in Org B
        await api(`/team/members/${dualMembershipB.id}/change-role`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'x-organization-id': orgA.id,
          },
          body: {
            new_role: 'admin',
            reason: 'Tampering with another org',
          },
        });
      } catch (err) {
        if (err.status === 404 || err.status === 403) rejected = true;
      }

      const memB = await OrganizationMembership.findByPk(dualMembershipB.id);
      const passed = rejected && memB.role === 'finance_ops'; // Unchanged
      record(3, passed, 'Admin of Org A cannot modify memberships in Org B (multi-tenant boundary intact)');
    } catch (err) {
      record(3, false, `Cross-org test failed: ${err.message}`);
    }

    // ──────────────────────────────────────────────────────────────────────
    // TEST 4: Last Admin Protection
    // ──────────────────────────────────────────────────────────────────────
    try {
      let blocked = false;
      try {
        // Sole admin in Org A tries to demote themselves to sales_rep
        await api(`/team/members/${adminMembership.id}/change-role`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'x-organization-id': orgA.id,
          },
          body: {
            new_role: 'sales_rep',
            reason: 'Attempting to demote sole admin',
          },
        });
      } catch (err) {
        if (err.status === 400 && err.message.toLowerCase().includes('sole remaining admin')) {
          blocked = true;
        }
      }

      const checkAdmin = await OrganizationMembership.findByPk(adminMembership.id);
      const passed = blocked && checkAdmin.role === 'admin';
      record(4, passed, 'Demoting sole remaining Admin is blocked with clear error message');
    } catch (err) {
      record(4, false, `Last admin test failed: ${err.message}`);
    }

    // ──────────────────────────────────────────────────────────────────────
    // TEST 5: Cross-Boundary Promotion (Customer to Sales Rep)
    // ──────────────────────────────────────────────────────────────────────
    try {
      const res = await api('/team/members/cross-boundary-promote', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'x-organization-id': orgA.id,
        },
        body: {
          customer_user_id: customerUser.id,
          target_role: 'sales_rep',
          reason: 'Customer account representative hired as full-time internal sales rep',
        },
      });

      // Verify customer membership in clientOrg is suspended
      const custMem = await OrganizationMembership.findByPk(customerMembership.id);
      // Verify internal membership in orgA was created with sales_rep
      const internalMem = await OrganizationMembership.findOne({
        where: { user_id: customerUser.id, organization_id: orgA.id },
      });
      // Verify audit log has is_cross_boundary: true
      const auditLog = await RoleChangeAuditLog.findOne({
        where: {
          target_user_id: customerUser.id,
          action: 'cross_boundary_promotion',
          is_cross_boundary: true,
        },
      });

      const passed =
        custMem.status === 'suspended' &&
        internalMem &&
        internalMem.role === 'sales_rep' &&
        internalMem.status === 'active' &&
        auditLog !== null;

      record(5, passed, 'Customer Portal User successfully promoted across boundary into internal role');
    } catch (err) {
      record(5, false, `Cross-boundary promotion test failed: ${err.message}`);
    }

    // ──────────────────────────────────────────────────────────────────────
    // TEST 6: Immediate Effect Without Re-login
    // ──────────────────────────────────────────────────────────────────────
    try {
      // Direct query of DB reflects updated role immediately without token regeneration
      const checkMem = await OrganizationMembership.findOne({
        where: { user_id: customerUser.id, organization_id: orgA.id, status: 'active' },
      });
      const passed = checkMem !== null && checkMem.role === 'sales_rep';
      record(6, passed, 'Dynamic DB lookup immediately reflects new role without requiring re-login');
    } catch (err) {
      record(6, false, `Immediate effect test failed: ${err.message}`);
    }

    // ──────────────────────────────────────────────────────────────────────
    // TEST 7: Reason Field Required
    // ──────────────────────────────────────────────────────────────────────
    try {
      let rejected = false;
      try {
        await api(`/team/members/${dualMembershipA.id}/change-role`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'x-organization-id': orgA.id,
          },
          body: {
            new_role: 'sales_manager',
            reason: '   ', // empty whitespace
          },
        });
      } catch (err) {
        if (err.status === 400 && err.message.toLowerCase().includes('reason')) {
          rejected = true;
        }
      }
      record(7, rejected, 'Submitting role change with empty reason is rejected with 400 Bad Request');
    } catch (err) {
      record(7, false, `Reason required test failed: ${err.message}`);
    }

    // ──────────────────────────────────────────────────────────────────────
    // TEST 8: Suspend vs. Remove Distinction
    // ──────────────────────────────────────────────────────────────────────
    try {
      // 1. Suspend dualMembershipA
      await api(`/team/members/${dualMembershipA.id}/status`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'x-organization-id': orgA.id,
        },
        body: {
          status: 'suspended',
          reason: 'Temporary compliance audit suspension',
        },
      });

      const suspendedMem = await OrganizationMembership.findByPk(dualMembershipA.id);

      // 2. Reactivate dualMembershipA
      await api(`/team/members/${dualMembershipA.id}/status`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'x-organization-id': orgA.id,
        },
        body: {
          status: 'active',
          reason: 'Compliance audit cleared',
        },
      });

      const activeMem = await OrganizationMembership.findByPk(dualMembershipA.id);

      // 3. Remove dualMembershipA
      await api(`/team/members/${dualMembershipA.id}/status`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'x-organization-id': orgA.id,
        },
        body: {
          status: 'removed',
          reason: 'Employee formal departure',
        },
      });

      const removedMem = await OrganizationMembership.findByPk(dualMembershipA.id);

      const passed =
        suspendedMem.status === 'suspended' &&
        activeMem.status === 'active' &&
        removedMem.status === 'removed' &&
        removedMem.user_id === dualUser.id; // User row still exists

      record(8, passed, 'Suspend, reactivate, and remove statuses correctly enforced while preserving records');
    } catch (err) {
      record(8, false, `Suspend vs Remove test failed: ${err.message}`);
    }

    // ──────────────────────────────────────────────────────────────────────
    // TEST 9: Client-Side Tamper Attempt
    // ──────────────────────────────────────────────────────────────────────
    try {
      let rejected = false;
      try {
        // Sales Rep sends spoofed 'role': 'admin' and spoofed claims in payload
        await api(`/team/members/${salesManagerMembership.id}/change-role`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${salesRepToken}`,
            'x-organization-id': orgA.id,
          },
          body: {
            actor_role: 'admin',
            is_admin: true,
            role: 'admin',
            new_role: 'sales_rep',
            reason: 'Spoofed admin role attempt in body',
          },
        });
      } catch (err) {
        if (err.status === 403) rejected = true;
      }

      record(9, rejected, 'Client-side role spoofing in request body is ignored; server checks DB and rejects');
    } catch (err) {
      record(9, false, `Tamper attempt test failed: ${err.message}`);
    }

    // ──────────────────────────────────────────────────────────────────────
    // TEST 10: Audit Trail Completeness & Non-Repudiation
    // ──────────────────────────────────────────────────────────────────────
    try {
      // Second promotion for salesManagerUser -> Admin
      await api(`/team/members/${salesManagerMembership.id}/change-role`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'x-organization-id': orgA.id,
        },
        body: {
          new_role: 'admin',
          reason: 'Promoted to co-administrator for operational redundancy',
        },
      });

      const logsRes = await api('/team/audit-logs', {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'x-organization-id': orgA.id,
        },
      });

      const logs = logsRes.audit_logs || [];
      const hasTransitions = logs.length >= 4;
      const allHaveReasons = logs.every((l) => Boolean(l.reason && l.reason.trim()));
      const allHaveActors = logs.every((l) => Boolean(l.actor_user_id));

      const passed = hasTransitions && allHaveReasons && allHaveActors;
      record(10, passed, `Audit trail captures all sequential transitions (${logs.length} logged) with reasons and actors`);
    } catch (err) {
      record(10, false, `Audit trail test failed: ${err.message}`);
    }

  } catch (globalErr) {
    console.error('Fatal test error:', globalErr);
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  const total = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = total - passedCount;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(`📊 SCREEN 19 TEST SUMMARY: ${passedCount} PASSED | ${failedCount} FAILED`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
