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
  CustomerAccount,
  PriceList,
  Quotation,
  QuotationLine,
  Product,
  Subscription,
  Invoice,
  FulfillmentOrder,
} from '../src/models/index.js';

const BASE_URL = 'http://localhost:5001/api';
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

async function runTests() {
  console.log('--- Starting Screen 15: Reports & Analytics Test Suite ---');
  const results = [];

  function record(testId, passed, message, data = {}) {
    results.push({ testId, passed, message, data });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testId}: ${message}`);
  }

  try {
    await sequelize.authenticate();

    const timestamp = Date.now();
    const pwdHash = await argon2.hash('Password@123', { type: argon2.argon2id });

    // 1. Setup Org A and Org B
    const orgA = await Organization.create({
      legal_name: `Reports Org A ${timestamp}`,
      slug: `reporg-a-${timestamp}`,
      organization_type: 'provider',
      is_active: true,
    });

    const orgB = await Organization.create({
      legal_name: `Reports Org B ${timestamp}`,
      slug: `reporg-b-${timestamp}`,
      organization_type: 'provider',
      is_active: true,
    });

    // Admin user for Org A
    const adminA = await User.create({
      email: `repadmin_${timestamp}@dealflow.com`,
      password_hash: pwdHash,
      full_name: 'Reports Admin A',
      is_active: true,
    });
    await OrganizationMembership.create({
      user_id: adminA.id,
      organization_id: orgA.id,
      role: 'admin',
      status: 'active',
    });
    const tokenA = jwt.sign({ sub: adminA.id }, JWT_SECRET, { expiresIn: '15m' });
    const headersA = { 'Authorization': `Bearer ${tokenA}`, 'x-organization-id': orgA.id };

    // Sales Rep user for Org A
    const repA = await User.create({
      email: `repuser_${timestamp}@dealflow.com`,
      password_hash: pwdHash,
      full_name: 'Reports Rep A',
      is_active: true,
    });
    await OrganizationMembership.create({
      user_id: repA.id,
      organization_id: orgA.id,
      role: 'sales_rep',
      status: 'active',
    });
    const tokenRepA = jwt.sign({ sub: repA.id }, JWT_SECRET, { expiresIn: '15m' });
    const headersRepA = { 'Authorization': `Bearer ${tokenRepA}`, 'x-organization-id': orgA.id };

    // ── 1. Check KPI Summary Endpoint & Spec Required Metrics (REP15-08 to REP15-10) ──
    const kpiRes = await api('/reports/kpi-summary', { headers: headersA });
    console.log('KPI summary response:', kpiRes);

    const hasTotalBookings = kpiRes.total_bookings !== undefined;
    const hasGrossMargin = kpiRes.average_margin_percentage !== undefined || kpiRes.blended_gross_margin !== undefined;
    const hasDiscountLeakage = kpiRes.total_discount_leakage !== undefined;

    record('REP15-08', hasTotalBookings, hasTotalBookings ? 'Total Bookings metric present' : 'Total Bookings metric missing (backend returns total_pipeline_value instead)');
    record('REP15-09', hasGrossMargin, `Gross Margin metric present: ${kpiRes.average_margin_percentage}%`);
    record('REP15-10', hasDiscountLeakage, hasDiscountLeakage ? 'Total Discount Leakage metric present' : 'Total Discount Leakage metric missing from KPI summary');

    // ── 2. Test Multi-Dimensional Filtering Support (REP15-01 to REP15-07, REP15-11) ──
    // Test if backend KPI summary endpoint respects query parameters
    const filteredKpiRes = await api('/reports/kpi-summary?period=this_week&category=hardware&approval_status=approved', { headers: headersA });
    // In reporting.controller.js, req.query is completely ignored
    const filterIgnored = JSON.stringify(kpiRes) === JSON.stringify(filteredKpiRes);
    record('REP15-01_backend', !filterIgnored, filterIgnored
      ? 'Backend reporting endpoints completely ignore filter query parameters (period, category, rep, status)'
      : 'Backend respects filter parameters');

    // ── 3. Check for Tab 1: Sales Rep & Discount Discipline Report (REP15-12 to REP15-15) ──
    try {
      await api('/reports/sales-rep-discipline', { headers: headersA });
      record('REP15-12', true, 'Sales Rep & Discount Discipline endpoint exists');
    } catch (err) {
      record('REP15-12', false, `Sales Rep & Discount Discipline report endpoint missing: ${err.message}`);
    }

    // ── 4. Check for Tab 2: Product & Category Performance Report (REP15-16 to REP15-18) ──
    try {
      await api('/reports/product-category-performance', { headers: headersA });
      record('REP15-16', true, 'Product & Category Performance endpoint exists');
    } catch (err) {
      record('REP15-16', false, `Product & Category Performance report endpoint missing: ${err.message}`);
    }

    // ── 5. Check for Export Endpoints (REP15-20 to REP15-23) ──
    try {
      await api('/reports/export/pdf', { headers: headersA });
      record('REP15-20', true, 'PDF export endpoint exists');
    } catch (err) {
      record('REP15-20', false, `PDF export endpoint missing: ${err.message}`);
    }

    try {
      await api('/reports/export/xls', { headers: headersA });
      record('REP15-21', true, 'XLS export endpoint exists');
    } catch (err) {
      record('REP15-21', false, `XLS export endpoint missing: ${err.message}`);
    }

    // ── 6. Check Role-Based Access for Sales Rep (REP15-24) ──
    try {
      await api('/reports/kpi-summary', { headers: headersRepA });
      record('REP15-24', true, 'Sales rep can access reports');
    } catch (err) {
      // In reporting.controller.js: requireRoles('admin', 'sales_manager', 'finance_ops')
      record('REP15-24', false, `Sales Rep blocked with HTTP ${err.status} (${err.message}) - lacks role-scoped rep view required by spec`);
    }

    // ── 7. Multi-Tenant Isolation (REP15-NFR2) ──
    const adminB = await User.create({
      email: `repadminb_${timestamp}@dealflow.com`,
      password_hash: pwdHash,
      full_name: 'Reports Admin B',
      is_active: true,
    });
    await OrganizationMembership.create({
      user_id: adminB.id,
      organization_id: orgB.id,
      role: 'admin',
      status: 'active',
    });
    const tokenB = jwt.sign({ sub: adminB.id }, JWT_SECRET, { expiresIn: '15m' });
    const headersB = { 'Authorization': `Bearer ${tokenB}`, 'x-organization-id': orgB.id };

    const kpiB = await api('/reports/kpi-summary', { headers: headersB });
    record('REP15-NFR2', kpiB.total_pipeline_value === 0 && kpiB.active_mrr === 0, `Multi-tenant isolation holds: Org B has empty metrics ($${kpiB.total_pipeline_value})`);

    console.log('\n--- Summary of Test Results ---');
    results.forEach(r => console.log(`${r.testId}: ${r.passed ? 'PASS' : 'FAIL'} - ${r.message}`));

  } catch (err) {
    console.error('Test execution error:', err.data || err);
  } finally {
    process.exit(0);
  }
}

runTests();
