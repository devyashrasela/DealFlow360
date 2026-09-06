import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { approvalApi } from '../../api/approvalApi';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Search, X, Filter } from 'lucide-react';

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
      const res = await approvalApi.listAll();
      setAllApprovals(res || []);
    } catch (err) {
      // Fallback to listPending if listAll is not supported
      try {
        const fallbackRes = await approvalApi.listPending();
        setAllApprovals(fallbackRes || []);
      } catch (err2) {
        setError(err2.message);
      }
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
    if (searchQuery.trim()) {
      const q = a.quotation;
      if (!q) return false;
      const term = searchQuery.trim().toLowerCase();
      
      const quotationNumber = (q.quotation_number || '').toLowerCase();
      const customerName = (q.customer_account?.buyer_organization?.legal_name || '').toLowerCase();
      const accountNumber = (q.customer_account?.account_number || '').toLowerCase();
      const riskTier = (q.risk_tier || '').toLowerCase();
      const riskLevel = (riskTier === 'high_risk_finance' ? 'high' : riskTier === 'medium_risk_manager' ? 'medium' : 'low');
      const status = (a.status || '').toLowerCase();
      const assignedTo = (!a.required_role ? 'auto' : (a.required_role === 'finance_ops' ? 'finance team' : 'm. shah')).toLowerCase();
      const stageName = (!a.required_role ? 'auto-approved' : (a.required_role === 'sales_manager' ? 'sales manager' : 'finance')).toLowerCase();

      const matches = 
        quotationNumber.includes(term) ||
        customerName.includes(term) ||
        accountNumber.includes(term) ||
        riskTier.includes(term) ||
        riskLevel.includes(term) ||
        status.includes(term) ||
        assignedTo.includes(term) ||
        stageName.includes(term);

      if (!matches) return false;
    }
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#111826] tracking-tight">Approval Queue</h1>
          <p className="text-sm text-[#2E3141]/70 mt-1">
            Every quotation that needed, needs, or is going through discount approval
          </p>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-neutral-200/60 shadow-xs flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-[#111826]">{pendingCount}</div>
          <div className="text-[#2E3141]/70 text-xs font-semibold uppercase tracking-wider mt-1">Pending</div>
        </div>
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-neutral-200/60 shadow-xs flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-[#111826]">{returnedCount}</div>
          <div className="text-[#2E3141]/70 text-xs font-semibold uppercase tracking-wider mt-1">Returned</div>
        </div>
        <div className="bg-[#FFFFFF] p-4 rounded-xl border border-neutral-200/60 shadow-xs flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-[#111826]">{approvedCount}</div>
          <div className="text-[#2E3141]/70 text-xs font-semibold uppercase tracking-wider mt-1">Approved</div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-neutral-200/60 flex justify-between items-center bg-[#FFFFFF]">
          <div className="relative w-80">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-[#2E3141]/50" />
            </div>
            <input
              type="text"
              placeholder="Search by quote, customer, risk, stage..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 border border-neutral-200/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#724B66]/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-neutral-400 hover:text-neutral-600"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <label className="flex items-center space-x-2 text-sm text-[#2E3141]/70 cursor-pointer select-none">
            <input 
              type="checkbox" 
              className="rounded text-[#724B66] focus:ring-[#724B66]" 
              checked={showPendingOnly}
              onChange={(e) => setShowPendingOnly(e.target.checked)}
            />
            <span className="font-medium">Filter: Pending Only</span>
          </label>
        </div>
        
        <div className="overflow-y-auto flex-1 bg-[#FFFFFF]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-50/75 sticky top-0 z-10 border-b border-neutral-200 text-neutral-500 uppercase tracking-wider text-xs font-semibold">
              <tr>
                <th className="px-6 py-3">Quotation</th>
                <th className="px-6 py-3">Customer</th>
                <th className="px-6 py-3">Blended Risk</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Stage</th>
                <th className="px-6 py-3">Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {filteredApprovals.map(approval => {
                const q = approval.quotation;
                if (!q) return null;
                const riskLevel = q.risk_tier === 'high_risk_finance' ? 'HIGH' : q.risk_tier === 'medium_risk_manager' ? 'MEDIUM' : 'LOW';
                const riskClass =
                  riskLevel === 'HIGH'
                    ? 'bg-rose-500/10 text-rose-900 border-rose-500/20'
                    : riskLevel === 'MEDIUM'
                    ? 'bg-amber-500/10 text-amber-900 border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-900 border-emerald-500/20';
                
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
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${riskClass}`}>
                        {riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge status={approval.status} className="capitalize">{approval.status}</Badge>
                    </td>
                    <td className="px-6 py-4">{stageName}</td>
                    <td className="px-6 py-4 text-[#2E3141]/70">{assignedTo}</td>
                  </tr>
                );
              })}
              {filteredApprovals.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center">
                    {searchQuery.trim() ? (
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3 text-neutral-400">
                          <Search className="w-6 h-6 text-neutral-400" />
                        </div>
                        <h3 className="text-base font-semibold text-[#111826] mb-1">
                          No matching approvals found
                        </h3>
                        <p className="text-sm text-[#2E3141]/70 mb-4">
                          No approvals matched your search for <span className="font-medium text-[#111826]">"{searchQuery}"</span>{showPendingOnly ? ' with Pending Only filter active' : ''}. Try checking for typos or searching by quotation ID or customer name.
                        </p>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="inline-flex items-center px-3.5 py-2 text-xs font-medium rounded-lg bg-[#724B66] text-white hover:bg-[#5e3d54] transition-colors shadow-sm"
                          >
                            Clear search
                          </button>
                          {showPendingOnly && (
                            <button
                              type="button"
                              onClick={() => setShowPendingOnly(false)}
                              className="inline-flex items-center px-3.5 py-2 text-xs font-medium rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors"
                            >
                              Show all approvals
                            </button>
                          )}
                        </div>
                      </div>
                    ) : showPendingOnly ? (
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                        <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-3 text-amber-600">
                          <Filter className="w-6 h-6 text-amber-600" />
                        </div>
                        <h3 className="text-base font-semibold text-[#111826] mb-1">
                          No pending approvals
                        </h3>
                        <p className="text-sm text-[#2E3141]/70 mb-4">
                          There are currently no quotations awaiting pending approval.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowPendingOnly(false)}
                          className="inline-flex items-center px-3.5 py-2 text-xs font-medium rounded-lg bg-[#724B66] text-white hover:bg-[#5e3d54] transition-colors shadow-sm"
                        >
                          Show all approvals
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mb-3 text-neutral-400">
                          <Search className="w-6 h-6 text-neutral-400" />
                        </div>
                        <h3 className="text-base font-semibold text-[#111826] mb-1">
                          No approvals found
                        </h3>
                        <p className="text-sm text-[#2E3141]/70">
                          No quotations have been submitted for discount approval yet.
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
