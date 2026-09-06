import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Edit2, Trash2, Plus, Save, X, PlusCircle, ShieldCheck, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { governanceApi } from '../../api/governanceApi';

export function GovernanceDashboard({ initialTab }) {
  const location = useLocation();

  const getComputedTab = () => {
    if (initialTab) return initialTab;
    if (location.pathname.includes('approval-chain')) return 'slabs';
    return 'ceilings';
  };

  const [activeTab, setActiveTab] = useState(getComputedTab());

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (location.pathname.includes('approval-chain')) {
      setActiveTab('slabs');
    } else if (location.pathname.includes('discount-rules')) {
      setActiveTab('ceilings');
    }
  }, [initialTab, location.pathname]);

  const [tierCeilings, setTierCeilings] = useState([]);
  const [categoryCeilings, setCategoryCeilings] = useState([]);
  const [approvalChains, setApprovalChains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Modals state
  const [tierModal, setTierModal] = useState({ isOpen: false, data: null });
  const [categoryModal, setCategoryModal] = useState({ isOpen: false, data: null });
  const [slabModal, setSlabModal] = useState({ isOpen: false, data: null });

  // Guardrails state (inline edit)
  const [guardrails, setGuardrails] = useState({
    absolute_margin_hard_stop: 10,
    minimum_upsell_margin_threshold: 20
  });

  const showFeedback = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3500);
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'ceilings') {
        const [tc, cc] = await Promise.all([
          governanceApi.listTierCeilings(),
          governanceApi.listCategoryCeilings()
        ]);
        setTierCeilings(Array.isArray(tc) ? tc : tc.data || []);
        setCategoryCeilings(Array.isArray(cc) ? cc : cc.data || []);
      } else if (activeTab === 'slabs') {
        const ac = await governanceApi.listApprovalChains();
        const chains = Array.isArray(ac) ? ac : ac.data || [];
        setApprovalChains(chains);
        if (chains && chains.length > 0) {
          setGuardrails({
            absolute_margin_hard_stop: chains[0].absolute_margin_hard_stop || 10,
            minimum_upsell_margin_threshold: chains[0].minimum_upsell_margin_threshold || 20
          });
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch governance configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTier = async (e) => {
    e.preventDefault();
    try {
      await governanceApi.upsertTierCeiling(tierModal.data);
      setTierModal({ isOpen: false, data: null });
      showFeedback(`Tier ceiling for "${tierModal.data.tier}" saved.`);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTier = async (id, tierName) => {
    setItemToDelete({ type: 'tier', id, title: `tier "${tierName}"` });
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      await governanceApi.upsertCategoryCeiling(categoryModal.data);
      setCategoryModal({ isOpen: false, data: null });
      showFeedback(`Category ceiling for "${categoryModal.data.category}" saved.`);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const [itemToDelete, setItemToDelete] = useState(null);

  const handleDeleteCategory = async (id, catName) => {
    setItemToDelete({ type: 'category', id, title: `category "${catName}"` });
  };

  const handleDeleteSlab = async (id) => {
    setItemToDelete({ type: 'slab', id, title: 'this risk routing slab' });
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      if (itemToDelete.type === 'tier') {
        await governanceApi.deleteTierCeiling(itemToDelete.id);
        showFeedback('Tier ceiling deleted.');
      } else if (itemToDelete.type === 'category') {
        await governanceApi.deleteCategoryCeiling(itemToDelete.id);
        showFeedback('Category ceiling deleted.');
      } else if (itemToDelete.type === 'slab') {
        await governanceApi.deleteApprovalChain(itemToDelete.id);
        showFeedback('Approval chain slab deleted.');
      }
      setItemToDelete(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveSlab = async (e) => {
    e.preventDefault();
    try {
      if (slabModal.data.id) {
        await governanceApi.updateApprovalChain(slabModal.data.id, slabModal.data);
        showFeedback('Approval chain slab updated.');
      } else {
        await governanceApi.createApprovalChain(slabModal.data);
        showFeedback('New approval chain slab created.');
      }
      setSlabModal({ isOpen: false, data: null });
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSaveGuardrails = async () => {
    if (approvalChains.length === 0) {
      showFeedback('Guardrail values stored in current configuration.');
      return;
    }
    try {
      await governanceApi.updateApprovalChain(approvalChains[0].id, {
        ...approvalChains[0],
        ...guardrails
      });
      showFeedback('Global margin guardrails successfully committed.');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col space-y-6">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-[#111826] tracking-tight">Discount Governance & Risk Engine</h1>
          <p className="text-[#2E3141]/70 text-sm mt-1">Configure baseline discount ceilings, blended risk scoring, and approval routing slabs.</p>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div className="text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-200 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* COMBINED GOVERNANCE VIEW */}
      {!loading && (
        <div className="space-y-6">
          <Card
            title="Customer Tier Ceilings"
            subtitle="Maximum allowed discount percentage authorized per customer classification"
            action={
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setTierModal({ isOpen: true, data: { tier: 'bronze', max_discount_percentage: 15 } })}
              >
                Add Tier Ceiling
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-xs font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Customer Tier</th>
                    <th className="px-4 py-3 text-center">Max Authorized Discount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {tierCeilings.map(tc => {
                    const tierName = tc.tier || tc.customer_tier;
                    return (
                      <tr key={tc.id} className="hover:bg-neutral-50/50 transition-colors">
                        <td className="p-3.5 font-semibold capitalize text-[#111826]">
                          <Badge variant="tag" dot={false} title={`Customer Tier: ${tierName}`}>
                            {tierName} Tier
                          </Badge>
                        </td>
                        <td className="p-3.5 text-center font-mono font-bold text-[#724B66] text-base">
                          {tc.max_discount_percentage}%
                        </td>
                        <td className="p-3.5 text-xs text-neutral-500">
                          Active Policy Limit
                        </td>
                        <td className="p-3.5 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setTierModal({ isOpen: true, data: { id: tc.id, tier: tierName, max_discount_percentage: tc.max_discount_percentage } })}
                            icon={Edit2}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDeleteTier(tc.id, tierName)}
                            icon={Trash2}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {tierCeilings.length === 0 && (
                    <tr><td colSpan="4" className="p-6 text-center text-[#2E3141]/50 italic">No customer tier ceilings configured yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            title="Product Category Ceilings"
            subtitle="Cap discount thresholds across distinct product lines"
            action={
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setCategoryModal({ isOpen: true, data: { category: 'hardware', max_discount_percentage: 20 } })}
              >
                Add Category Ceiling
              </Button>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-xs font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-center">Max Category Discount</th>
                    <th className="px-4 py-3 text-left">Policy Scope</th>
                    <th className="px-4 py-3 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {categoryCeilings.map(cc => {
                    const catName = cc.category || cc.product_category;
                    return (
                      <tr key={cc.id} className="hover:bg-neutral-50/50 transition-colors group">
                        <td className="px-4 py-3 font-semibold capitalize text-[#111826]">
                          <Badge variant="category" dot={false} title={`Product Category: ${catName}`}>
                            {catName}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-bold text-[#724B66] text-base">
                          {cc.max_discount_percentage}%
                        </td>
                        <td className="px-4 py-3 text-xs text-neutral-500">
                          All {catName} quotation lines
                        </td>
                        <td className="px-4 py-3 text-right space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCategoryModal({ isOpen: true, data: { id: cc.id, category: catName, max_discount_percentage: cc.max_discount_percentage } })}
                            icon={Edit2}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDeleteCategory(cc.id, catName)}
                            icon={Trash2}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {categoryCeilings.length === 0 && (
                    <tr><td colSpan="4" className="p-6 text-center text-[#2E3141]/50 italic">No category ceilings configured yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            title="Blended Risk Routing Slabs"
            subtitle="Automatic escalation routing driven by Blended Risk Score points"
            action={
              <Button
                variant="primary"
                size="sm"
                icon={Plus}
                onClick={() => setSlabModal({
                  isOpen: true,
                  data: {
                    risk_tier: 'low_risk_auto',
                    min_risk_score: 0,
                    max_risk_score: 30,
                    requires_manager_approval: false,
                    requires_finance_approval: false
                  }
                })}
              >
                Add Routing Slab
              </Button>
            }
          >
            {/* Visual Risk Meter */}
            {approvalChains.length > 0 && (
              <div className="mb-6 px-1">
                <div className="flex justify-between text-[10px] font-semibold text-neutral-400 mb-1.5 px-1 uppercase tracking-wider">
                  <span>0 pt (No Risk)</span>
                  <span>Escalation Continuum</span>
                  <span>50+ pt (High Risk)</span>
                </div>
                <div className="w-full h-8 flex rounded-lg overflow-hidden border border-neutral-200 shadow-sm">
                  {[...approvalChains].sort((a, b) => a.min_risk_score - b.min_risk_score).map((slab, i, arr) => {
                    // Normalize the width to a 50-point visual scale
                    const scaleMax = 50;
                    let widthPct = 0;
                    if (slab.max_risk_score) {
                      widthPct = ((slab.max_risk_score - slab.min_risk_score) / scaleMax) * 100;
                    } else {
                      widthPct = 100 - ((slab.min_risk_score / scaleMax) * 100);
                    }
                    
                    const color = slab.requires_manager_approval && slab.requires_finance_approval
                      ? 'bg-rose-500'
                      : slab.requires_manager_approval
                        ? 'bg-amber-400'
                        : 'bg-emerald-500';

                    return (
                      <div 
                        key={slab.id} 
                        className={`${color} h-full flex items-center justify-center text-[11px] font-bold text-white/90 shadow-inner border-r border-white/20 last:border-r-0 transition-all hover:brightness-110 cursor-help`}
                        style={{ width: `${Math.max(widthPct, 10)}%` }}
                        title={`${slab.risk_tier.replace(/_/g, ' ').toUpperCase()}: ${slab.min_risk_score} - ${slab.max_risk_score || '∞'} pt`}
                      >
                        {slab.risk_tier.split('_')[0].toUpperCase()}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-xs font-semibold">
                  <tr>
                    <th className="px-4 py-3 text-left">Risk Tier</th>
                    <th className="px-4 py-3 text-center">Score Range</th>
                    <th className="px-4 py-3 text-left">Approval Hierarchy</th>
                    <th className="px-4 py-3 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {approvalChains.map(ac => {
                    const routingLabel = ac.requires_manager_approval && ac.requires_finance_approval
                      ? 'Tier 3: Sales Manager + Finance VP'
                      : ac.requires_manager_approval
                        ? 'Tier 2: Sales Manager Approval'
                        : 'Tier 1: Rep Autonomy (Auto-Approve)';

                    const routingBadge = ac.requires_manager_approval && ac.requires_finance_approval
                      ? 'danger'
                      : ac.requires_manager_approval
                        ? 'warning'
                        : 'active';

                    return (
                      <tr key={ac.id} className="hover:bg-neutral-50/50 transition-colors group">
                        <td className="px-4 py-3 font-medium text-[#111826]">
                          <Badge status={routingBadge} title={routingLabel} className="capitalize">
                            {ac.risk_tier.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center font-mono font-semibold text-xs">
                          {ac.min_risk_score} pt — {ac.max_risk_score !== null ? `${ac.max_risk_score} pt` : '∞'}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#111826]">
                          {routingLabel}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSlabModal({ isOpen: true, data: { ...ac } })}
                            icon={Edit2}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDeleteSlab(ac.id)}
                            icon={Trash2}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {approvalChains.length === 0 && (
                    <tr><td colSpan="4" className="p-6 text-center text-[#2E3141]/50 italic">No approval chains configured.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <Card
            title="Global Margin Guardrails"
            subtitle="Hard boundaries that prevent deal confirmation regardless of risk points"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 p-4 bg-neutral-50 rounded-xl border border-neutral-200/60">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#111826]">
                  Absolute Margin Hard Stop (%)
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-[#724B66] bg-white font-mono font-bold"
                    value={guardrails.absolute_margin_hard_stop}
                    onChange={(e) => setGuardrails(g => ({ ...g, absolute_margin_hard_stop: Number(e.target.value) }))}
                    min="0"
                    max="100"
                  />
                  <Button variant="secondary" onClick={handleSaveGuardrails}>
                    Save Guardrail
                  </Button>
                </div>
                <p className="text-xs text-[#2E3141]/70 mt-1 leading-relaxed">
                  <strong>When does this apply?</strong> If a deal's blended margin falls below this threshold, it is automatically routed to Finance for review, or completely locked out from Auto-Approval. It acts as the final safety net regardless of other Risk Slabs.
                </p>
              </div>

              <div className="space-y-2 p-4 bg-neutral-50 rounded-xl border border-neutral-200/60">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#111826]">
                  Minimum Upsell Margin Threshold (%)
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="number"
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-[#724B66] bg-white font-mono font-bold"
                    value={guardrails.minimum_upsell_margin_threshold}
                    onChange={(e) => setGuardrails(g => ({ ...g, minimum_upsell_margin_threshold: Number(e.target.value) }))}
                    min="0"
                    max="100"
                  />
                  <Button variant="secondary" onClick={handleSaveGuardrails}>
                    Save Threshold
                  </Button>
                </div>
                <p className="text-xs text-[#2E3141]/70 mt-1">
                  Automated product recommendations must meet or exceed this profit margin to be suggested during quotation upsells.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Tier Modal */}
      <Modal
        isOpen={tierModal.isOpen}
        onClose={() => setTierModal({ isOpen: false, data: null })}
        title={tierModal.data?.id ? "Edit Customer Tier Ceiling" : "Add Customer Tier Ceiling"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveTier} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Customer Tier</label>
            <select
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#724B66] outline-none bg-white"
              value={tierModal.data?.tier || 'bronze'}
              onChange={(e) => setTierModal(m => ({ ...m, data: { ...m.data, tier: e.target.value } }))}
              required
            >
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="standard">Standard</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Max Authorized Discount (%)</label>
            <input
              type="number"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#724B66] outline-none font-mono"
              value={tierModal.data?.max_discount_percentage || 0}
              onChange={(e) => setTierModal(m => ({ ...m, data: { ...m.data, max_discount_percentage: Number(e.target.value) } }))}
              min="0"
              max="100"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setTierModal({ isOpen: false, data: null })}>Cancel</Button>
            <Button variant="primary" type="submit">Save Tier Ceiling</Button>
          </div>
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal
        isOpen={categoryModal.isOpen}
        onClose={() => setCategoryModal({ isOpen: false, data: null })}
        title={categoryModal.data?.id ? "Edit Category Ceiling" : "Add Product Category Ceiling"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveCategory} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Product Category</label>
            <select
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#724B66] outline-none bg-white"
              value={categoryModal.data?.category || 'hardware'}
              onChange={(e) => setCategoryModal(m => ({ ...m, data: { ...m.data, category: e.target.value } }))}
              required
            >
              <option value="hardware">Hardware</option>
              <option value="services">Services</option>
              <option value="subscriptions">Subscriptions</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Max Category Discount (%)</label>
            <input
              type="number"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#724B66] outline-none font-mono"
              value={categoryModal.data?.max_discount_percentage || 0}
              onChange={(e) => setCategoryModal(m => ({ ...m, data: { ...m.data, max_discount_percentage: Number(e.target.value) } }))}
              min="0"
              max="100"
              required
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setCategoryModal({ isOpen: false, data: null })}>Cancel</Button>
            <Button variant="primary" type="submit">Save Category Ceiling</Button>
          </div>
        </form>
      </Modal>

      {/* Slab Modal */}
      <Modal
        isOpen={slabModal.isOpen}
        onClose={() => setSlabModal({ isOpen: false, data: null })}
        title={slabModal.data?.id ? "Edit Risk Slab" : "Add Risk Routing Slab"}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveSlab} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Risk Tier Classification</label>
            <select
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#724B66] outline-none bg-white"
              value={slabModal.data?.risk_tier || 'low_risk_auto'}
              onChange={(e) => setSlabModal(m => ({ ...m, data: { ...m.data, risk_tier: e.target.value } }))}
              required
            >
              <option value="low_risk_auto">Low Risk (Auto-Approve)</option>
              <option value="medium_risk_manager">Medium Risk (Sales Manager)</option>
              <option value="high_risk_finance">High Risk (Manager + Finance VP)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Min Score (pt)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#724B66] outline-none font-mono"
                value={slabModal.data?.min_risk_score || 0}
                onChange={(e) => setSlabModal(m => ({ ...m, data: { ...m.data, min_risk_score: Number(e.target.value) } }))}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#111826] mb-1">Max Score (pt)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-[#724B66] outline-none font-mono"
                value={slabModal.data?.max_risk_score ?? ''}
                onChange={(e) => setSlabModal(m => ({ ...m, data: { ...m.data, max_risk_score: e.target.value === '' ? null : Number(e.target.value) } }))}
                placeholder="Leave blank for unbounded"
              />
            </div>
          </div>
          <div className="space-y-3 pt-2 bg-neutral-50 p-3 rounded-lg border border-neutral-200/60">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-neutral-300 text-[#724B66] focus:ring-[#724B66]"
                checked={slabModal.data?.requires_manager_approval || false}
                onChange={(e) => setSlabModal(m => ({ ...m, data: { ...m.data, requires_manager_approval: e.target.checked } }))}
              />
              <span className="text-sm font-medium text-[#111826]">Escalate to Sales Manager</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-neutral-300 text-[#724B66] focus:ring-[#724B66]"
                checked={slabModal.data?.requires_finance_approval || false}
                onChange={(e) => setSlabModal(m => ({ ...m, data: { ...m.data, requires_finance_approval: e.target.checked } }))}
              />
              <span className="text-sm font-medium text-[#111826]">Require Finance VP Final Sign-off</span>
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setSlabModal({ isOpen: false, data: null })}>Cancel</Button>
            <Button variant="primary" type="submit">Save Routing Slab</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="Confirm Deletion">
        <div className="space-y-4">
          <p className="text-sm text-neutral-600">
            Are you sure you want to remove {itemToDelete?.title}? This action cannot be undone and will immediately affect routing logic.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="ghost" onClick={() => setItemToDelete(null)}>Cancel</Button>
            <Button variant="primary" className="bg-rose-600 hover:bg-rose-700 text-white border-rose-600" onClick={confirmDelete}>
              Remove
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
