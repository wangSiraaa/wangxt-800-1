import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest, ApiResponse } from '../types';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role } from '../constants/enums';

const router = Router();

const subsidyRuleSchema = z.object({
  name: z.string().min(1),
  pricePerKg: z.number().min(0),
  weightThreshold: z.number().min(0),
  anomalyRatio: z.number().min(1),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const rules = await prisma.subsidyRule.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: rules });
  } catch (error) {
    console.error('查询补贴规则错误:', error);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

router.get('/active', authMiddleware, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const rule = await prisma.subsidyRule.findFirst({
      where: { isActive: true },
    });

    res.json({ success: true, data: rule });
  } catch (error) {
    console.error('查询生效规则错误:', error);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

router.post('/', authMiddleware, requireRoles(Role.FINANCE_REVIEWER, Role.SUPERVISOR), async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const data = subsidyRuleSchema.parse(req.body);

    if (data.isActive) {
      await prisma.subsidyRule.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const rule = await prisma.subsidyRule.create({ data });

    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('创建补贴规则错误:', error);
    res.status(500).json({ success: false, error: '创建失败' });
  }
});

router.put('/:id', authMiddleware, requireRoles(Role.FINANCE_REVIEWER, Role.SUPERVISOR), async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const data = subsidyRuleSchema.partial().parse(req.body);

    if (data.isActive) {
      await prisma.subsidyRule.updateMany({
        where: { isActive: true, id: { not: req.params.id } },
        data: { isActive: false },
      });
    }

    const rule = await prisma.subsidyRule.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: rule });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('更新补贴规则错误:', error);
    res.status(500).json({ success: false, error: '更新失败' });
  }
});

export default router;
