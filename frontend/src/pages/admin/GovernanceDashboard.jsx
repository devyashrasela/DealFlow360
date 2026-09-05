import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';

export function GovernanceDashboard() {
  const [activeTab, setActiveTab] = useState('ceilings');
  const [tierCeilings, setTierCeilings] = useState([]);
  const [categoryCeilings, setCategoryCeilings] = useState([]);
  const [approvalChains, setApprovalChains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'ceilings') {
        const [tc, cc] = await Promise.all([
          apiClient.get('/api/governance/tier-ceilings'),
          apiClient.get('/api/governance/category-ceilings')
        ]);
        setTierCeilings(tc || []);
        setCategoryCeilings(cc || []);
      } else if (activeTab === 'slabs') {
        const ac = await apiClient.get('/api/governance/approval-chains');
        setApprovalChains(ac || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Discount Governance & Risk Engine</h1>
          <p className="text-gray-500 text-sm">Configure Baseline Discount Ceilings and Risk Slabs</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button 
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'ceilings' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('ceilings')}
        >Screen 17: Discount Ceilings</button>
        <button 
          className={`px-4 py-2 font-medium text-sm ${activeTab === 'slabs' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('slabs')}
        >Screen 18: Risk Slabs & Margins</button>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">Error: {error}</div>}

      {!loading && !error && activeTab === 'ceilings' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="font-semibold mb-4">Customer Tier Ceilings</h2>
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border-b">Tier Name</th>
                  <th className="p-2 border-b">Max Discount %</th>
                </tr>
              </thead>
              <tbody>
                {tierCeilings.map(tc => (
                  <tr key={tc.id} className="border-b border-gray-100">
                    <td className="p-2 capitalize">{tc.customer_tier}</td>
                    <td className="p-2">{tc.max_discount_percentage}%</td>
                  </tr>
                ))}
                {tierCeilings.length === 0 && <tr><td colSpan="2" className="p-4 text-center text-gray-500">No tier ceilings configured.</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="font-semibold mb-4">Product Category Ceilings</h2>
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border-b">Category</th>
                  <th className="p-2 border-b">Max Discount %</th>
                </tr>
              </thead>
              <tbody>
                {categoryCeilings.map(cc => (
                  <tr key={cc.id} className="border-b border-gray-100">
                    <td className="p-2 capitalize">{cc.product_category}</td>
                    <td className="p-2">{cc.max_discount_percentage}%</td>
                  </tr>
                ))}
                {categoryCeilings.length === 0 && <tr><td colSpan="2" className="p-4 text-center text-gray-500">No category ceilings configured.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && !error && activeTab === 'slabs' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="font-semibold mb-4">Blended Risk Routing Slabs</h2>
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 border-b">Risk Tier</th>
                  <th className="p-2 border-b">Min Score</th>
                  <th className="p-2 border-b">Max Score</th>
                  <th className="p-2 border-b">Routing</th>
                </tr>
              </thead>
              <tbody>
                {approvalChains.map(ac => (
                  <tr key={ac.id} className="border-b border-gray-100">
                    <td className="p-2 font-medium capitalize">{ac.risk_tier.replace(/_/g, ' ')}</td>
                    <td className="p-2">{ac.min_risk_score}</td>
                    <td className="p-2">{ac.max_risk_score}</td>
                    <td className="p-2 text-gray-600">
                      {ac.requires_manager_approval && ac.requires_finance_approval ? 'Manager + Finance' :
                       ac.requires_manager_approval ? 'Sales Manager' : 'Auto-Approve'}
                    </td>
                  </tr>
                ))}
                {approvalChains.length === 0 && <tr><td colSpan="4" className="p-4 text-center text-gray-500">No approval chains configured.</td></tr>}
              </tbody>
            </table>
          </div>
          
          {approvalChains.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="font-semibold mb-4">Global Margin Guardrails</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded border border-gray-200">
                  <div className="text-sm text-gray-500">Absolute Margin Hard Stop</div>
                  <div className="text-xl font-bold text-red-600 mt-1">{approvalChains[0].absolute_margin_hard_stop}%</div>
                </div>
                <div className="p-4 bg-gray-50 rounded border border-gray-200">
                  <div className="text-sm text-gray-500">Minimum Upsell Margin Threshold</div>
                  <div className="text-xl font-bold text-green-600 mt-1">{approvalChains[0].minimum_upsell_margin_threshold}%</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
