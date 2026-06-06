import { Request } from 'express';
import type { Role, BatchStatus, ReviewType } from '../constants/enums';

export interface JwtPayload {
  userId: string;
  username: string;
  role: Role;
  name: string;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateBatchRequest {
  farmerId: string;
  weight: number;
  plotNumber: string;
  collectionDate: string;
}

export interface ReviewBatchRequest {
  batchId: string;
  opinion: string;
  isPassed: boolean;
  reviewType: ReviewType;
}

export interface PaymentRequest {
  batchId: string;
  remark?: string;
}

export interface CorrectionRequest {
  batchId: string;
  correctedAmount: number;
  reason: string;
}

export interface BatchFilter {
  status?: BatchStatus;
  farmerId?: string;
  startDate?: string;
  endDate?: string;
  isAnomaly?: boolean;
}
