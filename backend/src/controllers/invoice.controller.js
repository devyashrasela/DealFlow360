import { Op } from 'sequelize';
import {
  generateInvoiceFromQuote,
  recordPayment,
  applyCreditNoteOffset,
} from '../services/invoice.service.js';
import {
  Invoice,
  InvoiceLine,
  Payment,
  CreditAllocation,
  CustomerAccount,
  Organization,
  Subscription,
  Quotation,
  Product,
} from '../models/index.js';

/**
 * GET /api/invoices
 */
export const listInvoices = async (req, res, next) => {
  try {
    const { status, document_type } = req.query;
    const where = { organization_id: req.orgContext.organizationId };
    if (status) where.status = status;
    if (document_type) where.document_type = document_type;

    const invoices = await Invoice.findAll({
      where,
      include: [
        {
          model: CustomerAccount,
          as: 'customer_account',
          include: [{ model: Organization, as: 'buyer_organization', attributes: ['id', 'legal_name', 'trading_name'] }],
        },
        { model: InvoiceLine, as: 'lines', include: [{ model: Product, as: 'product', attributes: ['id', 'sku', 'name'] }] },
        { model: Payment, as: 'payments', attributes: ['id', 'payment_number', 'amount', 'payment_method', 'payment_status', 'payment_date'] },
        { model: Quotation, as: 'origin_quotation', attributes: ['id', 'quotation_number'] },
        { model: Subscription, as: 'origin_subscription', attributes: ['id', 'subscription_code'] },
      ],
      order: [['issue_date', 'DESC']],
    });

    // KPI aggregation
    const totalOutstanding = invoices
      .filter((i) => ['posted', 'partially_paid'].includes(i.status))
      .reduce((sum, i) => sum + Number(i.balance_due || 0), 0);

    const now = new Date();
    const overdueInvoices = invoices.filter(
      (i) => ['posted', 'partially_paid'].includes(i.status) && new Date(i.due_date) < now
    );
    const overdueTotal = overdueInvoices.reduce((sum, i) => sum + Number(i.balance_due || 0), 0);

    const totalPaid = invoices
      .filter((i) => i.status === 'paid')
      .reduce((sum, i) => sum + Number(i.total_amount || 0), 0);

    const unappliedCredits = invoices
      .filter((i) => i.document_type === 'credit_note')
      .reduce((sum, i) => sum + Number(i.balance_due || 0), 0);

    return res.status(200).json({
      success: true,
      count: invoices.length,
      kpis: {
        total_outstanding: Number(totalOutstanding.toFixed(2)),
        overdue_count: overdueInvoices.length,
        overdue_amount: Number(overdueTotal.toFixed(2)),
        total_overdue: Number(overdueTotal.toFixed(2)),
        total_collected: Number(totalPaid.toFixed(2)),
        unapplied_credits: Number(unappliedCredits.toFixed(2)),
        total_credited: Number(unappliedCredits.toFixed(2)),
      },
      data: invoices,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/invoices/:id
 */
export const getInvoiceDetail = async (req, res, next) => {
  try {
    const invoice = await Invoice.findOne({
      where: { id: req.params.id, organization_id: req.orgContext.organizationId },
      include: [
        {
          model: CustomerAccount,
          as: 'customer_account',
          include: [{ model: Organization, as: 'buyer_organization' }],
        },
        { model: InvoiceLine, as: 'lines', include: [{ model: Product, as: 'product' }] },
        { model: Payment, as: 'payments' },
        {
          model: CreditAllocation,
          as: 'received_credit_allocations',
          include: [{ model: Invoice, as: 'credit_note_invoice', attributes: ['id', 'invoice_number', 'document_type'] }],
        },
        { model: Quotation, as: 'origin_quotation', attributes: ['id', 'quotation_number'] },
        { model: Subscription, as: 'origin_subscription', attributes: ['id', 'subscription_code'] },
      ],
    });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found.' });
    }

    return res.status(200).json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/invoices/generate/:quotationId
 */
export const generateFromQuote = async (req, res, next) => {
  try {
    const result = await generateInvoiceFromQuote(req.params.quotationId);
    return res.status(201).json({
      success: true,
      message: result.invoice ? 'Invoice generated successfully.' : result.message,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/invoices/:id/payments
 * Body: { amount, payment_method, transaction_reference?, payment_date?, recorded_by_user_id }
 */
export const recordPaymentHandler = async (req, res, next) => {
  try {
    const { amount, payment_method, transaction_reference, payment_date } = req.body;
    const recorded_by_user_id = req.body.recorded_by_user_id || req.body.actor_user_id || req.user?.id;

    if (!amount || !payment_method || !recorded_by_user_id) {
      return res.status(400).json({
        success: false,
        error: 'amount, payment_method, and recorded_by_user_id are required.',
      });
    }

    const result = await recordPayment({
      invoiceId: req.params.id,
      amount: Number(amount),
      paymentMethod: payment_method,
      transactionReference: transaction_reference,
      paymentDate: payment_date,
      recordedByUserId: recorded_by_user_id,
    });

    return res.status(200).json({
      success: true,
      message: `Payment of ${amount} recorded. Invoice status: ${result.invoice.status}`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/invoices/:id/apply-credit
 * Body: { credit_note_invoice_id, amount, allocated_by_user_id }
 */
export const applyCreditOffset = async (req, res, next) => {
  try {
    const { credit_note_invoice_id, amount } = req.body;
    const allocated_by_user_id = req.body.allocated_by_user_id || req.body.applied_by_user_id || req.user?.id;
    const target_invoice_id = req.params.id;

    if (!credit_note_invoice_id || !target_invoice_id || !amount || !allocated_by_user_id) {
      return res.status(400).json({
        success: false,
        error: 'credit_note_invoice_id, target_invoice_id, amount, and allocated_by_user_id are required.',
      });
    }

    const result = await applyCreditNoteOffset({
      creditNoteInvoiceId: credit_note_invoice_id,
      targetInvoiceId: target_invoice_id,
      amount: Number(amount),
      allocatedByUserId: allocated_by_user_id,
    });

    return res.status(200).json({
      success: true,
      message: `Credit offset of ${amount} applied.`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};
