import { apiClient } from './client.js';

export const approvalApi = {
  listPending: () => apiClient.get('/approvals/pending'),
  getDetail: (quotationId) => apiClient.get(`/approvals/${quotationId}/approval`),
  submit: (quotationId) => apiClient.post(`/approvals/${quotationId}/submit`),
  approve: (quotationId, data) => apiClient.post(`/approvals/${quotationId}/approve`, data),
  reject: (quotationId, data) => apiClient.post(`/approvals/${quotationId}/reject`, data),
  getAuditLogs: (quotationId) => apiClient.get(`/approvals/${quotationId}/audit-logs`),
};
