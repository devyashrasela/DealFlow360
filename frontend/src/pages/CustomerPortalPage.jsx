import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { negotiationApi } from '../api/negotiationApi.js';
import { apiClient } from '../api/client.js';
import { Card } from '../components/ui/Card.jsx';
import { Badge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import icn from '../assets/icon.png';
import {
  LogOut, ChevronDown, ChevronUp, Send, X,
  FileText, AlertCircle, Clock, User, CalendarDays
} from 'lucide-react';

export function CustomerPortalPage() {
  const { user, activeOrg, logout, token } = useAuth();
  const navigate = useNavigate();

  // Quotation state
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuote, setExpandedQuote] = useState(null);
  const [expandedLine, setExpandedLine] = useState(null);

  // Line negotiation
  const [changeType, setChangeType] = useState('discount_request');
  const [proposedValue, setProposedValue] = useState('');
  const [messageContent, setMessageContent] = useState('');

  // Counter offer
  const [counterQuoteId, setCounterQuoteId] = useState(null);
  const [targetTotal, setTargetTotal] = useState('');
  const [counterDiscount, setCounterDiscount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');
  const [submittingCounter, setSubmittingCounter] = useState(false);
  const [confirming, setConfirming] = useState(null);

  const [feedback, setFeedback] = useState(null);
  const [authError, setAuthError] = useState(false);

  const orgName = activeOrg?.trading_name || activeOrg?.legal_name || 'Your Organization';
  const userEmail = user?.email || '';
  const userName = user?.full_name || userEmail;

  useEffect(() => {
    if (!token) { setAuthError(true); setLoading(false); return; }
    loadQuotes();
  }, [token]);

  const loadQuotes = async () => {
    try {
      const data = await negotiationApi.getMyQuotes();
      const arr = Array.isArray(data) ? data : [];
      setQuotes(arr);
      // Auto-expand the first quote
      if (arr.length > 0 && !expandedQuote) setExpandedQuote(arr[0].id);
    } catch (err) {
      console.error(err);
      if (err.message?.includes('401') || err.message?.includes('token')) setAuthError(true);
    } finally { setLoading(false); }
  };

  const handleLineSubmit = async (quoteId, lineId) => {
    try {
      await negotiationApi.lineRequest({
        quotation_id: quoteId,
        quotation_line_id: lineId,
        change_type: changeType,
        proposed_value: Number(proposedValue),
        message_content: messageContent,
      });
      setExpandedLine(null); setMessageContent(''); setProposedValue('');
      setFeedback({ type: 'success', text: 'Line negotiation request submitted.' });
      loadQuotes();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to submit request' });
    }
  };

  const handleCounterSubmit = async (quoteId) => {
    setSubmittingCounter(true);
    try {
      await negotiationApi.counterOffer({
        quotation_id: quoteId,
        target_total: targetTotal ? Number(targetTotal) : null,
        counter_discount_percentage: counterDiscount ? Number(counterDiscount) : null,
        message_content: counterMessage,
      });
      setTargetTotal(''); setCounterDiscount(''); setCounterMessage(''); setCounterQuoteId(null);
      setFeedback({ type: 'success', text: 'Counter-offer submitted to sales team.' });
      loadQuotes();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Counter-offer failed' });
    } finally { setSubmittingCounter(false); }
  };

  const handleConfirm = async (quoteId) => {
    setConfirming(quoteId);
    try {
      await negotiationApi.confirm(quoteId);
      setFeedback({ type: 'success', text: 'Quotation confirmed! Terms locked and invoice generated.' });
      loadQuotes();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Confirmation failed' });
    } finally { setConfirming(null); }
  };

  const handleSignOut = async () => { await logout(); navigate('/login'); };

  const getStageStatus = (stage) => {
    const map = {
      draft: 'draft', pending_approval: 'pending', approved: 'approved',
      under_negotiation: 'warning', confirmed: 'success', rejected: 'rejected',
    };
    return map[stage] || 'draft';
  };

  const getStageLabel = (stage) => {
    const map = {
      draft: 'Sent', pending_approval: 'Pending Approval', approved: 'Approved',
      under_negotiation: 'Under Negotiation', confirmed: 'Confirmed', rejected: 'Rejected',
    };
    return map[stage] || stage;
  };

  // ── Auth Error ──
  if (authError) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-8">
        <Card className="max-w-sm text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-rose-500" />
          </div>
          <h2 className="text-xl font-bold text-[#111826] mb-2">Not Authenticated</h2>
          <p className="text-neutral-500 text-sm mb-6">Please sign in with your customer portal credentials.</p>
          <Button onClick={() => navigate('/login')}>Go to Login</Button>
        </Card>
      </div>
    );
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#724B66] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* ═══ PORTAL TOP BAR ═══ */}
      <header className="bg-[#111826] text-white h-16 flex items-center justify-between px-6 border-b border-neutral-800 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img src={icn} alt="Logo" className="h-9 w-auto" />
          <span className="text-lg font-bold tracking-tight">
            DealFlow<span className="italic text-[#724B66]">360</span>
            <span className="text-neutral-500 font-normal text-xs ml-2">Customer Portal</span>
          </span>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-neutral-100">{orgName}</p>
            <p className="text-[10px] text-neutral-400">{userEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* ═══ FEEDBACK BANNER ═══ */}
        {feedback && (
          <div className={`p-3.5 rounded-xl text-sm font-medium flex items-center justify-between border ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="text-xs opacity-60 hover:opacity-100 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* ═══ EMPTY STATE ═══ */}
        {quotes.length === 0 && (
          <Card className="text-center py-16">
            <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#111826] mb-1">No Active Quotations</h3>
            <p className="text-neutral-500 text-sm">Your quotations will appear here once shared by the sales team.</p>
          </Card>
        )}

        {/* ═══ QUOTATION CARDS ═══ */}
        {quotes.map(quote => (
          <div key={quote.id} className="space-y-0">
            {/* ── Quotation Header Banner ── */}
            <Card noPadding className="overflow-hidden">
              <button
                onClick={() => setExpandedQuote(expandedQuote === quote.id ? null : quote.id)}
                className="w-full p-5 flex items-center justify-between cursor-pointer hover:bg-neutral-50/80 transition text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-[#724B66]/10 border border-[#724B66]/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-[#724B66]" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-[#111826]">Quotation {quote.quotation_number}</h2>
                    <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                      <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> Expires {new Date(quote.expiration_date).toLocaleDateString()}</span>
                      {quote.assigned_sales_rep && (
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {quote.assigned_sales_rep.full_name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right mr-2">
                    <p className="text-lg font-bold text-[#111826]">${Number(quote.grand_total || 0).toLocaleString()}</p>
                  </div>
                  <Badge status={getStageStatus(quote.stage)} size="md">{getStageLabel(quote.stage)}</Badge>
                  {expandedQuote === quote.id ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                </div>
              </button>

              {/* ── Expanded Detail ── */}
              {expandedQuote === quote.id && (
                <div className="border-t border-neutral-200">
                  {/* Summary Metrics Strip (3 Cards) */}
                  <div className="grid grid-cols-3 divide-x divide-neutral-200 bg-neutral-50/80">
                    <div className="p-5 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 mb-1">Gross Order Value</p>
                      <p className="text-xl font-bold text-[#111826]">${Number(quote.gross_total || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-5 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1">Total Discount Savings</p>
                      <p className="text-xl font-bold text-emerald-600">-${Number(quote.total_discount_amount || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-5 text-center">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#724B66] mb-1">Net Total Payable</p>
                      <p className="text-xl font-bold text-[#111826]">${Number(quote.grand_total || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* ── Line Items Table ── */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-y border-neutral-200 bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          <th className="p-3 pl-5">Product / Service</th>
                          <th className="p-3">Category</th>
                          <th className="p-3 text-right">Qty</th>
                          <th className="p-3 text-right">Unit Price</th>
                          <th className="p-3 text-right">Discount (%)</th>
                          <th className="p-3 text-right">Line Total</th>
                          <th className="p-3 text-center">Negotiate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quote.lines?.map(line => (
                          <React.Fragment key={line.id}>
                            <tr className="border-b border-neutral-100 hover:bg-neutral-50/60 transition">
                              <td className="p-3 pl-5 text-sm font-semibold text-[#111826]">
                                {line.product?.name || (line.category ? `${line.category} Item` : 'Item')}
                              </td>
                              <td className="p-3"><Badge status="category" size="sm">{line.category || 'general'}</Badge></td>
                              <td className="p-3 text-right text-sm text-[#2E3141]">{line.quantity}</td>
                              <td className="p-3 text-right text-sm text-[#2E3141]">${Number(line.unit_list_price).toLocaleString()}</td>
                              <td className="p-3 text-right text-sm font-semibold text-emerald-600">{line.applied_discount_percentage}%</td>
                              <td className="p-3 text-right text-sm font-bold text-[#111826]">${Number(line.line_net_amount).toLocaleString()}</td>
                              <td className="p-3 text-center">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => setExpandedLine(expandedLine === line.id ? null : line.id)}
                                  disabled={quote.stage === 'confirmed'}
                                >
                                  {expandedLine === line.id ? 'Close' : 'Negotiate Line ▼'}
                                </Button>
                              </td>
                            </tr>

                            {/* ── Inline Negotiation Drawer ── */}
                            {expandedLine === line.id && (
                              <tr className="bg-sky-50/50">
                                <td colSpan="7" className="p-4 border-b border-neutral-200">
                                  <div className="flex flex-wrap gap-3 items-end">
                                    <div className="flex-1 min-w-[150px]">
                                      <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Request Type</label>
                                      <select
                                        className="w-full border border-neutral-300 rounded-lg p-2 text-xs text-[#111826] bg-white focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66]"
                                        value={changeType}
                                        onChange={(e) => setChangeType(e.target.value)}
                                      >
                                        <option value="discount_request">Request Additional Discount</option>
                                        <option value="quantity_change">Adjust Quantity</option>
                                        <option value="general_inquiry">Ask a Question</option>
                                      </select>
                                    </div>
                                    <div className="flex-1 min-w-[100px]">
                                      <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Proposed Value</label>
                                      <input
                                        type="number"
                                        className="w-full border border-neutral-300 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66]"
                                        placeholder="e.g. 15 for 15%"
                                        value={proposedValue}
                                        onChange={(e) => setProposedValue(e.target.value)}
                                      />
                                    </div>
                                    <div className="flex-[2] min-w-[200px]">
                                      <label className="block text-[10px] font-bold text-neutral-600 uppercase mb-1">Customer Notes / Justification</label>
                                      <input
                                        type="text"
                                        className="w-full border border-neutral-300 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66]"
                                        placeholder="Justification..."
                                        value={messageContent}
                                        onChange={(e) => setMessageContent(e.target.value)}
                                      />
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => handleLineSubmit(quote.id, line.id)}
                                        disabled={!messageContent}
                                      >
                                        <Send className="w-3 h-3 mr-1" />Save Line Request
                                      </Button>
                                      <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => { setExpandedLine(null); setMessageContent(''); setProposedValue(''); }}
                                      >
                                        Clear
                                      </Button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* ── Bottom: Counter Proposal + Action Footer ── */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t border-neutral-200">
                    {/* Order-Level Counter-Proposal Card */}
                    <div className="p-5 border-r border-neutral-200">
                      <h4 className="text-xs font-bold text-[#111826] uppercase tracking-wider mb-3">Propose Counter Terms</h4>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Proposed Target Total ($)</label>
                            <input
                              type="number"
                              className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66]"
                              value={counterQuoteId === quote.id ? targetTotal : ''}
                              onChange={(e) => { setCounterQuoteId(quote.id); setTargetTotal(e.target.value); }}
                              disabled={quote.stage === 'confirmed'}
                              placeholder="$0.00"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Overall Target Discount (%)</label>
                            <input
                              type="number"
                              className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66]"
                              value={counterQuoteId === quote.id ? counterDiscount : ''}
                              onChange={(e) => { setCounterQuoteId(quote.id); setCounterDiscount(e.target.value); }}
                              disabled={quote.stage === 'confirmed'}
                              placeholder="0%"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-500 uppercase mb-1">Reason for Counter-Proposal</label>
                          <textarea
                            className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#724B66]/20 focus:border-[#724B66] resize-none"
                            rows="2"
                            value={counterQuoteId === quote.id ? counterMessage : ''}
                            onChange={(e) => { setCounterQuoteId(quote.id); setCounterMessage(e.target.value); }}
                            disabled={quote.stage === 'confirmed'}
                            placeholder="Explain your counter-proposal..."
                          />
                        </div>
                        <Button
                          variant="secondary"
                          className="w-full"
                          onClick={() => handleCounterSubmit(quote.id)}
                          disabled={quote.stage === 'confirmed' || submittingCounter || (counterQuoteId !== quote.id) || (!targetTotal && !counterDiscount)}
                          loading={submittingCounter}
                        >
                          Submit Request
                        </Button>
                      </div>
                    </div>

                    {/* Customer Action Footer */}
                    <div className="p-5 flex flex-col justify-between">
                      <div className="space-y-3">
                        {quote.stage === 'confirmed' && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-800 flex items-start gap-2">
                            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                            <span>Quotation is <strong>Confirmed</strong>.</span>
                          </div>
                        )}
                        {quote.customer_confirmed_at && quote.stage !== 'confirmed' && (
                          <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-800 flex items-start gap-2">
                            <Clock className="w-4 h-4 shrink-0 mt-0.5 text-sky-500" />
                            <span>You have accepted these terms. Awaiting final internal approval from provider.</span>
                          </div>
                        )}

                        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-800">
                          <strong>Note:</strong> Once confirmed, the terms are locked and final invoices will be generated. This action cannot be undone.
                        </div>
                      </div>

                      <Button
                        size="lg"
                        className="w-full mt-4 py-3.5 text-sm font-bold"
                        onClick={() => handleConfirm(quote.id)}
                        disabled={quote.customer_confirmed_at || quote.stage === 'confirmed' || confirming === quote.id}
                        loading={confirming === quote.id}
                      >
                        {quote.stage === 'confirmed'
                          ? '✓ Quotation Confirmed'
                          : quote.customer_confirmed_at
                          ? '✓ Terms Accepted'
                          : 'Accept Terms'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        ))}
      </main>
    </div>
  );
}
