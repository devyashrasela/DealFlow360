import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export function ApprovalListPage() {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      const res = await apiClient.get('/approvals/pending');
      setApprovals(res || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  const pendingCount = approvals.filter(a => a.status === 'pending').length;
  // backend doesn't return approved/returned easily from this endpoint but we mimic mockup
  const returnedCount = approvals.filter(a => a.status === 'rejected').length || 0;
  const approvedCount = approvals.filter(a => a.status === 'approved').length || 0;

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Approvals (List)</h1>
        <p className="text-gray-500 text-sm">Every quotation that needed, needs, or is going through discount approval</p>
      </div>

      <div className="flex space-x-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 w-32 flex flex-col items-center">
          <div className="text-2xl font-bold text-gray-800">{pendingCount}</div>
          <div className="text-gray-500 text-sm">Pending</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 w-32 flex flex-col items-center">
          <div className="text-2xl font-bold text-gray-800">{returnedCount}</div>
          <div className="text-gray-500 text-sm">Returned</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 w-32 flex flex-col items-center">
          <div className="text-2xl font-bold text-gray-800">{approvedCount}</div>
          <div className="text-gray-500 text-sm">Approved</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 flex-1 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="font-semibold">Approvals</h2>
          <label className="flex items-center space-x-2 text-sm text-gray-600">
            <input type="checkbox" className="rounded" defaultChecked />
            <span>Filter: Pending Only</span>
          </label>
        </div>
        
        <div className="overflow-y-auto flex-1 p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="p-3">Quotation</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Blended Risk</th>
                <th className="p-3">Stage</th>
                <th className="p-3">Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {approvals.map(approval => {
                const q = approval.quotation;
                if (!q) return null;
                const riskLevel = q.risk_tier === 'high_risk_finance' ? 'HIGH' : q.risk_tier === 'medium_risk_manager' ? 'MEDIUM' : 'LOW';
                const riskColor = riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' : riskLevel === 'MEDIUM' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800';
                
                return (
                  <tr 
                    key={approval.id} 
                    onClick={() => navigate(`/approvals/${q.id}`)}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="p-3 font-medium text-blue-600">{q.quotation_number}</td>
                    <td className="p-3">{q.customer_account?.buyer_organization?.legal_name || 'Unknown'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${riskColor}`}>
                        {riskLevel}
                      </span>
                    </td>
                    <td className="p-3">
                      {approval.required_role === 'sales_manager' ? 'Sales Manager' : approval.required_role === 'finance_ops' ? 'Finance' : 'Auto-Approved'}
                    </td>
                    <td className="p-3 text-gray-500">
                      {approval.required_role === 'finance_ops' ? 'Finance Team' : 'M. Shah'} 
                    </td>
                  </tr>
                );
              })}
              {approvals.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">No pending approvals found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
