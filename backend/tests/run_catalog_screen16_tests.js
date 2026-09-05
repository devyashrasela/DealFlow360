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
  PriceListItem,
  Product,
  ProductVariant,
  UpsellRule,
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
  console.log('--- Starting Screen 16: Product, Price List & Upsell Admin Test Suite ---');
  const results = [];

  function record(testId, passed, message, data = {}) {
    results.push({ testId, passed, message, data });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testId}: ${message}`);
  }

  try {
    await sequelize.authenticate();

    const timestamp = Date.now();
    const pwdHash = await argon2.hash('Password@123', { type: argon2.argon2id });

    // 1. Setup Admin & Sales Rep for Catalog Testing
    const org = await Organization.create({
      legal_name: `Catalog Org ${timestamp}`,
      slug: `catorg-${timestamp}`,
      organization_type: 'provider',
      is_active: true,
    });

    const admin = await User.create({
      email: `catadmin_${timestamp}@dealflow.com`,
      password_hash: pwdHash,
      full_name: 'Catalog Admin',
      is_active: true,
    });
    await OrganizationMembership.create({
      user_id: admin.id,
      organization_id: org.id,
      role: 'admin',
      status: 'active',
    });
    const adminToken = jwt.sign({ sub: admin.id }, JWT_SECRET, { expiresIn: '15m' });
    const adminHeaders = { 'Authorization': `Bearer ${adminToken}`, 'x-organization-id': org.id };

    const rep = await User.create({
      email: `catrep_${timestamp}@dealflow.com`,
      password_hash: pwdHash,
      full_name: 'Catalog Rep',
      is_active: true,
    });
    await OrganizationMembership.create({
      user_id: rep.id,
      organization_id: org.id,
      role: 'sales_rep',
      status: 'active',
    });
    const repToken = jwt.sign({ sub: rep.id }, JWT_SECRET, { expiresIn: '15m' });
    const repHeaders = { 'Authorization': `Bearer ${repToken}`, 'x-organization-id': org.id };

    // ── 1. Test Product Creation & Retrieval (PRD16-01, PRD16-02) ──
    const productData = {
      sku: `SKU-LAPTOP-${timestamp}`,
      name: 'Enterprise Laptop Pro',
      description: '15-inch high performance workstation',
      category: 'hardware',
      billing_cadence: 'one_time',
      base_list_price: 1200.00,
      standard_unit_cost: 800.00,
    };

    const createdProd = await api('/catalog', {
      method: 'POST',
      headers: adminHeaders,
      body: productData,
    });

    record('PRD16-01', !!createdProd.id && createdProd.sku === productData.sku, `Created product with SKU: ${createdProd.sku}`);

    // Verify getProduct by ID
    try {
      const prodDetail = await api(`/catalog/${createdProd.id}`, { headers: adminHeaders });
      record('PRD16-01_detail', true, `Retrieved product detail for ${prodDetail.name}`);
    } catch (err) {
      record('PRD16-01_detail', false, `GET /catalog/:productId crashed with 500 due to alias mismatch: ${err.message}`);
    }

    // ── 2. Test Variant Creation & Price Delta (PRD16-03, PRD16-04, PRD16-05) ──
    // Spec worked example: Variant "Pack" with Price Delta +$50
    const variantData = {
      variant_sku: `VAR-PACK-${timestamp}`,
      variant_name: 'Pack / Bundle Option',
      price_delta: 50.00,
      cost_delta: 30.00,
      attributes: { pack_type: 'bulk_pack' },
    };

    const createdVariant = await api(`/catalog/${createdProd.id}/variants`, {
      method: 'POST',
      headers: adminHeaders,
      body: variantData,
    });

    record('PRD16-03', !!createdVariant.id && Number(createdVariant.price_delta) === 50.00, `Created variant with price_delta: +$${createdVariant.price_delta}`);

    // Verify variant count incremented
    const listAfterVariant = await api('/catalog', { headers: adminHeaders });
    const prodAfterVariant = listAfterVariant.products?.find(p => p.id === createdProd.id);
    record('PRD16-05', prodAfterVariant?.variants_count === 1, `Variant count updated to 1 (actual: ${prodAfterVariant?.variants_count})`);

    // ── 3. Test Dynamic Price Resolver (PRD16-03 math verification) ──
    // Test base price resolution without variant: Expected $1200
    const baseResolve = await api('/catalog/resolve-price', {
      method: 'POST',
      headers: adminHeaders,
      body: { product_id: createdProd.id },
    });
    record('PRD16-03_base', Number(baseResolve.unit_price) === 1200.00, `Resolved base price: $${baseResolve.unit_price}`);

    // Test variant price delta resolution: Expected $1200 + $50 = $1250
    const variantResolve = await api('/catalog/resolve-price', {
      method: 'POST',
      headers: adminHeaders,
      body: { product_id: createdProd.id, product_variant_id: createdVariant.id },
    });
    record('PRD16-03_variant', Number(variantResolve.unit_price) === 1250.00, `Resolved variant price with +$50 delta: $${variantResolve.unit_price} (expected 1250)`);

    // ── 4. Test Tier-Based Price Lists (PRD16-07 to PRD16-10) ──
    // Create Gold Tier Price List
    const priceListData = {
      name: `Gold Tier Price List ${timestamp}`,
      tier: 'gold',
      currency: 'USD',
      effective_start: new Date(),
    };
    const createdPL = await api('/catalog/price-lists', {
      method: 'POST',
      headers: adminHeaders,
      body: priceListData,
    });
    record('PRD16-07_create_pl', !!createdPL.id, `Created Price List: ${createdPL.name}`);

    // Add custom price item to Price List: e.g. Laptop discounted to $1050 for Gold tier
    const plItemData = {
      product_id: createdProd.id,
      custom_unit_price: 1050.00,
    };
    const createdPLItem = await api(`/catalog/price-lists/${createdPL.id}/items`, {
      method: 'POST',
      headers: adminHeaders,
      body: plItemData,
    });
    record('PRD16-07_create_item', !!createdPLItem.id && Number(createdPLItem.custom_unit_price) === 1050.00, `Added item to price list: $${createdPLItem.custom_unit_price}`);

    // Test Price List Precedence over base catalog price (PRD16-10)
    const tierResolve = await api('/catalog/resolve-price', {
      method: 'POST',
      headers: adminHeaders,
      body: { product_id: createdProd.id, price_list_id: createdPL.id },
    });
    const tierPrecedenceHolds = Number(tierResolve.unit_price) === 1050.00 && tierResolve.source === 'price_list';
    record('PRD16-10', tierPrecedenceHolds, `Price List overrides base catalog price ($1200 -> $${tierResolve.unit_price}, source=${tierResolve.source})`);

    // ── 5. Test Upsell & Cross-Sell Engine Setup (FR-PRD-03, FR-PRD-04, FR-PRD-05 / PRD16-11 to PRD16-17) ──
    // Check if endpoints exist for UpsellRule CRUD in catalog routes
    try {
      await api('/catalog/upsell-rules', { headers: adminHeaders });
      record('PRD16-14', true, 'Upsell rules endpoint exists');
    } catch (err) {
      record('PRD16-14', false, `Upsell rules management endpoint missing from catalog API: ${err.message}`);
    }

    // Check if Minimum Upsell Margin Threshold setting is configurable in catalog
    try {
      await api('/catalog/upsell-config', { headers: adminHeaders });
      record('PRD16-11', true, 'Upsell config / minimum margin threshold endpoint exists');
    } catch (err) {
      record('PRD16-11', false, `Minimum Upsell Margin Threshold configuration missing from catalog admin: ${err.message}`);
    }

    // ── 6. Role-Based Permissions Check (PRD16-20) ──
    // Sales Rep can view catalog
    const repList = await api('/catalog', { headers: repHeaders });
    record('PRD16-20_read', Array.isArray(repList.products), 'Sales Rep has read access to catalog');

    // Sales Rep attempting to create/manage Price List should be forbidden (requireRoles: admin, sales_manager)
    try {
      await api('/catalog/price-lists', {
        method: 'POST',
        headers: repHeaders,
        body: { name: 'Unauthorized PL', currency: 'USD' },
      });
      record('PRD16-20_write', false, 'Sales Rep was erroneously permitted to create price list');
    } catch (err) {
      record('PRD16-20_write', err.status === 403, `Sales Rep correctly forbidden (HTTP ${err.status}) from price list creation`);
    }

    console.log('\n--- Summary of Test Results ---');
    results.forEach(r => console.log(`${r.testId}: ${r.passed ? 'PASS' : 'FAIL'} - ${r.message}`));

  } catch (err) {
    console.error('Test execution error:', err.data || err);
  } finally {
    process.exit(0);
  }
}

runTests();
