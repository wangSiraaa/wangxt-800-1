import { Router, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import prisma from '../lib/prisma';
import { AuthRequest, ApiResponse } from '../types';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { Role, BatchStatus, ReviewType } from '../constants/enums';
import {
  BusinessRuleError,
  checkPhotoRequired,
  checkDuplicateSubmission,
  checkWeightAnomaly,
  calculateSubsidy,
} from '../services/businessRules';

const router = Router();

const uploadDir = path.join(__dirname, '../../uploads');
fs.ensureDirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片格式'));
    }
  },
});

const createBatchSchema = z.object({
  farmerId: z.string().min(1),
  weight: z.number().min(0.1),
  plotNumber: z.string().min(1),
  collectionDate: z.string(),
});

const submitBatchSchema = z.object({
  batchId: z.string().min(1),
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { status, farmerId, startDate, endDate, isAnomaly } = req.query;

    const where: any = {};
    if (status) where.status = status as BatchStatus;
    if (farmerId) where.farmerId = String(farmerId);
    if (startDate) where.collectionDate = { ...where.collectionDate, gte: new Date(String(startDate)) };
    if (endDate) where.collectionDate = { ...where.collectionDate, lte: new Date(String(endDate)) };
    if (isAnomaly !== undefined) where.isAnomaly = isAnomaly === 'true';

    if (req.user?.role === Role.RECYCLER) {
      where.submitterId = req.user.userId;
    }

    const batches = await prisma.batch.findMany({
      where,
      include: {
        farmer: true,
        submitter: { select: { id: true, name: true, username: true } },
        photos: true,
        reviews: {
          include: { reviewer: { select: { id: true, name: true } } },
          orderBy: { reviewedAt: 'desc' },
        },
        payments: true,
        _count: { select: { photos: true, reviews: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: batches });
  } catch (error) {
    console.error('查询批次错误:', error);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
      include: {
        farmer: true,
        submitter: { select: { id: true, name: true, username: true } },
        photos: true,
        reviews: {
          include: { reviewer: { select: { id: true, name: true } } },
          orderBy: { reviewedAt: 'desc' },
        },
        payments: {
          include: { payer: { select: { id: true, name: true } } },
        },
        corrections: {
          include: { corrector: { select: { id: true, name: true } } },
        },
      },
    });

    if (!batch) {
      res.status(404).json({ success: false, error: '批次不存在' });
      return;
    }

    res.json({ success: true, data: batch });
  } catch (error) {
    console.error('查询批次详情错误:', error);
    res.status(500).json({ success: false, error: '查询失败' });
  }
});

router.post('/', authMiddleware, requireRoles(Role.RECYCLER), async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const data = createBatchSchema.parse(req.body);

    if (!req.user) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    const collectionDate = new Date(data.collectionDate);
    const subsidyAmount = await calculateSubsidy(data.weight);

    const batchNo = `BATCH-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const batch = await prisma.batch.create({
      data: {
        batchNo,
        farmerId: data.farmerId,
        weight: data.weight,
        plotNumber: data.plotNumber,
        submitterId: req.user.userId,
        status: BatchStatus.DRAFT,
        subsidyAmount,
        collectionDate,
      },
      include: { farmer: true },
    });

    res.status(201).json({ success: true, data: batch });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('创建批次错误:', error);
    res.status(500).json({ success: false, error: '创建失败' });
  }
});

router.post('/:id/photos', authMiddleware, requireRoles(Role.RECYCLER), upload.array('photos', 5), async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const batchId = req.params.id;

    const batch = await prisma.batch.findUnique({ where: { id: batchId } });
    if (!batch) {
      res.status(404).json({ success: false, error: '批次不存在' });
      return;
    }

    if (batch.status !== BatchStatus.DRAFT) {
      res.status(400).json({ success: false, error: '只能为草稿状态的批次上传照片' });
      return;
    }

    const files = req.files as Express.Multer.File[];
    const photos = [];

    for (const file of files) {
      const photo = await prisma.photo.create({
        data: {
          batchId,
          filename: file.originalname,
          filePath: file.path,
          fileSize: file.size,
          mimeType: file.mimetype,
        },
      });
      photos.push(photo);
    }

    if (photos.length > 0) {
      await prisma.batch.update({
        where: { id: batchId },
        data: { hasPhoto: true },
      });
    }

    res.json({ success: true, data: photos });
  } catch (error) {
    console.error('上传照片错误:', error);
    res.status(500).json({ success: false, error: '上传失败' });
  }
});

router.post('/submit', authMiddleware, requireRoles(Role.RECYCLER), async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const { batchId } = submitBatchSchema.parse(req.body);

    const batch = await prisma.batch.findUnique({
      where: { id: batchId },
      include: { photos: true },
    });

    if (!batch) {
      res.status(404).json({ success: false, error: '批次不存在' });
      return;
    }

    if (batch.status !== BatchStatus.DRAFT) {
      res.status(400).json({ success: false, error: '只能提交草稿状态的批次' });
      return;
    }

    await checkPhotoRequired(batchId);
    await checkDuplicateSubmission(batch.farmerId, batch.plotNumber, batch.collectionDate, batchId);

    const anomalyCheck = await checkWeightAnomaly(batchId);
    
    const updatedBatch = await prisma.batch.update({
      where: { id: batchId },
      data: {
        status: anomalyCheck.isAnomaly ? BatchStatus.SECOND_REVIEW : BatchStatus.SUBMITTED,
        isAnomaly: anomalyCheck.isAnomaly,
        anomalyReason: anomalyCheck.reason,
      },
      include: { farmer: true, photos: true },
    });

    res.json({
      success: true,
      data: {
        batch: updatedBatch,
        anomalyCheck,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    if (error instanceof BusinessRuleError) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    console.error('提交批次错误:', error);
    res.status(500).json({ success: false, error: '提交失败' });
  }
});

router.put('/:id', authMiddleware, requireRoles(Role.RECYCLER), async (req: AuthRequest, res: Response<ApiResponse>) => {
  try {
    const data = createBatchSchema.partial().parse(req.body);

    const batch = await prisma.batch.findUnique({
      where: { id: req.params.id },
    });

    if (!batch) {
      res.status(404).json({ success: false, error: '批次不存在' });
      return;
    }

    if (batch.status !== BatchStatus.DRAFT) {
      res.status(400).json({ success: false, error: '只能编辑草稿状态的批次' });
      return;
    }

    const updateData: any = {};
    if (data.weight !== undefined) {
      updateData.weight = data.weight;
      updateData.subsidyAmount = await calculateSubsidy(data.weight);
    }
    if (data.plotNumber) updateData.plotNumber = data.plotNumber;
    if (data.farmerId) updateData.farmerId = data.farmerId;
    if (data.collectionDate) updateData.collectionDate = new Date(data.collectionDate);

    const updatedBatch = await prisma.batch.update({
      where: { id: req.params.id },
      data: updateData,
      include: { farmer: true },
    });

    res.json({ success: true, data: updatedBatch });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('更新批次错误:', error);
    res.status(500).json({ success: false, error: '更新失败' });
  }
});

export default router;
