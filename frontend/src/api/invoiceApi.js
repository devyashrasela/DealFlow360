import { apiClient } from './client';

export const listInvoices = async (params) => {
  const { data } = await apiClient.get('/invoices', { params });
  return data;
};

export const getInvoiceDetail = async (id) => {
  const { data } = await apiClient.get(`/invoices/${id}`);
  return data;
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
