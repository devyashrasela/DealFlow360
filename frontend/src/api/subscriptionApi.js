import { apiClient } from './client.js';

export const listSubscriptions = async (params) => {
  return await apiClient.get('/subscriptions', params);
};

export const getSubscriptionDetail = async (id) => {
  const { data } = await apiClient.get(`/subscriptions/${id}`);
  return data;
};

export const provisionSubscription = async (quotationId) => {
  const { data } = await apiClient.post(`/subscriptions/provision/${quotationId}`);
  return data;
};

export const modifySubscriptionQuantity = async (id, payload) => {
  const { data } = await apiClient.post(`/subscriptions/${id}/modify`, payload);
  return data;
};

export const cancelSubscription = async (id, payload) => {
  const { data } = await apiClient.post(`/subscriptions/${id}/cancel`, payload);
  return data;
};

export const previewProration = async (id, payload) => {
  const { data } = await apiClient.post(`/subscriptions/${id}/proration-preview`, payload);
  return data;
};
