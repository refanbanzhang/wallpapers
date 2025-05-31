// 主路由文件
import express from 'express';
import imageRoutes from './imageRoutes.js';

const router = express.Router();

// 默认接口
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '服务器运行正常',
    version: '1.0.0'
  });
});

// 健康检查端点
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'UP',
    timestamp: new Date().toISOString()
  });
});

// 图片相关路由
router.use('/images', imageRoutes);

export default router;