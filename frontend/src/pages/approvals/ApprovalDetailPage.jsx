import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { approvalApi } from '../../api/approvalApi';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ArrowLeft, AlertTriangle, CheckCircle2, Clock, XCircle, ArrowRight } from 'lucide-react';

export function ApprovalDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleAction = async (actionType) => {
    if (actionType === 'return' && !comments.trim()) {
      alert('Comments / feedback are required when returning for revision');
      return;
    }
    if (actionType === 'reject' && !comments.trim()) {
      alert('Comments are required for rejection');
      return;
    }

    try {
      setSubmitting(true);
      if (actionType === 'approve') {
        await approvalApi.approve(id, { comments });
      } else if (actionType === 'return') {
        await approvalApi.return(id, { comments });
      } else if (actionType === 'reject') {
        await approvalApi.reject(id, { comments });
      }
      navigate('/approvals');
    } catch (err) {
      alert(`Failed to ${actionType}: ${err.response?.data?.message || err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-[#2E3141]/70 text-sm">Loading approval details...</div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <h2 className="text-xl font-bold text-[#111826]">Quotation not found</h2>
        <p className="text-sm text-[#2E3141]/70">The requested quotation could not be located or you don't have access to view it.</p>
        <button
          onClick={() => navigate('/approvals')}
          className="inline-flex items-center px-4 py-2 bg-[#724B66] text-white rounded-lg text-sm font-medium hover:bg-[#5e3d54] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Approvals
        </button>
      </div>
    );
  }

  const lines = quotation.lines || quotation.QuotationLines || [];

  const riskLevel = quotation.risk_tier === 'high_risk_finance' ? 'HIGH' : quotation.risk_tier === 'medium_risk_manager' ? 'MEDIUM' : 'LOW';
  const riskColor = riskLevel === 'HIGH' ? 'bg-rose-50 text-rose-700 border-rose-200' : riskLevel === 'MEDIUM' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200';

  // Find the worst offending line
  const worstLine = lines.reduce((prev, current) => {
    return (Number(prev?.line_excess_points || 0) > Number(current?.line_excess_points || 0)) ? prev : current;
  }, lines[0] || null);

  const worstLineName = worstLine && worstLine.product?.name ? `${worstLine.product.name} (${worstLine.category || 'General'})` : (worstLine ? `Product ${worstLine.product_id}` : 'None');
  const worstLineExcess = worstLine ? Number(worstLine.line_excess_points || quotation.worst_line_excess || 0).toFixed(1) : Number(quotation.worst_line_excess || 0).toFixed(1);
  const blendedScoreFormatted = Number(quotation.blended_risk_score || 0).toFixed(2);

  let stageStatusBadge = 'default';
  if (quotation.stage === 'approved') stageStatusBadge = 'delivered';
  else if (quotation.stage === 'pending_approval' || quotation.stage === 'pending_finance_approval') stageStatusBadge = 'pickpack';
  else if (quotation.stage === 'rejected') stageStatusBadge = 'open';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col space-y-2">
        <button 
          onClick={() => navigate('/approvals')} 
          className="flex items-center text-sm font-medium text-[#2E3141]/70 hover:text-[#724B66] transition-colors w-fit group"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Approvals
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-[#111826]">
                Approval Detail: {quotation.quotation_number}
              </h1>
              <Badge status={stageStatusBadge} className="capitalize text-xs">
                {quotation.stage?.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-[#2E3141]/70 text-sm mt-0.5">
              Reviewing requested discounts and risk metrics for {quotation.customer_account?.buyer_organization?.legal_name || 'Customer'}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Metrics Card */}
      <Card className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
          <div>
            <span className="block text-xs uppercase tracking-wider text-[#2E3141]/60 font-medium mb-1">Customer</span>
            <span className="font-semibold text-[#111826] text-base">
              {quotation.customer_account?.buyer_organization?.legal_name || 'N/A'}
            </span>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wider text-[#2E3141]/60 font-medium mb-1">Pricing Tier</span>
            <span className="font-semibold text-[#111826] text-base capitalize">
              {quotation.customer_account?.pricing_tier || 'Standard'}
            </span>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wider text-[#2E3141]/60 font-medium mb-1">Total Amount</span>
            <span className="font-semibold text-[#111826] text-base">
              ${Number(quotation.gross_total || quotation.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wider text-[#2E3141]/60 font-medium mb-1">Blended Risk</span>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${riskColor}`}>
                {riskLevel}
              </span>
              <span className="text-xs text-[#2E3141]/70 font-medium">
                {quotation.approvals?.some(a => a.comments?.includes('Escalated from Deal Health')) 
                  ? '(Escalated)' 
                  : `(${blendedScoreFormatted} pt)`}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Flag Details Card */}
      <Card title="Why This Quote Was Flagged" className="p-5">
        <div className="flex items-start gap-3 p-3.5 bg-neutral-50 rounded-lg border border-neutral-200/60 mb-5 text-sm text-[#2E3141]">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            
            {quotation.margin_hard_stop_breached ? (
              <p className="leading-relaxed">
                This quote was automatically flagged because the overall blended margin (<strong>{Number(quotation.blended_margin_percentage || 0).toFixed(1)}%</strong>) fell below the organizational margin floor hard-stop.
              </p>
            ) : quotation.approvals?.some(a => a.comments?.includes('Escalated from Deal Health')) ? (
              <p className="leading-relaxed">
                This quote was manually escalated by the <strong>Deal Health & Anomaly Detector</strong>. 
                (Risk score overridden; review the Deal Health dashboard or comments below for the specific anomaly details).
              </p>
            ) : (
              <p className="leading-relaxed">
                Worst single line is <strong className="text-[#111826]">{worstLineName}</strong> (<span className="font-semibold text-rose-600">{worstLineExcess} pt</span> over limit).
                This plus the overall discount pattern across the order sets the blended risk score to <strong className="text-[#111826]">{blendedScoreFormatted} pt</strong>.
              </p>
            )}

          </div>
        </div>

        <div className="overflow-x-auto border border-neutral-200/60 rounded-lg">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-50 border-b border-neutral-200/60">
              <tr>
                <th className="px-4 py-3 font-semibold text-[#111826]">Line / Product</th>
                <th className="px-4 py-3 font-semibold text-[#111826]">Discount Given</th>
                <th className="px-4 py-3 font-semibold text-[#111826]">Limit Allowed</th>
                <th className="px-4 py-3 font-semibold text-[#111826]">Over By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 bg-white">
              {lines.map((line, idx) => (
                <tr key={line.id || idx} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-[#111826]">
                    {line.product?.name || `Product ${line.product_id}`}
                    <span className="ml-2 text-xs text-[#2E3141]/60 font-normal">({line.category || 'General'})</span>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-[#111826]">
                    {Number(line.applied_discount_percentage || 0).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3.5 text-[#2E3141]/70">
                    {Number(line.effective_ceiling_limit || 0).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3.5 font-medium">
                    {line.is_over_limit || Number(line.line_excess_points || 0) > 0 ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        {Number(line.line_excess_points || 0).toFixed(1)} pt OVER
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        0.0 pt - OK
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-[#2E3141]/70">No quotation lines available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Approval Chain Progress Card */}
      <Card title="Approval Chain Progress" className="p-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#2E3141]/80">
          <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-800 rounded-full font-medium border border-blue-200 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-blue-600" /> Submitted
          </span>
          <ArrowRight className="w-4 h-4 text-neutral-400" />
          <span className={`inline-flex items-center px-3 py-1 rounded-full font-medium border text-xs ${
            quotation.stage === 'pending_approval'
              ? 'bg-amber-50 text-amber-800 border-amber-200 ring-2 ring-amber-400/30'
              : quotation.stage === 'approved'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-neutral-100 text-neutral-600 border-neutral-200'
          }`}>
            Sales Manager
          </span>
          {quotation.risk_tier === 'high_risk_finance' && (
            <>
              <ArrowRight className="w-4 h-4 text-neutral-400" />
              <span className={`inline-flex items-center px-3 py-1 rounded-full font-medium border text-xs ${
                quotation.stage === 'pending_finance_approval'
                  ? 'bg-amber-50 text-amber-800 border-amber-200 ring-2 ring-amber-400/30'
                  : quotation.stage === 'approved'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-neutral-100 text-neutral-600 border-neutral-200'
              }`}>
                Finance
              </span>
            </>
          )}
          <ArrowRight className="w-4 h-4 text-neutral-400" />
          <span className={`inline-flex items-center px-3 py-1 rounded-full font-medium border text-xs ${
            quotation.stage === 'approved'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-neutral-100 text-neutral-600 border-neutral-200'
          }`}>
            {quotation.stage === 'approved' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Approved
              </>
            ) : quotation.stage === 'rejected' ? (
              <>
                <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" /> Rejected
              </>
            ) : (
              'Final Approval'
            )}
          </span>
        </div>
      </Card>

      {/* Audit Trail Card */}
      <Card title="Audit Trail" className="p-5">
        <div className="overflow-x-auto border border-neutral-200/60 rounded-lg">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-neutral-50 border-b border-neutral-200/60">
              <tr>
                <th className="px-4 py-3 font-semibold text-[#111826] w-36">User</th>
                <th className="px-4 py-3 font-semibold text-[#111826] w-36">Action</th>
                <th className="px-4 py-3 font-semibold text-[#111826] w-36">Date & Time</th>
                <th className="px-4 py-3 font-semibold text-[#111826]">Notes / Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200/60 bg-white">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="px-4 py-3.5 font-medium text-[#111826]">
                    {log.actor?.full_name || (log.actor_user_id ? `User #${log.actor_user_id}` : 'System')}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200 capitalize">
                      {log.action_taken?.replace(/_/g, ' ') || 'Action'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-[#2E3141]/70">
                    {new Date(log.created_at || log.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3.5 text-[#2E3141]/70 text-xs">
                    {log.comments || (log.blended_risk_score_at_action ? `Risk Score: ${Number(log.blended_risk_score_at_action).toFixed(2)} pt` : '—')}
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-[#2E3141]/70">No audit logs recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Review Action Card */}
      <Card title="Review Action" className="p-5 bg-white">
        <label className="block text-xs uppercase tracking-wider text-[#2E3141]/60 font-medium mb-1.5">
          Comments / Justification Note
        </label>
        <textarea
          className="w-full border border-neutral-200/60 rounded-lg shadow-sm p-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-[#724B66]/40 text-[#111826] bg-white transition-all"
          rows="3"
          placeholder="Add approval comments or required revision feedback..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          disabled={submitting}
        ></textarea>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            type="button"
            disabled={submitting}
            onClick={() => handleAction('approve')} 
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 inline-flex items-center"
          >
            {submitting ? 'Processing...' : 'Approve Quotation'}
          </button>
          <button 
            type="button"
            disabled={submitting}
            onClick={() => handleAction('return')} 
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 inline-flex items-center"
          >
            Return for Revision
          </button>
          <button 
            type="button"
            disabled={submitting}
            onClick={() => handleAction('reject')} 
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 inline-flex items-center"
          >
            Reject Quotation
          </button>
        </div>
      </Card>
    </div>
  );
}
