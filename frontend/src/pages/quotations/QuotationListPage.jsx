import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Modal } from '../../components/ui/Modal.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { Plus, ChevronDown, AlertCircle, FileText, ArrowRight, Search, Check, Trash2, X, LayoutGrid, List } from 'lucide-react';
import { formatDualCurrency, convertFromBase } from '../../utils/currency.js';

export function QuotationListPage() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('kanban');
  const [actionFeedback, setActionFeedback] = useState(null);
  const navigate = useNavigate();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [priceLists, setPriceLists] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedPriceList, setSelectedPriceList] = useState('');

  const stages = ['draft', 'pending_approval', 'approved', 'under_negotiation', 'confirmed', 'rejected'];

  useEffect(() => {
    fetchQuotations();
  }, []);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/quotations?limit=100');
      setQuotations(res.quotations || (Array.isArray(res) ? res : []));
    } catch (err) {
      setError(err.message || 'Failed to fetch quotations');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDraft = async (e, quoteId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this draft quotation? This action cannot be undone.')) return;
    try {
      await apiClient.delete(`/quotations/${quoteId}`);
      setActionFeedback({ type: 'success', text: 'Draft quotation deleted.' });
      await fetchQuotations();
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.message || 'Failed to delete quotation' });
    }
  };

  const handleConfirmQuote = async (e, quoteId) => {
    e.stopPropagation();
    if (!window.confirm('Confirm this quotation? This will lock commercial terms, generate invoice, and allocate inventory.')) return;
    try {
      await apiClient.post(`/quotations/${quoteId}/confirm`);
      setActionFeedback({ type: 'success', text: 'Quotation confirmed! Downstream orders, invoices, and fulfillment initiated.' });
      await fetchQuotations();
    } catch (err) {
      setActionFeedback({ type: 'error', text: err.message || 'Failed to confirm quotation' });
    }
  };

  const openNewQuoteModal = async () => {
    setIsModalOpen(true);
    setIsModalLoading(true);
    setModalError('');
    try {
      const [custRes, plRes] = await Promise.all([
        apiClient.get('/customers'),
        apiClient.get('/catalog/price-lists')
      ]);

      const customerList = Array.isArray(custRes) ? custRes : (custRes?.customers || custRes?.data || []);
      const priceListsList = Array.isArray(plRes) ? plRes : (plRes?.priceLists || plRes?.data || []);

      setCustomers(customerList);
      setPriceLists(priceListsList);

      if (customerList.length > 0) {
        const firstCust = customerList[0];
        setSelectedCustomer(firstCust.id);

        // Intelligently default to a price list matching the customer tier if available
        const matchingPl = priceListsList.find((pl) => pl.tier === firstCust.pricing_tier) || priceListsList[0];
        if (matchingPl) {
          setSelectedPriceList(matchingPl.id);
        }
      } else if (priceListsList.length > 0) {
        setSelectedPriceList(priceListsList[0].id);
      }
    } catch (err) {
      console.error('Failed to load customers or price lists:', err);
      setModalError(err.message || 'Failed to load options');
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleCustomerChange = (customerId) => {
    setSelectedCustomer(customerId);
    const cust = customers.find((c) => c.id === customerId);
    if (cust && cust.pricing_tier && priceLists.length > 0) {
      const matchingPl = priceLists.find((pl) => pl.tier === cust.pricing_tier);
      if (matchingPl) {
        setSelectedPriceList(matchingPl.id);
      }
    }
  };

  const createQuotation = async () => {
    if (!selectedCustomer) {
      setModalError('Please select a Customer Account.');
      return;
    }
    if (!selectedPriceList) {
      setModalError('Please select a valid Price List. If none are available, create one in Catalog Admin first.');
      return;
    }

    setIsSubmitting(true);
    setModalError('');
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const res = await apiClient.post('/quotations', {
        customer_account_id: selectedCustomer,
        price_list_id: selectedPriceList,
        expiration_date: futureDate.toISOString()
      });
      setIsModalOpen(false);
      navigate(`/quotations/${res.id}`);
    } catch (err) {
      console.error('Failed to create quotation:', err);
      setModalError(err.message || 'Failed to create quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stageDisplayNames = {
    draft: 'Draft',
    pending_approval: 'Pending Approval',
    approved: 'Approved',
    under_negotiation: 'Negotiation',
    confirmed: 'Confirmed',
    rejected: 'Rejected'
  };

  const getStageStatus = (stage) => {
    switch (stage) {
      case 'confirmed': return 'active';
      case 'approved': return 'approved';
      case 'under_negotiation': return 'warning';
      case 'pending_approval': return 'pending';
      case 'draft': return 'draft';
      case 'rejected': return 'danger';
      default: return 'default';
    }
  };

  const filteredQuotations = quotations.filter((q) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const num = (q.quotation_number || '').toLowerCase();
    const cust = (q.customer_account?.buyer_organization?.legal_name || '').toLowerCase();
    const acc = (q.customer_account?.account_number || '').toLowerCase();
    return num.includes(query) || cust.includes(query) || acc.includes(query);
  });

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh] text-neutral-400 text-sm">
        Loading commercial quotations...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm">
          Error loading quotations: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#111826] tracking-tight">Quotations</h1>
          <p className="text-sm text-[#2E3141]/70 mt-1">
            Commercial pipeline, deal risk scoring, and customer quotation lifecycle.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search quote or buyer..."
              className="w-full bg-white border border-neutral-300 rounded-lg pl-9 pr-8 py-2 text-xs text-[#111826] focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {/* View Mode Toggle */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-600">
            <button
              type="button"
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition ${
                viewMode === 'kanban' ? 'bg-white text-[#111826] shadow-xs font-semibold' : 'hover:text-neutral-900'
              }`}
              title="Pipeline View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Pipeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md transition ${
                viewMode === 'table' ? 'bg-white text-[#111826] shadow-xs font-semibold' : 'hover:text-neutral-900'
              }`}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          </div>

          <Button
            variant="primary"
            icon={Plus}
            onClick={openNewQuoteModal}
          >
            New Quotation
          </Button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-between ${
          actionFeedback.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <span>{actionFeedback.text}</span>
          <button onClick={() => setActionFeedback(null)} className="text-xs opacity-60 hover:opacity-100 ml-2">✕</button>
        </div>
      )}

      {/* View Content */}
      {viewMode === 'table' ? (
        <div className="flex-1 bg-white border border-neutral-200/80 rounded-xl shadow-xs overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="p-3.5 font-semibold">Quotation #</th>
                  <th className="p-3.5 font-semibold">Customer Account</th>
                  <th className="p-3.5 font-semibold">Stage</th>
                  <th className="p-3.5 font-semibold">Price List</th>
                  <th className="p-3.5 font-semibold text-right">Gross Total</th>
                  <th className="p-3.5 font-semibold text-right">Net Margin</th>
                  <th className="p-3.5 font-semibold text-center">Risk Score</th>
                  <th className="p-3.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredQuotations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-neutral-400 italic">
                      No quotations match your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredQuotations.map((q) => (
                    <tr
                      key={q.id}
                      onClick={() => navigate(`/quotations/${q.id}`)}
                      className="hover:bg-neutral-50/70 transition cursor-pointer"
                    >
                      <td className="p-3.5 font-mono font-medium text-[#111826]">
                        {q.quotation_number}
                      </td>
                      <td className="p-3.5 font-medium text-[#111826]">
                        {q.customer_account?.buyer_organization?.legal_name || 'Anonymous Customer'}
                      </td>
                      <td className="p-3.5">
                        <Badge status={getStageStatus(q.stage)}>
                          {stageDisplayNames[q.stage] || q.stage}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-neutral-600">
                        {q.price_list?.name || 'Standard Catalog'}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-[#111826]">
                        ${Number(q.gross_total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-right font-mono">
                        <span className={Number(q.blended_margin_percentage) < 10 ? 'text-rose-600 font-bold' : 'text-emerald-700 font-medium'}>
                          {Number(q.blended_margin_percentage || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        {q.blended_risk_score > 0 ? (
                          <span className="font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 text-[11px]">
                            {q.blended_risk_score} pt
                          </span>
                        ) : (
                          <span className="text-neutral-400 text-[11px]">Low Risk</span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {q.stage === 'draft' && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteDraft(e, q.id)}
                              className="text-neutral-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition text-xs flex items-center gap-1 font-medium"
                              title="Delete Draft"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                          {q.stage === 'approved' && (
                            <button
                              type="button"
                              onClick={(e) => handleConfirmQuote(e, q.id)}
                              className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 px-2 py-1 rounded text-xs flex items-center gap-1 font-medium transition"
                              title="Confirm Quotation"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Confirm</span>
                            </button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/quotations/${q.id}`)}
                            className="text-neutral-500 hover:text-neutral-900"
                          >
                            Open
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban Stages Board */
        <div className="flex-1 flex space-x-4 overflow-x-auto pb-4">
          {stages.map((stage) => {
            const columnQuotes = filteredQuotations.filter((q) => q.stage === stage);
            return (
              <div key={stage} className="flex-shrink-0 w-80 bg-neutral-50/80 border border-neutral-200/80 rounded-xl p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-200/60">
                  <span className="font-semibold text-xs uppercase tracking-wider text-neutral-700">
                    {stageDisplayNames[stage]}
                  </span>
                  <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-neutral-200/70 text-neutral-600">
                    {columnQuotes.length}
                  </span>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto min-h-[250px]">
                  {columnQuotes.length === 0 ? (
                    <div className="h-28 flex items-center justify-center border-2 border-dashed border-neutral-200 rounded-lg text-xs text-neutral-400">
                      No quotes in {stageDisplayNames[stage]}
                    </div>
                  ) : (
                    columnQuotes.map((q) => (
                      <div
                        key={q.id}
                        onClick={() => navigate(`/quotations/${q.id}`)}
                        className="bg-white p-4 rounded-xl border border-neutral-200/80 shadow-xs hover:border-[#724B66]/50 hover:shadow-sm cursor-pointer transition-all space-y-2.5 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-sm text-[#111826] group-hover:text-[#724B66] transition-colors truncate">
                            {q.customer_account?.buyer_organization?.legal_name || 'Anonymous Customer'}
                          </div>
                          <Badge status={getStageStatus(q.stage)}>
                            {stageDisplayNames[q.stage] || q.stage}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-neutral-500 font-mono">
                          <span>{q.quotation_number}</span>
                          <span className="font-bold text-[#111826]">
                            {q.exchange_rate_to_base ? formatDualCurrency(q.gross_total, convertFromBase(q.gross_total, q.exchange_rate_to_base), q.transaction_currency) : formatDualCurrency(q.gross_total, convertFromBase(q.gross_total, 1), 'INR')}
                          </span>
                        </div>

                        <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px]">
                          {q.blended_risk_score > 0 ? (
                            <span className="font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
                              Risk: {q.blended_risk_score} pt
                            </span>
                          ) : (
                            <span className="text-neutral-400">Low Risk</span>
                          )}
                          <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
                            Margin: {Number(q.blended_margin_percentage || 0).toFixed(1)}%
                          </span>
                        </div>

                        {q.stage === 'draft' && (
                          <div className="pt-2 border-t border-neutral-100 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteDraft(e, q.id)}
                              className="text-neutral-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition text-xs flex items-center gap-1 font-medium"
                              title="Delete Draft"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete Draft</span>
                            </button>
                          </div>
                        )}

                        {q.stage === 'approved' && (
                          <div className="pt-2 border-t border-neutral-100 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={(e) => handleConfirmQuote(e, q.id)}
                              className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 px-2 py-1 rounded text-xs flex items-center gap-1 font-medium transition"
                              title="Confirm Quotation & Lock Terms"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Confirm Quote</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Quotation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Quotation"
        subtitle="Initialize a commercial quote against an approved catalog price list."
        maxWidth="max-w-md"
      >
        {isModalLoading ? (
          <div className="py-8 text-center text-neutral-400 text-sm">
            Loading customer accounts and price lists...
          </div>
        ) : (
          <div className="space-y-4">
            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{modalError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                Customer Account
              </label>
              <div className="relative">
                <select
                  value={selectedCustomer}
                  onChange={(e) => handleCustomerChange(e.target.value)}
                  className="w-full appearance-none bg-white border border-neutral-300 rounded-lg px-3 py-2.5 text-sm text-[#111826] pr-9 focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] outline-none transition"
                >
                  {customers.length === 0 ? (
                    <option value="">No customer accounts found</option>
                  ) : (
                    customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.buyer_organization?.legal_name || c.account_number || c.id}
                        {c.pricing_tier ? ` (${c.pricing_tier.toUpperCase()})` : ''}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                Price List
              </label>
              <div className="relative">
                <select
                  value={selectedPriceList}
                  onChange={(e) => setSelectedPriceList(e.target.value)}
                  disabled={priceLists.length === 0}
                  className="w-full appearance-none bg-white border border-neutral-300 rounded-lg px-3 py-2.5 text-sm text-[#111826] pr-9 focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] outline-none transition disabled:bg-neutral-100 disabled:text-neutral-400"
                >
                  {priceLists.length === 0 ? (
                    <option value="">No active price lists available</option>
                  ) : (
                    priceLists.map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name} ({pl.currency}) — {pl.tier ? pl.tier.toUpperCase() : 'STANDARD'}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              {priceLists.length === 0 ? (
                <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  No price lists found. Please create a price list in Catalog Admin first.
                </p>
              ) : (
                <p className="text-[11px] text-neutral-400 mt-1">
                  Line item base prices and category discount limits will resolve against this price list.
                </p>
              )}
            </div>

            <div className="pt-4 flex justify-end space-x-2 border-t border-neutral-100">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={createQuotation}
                disabled={!selectedCustomer || !selectedPriceList || isSubmitting || priceLists.length === 0}
                loading={isSubmitting}
              >
                Create Quotation
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
