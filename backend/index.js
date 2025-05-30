import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import sharp from 'sharp';

// ES模块中获取__dirname的替代方法
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 常量设置 - 与前端保持一致
// 单位MB
const MAX_FILE_SIZE = 20;
const DEFAULT_THUMBNAIL_WIDTH = 200;
const DEFAULT_THUMBNAIL_HEIGHT = 200;
// Sharp使用1-100的质量范围，而不是0-1
const DEFAULT_THUMBNAIL_QUALITY = 70;

const app = express();
const port = 3000;

// 启用CORS
app.use(cors());
app.use(express.json());

// 创建上传目录
const UPLOADS_DIR = path.join(__dirname, './upload');
const ORIGINAL_DIR = path.join(UPLOADS_DIR, 'origin');
const THUMBNAILS_DIR = path.join(UPLOADS_DIR, 'thumbnails');

// 确保上传目录存在
[UPLOADS_DIR, ORIGINAL_DIR, THUMBNAILS_DIR].forEach(dir => {
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
app.use('/upload', express.static(UPLOADS_DIR));

// 安全的文件名生成函数
const generateSafeFilename = (originalName) => {
  try {

    // 提取文件扩展名
    const extname = path.extname(originalName);

    // 生成安全的基本文件名（只保留字母、数字、下划线）
    const sanitizedBasename = path.basename(originalName, extname)

    // 不再限制文件名长度

    // 生成时间戳和随机字符串
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);

    // 判断文件名长度
    const fullFilename = `${sanitizedBasename}_${timestamp}_${randomString}${extname}`;
    // 大多数文件系统的文件名长度限制
    const maxFilenameLength = 240;

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

/**
 * 生成缩略图
 * @param {string} originalFilePath 原图路径
 * @param {string} thumbnailFilePath 缩略图保存路径
 * @param {number} quality 图片质量(1-100)
 * @returns {Promise<boolean>} 是否成功
 */
const generateThumbnail = async (
  originalFilePath,
  thumbnailFilePath,
  quality = DEFAULT_THUMBNAIL_QUALITY
) => {
  try {
    // 使用Sharp处理图片
    await sharp(originalFilePath)
      .resize({
        width: DEFAULT_THUMBNAIL_WIDTH,
        height: DEFAULT_THUMBNAIL_HEIGHT,
        fit: 'inside', // 保持原始图片比例
        withoutEnlargement: true // 如果图片尺寸小于指定的尺寸，则不放大
      })
      .jpeg({ quality }) // 设置JPEG质量
      .toFile(thumbnailFilePath);

    console.log(`成功生成缩略图: ${thumbnailFilePath}`);
    return true;
  } catch (error) {
    console.error('生成缩略图失败:', error);
    return false;
  }
};

// 设置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 只存储到原图目录，缩略图将在处理后生成
    cb(null, ORIGINAL_DIR);
  },
  filename: (req, file, cb) => {
    // 解决中文名乱码的问题
    file.originalname = Buffer.from(file.originalname, "latin1").toString("utf8");
    // 生成新的安全文件名
    const filename = generateSafeFilename(file.originalname);
    cb(null, filename);
  },

});

const upload = multer({
  storage,
  // 限制使用常量定义
  limits: { fileSize: MAX_FILE_SIZE * 1024 * 1024 }
});

// 默认接口
app.get('/', (req, res) => {
  res.json({
    message: '服务器运行正常',
  });
});

// 处理图片上传
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未接收到文件' });
    }

    const originalFile = req.file;
    const fileSize = originalFile.size;
    const filename = originalFile.filename;
    const originalFilePath = path.join(ORIGINAL_DIR, filename);
    const thumbnailFilePath = path.join(THUMBNAILS_DIR, filename);

    await generateThumbnail(
      originalFilePath,
      thumbnailFilePath,
    );

    // 返回文件访问路径
    res.json({
      success: true,
      data: {
        originalUrl: `/upload/origin/${filename}`,
        thumbnailUrl: `/upload/thumbnails/${filename}`,
        fileSize: fileSize,
        fileName: filename
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
    const originalFiles = fs.readdirSync(ORIGINAL_DIR)
      .filter(filename => {
        // 过滤掉以.开头的隐藏文件和系统文件
        return !filename.startsWith('.') &&
          // 确保是图片文件
          /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
      });

    // 为每个原图查找对应的缩略图
    originalFiles.forEach(filename => {
      try {
        const fileStats = fs.statSync(path.join(ORIGINAL_DIR, filename));

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
        const thumbnailFile = fs.readdirSync(THUMBNAILS_DIR)
          .filter(file => !file.startsWith('.'))  // 同样过滤掉隐藏文件
          .find(file => {
            // 如果时间戳相同，认为是同一组文件
            return file.includes(timeStampPart) && (randomPart ? file.includes(randomPart) : true);
          });

        if (thumbnailFile) {
          images.push({
            id: fileId,
            fileName: displayName,
            originalUrl: `/upload/origin/${filename}`,
            thumbnailUrl: `/upload/thumbnails/${thumbnailFile}`,
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

// 批量删除图片
app.delete('/api/images/batch-delete', (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: '请提供有效的图片ID列表' });
    }

    const results = [];

    // 处理每个图片ID
    for (const id of ids) {
      // 从ID中提取时间戳部分
      const idParts = id.split('_');
      const timeStampPart = idParts.length >= 2 ? idParts[1] : '';

      // 查找匹配的文件
      const originalFile = fs.readdirSync(ORIGINAL_DIR)
        .filter(file => !file.startsWith('.'))
        .find(file => file.includes(timeStampPart));

      const thumbnailFile = fs.readdirSync(THUMBNAILS_DIR)
        .filter(file => !file.startsWith('.'))
        .find(file => file.includes(timeStampPart));

      // 删除文件
      let originalDeleted = false;
      let thumbnailDeleted = false;

      if (originalFile) {
        originalDeleted = safeUnlink(path.join(ORIGINAL_DIR, originalFile));
      } else {
        console.log(`未找到原图文件: ${id}`);
      }

      if (thumbnailFile) {
        thumbnailDeleted = safeUnlink(path.join(THUMBNAILS_DIR, thumbnailFile));
      } else {
        console.log(`未找到缩略图文件: ${id}`);
      }

      results.push({
        id,
        originalDeleted,
        thumbnailDeleted
      });
    }

    res.json({
      success: true,
      message: `成功删除 ${results.filter(r => r.originalDeleted || r.thumbnailDeleted).length} 张图片`,
      details: results
    });
  } catch (error) {
    console.error('批量删除图片失败:', error);
    res.status(500).json({ error: '批量删除图片失败', message: error.message });
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
    const originalFile = fs.readdirSync(ORIGINAL_DIR)
      .filter(file => !file.startsWith('.'))
      .find(file => file.includes(timeStampPart));

    const thumbnailFile = fs.readdirSync(THUMBNAILS_DIR)
      .filter(file => !file.startsWith('.'))
      .find(file => file.includes(timeStampPart));

    // 删除文件
    let originalDeleted = false;
    let thumbnailDeleted = false;

    if (originalFile) {
      originalDeleted = safeUnlink(path.join(ORIGINAL_DIR, originalFile));
    } else {
      console.log(`未找到原图文件: ${id}`);
    }

    if (thumbnailFile) {
      thumbnailDeleted = safeUnlink(path.join(THUMBNAILS_DIR, thumbnailFile));
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
  console.log(`上传目录: ${UPLOADS_DIR}`);
  console.log(`文件大小限制: ${MAX_FILE_SIZE}MB`);
});