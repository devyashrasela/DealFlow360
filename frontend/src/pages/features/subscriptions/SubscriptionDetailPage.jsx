import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Repeat, Edit2, AlertCircle } from 'lucide-react';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { getSubscriptionDetail, modifySubscriptionQuantity, previewProration, cancelSubscription } from '../../../api/subscriptionApi';

export const SubscriptionDetailPage = () => {
  const { providerSlug, subscriptionId } = useParams();
  const [sub, setSub] = useState(null);
  const [activeTab, setActiveTab] = useState('lines');
  
  // Modification State
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [prorationPreview, setProrationPreview] = useState(null);
  const [isModifying, setIsModifying] = useState(false);

  // Cancellation State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancellationType, setCancellationType] = useState('immediate');
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchDetail();
  }, [subscriptionId]);

  const fetchDetail = async () => {
    try {
      const res = await getSubscriptionDetail(subscriptionId);
      setSub(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePreviewProration = async () => {
    try {
      const res = await previewProration(subscriptionId, {
        line_item_id: selectedLine.id,
        new_quantity: newQuantity,
      });
      setProrationPreview(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmModification = async () => {
    setIsModifying(true);
    try {
      // Fake actor user id for demo
      await modifySubscriptionQuantity(subscriptionId, {
        line_item_id: selectedLine.id,
        new_quantity: newQuantity,
        actor_user_id: '00000000-0000-0000-0000-000000000000',
      });
      setIsModifyModalOpen(false);
      fetchDetail();
    } catch (err) {
      console.error(err);
    } finally {
      setIsModifying(false);
    }
  };

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelSubscription(subscriptionId, {
        cancellation_type: cancellationType,
        reason: cancelReason || 'Customer requested cancellation',
      });
      setIsCancelModalOpen(false);
      fetchDetail();
    } catch (err) {
      console.error('Failed to cancel subscription', err);
      alert('Failed to cancel subscription: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCancelling(false);
    }
  };

  const now = new Date();
  const end = sub?.current_period_end ? new Date(sub.current_period_end) : now;
  const start = sub?.current_period_start ? new Date(sub.current_period_start) : now;
  const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  const unusedDays = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));
  const totalPeriodCharge = (sub?.lines || []).reduce((sum, li) => sum + Number(li.period_amount || 0), 0);
  const dailyRate = totalPeriodCharge / totalDays;
  const refundEstimate = Number((unusedDays * dailyRate).toFixed(2));

  if (!sub) return <div className="p-8 text-neutral-500">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to={`/${providerSlug || 'default'}/subscriptions`} className="p-2 hover:bg-neutral-200 rounded-lg transition-colors text-neutral-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#111826] tracking-tight flex items-center gap-3">
              {sub.subscription_code}
              <Badge variant="success">{sub.status}</Badge>
            </h1>
            <p className="text-sm text-[#2E3141]/70 mt-1">
              Customer: {sub.customer_account?.buyer_organization?.legal_name}
            </p>
          </div>
        </div>
        {sub.status === 'active' && (
          <Button variant="destructive" onClick={() => setIsCancelModalOpen(true)}>
            Cancel Subscription
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Info */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-[#FFFFFF] p-5 rounded-xl shadow-sm border border-neutral-200/60 space-y-4">
            <div>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">MRR</p>
              <p className="text-lg font-bold text-[#111826]">${Number(sub.mrr_amount).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Cadence</p>
              <p className="text-sm font-medium text-[#111826] capitalize">{sub.billing_cadence}</p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Current Period</p>
              <p className="text-sm text-[#2E3141]">
                {new Date(sub.current_period_start).toLocaleDateString()} - {new Date(sub.current_period_end).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider mb-1">Next Invoice Date</p>
              <p className="text-sm text-[#2E3141]">{new Date(sub.next_invoice_date).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Main Content Tabs */}
        <div className="md:col-span-3 bg-[#FFFFFF] rounded-xl shadow-sm border border-neutral-200/60 overflow-hidden">
          <div className="flex border-b border-neutral-200/60 bg-neutral-50/50 px-4">
            {['lines', 'schedule', 'events'].map(tab => (
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
                    <th className="px-6 py-4 font-semibold">Product</th>
                    <th className="px-6 py-4 font-semibold">Unit Price</th>
                    <th className="px-6 py-4 font-semibold">Qty</th>
                    <th className="px-6 py-4 font-semibold">Period Amount</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60">
                  {sub.lines?.map(li => (
                    <tr key={li.id}>
                      <td className="px-6 py-4 font-medium">{li.product?.name || li.product_id}</td>
                      <td className="px-6 py-4">${Number(li.unit_price).toLocaleString()}</td>
                      <td className="px-6 py-4 font-bold">{li.quantity}</td>
                      <td className="px-6 py-4 font-bold">${Number(li.period_amount).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => {
                            setSelectedLine(li);
                            setNewQuantity(li.quantity);
                            setProrationPreview(null);
                            setIsModifyModalOpen(true);
                          }}
                          className="text-[#724B66] hover:bg-[#724B66]/10 p-2 rounded-md transition"
                          title="Modify Quantity"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'schedule' && (
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-neutral-500 uppercase bg-neutral-50/50 border-b border-neutral-200/60">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Cycle</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                    <th className="px-6 py-4 font-semibold">Base Charge</th>
                    <th className="px-6 py-4 font-semibold">Processed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/60">
                  {sub.billing_schedules?.map(sc => (
                    <tr key={sc.id}>
                      <td className="px-6 py-4 font-medium">Cycle {sc.cycle_number}</td>
                      <td className="px-6 py-4">{new Date(sc.scheduled_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">${Number(sc.expected_total).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        {sc.is_processed ? <Badge variant="success">Yes</Badge> : <Badge variant="default">Pending</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'events' && (
              <div className="p-6 space-y-4">
                {sub.events?.map(ev => (
                  <div key={ev.id} className="flex gap-4 border-l-2 border-neutral-200 pl-4 py-1">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#111826]">{ev.event_type.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-sm text-[#2E3141]/70">{ev.notes}</p>
                    </div>
                    <div className="text-xs text-neutral-400">
                      {new Date(ev.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modify Modal */}
      <Modal isOpen={isModifyModalOpen} onClose={() => setIsModifyModalOpen(false)} title="Modify Quantity">
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Changing quantity mid-cycle will generate a proration invoice based on days remaining.
          </p>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">New Quantity</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                className="flex-1 px-3 py-2 border border-neutral-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-[#724B66] focus:border-[#724B66]"
                min="1"
              />
              <Button onClick={handlePreviewProration} variant="secondary">Preview</Button>
            </div>
          </div>
          
          {prorationPreview && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2 mt-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900">Proration Preview</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    {prorationPreview.days_remaining_in_cycle} days remaining in cycle.
                  </p>
                  <p className="text-sm font-bold text-blue-900 mt-2">
                    Charge/Credit: ${prorationPreview.proration_charge}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-3 border-t">
            <Button variant="secondary" onClick={() => setIsModifyModalOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleConfirmModification} 
              disabled={isModifying || !prorationPreview}
            >
              {isModifying ? 'Applying...' : 'Confirm Modification'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Cancellation Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Subscription"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Select the cancellation effective date and review proration refund details:
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input
                type="radio"
                name="cancellationType"
                value="immediate"
                checked={cancellationType === 'immediate'}
                onChange={() => setCancellationType('immediate')}
              />
              <span className="font-medium">Immediate Cancellation</span>
              <span className="text-xs text-neutral-500">(Terminates today, issues credit note for unused days)</span>
            </label>

            <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
              <input
                type="radio"
                name="cancellationType"
                value="period_end"
                checked={cancellationType === 'period_end'}
                onChange={() => setCancellationType('period_end')}
              />
              <span className="font-medium">Cancel at Period End</span>
              <span className="text-xs text-neutral-500">
                (Remains active until {new Date(sub.current_period_end).toLocaleDateString()}, no refund)
              </span>
            </label>
          </div>

          {cancellationType === 'immediate' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900 space-y-1">
              <p className="font-semibold">Unused-Days Refund Calculation:</p>
              <div className="flex justify-between text-xs text-amber-800">
                <span>Days remaining in cycle:</span>
                <span className="font-bold">{unusedDays} of {totalDays} days</span>
              </div>
              <div className="flex justify-between text-xs text-amber-800">
                <span>Estimated Credit Note / Refund:</span>
                <span className="font-bold text-sm text-emerald-700">${refundEstimate}</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-600 uppercase tracking-wider mb-1">
              Cancellation Reason
            </label>
            <textarea
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Provide reason for cancellation..."
              className="w-full px-3 py-2 border border-neutral-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#724B66]"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t">
            <Button variant="secondary" onClick={() => setIsCancelModalOpen(false)}>
              Keep Subscription
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={isCancelling}
            >
              {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
