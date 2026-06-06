import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest, ApiResponse } from '../types';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role, ReceiptType } from '../constants/enums';

const router = Router();

const receiptSchema = z.object({
  batchId: z.string().min(1),
  content: z.string().min(1),
  receiptType: z.enum(Object.values(ReceiptType) as [ReceiptType, ...ReceiptType[]]),
});

router.get('/batch/:batchId', authMiddleware, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { batchId } = req.params;

    const receipts = await prisma.receipt.findMany({
      where: { batchId },
      include: {
        handler: { select: { id: true, name: true } },
      },
      orderBy: { handledAt: 'desc' },
    });

    res.json({ success: true, data: receipts });
  } catch (error) {
    console.error('查询处理回执错误:', error);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

router.post('/submit', authMiddleware, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const data = receiptSchema.parse(req.body);

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

    const receipt = await prisma.receipt.create({
      data: {
        batchId: data.batchId,
        handlerId: req.user.userId,
        receiptType: data.receiptType,
        content: data.content,
      },
      include: { handler: { select: { id: true, name: true } } },
    });

    res.json({
      success: true,
      data: receipt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('提交处理回执错误:', error);
    res.status(500).json({ success: false, error: '提交失败' });
  }
});

export default router;
