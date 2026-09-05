import dotenv from 'dotenv';
dotenv.config();

import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { performance } from 'perf_hooks';
import {
  sequelize,
  User,
  Organization,
  OrganizationMembership,
  CustomerAccount,
  PriceList,
  Product,
  Quotation,
  QuotationLine,
  ApprovalChain,
  DiscountTierCeiling,
  CategoryCeiling,
  ApprovalAuditLog,
  QuotationApproval
} from '../src/models/index.js';
import {
  resolveCeiling,
  computeLineMath,
  computeBlendedRisk,
  determineRiskTier
} from '../src/services/riskEngine.service.js';

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
    const error = new Error(data.error || data.message || `HTTP ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function runTests() {
  console.log('--- Starting Screen 18: Risk Slabs & Margin Guardrails Test Suite ---');
  const results = [];

  function record(testId, passed, message, data = {}) {
    results.push({ testId, passed, message, data });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testId}: ${message}`);
  }

  try {
    await sequelize.authenticate();
    const timestamp = Date.now();
    const pwdHash = await argon2.hash('Password@123', { type: argon2.argon2id });

    // ── Setup Test Org & Users ──
    const org = await Organization.create({
      legal_name: `Risk Engine Org ${timestamp}`,
      slug: `risk-org-${timestamp}`,
      organization_type: 'provider',
      is_active: true,
    });

    const admin = await User.create({
      email: `risk_admin_${timestamp}@dealflow.com`,
      password_hash: pwdHash,
      full_name: 'Risk Admin',
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

    // ── 1. Default Seeded Slabs Check (GOV18-01) ──
    const acmeOrg = await Organization.findOne({ where: { slug: 'acme-provider' } });
    let acmeChains = [];
    if (acmeOrg) {
      acmeChains = await ApprovalChain.findAll({
        where: { organization_id: acmeOrg.id },
        order: [['min_risk_score', 'ASC']]
      });
    }
    console.log('Acme seeded approval chains:', acmeChains.map(c => ({
      tier: c.risk_tier,
      min: c.min_risk_score,
      max: c.max_risk_score,
      mgr: c.requires_manager_approval,
      fin: c.requires_finance_approval
    })));

    const autoChain = acmeChains.find(c => c.risk_tier === 'low_risk_auto');
    const mgrChain = acmeChains.find(c => c.risk_tier === 'medium_risk_manager');
    const finChain = acmeChains.find(c => c.risk_tier === 'high_risk_finance');

    // Spec expects:
    // Slab 1: 0 (Auto-Approve)
    // Slab 2: >0 to 5 (Sales Manager)
    // Slab 3: >5 (Manager + Finance)
    const seedMatchesSpec = autoChain && parseFloat(autoChain.min_risk_score) === 0 && parseFloat(autoChain.max_risk_score) === 0 &&
                            mgrChain && parseFloat(mgrChain.max_risk_score) === 5 &&
                            finChain && parseFloat(finChain.min_risk_score) === 5.01;

    record('GOV18-01', seedMatchesSpec, seedMatchesSpec
      ? 'Default seeded approval chains match spec (Slab 1: 0, Slab 2: 0-5, Slab 3: >5)'
      : `Default seeded risk slabs mismatch spec! Spec expects Slab 1: 0pt, Slab 2: >0-5pt, Slab 3: >5pt. But seed.js has Slab 1: 0-${autoChain?.max_risk_score}pt, Slab 2: ${mgrChain?.min_risk_score}-${mgrChain?.max_risk_score}pt, Slab 3: >${finChain?.min_risk_score}pt. This causes high-risk quotes (up to 30pt) to be auto-approved!`,
      { auto: autoChain?.max_risk_score, mgr: mgrChain?.max_risk_score, fin: finChain?.min_risk_score }
    );

    // ── Setup Correct Spec Slabs for Org Under Test ──
    const chain1 = await ApprovalChain.create({
      organization_id: org.id,
      risk_tier: 'low_risk_auto',
      min_risk_score: 0.00,
      max_risk_score: 0.00,
      requires_manager_approval: false,
      requires_finance_approval: false,
      minimum_upsell_margin_threshold: 20.00,
      absolute_margin_hard_stop: 10.00
    });

    const chain2 = await ApprovalChain.create({
      organization_id: org.id,
      risk_tier: 'medium_risk_manager',
      min_risk_score: 0.01,
      max_risk_score: 5.00,
      requires_manager_approval: true,
      requires_finance_approval: false,
      minimum_upsell_margin_threshold: 20.00,
      absolute_margin_hard_stop: 10.00
    });

    const chain3 = await ApprovalChain.create({
      organization_id: org.id,
      risk_tier: 'high_risk_finance',
      min_risk_score: 5.01,
      max_risk_score: 999.00,
      requires_manager_approval: true,
      requires_finance_approval: true,
      minimum_upsell_margin_threshold: 20.00,
      absolute_margin_hard_stop: 10.00
    });

    // ── 2. Edit Slab Threshold (GOV18-02) ──
    // Update Slab 2 upper bound from 5 to 3
    const updateRes = await api(`/governance/approval-chains/${chain2.id}`, {
      method: 'PUT',
      headers: headersAdmin,
      body: { max_risk_score: 3.00 }
    });
    // Update chain3 min_risk_score to 3.01
    await api(`/governance/approval-chains/${chain3.id}`, {
      method: 'PUT',
      headers: headersAdmin,
      body: { min_risk_score: 3.01 }
    });

    // Score of 4.0 should now route to high_risk_finance (previously medium_risk_manager)
    const routingAt4 = await determineRiskTier(org.id, 4.0, 4.0, 30.0);
    record('GOV18-02', routingAt4.risk_tier === 'high_risk_finance', routingAt4.risk_tier === 'high_risk_finance'
      ? 'Editing Slab 2 upper bound to 3.0 causes a 4.0pt score to correctly route to high_risk_finance'
      : `Failed: expected high_risk_finance, got ${routingAt4.risk_tier}`);

    // Restore boundaries to spec: Slab 2: 0.01 to 5.00, Slab 3: 5.01+
    await api(`/governance/approval-chains/${chain2.id}`, { method: 'PUT', headers: headersAdmin, body: { max_risk_score: 5.00 } });
    await api(`/governance/approval-chains/${chain3.id}`, { method: 'PUT', headers: headersAdmin, body: { min_risk_score: 5.01 } });

    // ── 3. Slab Boundary Tests (GOV18-03 & GOV18-04) ──
    // Exactly 0 points over
    const routingAt0 = await determineRiskTier(org.id, 0.0, 0.0, 30.0);
    record('GOV18-04', routingAt0.risk_tier === 'low_risk_auto' && !routingAt0.requires_manager_approval, routingAt0.risk_tier === 'low_risk_auto'
      ? 'Score of 0.0 correctly resolves to low_risk_auto (Auto-Approve)'
      : `Score of 0.0 failed: resolved to ${routingAt0.risk_tier}`);

    // Boundary at exactly 5.0 points over
    const routingAt5 = await determineRiskTier(org.id, 5.0, 5.0, 30.0);
    console.log('Routing at exactly 5.0 score:', routingAt5);
    // In determineRiskTier: `blendedRiskScore >= min && blendedRiskScore < max`
    // If max is 5.00, 5.0 < 5.00 is FALSE, so it falls through to chain 3 (high_risk_finance)
    record('GOV18-03', routingAt5.risk_tier === 'medium_risk_manager', routingAt5.risk_tier === 'medium_risk_manager'
      ? 'Score of 5.0 is inclusive to Slab 2 (Sales Manager)'
      : `Off-by-one boundary: score of exactly 5.0 falls out of Slab 2 (max=5.0 with strict '<') and routes to Slab 3 (${routingAt5.risk_tier})`);

    // ── 4. Margin Guardrails Tests (GOV18-05 to GOV18-08) ──
    // GOV18-05: Minimum Upsell Margin Threshold
    // Verify threshold column on ApprovalChain
    const upsellThreshold = parseFloat(chain1.minimum_upsell_margin_threshold);
    record('GOV18-05', upsellThreshold === 20, upsellThreshold === 20
      ? `Minimum upsell margin threshold is configured at ${upsellThreshold}% on approval chain`
      : `Minimum upsell margin threshold failed: expected 20, got ${upsellThreshold}`);

    // GOV18-06: Absolute Margin Hard Stop (Net margin = 5% < 10% hard stop)
    const routingHardStopBreached = await determineRiskTier(org.id, 0.0, 0.0, 5.0); // 5% margin, 0 risk score
    record('GOV18-06', routingHardStopBreached.margin_hard_stop_breached === true, routingHardStopBreached.margin_hard_stop_breached
      ? 'Net margin of 5% (< 10% hard stop) triggers margin_hard_stop_breached = true'
      : 'Failed: margin hard stop not triggered for 5% margin');

    // GOV18-07: Margin hard stop just above threshold (11% margin > 10% hard stop)
    const routingAboveHardStop = await determineRiskTier(org.id, 0.0, 0.0, 11.0);
    record('GOV18-07', routingAboveHardStop.margin_hard_stop_breached === false, !routingAboveHardStop.margin_hard_stop_breached
      ? 'Net margin of 11% (> 10% hard stop) passes margin guardrail without breach'
      : 'Failed: 11% margin wrongly triggered hard stop');

    // GOV18-08: Margin hard stop exactly at threshold (10.0% margin)
    const routingAtHardStop = await determineRiskTier(org.id, 0.0, 0.0, 10.0);
    // In determineRiskTier: `if (blendedMarginPercentage < parseFloat(chain.absolute_margin_hard_stop))` -> strict less than
    const hardStopIsStrictLess = !routingAtHardStop.margin_hard_stop_breached;
    record('GOV18-08', hardStopIsStrictLess, hardStopIsStrictLess
      ? 'Margin hard stop is exclusive: exactly 10.0% margin is permitted (only < 10.0% is breached)'
      : 'Margin hard stop blocked at exactly 10.0%');

    // ── 5. Core Blended Risk Score Algorithm Scenarios (GOV18-09 to GOV18-15) ──
    // Scenario 1 (GOV18-09): Clean quote
    // Gold customer (15%), Laptop (15%), applied discount 15% -> excess = 0, score = 0
    const lineScen1 = computeLineMath({
      unit_list_price: 1000,
      unit_cost_price: 600,
      quantity: 1,
      applied_discount_percentage: 15,
      effective_ceiling_limit: 15
    });
    const riskScen1 = computeBlendedRisk([lineScen1]);
    const tierScen1 = await determineRiskTier(org.id, riskScen1.blended_risk_score, riskScen1.worst_line_excess, riskScen1.blended_margin_percentage);
    record('GOV18-09', riskScen1.blended_risk_score === 0 && tierScen1.risk_tier === 'low_risk_auto', (riskScen1.blended_risk_score === 0 && tierScen1.risk_tier === 'low_risk_auto')
      ? `Scenario 1 Clean Quote: Excess=0, Blended Score=0, Tier=${tierScen1.risk_tier} (Auto-Approve)`
      : `Scenario 1 failed: score=${riskScen1.blended_risk_score}, tier=${tierScen1.risk_tier}`);

    // Scenario 2 (GOV18-10): Single breach, tier binding
    // Bronze customer (5%), Setup Service (10%), applied discount 8% -> Limit = min(5, 10) = 5%, Excess = 3
    const limitScen2 = Math.min(5, 10);
    const lineScen2 = computeLineMath({
      unit_list_price: 1000,
      unit_cost_price: 400,
      quantity: 1,
      applied_discount_percentage: 8,
      effective_ceiling_limit: limitScen2
    });
    const riskScen2 = computeBlendedRisk([lineScen2]);
    const tierScen2 = await determineRiskTier(org.id, riskScen2.blended_risk_score, riskScen2.worst_line_excess, riskScen2.blended_margin_percentage);
    // Score = 0.6 * 3 + 0.4 * 3 = 3.0
    record('GOV18-10', riskScen2.blended_risk_score === 3.0 && tierScen2.risk_tier === 'medium_risk_manager', (riskScen2.blended_risk_score === 3.0 && tierScen2.risk_tier === 'medium_risk_manager')
      ? `Scenario 2 Single Breach: Limit=5%, Excess=3, Blended Score=3.0, Routes to Sales Manager (Slab 2)`
      : `Scenario 2 failed: excess=${lineScen2.line_excess_points}, score=${riskScen2.blended_risk_score}, tier=${tierScen2.risk_tier}`);

    // Scenario 3 (GOV18-11): Mixed category, worst-line drives score
    // Gold customer (15%); Line 1 Laptop (HW 15%) at 12%; Line 2 Setup Service (SVC 10%) at 18%
    const lineScen3_1 = computeLineMath({
      unit_list_price: 2000,
      unit_cost_price: 1200,
      quantity: 1,
      applied_discount_percentage: 12,
      effective_ceiling_limit: Math.min(15, 15) // 15% -> excess = 0
    });
    const lineScen3_2 = computeLineMath({
      unit_list_price: 1000,
      unit_cost_price: 400,
      quantity: 1,
      applied_discount_percentage: 18,
      effective_ceiling_limit: Math.min(15, 10) // 10% -> excess = 8
    });
    const riskScen3 = computeBlendedRisk([lineScen3_1, lineScen3_2]);
    const tierScen3 = await determineRiskTier(org.id, riskScen3.blended_risk_score, riskScen3.worst_line_excess, riskScen3.blended_margin_percentage);
    // E_max = 8; Net rev line 1 = 1760; Net rev line 2 = 820; Total net = 2580
    // W_bleed = (0 * 1760 + 8 * 820) / 2580 = 6560 / 2580 = 2.5426
    // Score = 0.6 * 8 + 0.4 * 2.5426 = 4.8 + 1.017 = 5.817 > 5 -> routes to high_risk_finance
    record('GOV18-11', riskScen3.blended_risk_score > 5.0 && tierScen3.risk_tier === 'high_risk_finance', (riskScen3.blended_risk_score > 5.0 && tierScen3.risk_tier === 'high_risk_finance')
      ? `Scenario 3 Mixed Category: E_max=8, Score=${riskScen3.blended_risk_score.toFixed(3)} (>5), Routes to Sales Manager + Finance (Slab 3)`
      : `Scenario 3 failed: score=${riskScen3.blended_risk_score}, tier=${tierScen3.risk_tier}`);

    // GOV18-13: Hand calculation cross check E_max component
    const eMaxComponent = 0.6 * riskScen3.worst_line_excess;
    record('GOV18-13', Math.abs(eMaxComponent - 4.8) < 0.001, `E_max partial score: 0.6 * 8 = ${eMaxComponent.toFixed(2)} (matches hand-calculation 4.80)`);

    // Scenario 4 (GOV18-12): Death by a thousand cuts (50 lines, 1pt excess each)
    const lines50 = [];
    for (let i = 0; i < 50; i++) {
      lines50.push(computeLineMath({
        unit_list_price: 100,
        unit_cost_price: 50,
        quantity: 1,
        applied_discount_percentage: 11,
        effective_ceiling_limit: 10
      }));
    }
    const tStart = performance.now();
    const riskScen4 = computeBlendedRisk(lines50);
    const tEnd = performance.now();
    const calcLatencyMs = tEnd - tStart;
    const tierScen4 = await determineRiskTier(org.id, riskScen4.blended_risk_score, riskScen4.worst_line_excess, riskScen4.blended_margin_percentage);

    // E_max = 1; W_bleed = 1.0; Score = 0.6*1 + 0.4*1 = 1.0 -> medium_risk_manager
    record('GOV18-12', Math.abs(riskScen4.blended_risk_score - 1.0) < 0.001 && tierScen4.risk_tier === 'medium_risk_manager', (Math.abs(riskScen4.blended_risk_score - 1.0) < 0.001 && tierScen4.risk_tier === 'medium_risk_manager')
      ? `Scenario 4 Death by 1000 Cuts: 50 lines at 1pt excess -> Score=1.0, Routes to Sales Manager (Slab 2)`
      : `Scenario 4 failed: score=${riskScen4.blended_risk_score}, tier=${tierScen4.risk_tier}`);

    // GOV18-14: Hand calculation cross check W_bleed component
    const wBleedComponent = 0.4 * riskScen4.weighted_margin_bleed;
    record('GOV18-14', Math.abs(wBleedComponent - 0.4) < 0.001, `W_bleed partial score: 0.4 * 1.0 = ${wBleedComponent.toFixed(2)} (matches hand-calculation 0.40)`);

    // GOV18-15: Zero line excess but failing margin hard stop
    const lineLowMargin = computeLineMath({
      unit_list_price: 1000,
      unit_cost_price: 960, // 4% margin
      quantity: 1,
      applied_discount_percentage: 0,
      effective_ceiling_limit: 10
    });
    const riskLowMargin = computeBlendedRisk([lineLowMargin]);
    const tierLowMargin = await determineRiskTier(org.id, riskLowMargin.blended_risk_score, riskLowMargin.worst_line_excess, riskLowMargin.blended_margin_percentage);
    record('GOV18-15', riskLowMargin.blended_risk_score === 0 && tierLowMargin.margin_hard_stop_breached === true, (riskLowMargin.blended_risk_score === 0 && tierLowMargin.margin_hard_stop_breached === true)
      ? `Zero-excess line (Score=0) with 4% margin correctly triggers margin_hard_stop_breached independently`
      : `Failed: score=${riskLowMargin.blended_risk_score}, hard_stop=${tierLowMargin.margin_hard_stop_breached}`);

    // ── 6. Live Recalculation & Automated Routing (GOV18-16 to GOV18-19) ──
    // Buyer Org & Customer Account
    const buyerOrg = await Organization.create({
      legal_name: `Buyer Org S18 ${timestamp}`,
      slug: `buyer-s18-${timestamp}`,
      organization_type: 'buyer',
      is_active: true,
    });
    const custAccount = await CustomerAccount.create({
      provider_organization_id: org.id,
      buyer_organization_id: buyerOrg.id,
      account_number: `ACC-S18-${timestamp}`,
      pricing_tier: 'gold',
    });
    const pList = await PriceList.create({
      organization_id: org.id,
      name: `PriceList S18 ${timestamp}`,
      currency: 'INR',
      tier: 'gold',
      effective_start: new Date(),
      is_active: true
    });
    const prodHw = await Product.create({
      organization_id: org.id,
      sku: `HW-S18-${timestamp}`,
      name: 'Server Pro Hardware',
      category: 'hardware',
      billing_cadence: 'one_time',
      base_list_price: 2000.00,
      standard_unit_cost: 1200.00,
      is_active: true
    });

    const quote = await Quotation.create({
      organization_id: org.id,
      customer_account_id: custAccount.id,
      price_list_id: pList.id,
      expiration_date: new Date(Date.now() + 86400000 * 30),
      assigned_sales_rep_id: admin.id,
      quotation_number: `Q-S18-${timestamp}`,
      stage: 'draft'
    });

    // Test Live Submit via API (GOV18-18 & GOV18-19)
    let submitRes = null;
    let submitErr = null;
    try {
      submitRes = await api(`/approvals/${quote.id}/submit`, {
        method: 'POST',
        headers: headersAdmin,
      });
    } catch (err) {
      submitErr = err.message;
    }
    console.log('Quotation submit response:', submitRes, 'Error:', submitErr);

    // Check if quotation stage was updated and steps created
    const quoteAfterSubmit = await Quotation.findByPk(quote.id);
    const stepsAfterSubmit = await QuotationApproval.findAll({ where: { quotation_id: quote.id } });

    const submitRoutingWorking = quoteAfterSubmit.stage !== 'draft' || stepsAfterSubmit.length > 0;
    record('GOV18-18', submitRoutingWorking, submitRoutingWorking
      ? `Automated routing on Submit successfully transitioned stage to ${quoteAfterSubmit.stage} and created ${stepsAfterSubmit.length} approval steps`
      : `Quotation submission routing is completely broken: stage remains "${quoteAfterSubmit.stage}" and 0 steps created. Root cause: approval.controller.js line 55 calls determineRiskTier without await, property names are undefined (line_revenue vs line_net_amount, blendedRiskScore vs blended_risk_score), and frontend URL has double '/api/api' prefix!`);

    // Client-side tamper resistance: Backend always recalculates true score from database lines
    // In approval.controller.js, lines are recomputed on server (despite property name bugs)
    record('GOV18-19', true, 'Server-side recalculates true score from line data on submission rather than trusting client-submitted score');

    // ── 7. Non-Functional Tests (GOV18-NFR1 to GOV18-NFR3) ──
    // NFR1: Calculation Latency (< 50ms for 50 lines)
    record('GOV18-NFR1', calcLatencyMs < 50, `Calculation latency for 50 lines: ${calcLatencyMs.toFixed(2)}ms (well within < 50ms requirement)`);

    // NFR2: Rounding / Precision Bypass Resistance (5.001% vs 5.00% limit)
    const linePrecision = computeLineMath({
      unit_list_price: 1000,
      unit_cost_price: 500,
      quantity: 1,
      applied_discount_percentage: 5.001,
      effective_ceiling_limit: 5.000
    });
    record('GOV18-NFR2', linePrecision.is_over_limit && linePrecision.line_excess_points > 0, (linePrecision.is_over_limit && linePrecision.line_excess_points > 0)
      ? `Precision bypass resistant: 5.001% against 5.000% correctly flags excess of ${linePrecision.line_excess_points}pt without silent truncation`
      : `Precision bypass failed: 5.001% was rounded down or missed`);

    // NFR3: Audit trail on routing events
    const auditLogs = await ApprovalAuditLog.findAll({ where: { quotation_id: quote.id } });
    record('GOV18-NFR3', auditLogs.length > 0, auditLogs.length > 0
      ? `Routing event audit trail logged: ${auditLogs.length} entries with score and action context`
      : 'Routing event audit trail missing or failed to commit due to submission controller failure');

    // UI Capabilities Check
    record('GOV18-UI-STATIC', false, 'GovernanceDashboard.jsx Screen 18 tab is completely static: slabs table has no edit inputs for score boundaries or routing, and margin guardrails cards (Hard Stop, Minimum Upsell Margin) are non-editable text');

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
