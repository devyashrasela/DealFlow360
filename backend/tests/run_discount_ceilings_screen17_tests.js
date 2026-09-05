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
  Product,
  ProductVariant,
  Quotation,
  QuotationLine,
  DiscountTierCeiling,
  CategoryCeiling
} from '../src/models/index.js';
import { resolveCeiling, computeLineMath, computeBlendedRisk } from '../src/services/riskEngine.service.js';

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
  console.log('--- Starting Screen 17: Discount Ceilings Test Suite ---');
  const results = [];

  function record(testId, passed, message, data = {}) {
    results.push({ testId, passed, message, data });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testId}: ${message}`);
  }

  try {
    await sequelize.authenticate();
    const timestamp = Date.now();
    const pwdHash = await argon2.hash('Password@123', { type: argon2.argon2id });

    // Setup Org
    const org = await Organization.create({
      legal_name: `Governance Test Org ${timestamp}`,
      slug: `gov-org-${timestamp}`,
      organization_type: 'provider',
      is_active: true,
    });

    // Admin user
    const admin = await User.create({
      email: `gov_admin_${timestamp}@dealflow.com`,
      password_hash: pwdHash,
      full_name: 'Gov Admin',
      is_active: true,
    });
    await OrganizationMembership.create({
      user_id: admin.id,
      organization_id: org.id,
      role: 'admin',
      status: 'active',
    });
    const tokenAdmin = jwt.sign({ sub: admin.id }, JWT_SECRET, { expiresIn: '15m' });
    const headersAdmin = { 'Authorization': `Bearer ${tokenAdmin}`, 'x-organization-id': org.id };

    // Sales Rep user
    const rep = await User.create({
      email: `gov_rep_${timestamp}@dealflow.com`,
      password_hash: pwdHash,
      full_name: 'Gov Rep',
      is_active: true,
    });
    await OrganizationMembership.create({
      user_id: rep.id,
      organization_id: org.id,
      role: 'sales_rep',
      status: 'active',
    });
    const tokenRep = jwt.sign({ sub: rep.id }, JWT_SECRET, { expiresIn: '15m' });
    const headersRep = { 'Authorization': `Bearer ${tokenRep}`, 'x-organization-id': org.id };

    // Sales Manager user
    const manager = await User.create({
      email: `gov_mgr_${timestamp}@dealflow.com`,
      password_hash: pwdHash,
      full_name: 'Gov Manager',
      is_active: true,
    });
    await OrganizationMembership.create({
      user_id: manager.id,
      organization_id: org.id,
      role: 'sales_manager',
      status: 'active',
    });
    const tokenManager = jwt.sign({ sub: manager.id }, JWT_SECRET, { expiresIn: '15m' });
    const headersManager = { 'Authorization': `Bearer ${tokenManager}`, 'x-organization-id': org.id };

    // Finance Ops user
    const finance = await User.create({
      email: `gov_fin_${timestamp}@dealflow.com`,
      password_hash: pwdHash,
      full_name: 'Gov Finance',
      is_active: true,
    });
    await OrganizationMembership.create({
      user_id: finance.id,
      organization_id: org.id,
      role: 'finance_ops',
      status: 'active',
    });
    const tokenFinance = jwt.sign({ sub: finance.id }, JWT_SECRET, { expiresIn: '15m' });
    const headersFinance = { 'Authorization': `Bearer ${tokenFinance}`, 'x-organization-id': org.id };

    // ── 1. Seed Check: Acme Seeded Ceilings (GOV17-01 & GOV17-06) ──
    // Check what the master seed fixture has for Acme
    const acmeOrg = await Organization.findOne({ where: { slug: 'acme-provider' } });
    let acmeTiers = [];
    let acmeCats = [];
    if (acmeOrg) {
      acmeTiers = await DiscountTierCeiling.findAll({ where: { organization_id: acmeOrg.id } });
      acmeCats = await CategoryCeiling.findAll({ where: { organization_id: acmeOrg.id } });
    }
    console.log('Acme seeded tiers:', acmeTiers.map(t => ({ tier: t.tier, max: t.max_discount_percentage })));
    console.log('Acme seeded categories:', acmeCats.map(c => ({ cat: c.category, max: c.max_discount_percentage })));

    const bronzeSeed = acmeTiers.find(t => t.tier === 'bronze');
    const silverSeed = acmeTiers.find(t => t.tier === 'silver');
    const goldSeed = acmeTiers.find(t => t.tier === 'gold');
    const hwSeed = acmeCats.find(c => c.category === 'hardware');
    const svcSeed = acmeCats.find(c => c.category === 'services');
    const subSeed = acmeCats.find(c => c.category === 'subscriptions');

    const seedTierMatchesSpec = bronzeSeed && parseFloat(bronzeSeed.max_discount_percentage) === 5 &&
                                silverSeed && parseFloat(silverSeed.max_discount_percentage) === 10 &&
                                goldSeed && parseFloat(goldSeed.max_discount_percentage) === 15;

    record('GOV17-01', seedTierMatchesSpec, seedTierMatchesSpec
      ? 'Default tier ceilings match spec (Bronze=5%, Silver=10%, Gold=15%)'
      : `Default seeded tier ceilings mismatch spec! Spec expects Bronze=5%, Silver=10%, Gold=15%, but seed has Bronze=${bronzeSeed?.max_discount_percentage}%, Silver=${silverSeed?.max_discount_percentage}%, Gold=${goldSeed?.max_discount_percentage}%`,
      { bronze: bronzeSeed?.max_discount_percentage, silver: silverSeed?.max_discount_percentage, gold: goldSeed?.max_discount_percentage }
    );

    const seedCatMatchesSpec = hwSeed && parseFloat(hwSeed.max_discount_percentage) === 15 &&
                               svcSeed && parseFloat(svcSeed.max_discount_percentage) === 10 &&
                               subSeed && parseFloat(subSeed.max_discount_percentage) === 5;

    record('GOV17-06', seedCatMatchesSpec, seedCatMatchesSpec
      ? 'Default category ceilings match spec (Hardware=15%, Services=10%, Subscriptions=5%)'
      : `Default seeded category ceilings mismatch spec! Spec expects Hardware=15%, Services=10%, Subscriptions=5%, but seed has Hardware=${hwSeed?.max_discount_percentage}%, Services=${svcSeed?.max_discount_percentage}%, Subscriptions=${subSeed?.max_discount_percentage}%`,
      { hw: hwSeed?.max_discount_percentage, svc: svcSeed?.max_discount_percentage, sub: subSeed?.max_discount_percentage }
    );

    // ── 2. Check API property names vs Frontend GovernanceDashboard.jsx binding (GOV17-01_FE, GOV17-06_FE) ──
    // Create initial ceilings for org to test API endpoints
    await DiscountTierCeiling.create({ organization_id: org.id, tier: 'gold', max_discount_percentage: 15 });
    await CategoryCeiling.create({ organization_id: org.id, category: 'hardware', max_discount_percentage: 15 });
    await CategoryCeiling.create({ organization_id: org.id, category: 'services', max_discount_percentage: 10 });
    await CategoryCeiling.create({ organization_id: org.id, category: 'subscriptions', max_discount_percentage: 5 });

    const apiTiers = await api('/governance/tier-ceilings', { headers: headersAdmin });
    const apiCats = await api('/governance/category-ceilings', { headers: headersAdmin });
    
    // Frontend does tc.customer_tier and cc.product_category
    const feTierPropertyBroken = apiTiers.length > 0 && apiTiers[0].customer_tier === undefined && apiTiers[0].tier !== undefined;
    record('GOV17-01_FE', !feTierPropertyBroken, feTierPropertyBroken
      ? 'GovernanceDashboard.jsx line 74 binds {tc.customer_tier} but backend returns {tier}. Table renders blank tier names!'
      : 'Tier property correctly bound in UI');

    const feCatPropertyBroken = apiCats.length > 0 && apiCats[0].product_category === undefined && apiCats[0].category !== undefined;
    record('GOV17-06_FE', !feCatPropertyBroken, feCatPropertyBroken
      ? 'GovernanceDashboard.jsx line 95 binds {cc.product_category} but backend returns {category}. Table renders blank category names!'
      : 'Category property correctly bound in UI');

    // ── 3. Edit Tier Ceiling (GOV17-02) ──
    const updatedGold = await api('/governance/tier-ceilings', {
      method: 'PUT',
      headers: headersAdmin,
      body: { tier: 'gold', max_discount_percentage: 20 }
    });
    const goldMatches20 = parseFloat(updatedGold.max_discount_percentage) === 20;
    record('GOV17-02', goldMatches20, goldMatches20 ? 'Gold tier ceiling successfully edited from 15% to 20%' : 'Failed to update gold tier ceiling');

    // ── 4. Add New Tier (GOV17-03) ──
    let platinumCreated = false;
    let platinumError = null;
    try {
      const resPlatinum = await api('/governance/tier-ceilings', {
        method: 'PUT',
        headers: headersAdmin,
        body: { tier: 'platinum', max_discount_percentage: 25 }
      });
      platinumCreated = !!resPlatinum.id;
    } catch (err) {
      platinumError = err.message;
    }
    record('GOV17-03', platinumCreated, platinumCreated
      ? 'Successfully created new tier (Platinum)'
      : `Cannot add new tier "platinum": backend model has hardcoded ENUM ('standard', 'bronze', 'silver', 'gold', 'custom') and UI lacks add button. Error: ${platinumError}`);

    // ── 5. Invalid Input Handling (GOV17-04) ──
    let negativeRejected = false;
    let over100Rejected = false;
    try {
      await api('/governance/tier-ceilings', {
        method: 'PUT',
        headers: headersAdmin,
        body: { tier: 'gold', max_discount_percentage: -5 }
      });
    } catch (err) {
      negativeRejected = err.status === 400 || err.status === 422 || err.status === 500;
      console.log('Negative % attempt error:', err.status, err.message);
    }

    try {
      await api('/governance/tier-ceilings', {
        method: 'PUT',
        headers: headersAdmin,
        body: { tier: 'gold', max_discount_percentage: 150 }
      });
    } catch (err) {
      over100Rejected = err.status === 400 || err.status === 422 || err.status === 500;
      console.log('Over 100% attempt error:', err.status, err.message);
    }
    record('GOV17-04', negativeRejected && over100Rejected, (negativeRejected && over100Rejected)
      ? 'Out of bounds values (<0 or >100) are rejected by validation'
      : `Out of bounds validation failed: negative rejected=${negativeRejected}, >100 rejected=${over100Rejected}`);

    // ── 6. Delete/Deactivate Tier in Use (GOV17-05) ──
    // Create bronze tier ceiling
    const bronzeCeiling = await api('/governance/tier-ceilings', {
      method: 'PUT',
      headers: headersAdmin,
      body: { tier: 'bronze', max_discount_percentage: 5 }
    });
    // Create customer account with bronze tier
    const buyerOrg = await Organization.create({
      legal_name: `Buyer Org ${timestamp}`,
      slug: `buyer-org-${timestamp}`,
      organization_type: 'buyer',
      is_active: true,
    });
    const custAccount = await CustomerAccount.create({
      provider_organization_id: org.id,
      buyer_organization_id: buyerOrg.id,
      account_number: `ACC-GOV-${timestamp}`,
      pricing_tier: 'bronze',
    });

    // Attempt to delete bronze ceiling
    let bronzeDeleted = false;
    try {
      await api(`/governance/tier-ceilings/${bronzeCeiling.id}`, {
        method: 'DELETE',
        headers: headersAdmin,
      });
      bronzeDeleted = true;
    } catch (err) {
      console.log('Delete tier error:', err.status, err.message);
    }

    // Now test what resolveCeiling does when bronze tier ceiling is missing
    const resolvedWithoutTier = await resolveCeiling(org.id, 'services', 'bronze');
    record('GOV17-05', !bronzeDeleted, bronzeDeleted
      ? `Delete tier ceiling has NO foreign key / assignment check: ceiling was deleted while assigned to customer, and resolveCeiling now silently falls back to category ceiling (${resolvedWithoutTier}%) without warning`
      : 'Delete tier ceiling blocked when actively assigned to customers');

    // ── 7. Edit Category Ceiling (GOV17-07) ──
    const updatedSvc = await api('/governance/category-ceilings', {
      method: 'PUT',
      headers: headersAdmin,
      body: { category: 'services', max_discount_percentage: 8 }
    });
    const svcMatches8 = parseFloat(updatedSvc.max_discount_percentage) === 8;
    record('GOV17-07', svcMatches8, svcMatches8 ? 'Services category ceiling changed to 8%' : 'Failed to change category ceiling');

    // ── 8. Add New Category (GOV17-08) ──
    let warrantyCreated = false;
    let warrantyError = null;
    try {
      const resWarranty = await api('/governance/category-ceilings', {
        method: 'PUT',
        headers: headersAdmin,
        body: { category: 'warranties', max_discount_percentage: 20 }
      });
      warrantyCreated = !!resWarranty.id;
    } catch (err) {
      warrantyError = err.message;
    }
    record('GOV17-08', warrantyCreated, warrantyCreated
      ? 'Successfully created new category (Warranties)'
      : `Cannot add new category "warranties": backend model has hardcoded ENUM ('hardware', 'services', 'subscriptions') and UI lacks add button. Error: ${warrantyError}`);

    // ── 9. Locked Orders Not Affected (GOV17-09) ──
    // Restore ceilings for integration testing
    await api('/governance/tier-ceilings', { method: 'PUT', headers: headersAdmin, body: { tier: 'gold', max_discount_percentage: 15 } });
    await api('/governance/tier-ceilings', { method: 'PUT', headers: headersAdmin, body: { tier: 'bronze', max_discount_percentage: 5 } });
    await api('/governance/category-ceilings', { method: 'PUT', headers: headersAdmin, body: { category: 'services', max_discount_percentage: 10 } });
    await api('/governance/category-ceilings', { method: 'PUT', headers: headersAdmin, body: { category: 'hardware', max_discount_percentage: 15 } });
    await api('/governance/category-ceilings', { method: 'PUT', headers: headersAdmin, body: { category: 'subscriptions', max_discount_percentage: 5 } });

    // Create a price list
    const pList = await PriceList.create({
      organization_id: org.id,
      name: `PriceList ${timestamp}`,
      currency: 'INR',
      tier: 'standard',
      effective_start: new Date(),
      is_active: true
    });

    // Create a quotation with status 'confirmed'
    const quoteLocked = await Quotation.create({
      organization_id: org.id,
      customer_account_id: custAccount.id,
      price_list_id: pList.id,
      expiration_date: new Date(Date.now() + 86400000 * 30),
      assigned_sales_rep_id: admin.id,
      quotation_number: `Q-LOCK-${timestamp}`,
      stage: 'confirmed',
      blended_risk_score: 12.5,
      gross_total: 1000,
      total_discount_amount: 100,
      net_subtotal: 900
    });

    // Change category ceiling
    await api('/governance/category-ceilings', { method: 'PUT', headers: headersAdmin, body: { category: 'services', max_discount_percentage: 2 } });
    const quoteAfter = await Quotation.findByPk(quoteLocked.id);
    const lockedUntouched = quoteAfter.stage === 'confirmed' && parseFloat(quoteAfter.blended_risk_score) === 12.5;
    record('GOV17-09', lockedUntouched, lockedUntouched
      ? 'Confirmed/locked quotation retains original risk score and financials after ceiling changes'
      : 'Locked quotation was mutated by ceiling change');

    // ── 10. Downstream Intersecting Ceilings (GOV17-10, GOV17-11, GOV17-12) ──
    // Reset services back to 10
    await api('/governance/category-ceilings', { method: 'PUT', headers: headersAdmin, body: { category: 'services', max_discount_percentage: 10 } });

    // GOV17-10: Bronze (5%) + Services (10%) -> min(5, 10) = 5%
    const limitBronzeSvc = await resolveCeiling(org.id, 'services', 'bronze');
    record('GOV17-10', limitBronzeSvc === 5, limitBronzeSvc === 5
      ? `Effective limit Bronze + Services = ${limitBronzeSvc}% (correctly resolves min(tier 5%, cat 10%))`
      : `resolveCeiling failed: expected 5%, got ${limitBronzeSvc}%`);

    // GOV17-11: Gold (15%) + Subscriptions (5%) -> min(15, 5) = 5%
    const limitGoldSub = await resolveCeiling(org.id, 'subscriptions', 'gold');
    record('GOV17-11', limitGoldSub === 5, limitGoldSub === 5
      ? `Effective limit Gold + Subscriptions = ${limitGoldSub}% (correctly resolves min(tier 15%, cat 5%))`
      : `resolveCeiling failed: expected 5%, got ${limitGoldSub}%`);

    // GOV17-12: Mixed category quote lines evaluated independently
    const limitGoldHw = await resolveCeiling(org.id, 'hardware', 'gold'); // min(15, 15) = 15%
    const limitGoldSvc = await resolveCeiling(org.id, 'services', 'gold'); // min(15, 10) = 10%
    const mixedLineIndependent = limitGoldHw === 15 && limitGoldSvc === 10;
    record('GOV17-12', mixedLineIndependent, mixedLineIndependent
      ? `Mixed-category lines evaluate independently: Hardware line limit = ${limitGoldHw}%, Services line limit = ${limitGoldSvc}%`
      : `Mixed-category independent evaluation failed: HW=${limitGoldHw}%, SVC=${limitGoldSvc}%`);

    // ── 11. Test Live Quotation Line Addition with Ceiling (GOV17-LIVE-LINE) ──
    // Let's create a draft quotation and add a line using POST /api/quotations/:id/lines
    const prodSvc = await Product.create({
      organization_id: org.id,
      sku: `SVC-TEST-${timestamp}`,
      name: 'Test Services Product',
      category: 'services',
      billing_cadence: 'one_time',
      base_list_price: 1000.00,
      unit_cost: 400.00,
      standard_unit_cost: 400.00,
      is_active: true
    });

    const draftQuote = await Quotation.create({
      organization_id: org.id,
      customer_account_id: custAccount.id, // bronze tier (5% ceiling)
      price_list_id: pList.id,
      expiration_date: new Date(Date.now() + 86400000 * 30),
      assigned_sales_rep_id: admin.id,
      quotation_number: `Q-LIVE-${timestamp}`,
      stage: 'draft'
    });

    let liveLineRes = null;
    let liveLineErr = null;
    try {
      liveLineRes = await api(`/quotations/${draftQuote.id}/lines`, {
        method: 'POST',
        headers: headersAdmin,
        body: {
          product_id: prodSvc.id,
          quantity: 1,
          applied_discount_percentage: 12 // 12% is 7 points over the 5% Bronze ceiling
        }
      });
    } catch (err) {
      liveLineErr = err.message;
    }

    console.log('Live line response:', liveLineRes, 'Live line error:', liveLineErr);
    // Inspect live line fields: ceiling_discount, line_excess_points, is_over_limit
    const liveCeilingSaved = liveLineRes && Number(liveLineRes.ceiling_discount) === 5;
    const liveExcessCalculated = liveLineRes && Number(liveLineRes.line_excess_points) === 7;

    record('GOV17-LIVE-LINE', liveCeilingSaved && liveExcessCalculated, (liveCeilingSaved && liveExcessCalculated)
      ? 'Live quotation line correctly resolves and stores ceiling_discount=5% and line_excess_points=7'
      : `Live quotation line failed: ceiling_discount=${liveLineRes?.ceiling_discount} (expected 5), line_excess_points=${liveLineRes?.line_excess_points} (expected 7). Root cause: resolveCeiling called without await in quotation.controller.js and property names mismatch with computeLineMath!`,
      liveLineRes
    );

    // ── 12. Non-Functional / Integrity Tests ──
    // GOV17-NFR1: Immediate propagation (no stale cache)
    await api('/governance/category-ceilings', { method: 'PUT', headers: headersAdmin, body: { category: 'services', max_discount_percentage: 7 } });
    const limitImmediatelyUpdated = (await resolveCeiling(org.id, 'services', 'gold')) === 7;
    record('GOV17-NFR1', limitImmediatelyUpdated, limitImmediatelyUpdated
      ? 'Ceiling changes propagate immediately to resolveCeiling with zero caching delay'
      : 'Ceiling changes not immediately reflected');

    // GOV17-NFR2: Audit logging on ceiling changes
    // Check if there is an AuditLog table or record created
    let hasAuditLogTable = false;
    let auditLogEntries = 0;
    try {
      const [tableRows] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%audit%'");
      hasAuditLogTable = tableRows.length > 0;
      if (hasAuditLogTable) {
        const [entries] = await sequelize.query(`SELECT count(*) as count FROM ${tableRows[0].name} WHERE organization_id = '${org.id}'`);
        auditLogEntries = entries[0].count;
      }
    } catch (e) {}

    record('GOV17-NFR2', auditLogEntries > 0, auditLogEntries > 0
      ? `Audit log entry created on ceiling change (${auditLogEntries} entries)`
      : 'Audit logging missing: changing discount ceilings produces zero audit log entries in governance controller');

    // GOV17-NFR3: Role-based access enforcement
    // Test Sales Rep:
    let repBlocked = false;
    try {
      await api('/governance/tier-ceilings', { headers: headersRep });
    } catch (err) {
      repBlocked = err.status === 403;
    }

    // Test Finance Ops:
    let finCanRead = false;
    let finCanWrite = false;
    try {
      await api('/governance/tier-ceilings', { headers: headersFinance });
      finCanRead = true;
    } catch (err) {
      finCanRead = false;
    }

    // Test Sales Manager:
    let mgrCanWrite = false;
    try {
      await api('/governance/tier-ceilings', {
        method: 'PUT',
        headers: headersManager,
        body: { tier: 'gold', max_discount_percentage: 16 }
      });
      mgrCanWrite = true;
    } catch (err) {}

    record('GOV17-NFR3', repBlocked && !mgrCanWrite && finCanRead, (repBlocked && !mgrCanWrite && finCanRead)
      ? 'Role enforcement matches spec: Rep blocked (403), Sales Manager cannot write, Finance can read'
      : `Role enforcement permissions issue: Rep blocked=${repBlocked}, Sales Manager can write=${mgrCanWrite} (spec says only Admin should have write access), Finance Ops can read=${finCanRead} (spec says Finance may consult, but is blocked with 403!)`);

    // UI Capabilities Check (GOV17-UI)
    record('GOV17-UI-READONLY', false, 'GovernanceDashboard.jsx is completely static/read-only: lacks Edit inputs, Add Tier button, Add Category button, and Delete actions for discount ceilings');

    console.log('\n--- Summary of Results ---');
    console.log(`Total tests: ${results.length}`);
    console.log(`Passed: ${results.filter(r => r.passed).length}`);
    console.log(`Failed: ${results.filter(r => !r.passed).length}`);

  } catch (error) {
    console.error('Test execution error:', error);
  } finally {
    process.exit(0);
  }
}

runTests();
