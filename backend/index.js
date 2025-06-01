// 主入口文件
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// 导入自定义模块
import config from './config/config.js';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler, multerErrorHandler } from './middlewares/errorMiddleware.js';
import { ensureDirectoriesExist } from './utils/fileUtils.js';

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();
const port = process.env.PORT || 3000;

// 安全增强
app.use(helmet());

// 速率限制
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP在windowMs内最多100个请求
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: '请求过于频繁，请稍后再试'
  }
});

// 应用中间件
app.use(cors());
app.use(express.json());
app.use('/api', apiLimiter);

// 确保上传目录存在
ensureDirectoriesExist([
  config.upload.uploadsDir,
  config.upload.originalDir,
  config.upload.thumbnailsDir
]);

// 静态文件服务
app.use('/upload', express.static(config.upload.uploadsDir));

// 应用路由
app.use('/api', routes);

// 错误处理中间件
app.use(multerErrorHandler);
app.use(notFoundHandler);
app.use(errorHandler);

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
  console.log(`上传目录: ${config.upload.uploadsDir}`);
  console.log(`文件大小限制: ${config.upload.maxFileSize}MB`);
});