import { Router, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { AuthRequest, ApiResponse } from '../types';
import { authMiddleware } from '../middleware/auth';

const router = Router();

const farmerSchema = z.object({
  idCard: z.string().min(15).max(18),
  name: z.string().min(1),
  phone: z.string().optional(),
  village: z.string().min(1),
  town: z.string().min(1),
  plotNumber: z.string().optional(),
  plotArea: z.number().min(0).optional(),
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { name, village, town } = req.query;

    const where: any = {};
    if (name) where.name = { contains: String(name) };
    if (village) where.village = { contains: String(village) };
    if (town) where.town = { contains: String(town) };

    const farmers = await prisma.farmer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: farmers });
  } catch (error) {
    console.error('查询农户错误:', error);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const farmer = await prisma.farmer.findUnique({
      where: { id: req.params.id },
      include: {
        batches: {
          include: { photos: true, reviews: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!farmer) {
      res.status(404).json({ success: false, error: '农户不存在' });
      return;
    }

    res.json({ success: true, data: farmer });
  } catch (error) {
    console.error('查询农户详情错误:', error);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const data = farmerSchema.parse(req.body);

    const existing = await prisma.farmer.findUnique({
      where: { idCard: data.idCard },
    });

    if (existing) {
      res.status(400).json({ success: false, error: '该身份证号已存在' });
      return;
    }

    const farmer = await prisma.farmer.create({ data });

    res.status(201).json({ success: true, data: farmer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('创建农户错误:', error);
    res.status(500).json({ success: false, error: '创建失败' });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const data = farmerSchema.partial().parse(req.body);

    const farmer = await prisma.farmer.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: farmer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('更新农户错误:', error);
    res.status(500).json({ success: false, error: '更新失败' });
  }
});

export default router;
