import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// ES模块中获取__dirname的替代方法
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    
    // 生成时间戳和随机字符串
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    
    // 组合安全的文件名
    return `${sanitizedBasename}_${timestamp}_${randomString}${extname}`;
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
    // 生成安全文件名
    const filename = generateSafeFilename(file.originalname);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 限制10MB
});

// 处理图片上传
app.post('/api/upload', upload.fields([
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
    const originalFiles = fs.readdirSync(originalDir);
    
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
        
        // 查找匹配的缩略图：基于时间戳和随机字符串匹配
        const thumbnailFile = fs.readdirSync(thumbnailsDir)
          .find(file => {
            const thumbParts = file.split('_');
            const fileParts = filename.split('_');
            // 匹配时间戳和随机字符串部分
            return thumbParts.length >= 3 && 
                   fileParts.length >= 3 && 
                   thumbParts[1] === fileParts[1] && 
                   thumbParts[2].startsWith(fileParts[2].split('.')[0]);
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
    
    // 查找匹配的文件
    const originalFile = fs.readdirSync(originalDir)
      .find(file => file.startsWith(id.split('_')[0]) && file.includes(id.split('_')[1]));
    
    const thumbnailFile = fs.readdirSync(thumbnailsDir)
      .find(file => file.startsWith(id.split('_')[0]) && file.includes(id.split('_')[1]));
    
    // 删除文件
    if (originalFile) {
      fs.unlinkSync(path.join(originalDir, originalFile));
    }
    
    if (thumbnailFile) {
      fs.unlinkSync(path.join(thumbnailsDir, thumbnailFile));
    }
    
    res.json({
      success: true,
      message: '删除成功'
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
}); 