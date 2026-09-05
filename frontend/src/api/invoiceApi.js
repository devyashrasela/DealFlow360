import { apiClient } from './client';

export const listInvoices = async (params) => {
  return await apiClient.get('/invoices', params);
};

export const getInvoiceDetail = async (id) => {
  return await apiClient.get(`/invoices/${id}`);
};

export const generateInvoice = async (quotationId) => {
  const { data } = await apiClient.post(`/invoices/generate/${quotationId}`);
  return data;
};

export const recordPayment = async (id, payload) => {
  const { data } = await apiClient.post(`/invoices/${id}/payments`, payload);
  return data;
};

export const applyCreditOffset = async (id, payload) => {
  const { data } = await apiClient.post(`/invoices/${id}/apply-credit`, payload);
  return data;
};
