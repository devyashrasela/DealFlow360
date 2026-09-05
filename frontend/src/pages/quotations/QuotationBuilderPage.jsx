import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { Button } from '../../components/ui/Button.jsx';
import { Badge } from '../../components/ui/Badge.jsx';
import { 
  ArrowLeft, 
  Send, 
  Trash2, 
  Plus, 
  AlertTriangle, 
  TrendingUp, 
  Sparkles, 
  ShieldAlert, 
  CheckCircle2, 
  DollarSign, 
  Percent,
  ChevronDown
} from 'lucide-react';
import { formatDualCurrency, convertFromBase } from '../../utils/currency.js';
import { exchangeRateApi } from '../../api/exchangeRateApi.js';

export function QuotationBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [products, setProducts] = useState([]);
  const [upsells, setUpsells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [confirmingQuote, setConfirmingQuote] = useState(false);
  const [respondingCounter, setRespondingCounter] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Line editing state
  const [newLineProductId, setNewLineProductId] = useState('');
  const [newLineVariantId, setNewLineVariantId] = useState('');
  const [newLineQty, setNewLineQty] = useState(1);
  const [newLineDiscount, setNewLineDiscount] = useState(0);
  const [addingLine, setAddingLine] = useState(false);

  const [activeRate, setActiveRate] = useState(1);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [qRes, pRes, uRes] = await Promise.all([
        apiClient.get(`/quotations/${id}`),
        apiClient.get('/catalog'),
        apiClient.get(`/quotations/${id}/upsells`)
      ]);
      setQuotation(qRes);

      let rate = qRes.exchange_rate_to_base;
      if (!rate && qRes.transaction_currency && qRes.transaction_currency !== 'INR') {
        try {
          const ratesRes = await exchangeRateApi.getCachedRates();
          const ratesList = ratesRes.data || ratesRes;
          const target = ratesList.find(r => r.currency === qRes.transaction_currency);
          if (target) rate = target.rate;
        } catch (e) { console.error('Failed to fetch rates', e); }
      }
      setActiveRate(rate || 1);

      const prodList = Array.isArray(pRes) ? pRes : (pRes?.products || pRes?.data || []);
      setProducts(prodList);

      const upsellList = Array.isArray(uRes) ? uRes : (uRes?.upsells || uRes?.data || []);
      setUpsells(upsellList);

      if (prodList.length > 0 && !newLineProductId) {
        setNewLineProductId(prodList[0].id);
        if (prodList[0].variants && prodList[0].variants.length > 0) {
          setNewLineVariantId(prodList[0].variants[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch quotation data:', err);
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to load quotation details' });
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (prodId) => {
    setNewLineProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod && prod.variants && prod.variants.length > 0) {
      setNewLineVariantId(prod.variants[0].id);
    } else {
      setNewLineVariantId('');
    }
  };

  const addLine = async () => {
    if (!newLineProductId) return;
    setAddingLine(true);
    setFeedbackMsg(null);
    try {
      await apiClient.post(`/quotations/${id}/lines`, {
        product_id: newLineProductId,
        product_variant_id: newLineVariantId || null,
        quantity: Number(newLineQty) || 1,
        applied_discount_percentage: Number(newLineDiscount) || 0
      });
      // Reset form
      setNewLineQty(1);
      setNewLineDiscount(0);
      await fetchData(); // Reload to get updated margin/risk calculations
      setFeedbackMsg({ type: 'success', text: 'Line item added successfully' });
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to add line item' });
    } finally {
      setAddingLine(false);
    }
  };

  const addUpsell = async (productId) => {
    setFeedbackMsg(null);
    try {
      await apiClient.post(`/quotations/${id}/lines`, {
        product_id: productId,
        quantity: 1,
        applied_discount_percentage: 0
      });
      await fetchData();
      setFeedbackMsg({ type: 'success', text: 'Upsell product added to quotation' });
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to add upsell product' });
    }
  };

  const updateLineDiscount = async (lineId, qty, discount) => {
    try {
      await apiClient.put(`/quotations/${id}/lines/${lineId}`, {
        quantity: Number(qty),
        applied_discount_percentage: Number(discount)
      });
      fetchData();
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to update line' });
    }
  };

  const removeLine = async (lineId) => {
    setFeedbackMsg(null);
    try {
      await apiClient.delete(`/quotations/${id}/lines/${lineId}`);
      await fetchData();
      setFeedbackMsg({ type: 'success', text: 'Line item removed' });
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to remove line item' });
    }
  };

  const netMargin = quotation?.blended_margin_percentage !== undefined && quotation?.blended_margin_percentage !== null
    ? Number(quotation.blended_margin_percentage)
    : 0;
  const isMarginBreached = quotation?.lines?.length > 0 && netMargin < 10.0;

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

  const submitForApproval = async () => {
    if (isMarginBreached) {
      setFeedbackMsg({ type: 'error', text: 'Margin error: Minimum threshold of 10% breached' });
      return;
    }
    setSubmittingApproval(true);
    setFeedbackMsg(null);
    try {
      await apiClient.post(`/approvals/${id}/submit`);
      navigate('/approvals');
    } catch (err) {
      console.error('Primary approval submit failed, trying status patch fallback:', err);
      try {
        await apiClient.patch(`/quotations/${id}/status`, { status: 'pending_approval' });
        navigate('/approvals');
      } catch (err2) {
        setFeedbackMsg({ type: 'error', text: 'Failed to submit: ' + (err2.message || err.message) });
      }
    } finally {
      setSubmittingApproval(false);
    }
  };

  const confirmQuotation = async () => {
    if (!window.confirm('Confirm this quotation? This will lock commercial terms, issue invoice, and allocate inventory.')) return;
    setConfirmingQuote(true);
    setFeedbackMsg(null);
    try {
      await apiClient.post(`/quotations/${id}/confirm`);
      await fetchData();
      setFeedbackMsg({ type: 'success', text: 'Quotation confirmed! Downstream order, invoice, and subscriptions initialized.' });
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to confirm quotation' });
    } finally {
      setConfirmingQuote(false);
    }
  };

  const handleRespondNegotiation = async (action) => {
    setRespondingCounter(true);
    setFeedbackMsg(null);
    try {
      await apiClient.post('/negotiations/respond', {
        quotation_id: id,
        action
      });
      await fetchData();
      setFeedbackMsg({
        type: 'success',
        text: action === 'accept_counter'
          ? 'Counter-offer accepted. Quotation terms updated and moved to draft for review.'
          : 'Counter-offer rejected.'
      });
    } catch (err) {
      console.error(err);
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to process counter-offer' });
    } finally {
      setRespondingCounter(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[50vh] text-neutral-400 text-sm">
        Loading quotation details...
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-6">
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm flex items-center justify-between">
          <span>Quotation record not found.</span>
          <Button variant="outline" size="sm" onClick={() => navigate('/quotations')}>
            Return to Quotations
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
      {/* Top Navigation & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            icon={ArrowLeft}
            onClick={() => navigate('/quotations')}
            className="text-neutral-500 hover:text-neutral-900"
          >
            Quotations
          </Button>
          <div className="h-5 w-px bg-neutral-200" />
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-[#111826] tracking-tight">
                {quotation.quotation_number}
              </h1>
              <Badge status={getStageStatus(quotation.stage)}>
                {stageDisplayNames[quotation.stage] || quotation.stage}
              </Badge>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {quotation.customer_account?.buyer_organization?.legal_name || 'Standard Account'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate('/quotations')}
          >
            Save & Exit
          </Button>

          {quotation.stage === 'draft' && (
            <Button
              variant="primary"
              size="sm"
              icon={Send}
              onClick={submitForApproval}
              disabled={isMarginBreached || submittingApproval}
              loading={submittingApproval}
              title={isMarginBreached ? 'Margin error: Minimum threshold of 10% breached' : ''}
            >
              Submit for Approval
            </Button>
          )}

          {quotation.stage === 'approved' && (
            <Button
              variant="primary"
              size="sm"
              icon={CheckCircle2}
              onClick={confirmQuotation}
              disabled={confirmingQuote}
              loading={confirmingQuote}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirm Quotation
            </Button>
          )}

          {quotation.stage === 'confirmed' && (
            <span className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Locked & Confirmed
            </span>
          )}
        </div>
      </div>

      {/* Negotiation Counter-Offer Banner */}
      {quotation.stage === 'under_negotiation' && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-semibold flex items-center gap-1.5 text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Active Customer Counter-Offer
            </div>
            <div className="mt-1 text-amber-700">
              {quotation.customer_counter_total != null && (
                <span>Target Total: <strong>{formatDualCurrency(quotation.customer_counter_total, convertFromBase(quotation.customer_counter_total, activeRate), quotation.transaction_currency)}</strong> </span>
              )}
              {quotation.customer_counter_discount != null && (
                <span>(Target Discount: <strong>{quotation.customer_counter_discount}%</strong>)</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleRespondNegotiation('reject_counter')}
              disabled={respondingCounter}
              className="border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              Reject Counter
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleRespondNegotiation('accept_counter')}
              disabled={respondingCounter}
              loading={respondingCounter}
              className="bg-amber-700 hover:bg-amber-800 text-white"
            >
              Accept Counter
            </Button>
          </div>
        </div>
      )}

      {/* Notifications / Alerts */}
      {feedbackMsg && (
        <div className={`p-3 rounded-lg border text-xs font-medium flex items-center justify-between ${
          feedbackMsg.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-xs opacity-60 hover:opacity-100 ml-2">✕</button>
        </div>
      )}

      {isMarginBreached && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <div>
              <span className="font-semibold">Minimum Margin Breached:</span> Blended margin is currently{' '}
              <span className="font-bold">{netMargin.toFixed(1)}%</span> (minimum threshold is 10.0%). 
              Approval submission is disabled until discount levels are adjusted.
            </div>
          </div>
          <Badge status="error" dot={false} isTag>
            Hard Stop Active
          </Badge>
        </div>
      )}

      {/* Commercial Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
        <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Customer Org</div>
          <div className="text-sm font-semibold text-[#111826] mt-1 truncate">
            {quotation.customer_account?.buyer_organization?.legal_name || 'Anonymous'}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            Tier: {quotation.customer_account?.pricing_tier ? quotation.customer_account.pricing_tier.toUpperCase() : 'STANDARD'}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Price List</div>
          <div className="text-sm font-semibold text-[#111826] mt-1 truncate">
            {quotation.price_list?.name || 'Default Catalog'}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            {quotation.price_list?.currency || 'USD'}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Gross Total</div>
          <div className="text-sm font-bold text-[#111826] mt-1">
            {formatDualCurrency(quotation.gross_total || 0, convertFromBase(quotation.gross_total || 0, activeRate), quotation.transaction_currency)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            {quotation.lines?.length || 0} line items
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Net Blended Margin</div>
          <div className={`text-sm font-bold mt-1 ${netMargin < 10 ? 'text-rose-600' : 'text-emerald-700'}`}>
            {netMargin.toFixed(1)}%
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            Floor: 10.0%
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">Blended Risk Score</div>
          <div className="text-sm font-bold text-[#111826] mt-1 flex items-center gap-1.5">
            <span>{quotation.blended_risk_score || 0} pts</span>
            {quotation.blended_risk_score > 0 ? (
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200/60">
                Elevated
              </span>
            ) : (
              <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                Low
              </span>
            )}
          </div>
          <div className="text-[11px] text-neutral-400 mt-0.5">
            Discount governance
          </div>
        </div>
      </div>

      {/* Line Items Card */}
      <div className="bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-neutral-200/70 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[#111826]">Line Items & Discount Governance</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Line items inherit pricing rules from the active price list and governance discount ceilings.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5 font-semibold">Product Description</th>
                <th className="p-3.5 font-semibold w-24">Qty</th>
                <th className="p-3.5 font-semibold w-28">List Price</th>
                <th className="p-3.5 font-semibold w-32">Applied Disc. %</th>
                <th className="p-3.5 font-semibold w-28">Ceiling %</th>
                <th className="p-3.5 font-semibold w-36">Policy Status</th>
                <th className="p-3.5 font-semibold w-16 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {(!quotation.lines || quotation.lines.length === 0) ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-neutral-400 italic">
                    No products added to this quote yet. Select a product below to get started.
                  </td>
                </tr>
              ) : (
                quotation.lines.map((line) => (
                  <tr key={line.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="p-3.5 font-medium text-[#111826]">
                      {line.product?.name || 'Product'}
                      {line.product_variant?.variant_name && (
                        <span className="ml-1 text-neutral-600 font-normal">
                          - {line.product_variant.variant_name}
                        </span>
                      )}
                      {(line.product_variant?.variant_sku || line.product?.sku) && (
                        <span className="block text-[11px] text-neutral-400 font-mono">
                          SKU: {line.product_variant?.variant_sku || line.product?.sku}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={(e) => updateLineDiscount(line.id, e.target.value, line.applied_discount_percentage)}
                        className="w-18 border border-neutral-300 rounded-md px-2 py-1 text-xs text-[#111826] focus:ring-1 focus:ring-[#724B66] outline-none disabled:bg-neutral-50"
                        min="1"
                        disabled={quotation.stage !== 'draft'}
                      />
                    </td>
                    <td className="p-3.5 font-mono text-[#111826]">
                      {formatDualCurrency(line.unit_list_price || 0, convertFromBase(line.unit_list_price || 0, activeRate), quotation.transaction_currency)}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={line.applied_discount_percentage}
                          onChange={(e) => updateLineDiscount(line.id, line.quantity, e.target.value)}
                          className="w-18 border border-neutral-300 rounded-md px-2 py-1 text-xs text-[#111826] focus:ring-1 focus:ring-[#724B66] outline-none disabled:bg-neutral-50"
                          min="0"
                          max="100"
                          disabled={quotation.stage !== 'draft'}
                        />
                        <span className="text-neutral-400">%</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-neutral-600">
                      {line.effective_ceiling_limit !== undefined ? `${line.effective_ceiling_limit}%` : '-'}
                    </td>
                    <td className="p-3.5">
                      {line.is_over_limit ? (
                        <Badge status="error">
                          Over Limit (+{line.line_excess_points}pt)
                        </Badge>
                      ) : (
                        <Badge status="active">
                          Compliant
                        </Badge>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {quotation.stage === 'draft' && (
                        <button
                          onClick={() => removeLine(line.id)}
                          className="p-1 text-neutral-400 hover:text-rose-600 rounded transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}

              {/* Add New Line Form */}
              {quotation.stage === 'draft' && (
                <tr className="bg-neutral-50/60 border-t-2 border-neutral-200/80">
                  <td className="p-3.5">
                    <div className="space-y-1.5 max-w-sm">
                      <div className="relative">
                        <select
                          value={newLineProductId}
                          onChange={(e) => handleProductSelect(e.target.value)}
                          className="w-full appearance-none bg-white border border-neutral-300 rounded-md px-2.5 py-1.5 text-xs text-[#111826] pr-8 focus:ring-1 focus:ring-[#724B66] outline-none"
                        >
                          {products.length === 0 ? (
                            <option value="">No products available</option>
                          ) : (
                            products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} ({p.sku || 'No SKU'})
                              </option>
                            ))
                          )}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {(() => {
                        const selProd = products.find((p) => p.id === newLineProductId);
                        if (selProd && selProd.variants && selProd.variants.length > 0) {
                          return (
                            <div className="relative">
                              <select
                                value={newLineVariantId}
                                onChange={(e) => setNewLineVariantId(e.target.value)}
                                className="w-full appearance-none bg-neutral-50 border border-neutral-300 rounded-md px-2.5 py-1 text-[11px] text-[#111826] pr-8 focus:ring-1 focus:ring-[#724B66] outline-none"
                              >
                                <option value="">Base Variant (Default)</option>
                                {selProd.variants.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.variant_name} ({v.variant_sku}) {Number(v.price_delta) !== 0 ? `[+$${v.price_delta}]` : ''}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <input
                      type="number"
                      value={newLineQty}
                      onChange={(e) => setNewLineQty(e.target.value)}
                      min="1"
                      className="w-18 border border-neutral-300 rounded-md px-2 py-1.5 text-xs text-[#111826] focus:ring-1 focus:ring-[#724B66] outline-none bg-white"
                      placeholder="Qty"
                    />
                  </td>
                  <td className="p-3.5 text-neutral-400 italic">Auto</td>
                  <td className="p-3.5">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={newLineDiscount}
                        onChange={(e) => setNewLineDiscount(e.target.value)}
                        min="0"
                        max="100"
                        className="w-18 border border-neutral-300 rounded-md px-2 py-1.5 text-xs text-[#111826] focus:ring-1 focus:ring-[#724B66] outline-none bg-white"
                        placeholder="0"
                      />
                      <span className="text-neutral-400">%</span>
                    </div>
                  </td>
                  <td className="p-3.5 text-neutral-400 italic">Auto</td>
                  <td className="p-3.5 text-neutral-400 italic">-</td>
                  <td className="p-3.5 text-right">
                    <Button
                      size="sm"
                      variant="primary"
                      icon={Plus}
                      onClick={addLine}
                      disabled={addingLine || !newLineProductId || products.length === 0}
                      loading={addingLine}
                    >
                      Add
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upsell Suggestions */}
      {upsells.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#724B66]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-700">
              Upsell & Cross-Sell Opportunities
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {upsells.map((u) => (
              <div
                key={u.product_id}
                className="bg-white border border-neutral-200/80 rounded-xl p-3.5 flex flex-col justify-between shadow-xs hover:border-[#724B66]/40 transition"
              >
                <div>
                  <div className="font-semibold text-xs text-[#111826]">
                    {u.product_name}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium mt-1">
                    Margin Contribution: +${Number(u.margin_delta || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                {quotation.stage === 'draft' && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Plus}
                    onClick={() => addUpsell(u.product_id)}
                    className="mt-3 w-full justify-center"
                  >
                    Add to Quote
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
