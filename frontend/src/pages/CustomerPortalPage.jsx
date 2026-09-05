import React, { useState, useEffect } from 'react';
import { negotiationApi } from '../api/negotiationApi.js';
import { Card } from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge } from '../components/ui/Badge.jsx';

export function CustomerPortalPage() {
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedLine, setExpandedLine] = useState(null);
  
  // Line request state
  const [changeType, setChangeType] = useState('discount_request');
  const [proposedValue, setProposedValue] = useState('');
  const [messageContent, setMessageContent] = useState('');

  // Counter offer state
  const [targetTotal, setTargetTotal] = useState('');
  const [counterDiscount, setCounterDiscount] = useState('');
  const [counterMessage, setCounterMessage] = useState('');

  const [authError, setAuthError] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [submittingCounter, setSubmittingCounter] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    loadQuotes();
  }, []);

  const loadQuotes = async () => {
    try {
      // Ponytail hack: if no token, auth will fail. Devs should login as portal@beta.com in backend.
      // We'll simulate fetching quotes.
      const data = await negotiationApi.getMyQuotes();
      setQuotes(data);
    } catch (err) {
      console.error(err);
      if (err.message.includes('token') || err.message.includes('401')) {
        setAuthError(true);
      }
    } finally {
      setLoading(false);
    }
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
      setExpandedLine(null);
      setMessageContent('');
      setProposedValue('');
      setFeedback({ type: 'success', text: 'Line negotiation request submitted.' });
      loadQuotes();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to submit line request' });
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
      setTargetTotal('');
      setCounterDiscount('');
      setCounterMessage('');
      setFeedback({ type: 'success', text: 'Counter-offer successfully submitted to sales team.' });
      loadQuotes();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to submit counter-offer' });
    } finally {
      setSubmittingCounter(false);
    }
  };

  const handleConfirm = async (quoteId) => {
    setConfirming(true);
    try {
      await negotiationApi.confirm(quoteId);
      setFeedback({ type: 'success', text: 'Quotation confirmed! Commercial terms locked and invoice generated.' });
      loadQuotes();
    } catch (err) {
      setFeedback({ type: 'error', text: err.message || 'Failed to confirm quotation' });
    } finally {
      setConfirming(false);
    }
  };

  if (loading) return <div className="p-8">Loading portal...</div>;

  if (authError) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl text-red-600 mb-4">Not Authenticated</h2>
        <p>Please login as customer portal user to view this page.</p>
        <p className="text-sm text-gray-500 mt-2">(Use backend POST /api/auth/login with portal@beta.com)</p>
      </div>
    );
  }

  // Just show the first active quote for the portal view
  const activeQuote = quotes[0];

  if (!activeQuote) {
    return <div className="p-8 text-center text-gray-600">No active quotations found for your account.</div>;
  }

  const badgeColor = {
    'draft': 'gray',
    'pending_approval': 'yellow',
    'under_negotiation': 'yellow',
    'confirmed': 'green',
  }[activeQuote.stage] || 'blue';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="bg-[#111826] text-white p-4 flex justify-between items-center shadow-md">
        <div className="font-bold text-xl tracking-tight">DealFlow360 Customer Portal</div>
        <div className="flex items-center space-x-4 text-sm">
          <span>Beta Buyer Ltd</span>
          <button className="text-gray-300 hover:text-white transition">Sign Out</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* User Action Feedback Banner */}
        {feedback && (
          <div className={`p-4 rounded-xl border text-sm font-medium flex items-center justify-between ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}>
            <span>{feedback.text}</span>
            <button onClick={() => setFeedback(null)} className="text-xs opacity-60 hover:opacity-100 ml-2">✕</button>
          </div>
        )}

        {/* Banner */}
        <Card className="flex justify-between items-center bg-white">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{activeQuote.quotation_number}</h1>
            <p className="text-sm text-gray-500">Expires: {new Date(activeQuote.expiration_date).toLocaleDateString()}</p>
          </div>
          <Badge
            status={
              activeQuote.stage === 'confirmed'
                ? 'approved'
                : activeQuote.stage === 'under_negotiation' || activeQuote.stage === 'pending_approval'
                ? 'pending'
                : activeQuote.stage === 'approved'
                ? 'active'
                : 'draft'
            }
            size="md"
            className="uppercase tracking-wider font-semibold"
          >
            {activeQuote.stage.replace(/_/g, ' ')}
          </Badge>
        </Card>

        {/* Totals Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-white text-center">
            <p className="text-sm text-gray-500 font-medium">Gross Total</p>
            <p className="text-2xl font-bold text-gray-900">${Number(activeQuote.gross_total).toLocaleString()}</p>
          </Card>
          <Card className="bg-green-50 text-center border border-green-100">
            <p className="text-sm text-green-600 font-medium">Negotiated Savings</p>
            <p className="text-2xl font-bold text-green-700">-${Number(activeQuote.total_discount_amount || 0).toLocaleString()}</p>
          </Card>
          <Card className="bg-[#111826] text-center border-none">
            <p className="text-sm text-gray-300 font-medium">Net Amount Payable</p>
            <p className="text-2xl font-bold text-white">${Number(activeQuote.grand_total).toLocaleString()}</p>
          </Card>
        </div>

        {/* Lines */}
        <Card title="Quotation Lines" className="bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 text-sm font-semibold text-gray-600 bg-gray-50">
                  <th className="p-3">Product</th>
                  <th className="p-3">Type</th>
                  <th className="p-3 text-right">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Discount</th>
                  <th className="p-3 text-right">Line Total</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeQuote.lines?.map((line) => (
                  <React.Fragment key={line.id}>
                    <tr className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="p-3 font-medium text-gray-900">
                        {line.product?.name || (line.category ? `${line.category} Item` : 'Item')}
                      </td>
                      <td className="p-3 text-sm text-gray-500 capitalize">{line.category}</td>
                      <td className="p-3 text-right">{line.quantity}</td>
                      <td className="p-3 text-right">${Number(line.unit_list_price).toLocaleString()}</td>
                      <td className="p-3 text-right text-green-600 font-medium">{line.applied_discount_percentage}%</td>
                      <td className="p-3 text-right font-bold">${Number(line.line_net_amount).toLocaleString()}</td>
                      <td className="p-3 text-center">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => setExpandedLine(expandedLine === line.id ? null : line.id)}
                          disabled={activeQuote.stage === 'confirmed'}
                        >
                          {expandedLine === line.id ? 'Close' : 'Negotiate Line ▼'}
                        </Button>
                      </td>
                    </tr>
                    {/* Expandable Drawer */}
                    {expandedLine === line.id && (
                      <tr className="bg-blue-50/50">
                        <td colSpan="7" className="p-4 border-b border-gray-200">
                          <div className="flex gap-4 items-end">
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Request Type</label>
                              <select 
                                className="w-full border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                value={changeType}
                                onChange={(e) => setChangeType(e.target.value)}
                              >
                                <option value="discount_request">Request Additional Discount</option>
                                <option value="quantity_change">Adjust Quantity</option>
                                <option value="general_inquiry">General Question</option>
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Proposed Value (Optional)</label>
                              <input 
                                type="number" 
                                className="w-full border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                                placeholder="e.g. 15 for 15%"
                                value={proposedValue}
                                onChange={(e) => setProposedValue(e.target.value)}
                              />
                            </div>
                            <div className="flex-2 w-full">
                              <label className="block text-xs font-semibold text-gray-600 mb-1">Customer Notes</label>
                              <input 
                                type="text" 
                                className="w-full border-gray-300 rounded-md shadow-sm p-2 text-sm focus:ring-blue-500 focus:border-blue-500" 
                                placeholder="Justification..."
                                value={messageContent}
                                onChange={(e) => setMessageContent(e.target.value)}
                              />
                            </div>
                            <div>
                              <Button 
                                onClick={() => handleLineSubmit(activeQuote.id, line.id)}
                                disabled={!messageContent}
                              >
                                Save Request
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
        </Card>

        {/* Bottom Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card title="Propose Counter Terms" className="bg-white">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Total ($)</label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={targetTotal}
                    onChange={(e) => setTargetTotal(e.target.value)}
                    disabled={activeQuote.stage === 'confirmed'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Discount (%)</label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    value={counterDiscount}
                    onChange={(e) => setCounterDiscount(e.target.value)}
                    disabled={activeQuote.stage === 'confirmed'}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Counter</label>
                <textarea 
                  className="w-full border border-gray-300 rounded-md p-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  rows="2"
                  value={counterMessage}
                  onChange={(e) => setCounterMessage(e.target.value)}
                  disabled={activeQuote.stage === 'confirmed'}
                />
              </div>
              <Button 
                variant="secondary" 
                className="w-full"
                onClick={() => handleCounterSubmit(activeQuote.id)}
                disabled={activeQuote.stage === 'confirmed' || (!targetTotal && !counterDiscount)}
              >
                Submit Order-Level Counter
              </Button>
            </div>
          </Card>
          
          <div className="flex flex-col justify-end space-y-4">
            {activeQuote.stage !== 'approved' && activeQuote.stage !== 'confirmed' && (
              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-800">
                <span className="font-semibold">Notice:</span> Quotation must be in <strong>Approved</strong> stage before you can confirm and lock terms (current stage: <em>{activeQuote.stage.replace(/_/g, ' ')}</em>).
              </div>
            )}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
              <span className="font-semibold">Note:</span> Once confirmed, the terms are locked and final invoices will be generated.
            </div>
            <Button 
              size="lg" 
              className="w-full py-4 text-lg font-bold"
              onClick={() => handleConfirm(activeQuote.id)}
              disabled={activeQuote.stage !== 'approved' || confirming}
              loading={confirming}
            >
              {activeQuote.stage === 'confirmed'
                ? 'Quotation Confirmed'
                : activeQuote.stage === 'approved'
                ? 'Confirm Quotation & Lock Terms'
                : 'Awaiting Provider Approval'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
