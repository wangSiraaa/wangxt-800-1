import prisma from '../lib/prisma';
import { BatchStatus, ReviewType } from '../constants/enums';

export class BusinessRuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}

export const checkPhotoRequired = async (batchId: string): Promise<void> => {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { photos: true },
  });

  if (!batch) {
    throw new BusinessRuleError('批次不存在');
  }

  if (batch.photos.length === 0) {
    throw new BusinessRuleError('称重照片缺失，不能提交审核');
  }
};

export const checkDuplicateSubmission = async (
  farmerId: string,
  plotNumber: string,
  collectionDate: Date,
  excludeBatchId?: string
): Promise<void> => {
  const startOfDay = new Date(collectionDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(collectionDate);
  endOfDay.setHours(23, 59, 59, 999);

  const where: any = {
    farmerId,
    plotNumber,
    collectionDate: {
      gte: startOfDay,
      lte: endOfDay,
    },
    status: {
      notIn: [BatchStatus.DRAFT],
    },
  };

  if (excludeBatchId) {
    where.id = { not: excludeBatchId };
  }

  const existing = await prisma.batch.findFirst({ where });

  if (existing) {
    throw new BusinessRuleError('同一农户同一地块同一天不能重复申报');
  }
};

export const calculateHistoricalAverage = async (
  farmerId: string,
  excludeBatchId?: string
): Promise<number> => {
  const where: any = {
    farmerId,
    status: {
      in: [
        BatchStatus.TOWN_APPROVED,
        BatchStatus.FINANCE_APPROVED,
        BatchStatus.PAID,
      ],
    },
  };

  if (excludeBatchId) {
    where.id = { not: excludeBatchId };
  }

  const batches = await prisma.batch.findMany({
    where,
    select: { weight: true },
  });

  if (batches.length === 0) {
    return 0;
  }

  const total = batches.reduce((sum, b) => sum + b.weight, 0);
  return total / batches.length;
};

export const checkWeightAnomaly = async (
  batchId: string
): Promise<{ isAnomaly: boolean; reason?: string; avgWeight: number; threshold: number }> => {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    throw new BusinessRuleError('批次不存在');
  }

  const rule = await prisma.subsidyRule.findFirst({
    where: { isActive: true },
  });

  const avgWeight = await calculateHistoricalAverage(batch.farmerId, batchId);

  if (!rule || avgWeight === 0) {
    return { isAnomaly: false, avgWeight, threshold: 0 };
  }

  const threshold = avgWeight * rule.anomalyRatio;
  
  if (batch.weight > threshold) {
    return {
      isAnomaly: true,
      reason: `本次重量 ${batch.weight.toFixed(2)}kg 超过历史均值 ${avgWeight.toFixed(2)}kg 的 ${rule.anomalyRatio} 倍阈值 ${threshold.toFixed(2)}kg，进入二次复核`,
      avgWeight,
      threshold,
    };
  }

  if (batch.weight > rule.weightThreshold) {
    return {
      isAnomaly: true,
      reason: `本次重量 ${batch.weight.toFixed(2)}kg 超过单批次阈值 ${rule.weightThreshold}kg，进入二次复核`,
      avgWeight,
      threshold: rule.weightThreshold,
    };
  }

  return { isAnomaly: false, avgWeight, threshold };
};

export const checkPaymentAllowed = async (batchId: string): Promise<void> => {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { reviews: true },
  });

  if (!batch) {
    throw new BusinessRuleError('批次不存在');
  }

  const rejectedReview = batch.reviews.find(
    (r) => r.reviewType === ReviewType.FINANCE_REVIEW && !r.isPassed
  );

  if (rejectedReview) {
    throw new BusinessRuleError('复核已退回，补贴金额不得发放');
  }

  const allowedStatuses = [
    BatchStatus.FINANCE_APPROVED,
    BatchStatus.SECOND_REVIEW,
  ];

  if (!allowedStatuses.includes(batch.status)) {
    throw new BusinessRuleError('当前状态不允许发放补贴');
  }
};

export const checkCorrectionAllowed = async (batchId: string): Promise<void> => {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    include: { payments: true },
  });

  if (!batch) {
    throw new BusinessRuleError('批次不存在');
  }

  const hasPaidPayment = batch.payments.some((p) => p.payStatus === 'PAID');

  if (!hasPaidPayment) {
    throw new BusinessRuleError('该批次尚未发放，无需更正');
  }
};

export const calculateSubsidy = async (weight: number): Promise<number> => {
  const rule = await prisma.subsidyRule.findFirst({
    where: { isActive: true },
  });

  if (!rule) {
    return weight * 2.5;
  }

  return weight * rule.pricePerKg;
};
