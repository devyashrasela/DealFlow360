import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { approvalApi } from '../../api/approvalApi';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Search } from 'lucide-react';

export function ApprovalListPage() {
  const [allApprovals, setAllApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      const res = await approvalApi.listPending();
      setAllApprovals(res || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-rose-500">Error: {error}</div>;

  const pendingCount = allApprovals.filter(a => a.status === 'pending').length;
  const returnedCount = allApprovals.filter(a => a.status === 'rejected' || a.status === 'returned').length;
  const approvedCount = allApprovals.filter(a => a.status === 'approved').length;

  const filteredApprovals = allApprovals.filter(a => {
    if (showPendingOnly && a.status !== 'pending') return false;
    if (searchQuery) {
      const q = a.quotation;
      const searchLower = searchQuery.toLowerCase();
      if (!q) return false;
      const matchNumber = q.quotation_number?.toLowerCase().includes(searchLower);
      const matchCustomer = q.customer_account?.buyer_organization?.legal_name?.toLowerCase().includes(searchLower);
      if (!matchNumber && !matchCustomer) return false;
    }
    return true;
  });

  return (
    <div className="p-6 h-full flex flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111826]">Approvals</h1>
        <p className="text-[#2E3141]/70 text-sm">Every quotation that needed, needs, or is going through discount approval</p>
      </div>

      <div className="flex space-x-6">
        <Card className="w-32 flex flex-col items-center justify-center p-4">
          <div className="text-2xl font-bold text-[#111826]">{pendingCount}</div>
          <div className="text-[#2E3141]/70 text-sm">Pending</div>
        </Card>
        <Card className="w-32 flex flex-col items-center justify-center p-4">
          <div className="text-2xl font-bold text-[#111826]">{returnedCount}</div>
          <div className="text-[#2E3141]/70 text-sm">Returned</div>
        </Card>
        <Card className="w-32 flex flex-col items-center justify-center p-4">
          <div className="text-2xl font-bold text-[#111826]">{approvedCount}</div>
          <div className="text-[#2E3141]/70 text-sm">Approved</div>
        </Card>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-neutral-200/60 flex justify-between items-center bg-[#FFFFFF]">
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#2E3141]/50" />
            </div>
            <input
              type="text"
              placeholder="Search by quote or customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-neutral-200/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#724B66]/40"
            />
          </div>
          <label className="flex items-center space-x-2 text-sm text-[#2E3141]/70 cursor-pointer">
            <input 
              type="checkbox" 
              className="rounded text-[#724B66] focus:ring-[#724B66]" 
              checked={showPendingOnly}
              onChange={(e) => setShowPendingOnly(e.target.checked)}
            />
            <span>Filter: Pending Only</span>
          </label>
        </div>
        
        <div className="overflow-y-auto flex-1 bg-[#FFFFFF]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-50 sticky top-0 z-10 border-b border-neutral-200/60">
              <tr>
                <th className="px-6 py-3 font-medium text-[#111826]">Quotation</th>
                <th className="px-6 py-3 font-medium text-[#111826]">Customer</th>
                <th className="px-6 py-3 font-medium text-[#111826]">Blended Risk</th>
                <th className="px-6 py-3 font-medium text-[#111826]">Status</th>
                <th className="px-6 py-3 font-medium text-[#111826]">Stage</th>
                <th className="px-6 py-3 font-medium text-[#111826]">Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {filteredApprovals.map(approval => {
                const q = approval.quotation;
                if (!q) return null;
                const riskLevel = q.risk_tier === 'high_risk_finance' ? 'HIGH' : q.risk_tier === 'medium_risk_manager' ? 'MEDIUM' : 'LOW';
                const riskColor = riskLevel === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-200' : riskLevel === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';
                
                let statusBadge = 'default';
                if (approval.status === 'approved') statusBadge = 'delivered'; // emerald
                if (approval.status === 'pending') statusBadge = 'pickpack'; // amber
                if (approval.status === 'rejected' || approval.status === 'returned') statusBadge = 'open'; // rose
                
                const assignedTo = !approval.required_role ? 'Auto' : (approval.required_role === 'finance_ops' ? 'Finance Team' : 'M. Shah');
                const stageName = !approval.required_role ? 'Auto-Approved' : (approval.required_role === 'sales_manager' ? 'Sales Manager' : 'Finance');

                return (
                  <tr 
                    key={approval.id} 
                    onClick={() => navigate(`/approvals/${q.id}`)}
                    className="border-b border-neutral-200/60 hover:bg-[#F3F2F2] cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-blue-600">{q.quotation_number}</td>
                    <td className="px-6 py-4">{q.customer_account?.buyer_organization?.legal_name || 'Unknown'}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${riskColor}`}>
                        {riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={statusBadge} className="capitalize">{approval.status}</Badge>
                    </td>
                    <td className="px-6 py-4">{stageName}</td>
                    <td className="px-6 py-4 text-[#2E3141]/70">{assignedTo}</td>
                  </tr>
                );
              })}
              {filteredApprovals.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-[#2E3141]/70">No approvals found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
