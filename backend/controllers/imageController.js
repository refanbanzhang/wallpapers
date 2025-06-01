// 图片控制器
import fs from 'fs';
import path from 'path';
import config from '../config/config.js';
import { generateThumbnail, safeUnlink, findImageFilesById, extractCategoryFromFilename } from '../utils/fileUtils.js';

// 存储图片分类的映射
const imageCategoryMap = new Map();

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
    const { search } = req.query;
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

        // 提取UUID作为文件ID（现在应该是第二个部分）
        const fileId = filenameParts.length >= 2 ? filenameParts[1] : '';

        // 查找匹配的缩略图：使用完全相同的文件名匹配
        // 这样可以确保缩略图和原图是完全对应的
        const thumbnailFile = fs.existsSync(path.join(config.upload.thumbnailsDir, filename)) ? filename : null;

        if (thumbnailFile) {
          // 从文件名中提取分类信息
          const category = extractCategoryFromFilename(filename);

          // 如果有搜索关键词，则过滤文件名
          if (search && !displayName.toLowerCase().includes(search.toLowerCase())) {
            return; // 跳过不匹配的文件
          }

          images.push({
            id: fileId,
            fileName: displayName,
            originalUrl: `/upload/origin/${filename}`,
            thumbnailUrl: `/upload/thumbnails/${thumbnailFile}`,
            fileSize: fileStats.size,
            uploadTime: new Date(fileStats.mtime).toLocaleString(),
            category: category
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
    res.status(500).json({ success: false, error: '获取图片列表失败' });
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

/**
 * 更新图片分类
 */
export const updateImageCategory = (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: '请提供有效的图片ID' });
    }

    if (!category) {
      return res.status(400).json({ success: false, error: '请提供有效的分类' });
    }

    // 检查图片是否存在
    const { originalFile, thumbnailFile } = findImageFilesById(id);

    if (!originalFile) {
      return res.status(404).json({ success: false, error: '图片不存在' });
    }

    // 提取文件名部分
    const originalFilePath = path.join(config.upload.originalDir, originalFile);
    const fileExt = path.extname(originalFile);
    const fileBaseName = path.basename(originalFile, fileExt);

    // 从文件名中提取各个部分
    const parts = fileBaseName.split('_');
    const displayName = parts[0];
    const uuid = parts[1];

    // 查找时间戳部分（通常是最后一个部分）
    let timestamp = parts[parts.length - 1];

    // 创建新的文件名（包含分类信息）
    const newFileName = `${displayName}_${uuid}_cat_${category}_${timestamp}${fileExt}`;
    const newOriginalFilePath = path.join(config.upload.originalDir, newFileName);

    // 重命名原图文件
    fs.renameSync(originalFilePath, newOriginalFilePath);

    // 如果存在缩略图，也需要重命名
    if (thumbnailFile) {
      const thumbnailFilePath = path.join(config.upload.thumbnailsDir, thumbnailFile);
      const newThumbnailFilePath = path.join(config.upload.thumbnailsDir, newFileName);
      fs.renameSync(thumbnailFilePath, newThumbnailFilePath);
    }

    // 更新分类映射（保留内存中的映射，以便兼容旧代码）
    imageCategoryMap.set(id, category);

    res.json({
      success: true,
      message: '分类更新成功',
      data: {
        id,
        category,
        originalUrl: `/upload/origin/${newFileName}`,
        thumbnailUrl: `/upload/thumbnails/${newFileName}`
      }
    });
  } catch (error) {
    console.error('更新图片分类失败:', error);
    res.status(500).json({ success: false, error: '更新图片分类失败', message: error.message });
  }
};