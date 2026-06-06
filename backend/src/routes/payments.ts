import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest, ApiResponse } from '../types';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role, BatchStatus } from '../constants/enums';
import {
  BusinessRuleError,
  checkPaymentAllowed,
  checkCorrectionAllowed,
} from '../services/businessRules';

const router = Router();

const paymentSchema = z.object({
  batchId: z.string().min(1),
  remark: z.string().optional(),
});

const correctionSchema = z.object({
  batchId: z.string().min(1),
  correctedAmount: z.number().min(0),
  reason: z.string().min(1),
});

router.get('/', authMiddleware, requireRoles(Role.FINANCE_REVIEWER, Role.SUPERVISOR), async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const payments = await prisma.payment.findMany({
      include: {
        batch: {
          include: { farmer: true },
        },
        payer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: payments });
  } catch (error) {
    console.error('查询发放记录错误:', error);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

router.post('/pay', authMiddleware, requireRoles(Role.FINANCE_REVIEWER), async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const data = paymentSchema.parse(req.body);

    if (!req.user) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    await checkPaymentAllowed(data.batchId);

    const batch = await prisma.batch.findUnique({
      where: { id: data.batchId },
    });

    if (!batch) {
      res.status(404).json({ success: false, error: '批次不存在' });
      return;
    }

    const existingPayment = await prisma.payment.findFirst({
      where: { batchId: data.batchId, payStatus: 'PAID' },
    });

    if (existingPayment) {
      res.status(400).json({ success: false, error: '该批次已发放，如需修改请使用更正单' });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        batchId: data.batchId,
        amount: batch.subsidyAmount,
        payerId: req.user.userId,
        payDate: new Date(),
        payStatus: 'PAID',
        remark: data.remark || '正常发放',
      },
      include: {
        batch: { include: { farmer: true } },
        payer: { select: { id: true, name: true } },
      },
    });

    await prisma.batch.update({
      where: { id: data.batchId },
      data: { status: BatchStatus.PAID },
    });

    res.json({ success: true, data: payment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    if (error instanceof BusinessRuleError) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    console.error('发放补贴错误:', error);
    res.status(500).json({ success: false, error: '发放失败' });
  }
});

router.post('/correction', authMiddleware, requireRoles(Role.FINANCE_REVIEWER), async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const data = correctionSchema.parse(req.body);

    if (!req.user) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    await checkCorrectionAllowed(data.batchId);

    const batch = await prisma.batch.findUnique({
      where: { id: data.batchId },
      include: { payments: { where: { payStatus: 'PAID' } } },
    });

    if (!batch) {
      res.status(404).json({ success: false, error: '批次不存在' });
      return;
    }

    const originalAmount = batch.payments[0]?.amount || batch.subsidyAmount;

    const correction = await prisma.correction.create({
      data: {
        batchId: data.batchId,
        correctorId: req.user.userId,
        originalAmount,
        correctedAmount: data.correctedAmount,
        reason: data.reason,
      },
      include: {
        batch: { include: { farmer: true } },
        corrector: { select: { id: true, name: true } },
      },
    });

    await prisma.batch.update({
      where: { id: data.batchId },
      data: {
        status: BatchStatus.CORRECTED,
        subsidyAmount: data.correctedAmount,
      },
    });

    res.json({ success: true, data: correction });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    if (error instanceof BusinessRuleError) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    console.error('创建更正单错误:', error);
    res.status(500).json({ success: false, error: '创建失败' });
  }
});

router.get('/corrections', authMiddleware, requireRoles(Role.FINANCE_REVIEWER, Role.SUPERVISOR), async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const corrections = await prisma.correction.findMany({
      include: {
        batch: { include: { farmer: true } },
        corrector: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: corrections });
  } catch (error) {
    console.error('查询更正单错误:', error);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

export default router;
