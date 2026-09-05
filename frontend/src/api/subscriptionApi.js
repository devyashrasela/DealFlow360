import { apiClient } from './client.js';

export const listSubscriptions = (params) => apiClient.get('/subscriptions', params || {});
export const getSubscriptionDetail = (id) => apiClient.get(`/subscriptions/${id}`);
export const provisionSubscription = (quotationId) => apiClient.post(`/subscriptions/provision/${quotationId}`);
export const modifySubscriptionQuantity = (id, payload) => apiClient.post(`/subscriptions/${id}/modify`, payload);
export const cancelSubscription = (id, payload) => apiClient.post(`/subscriptions/${id}/cancel`, payload);
export const previewProration = (id, payload) => apiClient.post(`/subscriptions/${id}/proration-preview`, payload);
