import { apiClient } from './client.js';

export const fulfillmentApi = {
  getStock: (params) => apiClient.get('/fulfillment/stock', params),
  getOrders: (params) => apiClient.get('/fulfillment/orders', params),
  getOrderDetail: (id) => apiClient.get(`/fulfillment/orders/${id}`),
  updateOrderStatus: (id, status) => apiClient.patch(`/fulfillment/orders/${id}/status`, { status }),
  getSplitPreview: (quotationId) => apiClient.get(`/fulfillment/split-preview/${quotationId}`),
  ingestConfirmedQuote: (quotationId) => apiClient.post(`/fulfillment/orders/ingest/${quotationId}`),
  applyManualSplit: (quotationId, allocations) => apiClient.post(`/fulfillment/manual-split/${quotationId}`, { allocations }),
  getBackorders: (params) => apiClient.get('/fulfillment/backorders', params),
  getConsolidationPrompts: (params) => apiClient.get('/fulfillment/consolidation-prompts', params),
  consolidateBackorder: (id, data) => apiClient.post(`/fulfillment/backorders/${id}/consolidate`, data),
  receiveStock: (data) => apiClient.post('/fulfillment/stock/receive', data),
};
