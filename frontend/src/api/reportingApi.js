import { apiClient } from './client.js';

export const reportingApi = {
  getKpis: (params) => apiClient.get('/reports/kpi-summary', params),
  getSalesRepDiscipline: (params) => apiClient.get('/reports/sales-rep-discipline', params),
  getProductCategoryPerformance: (params) => apiClient.get('/reports/product-category-performance', params),
  getPipelineByStage: (params) => apiClient.get('/reports/pipeline-by-stage', params),
  getRevenueByMonth: (params) => apiClient.get('/reports/revenue-by-month', params),
};
