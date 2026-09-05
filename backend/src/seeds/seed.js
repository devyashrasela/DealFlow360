/**
 * Master Seed Fixture
 * Populates MySQL/SQLite with baseline data for all screens.
 * Run: node src/seeds/seed.js
 */
import dotenv from 'dotenv';
dotenv.config();

import { sequelize } from '../models/index.js';
import { Organization, User, OrganizationMembership, CustomerAccount } from '../models/auth.models.js';
import { Product, ProductVariant, PriceList, PriceListItem } from '../models/catalog.models.js';
import { DiscountTierCeiling, CategoryCeiling, ApprovalChain } from '../models/governance.models.js';
import { Warehouse, WarehouseStock } from '../models/fulfillment.models.js';
import { Quotation, QuotationLine, NegotiationThread } from '../models/quotation.models.js';
import { Subscription, SubscriptionLineItem, BillingSchedule } from '../models/subscription.models.js';
import { Invoice, InvoiceLine } from '../models/ledger.models.js';
import { RepDiscountBaseline } from '../models/dealHealth.models.js';
  import argon2 from 'argon2';
  
async function seed() {
  console.log('Syncing database...');
  await sequelize.sync({ force: true });
  console.log('Seeding...');

  // ── Organizations ──
  const acme = await Organization.create({
    legal_name: 'Acme Provider Corp',
    trading_name: 'Acme',
    tax_identifier: 'US-EIN-123456789',
    slug: 'acme-provider',
    organization_type: 'provider',
    default_currency: 'INR',
    billing_address: { line1: '100 Tech Park', city: 'Mumbai', state: 'MH', zip: '400001', country: 'IN' },
    shipping_address: { line1: '100 Tech Park', city: 'Mumbai', state: 'MH', zip: '400001', country: 'IN' },
  });

  const beta = await Organization.create({
    legal_name: 'Beta Buyer Ltd',
    trading_name: 'Beta Buyer',
    tax_identifier: 'US-EIN-987654321',
    slug: 'beta-buyer',
    organization_type: 'customer',
    default_currency: 'INR',
    billing_address: { line1: '200 Commerce St', city: 'Delhi', state: 'DL', zip: '110001', country: 'IN' },
    shipping_address: { line1: '200 Commerce St', city: 'Delhi', state: 'DL', zip: '110001', country: 'IN' },
  });

  const hash = async (pw) => await argon2.hash(pw, { type: argon2.argon2id });

  // ── Users ──
  const admin = await User.create({ email: 'admin@acme.com', password_hash: await hash('admin123'), full_name: 'Alex Sharma' });
  const manager = await User.create({ email: 'manager@acme.com', password_hash: await hash('manager123'), full_name: 'Sarah Kim' });
  const manager2 = await User.create({ email: 'sales.lead@acme.com', password_hash: await hash('manager123'), full_name: 'Michael Chen' });
  const finance = await User.create({ email: 'finance@acme.com', password_hash: await hash('finance123'), full_name: 'Priya Desai' });
  const rep = await User.create({ email: 'rep@acme.com', password_hash: await hash('rep123'), full_name: 'Dev Patel' });
  const rep2 = await User.create({ email: 'jessica.rep@acme.com', password_hash: await hash('rep123'), full_name: 'Jessica Wong' });
  const rep3 = await User.create({ email: 'omar.rep@acme.com', password_hash: await hash('rep123'), full_name: 'Omar Hassan' });
  const portal = await User.create({ email: 'portal@beta.com', password_hash: await hash('portal123'), full_name: 'Rita Gupta' });

  // ── Memberships ──
  await OrganizationMembership.bulkCreate([
    { organization_id: acme.id, user_id: admin.id, role: 'admin' },
    { organization_id: acme.id, user_id: manager.id, role: 'sales_manager' },
    { organization_id: acme.id, user_id: manager2.id, role: 'sales_manager' },
    { organization_id: acme.id, user_id: finance.id, role: 'finance_ops' },
    { organization_id: acme.id, user_id: rep.id, role: 'sales_rep' },
    { organization_id: acme.id, user_id: rep2.id, role: 'sales_rep' },
    { organization_id: acme.id, user_id: rep3.id, role: 'sales_rep' },
    { organization_id: beta.id, user_id: portal.id, role: 'customer_portal' },
  ]);

  // ── Customer Account ──
  const goldAccount = await CustomerAccount.create({
    provider_organization_id: acme.id,
    buyer_organization_id: beta.id,
    account_number: 'CUST-BETA-001',
    pricing_tier: 'gold',
    default_payment_terms_days: 30,
    credit_limit: 50000.00,
    assigned_sales_rep_id: rep.id,
  });

  // ── Products: 2 Hardware, 2 Services, 2 Subscriptions ──
  const products = await Product.bulkCreate([
    { organization_id: acme.id, sku: 'HW-SRV-001', name: 'Enterprise Server Rack', category: 'hardware', billing_cadence: 'one_time', base_list_price: 12500.00, standard_unit_cost: 8750.00 },
    { organization_id: acme.id, sku: 'HW-FW-002', name: 'Network Firewall Appliance', category: 'hardware', billing_cadence: 'one_time', base_list_price: 4500.00, standard_unit_cost: 2900.00 },
    { organization_id: acme.id, sku: 'SVC-IMP-001', name: 'Implementation Consulting', category: 'services', billing_cadence: 'one_time', base_list_price: 3000.00, standard_unit_cost: 1800.00 },
    { organization_id: acme.id, sku: 'SVC-TRN-002', name: 'Team Training Package', category: 'services', billing_cadence: 'one_time', base_list_price: 1500.00, standard_unit_cost: 600.00 },
    { organization_id: acme.id, sku: 'SUB-CLD-001', name: 'Cloud Platform License', category: 'subscriptions', billing_cadence: 'monthly', base_list_price: 899.00, standard_unit_cost: 350.00 },
    { organization_id: acme.id, sku: 'SUB-SUP-002', name: 'Premium Support Plan', category: 'subscriptions', billing_cadence: 'monthly', base_list_price: 299.00, standard_unit_cost: 100.00 },
  ]);
  const [hwServer, hwFirewall, svcImpl, svcTrain, subCloud, subSupport] = products;

  // ── Product Variants ──
  await ProductVariant.bulkCreate([
    { product_id: hwServer.id, variant_sku: 'HW-SRV-001-16C', variant_name: '16-Core Config', price_delta: 2000.00, cost_delta: 1400.00, attributes: { cores: 16, ram: '64GB' } },
    { product_id: hwServer.id, variant_sku: 'HW-SRV-001-32C', variant_name: '32-Core Config', price_delta: 5000.00, cost_delta: 3500.00, attributes: { cores: 32, ram: '128GB' } },
    { product_id: subCloud.id, variant_sku: 'SUB-CLD-001-PRO', variant_name: 'Pro Tier', price_delta: 400.00, cost_delta: 150.00, attributes: { tier: 'pro', storage: '500GB' } },
  ]);

  // ── Price List ──
  const priceList = await PriceList.create({
    organization_id: acme.id,
    name: 'Gold Tier Price List 2025',
    tier: 'gold',
    currency: 'INR',
    effective_start: new Date('2025-01-01'),
    effective_end: new Date('2025-12-31'),
  });

  await PriceListItem.bulkCreate(products.map(p => ({
    price_list_id: priceList.id,
    product_id: p.id,
    custom_unit_price: parseFloat(p.base_list_price) * 0.92, // 8% gold discount
  })));

  // ── Tier & Category Ceilings ──
  const tiers = ['standard', 'bronze', 'silver', 'gold', 'custom'];
  const tierMaxes = [5, 8, 12, 15, 25]; // Gold is now 15
  await DiscountTierCeiling.bulkCreate(tiers.map((t, i) => ({
    organization_id: acme.id, tier: t, max_discount_percentage: tierMaxes[i],
  })));

  await CategoryCeiling.bulkCreate([
    { organization_id: acme.id, category: 'hardware', max_discount_percentage: 15 }, // Hardware up to 15
    { organization_id: acme.id, category: 'services', max_discount_percentage: 10 }, // Services up to 10
    { organization_id: acme.id, category: 'subscriptions', max_discount_percentage: 20 },
  ]);

  // ── Upsell Rules ──
  const { UpsellRule } = await import('../models/catalog.models.js');
  await UpsellRule.create({
    organization_id: acme.id,
    trigger_product_id: hwServer.id,
    recommended_product_id: svcTrain.id, // Recommends Team Training when buying Enterprise Server
    promotional_discount_percent: 5,
    priority_rank: 1,
    is_active: true,
  });

  // ── Approval Chains ──
  await ApprovalChain.bulkCreate([
    { organization_id: acme.id, risk_tier: 'low_risk_auto', min_risk_score: 0, max_risk_score: 0, requires_manager_approval: false, requires_finance_approval: false }, // Only perfectly clean quotes (score 0) auto-approve
    { organization_id: acme.id, risk_tier: 'medium_risk_manager', min_risk_score: 0.01, max_risk_score: 25, requires_manager_approval: true, requires_finance_approval: false }, // Any excess triggers manager
    { organization_id: acme.id, risk_tier: 'high_risk_finance', min_risk_score: 25.01, max_risk_score: null, requires_manager_approval: true, requires_finance_approval: true },
  ]);

  // ── Warehouses ──
  const whMumbai = await Warehouse.create({
    organization_id: acme.id, code: 'WH-MUM', name: 'Mumbai Distribution Center',
    shipping_base_fee: 500, address: { city: 'Mumbai', state: 'MH', country: 'IN' },
  });
  const whDelhi = await Warehouse.create({
    organization_id: acme.id, code: 'WH-DEL', name: 'Delhi Fulfillment Hub',
    shipping_base_fee: 600, address: { city: 'Delhi', state: 'DL', country: 'IN' },
  });

  // ── Stock Balances ──
  await WarehouseStock.bulkCreate([
    { warehouse_id: whMumbai.id, product_id: hwServer.id, on_hand_quantity: 25, soft_reserved_quantity: 3 },
    { warehouse_id: whMumbai.id, product_id: hwFirewall.id, on_hand_quantity: 50, soft_reserved_quantity: 5 },
    { warehouse_id: whDelhi.id, product_id: hwServer.id, on_hand_quantity: 15, soft_reserved_quantity: 2 },
    { warehouse_id: whDelhi.id, product_id: hwFirewall.id, on_hand_quantity: 30 },
  ]);

  // ── Rep Discount Baseline ──
  await RepDiscountBaseline.create({
    organization_id: acme.id,
    sales_rep_id: rep.id,
    completed_deal_count: 12,
    mean_discount_percentage: 7.50,
    std_dev_percentage: 2.00,
    cohort_mean_discount_percentage: 8.00,
    cohort_std_dev_percentage: 2.50,
    effective_anomaly_threshold: 11.75,
  });

  // ── Quotations (one per stage) ──
  const now = new Date();
  const expiry = new Date(now.getTime() + 30 * 86400000);
  const staleDate = new Date(now.getTime() - 7 * 86400000);

  const makeLines = (qId, discount) => [
    { quotation_id: qId, product_id: hwServer.id, line_number: 1, category: 'hardware', quantity: 2, unit_list_price: 12500, unit_cost_price: 8750, applied_discount_percentage: discount, effective_ceiling_limit: 18, unit_net_price: 12500 * (1 - discount / 100), line_gross_amount: 25000, line_net_amount: 25000 * (1 - discount / 100), line_cost_total: 17500, line_margin_amount: 25000 * (1 - discount / 100) - 17500, line_margin_percentage: ((25000 * (1 - discount / 100) - 17500) / (25000 * (1 - discount / 100)) * 100) },
    { quotation_id: qId, product_id: subCloud.id, line_number: 2, category: 'subscriptions', billing_cadence: 'monthly', quantity: 10, unit_list_price: 899, unit_cost_price: 350, applied_discount_percentage: discount, effective_ceiling_limit: 20, unit_net_price: 899 * (1 - discount / 100), line_gross_amount: 8990, line_net_amount: 8990 * (1 - discount / 100), line_cost_total: 3500, line_margin_amount: 8990 * (1 - discount / 100) - 3500, line_margin_percentage: ((8990 * (1 - discount / 100) - 3500) / (8990 * (1 - discount / 100)) * 100) },
  ];

  // Draft (stale for health scan)
  const qDraft = await Quotation.create({
    organization_id: acme.id, customer_account_id: goldAccount.id, quotation_number: 'Q-1001',
    stage: 'draft', assigned_sales_rep_id: rep.id, price_list_id: priceList.id,
    gross_total: 33990, net_subtotal: 33990, grand_total: 33990, expiration_date: expiry,
    blended_margin_percentage: 38, blended_risk_score: 12,
  });
  // Force stale updated_at
  await sequelize.query(`UPDATE quotations SET updated_at = :staleDate WHERE id = :id`, {
    replacements: { staleDate, id: qDraft.id }
  });
  await QuotationLine.bulkCreate(makeLines(qDraft.id, 5));

  // Pending approval
  const qPending = await Quotation.create({
    organization_id: acme.id, customer_account_id: goldAccount.id, quotation_number: 'Q-1002',
    stage: 'pending_approval', assigned_sales_rep_id: rep.id, price_list_id: priceList.id,
    gross_total: 33990, net_subtotal: 30591, total_discount_amount: 3399, grand_total: 30591,
    expiration_date: expiry, blended_margin_percentage: 31, blended_risk_score: 42,
    risk_tier: 'medium_risk_manager',
  });
  await QuotationLine.bulkCreate(makeLines(qPending.id, 10));

  // Under negotiation (with discount anomaly: 22% > threshold 11.75%)
  const qNegotiate = await Quotation.create({
    organization_id: acme.id, customer_account_id: goldAccount.id, quotation_number: 'Q-1003',
    stage: 'under_negotiation', assigned_sales_rep_id: rep.id, price_list_id: priceList.id,
    gross_total: 33990, net_subtotal: 26512.20, total_discount_amount: 7477.80, grand_total: 26512.20,
    expiration_date: expiry, blended_margin_percentage: 20.8, blended_risk_score: 72,
    risk_tier: 'high_risk_finance', customer_counter_total: 25000, customer_counter_discount: 26.5,
  });
  await QuotationLine.bulkCreate(makeLines(qNegotiate.id, 22));

  // Confirmed
  const qConfirmed = await Quotation.create({
    organization_id: acme.id, customer_account_id: goldAccount.id, quotation_number: 'Q-1004',
    stage: 'confirmed', assigned_sales_rep_id: rep.id, price_list_id: priceList.id,
    gross_total: 33990, net_subtotal: 32290.50, total_discount_amount: 1699.50, grand_total: 32290.50,
    expiration_date: expiry, confirmed_at: now, blended_margin_percentage: 35, blended_risk_score: 8,
  });
  await QuotationLine.bulkCreate(makeLines(qConfirmed.id, 5));

  // ── Negotiation thread on Q-1003 ──
  await NegotiationThread.create({
    quotation_id: qNegotiate.id, author_user_id: portal.id,
    is_customer_message: true, change_type: 'discount_request',
    proposed_value: 25, message_content: 'Can we get 25% across the board? Volume commitment.',
  });

  // ── Sample Invoice for confirmed quote ──
  const inv = await Invoice.create({
    organization_id: acme.id, customer_account_id: goldAccount.id,
    origin_quotation_id: qConfirmed.id, invoice_number: 'INV-2025-0001',
    document_type: 'standard_invoice', status: 'posted',
    issue_date: now, due_date: new Date(now.getTime() + 30 * 86400000),
    gross_subtotal: 32290.50, total_amount: 32290.50, balance_due: 32290.50,
  });

  await InvoiceLine.bulkCreate([
    { invoice_id: inv.id, product_id: hwServer.id, line_description: 'Enterprise Server Rack x2', category: 'hardware', billing_cadence: 'one_time', quantity: 2, unit_price: 12500, net_amount: 23750, line_total_with_tax: 23750 },
    { invoice_id: inv.id, product_id: subCloud.id, line_description: 'Cloud Platform License x10', category: 'subscriptions', billing_cadence: 'monthly', quantity: 10, unit_price: 899, discount_amount: 449.50, net_amount: 8540.50, line_total_with_tax: 8540.50 },
  ]);

  // ── Sample Subscription from confirmed quote ──
  const sub = await Subscription.create({
    organization_id: acme.id, customer_account_id: goldAccount.id,
    origin_quotation_id: qConfirmed.id, subscription_code: 'SUB-BETA-001',
    billing_cadence: 'monthly', start_date: now,
    current_period_start: now, current_period_end: new Date(now.getTime() + 30 * 86400000),
    next_invoice_date: new Date(now.getTime() + 30 * 86400000),
    mrr_amount: 8540.50, arr_amount: 102486.00,
  });

  await SubscriptionLineItem.create({
    subscription_id: sub.id, product_id: subCloud.id,
    quantity: 10, unit_price: 899, applied_discount_percentage: 5,
    period_amount: 8540.50,
  });

  console.log('Seed complete.');
  console.log(`  Organizations: ${acme.id} (Acme), ${beta.id} (Beta)`);
  console.log(`  Users: admin=${admin.id}, manager=${manager.id}, rep=${rep.id}, portal=${portal.id}`);
  console.log(`  Customer Account: ${goldAccount.id}`);
  console.log(`  Products: ${products.map(p => p.sku).join(', ')}`);
  console.log(`  Quotations: Q-1001(draft), Q-1002(pending), Q-1003(negotiation), Q-1004(confirmed)`);

  await sequelize.close();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
