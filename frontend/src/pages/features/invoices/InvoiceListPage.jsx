import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Receipt, Search, Filter } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { listInvoices, recordPayment, applyCreditOffset } from '../../../api/invoiceApi';
import { formatDualCurrency, convertFromBase } from '../../../utils/currency';
import { AdvancedFilter } from '../../../components/ui/AdvancedFilter';
import { useAdvancedFilter } from '../../../hooks/useAdvancedFilter';

export const InvoiceListPage = () => {
  const { providerSlug } = useParams();

  const INVOICE_FILTER_SCHEMA = [
    { key: 'total_amount', label: 'Total Amount ($)', type: 'number' },
    { key: 'balance_due', label: 'Balance Due ($)', type: 'number' },
    { key: 'days_overdue', label: 'Days Overdue', type: 'number', getValue: (inv) => {
        if (inv.status === 'paid' || inv.status === 'void') return 0;
        const diff = Math.floor((new Date() - new Date(inv.due_date)) / (1000 * 60 * 60 * 24));
        return Math.max(0, diff);
    }}
  ];

  const [invoices, setInvoices] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [docTypeFilter, setDocTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [transactionRef, setTransactionRef] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Credit Offset Modal state
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState(null);
  const [targetInvoiceId, setTargetInvoiceId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [isApplyingCredit, setIsApplyingCredit] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [providerSlug]);

  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const res = await listInvoices();
      setInvoices(res.data || []);
      setKpis(res.kpis);
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'draft': return <Badge status="draft" title="Draft • In preparation, not yet posted">Draft</Badge>;
      case 'issued': return <Badge status="issued" title="Issued • Transmitted to customer">Issued</Badge>;
      case 'posted': return <Badge status="posted" title="Posted • Recognized in financial ledger">Posted</Badge>;
      case 'partially_paid': return <Badge status="partially_paid" title="Partially Paid • Partial balance outstanding">Partially Paid</Badge>;
      case 'paid': return <Badge status="paid" title="Paid • Full invoice settlement posted">Paid</Badge>;
      case 'credited': return <Badge status="credited" title="Credited • Settled via credit offset note">Credited</Badge>;
      case 'overdue': return <Badge status="overdue" title="Overdue • Payment terms deadline lapsed">Overdue</Badge>;
      case 'void': return <Badge status="void" title="Void • Cancelled / Invalidated statement">Void</Badge>;
      default: return <Badge status={status}>{status}</Badge>;
    }
  };

  const openPaymentModal = (inv) => {
    setSelectedInvoice(inv);
    const txnBalance = convertFromBase(inv.balance_due, inv.exchange_rate_to_base);
    setPaymentAmount(txnBalance || '');
    setPaymentMethod('bank_transfer');
    setTransactionRef('');
    setIsPaymentModalOpen(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentAmount || Number(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    setIsSubmittingPayment(true);
    try {
      const baseAmount = convertToBase(Number(paymentAmount), selectedInvoice.exchange_rate_to_base);
      await recordPayment(selectedInvoice.id, {
        amount: baseAmount,
        amount_in_transaction_currency: Number(paymentAmount),
        transaction_currency: selectedInvoice.transaction_currency,
        exchange_rate_used: selectedInvoice.exchange_rate_to_base,
        payment_method: paymentMethod,
        transaction_reference: transactionRef || undefined,
        payment_date: new Date(),
      });
      setIsPaymentModalOpen(false);
      fetchInvoices();
    } catch (err) {
      alert('Failed to record payment: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const openCreditModal = (creditNote) => {
    setSelectedCreditNote(creditNote);
    setCreditAmount(creditNote.balance_due || '');
    // Auto-select first open invoice from same customer if available
    const openForCustomer = invoices.filter(
      (inv) => inv.customer_account_id === creditNote.customer_account_id &&
               inv.document_type !== 'credit_note' &&
               Number(inv.balance_due) > 0
    );
    setTargetInvoiceId(openForCustomer[0]?.id || '');
    setIsCreditModalOpen(true);
  };

  const handleApplyCredit = async (e) => {
    e.preventDefault();
    if (!selectedCreditNote || !targetInvoiceId || !creditAmount || Number(creditAmount) <= 0) {
      alert('Please select an invoice and enter a valid credit amount');
      return;
    }
    setIsApplyingCredit(true);
    try {
      await applyCreditOffset(targetInvoiceId, {
        credit_note_invoice_id: selectedCreditNote.id,
        amount: Number(creditAmount),
      });
      setIsCreditModalOpen(false);
      fetchInvoices();
    } catch (err) {
      alert('Failed to apply credit note: ' + (err.message || 'Unknown error'));
    } finally {
      setIsApplyingCredit(false);
    }
  };

  const filterPills = [
    { label: 'All Invoices', value: 'all' },
    { label: 'Standard / One-Time', value: 'standard_invoice' },
    { label: 'Recurring Subscription', value: 'recurring_subscription' },
    { label: 'Proration Delta', value: 'proration_delta' },
    { label: 'Credit Notes', value: 'credit_note' },
  ];

  const advancedFilterProps = useAdvancedFilter(invoices, INVOICE_FILTER_SCHEMA);

  const filteredInvoices = advancedFilterProps.filteredData.filter((inv) => {
    const matchesType = docTypeFilter === 'all' || inv.document_type === docTypeFilter;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      inv.invoice_number?.toLowerCase().includes(searchLower) ||
      inv.customer_account?.buyer_organization?.legal_name?.toLowerCase().includes(searchLower) ||
      inv.origin_quotation?.quotation_number?.toLowerCase().includes(searchLower) ||
      inv.origin_subscription?.subscription_code?.toLowerCase().includes(searchLower);
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111826] tracking-tight">Invoices & Financial Ledger</h1>
          <p className="text-sm text-[#2E3141]/70 mt-1">Financial ledger, billing records, and credit offsets.</p>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-neutral-200/60">
            <p className="text-sm text-neutral-500 font-medium">Total Outstanding</p>
            <p className="text-2xl font-bold text-[#111826] mt-1">${(kpis.total_outstanding || 0).toLocaleString()}</p>
          </div>
          <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-neutral-200/60">
            <p className="text-sm text-neutral-500 font-medium text-red-600">Overdue Invoices</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold text-red-600">${(kpis.total_overdue || kpis.overdue_amount || 0).toLocaleString()}</span>
              {kpis.overdue_count !== undefined && (
                <span className="text-xs text-red-500 font-medium">({kpis.overdue_count} overdue)</span>
              )}
            </div>
          </div>
          <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-neutral-200/60">
            <p className="text-sm text-neutral-500 font-medium text-emerald-600">Total Collected</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">${(kpis.total_collected || 0).toLocaleString()}</p>
          </div>
          <div className="bg-[#FFFFFF] p-4 rounded-xl shadow-sm border border-neutral-200/60">
            <p className="text-sm text-neutral-500 font-medium">Unapplied Credits</p>
            <p className="text-2xl font-bold text-[#111826] mt-1">${(kpis.unapplied_credits || kpis.total_credited || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      {/* Interactive Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {filterPills.map((pill) => (
          <button
            key={pill.value}
            onClick={() => setDocTypeFilter(pill.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
              docTypeFilter === pill.value
                ? 'bg-[#724B66] text-white shadow-sm'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {/* Data Grid */}
      <div className="bg-[#FFFFFF] rounded-xl shadow-sm border border-neutral-200/60 overflow-hidden">
        <div className="p-4 border-b border-neutral-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 max-w-sm w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Search by invoice #, customer, origin..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] transition-all"
              />
            </div>
            <AdvancedFilter schema={INVOICE_FILTER_SCHEMA} filterProps={advancedFilterProps} />
          </div>
          <div className="text-xs text-neutral-500 font-medium">
            Showing {filteredInvoices.length} of {invoices.length} entries
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-neutral-500 uppercase bg-neutral-50/50 border-b border-neutral-200/60">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Invoice #</th>
                <th className="px-5 py-3.5 font-semibold">Source Ref</th>
                <th className="px-5 py-3.5 font-semibold">Customer</th>
                <th className="px-5 py-3.5 font-semibold">Type</th>
                <th className="px-5 py-3.5 font-semibold">Issued Date</th>
                <th className="px-5 py-3.5 font-semibold">Due Date</th>
                <th className="px-5 py-3.5 font-semibold">Currency</th>
                <th className="px-5 py-3.5 font-semibold">Amount</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Balance Due</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60">
              {isLoading ? (
                <tr>
                  <td colSpan="10" className="px-6 py-8 text-center text-neutral-400">Loading...</td>
                </tr>
              ) : filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-8 text-center text-neutral-400">No matching invoices found.</td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const isCreditNote = inv.document_type === 'credit_note';
                  const hasUnpaidBalance = Number(inv.balance_due || 0) > 0;
                  return (
                    <tr key={inv.id} className="hover:bg-neutral-50/50 transition-colors group">
                      <td className="px-5 py-3.5 font-medium text-[#111826]">
                        <div className="flex items-center gap-1.5">
                          <Receipt className="w-4 h-4 text-neutral-400 shrink-0" />
                          <span>{inv.invoice_number}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        {inv.origin_quotation_id ? (
                          <Link
                            to={`/${providerSlug || 'default'}/quotations/${inv.origin_quotation_id}`}
                            className="text-[#724B66] hover:underline font-medium"
                          >
                            {inv.origin_quotation?.quotation_number || 'Quotation'}
                          </Link>
                        ) : inv.origin_subscription_id ? (
                          <Link
                            to={`/${providerSlug || 'default'}/subscriptions/${inv.origin_subscription_id}`}
                            className="text-[#724B66] hover:underline font-medium"
                          >
                            {inv.origin_subscription?.subscription_code || 'Subscription'}
                          </Link>
                        ) : (
                          <span className="text-neutral-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-neutral-700">
                        {inv.customer_account?.buyer_organization?.legal_name || 'N/A'}
                      </td>
                      <td className="px-5 py-3.5 capitalize text-xs text-neutral-600">
                        {(inv.document_type || '').replace(/_/g, ' ')}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-neutral-600">
                        {inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-neutral-600">
                        {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-neutral-600">
                        {inv.transaction_currency || 'INR'}
                      </td>
                      <td className="px-5 py-3.5 font-medium">
                        {isCreditNote ? (
                          <span className="text-rose-600 font-semibold">
                            -{formatDualCurrency(inv.total_amount || 0, convertFromBase(inv.total_amount || 0, inv.exchange_rate_to_base), inv.transaction_currency)}
                          </span>
                        ) : (
                          <span>{formatDualCurrency(inv.total_amount || 0, convertFromBase(inv.total_amount || 0, inv.exchange_rate_to_base), inv.transaction_currency)}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {getStatusBadge(inv.status)}
                      </td>
                      <td className="px-5 py-3.5 font-bold">
                        {hasUnpaidBalance ? (
                          <span className="text-rose-600">{formatDualCurrency(inv.balance_due || 0, convertFromBase(inv.balance_due || 0, inv.exchange_rate_to_base), inv.transaction_currency)}</span>
                        ) : (
                          <span className="text-neutral-400">{formatDualCurrency(0, 0, inv.transaction_currency)}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {!isCreditNote && hasUnpaidBalance && inv.status !== 'void' && (
                            <button
                              onClick={() => openPaymentModal(inv)}
                              className="px-2.5 py-1 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                            >
                              Record Payment
                            </button>
                          )}
                          {isCreditNote && hasUnpaidBalance && (
                            <button
                              onClick={() => openCreditModal(inv)}
                              className="px-2.5 py-1 text-xs font-medium bg-[#724B66] text-white rounded hover:bg-[#5e3d54] transition-colors"
                            >
                              Apply Credit
                            </button>
                          )}
                          <Link 
                            to={`/${providerSlug || 'default'}/invoices/${inv.id}`}
                            className="text-xs font-medium text-[#724B66] hover:text-[#2E3141] transition-colors ml-1"
                          >
                            Details →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment for ${selectedInvoice?.invoice_number || ''}`}
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">Customer:</span>
              <span className="font-medium text-neutral-800">
                {selectedInvoice?.customer_account?.buyer_organization?.legal_name || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Outstanding Balance Due:</span>
              <span className="font-bold text-rose-600">
                {selectedInvoice ? formatDualCurrency(selectedInvoice.balance_due, convertFromBase(selectedInvoice.balance_due, selectedInvoice.exchange_rate_to_base), selectedInvoice.transaction_currency) : '$0.00'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">
              Payment Amount ($) *
            </label>
            <input
              type="number"
              step="0.01"
              max={selectedInvoice ? convertFromBase(selectedInvoice.balance_due, selectedInvoice.exchange_rate_to_base) : undefined}
              min="0.01"
              required
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#724B66]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">
              Payment Method *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#724B66]"
            >
              <option value="bank_transfer">Bank Transfer (ACH / Wire)</option>
              <option value="credit_card">Credit Card</option>
              <option value="check">Check</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">
              Transaction Reference / Check #
            </label>
            <input
              type="text"
              placeholder="e.g. TXN-89342 or Check #1042"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#724B66]"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t">
            <Button variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingPayment}>
              {isSubmittingPayment ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Apply Credit Modal */}
      <Modal
        isOpen={isCreditModalOpen}
        onClose={() => setIsCreditModalOpen(false)}
        title={`Apply Credit Note ${selectedCreditNote?.invoice_number || ''}`}
      >
        <form onSubmit={handleApplyCredit} className="space-y-4">
          <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-amber-800">Available Credit Balance:</span>
              <span className="font-bold text-amber-900">
                ${Number(selectedCreditNote?.balance_due || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-800">Customer:</span>
              <span className="font-medium text-amber-900">
                {selectedCreditNote?.customer_account?.buyer_organization?.legal_name || 'N/A'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">
              Select Open Invoice to Offset *
            </label>
            <select
              required
              value={targetInvoiceId}
              onChange={(e) => setTargetInvoiceId(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#724B66]"
            >
              <option value="">-- Choose an open invoice --</option>
              {invoices
                .filter(
                  (inv) => inv.customer_account_id === selectedCreditNote?.customer_account_id &&
                           inv.document_type !== 'credit_note' &&
                           Number(inv.balance_due) > 0
                )
                .map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — Due: ${Number(inv.balance_due).toLocaleString()} (Total: ${Number(inv.total_amount).toLocaleString()})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">
              Credit Offset Amount ($) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={selectedCreditNote?.balance_due || undefined}
              required
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#724B66]"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t">
            <Button variant="secondary" onClick={() => setIsCreditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isApplyingCredit || !targetInvoiceId}>
              {isApplyingCredit ? 'Applying...' : 'Apply Credit Offset'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
