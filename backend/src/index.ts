import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import farmerRoutes from './routes/farmers';
import batchRoutes from './routes/batches';
import reviewRoutes from './routes/reviews';
import paymentRoutes from './routes/payments';
import supervisorRoutes from './routes/supervisor';
import subsidyRuleRoutes from './routes/subsidyRules';
import receiptRoutes from './routes/receipts';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/farmers', farmerRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/subsidy-rules', subsidyRuleRoutes);
app.use('/api/receipts', receiptRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: err.message || '服务器内部错误',
  });
});

app.listen(PORT, () => {
  console.log(`🚀 农膜回收补贴审核系统后端已启动`);
  console.log(`📍 服务地址: http://localhost:${PORT}`);
  console.log(`🔍 健康检查: http://localhost:${PORT}/api/health`);
});

export default app;
