import { apiClient } from './client.js';

export const reportingApi = {
  getKpis: () => apiClient.get('/reports/kpi-summary'),
  getPipelineByStage: () => apiClient.get('/reports/pipeline-by-stage'),
  getRevenueByMonth: () => apiClient.get('/reports/revenue-by-month'),
};
