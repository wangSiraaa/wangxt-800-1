import { Router, Response } from 'express';
import prisma from '../lib/prisma';
import { AuthRequest, ApiResponse } from '../types';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role, BatchStatus, ReviewType } from '../constants/enums';

const router = Router();

router.get('/dashboard', authMiddleware, requireRoles(Role.SUPERVISOR, Role.FINANCE_REVIEWER), async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const totalBatches = await prisma.batch.count();
    const totalWeight = await prisma.batch.aggregate({
      _sum: { weight: true },
      _avg: { weight: true },
    });
    const totalSubsidy = await prisma.batch.aggregate({
      _sum: { subsidyAmount: true },
    });

    const statusCounts = await prisma.batch.groupBy({
      by: ['status'],
      _count: true,
    });

    const anomalyCount = await prisma.batch.count({
      where: { isAnomaly: true },
    });

    const paidCount = await prisma.batch.count({
      where: { status: BatchStatus.PAID },
    });

    const paidAmount = await prisma.payment.aggregate({
      where: { payStatus: 'PAID' },
      _sum: { amount: true },
    });

    const recentBatches = await prisma.batch.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        farmer: true,
        submitter: { select: { name: true } },
      },
    });

    const anomalyBatches = await prisma.batch.findMany({
      where: { isAnomaly: true },
      include: {
        farmer: true,
        submitter: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const reviews = await prisma.review.findMany({
      include: {
        reviewer: { select: { name: true } },
        batch: { select: { batchNo: true } },
      },
      orderBy: { reviewedAt: 'desc' },
      take: 20,
    });

    const monthlyStats = await getMonthlyStats();
    const townStats = await getTownStats();
    const trendData = await getTrendData();

    res.json({
      success: true,
      data: {
        overview: {
          totalBatches,
          totalWeight: totalWeight._sum.weight || 0,
          avgWeight: totalWeight._avg.weight || 0,
          totalSubsidy: totalSubsidy._sum.subsidyAmount || 0,
          anomalyCount,
          paidCount,
          paidAmount: paidAmount._sum.amount || 0,
        },
        statusCounts: statusCounts.map((s) => ({
          status: s.status,
          count: s._count,
        })),
        recentBatches,
        anomalyBatches,
        recentReviews: reviews,
        monthlyStats,
        townStats,
        trendData,
      },
    });
  } catch (error) {
    console.error('获取看板数据错误:', error);
    res.status(500).json({ success: false, error: '获取数据失败' });
  }
});

router.get('/anomalies', authMiddleware, requireRoles(Role.SUPERVISOR, Role.FINANCE_REVIEWER), async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { startDate, endDate, town } = req.query;

    const where: any = { isAnomaly: true };
    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(String(startDate)) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(String(endDate)) };

    const batches = await prisma.batch.findMany({
      where,
      include: {
        farmer: true,
        submitter: { select: { name: true } },
        reviews: {
          include: { reviewer: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const anomalyByReason = batches.reduce((acc: any, b) => {
      const reason = b.anomalyReason || '未知原因';
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        batches,
        anomalyByReason: Object.entries(anomalyByReason).map(([reason, count]) => ({
          reason,
          count,
        })),
        totalCount: batches.length,
      },
    });
  } catch (error) {
    console.error('查询异常批次错误:', error);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

async function getMonthlyStats() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const batches = await prisma.batch.findMany({
    where: {
      createdAt: { gte: sixMonthsAgo },
    },
    select: {
      createdAt: true,
      weight: true,
      subsidyAmount: true,
      isAnomaly: true,
    },
  });

  const monthlyData: any = {};
  for (let i = 0; i < 6; i++) {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthlyData[key] = {
      month: key,
      batchCount: 0,
      totalWeight: 0,
      totalSubsidy: 0,
      anomalyCount: 0,
    };
  }

  for (const batch of batches) {
    const key = `${batch.createdAt.getFullYear()}-${String(batch.createdAt.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyData[key]) {
      monthlyData[key].batchCount++;
      monthlyData[key].totalWeight += batch.weight;
      monthlyData[key].totalSubsidy += batch.subsidyAmount;
      if (batch.isAnomaly) monthlyData[key].anomalyCount++;
    }
  }

  return Object.values(monthlyData);
}

async function getTownStats() {
  const farmers = await prisma.farmer.findMany({
    include: {
      batches: {
        select: { weight: true, subsidyAmount: true, isAnomaly: true },
      },
    },
  });

  const townMap: any = {};

  for (const farmer of farmers) {
    const town = farmer.town || '未分类';
    if (!townMap[town]) {
      townMap[town] = {
        town,
        farmerCount: 0,
        batchCount: 0,
        totalWeight: 0,
        totalSubsidy: 0,
        anomalyCount: 0,
      };
    }
    townMap[town].farmerCount++;
    townMap[town].batchCount += farmer.batches.length;
    townMap[town].totalWeight += farmer.batches.reduce((s, b) => s + b.weight, 0);
    townMap[town].totalSubsidy += farmer.batches.reduce((s, b) => s + b.subsidyAmount, 0);
    townMap[town].anomalyCount += farmer.batches.filter((b) => b.isAnomaly).length;
  }

  return Object.values(townMap);
}

async function getTrendData() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const batches = await prisma.batch.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { createdAt: true, weight: true, isAnomaly: true },
  });

  const dailyData: any = {};
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const key = date.toISOString().split('T')[0];
    dailyData[key] = {
      date: key,
      batchCount: 0,
      totalWeight: 0,
      anomalyCount: 0,
    };
  }

  for (const batch of batches) {
    const key = batch.createdAt.toISOString().split('T')[0];
    if (dailyData[key]) {
      dailyData[key].batchCount++;
      dailyData[key].totalWeight += batch.weight;
      if (batch.isAnomaly) dailyData[key].anomalyCount++;
    }
  }

  return Object.values(dailyData);
}

export default router;
