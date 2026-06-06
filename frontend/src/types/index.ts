export enum Role {
  RECYCLER = 'RECYCLER',
  TOWN_AUDITOR = 'TOWN_AUDITOR',
  FINANCE_REVIEWER = 'FINANCE_REVIEWER',
  SUPERVISOR = 'SUPERVISOR',
}

export enum BatchStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  TOWN_APPROVED = 'TOWN_APPROVED',
  TOWN_REJECTED = 'TOWN_REJECTED',
  FINANCE_APPROVED = 'FINANCE_APPROVED',
  FINANCE_REJECTED = 'FINANCE_REJECTED',
  SECOND_REVIEW = 'SECOND_REVIEW',
  PAYMENT_APPROVED = 'PAYMENT_APPROVED',
  PAYMENT_REJECTED = 'PAYMENT_REJECTED',
  PAID = 'PAID',
  CORRECTED = 'CORRECTED',
}

export enum ReviewType {
  TOWN_AUDIT = 'TOWN_AUDIT',
  FINANCE_REVIEW = 'FINANCE_REVIEW',
  SECOND_REVIEW = 'SECOND_REVIEW',
  CORRECTION = 'CORRECTION',
}

export enum ReceiptType {
  TOWN_RECEIPT = 'TOWN_RECEIPT',
  FINANCE_RECEIPT = 'FINANCE_RECEIPT',
  PAYMENT_RECEIPT = 'PAYMENT_RECEIPT',
  CORRECTION_RECEIPT = 'CORRECTION_RECEIPT',
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
}

export interface Farmer {
  id: string;
  idCard: string;
  name: string;
  phone?: string;
  village: string;
  town: string;
  plotNumber?: string;
  plotArea?: number;
  createdAt: string;
}

export interface Photo {
  id: string;
  batchId: string;
  filename: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface Review {
  id: string;
  batchId: string;
  reviewerId: string;
  reviewer: { id: string; name: string };
  reviewType: ReviewType;
  opinion: string;
  isPassed: boolean;
  reviewedAt: string;
}

export interface Payment {
  id: string;
  batchId: string;
  amount: number;
  payerId: string;
  payer: { id: string; name: string };
  payDate?: string;
  payStatus: string;
  remark?: string;
  createdAt: string;
}

export interface Correction {
  id: string;
  batchId: string;
  correctorId: string;
  corrector: { id: string; name: string };
  originalAmount: number;
  correctedAmount: number;
  reason: string;
  createdAt: string;
}

export interface Receipt {
  id: string;
  batchId: string;
  handlerId: string;
  handler: { id: string; name: string };
  receiptType: ReceiptType;
  content: string;
  handledAt: string;
}

export interface Batch {
  id: string;
  batchNo: string;
  farmerId: string;
  farmer: Farmer;
  weight: number;
  plotNumber: string;
  submitterId: string;
  submitter: { id: string; name: string; username: string };
  status: BatchStatus;
  subsidyAmount: number;
  hasPhoto: boolean;
  isAnomaly: boolean;
  anomalyReason?: string;
  collectionDate: string;
  createdAt: string;
  updatedAt: string;
  photos: Photo[];
  reviews: Review[];
  payments: Payment[];
  corrections?: Correction[];
  receipts?: Receipt[];
}

export interface SubsidyRule {
  id: string;
  name: string;
  pricePerKg: number;
  weightThreshold: number;
  anomalyRatio: number;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DashboardData {
  overview: {
    totalBatches: number;
    totalWeight: number;
    avgWeight: number;
    totalSubsidy: number;
    anomalyCount: number;
    paidCount: number;
    paidAmount: number;
  };
  statusCounts: { status: BatchStatus; count: number }[];
  recentBatches: Batch[];
  anomalyBatches: Batch[];
  recentReviews: Review[];
  monthlyStats: any[];
  townStats: any[];
  trendData: any[];
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}
