// 文件处理工具函数
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import config from '../config/config.js';

/**
 * 确保目录存在，如果不存在则创建
 * @param {Array<string>} directories 目录路径数组
 */
export const ensureDirectoriesExist = (directories) => {
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`创建目录: ${dir}`);
    }
  });
};

/**
 * 安全删除文件，处理文件名过长等特殊情况
 * @param {string} filePath 文件路径
 * @returns {boolean} 是否成功删除
 */
export const safeUnlink = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (err) {
    if (err.code === 'ENAMETOOLONG') {
      console.error(`文件名过长无法直接删除: ${filePath}`);
      // 对于文件名过长的情况，尝试扫描目录并通过部分匹配来删除
      const dirPath = path.dirname(filePath);
      const targetFileName = path.basename(filePath);
      try {
        const files = fs.readdirSync(dirPath);

        // 尝试通过时间戳匹配
        const timeStampMatch = targetFileName.match(/_([\d]+)_/);
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

/**
 * 生成安全的文件名
 * @param {string} originalName 原始文件名
 * @param {string} category 分类名称（可选）
 * @returns {string} 安全的文件名
 */
export const generateSafeFilename = (originalName, category = '') => {
  try {
    // 提取文件扩展名
    const extname = path.extname(originalName);

    // 生成安全的基本文件名
    const sanitizedBasename = path.basename(originalName, extname);

    // 生成UUID作为唯一标识符
    const uuid = uuidv4();

    // 生成时间戳
    const timestamp = Date.now();

    // 添加分类信息（如果有）
    const categoryPart = category ? `_cat_${category}` : '';

    // 判断文件名长度
    const fullFilename = `${sanitizedBasename}_${uuid}${categoryPart}_${timestamp}${extname}`;
    // 大多数文件系统的文件名长度限制
    const maxFilenameLength = 240;

    // 如果文件名超长，则使用哈希替代
    if (Buffer.from(fullFilename).length > maxFilenameLength) {
      // 使用原始文件名的哈希值 + UUID + 分类 + 时间戳作为文件名
      const hash = crypto.createHash('md5').update(sanitizedBasename).digest('hex').substring(0, 10);
      return `image_${hash}_${uuid}${categoryPart}_${timestamp}${extname}`;
    }

    return fullFilename;
  } catch (error) {
    console.error('文件名处理错误:', error);
    // 出现错误时使用备用文件名
    const uuid = uuidv4();
    const timestamp = Date.now();
    const extname = path.extname(originalName) || '.jpg';
    return `image_${uuid}_${timestamp}${extname}`;
  }
};

/**
 * 生成缩略图
 * @param {string} originalFilePath 原图路径
 * @param {string} thumbnailFilePath 缩略图保存路径
 * @param {Object} options 选项
 * @returns {Promise<boolean>} 是否成功
 */
export const generateThumbnail = async (
  originalFilePath,
  thumbnailFilePath,
  options = {}
) => {
  try {
    const width = options.width || config.thumbnail.width;
    const height = options.height || config.thumbnail.height;
    const quality = options.quality || config.thumbnail.quality;

    // 使用Sharp处理图片
    await sharp(originalFilePath)
      .resize({
        width,
        height,
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

/**
 * 从文件名中提取分类信息
 * @param {string} filename 文件名
 * @returns {string|null} 分类名称，如果没有则返回null
 */
export const extractCategoryFromFilename = (filename) => {
  if (!filename) return null;

  // 查找分类标记
  const categoryMatch = filename.match(/_cat_([^_]+)_/);
  if (categoryMatch && categoryMatch[1]) {
    return categoryMatch[1];
  }

  return null;
};

/**
 * 根据ID查找原图和缩略图文件
 * @param {string} id 文件ID (UUID)
 * @returns {Object} 包含原图和缩略图文件名的对象
 */
export const findImageFilesById = (id) => {
  // 查找包含UUID的文件
  const originalFile = fs.readdirSync(config.upload.originalDir)
    .filter(file => !file.startsWith('.'))
    .find(file => file.includes(id));

  const thumbnailFile = fs.readdirSync(config.upload.thumbnailsDir)
    .filter(file => !file.startsWith('.'))
    .find(file => file.includes(id));

  return { originalFile, thumbnailFile };
};

/**
 * 检查文件是否为允许的图片类型
 * @param {string} filename 文件名
 * @returns {boolean} 是否为允许的图片类型
 */
export const isAllowedImageType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  return config.allowedImageTypes.includes(ext);
};