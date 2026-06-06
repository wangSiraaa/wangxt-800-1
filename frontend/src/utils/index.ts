import { Role, BatchStatus, ReviewType, ReceiptType } from '../types';

export const RoleLabels: Record<Role, string> = {
  [Role.RECYCLER]: '回收站',
  [Role.TOWN_AUDITOR]: '乡镇审核员',
  [Role.FINANCE_REVIEWER]: '财政复核员',
  [Role.SUPERVISOR]: '监管人员',
};

export const BatchStatusLabels: Record<BatchStatus, string> = {
  [BatchStatus.DRAFT]: '草稿',
  [BatchStatus.SUBMITTED]: '待乡镇审核',
  [BatchStatus.TOWN_APPROVED]: '乡镇审核通过',
  [BatchStatus.TOWN_REJECTED]: '乡镇审核退回',
  [BatchStatus.FINANCE_APPROVED]: '财政复核通过',
  [BatchStatus.FINANCE_REJECTED]: '财政复核退回',
  [BatchStatus.SECOND_REVIEW]: '待二次复核',
  [BatchStatus.PAYMENT_APPROVED]: '待发放',
  [BatchStatus.PAYMENT_REJECTED]: '发放驳回',
  [BatchStatus.PAID]: '已发放',
  [BatchStatus.CORRECTED]: '已更正',
};

export const BatchStatusColors: Record<BatchStatus, string> = {
  [BatchStatus.DRAFT]: 'default',
  [BatchStatus.SUBMITTED]: 'processing',
  [BatchStatus.TOWN_APPROVED]: 'processing',
  [BatchStatus.TOWN_REJECTED]: 'error',
  [BatchStatus.FINANCE_APPROVED]: 'processing',
  [BatchStatus.FINANCE_REJECTED]: 'error',
  [BatchStatus.SECOND_REVIEW]: 'warning',
  [BatchStatus.PAYMENT_APPROVED]: 'processing',
  [BatchStatus.PAYMENT_REJECTED]: 'error',
  [BatchStatus.PAID]: 'success',
  [BatchStatus.CORRECTED]: 'purple',
};

export const ReviewTypeLabels: Record<ReviewType, string> = {
  [ReviewType.TOWN_AUDIT]: '乡镇审核',
  [ReviewType.FINANCE_REVIEW]: '财政复核',
  [ReviewType.SECOND_REVIEW]: '二次复核',
  [ReviewType.CORRECTION]: '更正',
};

export const ReceiptTypeLabels: Record<ReceiptType, string> = {
  [ReceiptType.TOWN_RECEIPT]: '乡镇处理回执',
  [ReceiptType.FINANCE_RECEIPT]: '财政处理回执',
  [ReceiptType.PAYMENT_RECEIPT]: '发放处理回执',
  [ReceiptType.CORRECTION_RECEIPT]: '更正处理回执',
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

export const setAuthToken = (token: string) => {
  localStorage.setItem('token', token);
};

export const clearAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const getCurrentUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

export const setCurrentUser = (user: any) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const formatCurrency = (amount: number): string => {
  return `¥${amount.toFixed(2)}`;
};

export const formatWeight = (weight: number): string => {
  return `${weight.toFixed(2)} kg`;
};
