import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { AuthRequest, ApiResponse, LoginRequest } from '../types';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

router.post('/login', async (req, res: Response<ApiResponse>) => {
  try {
    const { username, password }: LoginRequest = req.body;

    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码不能为空' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      res.status(401).json({ success: false, error: '用户名或密码错误' });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      res.status(401).json({ success: false, error: '用户名或密码错误' });
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ success: false, error: '登录失败' });
  }
});

router.get('/me', authMiddleware, (req: AuthRequest, res: Response<ApiResponse>) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: '未认证' });
    return;
  }

  res.json({
    success: true,
    data: req.user,
  });
});

export default router;
