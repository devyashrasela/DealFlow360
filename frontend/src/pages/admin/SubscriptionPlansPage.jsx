import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { 
  Repeat, Plus, Edit2, Trash2, ArrowUpRight, 
  Calculator, CheckCircle2, ShieldAlert, Sparkles, Clock 
} from 'lucide-react';

export const SubscriptionPlansPage = () => {
  const { activeOrg } = useAuth();
  const orgSlug = activeOrg?.slug || 'acme';

  const [activeTab, setActiveTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  // Proration Interactive Simulator State
  const [simDaysRem, setSimDaysRem] = useState(15);
  const [simDaysTotal, setSimDaysTotal] = useState(30);
  const [simDeltaQty, setSimDeltaQty] = useState(5);
  const [simUnitPrice, setSimUnitPrice] = useState(120);

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3500);
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.get('/catalog');
      const allProducts = res.products || [];
      // Filter products that are either subscriptions or recurring billing cadence
      const subPlans = allProducts.filter(
        p => p.category === 'subscriptions' || (p.billing_cadence && p.billing_cadence !== 'one_time')
      );
      setPlans(subPlans);
    } catch (err) {
      setError(err.message || 'Failed to fetch subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (plan = null) => {
    setEditingPlan(plan);
    setIsModalOpen(true);
  };

  const handleSavePlan = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = {
      sku: formData.get('sku'),
      name: formData.get('name'),
      description: formData.get('description'),
      category: 'subscriptions',
      billing_cadence: formData.get('billing_cadence'),
      base_list_price: parseFloat(formData.get('base_list_price')),
      standard_unit_cost: parseFloat(formData.get('standard_unit_cost') || 0),
    };

    try {
      if (editingPlan) {
        await apiClient.put(`/catalog/${editingPlan.id}`, payload);
        showFeedback(`Subscription Plan "${payload.name}" updated.`);
      } else {
        await apiClient.post('/catalog', payload);
        showFeedback(`New Subscription Plan "${payload.name}" provisioned.`);
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (err) {
      alert(err.message || 'Error saving subscription plan');
    }
  };

  const handleDeletePlan = async (id, name) => {
    if (!confirm(`Are you sure you want to deactivate subscription plan "${name}"?`)) return;
    try {
      await apiClient.delete(`/catalog/${id}`);
      showFeedback(`Subscription plan "${name}" deactivated.`);
      fetchPlans();
    } catch (err) {
      alert(err.message || 'Error deleting plan');
    }
  };

  const simulatedProration = ((simDaysRem / (simDaysTotal || 1)) * simDeltaQty * simUnitPrice).toFixed(2);

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#111826] tracking-tight">Subscription Plans & Recurring Policies</h1>
          <p className="text-sm text-[#2E3141]/70 mt-1">
            Configure SaaS recurring tiers, standard billing intervals, and exact daily proration engines.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to={`/${orgSlug}/subscriptions`}>
            <Button variant="outline" size="sm" icon={ArrowUpRight}>
              Live Contracts
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={() => handleOpenModal()} icon={Plus}>
            Create Plan
          </Button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-neutral-200/60 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <span>Configured Plans</span>
            <Repeat className="w-4 h-4 text-[#724B66]" />
          </div>
          <p className="text-2xl font-bold text-[#111826] mt-2">{plans.length} Recurring Tiers</p>
          <p className="text-xs text-[#2E3141]/60 mt-0.5">SaaS retainers & maintenance lines</p>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-neutral-200/60 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <span>Proration Engine</span>
            <Calculator className="w-4 h-4 text-[#724B66]" />
          </div>
          <p className="text-2xl font-bold text-[#111826] mt-2">Exact Daily Linear</p>
          <p className="text-xs text-emerald-700 font-medium mt-0.5">d_rem / d_total * delta_Q * P</p>
        </div>

        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-neutral-200/60 shadow-xs">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-semibold uppercase tracking-wider">
            <span>Cancellation Protocol</span>
            <Clock className="w-4 h-4 text-[#724B66]" />
          </div>
          <p className="text-2xl font-bold text-[#111826] mt-2">Dual Mode</p>
          <p className="text-xs text-[#2E3141]/60 mt-0.5">Period-End vs Immediate Credit Note</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200/60 gap-8">
        <button 
          className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'plans' ? 'text-[#724B66]' : 'text-[#2E3141]/60 hover:text-[#2E3141]'}`}
          onClick={() => setActiveTab('plans')}
        >
          <span>Recurring Plan Catalog</span>
          {activeTab === 'plans' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#724B66] rounded-t-full" />}
        </button>
        <button 
          className={`pb-3 font-medium text-sm transition-colors relative ${activeTab === 'policies' ? 'text-[#724B66]' : 'text-[#2E3141]/60 hover:text-[#2E3141]'}`}
          onClick={() => setActiveTab('policies')}
        >
          <span>Proration & Billing Engine Simulator</span>
          {activeTab === 'policies' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#724B66] rounded-t-full" />}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Tab 1: Plans Table */}
      {activeTab === 'plans' && (
        <Card 
          title="Active Subscription Plan Specifications" 
          subtitle="Recurring line definitions used when compiling quotations and generating live agreements"
          action={
            <Button variant="primary" size="sm" onClick={() => handleOpenModal()} icon={Plus}>
              Add Subscription Plan
            </Button>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F3F2F2] text-[#2E3141] uppercase tracking-wider text-xs border-b border-neutral-200/60 font-semibold">
                <tr>
                  <th className="p-3.5">Plan SKU</th>
                  <th className="p-3.5">Plan Name</th>
                  <th className="p-3.5">Billing Interval</th>
                  <th className="p-3.5 text-right">Recurring List Price</th>
                  <th className="p-3.5 text-right">Standard Cost</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200/60">
                {loading ? (
                  <tr><td colSpan="7" className="p-8 text-center text-neutral-400">Loading recurring plans...</td></tr>
                ) : plans.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-[#2E3141]/50 italic">
                      No subscription products configured. Click "+ Add Subscription Plan" to provision recurring tiers.
                    </td>
                  </tr>
                ) : (
                  plans.map(plan => (
                    <tr key={plan.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="p-3.5 font-mono text-xs font-semibold text-[#724B66]">
                        {plan.sku}
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-[#111826] block">{plan.name}</span>
                        {plan.description && (
                          <span className="text-xs text-[#2E3141]/60 line-clamp-1">{plan.description}</span>
                        )}
                      </td>
                      <td className="p-3.5 capitalize">
                        <Badge status="shipped">
                          {plan.billing_cadence || 'monthly'}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right font-bold text-[#111826]">
                        ${Number(plan.base_list_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        <span className="text-xs text-neutral-400 font-normal"> / {plan.billing_cadence === 'annual' ? 'yr' : 'mo'}</span>
                      </td>
                      <td className="p-3.5 text-right text-neutral-600">
                        ${Number(plan.standard_unit_cost || plan.unit_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3.5 text-center">
                        <Badge status={plan.is_active ? 'active' : 'cancelled'}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-right space-x-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleOpenModal(plan)}
                          icon={Edit2}
                        >
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-rose-600 hover:bg-rose-50"
                          onClick={() => handleDeletePlan(plan.id, plan.name)}
                          icon={Trash2}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 2: Proration & Billing Engine Simulator */}
      {activeTab === 'policies' && (
        <div className="space-y-6">
          <Card 
            title="Interactive Daily Proration Simulator" 
            subtitle="Verify mathematical delta charge outputs against PRD formula FR-SUB-04"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">
                      Days Remaining in Cycle (d_rem)
                    </label>
                    <input 
                      type="number" 
                      value={simDaysRem}
                      onChange={(e) => setSimDaysRem(Number(e.target.value))}
                      className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm font-mono"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">
                      Total Days in Billing Month (d_tot)
                    </label>
                    <input 
                      type="number" 
                      value={simDaysTotal}
                      onChange={(e) => setSimDaysTotal(Number(e.target.value))}
                      className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm font-mono"
                      min="1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">
                      Seat / Quantity Delta (Δ Q)
                    </label>
                    <input 
                      type="number" 
                      value={simDeltaQty}
                      onChange={(e) => setSimDeltaQty(Number(e.target.value))}
                      className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">
                      Unit List Price ($ P)
                    </label>
                    <input 
                      type="number" 
                      value={simUnitPrice}
                      onChange={(e) => setSimUnitPrice(Number(e.target.value))}
                      className="w-full border border-neutral-300 rounded-lg p-2.5 text-sm font-mono"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Live Output Card */}
              <div className="p-6 bg-[#724B66]/5 border border-[#724B66]/30 rounded-2xl space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-[#724B66] block">
                  Computed Proration Adjustment
                </span>
                <div className="text-4xl font-extrabold text-[#111826] tracking-tight">
                  ${simulatedProration}
                </div>
                <p className="text-xs text-[#2E3141]/70">
                  Formula: ({simDaysRem} / {simDaysTotal}) × {simDeltaQty} units × ${simUnitPrice}
                </p>
                <div className="pt-2 border-t border-[#724B66]/20 flex items-center gap-2 text-xs font-medium text-[#724B66]">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    {simDeltaQty >= 0 
                      ? 'Triggers instant supplemental invoice to customer ledger' 
                      : 'Posts automated credit note for unused balance (FR-SUB-06)'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Cancellation Protocol Rules">
              <div className="space-y-3 text-sm text-[#2E3141]/80">
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/60">
                  <h5 className="font-bold text-[#111826]">1. Period-End Termination</h5>
                  <p className="text-xs text-neutral-600 mt-1">
                    Agreement remains Active through current cycle. Auto-transitions to Cancelled upon cycle end date. No refund posted.
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/60">
                  <h5 className="font-bold text-[#111826]">2. Immediate Cancellation with Pro-rata Refund</h5>
                  <p className="text-xs text-neutral-600 mt-1">
                    Immediate deactivation. System calculates unused days × daily rate and auto-generates a linked Credit Note in Invoices.
                  </p>
                </div>
              </div>
            </Card>

            <Card title="Cadence Billing Schedule Projections">
              <div className="space-y-3 text-sm text-[#2E3141]/80">
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/60">
                  <h5 className="font-bold text-[#111826]">12-Month Scheduled Forward Projections</h5>
                  <p className="text-xs text-neutral-600 mt-1">
                    All contracts project milestone dates forward 12 cycles upon confirmation, updating idempotently on each renewal.
                  </p>
                </div>
                <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/60">
                  <h5 className="font-bold text-[#111826]">Audit Trail Logging (FR-SUB-09)</h5>
                  <p className="text-xs text-neutral-600 mt-1">
                    Every modification, proration invoice generation, and tier alteration logs actor ID, timestamp, prior value, and new value.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Create / Edit Plan Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingPlan ? 'Edit Subscription Plan' : 'Create Recurring Subscription Plan'}
      >
        <form onSubmit={handleSavePlan} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Plan Code / SKU</label>
              <input 
                name="sku" 
                defaultValue={editingPlan?.sku || ''} 
                required 
                className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" 
                placeholder="e.g. SAAS-SEC-PRO"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Plan Display Name</label>
              <input 
                name="name" 
                defaultValue={editingPlan?.name || ''} 
                required 
                className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" 
                placeholder="e.g. Cloud Security Retainer (Enterprise)"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Plan Description</label>
            <textarea 
              name="description" 
              defaultValue={editingPlan?.description || ''} 
              className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" 
              rows={3} 
              placeholder="e.g. 24/7 endpoint detection, monthly threat briefing, priority SLA."
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Billing Interval</label>
              <select 
                name="billing_cadence" 
                defaultValue={editingPlan?.billing_cadence || 'monthly'} 
                className="w-full border border-neutral-300 rounded-lg p-2 text-sm bg-white focus:border-[#724B66] outline-none"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annual">Annual</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Base Recurring Price ($)</label>
              <input 
                name="base_list_price" 
                type="number" 
                step="0.01" 
                defaultValue={editingPlan?.base_list_price || 0} 
                required 
                className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Standard Cost ($)</label>
              <input 
                name="standard_unit_cost" 
                type="number" 
                step="0.01" 
                defaultValue={editingPlan?.standard_unit_cost || 0} 
                className="w-full border border-neutral-300 rounded-lg p-2 text-sm focus:border-[#724B66] outline-none" 
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} type="button">Cancel</Button>
            <Button variant="primary" type="submit">
              {editingPlan ? 'Save Plan Changes' : 'Provision Subscription Plan'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
