import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { approvalApi } from '../../api/approvalApi';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft } from 'lucide-react';

export function ApprovalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [qRes, logsRes] = await Promise.all([
        approvalApi.getDetail(id),
        approvalApi.getAuditLogs(id)
      ]);
      setQuotation(qRes);
      setAuditLogs(logsRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await approvalApi.approve(id, { comments });
      navigate('/approvals');
    } catch (err) {
      alert(`Failed to approve: ${err.message}`);
    }
  };

  const handleReturn = async () => {
    if (!comments.trim()) {
      alert('Comments are required when returning for revision');
      return;
    }
    try {
      await approvalApi.reject(id, { comments: `[RETURNED] ${comments}`, action: 'return' });
      navigate('/approvals');
    } catch (err) {
      alert(`Failed to return: ${err.message}`);
    }
  };

  const handleReject = async () => {
    try {
      await approvalApi.reject(id, { comments, action: 'reject' });
      navigate('/approvals');
    } catch (err) {
      alert(`Failed to reject: ${err.message}`);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!quotation) return <div className="p-6">Quotation not found</div>;

  const riskLevel = quotation.risk_tier === 'high_risk_finance' ? 'HIGH' : quotation.risk_tier === 'medium_risk_manager' ? 'MEDIUM' : 'LOW';
  const riskColor = riskLevel === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-200' : riskLevel === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  // Find the worst offending line
  const worstLine = quotation.QuotationLines?.reduce((prev, current) => {
    return (prev.line_excess_points > current.line_excess_points) ? prev : current;
  }, { line_excess_points: -1 });

  const worstLineName = worstLine && worstLine.product ? `${worstLine.product.name} (${worstLine.category})` : 'Unknown Line';

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto bg-[#F3F2F2]">
      <div className="flex flex-col space-y-2">
        <button 
          onClick={() => navigate('/approvals')} 
          className="flex items-center text-sm text-[#2E3141]/70 hover:text-[#2E3141] transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Approvals
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#111826]">Approval Detail: {quotation.quotation_number}</h1>
            <p className="text-[#2E3141]/70 text-sm">Reviewing requested discounts and risk metrics</p>
          </div>
        </div>
      </div>

      <Card>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold text-[#111826] mr-2">Blended Risk:</span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${riskColor}`}>
              {riskLevel}
            </span>
          </div>
          <div>
            <span className="font-semibold text-[#111826]">Customer Tier:</span> 
            <span className="ml-2 text-[#2E3141]/70">{quotation.customer_account?.pricing_tier || 'Standard'}</span>
          </div>
        </div>
      </Card>

      <Card title="Why This Quote Was Flagged">
        <p className="text-sm text-[#2E3141]/70 mb-4">
          Worst single line is <strong>{worstLineName}</strong> ({quotation.worst_line_excess}pt over). This plus the overall pattern across the order sets the blended score to {quotation.blended_risk_score}pt.
        </p>
        <div className="overflow-x-auto border border-neutral-200/60 rounded-lg">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-50 border-b border-neutral-200/60">
              <tr>
                <th className="px-4 py-2 font-medium text-[#111826]">Line</th>
                <th className="px-4 py-2 font-medium text-[#111826]">Discount Given</th>
                <th className="px-4 py-2 font-medium text-[#111826]">Limit Allowed</th>
                <th className="px-4 py-2 font-medium text-[#111826]">Over By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60">
              {quotation.QuotationLines?.map(line => (
                <tr key={line.id} className="hover:bg-[#F3F2F2]">
                  <td className="px-4 py-3">{line.product?.name || `Product ${line.product_id}`} ({line.category})</td>
                  <td className="px-4 py-3">{line.applied_discount_percentage}%</td>
                  <td className="px-4 py-3">{line.effective_ceiling_limit}%</td>
                  <td className="px-4 py-3 font-medium">
                    {line.is_over_limit ? (
                      <span className="text-rose-600">{line.line_excess_points} pt OVER</span>
                    ) : (
                      <span className="text-emerald-600">0 pt - OK</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Approval Chain Progress">
        <div className="flex items-center space-x-2 text-sm text-[#2E3141]/70">
          <span className="px-3 py-1 bg-blue-50 text-blue-800 rounded-full font-medium border border-blue-200">Submitted</span>
          <span>→</span>
          <span className={`px-3 py-1 rounded-full font-medium border ${quotation.stage === 'pending_approval' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>Sales Manager</span>
          {quotation.risk_tier === 'high_risk_finance' && (
            <>
              <span>→</span>
              <span className={`px-3 py-1 rounded-full font-medium border ${quotation.stage === 'pending_finance_approval' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>Finance</span>
            </>
          )}
          <span>→</span>
          <span className={`px-3 py-1 rounded-full font-medium border ${quotation.stage === 'approved' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-neutral-100 text-neutral-600 border-neutral-200'}`}>Confirmed</span>
        </div>
      </Card>

      <Card title="Audit Trail">
        <div className="overflow-x-auto border border-neutral-200/60 rounded-lg">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-50 border-b border-neutral-200/60">
              <tr>
                <th className="px-4 py-2 font-medium text-[#111826] w-32">User</th>
                <th className="px-4 py-2 font-medium text-[#111826] w-32">Action</th>
                <th className="px-4 py-2 font-medium text-[#111826] w-32">Date</th>
                <th className="px-4 py-2 font-medium text-[#111826]">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-[#F3F2F2]">
                  <td className="px-4 py-3">{log.actor?.full_name || log.actor_user_id}</td>
                  <td className="px-4 py-3 capitalize">{log.action_taken || log.action || 'Unknown'}</td>
                  <td className="px-4 py-3">{new Date(log.created_at || log.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-[#2E3141]/70">{log.comments || `Risk Score: ${log.blended_risk_score_at_action}`}</td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr><td colSpan="4" className="px-4 py-6 text-center text-[#2E3141]/70">No audit logs available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Review Action" className="bg-[#FFFFFF]">
        <textarea
          className="w-full border border-neutral-200/60 rounded-lg shadow-sm p-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#724B66]/40 text-[#111826]"
          rows="3"
          placeholder="Add comments or justification..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        ></textarea>
        <div className="flex space-x-3">
          <Button onClick={handleApprove} className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white border-none">Approve</Button>
          <Button onClick={handleReturn} className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white border-none">Return for Revision</Button>
          <Button onClick={handleReject} variant="destructive">Reject</Button>
        </div>
      </Card>
    </div>
  );
}
