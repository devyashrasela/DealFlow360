import { apiClient } from './client.js';
export const warehouseApi = {
  list: () => apiClient.get('/warehouses'),
  create: (data) => apiClient.post('/warehouses', data),
  update: (id, data) => apiClient.put(`/warehouses/${id}`, data),
  delete: (id) => apiClient.delete(`/warehouses/${id}`),
};
