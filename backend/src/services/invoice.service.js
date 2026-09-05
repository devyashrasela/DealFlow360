import { Op } from 'sequelize';
import {
  sequelize,
  Invoice,
  InvoiceLine,
  Payment,
  CreditAllocation,
  CustomerAccount,
  Organization,
  Product,
  Subscription,
  Quotation,
} from '../models/index.js';

/**
 * Service: Unified Financial Ledger
 * Handles invoice generation, payment recording, credit note offsets, and balance recalculations.
 */

/**
 * Generate a standard invoice from a confirmed quotation's one-time lines.
 */
export const generateInvoiceFromQuote = async (quotationId) => {
  return sequelize.transaction(async (t) => {
    const { QuotationLine } = await import('../models/index.js');

    const quotation = await Quotation.findByPk(quotationId, {
      include: [
        {
          model: QuotationLine,
          as: 'lines',
          where: { billing_cadence: 'one_time' },
          required: false,
          include: [{ model: Product, as: 'product' }],
        },
      ],
      transaction: t,
    });

    if (!quotation) {
      const err = new Error(`Quotation not found: ${quotationId}`);
      err.status = 404;
      throw err;
    }

    const oneTimeLines = quotation.lines || [];
    if (oneTimeLines.length === 0) {
      return { message: 'No one-time invoice lines found.', invoice: null };
    }

    let grossSubtotal = 0;
    let totalDiscount = 0;
    const invoiceLines = [];

    for (const line of oneTimeLines) {
      const gross = Number(line.unit_list_price) * Number(line.quantity);
      const discountAmt = gross * (Number(line.applied_discount_percentage || 0) / 100);
      const netAmount = gross - discountAmt;

      grossSubtotal += gross;
      totalDiscount += discountAmt;

      invoiceLines.push({
        product_id: line.product_id,
        line_description: line.product?.name || `Product Line #${line.line_number}`,
        category: line.category,
        billing_cadence: 'one_time',
        quantity: line.quantity,
        unit_price: line.unit_list_price,
        discount_amount: Number(discountAmt.toFixed(2)),
        net_amount: Number(netAmount.toFixed(2)),
        tax_rate_percentage: 0,
        line_total_with_tax: Number(netAmount.toFixed(2)),
      });
    }

    const totalAmount = grossSubtotal - totalDiscount;

    const invoice = await Invoice.create({
      organization_id: quotation.organization_id,
      customer_account_id: quotation.customer_account_id,
      origin_quotation_id: quotation.id,
      invoice_number: `INV-${quotation.quotation_number}-${Date.now().toString().slice(-4)}`,
      document_type: 'standard_invoice',
      status: 'posted',
      issue_date: new Date(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      gross_subtotal: Number(grossSubtotal.toFixed(2)),
      discount_amount: Number(totalDiscount.toFixed(2)),
      tax_amount: 0,
      total_amount: Number(totalAmount.toFixed(2)),
      amount_paid: 0,
      amount_credited: 0,
      balance_due: Number(totalAmount.toFixed(2)),
    }, { transaction: t });

    for (const lineData of invoiceLines) {
      await InvoiceLine.create({ ...lineData, invoice_id: invoice.id }, { transaction: t });
    }

    return { invoice, line_count: invoiceLines.length };
  });
};

/**
 * Record a payment against an invoice. Recalculates balance_due and status atomically.
 */
export const recordPayment = async ({ invoiceId, amount, paymentMethod, transactionReference, paymentDate, recordedByUserId }) => {
  return sequelize.transaction(async (t) => {
    const invoice = await Invoice.findByPk(invoiceId, {
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!invoice) {
      const err = new Error(`Invoice not found: ${invoiceId}`);
      err.status = 404;
      throw err;
    }

    if (['paid', 'void', 'credited'].includes(invoice.status)) {
      const err = new Error(`Invoice ${invoice.invoice_number} is already in status '${invoice.status}'. Cannot record payment.`);
      err.status = 400;
      throw err;
    }

    const paymentAmount = Number(Number(amount).toFixed(2));
    if (paymentAmount <= 0) {
      const err = new Error('Payment amount must be greater than zero.');
      err.status = 400;
      throw err;
    }

    if (paymentAmount > Number(invoice.balance_due)) {
      const err = new Error(`Payment amount (${paymentAmount}) exceeds balance due (${invoice.balance_due}).`);
      err.status = 400;
      throw err;
    }

    const payment = await Payment.create({
      organization_id: invoice.organization_id,
      customer_account_id: invoice.customer_account_id,
      invoice_id: invoice.id,
      payment_number: `PAY-${invoice.invoice_number}-${Date.now().toString().slice(-4)}`,
      amount: paymentAmount,
      payment_method: paymentMethod,
      payment_status: 'succeeded',
      transaction_reference: transactionReference || `TXN-${Date.now()}`,
      payment_date: paymentDate || new Date(),
      recorded_by_user_id: recordedByUserId,
    }, { transaction: t });

    // Recalculate invoice totals
    invoice.amount_paid = Number((Number(invoice.amount_paid) + paymentAmount).toFixed(2));
    invoice.balance_due = Number((Number(invoice.total_amount) - Number(invoice.amount_paid) - Number(invoice.amount_credited)).toFixed(2));

    if (invoice.balance_due <= 0) {
      invoice.status = 'paid';
      invoice.balance_due = 0;
    } else {
      invoice.status = 'partially_paid';
    }

    await invoice.save({ transaction: t });

    return { payment, invoice };
  });
};

/**
 * Apply a credit note offset against a target invoice. Runs in serializable isolation.
 */
export const applyCreditNoteOffset = async ({ creditNoteInvoiceId, targetInvoiceId, amount, allocatedByUserId }) => {
  return sequelize.transaction(async (t) => {
    const creditNote = await Invoice.findByPk(creditNoteInvoiceId, {
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!creditNote || creditNote.document_type !== 'credit_note') {
      const err = new Error('Source document is not a valid credit note.');
      err.status = 400;
      throw err;
    }

    const targetInvoice = await Invoice.findByPk(targetInvoiceId, {
      lock: t.LOCK.UPDATE,
      transaction: t,
    });

    if (!targetInvoice) {
      const err = new Error(`Target invoice not found: ${targetInvoiceId}`);
      err.status = 404;
      throw err;
    }

    const allocateAmount = Number(Number(amount).toFixed(2));
    const availableCredit = Number(creditNote.balance_due);
    const targetBalance = Number(targetInvoice.balance_due);

    if (allocateAmount <= 0) {
      const err = new Error('Allocation amount must be greater than zero.');
      err.status = 400;
      throw err;
    }

    if (allocateAmount > availableCredit) {
      const err = new Error(`Allocation (${allocateAmount}) exceeds available credit balance (${availableCredit}).`);
      err.status = 400;
      throw err;
    }

    if (allocateAmount > targetBalance) {
      const err = new Error(`Allocation (${allocateAmount}) exceeds target invoice balance due (${targetBalance}).`);
      err.status = 400;
      throw err;
    }

    // Enforce origin debt offset: if credit note belongs to a subscription, it must pay off that subscription's debt first
    if (creditNote.origin_subscription_id && creditNote.origin_subscription_id !== targetInvoice.origin_subscription_id) {
      // Check if there are any unpaid invoices for the origin subscription
      const unpaidOriginInvoices = await Invoice.count({
        where: {
          origin_subscription_id: creditNote.origin_subscription_id,
          status: ['posted', 'partially_paid'],
          document_type: {
            [Op.ne]: 'credit_note', // don't count other credit notes
          }
        },
        transaction: t,
      });

      if (unpaidOriginInvoices > 0) {
        const err = new Error('Credit note must offset unpaid parent contract invoice first before releasing unallocated credit.');
        err.status = 400;
        throw err;
      }
    }

    // Create allocation record
    const allocation = await CreditAllocation.create({
      credit_note_invoice_id: creditNote.id,
      target_invoice_id: targetInvoice.id,
      allocated_amount: allocateAmount,
      is_origin_debt_offset: creditNote.origin_subscription_id === targetInvoice.origin_subscription_id,
      allocated_by_user_id: allocatedByUserId,
    }, { transaction: t });

    // Update credit note balance
    creditNote.amount_credited = Number((Number(creditNote.amount_credited) + allocateAmount).toFixed(2));
    creditNote.balance_due = Number((Number(creditNote.total_amount) - Number(creditNote.amount_credited)).toFixed(2));
    if (creditNote.balance_due <= 0) {
      creditNote.status = 'credited';
      creditNote.balance_due = 0;
    }
    await creditNote.save({ transaction: t });

    // Update target invoice
    targetInvoice.amount_credited = Number((Number(targetInvoice.amount_credited) + allocateAmount).toFixed(2));
    targetInvoice.balance_due = Number((Number(targetInvoice.total_amount) - Number(targetInvoice.amount_paid) - Number(targetInvoice.amount_credited)).toFixed(2));
    if (targetInvoice.balance_due <= 0) {
      targetInvoice.status = 'paid';
      targetInvoice.balance_due = 0;
    } else if (Number(targetInvoice.amount_paid) + Number(targetInvoice.amount_credited) > 0) {
      targetInvoice.status = 'partially_paid';
    }
    await targetInvoice.save({ transaction: t });

    return { allocation, credit_note: creditNote, target_invoice: targetInvoice };
  });
};
