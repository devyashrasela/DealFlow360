import { apiClient } from './client.js';

export const notificationApi = {
  list: (params = {}) => apiClient.get('/notifications', params),
  unreadCount: () => apiClient.get('/notifications/unread-count'),
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.post('/notifications/mark-all-read'),
  dismiss: (id) => apiClient.patch(`/notifications/${id}/dismiss`),
  activityFeed: (params = {}) => apiClient.get('/activity', params),
};

export default notificationApi;
