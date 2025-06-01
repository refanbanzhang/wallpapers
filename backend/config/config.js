// 配置文件
import path from 'path';
import { fileURLToPath } from 'url';

// ES模块中获取__dirname的替代方法
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.join(__dirname, '..');

// 常量设置 - 与前端保持一致
const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },

  // 文件上传配置
  upload: {
    // 单位MB
    maxFileSize: 20,
    // 上传目录
    uploadsDir: path.join(ROOT_DIR, 'upload'),
    originalDir: path.join(ROOT_DIR, 'upload/origin'),
    thumbnailsDir: path.join(ROOT_DIR, 'upload/thumbnails')
  },

  // 缩略图配置
  thumbnail: {
    width: 200,
    height: 200,
    // Sharp使用1-100的质量范围
    quality: 70
  },

  // 允许的图片类型
  allowedImageTypes: [
    '.jpg', '.jpeg', '.png', '.gif', '.webp'
  ]
};

export default config;