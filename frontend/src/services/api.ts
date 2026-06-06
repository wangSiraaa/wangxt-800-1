/// <reference types="vite/client" />
import axios from 'axios';
import type {
  ApiResponse,
  LoginResponse,
  User,
  Farmer,
  Batch,
  Review,
  Payment,
  Correction,
  SubsidyRule,
  DashboardData,
  Receipt,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: (username: string, password: string) =>
    api
      .post<ApiResponse<LoginResponse>>('/auth/login', { username, password })
      .then((r) => r.data),
  getMe: () =>
    api.get<ApiResponse<User>>('/auth/me').then((r) => r.data),
};

export const farmerApi = {
  getAll: (params?: any) =>
    api.get<ApiResponse<Farmer[]>>('/farmers', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<ApiResponse<Farmer>>(`/farmers/${id}`).then((r) => r.data),
  create: (data: any) =>
    api.post<ApiResponse<Farmer>>('/farmers', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.put<ApiResponse<Farmer>>(`/farmers/${id}`, data).then((r) => r.data),
};

export const batchApi = {
  getAll: (params?: any) =>
    api.get<ApiResponse<Batch[]>>('/batches', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<ApiResponse<Batch>>(`/batches/${id}`).then((r) => r.data),
  create: (data: any) =>
    api.post<ApiResponse<Batch>>('/batches', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.put<ApiResponse<Batch>>(`/batches/${id}`, data).then((r) => r.data),
  submit: (batchId: string) =>
    api
      .post<ApiResponse<any>>('/batches/submit', { batchId })
      .then((r) => r.data),
  uploadPhotos: (batchId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('photos', f));
    return api
      .post<ApiResponse<any>>(`/batches/${batchId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};

export const reviewApi = {
  getPending: () =>
    api.get<ApiResponse<Batch[]>>('/reviews/pending').then((r) => r.data),
  review: (data: any) =>
    api.post<ApiResponse<any>>('/reviews/review', data).then((r) => r.data),
};

export const paymentApi = {
  getAll: () =>
    api.get<ApiResponse<Payment[]>>('/payments').then((r) => r.data),
  pay: (data: { batchId: string; remark?: string }) =>
    api.post<ApiResponse<Payment>>('/payments/pay', data).then((r) => r.data),
  createCorrection: (data: {
    batchId: string;
    correctedAmount: number;
    reason: string;
  }) =>
    api
      .post<ApiResponse<Correction>>('/payments/correction', data)
      .then((r) => r.data),
  getCorrections: () =>
    api.get<ApiResponse<Correction[]>>('/payments/corrections').then((r) => r.data),
};

export const supervisorApi = {
  getDashboard: () =>
    api.get<ApiResponse<DashboardData>>('/supervisor/dashboard').then((r) => r.data),
  getAnomalies: (params?: any) =>
    api
      .get<ApiResponse<any>>('/supervisor/anomalies', { params })
      .then((r) => r.data),
};

export const subsidyRuleApi = {
  getAll: () =>
    api.get<ApiResponse<SubsidyRule[]>>('/subsidy-rules').then((r) => r.data),
  getActive: () =>
    api.get<ApiResponse<SubsidyRule>>('/subsidy-rules/active').then((r) => r.data),
  create: (data: any) =>
    api.post<ApiResponse<SubsidyRule>>('/subsidy-rules', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.put<ApiResponse<SubsidyRule>>(`/subsidy-rules/${id}`, data).then((r) => r.data),
};

export const receiptApi = {
  getByBatchId: (batchId: string) =>
    api.get<ApiResponse<Receipt[]>>(`/receipts/batch/${batchId}`).then((r) => r.data),
  submit: (data: { batchId: string; content: string; receiptType: string }) =>
    api.post<ApiResponse<Receipt>>('/receipts/submit', data).then((r) => r.data),
};

export default api;
