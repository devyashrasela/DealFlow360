import { apiClient } from './client.js';

export const governanceApi = {
  listTierCeilings: () => apiClient.get('/governance/tier-ceilings'),
  upsertTierCeiling: (data) => apiClient.put('/governance/tier-ceilings', data),
  deleteTierCeiling: (id) => apiClient.delete(`/governance/tier-ceilings/${id}`),
  listCategoryCeilings: () => apiClient.get('/governance/category-ceilings'),
  upsertCategoryCeiling: (data) => apiClient.put('/governance/category-ceilings', data),
  deleteCategoryCeiling: (id) => apiClient.delete(`/governance/category-ceilings/${id}`),
  listApprovalChains: () => apiClient.get('/governance/approval-chains'),
  createApprovalChain: (data) => apiClient.post('/governance/approval-chains', data),
  updateApprovalChain: (id, data) => apiClient.put(`/governance/approval-chains/${id}`, data),
  deleteApprovalChain: (id) => apiClient.delete(`/governance/approval-chains/${id}`),
};
