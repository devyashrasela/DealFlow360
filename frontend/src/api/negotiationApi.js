import { apiClient } from './client.js';

export const negotiationApi = {
  getMyQuotes: () => apiClient.get('/negotiations/my-quotes'),
  lineRequest: (data) => apiClient.post('/negotiations/line-request', data),
  counterOffer: (data) => apiClient.post('/negotiations/counter-offer', data),
  confirm: (quotation_id) => apiClient.post('/negotiations/confirm', { quotation_id }),
};
