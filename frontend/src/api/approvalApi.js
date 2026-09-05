import { apiClient } from './client.js';

export const approvalApi = {
  listPending: () => apiClient.get('/approvals/pending'),
  listAll: () => apiClient.get('/approvals/pending?status=all'),
  getDetail: (quotationId) => apiClient.get(`/approvals/${quotationId}/approval`),
  submit: (quotationId) => apiClient.post(`/approvals/${quotationId}/submit`),
  approve: (quotationId, data) => apiClient.post(`/approvals/${quotationId}/approve`, data),
  reject: (quotationId, data) => apiClient.post(`/approvals/${quotationId}/reject`, data),
  return: (quotationId, data) => apiClient.post(`/approvals/${quotationId}/return`, data),
  getAuditLogs: (quotationId) => apiClient.get(`/approvals/${quotationId}/audit-logs`),
};

