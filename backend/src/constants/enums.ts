export const Role = {
  RECYCLER: 'RECYCLER',
  TOWN_AUDITOR: 'TOWN_AUDITOR',
  FINANCE_REVIEWER: 'FINANCE_REVIEWER',
  SUPERVISOR: 'SUPERVISOR',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const BatchStatus = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  TOWN_APPROVED: 'TOWN_APPROVED',
  TOWN_REJECTED: 'TOWN_REJECTED',
  FINANCE_APPROVED: 'FINANCE_APPROVED',
  FINANCE_REJECTED: 'FINANCE_REJECTED',
  SECOND_REVIEW: 'SECOND_REVIEW',
  PAYMENT_APPROVED: 'PAYMENT_APPROVED',
  PAYMENT_REJECTED: 'PAYMENT_REJECTED',
  PAID: 'PAID',
  CORRECTED: 'CORRECTED',
} as const;

export type BatchStatus = (typeof BatchStatus)[keyof typeof BatchStatus];

export const ReviewType = {
  TOWN_AUDIT: 'TOWN_AUDIT',
  FINANCE_REVIEW: 'FINANCE_REVIEW',
  SECOND_REVIEW: 'SECOND_REVIEW',
  CORRECTION: 'CORRECTION',
} as const;

export type ReviewType = (typeof ReviewType)[keyof typeof ReviewType];

export const ReceiptType = {
  TOWN_RECEIPT: 'TOWN_RECEIPT',
  FINANCE_RECEIPT: 'FINANCE_RECEIPT',
  PAYMENT_RECEIPT: 'PAYMENT_RECEIPT',
  CORRECTION_RECEIPT: 'CORRECTION_RECEIPT',
} as const;

export type ReceiptType = (typeof ReceiptType)[keyof typeof ReceiptType];
