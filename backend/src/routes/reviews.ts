import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest, ApiResponse } from '../types';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role, BatchStatus, ReviewType } from '../constants/enums';
import { checkWeightAnomaly } from '../services/businessRules';

const router = Router();

const reviewSchema = z.object({
  batchId: z.string().min(1),
  opinion: z.string().min(1),
  isPassed: z.boolean(),
  reviewType: z.enum(Object.values(ReviewType) as [ReviewType, ...ReviewType[]]),
});

const isBatchStatus = (status: string): status is BatchStatus =>
  (Object.values(BatchStatus) as string[]).includes(status);

const getNextStatus = (
  currentStatus: BatchStatus,
  reviewType: ReviewType,
  isPassed: boolean
): BatchStatus => {
  if (!isPassed) {
    switch (reviewType) {
      case ReviewType.TOWN_AUDIT:
        return BatchStatus.TOWN_REJECTED;
      case ReviewType.FINANCE_REVIEW:
        return BatchStatus.FINANCE_REJECTED;
      case ReviewType.SECOND_REVIEW:
        return BatchStatus.FINANCE_REJECTED;
      default:
        return currentStatus;
    }
  }

  switch (reviewType) {
    case ReviewType.TOWN_AUDIT:
      return BatchStatus.TOWN_APPROVED;
    case ReviewType.FINANCE_REVIEW:
      return BatchStatus.FINANCE_APPROVED;
    case ReviewType.SECOND_REVIEW:
      return BatchStatus.FINANCE_APPROVED;
    default:
      return currentStatus;
  }
};

router.get('/pending', authMiddleware, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    let statuses: BatchStatus[] = [];

    if (req.user?.role === Role.TOWN_AUDITOR) {
      statuses = [BatchStatus.SUBMITTED];
    } else if (req.user?.role === Role.FINANCE_REVIEWER) {
      statuses = [BatchStatus.TOWN_APPROVED, BatchStatus.SECOND_REVIEW];
    }

    const where: any = {};
    if (statuses.length > 0) {
      where.status = { in: statuses };
    }

    const batches = await prisma.batch.findMany({
      where,
      include: {
        farmer: true,
        submitter: { select: { id: true, name: true } },
        photos: true,
        reviews: {
          include: { reviewer: { select: { id: true, name: true } } },
        },
        receipts: {
          include: { handler: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ success: true, data: batches });
  } catch (error) {
    console.error('查询待审核批次错误:', error);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

router.post('/review', authMiddleware, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const data = reviewSchema.parse(req.body);

    if (!req.user) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const batch = await prisma.batch.findUnique({
      where: { id: data.batchId },
    });

    if (!batch) {
      res.status(404).json({ success: false, error: '批次不存在' });
      return;
    }

    if (!isBatchStatus(batch.status)) {
      res.status(400).json({ success: false, error: '批次状态异常，无法审核' });
      return;
    }

    if (
      req.user.role === Role.TOWN_AUDITOR &&
      batch.status !== BatchStatus.SUBMITTED
    ) {
      res.status(400).json({ success: false, error: '当前状态无法进行乡镇审核' });
      return;
    }

    const financeReviewStatuses: BatchStatus[] = [
      BatchStatus.TOWN_APPROVED,
      BatchStatus.SECOND_REVIEW,
    ];

    if (
      req.user.role === Role.FINANCE_REVIEWER &&
      !financeReviewStatuses.includes(batch.status)
    ) {
      res.status(400).json({ success: false, error: '当前状态无法进行财政复核' });
      return;
    }

    const nextStatus = getNextStatus(batch.status, data.reviewType, data.isPassed);

    const review = await prisma.review.create({
      data: {
        batchId: data.batchId,
        reviewerId: req.user.userId,
        reviewType: data.reviewType,
        opinion: data.opinion,
        isPassed: data.isPassed,
      },
      include: { reviewer: { select: { id: true, name: true } } },
    });

    const updatedBatch = await prisma.batch.update({
      where: { id: data.batchId },
      data: { status: nextStatus },
      include: { farmer: true, reviews: true },
    });

    res.json({
      success: true,
      data: {
        review,
        batch: updatedBatch,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('审核错误:', error);
    res.status(500).json({ success: false, error: '审核失败' });
  }
});

export default router;
