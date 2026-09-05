import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../api/client';

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
        apiClient.get(`/api/approvals/${id}/approval`),
        apiClient.get(`/api/approvals/${id}/audit-logs`)
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
    try {
      if (actionType === 'approve') {
        await apiClient.post(`/api/approvals/${id}/approve`, { comments });
      } else {
        if (!comments && actionType === 'reject') {
          alert('Comments are required for rejection');
          return;
        }
        await apiClient.post(`/api/approvals/${id}/reject`, { comments });
      }
      navigate('/approvals');
    } catch (err) {
      console.error(err);
      alert(`Failed to ${actionType}: ` + err.message);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (!quotation) return <div className="p-6">Quotation not found</div>;

  const riskLevel = quotation.risk_tier === 'high_risk_finance' ? 'HIGH' : quotation.risk_tier === 'medium_risk_manager' ? 'MEDIUM' : 'LOW';
  const riskColor = riskLevel === 'HIGH' ? 'bg-red-100 text-red-800' : riskLevel === 'MEDIUM' ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800';

  return (
    <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Approval Detail: {quotation.quotation_number}</h1>
          <p className="text-gray-500 text-sm">Opened by clicking a row on the Approvals list</p>
        </div>
        <button onClick={() => navigate('/approvals')} className="px-4 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">Back to List</button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-semibold mr-2">Blended Risk:</span>
            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${riskColor}`}>{riskLevel}</span>
          </div>
          <div><span className="font-semibold">Customer Tier:</span> {quotation.customer_account?.pricing_tier || 'Standard'}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="font-semibold mb-2">Why This Quote Was Flagged</h2>
        <p className="text-sm text-gray-600 mb-4">
          Worst single line ({quotation.worst_line_excess}pt over) plus overall pattern across the order sets the blended score ({quotation.blended_risk_score}pt).
        </p>
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 border-b">Line</th>
              <th className="p-2 border-b">Discount Given</th>
              <th className="p-2 border-b">Limit Allowed</th>
              <th className="p-2 border-b">Over By</th>
            </tr>
          </thead>
          <tbody>
            {quotation.QuotationLines?.map(line => (
              <tr key={line.id} className="border-b border-gray-100">
                <td className="p-2">{line.product?.name || `Product ${line.product_id}`} ({line.category})</td>
                <td className="p-2">{line.applied_discount_percentage}%</td>
                <td className="p-2">{line.effective_ceiling_limit}%</td>
                <td className="p-2 font-medium">
                  {line.is_over_limit ? (
                    <span className="text-red-600">{line.line_excess_points} pt OVER</span>
                  ) : (
                    <span className="text-green-600">0 pt - OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="font-semibold mb-4">Approval Chain Progress</h2>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">Submitted</span>
          <span>→</span>
          <span className={`px-3 py-1 rounded-full font-medium ${quotation.stage === 'pending_approval' ? 'bg-orange-100 text-orange-800' : 'bg-gray-100'}`}>Sales Manager</span>
          {quotation.risk_tier === 'high_risk_finance' && (
            <>
              <span>→</span>
              <span className="px-3 py-1 bg-gray-100 rounded-full font-medium">Finance</span>
            </>
          )}
          <span>→</span>
          <span className={`px-3 py-1 rounded-full font-medium ${quotation.stage === 'approved' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>Confirmed</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="font-semibold mb-4">Audit Trail</h2>
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 border-b w-32">User</th>
              <th className="p-2 border-b w-32">Action</th>
              <th className="p-2 border-b w-32">Date</th>
              <th className="p-2 border-b">Note</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs.map(log => (
              <tr key={log.id} className="border-b border-gray-100">
                <td className="p-2">{log.actor?.full_name || log.actor_user_id}</td>
                <td className="p-2 capitalize">{log.action_taken || log.action || 'Unknown'}</td>
                <td className="p-2">{new Date(log.created_at || log.createdAt).toLocaleDateString()}</td>
                <td className="p-2 text-gray-600">{log.comments || `Risk Score: ${log.blended_risk_score_at_action}`}</td>
              </tr>
            ))}
            {auditLogs.length === 0 && (
              <tr><td colSpan="4" className="p-4 text-gray-500">No audit logs available.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-gray-50 rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="font-semibold mb-3">Review Action</h2>
        <textarea
          className="w-full border-gray-300 rounded shadow-sm p-2 text-sm mb-4"
          rows="3"
          placeholder="Add comments or justification..."
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        ></textarea>
        <div className="flex space-x-3">
          <button onClick={() => handleAction('approve')} className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium">Approve</button>
          <button onClick={() => handleAction('reject')} className="px-4 py-2 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 font-medium">Return for Revision</button>
          <button onClick={() => handleAction('reject')} className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 font-medium">Reject</button>
        </div>
      </div>
    </div>
  );
}
