/**
 * DealFlow360 — Complete, Deterministic & Idempotent Master Seed Fixture
 * Populates all 39 database models with realistic B2B commercial operations data.
 * 
 * Run: npm run seed (or node src/seeds/seed.js)
 */
import dotenv from 'dotenv';
dotenv.config();

import argon2 from 'argon2';
import crypto from 'crypto';
import sequelize from '../config/db.js';

// Domain Models
import {
  Organization,
  User,
  OrganizationMembership,
  CustomerAccount,
  Product,
  ProductVariant,
  PriceList,
  PriceListItem,
  UpsellRule,
  ProductAttachment,
  DiscountTierCeiling,
  CategoryCeiling,
  ApprovalChain,
  ApprovalRule,
  Quotation,
  QuotationLine,
  NegotiationThread,
  QuotationApproval,
  ApprovalAuditLog,
  Warehouse,
  WarehouseStock,
  FulfillmentOrder,
  FulfillmentItem,
  Backorder,
  Subscription,
  SubscriptionLineItem,
  BillingSchedule,
  SubscriptionEvent,
  Invoice,
  InvoiceLine,
  Payment,
  CreditAllocation,
  DealHealthAlert,
  RepDiscountBaseline,
  Session,
  Invitation,
  OrganizationRelationship,
  RelationshipAssignment,
  AuditLog,
} from '../models/index.js';

import {
  computeLineMath,
  computeBlendedRisk,
  resolveCeiling,
} from '../services/riskEngine.service.js';

const hashToken = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

export async function seedDatabase() {
  console.log('🔄 Resetting database schema (force sync)...');
  await sequelize.sync({ force: true });
  console.log('🌱 Generating complete, realistic B2B demo dataset...');

  const hashPassword = async (pwd) => await argon2.hash(pwd, { type: argon2.argon2id });

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. ORGANIZATIONS (Multi-Tenancy)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('  -> Seeding Organizations...');
  
  // Primary Provider Organization
  const acme = await Organization.create({
    legal_name: 'Acme Cloud & Logistics Corp',
    trading_name: 'Acme Global',
    tax_identifier: 'US-EIN-12-3456789',
    slug: 'acme-corp',
    organization_type: 'provider',
    default_currency: 'USD',
    billing_address: { line1: '500 Technology Square', city: 'Cambridge', state: 'MA', zip: '02139', country: 'US' },
    shipping_address: { line1: '500 Technology Square', city: 'Cambridge', state: 'MA', zip: '02139', country: 'US' },
    is_active: true,
  });

  // Secondary Provider (demonstrates strict tenant isolation)
  const nexus = await Organization.create({
    legal_name: 'Nexus Industrial Solutions LLC',
    trading_name: 'Nexus Industrial',
    tax_identifier: 'US-EIN-98-7654321',
    slug: 'nexus-solutions',
    organization_type: 'provider',
    default_currency: 'USD',
    billing_address: { line1: '1200 Manufacturing Way', city: 'Detroit', state: 'MI', zip: '48201', country: 'US' },
    shipping_address: { line1: '1200 Manufacturing Way', city: 'Detroit', state: 'MI', zip: '48201', country: 'US' },
    is_active: true,
  });

  // Buyer Organizations (Customers)
  const apex = await Organization.create({
    legal_name: 'Apex Advanced Manufacturing Corp',
    trading_name: 'Apex Mfg',
    tax_identifier: 'US-EIN-33-4455667',
    slug: 'apex-mfg',
    organization_type: 'customer',
    default_currency: 'USD',
    billing_address: { line1: '880 Industrial Parkway', city: 'Austin', state: 'TX', zip: '78701', country: 'US' },
    shipping_address: { line1: '880 Industrial Parkway', city: 'Austin', state: 'TX', zip: '78701', country: 'US' },
    is_active: true,
  });

  const northstar = await Organization.create({
    legal_name: 'Northstar Retail Logistics Group',
    trading_name: 'Northstar Retail',
    tax_identifier: 'US-EIN-44-5566778',
    slug: 'northstar-retail',
    organization_type: 'customer',
    default_currency: 'USD',
    billing_address: { line1: '100 Commerce Blvd', city: 'Chicago', state: 'IL', zip: '60601', country: 'US' },
    shipping_address: { line1: '100 Commerce Blvd', city: 'Chicago', state: 'IL', zip: '60601', country: 'US' },
    is_active: true,
  });

  const bluepeak = await Organization.create({
    legal_name: 'BluePeak Energy & Logistics Ltd',
    trading_name: 'BluePeak Logistics',
    tax_identifier: 'US-EIN-55-6677889',
    slug: 'bluepeak-logistics',
    organization_type: 'customer',
    default_currency: 'USD',
    billing_address: { line1: '750 Harbourfront Way', city: 'Seattle', state: 'WA', zip: '98101', country: 'US' },
    shipping_address: { line1: '750 Harbourfront Way', city: 'Seattle', state: 'WA', zip: '98101', country: 'US' },
    is_active: true,
  });

  const meridian = await Organization.create({
    legal_name: 'Meridian Global Health Systems',
    trading_name: 'Meridian Health',
    tax_identifier: 'US-EIN-66-7788990',
    slug: 'meridian-health',
    organization_type: 'customer',
    default_currency: 'USD',
    billing_address: { line1: '320 Medical Center Dr', city: 'Atlanta', state: 'GA', zip: '30301', country: 'US' },
    shipping_address: { line1: '320 Medical Center Dr', city: 'Atlanta', state: 'GA', zip: '30301', country: 'US' },
    is_active: true,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. USERS & MEMBERSHIPS (Role Separation)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('  -> Seeding Users & Memberships...');

  const users = await User.bulkCreate([
    { email: 'admin@acme.com', password_hash: await hashPassword('admin123'), full_name: 'Alex Sharma', phone_number: '+1-617-555-0101' },
    { email: 'manager@acme.com', password_hash: await hashPassword('manager123'), full_name: 'Sarah Kim', phone_number: '+1-617-555-0102' },
    { email: 'sales.lead@acme.com', password_hash: await hashPassword('manager123'), full_name: 'Michael Chen', phone_number: '+1-617-555-0103' },
    { email: 'finance@acme.com', password_hash: await hashPassword('finance123'), full_name: 'Priya Desai', phone_number: '+1-617-555-0104' },
    { email: 'rep@acme.com', password_hash: await hashPassword('rep123'), full_name: 'Dev Patel', phone_number: '+1-617-555-0105' },
    { email: 'jessica.rep@acme.com', password_hash: await hashPassword('rep123'), full_name: 'Jessica Wong', phone_number: '+1-617-555-0106' },
    { email: 'omar.rep@acme.com', password_hash: await hashPassword('rep123'), full_name: 'Omar Hassan', phone_number: '+1-617-555-0107' },
    { email: 'portal@apex.com', password_hash: await hashPassword('portal123'), full_name: 'Rita Gupta', phone_number: '+1-512-555-0188' },
    { email: 'portal@northstar.com', password_hash: await hashPassword('portal123'), full_name: 'Marcus Vance', phone_number: '+1-312-555-0199' },
    { email: 'admin@nexus.com', password_hash: await hashPassword('admin123'), full_name: 'David Miller', phone_number: '+1-313-555-0150' },
  ]);

  const [uAdmin, uManager, uManager2, uFinance, uRepDev, uRepJessica, uRepOmar, uPortalApex, uPortalNorthstar, uNexusAdmin] = users;

  const memberships = await OrganizationMembership.bulkCreate([
    { organization_id: acme.id, user_id: uAdmin.id, role: 'admin', employee_identifier: 'EMP-001', status: 'active' },
    { organization_id: acme.id, user_id: uManager.id, role: 'sales_manager', employee_identifier: 'EMP-002', status: 'active' },
    { organization_id: acme.id, user_id: uManager2.id, role: 'sales_manager', employee_identifier: 'EMP-003', status: 'active' },
    { organization_id: acme.id, user_id: uFinance.id, role: 'finance_ops', employee_identifier: 'EMP-004', status: 'active' },
    { organization_id: acme.id, user_id: uRepDev.id, role: 'sales_rep', employee_identifier: 'EMP-005', status: 'active' },
    { organization_id: acme.id, user_id: uRepJessica.id, role: 'sales_rep', employee_identifier: 'EMP-006', status: 'active' },
    { organization_id: acme.id, user_id: uRepOmar.id, role: 'sales_rep', employee_identifier: 'EMP-007', status: 'active' },
    { organization_id: apex.id, user_id: uPortalApex.id, role: 'customer_portal', status: 'active' },
    { organization_id: northstar.id, user_id: uPortalNorthstar.id, role: 'customer_portal', status: 'active' },
    { organization_id: nexus.id, user_id: uNexusAdmin.id, role: 'admin', employee_identifier: 'NEX-001', status: 'active' },
  ]);

  const [mAdmin, mManager, mManager2, mFinance, mRepDev, mRepJessica, mRepOmar, mPortalApex, mPortalNorthstar, mNexusAdmin] = memberships;

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. BILATERAL RELATIONSHIPS & CUSTOMER ACCOUNTS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('  -> Seeding Bilateral Relationships & Customer Accounts...');

  const relApex = await OrganizationRelationship.create({
    provider_organization_id: acme.id, customer_organization_id: apex.id, status: 'active',
  });
  const relNorthstar = await OrganizationRelationship.create({
    provider_organization_id: acme.id, customer_organization_id: northstar.id, status: 'active',
  });
  const relBluePeak = await OrganizationRelationship.create({
    provider_organization_id: acme.id, customer_organization_id: bluepeak.id, status: 'active',
  });
  const relMeridian = await OrganizationRelationship.create({
    provider_organization_id: acme.id, customer_organization_id: meridian.id, status: 'active',
  });

  // ABAC assignments
  await RelationshipAssignment.bulkCreate([
    { relationship_id: relApex.id, membership_id: mRepDev.id },
    { relationship_id: relNorthstar.id, membership_id: mRepJessica.id },
    { relationship_id: relBluePeak.id, membership_id: mRepOmar.id },
    { relationship_id: relMeridian.id, membership_id: mRepDev.id },
  ]);

  // Customer Accounts
  const accountApex = await CustomerAccount.create({
    provider_organization_id: acme.id, buyer_organization_id: apex.id,
    account_number: 'CUST-APEX-001', pricing_tier: 'gold', default_payment_terms_days: 30, credit_limit: 150000.00, assigned_sales_rep_id: uRepDev.id,
  });
  const accountNorthstar = await CustomerAccount.create({
    provider_organization_id: acme.id, buyer_organization_id: northstar.id,
    account_number: 'CUST-NORTH-002', pricing_tier: 'silver', default_payment_terms_days: 30, credit_limit: 100000.00, assigned_sales_rep_id: uRepJessica.id,
  });
  const accountBluePeak = await CustomerAccount.create({
    provider_organization_id: acme.id, buyer_organization_id: bluepeak.id,
    account_number: 'CUST-BLUE-003', pricing_tier: 'bronze', default_payment_terms_days: 15, credit_limit: 50000.00, assigned_sales_rep_id: uRepOmar.id,
  });
  const accountMeridian = await CustomerAccount.create({
    provider_organization_id: acme.id, buyer_organization_id: meridian.id,
    account_number: 'CUST-MERID-004', pricing_tier: 'custom', default_payment_terms_days: 45, credit_limit: 250000.00, assigned_sales_rep_id: uRepDev.id,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. CATALOG & PRICING
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('  -> Seeding Products, Variants & Price Lists...');

  const products = await Product.bulkCreate([
    // Hardware
    { organization_id: acme.id, sku: 'HW-SRV-001', name: 'Enterprise HyperScale Server 2U', description: 'Dual Xeon rackmount compute server with redundant PSU', category: 'hardware', billing_cadence: 'one_time', base_list_price: 12500.00, standard_unit_cost: 8200.00, is_active: true },
    { organization_id: acme.id, sku: 'HW-NET-002', name: 'NextGen Security Firewall Appliance', description: 'Gigabit throughput hardware firewall with deep packet inspection', category: 'hardware', billing_cadence: 'one_time', base_list_price: 4800.00, standard_unit_cost: 2900.00, is_active: true },
    { organization_id: acme.id, sku: 'HW-IOT-003', name: 'Industrial IoT Edge Gateway', description: 'Ruggedized edge compute gateway for telemetry & PLC connectivity', category: 'hardware', billing_cadence: 'one_time', base_list_price: 2400.00, standard_unit_cost: 1400.00, is_active: true },
    // Services
    { organization_id: acme.id, sku: 'SVC-ARC-001', name: 'Cloud Architecture & Setup', description: 'Full architectural deployment, VPC peering, and landing zone setup', category: 'services', billing_cadence: 'one_time', base_list_price: 6000.00, standard_unit_cost: 3200.00, is_active: true },
    { organization_id: acme.id, sku: 'SVC-SEC-002', name: 'Infrastructure Security Hardening', description: 'Zero-trust network configuration and SOC2 audit readiness', category: 'services', billing_cadence: 'one_time', base_list_price: 4500.00, standard_unit_cost: 2100.00, is_active: true },
    { organization_id: acme.id, sku: 'SVC-TRN-003', name: 'DevOps & SRE Team Training', description: '3-day technical enablement on operations and incident response', category: 'services', billing_cadence: 'one_time', base_list_price: 2500.00, standard_unit_cost: 900.00, is_active: true },
    // Subscriptions
    { organization_id: acme.id, sku: 'SUB-PLT-001', name: 'DealFlow Cloud Platform License', description: 'Enterprise SaaS platform per seat/node monthly subscription', category: 'subscriptions', billing_cadence: 'monthly', base_list_price: 899.00, standard_unit_cost: 320.00, is_active: true },
    { organization_id: acme.id, sku: 'SUB-MON-002', name: '24/7 Managed SRE Monitoring Suite', description: 'Real-time telemetry, automated healing, and 15-minute SLA dispatch', category: 'subscriptions', billing_cadence: 'monthly', base_list_price: 499.00, standard_unit_cost: 160.00, is_active: true },
  ]);

  const [hwServer, hwFirewall, hwIoT, svcArch, svcSec, svcTrain, subPlatform, subMonitoring] = products;

  // Variants
  const variants = await ProductVariant.bulkCreate([
    { product_id: hwServer.id, variant_sku: 'HW-SRV-001-32C', variant_name: '32-Core / 128GB RAM', price_delta: 2500.00, cost_delta: 1600.00, attributes: { cpu: '32-Core', ram: '128GB ECC', storage: '4TB NVMe' } },
    { product_id: hwServer.id, variant_sku: 'HW-SRV-001-64C', variant_name: '64-Core / 256GB RAM', price_delta: 6000.00, cost_delta: 3800.00, attributes: { cpu: '64-Core', ram: '256GB ECC', storage: '8TB NVMe' } },
    { product_id: hwFirewall.id, variant_sku: 'HW-NET-002-HA', variant_name: 'High Availability Dual-Unit Pair', price_delta: 4200.00, cost_delta: 2600.00, attributes: { redundancy: 'Active-Standby Pair' } },
    { product_id: subPlatform.id, variant_sku: 'SUB-PLT-001-ENT', variant_name: 'Enterprise Tier (Unlimited Storage)', price_delta: 350.00, cost_delta: 100.00, attributes: { tier: 'Enterprise', retention: '365 Days' } },
  ]);

  const [varServer32, varServer64, varFirewallHA, varPlatformEnt] = variants;

  // Price Lists
  const plGold = await PriceList.create({
    organization_id: acme.id, name: 'Gold Tier Commercial Schedule 2026', tier: 'gold', currency: 'USD', effective_start: new Date('2026-01-01'), effective_end: new Date('2026-12-31'), is_active: true,
  });
  const plSilver = await PriceList.create({
    organization_id: acme.id, name: 'Silver Standard Schedule 2026', tier: 'silver', currency: 'USD', effective_start: new Date('2026-01-01'), effective_end: new Date('2026-12-31'), is_active: true,
  });

  await PriceListItem.bulkCreate([
    { price_list_id: plGold.id, product_id: hwServer.id, custom_unit_price: 11500.00 }, // 8% discount
    { price_list_id: plGold.id, product_id: hwFirewall.id, custom_unit_price: 4400.00 },
    { price_list_id: plGold.id, product_id: svcArch.id, custom_unit_price: 5400.00 },
    { price_list_id: plGold.id, product_id: subPlatform.id, custom_unit_price: 820.00 },
    { price_list_id: plSilver.id, product_id: hwServer.id, custom_unit_price: 12000.00 },
    { price_list_id: plSilver.id, product_id: hwFirewall.id, custom_unit_price: 4600.00 },
  ]);

  // Upsell Rules
  await UpsellRule.bulkCreate([
    { organization_id: acme.id, trigger_product_id: hwServer.id, recommended_product_id: svcSec.id, priority_rank: 1, promotional_discount_percent: 10.00, is_active: true },
    { organization_id: acme.id, trigger_product_id: hwServer.id, recommended_product_id: svcTrain.id, priority_rank: 2, promotional_discount_percent: 5.00, is_active: true },
    { organization_id: acme.id, trigger_product_id: hwIoT.id, recommended_product_id: subPlatform.id, priority_rank: 1, promotional_discount_percent: 15.00, is_active: true },
  ]);

  // Product Attachments
  await ProductAttachment.bulkCreate([
    { organization_id: acme.id, parent_product_id: hwServer.id, attached_product_id: hwFirewall.id, is_mandatory: false, quantity_ratio: 1.0000 },
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. GOVERNANCE (Ceilings & Approval Chains)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('  -> Seeding Governance Policies...');

  await DiscountTierCeiling.bulkCreate([
    { organization_id: acme.id, tier: 'standard', max_discount_percentage: 0.00 },
    { organization_id: acme.id, tier: 'bronze', max_discount_percentage: 5.00 },
    { organization_id: acme.id, tier: 'silver', max_discount_percentage: 10.00 },
    { organization_id: acme.id, tier: 'gold', max_discount_percentage: 15.00 },
    { organization_id: acme.id, tier: 'custom', max_discount_percentage: 25.00 },
  ]);

  await CategoryCeiling.bulkCreate([
    { organization_id: acme.id, category: 'hardware', max_discount_percentage: 15.00 },
    { organization_id: acme.id, category: 'services', max_discount_percentage: 10.00 },
    { organization_id: acme.id, category: 'subscriptions', max_discount_percentage: 5.00 },
  ]);

  const chains = await ApprovalChain.bulkCreate([
    { organization_id: acme.id, risk_tier: 'low_risk_auto', min_risk_score: 0.00, max_risk_score: 0.00, requires_manager_approval: false, requires_finance_approval: false, minimum_upsell_margin_threshold: 20.00, absolute_margin_hard_stop: 10.00 },
    { organization_id: acme.id, risk_tier: 'medium_risk_manager', min_risk_score: 0.01, max_risk_score: 5.00, requires_manager_approval: true, requires_finance_approval: false, minimum_upsell_margin_threshold: 20.00, absolute_margin_hard_stop: 10.00 },
    { organization_id: acme.id, risk_tier: 'high_risk_finance', min_risk_score: 5.01, max_risk_score: null, requires_manager_approval: true, requires_finance_approval: true, minimum_upsell_margin_threshold: 20.00, absolute_margin_hard_stop: 10.00 },
  ]);

  await ApprovalRule.bulkCreate([
    { approval_chain_id: chains[1].id, rule_name: 'Manager Review for Modest Ceiling Excess', predicate_condition: { score_range: [0.01, 5.0] }, escalate_to_role: 'sales_manager', is_active: true },
    { approval_chain_id: chains[2].id, rule_name: 'Finance Review for Heavy Margin Bleed', predicate_condition: { score_range: [5.01, 999] }, escalate_to_role: 'finance_ops', is_active: true },
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. WAREHOUSES & STOCK INVENTORY
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('  -> Seeding Warehouses & Stock Balances...');

  const whEast = await Warehouse.create({
    organization_id: acme.id, code: 'WH-EAST', name: 'East Coast Distribution Center', shipping_base_fee: 250.00, shipping_cost_multiplier: 1.00, address: { city: 'Boston', state: 'MA', country: 'US' }, is_active: true,
  });
  const whWest = await Warehouse.create({
    organization_id: acme.id, code: 'WH-WEST', name: 'West Coast Logistics Hub', shipping_base_fee: 350.00, shipping_cost_multiplier: 1.15, address: { city: 'San Francisco', state: 'CA', country: 'US' }, is_active: true,
  });
  const whCentral = await Warehouse.create({
    organization_id: acme.id, code: 'WH-CENTRAL', name: 'Central Depot & Depot Reserve', shipping_base_fee: 200.00, shipping_cost_multiplier: 1.05, address: { city: 'Chicago', state: 'IL', country: 'US' }, is_active: true,
  });

  // Balanced Stock: on_hand >= soft_reserved + hard_allocated
  await WarehouseStock.bulkCreate([
    // WH-EAST
    { warehouse_id: whEast.id, product_id: hwServer.id, on_hand_quantity: 35, soft_reserved_quantity: 4, hard_allocated_quantity: 6, reorder_threshold: 10 },
    { warehouse_id: whEast.id, product_id: hwFirewall.id, on_hand_quantity: 50, soft_reserved_quantity: 2, hard_allocated_quantity: 8, reorder_threshold: 15 },
    { warehouse_id: whEast.id, product_id: hwIoT.id, on_hand_quantity: 80, soft_reserved_quantity: 5, hard_allocated_quantity: 10, reorder_threshold: 20 },
    // WH-WEST
    { warehouse_id: whWest.id, product_id: hwServer.id, on_hand_quantity: 20, soft_reserved_quantity: 2, hard_allocated_quantity: 4, reorder_threshold: 8 },
    { warehouse_id: whWest.id, product_id: hwFirewall.id, on_hand_quantity: 30, soft_reserved_quantity: 3, hard_allocated_quantity: 5, reorder_threshold: 10 },
    { warehouse_id: whWest.id, product_id: hwIoT.id, on_hand_quantity: 45, soft_reserved_quantity: 0, hard_allocated_quantity: 5, reorder_threshold: 15 },
    // WH-CENTRAL (Low stock on server to demonstrate split & backorders)
    { warehouse_id: whCentral.id, product_id: hwServer.id, on_hand_quantity: 5, soft_reserved_quantity: 1, hard_allocated_quantity: 2, reorder_threshold: 10 },
    { warehouse_id: whCentral.id, product_id: hwFirewall.id, on_hand_quantity: 40, soft_reserved_quantity: 0, hard_allocated_quantity: 4, reorder_threshold: 12 },
    { warehouse_id: whCentral.id, product_id: hwIoT.id, on_hand_quantity: 60, soft_reserved_quantity: 2, hard_allocated_quantity: 6, reorder_threshold: 15 },
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. REP DISCOUNT BASELINES (Statistical Health Benchmarks)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('  -> Seeding Rep Discount Baselines...');

  await RepDiscountBaseline.bulkCreate([
    { organization_id: acme.id, sales_rep_id: uRepDev.id, completed_deal_count: 24, mean_discount_percentage: 7.50, std_dev_percentage: 2.10, cohort_mean_discount_percentage: 8.00, cohort_std_dev_percentage: 2.50, hierarchical_fallback_level: 'personal', effective_anomaly_threshold: 11.70, last_recalculated_at: new Date() },
    { organization_id: acme.id, sales_rep_id: uRepJessica.id, completed_deal_count: 18, mean_discount_percentage: 6.80, std_dev_percentage: 1.90, cohort_mean_discount_percentage: 8.00, cohort_std_dev_percentage: 2.50, hierarchical_fallback_level: 'cohort', effective_anomaly_threshold: 11.75, last_recalculated_at: new Date() },
    { organization_id: acme.id, sales_rep_id: uRepOmar.id, completed_deal_count: 9, mean_discount_percentage: 5.20, std_dev_percentage: 1.50, cohort_mean_discount_percentage: 8.00, cohort_std_dev_percentage: 2.50, hierarchical_fallback_level: 'cohort', effective_anomaly_threshold: 11.75, last_recalculated_at: new Date() },
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 8. QUOTATIONS & DEAL LIFECYCLE (All UI States)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('  -> Seeding Quotations & Mathematical Line Items...');

  const now = new Date();
  const dateIn = (days) => new Date(now.getTime() + days * 86400000);
  const dateAgo = (days) => new Date(now.getTime() - days * 86400000);

  // Helper to build rigorously calculated lines
  const buildLines = (quoteId, tier, lineDefs) => {
    return lineDefs.map((def, idx) => {
      const ceiling = def.category === 'hardware' ? 15 : def.category === 'services' ? 10 : 5;
      const effectiveCeiling = tier === 'gold' ? Math.min(15, ceiling) : tier === 'silver' ? Math.min(10, ceiling) : tier === 'bronze' ? Math.min(5, ceiling) : ceiling;
      const math = computeLineMath({
        unit_list_price: def.unit_list_price,
        unit_cost_price: def.unit_cost_price,
        quantity: def.quantity,
        applied_discount_percentage: def.discount,
        effective_ceiling_limit: effectiveCeiling,
      });

      return {
        quotation_id: quoteId,
        product_id: def.product.id,
        product_variant_id: def.variant ? def.variant.id : null,
        line_number: idx + 1,
        category: def.category,
        billing_cadence: def.billing_cadence || 'one_time',
        quantity: def.quantity,
        unit_list_price: def.unit_list_price,
        unit_cost_price: def.unit_cost_price,
        applied_discount_percentage: def.discount,
        effective_ceiling_limit: effectiveCeiling,
        ...math,
      };
    });
  };

  const createFullQuotation = async ({ orgId, account, rep, number, stage, linesConfig, daysAgo = 10, staleDays = 0, expiryDays = 30, confirmedAgo = null, counterTotal = null, counterDiscount = null }) => {
    const q = await Quotation.create({
      organization_id: orgId,
      customer_account_id: account.id,
      quotation_number: number,
      stage,
      assigned_sales_rep_id: rep.id,
      price_list_id: plGold.id,
      expiration_date: dateIn(expiryDays),
      confirmed_at: confirmedAgo !== null ? dateAgo(confirmedAgo) : null,
      customer_counter_total: counterTotal,
      customer_counter_discount: counterDiscount,
      created_at: dateAgo(daysAgo),
      updated_at: dateAgo(staleDays),
    });

    const lines = buildLines(q.id, account.pricing_tier, linesConfig);
    const createdLines = await QuotationLine.bulkCreate(lines);

    const risk = computeBlendedRisk(createdLines);
    let riskTier = 'low_risk_auto';
    if (risk.blended_risk_score > 5.0) riskTier = 'high_risk_finance';
    else if (risk.blended_risk_score > 0.0) riskTier = 'medium_risk_manager';

    await q.update({
      gross_total: risk.gross_total,
      total_discount_amount: risk.total_discount_amount,
      net_subtotal: risk.net_subtotal,
      total_tax_amount: 0.00,
      grand_total: risk.net_subtotal,
      blended_margin_percentage: risk.blended_margin_percentage,
      worst_line_excess: risk.worst_line_excess,
      weighted_margin_bleed: risk.weighted_margin_bleed,
      blended_risk_score: risk.blended_risk_score,
      risk_tier: riskTier,
    });

    if (staleDays > 0) {
      await sequelize.query(`UPDATE quotations SET updated_at = :staleDate WHERE id = :id`, {
        replacements: { staleDate: dateAgo(staleDays), id: q.id }
      });
    }

    return { quotation: q, lines: createdLines, risk };
  };

  // 1. Q-1001: Active Draft (Fresh, standard discount)
  const q1 = await createFullQuotation({
    orgId: acme.id, account: accountApex, rep: uRepDev, number: 'Q-1001', stage: 'draft', daysAgo: 2, staleDays: 1,
    linesConfig: [
      { product: hwServer, variant: varServer32, category: 'hardware', quantity: 2, unit_list_price: 15000.00, unit_cost_price: 9800.00, discount: 5.00 },
      { product: svcArch, category: 'services', quantity: 1, unit_list_price: 6000.00, unit_cost_price: 3200.00, discount: 5.00 },
    ],
  });

  // 2. Q-1002: Stale Draft (> 5 days without updates -> triggers Deal Health Stalled Deal Alert)
  const q2 = await createFullQuotation({
    orgId: acme.id, account: accountNorthstar, rep: uRepJessica, number: 'Q-1002', stage: 'draft', daysAgo: 14, staleDays: 8,
    linesConfig: [
      { product: hwFirewall, variant: varFirewallHA, category: 'hardware', quantity: 2, unit_list_price: 9000.00, unit_cost_price: 5500.00, discount: 8.00 },
      { product: svcSec, category: 'services', quantity: 1, unit_list_price: 4500.00, unit_cost_price: 2100.00, discount: 5.00 },
    ],
  });

  // 3. Q-1003: Pending Manager Approval (Medium Risk, 0 < score <= 5)
  const q3 = await createFullQuotation({
    orgId: acme.id, account: accountApex, rep: uRepDev, number: 'Q-1003', stage: 'pending_approval', daysAgo: 4, staleDays: 2,
    linesConfig: [
      { product: hwServer, category: 'hardware', quantity: 3, unit_list_price: 12500.00, unit_cost_price: 8200.00, discount: 18.00 }, // Ceiling 15% -> 3 excess
      { product: svcArch, category: 'services', quantity: 1, unit_list_price: 6000.00, unit_cost_price: 3200.00, discount: 10.00 },
    ],
  });
  await QuotationApproval.create({
    quotation_id: q3.quotation.id, step_order: 1, required_role: 'sales_manager', status: 'pending', comments: 'Requested 18% volume discount on compute nodes',
  });

  // 4. Q-1004: Pending Finance Approval (High Risk, score > 5 + heavy margin bleed)
  const q4 = await createFullQuotation({
    orgId: acme.id, account: accountBluePeak, rep: uRepOmar, number: 'Q-1004', stage: 'pending_approval', daysAgo: 5, staleDays: 3,
    linesConfig: [
      { product: hwServer, variant: varServer64, category: 'hardware', quantity: 4, unit_list_price: 18500.00, unit_cost_price: 12000.00, discount: 24.00 }, // Ceiling 5% (bronze) -> 19 excess!
      { product: svcSec, category: 'services', quantity: 2, unit_list_price: 4500.00, unit_cost_price: 2100.00, discount: 12.00 },
    ],
  });
  await QuotationApproval.create({
    quotation_id: q4.quotation.id, step_order: 1, required_role: 'sales_manager', status: 'approved', action_by_user_id: uManager.id, action_timestamp: dateAgo(2), comments: 'Approved initial managerial step; forward to finance',
  });
  await QuotationApproval.create({
    quotation_id: q4.quotation.id, step_order: 2, required_role: 'finance_ops', status: 'pending', comments: 'Requires CFO / Finance Ops sign-off on 24% discount exception',
  });

  // 5. Q-1005: Under Negotiation (Customer Counter-Offer & Discount Anomaly 22% > 11.75% threshold)
  const q5 = await createFullQuotation({
    orgId: acme.id, account: accountApex, rep: uRepDev, number: 'Q-1005', stage: 'under_negotiation', daysAgo: 6, staleDays: 2,
    counterTotal: 45000.00, counterDiscount: 22.00,
    linesConfig: [
      { product: hwServer, category: 'hardware', quantity: 2, unit_list_price: 12500.00, unit_cost_price: 8200.00, discount: 22.00 },
      { product: subPlatform, variant: varPlatformEnt, category: 'subscriptions', billing_cadence: 'monthly', quantity: 25, unit_list_price: 1249.00, unit_cost_price: 420.00, discount: 15.00 },
    ],
  });
  await NegotiationThread.bulkCreate([
    { quotation_id: q5.quotation.id, author_user_id: uPortalApex.id, is_customer_message: true, change_type: 'order_counter', proposed_value: 45000.00, message_content: 'We can sign immediately if total is $45,000 across hardware + SaaS.', status: 'submitted' },
    { quotation_id: q5.quotation.id, author_user_id: uRepDev.id, is_customer_message: false, change_type: 'general_inquiry', proposed_value: null, message_content: 'Reviewing with leadership now. We can include complimentary team training if approved.', status: 'submitted' },
  ]);

  // 6. Q-1006: Approved (Ready for customer confirmation)
  const q6 = await createFullQuotation({
    orgId: acme.id, account: accountNorthstar, rep: uRepJessica, number: 'Q-1006', stage: 'approved', daysAgo: 7, staleDays: 1,
    linesConfig: [
      { product: hwFirewall, category: 'hardware', quantity: 2, unit_list_price: 4800.00, unit_cost_price: 2900.00, discount: 5.00 },
      { product: svcTrain, category: 'services', quantity: 1, unit_list_price: 2500.00, unit_cost_price: 900.00, discount: 0.00 },
    ],
  });
  await QuotationApproval.create({
    quotation_id: q6.quotation.id, step_order: 1, required_role: 'sales_manager', status: 'approved', action_by_user_id: uManager.id, action_timestamp: dateAgo(1), comments: 'Approved as within standard guidelines',
  });
  await ApprovalAuditLog.create({
    organization_id: acme.id, quotation_id: q6.quotation.id, actor_user_id: uManager.id, action_taken: 'approved', blended_risk_score_at_action: 0.00, payload_snapshot: { status: 'approved', reviewer: 'Sarah Kim' },
  });

  // 7. Q-1007: Confirmed Deal A (Hardware Multi-Warehouse Split + Backorder)
  const q7 = await createFullQuotation({
    orgId: acme.id, account: accountApex, rep: uRepDev, number: 'Q-1007', stage: 'confirmed', daysAgo: 12, staleDays: 0, confirmedAgo: 10,
    linesConfig: [
      { product: hwServer, category: 'hardware', quantity: 8, unit_list_price: 12500.00, unit_cost_price: 8200.00, discount: 8.00 },
      { product: hwFirewall, category: 'hardware', quantity: 4, unit_list_price: 4800.00, unit_cost_price: 2900.00, discount: 5.00 },
      { product: svcArch, category: 'services', quantity: 1, unit_list_price: 6000.00, unit_cost_price: 3200.00, discount: 5.00 },
    ],
  });

  // 8. Q-1008: Confirmed Deal B (Recurring Subscription Spawn + Standard Hardware)
  const q8 = await createFullQuotation({
    orgId: acme.id, account: accountNorthstar, rep: uRepJessica, number: 'Q-1008', stage: 'confirmed', daysAgo: 25, staleDays: 0, confirmedAgo: 22,
    linesConfig: [
      { product: hwIoT, category: 'hardware', quantity: 10, unit_list_price: 2400.00, unit_cost_price: 1400.00, discount: 5.00 },
      { product: subPlatform, category: 'subscriptions', billing_cadence: 'monthly', quantity: 20, unit_list_price: 899.00, unit_cost_price: 320.00, discount: 5.00 },
      { product: subMonitoring, category: 'subscriptions', billing_cadence: 'monthly', quantity: 5, unit_list_price: 499.00, unit_cost_price: 160.00, discount: 0.00 },
    ],
  });

  // 9. Q-1009: Confirmed Deal C (Large Enterprise Package with Paid Invoices)
  const q9 = await createFullQuotation({
    orgId: acme.id, account: accountMeridian, rep: uRepDev, number: 'Q-1009', stage: 'confirmed', daysAgo: 45, staleDays: 0, confirmedAgo: 40,
    linesConfig: [
      { product: hwServer, variant: varServer64, category: 'hardware', quantity: 5, unit_list_price: 18500.00, unit_cost_price: 12000.00, discount: 12.00 },
      { product: svcSec, category: 'services', quantity: 2, unit_list_price: 4500.00, unit_cost_price: 2100.00, discount: 8.00 },
      { product: subPlatform, variant: varPlatformEnt, category: 'subscriptions', billing_cadence: 'monthly', quantity: 50, unit_list_price: 1249.00, unit_cost_price: 420.00, discount: 10.00 },
    ],
  });

  // 10. Q-1010: Rejected Deal (Breached Margin Hard Stop)
  const q10 = await createFullQuotation({
    orgId: acme.id, account: accountBluePeak, rep: uRepOmar, number: 'Q-1010', stage: 'rejected', daysAgo: 18, staleDays: 16,
    linesConfig: [
      { product: hwServer, category: 'hardware', quantity: 6, unit_list_price: 12500.00, unit_cost_price: 8200.00, discount: 40.00 }, // Margin < 10%
    ],
  });
  await ApprovalAuditLog.create({
    organization_id: acme.id, quotation_id: q10.quotation.id, actor_user_id: uFinance.id, action_taken: 'rejected_margin_hard_stop', blended_risk_score_at_action: 32.50, payload_snapshot: { reason: 'Margin hard stop 10% violated (realized 4.2%)' },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 9. FULFILLMENT ORDERS, WAREHOUSE SPLITS & BACKORDERS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('  -> Seeding Fulfillment Dispatches, Splits & Backorders...');

  // From Q-1007: Split across WH-EAST (5 units) and WH-WEST (3 units)
  const fo1 = await FulfillmentOrder.create({
    organization_id: acme.id, quotation_id: q7.quotation.id, fulfillment_number: 'FO-2026-0001', warehouse_id: whEast.id, status: 'pickpack', is_manual_override: false, estimated_shipping_cost: 250.00, estimated_delivery_date: dateIn(2),
  });
  const fo2 = await FulfillmentOrder.create({
    organization_id: acme.id, quotation_id: q7.quotation.id, fulfillment_number: 'FO-2026-0002', warehouse_id: whWest.id, status: 'allocated', is_manual_override: false, estimated_shipping_cost: 402.50, estimated_delivery_date: dateIn(3),
  });

  await FulfillmentItem.bulkCreate([
    { fulfillment_order_id: fo1.id, quotation_line_id: q7.lines[0].id, product_id: hwServer.id, quantity_allocated: 5 },
    { fulfillment_order_id: fo1.id, quotation_line_id: q7.lines[1].id, product_id: hwFirewall.id, quantity_allocated: 4 },
    { fulfillment_order_id: fo2.id, quotation_line_id: q7.lines[0].id, product_id: hwServer.id, quantity_allocated: 3 },
  ]);

  // Open Backorder on Q-1007 (triggers delivery slippage diagnostic alert)
  await Backorder.create({
    organization_id: acme.id, quotation_id: q7.quotation.id, quotation_line_id: q7.lines[0].id, product_id: hwServer.id, backorder_quantity: 2, status: 'open', target_warehouse_id: whEast.id,
  });

  // From Q-1008: Dispatched and Delivered
  const fo3 = await FulfillmentOrder.create({
    organization_id: acme.id, quotation_id: q8.quotation.id, fulfillment_number: 'FO-2026-0003', warehouse_id: whEast.id, status: 'delivered', is_manual_override: false, estimated_shipping_cost: 250.00, shipped_at: dateAgo(18), delivered_at: dateAgo(15), estimated_delivery_date: dateAgo(15),
  });
  await FulfillmentItem.create({
    fulfillment_order_id: fo3.id, quotation_line_id: q8.lines[0].id, product_id: hwIoT.id, quantity_allocated: 10,
  });

  // Backorder ready for consolidation prompt (status: stock_received_pending_consolidation)
  await Backorder.create({
    organization_id: acme.id, quotation_id: q8.quotation.id, quotation_line_id: q8.lines[0].id, product_id: hwIoT.id, backorder_quantity: 5, status: 'stock_received_pending_consolidation', target_warehouse_id: whEast.id, resolved_fulfillment_order_id: fo1.id,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 10. SUBSCRIPTIONS, PRORATION & 12-MONTH BILLING SCHEDULES
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('  -> Seeding Subscriptions, Proration Events & Billing Schedules...');

  // Sub 1: From Q-1008 (Northstar Retail Group, Active Monthly SaaS)
  const sub1 = await Subscription.create({
    organization_id: acme.id, customer_account_id: accountNorthstar.id, origin_quotation_id: q8.quotation.id,
    subscription_code: 'SUB-NORTH-2026-01', status: 'active', billing_cadence: 'monthly',
    start_date: dateAgo(22), current_period_start: dateAgo(22), current_period_end: dateIn(8), next_invoice_date: dateIn(8),
    mrr_amount: 19576.00, arr_amount: 234912.00,
  });

  const sub1Line1 = await SubscriptionLineItem.create({
    subscription_id: sub1.id, product_id: subPlatform.id, quantity: 20, unit_price: 899.00, applied_discount_percentage: 5.00, period_amount: 17081.00,
  });
  const sub1Line2 = await SubscriptionLineItem.create({
    subscription_id: sub1.id, product_id: subMonitoring.id, quantity: 5, unit_price: 499.00, applied_discount_percentage: 0.00, period_amount: 2495.00,
  });

  // Generate 12-month billing schedule for Sub 1
  const schedules = [];
  for (let cycle = 1; cycle <= 12; cycle++) {
    const cycleDate = new Date(dateAgo(22).getTime() + (cycle - 1) * 30 * 86400000);
    schedules.push({
      subscription_id: sub1.id, cycle_number: cycle, scheduled_date: cycleDate,
      base_charge_amount: 19576.00, proration_adjustment: 0.00, expected_total: 19576.00,
      is_processed: cycle === 1,
    });
  }
  await BillingSchedule.bulkCreate(schedules);

  await SubscriptionEvent.create({
    subscription_id: sub1.id, actor_user_id: uRepJessica.id, event_type: 'provisioned', notes: 'Provisioned from confirmed quotation Q-1008',
  });

  // Sub 2: From Q-1009 (Meridian Health, Active Enterprise Subscription with Seat Modification)
  const sub2 = await Subscription.create({
    organization_id: acme.id, customer_account_id: accountMeridian.id, origin_quotation_id: q9.quotation.id,
    subscription_code: 'SUB-MERID-2026-02', status: 'active', billing_cadence: 'monthly',
    start_date: dateAgo(40), current_period_start: dateAgo(10), current_period_end: dateIn(20), next_invoice_date: dateIn(20),
    mrr_amount: 56205.00, arr_amount: 674460.00,
  });

  await SubscriptionLineItem.create({
    subscription_id: sub2.id, product_id: subPlatform.id, quantity: 50, unit_price: 1249.00, applied_discount_percentage: 10.00, period_amount: 56205.00,
  });

  // Seat increase event with proration charge
  await SubscriptionEvent.create({
    subscription_id: sub2.id, actor_user_id: uFinance.id, event_type: 'quantity_increase', days_remaining_in_cycle: 20, total_days_in_cycle: 30,
    prior_quantity: 40, new_quantity: 50, calculated_proration_charge: 7494.00, notes: 'Upgraded +10 seats mid-cycle',
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 11. FINANCIAL LEDGER: INVOICES, PAYMENTS & CREDIT ALLOCATIONS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('  -> Seeding Invoices, Payments & Credit Offsets...');

  // 1. INV-2026-0001: Standard Posted (from Q-1007 hardware portion, posted & balance due)
  const inv1 = await Invoice.create({
    organization_id: acme.id, customer_account_id: accountApex.id, origin_quotation_id: q7.quotation.id,
    invoice_number: 'INV-2026-0001', document_type: 'standard_invoice', status: 'posted',
    issue_date: dateAgo(10), due_date: dateIn(20),
    gross_subtotal: 125200.00, discount_amount: 8760.00, tax_amount: 0.00, total_amount: 116440.00,
    amount_paid: 0.00, amount_credited: 0.00, balance_due: 116440.00, payment_terms_notes: 'Net 30 Commercial Wire',
  });
  await InvoiceLine.bulkCreate([
    { invoice_id: inv1.id, product_id: hwServer.id, line_description: 'Enterprise HyperScale Server 2U x8', category: 'hardware', billing_cadence: 'one_time', quantity: 8, unit_price: 12500.00, discount_amount: 8000.00, net_amount: 92000.00, tax_rate_percentage: 0, line_total_with_tax: 92000.00 },
    { invoice_id: inv1.id, product_id: hwFirewall.id, line_description: 'NextGen Security Firewall Appliance x4', category: 'hardware', billing_cadence: 'one_time', quantity: 4, unit_price: 4800.00, discount_amount: 960.00, net_amount: 18240.00, tax_rate_percentage: 0, line_total_with_tax: 18240.00 },
    { invoice_id: inv1.id, product_id: svcArch.id, line_description: 'Cloud Architecture & Setup x1', category: 'services', billing_cadence: 'one_time', quantity: 1, unit_price: 6000.00, discount_amount: 300.00, net_amount: 5700.00, tax_rate_percentage: 0, line_total_with_tax: 5700.00 },
  ]);

  // 2. INV-2026-0002: Partially Paid Invoice
  const inv2 = await Invoice.create({
    organization_id: acme.id, customer_account_id: accountNorthstar.id, origin_quotation_id: q8.quotation.id,
    invoice_number: 'INV-2026-0002', document_type: 'standard_invoice', status: 'partially_paid',
    issue_date: dateAgo(22), due_date: dateIn(8),
    gross_subtotal: 24000.00, discount_amount: 1200.00, tax_amount: 0.00, total_amount: 22800.00,
    amount_paid: 15000.00, amount_credited: 0.00, balance_due: 7800.00, payment_terms_notes: 'Net 30 Corporate Check',
  });
  await InvoiceLine.create({
    invoice_id: inv2.id, product_id: hwIoT.id, line_description: 'Industrial IoT Edge Gateway x10', category: 'hardware', billing_cadence: 'one_time', quantity: 10, unit_price: 2400.00, discount_amount: 1200.00, net_amount: 22800.00, line_total_with_tax: 22800.00,
  });
  await Payment.create({
    organization_id: acme.id, customer_account_id: accountNorthstar.id, invoice_id: inv2.id, payment_number: 'PAY-2026-0001', amount: 15000.00, payment_method: 'ach_check', payment_status: 'succeeded', transaction_reference: 'ACH-CHK-99201', payment_date: dateAgo(15), recorded_by_user_id: uFinance.id,
  });

  // 3. INV-2026-0003: Paid In Full (Historical deal from Meridian Health)
  const inv3 = await Invoice.create({
    organization_id: acme.id, customer_account_id: accountMeridian.id, origin_quotation_id: q9.quotation.id,
    invoice_number: 'INV-2026-0003', document_type: 'standard_invoice', status: 'paid',
    issue_date: dateAgo(40), due_date: dateAgo(10),
    gross_subtotal: 101500.00, discount_amount: 11820.00, tax_amount: 0.00, total_amount: 89680.00,
    amount_paid: 89680.00, amount_credited: 0.00, balance_due: 0.00, payment_terms_notes: 'Wire Transfer Received',
  });
  await InvoiceLine.bulkCreate([
    { invoice_id: inv3.id, product_id: hwServer.id, line_description: 'Enterprise HyperScale Server 64C x5', category: 'hardware', billing_cadence: 'one_time', quantity: 5, unit_price: 18500.00, discount_amount: 11100.00, net_amount: 81400.00, line_total_with_tax: 81400.00 },
    { invoice_id: inv3.id, product_id: svcSec.id, line_description: 'Infrastructure Security Hardening x2', category: 'services', billing_cadence: 'one_time', quantity: 2, unit_price: 4500.00, discount_amount: 720.00, net_amount: 8280.00, line_total_with_tax: 8280.00 },
  ]);
  await Payment.create({
    organization_id: acme.id, customer_account_id: accountMeridian.id, invoice_id: inv3.id, payment_number: 'PAY-2026-0002', amount: 89680.00, payment_method: 'wire_transfer', payment_status: 'succeeded', transaction_reference: 'FED-WIRE-773829', payment_date: dateAgo(25), recorded_by_user_id: uFinance.id,
  });

  // 4. INV-2026-0004: Overdue Invoice (> 30 days old past due date)
  const inv4 = await Invoice.create({
    organization_id: acme.id, customer_account_id: accountBluePeak.id,
    invoice_number: 'INV-2026-0004', document_type: 'standard_invoice', status: 'overdue',
    issue_date: dateAgo(50), due_date: dateAgo(20),
    gross_subtotal: 12000.00, discount_amount: 600.00, tax_amount: 0.00, total_amount: 11400.00,
    amount_paid: 0.00, amount_credited: 0.00, balance_due: 11400.00, payment_terms_notes: 'Net 30 Overdue Alert Dispatched',
  });
  await InvoiceLine.create({
    invoice_id: inv4.id, product_id: svcArch.id, line_description: 'Cloud Architecture & Setup x2', category: 'services', billing_cadence: 'one_time', quantity: 2, unit_price: 6000.00, discount_amount: 600.00, net_amount: 11400.00, line_total_with_tax: 11400.00,
  });

  // 5. CN-2026-0001: Credit Note with Unapplied Balance & Offset Allocation
  const creditNote = await Invoice.create({
    organization_id: acme.id, customer_account_id: accountApex.id, origin_subscription_id: sub1.id,
    invoice_number: 'CN-2026-0001', document_type: 'credit_note', status: 'posted',
    issue_date: dateAgo(5), due_date: dateAgo(5),
    gross_subtotal: 5000.00, discount_amount: 0.00, tax_amount: 0.00, total_amount: 5000.00,
    amount_paid: 0.00, amount_credited: 2000.00, balance_due: 3000.00, payment_terms_notes: 'SLA Downtime Credit Rebate',
  });
  await InvoiceLine.create({
    invoice_id: creditNote.id, line_description: 'SLA 99.9% Uptime Rebate Credit', category: 'subscriptions', billing_cadence: 'monthly', quantity: 1, unit_price: 5000.00, discount_amount: 0, net_amount: 5000.00, line_total_with_tax: 5000.00,
  });

  // Credit allocation offsetting $2000 against open invoice INV-2026-0001
  await CreditAllocation.create({
    credit_note_invoice_id: creditNote.id, target_invoice_id: inv1.id, allocated_amount: 2000.00, is_origin_debt_offset: false, allocated_by_user_id: uFinance.id, allocated_at: dateAgo(4),
  });
  await inv1.update({
    amount_credited: 2000.00, balance_due: 114440.00,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // 12. DEAL HEALTH ALERTS & DIAGNOSTICS (Stream A, B, C)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('  -> Seeding Deal Health & Diagnostic Anomalies...');

  await DealHealthAlert.bulkCreate([
    // Stream A: Stalled Deal Alert on Q-1002
    {
      organization_id: acme.id, anomaly_type: 'stalled_deal', severity: 'warning', quotation_id: q2.quotation.id,
      title: 'Stalled: Q-1002', description: 'Quote stuck in draft for 8 days without customer update',
      diagnostic_payload: { stage: 'draft', last_update: dateAgo(8).toISOString(), days_stale: 8 },
      resolution_status: 'active',
    },
    // Stream B: Discount Anomaly Alert on Q-1005 (22% vs 11.75% threshold)
    {
      organization_id: acme.id, anomaly_type: 'discount_anomaly', severity: 'critical', quotation_id: q5.quotation.id,
      title: 'Discount leak: Q-1005', description: 'Line discount 22.00% exceeds statistical threshold 11.70%',
      diagnostic_payload: { applied: 22.00, threshold: 11.70, rep_deals: 24, fallback: 'personal' },
      resolution_status: 'active',
    },
    // Stream C: Delivery Slippage Alert on FO-2026-0001 (open backorder with tight deadline)
    {
      organization_id: acme.id, anomaly_type: 'delivery_slippage', severity: 'warning', quotation_id: q7.quotation.id, fulfillment_order_id: fo1.id,
      title: 'Delivery risk: FO-2026-0001', description: 'Backorder exists with fulfillment order still in pickpack stage',
      diagnostic_payload: { fulfillment_status: 'pickpack', slippage_window_hours: 48 },
      resolution_status: 'active',
    },
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 13. SESSIONS, INVITATIONS & IMMUTABLE AUDIT LOGS
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('  -> Seeding Auth Sessions, Invitations & Audit Trail...');

  await Session.bulkCreate([
    { user_id: uAdmin.id, refresh_token_hash: hashToken('dev_refresh_token_admin'), expires_at: dateIn(30), ip_address: '127.0.0.1', user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    { user_id: uRepDev.id, refresh_token_hash: hashToken('dev_refresh_token_rep'), expires_at: dateIn(30), ip_address: '127.0.0.1', user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
  ]);

  await Invitation.create({
    token_hash: hashToken('invite_token_sample_123'), email: 'procurement@meridian.com', invited_by_user_id: uAdmin.id, organization_id: acme.id, customer_organization_id: meridian.id, role: 'customer_portal', status: 'pending', expires_at: dateIn(3),
  });

  await AuditLog.bulkCreate([
    { actor_user_id: uAdmin.id, actor_membership_id: mAdmin.id, entity_type: 'quotation', entity_id: q7.quotation.id, action: 'confirmed', payload_before: { stage: 'approved' }, payload_after: { stage: 'confirmed' }, ip_address: '127.0.0.1' },
    { actor_user_id: uFinance.id, actor_membership_id: mFinance.id, entity_type: 'invoice', entity_id: inv1.id, action: 'posted', payload_before: { status: 'draft' }, payload_after: { status: 'posted' }, ip_address: '127.0.0.1' },
    { actor_user_id: uFinance.id, actor_membership_id: mFinance.id, entity_type: 'credit_allocation', entity_id: creditNote.id, action: 'applied_credit', payload_after: { amount: 2000.00, target: inv1.invoice_number }, ip_address: '127.0.0.1' },
  ]);

  console.log('✅ Seeding completed successfully!');
  console.log('───────────────────────────────────────────────────────────────────');
  console.log('Demo Credentials:');
  console.log('  • Admin:        admin@acme.com        / admin123');
  console.log('  • Sales Mgr:    manager@acme.com      / manager123');
  console.log('  • Sales Lead:   sales.lead@acme.com   / manager123');
  console.log('  • Sales Rep:    rep@acme.com          / rep123');
  console.log('  • Finance Ops:  finance@acme.com      / finance123');
  console.log('  • Buyer Portal: portal@apex.com       / portal123');
  console.log('  • Tenant 2:     admin@nexus.com       / admin123');
  console.log('───────────────────────────────────────────────────────────────────');
}

// Direct execution CLI runner
if (process.argv[1]?.endsWith('seed.js') || process.argv[1]?.includes('seed')) {
  seedDatabase()
    .then(async () => {
      await sequelize.close();
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Seed failed:', err);
      process.exit(1);
    });
}
