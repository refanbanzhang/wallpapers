import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';

// ES模块中获取__dirname的替代方法
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 常量设置 - 与前端保持一致
const MAX_FILE_SIZE = 20; // 单位MB

const app = express();
const port = 3000;

// 启用CORS
app.use(cors());
app.use(express.json());

// 创建上传目录
const uploadsDir = path.join(__dirname, '../uploads');
const originalDir = path.join(uploadsDir, 'origin');
const thumbnailsDir = path.join(uploadsDir, 'thumbnails');

// 确保上传目录存在
[uploadsDir, originalDir, thumbnailsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`创建目录: ${dir}`);
  }
});

// 处理可能出现的路径过长问题的辅助函数
const safeUnlink = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (err) {
    if (err.code === 'ENAMETOOLONG') {
      console.error(`文件名过长无法直接删除: ${filePath}`);
      // 对于文件名过长的情况，我们可以尝试扫描目录并通过部分匹配来删除
      const dirPath = path.dirname(filePath);
      const targetFileName = path.basename(filePath);
      try {
        const files = fs.readdirSync(dirPath);

        // 尝试多种方式匹配文件
        // 1. 首先尝试通过时间戳匹配
        const timeStampMatch = targetFileName.match(/_(\d+)_/);
        if (timeStampMatch && timeStampMatch[1]) {
          const timeStamp = timeStampMatch[1];
          const matchedFile = files.find(file => file.includes(timeStamp));
          if (matchedFile) {
            fs.unlinkSync(path.join(dirPath, matchedFile));
            console.log(`通过时间戳匹配并删除文件: ${matchedFile}`);
            return true;
          }
        }

        console.error(`无法找到匹配的文件`);
        return false;
      } catch (scanErr) {
        console.error('尝试扫描目录匹配文件时出错:', scanErr);
        return false;
      }
    }
    console.error('删除文件时出错:', err);
    return false;
  }
};

// 静态文件服务
app.use('/uploads', express.static(uploadsDir));

// 安全的文件名生成函数
const generateSafeFilename = (originalName) => {
  try {
    // 解码URL编码的文件名
    const decodedName = decodeURIComponent(originalName);

    // 提取文件扩展名
    const extname = path.extname(decodedName);

    // 生成安全的基本文件名（只保留字母、数字、下划线）
    const sanitizedBasename = path.basename(decodedName, extname)
      .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_'); // 保留中文字符

    // 不再限制文件名长度

    // 生成时间戳和随机字符串
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);

    // 判断文件名长度
    const fullFilename = `${sanitizedBasename}_${timestamp}_${randomString}${extname}`;
    const maxFilenameLength = 240; // 大多数文件系统的文件名长度限制

    // 如果文件名超长，则使用哈希替代
    if (Buffer.from(fullFilename).length > maxFilenameLength) {
      // 使用原始文件名的哈希值 + 时间戳 + 随机字符串作为文件名
      const hash = crypto.createHash('md5').update(sanitizedBasename).digest('hex').substring(0, 10);
      return `image_${hash}_${timestamp}_${randomString}${extname}`;
    }

    return fullFilename;
  } catch (error) {
    console.error('文件名处理错误:', error);
    // 出现错误时使用备用文件名
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extname = path.extname(originalName) || '.jpg';
    return `image_${timestamp}_${randomString}${extname}`;
  }
};

// 设置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 根据字段名确定保存目录
    const destDir = file.fieldname === 'original' ? originalDir : thumbnailsDir;
    cb(null, destDir);
  },
  filename: (req, file, cb) => {
    // 获取自定义文件名基础（如果存在）
    const filenameBase = req.filenameBase;

    if (filenameBase) {
      // 使用相同的文件名基础，确保原图和缩略图使用相同的时间戳和随机字符串
      const extname = path.extname(file.originalname);
      const sanitizedBasename = path.basename(file.originalname, extname)
        .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');

      // 创建完整文件名
      const fullFilename = `${sanitizedBasename}_${filenameBase}${extname}`;
      const maxFilenameLength = 240; // 大多数文件系统的文件名长度限制

      // 如果文件名超长，使用哈希替代
      if (Buffer.from(fullFilename).length > maxFilenameLength) {
        const hash = crypto.createHash('md5').update(sanitizedBasename).digest('hex').substring(0, 10);
        cb(null, `image_${hash}_${filenameBase}${extname}`);
      } else {
        cb(null, fullFilename);
      }
    } else {
      // 生成新的安全文件名
      const filename = generateSafeFilename(file.originalname);
      cb(null, filename);
    }
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE * 1024 * 1024 } // 限制使用常量定义
});

// 生成文件名基础的中间件
const generateFilenameBase = (req, res, next) => {
  // 生成时间戳和随机字符串作为文件名基础
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  req.filenameBase = `${timestamp}_${randomString}`;
  next();
};

// 处理图片上传
app.post('/api/upload', generateFilenameBase, upload.fields([
  { name: 'original', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), (req, res) => {
  try {
    if (!req.files || !req.files.original || !req.files.thumbnail) {
      return res.status(400).json({ error: '未接收到文件' });
    }

    const originalFile = req.files.original[0];
    const thumbnailFile = req.files.thumbnail[0];

    // 从req.body中获取原始文件名
    const displayFileName = req.body.fileName || '未命名图片';

    // 返回文件访问路径
    res.json({
      success: true,
      data: {
        originalUrl: `/uploads/origin/${originalFile.filename}`,
        thumbnailUrl: `/uploads/thumbnails/${thumbnailFile.filename}`,
        fileName: displayFileName,
        fileSize: originalFile.size
      }
    });
  } catch (error) {
    console.error('上传处理错误:', error);
    res.status(500).json({ error: '文件上传失败', message: error.message });
  }
});

// 获取已上传图片列表
app.get('/api/images', (req, res) => {
  try {
    const images = [];

    // 读取原图目录
    const originalFiles = fs.readdirSync(originalDir)
      .filter(filename => {
        // 过滤掉以.开头的隐藏文件和系统文件
        return !filename.startsWith('.') &&
          // 确保是图片文件
          /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
      });

    // 为每个原图查找对应的缩略图
    originalFiles.forEach(filename => {
      try {
        const fileStats = fs.statSync(path.join(originalDir, filename));

        // 提取文件名
        const filenameParts = filename.split('_');
        // 只获取第一部分作为显示名称
        const displayName = filenameParts[0] + path.extname(filename);

        // 文件ID是文件名去掉扩展名
        const fileId = path.basename(filename, path.extname(filename));

        // 提取时间戳部分（现在应该是第二个部分）
        const timeStampPart = filenameParts.length >= 2 ? filenameParts[1] : '';
        // 提取随机字符串部分（现在应该是第三个部分）
        const randomPart = filenameParts.length >= 3 ? filenameParts[2].split('.')[0] : '';

        // 查找匹配的缩略图：使用更宽松的匹配逻辑
        const thumbnailFile = fs.readdirSync(thumbnailsDir)
          .filter(file => !file.startsWith('.'))  // 同样过滤掉隐藏文件
          .find(file => {
            // 如果时间戳相同，认为是同一组文件
            return file.includes(timeStampPart) && (randomPart ? file.includes(randomPart) : true);
          });

        if (thumbnailFile) {
          images.push({
            id: fileId,
            fileName: displayName,
            originalUrl: `/uploads/origin/${filename}`,
            thumbnailUrl: `/uploads/thumbnails/${thumbnailFile}`,
            fileSize: fileStats.size,
            uploadTime: new Date(fileStats.mtime).toLocaleString()
          });
        }
      } catch (err) {
        console.error(`处理图片 ${filename} 时出错:`, err);
        // 跳过错误的图片，继续处理其他图片
      }
    });

    res.json({
      success: true,
      data: images
    });
  } catch (error) {
    console.error('获取图片列表失败:', error);
    res.status(500).json({ error: '获取图片列表失败', message: error.message });
  }
});

// 删除图片
app.delete('/api/images/:id', (req, res) => {
  try {
    const { id } = req.params;

    // 从ID中提取时间戳部分（应该包含在id中）
    const idParts = id.split('_');
    const timeStampPart = idParts.length >= 2 ? idParts[1] : '';

    // 使用更宽松的匹配逻辑查找匹配的文件，同时过滤掉隐藏文件
    const originalFile = fs.readdirSync(originalDir)
      .filter(file => !file.startsWith('.'))
      .find(file => file.includes(timeStampPart));

    const thumbnailFile = fs.readdirSync(thumbnailsDir)
      .filter(file => !file.startsWith('.'))
      .find(file => file.includes(timeStampPart));

    // 删除文件
    let originalDeleted = false;
    let thumbnailDeleted = false;

    if (originalFile) {
      originalDeleted = safeUnlink(path.join(originalDir, originalFile));
    } else {
      console.log(`未找到原图文件: ${id}`);
    }

    if (thumbnailFile) {
      thumbnailDeleted = safeUnlink(path.join(thumbnailsDir, thumbnailFile));
    } else {
      console.log(`未找到缩略图文件: ${id}`);
    }

    res.json({
      success: true,
      message: '删除成功',
      details: {
        originalDeleted,
        thumbnailDeleted
      }
    });
  } catch (error) {
    console.error('删除图片失败:', error);
    res.status(500).json({ error: '删除图片失败', message: error.message });
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`服务器运行在 http://localhost:${port}`);
  console.log(`上传目录: ${uploadsDir}`);
  console.log(`文件大小限制: ${MAX_FILE_SIZE}MB`);
}); 