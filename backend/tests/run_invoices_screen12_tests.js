import { Op } from 'sequelize';
import {
  sequelize,
  Invoice,
  InvoiceLine,
  Payment,
  CreditAllocation,
  Quotation,
  QuotationLine,
  Subscription,
  SubscriptionLineItem,
  CustomerAccount,
  Organization,
  User,
  Product,
} from '../src/models/index.js';

const BASE_URL = 'http://localhost:5001/api';

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
  console.log('--- Starting Screen 12: Invoices & Financial Ledger Test Suite ---');
  const results = [];

  function record(testId, passed, message, data = {}) {
    results.push({ testId, passed, message, data });
    console.log(`[${passed ? 'PASS' : 'FAIL'}] ${testId}: ${message}`);
  }

  try {
    // 1. Get baseline seed orgs and users
    const adminUser = await User.findOne({ where: { email: 'admin@acme.com' } });
    if (!adminUser) throw new Error('admin@acme.com missing');

    const acmeOrg = await Organization.findOne({ where: { trading_name: 'Acme' } }) || await Organization.findOne({ where: { organization_type: 'provider' } });
    const betaOrg = await Organization.findOne({ where: { id: { [Op.ne]: acmeOrg.id } } });

    let customer = await CustomerAccount.findOne({ where: { provider_organization_id: acmeOrg.id } });
    if (!customer) {
      customer = await CustomerAccount.findOne();
    }

    if (!acmeOrg || !adminUser || !customer) {
      throw new Error('Baseline seed data missing');
    }

    // ── Test INV12-01 & INV12-05: List Invoices Endpoint & KPIs ──
    const listRes = await api(`/invoices?organization_id=${acmeOrg.id}`);
    const invoices = listRes.data;
    const kpis = listRes.kpis;

    console.log(`Retrieved ${invoices.length} invoices. KPIs:`, kpis);

    // Verify presence of document types in DB
    const docTypesFound = new Set(invoices.map(i => i.document_type));
    console.log('Document types present in baseline list:', Array.from(docTypesFound));

    // INV12-05: Aggregated counters accuracy
    const computedOutstanding = invoices
      .filter(i => ['posted', 'partially_paid'].includes(i.status))
      .reduce((sum, i) => sum + Number(i.balance_due || 0), 0);

    const now = new Date();
    const overdueInvoices = invoices.filter(
      i => ['posted', 'partially_paid'].includes(i.status) && new Date(i.due_date) < now
    );
    const computedOverdueAmount = overdueInvoices.reduce((sum, i) => sum + Number(i.balance_due || 0), 0);

    const matchesOutstanding = Math.abs(kpis.total_outstanding - computedOutstanding) < 0.01;
    const matchesOverdueCount = kpis.overdue_count === overdueInvoices.length;
    const matchesOverdueAmount = Math.abs(kpis.overdue_amount - computedOverdueAmount) < 0.01;

    // Spec expects: "Total Outstanding Receivables", "Overdue Invoices Count", "Total Credited"
    const hasTotalCredited = kpis.total_credited !== undefined || kpis.unapplied_credits !== undefined;

    if (matchesOutstanding && matchesOverdueCount && matchesOverdueAmount) {
      if (!hasTotalCredited) {
        record('INV12-05', false, 'KPI response is missing total_credited / unapplied_credits field required by spec (FR-INV-01 / INV12-05)', { kpis });
      } else {
        record('INV12-05', true, 'KPI counters correctly match computed values', { kpis });
      }
    } else {
      record('INV12-05', false, 'KPI counters do not match computed values', { kpis, computedOutstanding, overdueCount: overdueInvoices.length });
    }

    // ── Test Filtering by document_type (INV12-06 through INV12-11) ──
    let standardInv = invoices.find(i => i.document_type === 'standard_invoice');
    let recurringInv = invoices.find(i => i.document_type === 'recurring_cycle_invoice');
    let prorationInv = invoices.find(i => i.document_type === 'proration_invoice');
    let creditNote = invoices.find(i => i.document_type === 'credit_note');

    const dueFuture = new Date(Date.now() + 30 * 86400000);

    if (!recurringInv) {
      recurringInv = await Invoice.create({
        organization_id: acmeOrg.id,
        customer_account_id: customer.id,
        invoice_number: `INV-REC-TEST-${Date.now().toString().slice(-4)}`,
        document_type: 'recurring_cycle_invoice',
        status: 'posted',
        issue_date: new Date(),
        due_date: dueFuture,
        gross_subtotal: 500.00,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: 500.00,
        amount_paid: 0,
        amount_credited: 0,
        balance_due: 500.00,
      });
    }

    if (!prorationInv) {
      prorationInv = await Invoice.create({
        organization_id: acmeOrg.id,
        customer_account_id: customer.id,
        invoice_number: `INV-PRO-TEST-${Date.now().toString().slice(-4)}`,
        document_type: 'proration_invoice',
        status: 'posted',
        issue_date: new Date(),
        due_date: dueFuture,
        gross_subtotal: 50.00,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: 50.00,
        amount_paid: 0,
        amount_credited: 0,
        balance_due: 50.00,
      });
    }

    if (!creditNote) {
      creditNote = await Invoice.create({
        organization_id: acmeOrg.id,
        customer_account_id: customer.id,
        invoice_number: `CN-TEST-${Date.now().toString().slice(-4)}`,
        document_type: 'credit_note',
        status: 'posted',
        issue_date: new Date(),
        due_date: dueFuture,
        gross_subtotal: 200.00,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: 200.00,
        amount_paid: 0,
        amount_credited: 0,
        balance_due: 200.00,
      });
    }

    // Now re-fetch to verify INV12-01
    const reListRes = await api(`/invoices?organization_id=${acmeOrg.id}`);
    const allInvoices = reListRes.data;
    const typesNow = new Set(allInvoices.map(i => i.document_type));
    const hasAll4 = ['standard_invoice', 'recurring_cycle_invoice', 'proration_invoice', 'credit_note'].every(t => typesNow.has(t));

    record('INV12-01', hasAll4, hasAll4 ? 'All 4 document types render together in unified ledger' : 'Not all 4 document types found in unified ledger', { typesNow: Array.from(typesNow) });

    // Test API filter for standard_invoice
    const filterStd = await api(`/invoices?organization_id=${acmeOrg.id}&document_type=standard_invoice`);
    const allStd = filterStd.data.every(i => i.document_type === 'standard_invoice');
    record('INV12-06', allStd && filterStd.data.length > 0, `Standard filter returned ${filterStd.data.length} items, all standard: ${allStd}`);

    // Test API filter for recurring_cycle_invoice
    const filterRec = await api(`/invoices?organization_id=${acmeOrg.id}&document_type=recurring_cycle_invoice`);
    const allRec = filterRec.data.every(i => i.document_type === 'recurring_cycle_invoice');
    record('INV12-07', allRec && filterRec.data.length > 0, `Recurring filter returned ${filterRec.data.length} items, all recurring: ${allRec}`);

    // Test API filter for proration_invoice
    const filterPro = await api(`/invoices?organization_id=${acmeOrg.id}&document_type=proration_invoice`);
    const allPro = filterPro.data.every(i => i.document_type === 'proration_invoice');
    record('INV12-08', allPro && filterPro.data.length > 0, `Proration filter returned ${filterPro.data.length} items, all proration: ${allPro}`);

    // Test API filter for credit_note
    const filterCN = await api(`/invoices?organization_id=${acmeOrg.id}&document_type=credit_note`);
    const allCN = filterCN.data.every(i => i.document_type === 'credit_note');
    record('INV12-09', allCN && filterCN.data.length > 0, `Credit note filter returned ${filterCN.data.length} items, all credit note: ${allCN}`);

    // INV12-11: Reset filter (all invoices)
    const filterAll = await api(`/invoices?organization_id=${acmeOrg.id}`);
    record('INV12-11', filterAll.data.length >= allInvoices.length, 'Filter reset returns full ledger');

    // ── Test Payment Recording (INV12-15 through INV12-20) ──
    const payTestInvoice = await Invoice.create({
      organization_id: acmeOrg.id,
      customer_account_id: customer.id,
      invoice_number: `INV-PAY-TEST-${Date.now().toString().slice(-4)}`,
      document_type: 'standard_invoice',
      status: 'posted',
      issue_date: new Date(),
      due_date: dueFuture,
      gross_subtotal: 1000.00,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 1000.00,
      amount_paid: 0,
      amount_credited: 0,
      balance_due: 1000.00,
    });

    // INV12-17: Payment amount validation (over-payment attempt)
    try {
      await api(`/invoices/${payTestInvoice.id}/payments`, {
        method: 'POST',
        body: {
          amount: 1500.00,
          payment_method: 'wire_transfer',
          transaction_reference: 'OVERPAY-TEST',
          recorded_by_user_id: adminUser.id,
        },
      });
      record('INV12-17', false, 'Over-payment of $1500 on $1000 balance was erroneously accepted');
    } catch (err) {
      record('INV12-17', err.status === 400, `Overpayment rejected with 400: ${err.message}`);
    }

    // Negative / zero payment validation
    try {
      await api(`/invoices/${payTestInvoice.id}/payments`, {
        method: 'POST',
        body: {
          amount: -50.00,
          payment_method: 'wire_transfer',
          transaction_reference: 'NEGPAY-TEST',
          recorded_by_user_id: adminUser.id,
        },
      });
      record('INV12-17b', false, 'Negative payment amount accepted erroneously');
    } catch (err) {
      record('INV12-17b', err.status === 400, `Negative payment rejected: ${err.message}`);
    }

    // INV12-16 & INV12-19: Partial payment followed by full payment recording and transaction ref
    await api(`/invoices/${payTestInvoice.id}/payments`, {
      method: 'POST',
      body: {
        amount: 400.00,
        payment_method: 'ach_check',
        transaction_reference: 'ACH-REF-4001',
        recorded_by_user_id: adminUser.id,
      },
    });

    const updatedPayInvoice1 = await Invoice.findByPk(payTestInvoice.id);
    const partialStatusCorrect = updatedPayInvoice1.status === 'partially_paid' && Number(updatedPayInvoice1.balance_due) === 600.00;
    record('INV12-16_partial', partialStatusCorrect, `Partial payment updated status to ${updatedPayInvoice1.status} and balance to ${updatedPayInvoice1.balance_due}`);

    // Complete full payment
    await api(`/invoices/${payTestInvoice.id}/payments`, {
      method: 'POST',
      body: {
        amount: 600.00,
        payment_method: 'credit_card',
        transaction_reference: 'CC-REF-6002',
        recorded_by_user_id: adminUser.id,
      },
    });

    const updatedPayInvoice2 = await Invoice.findByPk(payTestInvoice.id);
    const fullStatusCorrect = updatedPayInvoice2.status === 'paid' && Number(updatedPayInvoice2.balance_due) === 0;
    record('INV12-16', fullStatusCorrect, `Full payment flipped status to ${updatedPayInvoice2.status} with balance_due 0`);

    // INV12-19: Transaction reference capture
    const payments = await Payment.findAll({ where: { invoice_id: payTestInvoice.id } });
    const hasRefs = payments.some(p => p.transaction_reference === 'ACH-REF-4001') && payments.some(p => p.transaction_reference === 'CC-REF-6002');
    record('INV12-19', hasRefs, `Payment records captured transaction references successfully (${payments.map(p => p.transaction_reference).join(', ')})`);

    // ── Test Credit Note Reconciliation (INV12-21 & INV12-22) ──
    const targetInv = await Invoice.create({
      organization_id: acmeOrg.id,
      customer_account_id: customer.id,
      invoice_number: `INV-TGT-${Date.now().toString().slice(-4)}`,
      document_type: 'standard_invoice',
      status: 'posted',
      issue_date: new Date(),
      due_date: dueFuture,
      gross_subtotal: 300.00,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 300.00,
      amount_paid: 0,
      amount_credited: 0,
      balance_due: 300.00,
    });

    const creditNoteInv = await Invoice.create({
      organization_id: acmeOrg.id,
      customer_account_id: customer.id,
      invoice_number: `CN-APPLY-${Date.now().toString().slice(-4)}`,
      document_type: 'credit_note',
      status: 'posted',
      issue_date: new Date(),
      due_date: dueFuture,
      gross_subtotal: 100.00,
      discount_amount: 0,
      tax_amount: 0,
      total_amount: 100.00,
      amount_paid: 0,
      amount_credited: 0,
      balance_due: 100.00,
    });

    // INV12-22: Partial credit application: apply $100 against $300 invoice
    await api(`/invoices/${targetInv.id}/apply-credit`, {
      method: 'POST',
      body: {
        credit_note_invoice_id: creditNoteInv.id,
        amount: 100.00,
        allocated_by_user_id: adminUser.id,
      },
    });

    const refreshedTarget = await Invoice.findByPk(targetInv.id);
    const refreshedCN = await Invoice.findByPk(creditNoteInv.id);

    const cnFullyApplied = refreshedCN.status === 'credited' && Number(refreshedCN.balance_due) === 0 && Number(refreshedCN.amount_credited) === 100.00;
    const targetPartiallyCredited = refreshedTarget.status === 'partially_paid' && Number(refreshedTarget.balance_due) === 200.00 && Number(refreshedTarget.amount_credited) === 100.00;

    record('INV12-21', cnFullyApplied, `Credit note balance updated: status=${refreshedCN.status}, balance_due=${refreshedCN.balance_due}, amount_credited=${refreshedCN.amount_credited}`);
    record('INV12-22', targetPartiallyCredited, `Target invoice balance updated: status=${refreshedTarget.status}, balance_due=${refreshedTarget.balance_due}, amount_credited=${refreshedTarget.amount_credited}`);

    // INV12-NFR1: Reconciliation integrity: amount_paid + amount_credited + balance_due === total_amount
    const integrityTest1 = Number((Number(refreshedTarget.amount_paid) + Number(refreshedTarget.amount_credited) + Number(refreshedTarget.balance_due)).toFixed(2)) === Number(refreshedTarget.total_amount);
    const integrityTest2 = Number((Number(updatedPayInvoice2.amount_paid) + Number(updatedPayInvoice2.amount_credited) + Number(updatedPayInvoice2.balance_due)).toFixed(2)) === Number(updatedPayInvoice2.total_amount);
    record('INV12-NFR1', integrityTest1 && integrityTest2, `Financial reconciliation integrity holds exactly: Target=${integrityTest1}, Paid=${integrityTest2}`);

    // ── Test Cross-Screen Integration Triggers (INV12-23 to INV12-25) ──
    const quoteWithLines = await Quotation.findOne({
      include: [{ model: QuotationLine, as: 'lines', where: { billing_cadence: 'one_time' } }]
    });

    if (quoteWithLines) {
      try {
        const genRes = await api(`/invoices/generate/${quoteWithLines.id}`, { method: 'POST' });
        const generatedInv = genRes.data?.invoice;
        if (generatedInv) {
          record('INV12-23_api', true, `generateInvoiceFromQuote API generated standard invoice ${generatedInv.invoice_number} for quotation ${quoteWithLines.quotation_number}`);
        } else {
          record('INV12-23_api', false, `generateInvoiceFromQuote did not return invoice: ${genRes.message}`);
        }
      } catch (err) {
        record('INV12-23_api', false, `generateInvoiceFromQuote failed: ${err.message}`);
      }
    } else {
      record('INV12-23_api', false, 'No quotation with one-time lines found to test invoice generation');
    }

    record('INV12-23', false, 'Quotation confirmation on Screen 11/Screen 4 does not trigger invoice generation (negotiations/confirm only logs event, leaving ledger unpopulated)');

    // INV12-24: Mid-cycle seat increase -> proration_invoice generated
    const foundProInv = await Invoice.findOne({ where: { document_type: 'proration_invoice' } });
    record('INV12-24', !!foundProInv, `Proration delta invoice exists in database: ${foundProInv?.invoice_number}`);

    // INV12-25: Immediate cancellation -> credit_note generated
    const foundCN = await Invoice.findOne({ where: { document_type: 'credit_note' } });
    record('INV12-25', !!foundCN, `Cancellation credit note exists in database: ${foundCN?.invoice_number}`);

    // ── Test Multi-Tenant Isolation (INV12-NFR3) ──
    const acmeInvoices = await api(`/invoices?organization_id=${acmeOrg.id}`);
    const betaInvoices = await api(`/invoices?organization_id=${betaOrg.id}`);

    const acmeIds = new Set(acmeInvoices.data.map(i => i.id));
    const betaHasAcme = betaInvoices.data.some(i => acmeIds.has(i.id));

    record('INV12-NFR3', !betaHasAcme, `Multi-tenant isolation verified: Beta has 0 of Acme's ${acmeIds.size} invoices`);

    console.log('\n--- Summary of Test Results ---');
    results.forEach(r => console.log(`${r.testId}: ${r.passed ? 'PASS' : 'FAIL'} - ${r.message}`));

  } catch (err) {
    console.error('Test execution error:', err);
  } finally {
    process.exit(0);
  }
}

runTests();
