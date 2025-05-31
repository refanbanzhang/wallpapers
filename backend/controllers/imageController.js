// 图片控制器
import fs from 'fs';
import path from 'path';
import config from '../config/config.js';
import { generateThumbnail, safeUnlink, findImageFilesById } from '../utils/fileUtils.js';

/**
 * 上传图片
 */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未接收到文件' });
    }

    const originalFile = req.file;
    const fileSize = originalFile.size;
    const filename = originalFile.filename;
    const originalFilePath = path.join(config.upload.originalDir, filename);
    const thumbnailFilePath = path.join(config.upload.thumbnailsDir, filename);

    // 生成缩略图
    await generateThumbnail(originalFilePath, thumbnailFilePath);

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
    res.status(500).json({ success: false, error: '文件上传失败', message: error.message });
  }
};

/**
 * 获取所有图片
 */
export const getAllImages = (req, res) => {
  try {
    const images = [];

    // 读取原图目录
    const originalFiles = fs.readdirSync(config.upload.originalDir)
      .filter(filename => {
        // 过滤掉以.开头的隐藏文件和系统文件
        return !filename.startsWith('.') &&
          // 确保是图片文件
          /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);
      });

    // 为每个原图查找对应的缩略图
    originalFiles.forEach(filename => {
      try {
        const fileStats = fs.statSync(path.join(config.upload.originalDir, filename));

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
        const thumbnailFile = fs.readdirSync(config.upload.thumbnailsDir)
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
    res.status(500).json({ success: false, error: '获取图片列表失败', message: error.message });
  }
};

/**
 * 删除单张图片
 */
export const deleteImage = (req, res) => {
  try {
    const { id } = req.params;
    const { originalFile, thumbnailFile } = findImageFilesById(id);

    // 删除文件
    let originalDeleted = false;
    let thumbnailDeleted = false;

    if (originalFile) {
      originalDeleted = safeUnlink(path.join(config.upload.originalDir, originalFile));
    } else {
      console.log(`未找到原图文件: ${id}`);
    }

    if (thumbnailFile) {
      thumbnailDeleted = safeUnlink(path.join(config.upload.thumbnailsDir, thumbnailFile));
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
    res.status(500).json({ success: false, error: '删除图片失败', message: error.message });
  }
};

/**
 * 批量删除图片
 */
export const batchDeleteImages = (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '请提供有效的图片ID列表' });
    }

    const results = [];
    const deletePromises = ids.map(id => {
      return new Promise(resolve => {
        try {
          const { originalFile, thumbnailFile } = findImageFilesById(id);
          
          // 删除文件
          let originalDeleted = false;
          let thumbnailDeleted = false;

          if (originalFile) {
            originalDeleted = safeUnlink(path.join(config.upload.originalDir, originalFile));
          }

          if (thumbnailFile) {
            thumbnailDeleted = safeUnlink(path.join(config.upload.thumbnailsDir, thumbnailFile));
          }

          results.push({
            id,
            originalDeleted,
            thumbnailDeleted
          });
          resolve();
        } catch (err) {
          console.error(`删除图片 ${id} 时出错:`, err);
          results.push({
            id,
            originalDeleted: false,
            thumbnailDeleted: false,
            error: err.message
          });
          resolve();
        }
      });
    });

    // 并行处理所有删除操作
    Promise.all(deletePromises).then(() => {
      res.json({
        success: true,
        message: `成功删除 ${results.filter(r => r.originalDeleted || r.thumbnailDeleted).length} 张图片`,
        details: results
      });
    });
  } catch (error) {
    console.error('批量删除图片失败:', error);
    res.status(500).json({ success: false, error: '批量删除图片失败', message: error.message });
  }
};