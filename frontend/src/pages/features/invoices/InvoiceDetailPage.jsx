import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Receipt, CreditCard, AlertCircle } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { getInvoiceDetail, recordPayment } from '../../../api/invoiceApi';
import { useAuth } from '../../../context/AuthContext';

export const InvoiceDetailPage = () => {
  const { providerSlug, invoiceId } = useParams();
  const { user } = useAuth();
  const [inv, setInv] = useState(null);
  const [activeTab, setActiveTab] = useState('lines');
  
  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('wire_transfer');
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [invoiceId]);

  const fetchDetail = async () => {
    try {
      const res = await getInvoiceDetail(invoiceId);
      setInv(res.data);
      if (res.data) setPaymentAmount(res.data.balance_due);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordPayment = async () => {
    setIsPaying(true);
    try {
      await recordPayment(invoiceId, {
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        transaction_reference: `TXN-${Date.now()}`,
        recorded_by_user_id: user?.id || '00000000-0000-0000-0000-000000000000',
      });
      setIsPaymentModalOpen(false);
      fetchDetail();
    } catch (err) {
      console.error(err);
    } finally {
      setIsPaying(false);
    }
  };

  if (!inv) return <div className="p-8 text-neutral-500">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to={`/${providerSlug || 'default'}/invoices`} className="p-2 hover:bg-neutral-200 rounded-lg transition-colors text-neutral-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#111826] tracking-tight flex items-center gap-3">
              {inv.invoice_number}
              <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'void' ? 'danger' : 'info'}>
                {inv.status}
              </Badge>
            </h1>
            <p className="text-sm text-[#2E3141]/70 mt-1">
              Customer: {inv.customer_account?.buyer_organization?.legal_name}
            </p>
          </div>
        </div>
        
        {Number(inv.balance_due) > 0 && inv.status !== 'void' && (
          <Button onClick={() => setIsPaymentModalOpen(true)} className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Record Payment
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Info */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-[#FFFFFF] p-5 rounded-xl shadow-sm border border-neutral-200/60 space-y-4">
            <div>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Total Amount</p>
              <p className="text-lg font-bold text-[#111826]">${Number(inv.total_amount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Balance Due</p>
              <p className="text-lg font-bold text-red-600">${Number(inv.balance_due).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Issue Date</p>
              <p className="text-sm text-[#2E3141]">{new Date(inv.issue_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Due Date</p>
              <p className="text-sm font-medium text-[#111826]">{new Date(inv.due_date).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <div className="md:col-span-3 bg-[#FFFFFF] rounded-xl shadow-sm border border-neutral-200/60 overflow-hidden">
          <div className="flex border-b border-neutral-200/60 bg-neutral-50/50 px-4">
            {['lines', 'payments'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab 
                    ? 'border-[#724B66] text-[#724B66]' 
                    : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="p-0">
            {activeTab === 'lines' && (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-neutral-500 uppercase bg-neutral-50/50 border-b border-neutral-200/60">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Description</th>
                    <th className="px-5 py-3.5 font-semibold">Category</th>
                    <th className="px-5 py-3.5 font-semibold">Billing Type</th>
                    <th className="px-5 py-3.5 font-semibold">Unit Price</th>
                    <th className="px-5 py-3.5 font-semibold">Qty</th>
                    <th className="px-5 py-3.5 font-semibold">Discount</th>
                    <th className="px-5 py-3.5 font-semibold">Net Amount</th>
                    <th className="px-5 py-3.5 font-semibold">Tax</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60">
                  {inv.lines?.map(li => (
                    <tr key={li.id}>
                      <td className="px-5 py-3.5 font-medium text-[#111826]">{li.line_description || li.product?.name || 'Item'}</td>
                      <td className="px-5 py-3.5 capitalize text-xs text-neutral-600">{li.category || '—'}</td>
                      <td className="px-5 py-3.5 capitalize text-xs text-neutral-600">{(li.billing_cadence || 'one_time').replace(/_/g, ' ')}</td>
                      <td className="px-5 py-3.5">${Number(li.unit_price || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5">{li.quantity}</td>
                      <td className="px-5 py-3.5 text-xs text-neutral-600">
                        {Number(li.discount_amount || 0) > 0 ? `$${Number(li.discount_amount).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 font-medium">${Number(li.net_amount || (li.unit_price * li.quantity) || 0).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-xs text-neutral-600">{li.tax_rate_percentage ? `${li.tax_rate_percentage}%` : '0%'}</td>
                      <td className="px-5 py-3.5 font-bold text-right">${Number(li.line_total_with_tax || li.line_total || li.net_amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'payments' && (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-neutral-500 uppercase bg-neutral-50/50 border-b border-neutral-200/60">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Receipt Number</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Method</th>
                    <th className="px-6 py-4 font-semibold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60">
                  {inv.payments?.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-neutral-500">No payments recorded.</td>
                    </tr>
                  )}
                  {inv.payments?.map(pay => (
                    <tr key={pay.id}>
                      <td className="px-6 py-4 font-medium">{pay.payment_number}</td>
                      <td className="px-6 py-4">{new Date(pay.payment_date).toLocaleString()}</td>
                      <td className="px-6 py-4 capitalize">{pay.payment_method.replace('_', ' ')}</td>
                      <td className="px-6 py-4 font-bold text-right text-success-600">
                        ${Number(pay.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Record Payment">
        <div className="space-y-4">
          <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Invoice Total:</span>
              <span className="font-medium">${Number(inv.total_amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-neutral-500">Balance Due:</span>
              <span className="font-bold text-red-600">${Number(inv.balance_due).toLocaleString()}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Payment Amount</label>
            <input 
              type="number" 
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#724B66] focus:border-[#724B66]"
              max={inv.balance_due}
              min="0.01"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#724B66] focus:border-[#724B66]"
            >
              <option value="wire_transfer">Wire Transfer</option>
              <option value="ach_check">ACH / Check</option>
              <option value="credit_card">Credit Card</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t">
            <Button variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRecordPayment} disabled={isPaying || !paymentAmount}>
              {isPaying ? 'Processing...' : 'Apply Payment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
