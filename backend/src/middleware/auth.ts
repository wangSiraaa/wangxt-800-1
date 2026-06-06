import jwt from 'jsonwebtoken';
import { Response, NextFunction } from 'express';
import { AuthRequest, JwtPayload } from '../types';
import prisma from '../lib/prisma';
import type { Role } from '../constants/enums';
import { Role as RoleConst } from '../constants/enums';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ success: false, error: '未提供认证令牌' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      res.status(401).json({ success: false, error: '用户不存在' });
      return;
    }

    req.user = {
      userId: user.id,
      username: user.username,
      role: user.role as Role,
      name: user.name,
    };

    next();
  } catch (error) {
    res.status(401).json({ success: false, error: '认证失败' });
  }
};

export const requireRoles = (...roles: Role[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: '未认证' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: '权限不足' });
      return;
    }

    next();
  };
};
