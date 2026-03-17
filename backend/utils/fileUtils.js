// 文件处理工具函数
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';
import config from '../config/config.js';

const FILENAME_PATTERN = /^(?<baseName>.+)_(?<id>[0-9a-fA-F-]{36})(?:_cat_(?<category>[^_]+))?_(?<timestamp>\d+)(?<ext>\.[^.]+)$/;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 确保目录存在，如果不存在则创建
 * @param {Array<string>} directories 目录路径数组
 */
export const ensureDirectoriesExist = (directories) => {
  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`创建目录: ${dir}`);
    }
  });
};

/**
 * 解析系统生成的图片文件名
 * @param {string} filename 文件名
 * @returns {{baseName: string, id: string, category: string|null, timestamp: string, ext: string}|null}
 */
export const parseGeneratedFilename = (filename) => {
  if (!filename) {
    return null;
  }

  const matched = filename.match(FILENAME_PATTERN);
  if (!matched?.groups) {
    return null;
  }

  return {
    baseName: matched.groups.baseName,
    id: matched.groups.id,
    category: matched.groups.category || null,
    timestamp: matched.groups.timestamp,
    ext: matched.groups.ext,
  };
};

/**
 * 安全删除文件，处理文件名过长等特殊情况
 * @param {string} filePath 文件路径
 * @returns {Promise<boolean>} 是否成功删除
 */
export const safeUnlink = async (filePath) => {
  try {
    await fsPromises.access(filePath, fs.constants.F_OK);
    await fsPromises.unlink(filePath);
    return true;
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    }

    if (err.code === 'ENAMETOOLONG') {
      console.error(`文件名过长无法直接删除: ${filePath}`);
      const dirPath = path.dirname(filePath);
      const targetFileName = path.basename(filePath);

      try {
        const files = await fsPromises.readdir(dirPath);
        const timestampMatch = targetFileName.match(/_(\d+)\.[^.]+$/);

        if (timestampMatch?.[1]) {
          const timestamp = timestampMatch[1];
          const matchedFile = files.find((file) => file.includes(timestamp));

          if (matchedFile) {
            await fsPromises.unlink(path.join(dirPath, matchedFile));
            console.log(`通过时间戳匹配并删除文件: ${matchedFile}`);
            return true;
          }
        }

        console.error('无法找到匹配的文件');
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
    const extname = path.extname(originalName);
    const sanitizedBasename = path.basename(originalName, extname);
    const uuid = uuidv4();
    const timestamp = Date.now();
    const categoryPart = category ? `_cat_${category}` : '';

    const fullFilename = `${sanitizedBasename}_${uuid}${categoryPart}_${timestamp}${extname}`;
    const maxFilenameLength = 240;

    if (Buffer.from(fullFilename).length > maxFilenameLength) {
      const hash = crypto.createHash('md5').update(sanitizedBasename).digest('hex').substring(0, 10);
      return `image_${hash}_${uuid}${categoryPart}_${timestamp}${extname}`;
    }

    return fullFilename;
  } catch (error) {
    console.error('文件名处理错误:', error);
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
export const generateThumbnail = async (originalFilePath, thumbnailFilePath, options = {}) => {
  try {
    const width = options.width || config.thumbnail.width;
    const height = options.height || config.thumbnail.height;
    const quality = options.quality || config.thumbnail.quality;
    const ext = path.extname(thumbnailFilePath).toLowerCase();

    let transformer = sharp(originalFilePath).resize({
      width,
      height,
      fit: 'inside',
      withoutEnlargement: true,
    });

    if (ext === '.jpg' || ext === '.jpeg') {
      transformer = transformer.jpeg({ quality });
    } else if (ext === '.png') {
      transformer = transformer.png({ quality });
    } else if (ext === '.webp') {
      transformer = transformer.webp({ quality });
    } else if (ext === '.gif') {
      transformer = transformer.gif();
    }

    await transformer.toFile(thumbnailFilePath);
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
  const parsed = parseGeneratedFilename(filename);
  return parsed?.category ?? null;
};

/**
 * 根据ID查找原图和缩略图文件
 * @param {string} id 文件ID (UUID)
 * @returns {Promise<{originalFile: string|undefined, thumbnailFile: string|undefined}>}
 */
export const findImageFilesById = async (id) => {
  const matcher = new RegExp(`_${escapeRegExp(id)}(?:_cat_[^_]+)?_\\d+\\.[^.]+$`);

  const [originalFiles, thumbnailFiles] = await Promise.all([
    fsPromises.readdir(config.upload.originalDir),
    fsPromises.readdir(config.upload.thumbnailsDir),
  ]);

  const originalFile = originalFiles
    .filter((file) => !file.startsWith('.'))
    .find((file) => matcher.test(file));

  const thumbnailFile = thumbnailFiles
    .filter((file) => !file.startsWith('.'))
    .find((file) => matcher.test(file));

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
