// 文件上传中间件
import multer from 'multer';
import path from 'path';
import config from '../config/config.js';
import { generateSafeFilename } from '../utils/fileUtils.js';

// 设置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 只存储到原图目录，缩略图将在处理后生成
    cb(null, config.upload.originalDir);
  },
  filename: (req, file, cb) => {
    // 解决中文名乱码的问题
    file.originalname = Buffer.from(file.originalname, "latin1").toString("utf8");

    // 从请求中获取分类信息（如果有）
    const category = req.body && req.body.category ? req.body.category : '';

    // 生成新的安全文件名（包含分类信息）
    const filename = generateSafeFilename(file.originalname, category);
    cb(null, filename);
  },
});

// 文件过滤器 - 只允许上传图片
const fileFilter = (req, file, cb) => {
  // 检查文件类型
  const ext = path.extname(file.originalname).toLowerCase();
  if (config.allowedImageTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件'), false);
  }
};

// 创建上传中间件
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize * 1024 * 1024
  }
});

export default upload;