// 图片控制器
import fsPromises from 'fs/promises';
import path from 'path';
import config from '../config/config.js';
import {
  generateThumbnail,
  safeUnlink,
  findImageFilesById,
  extractCategoryFromFilename,
  parseGeneratedFilename,
} from '../utils/fileUtils.js';

// 存储图片分类的映射（兼容历史逻辑）
const imageCategoryMap = new Map();

const IMAGE_EXT_PATTERN = /\.(jpg|jpeg|png|gif|webp)$/i;
const CATEGORY_PATTERN = /^[\p{L}\p{N}-]{1,32}$/u;

/**
 * 上传图片
 */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未接收到文件' });
    }

    const originalFile = req.file;
    const filename = originalFile.filename;
    const originalFilePath = path.join(config.upload.originalDir, filename);
    const thumbnailFilePath = path.join(config.upload.thumbnailsDir, filename);

    await generateThumbnail(originalFilePath, thumbnailFilePath);

    res.json({
      success: true,
      data: {
        originalUrl: `/upload/origin/${filename}`,
        thumbnailUrl: `/upload/thumbnails/${filename}`,
        fileSize: originalFile.size,
        fileName: filename,
      },
    });
  } catch (error) {
    console.error('上传处理错误:', error);
    res.status(500).json({ success: false, error: '文件上传失败', message: error.message });
  }
};

/**
 * 获取所有图片
 */
export const getAllImages = async (req, res) => {
  try {
    const { search } = req.query;
    const normalizedSearch = typeof search === 'string' ? search.trim().toLowerCase() : '';

    const [originalFiles, thumbnailFiles] = await Promise.all([
      fsPromises.readdir(config.upload.originalDir),
      fsPromises.readdir(config.upload.thumbnailsDir),
    ]);

    const thumbnailSet = new Set(thumbnailFiles.filter((file) => !file.startsWith('.')));

    const images = (
      await Promise.all(
        originalFiles
          .filter((filename) => !filename.startsWith('.') && IMAGE_EXT_PATTERN.test(filename))
          .map(async (filename) => {
            try {
              if (!thumbnailSet.has(filename)) {
                return null;
              }

              const parsed = parseGeneratedFilename(filename);
              if (!parsed) {
                return null;
              }

              const displayName = `${parsed.baseName}${parsed.ext}`;
              if (normalizedSearch && !displayName.toLowerCase().includes(normalizedSearch)) {
                return null;
              }

              const fileStats = await fsPromises.stat(path.join(config.upload.originalDir, filename));

              return {
                id: parsed.id,
                fileName: displayName,
                originalUrl: `/upload/origin/${filename}`,
                thumbnailUrl: `/upload/thumbnails/${filename}`,
                fileSize: fileStats.size,
                uploadTime: new Date(fileStats.mtime).toISOString(),
                category: extractCategoryFromFilename(filename),
              };
            } catch (err) {
              console.error(`处理图片 ${filename} 时出错:`, err);
              return null;
            }
          }),
      )
    ).filter(Boolean);

    res.json({
      success: true,
      data: images,
    });
  } catch (error) {
    console.error('获取图片列表失败:', error);
    res.status(500).json({ success: false, error: '获取图片列表失败' });
  }
};

/**
 * 删除单张图片
 */
export const deleteImage = async (req, res) => {
  try {
    const { id } = req.params;
    const { originalFile, thumbnailFile } = await findImageFilesById(id);

    let originalDeleted = false;
    let thumbnailDeleted = false;

    if (originalFile) {
      originalDeleted = await safeUnlink(path.join(config.upload.originalDir, originalFile));
    } else {
      console.log(`未找到原图文件: ${id}`);
    }

    if (thumbnailFile) {
      thumbnailDeleted = await safeUnlink(path.join(config.upload.thumbnailsDir, thumbnailFile));
    } else {
      console.log(`未找到缩略图文件: ${id}`);
    }

    res.json({
      success: true,
      message: '删除成功',
      details: {
        originalDeleted,
        thumbnailDeleted,
      },
    });
  } catch (error) {
    console.error('删除图片失败:', error);
    res.status(500).json({ success: false, error: '删除图片失败', message: error.message });
  }
};

/**
 * 批量删除图片
 */
export const batchDeleteImages = async (req, res) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '请提供有效的图片ID列表' });
    }

    const results = await Promise.all(
      ids.map(async (id) => {
        try {
          const { originalFile, thumbnailFile } = await findImageFilesById(id);

          let originalDeleted = false;
          let thumbnailDeleted = false;

          if (originalFile) {
            originalDeleted = await safeUnlink(path.join(config.upload.originalDir, originalFile));
          }

          if (thumbnailFile) {
            thumbnailDeleted = await safeUnlink(path.join(config.upload.thumbnailsDir, thumbnailFile));
          }

          return {
            id,
            originalDeleted,
            thumbnailDeleted,
          };
        } catch (err) {
          console.error(`删除图片 ${id} 时出错:`, err);
          return {
            id,
            originalDeleted: false,
            thumbnailDeleted: false,
            error: err.message,
          };
        }
      }),
    );

    res.json({
      success: true,
      message: `成功删除 ${results.filter((item) => item.originalDeleted || item.thumbnailDeleted).length} 张图片`,
      details: results,
    });
  } catch (error) {
    console.error('批量删除图片失败:', error);
    res.status(500).json({ success: false, error: '批量删除图片失败', message: error.message });
  }
};

/**
 * 更新图片分类
 */
export const updateImageCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: '请提供有效的图片ID' });
    }

    if (category === undefined || category === null) {
      return res.status(400).json({ success: false, error: '请提供有效的分类' });
    }

    const normalizedCategory = String(category).trim();
    if (normalizedCategory && !CATEGORY_PATTERN.test(normalizedCategory)) {
      return res.status(400).json({ success: false, error: '分类格式无效，仅支持字母、数字和短横线' });
    }

    const { originalFile, thumbnailFile } = await findImageFilesById(id);
    if (!originalFile) {
      return res.status(404).json({ success: false, error: '图片不存在' });
    }

    const parsed = parseGeneratedFilename(originalFile);
    if (!parsed) {
      return res.status(500).json({ success: false, error: '图片文件名格式异常，无法更新分类' });
    }

    const nextFileName = normalizedCategory
      ? `${parsed.baseName}_${parsed.id}_cat_${normalizedCategory}_${parsed.timestamp}${parsed.ext}`
      : `${parsed.baseName}_${parsed.id}_${parsed.timestamp}${parsed.ext}`;

    await fsPromises.rename(
      path.join(config.upload.originalDir, originalFile),
      path.join(config.upload.originalDir, nextFileName),
    );

    if (thumbnailFile) {
      await fsPromises.rename(
        path.join(config.upload.thumbnailsDir, thumbnailFile),
        path.join(config.upload.thumbnailsDir, nextFileName),
      );
    }

    if (normalizedCategory) {
      imageCategoryMap.set(id, normalizedCategory);
    } else {
      imageCategoryMap.delete(id);
    }

    res.json({
      success: true,
      message: '分类更新成功',
      data: {
        id,
        category: normalizedCategory || null,
        originalUrl: `/upload/origin/${nextFileName}`,
        thumbnailUrl: `/upload/thumbnails/${nextFileName}`,
      },
    });
  } catch (error) {
    console.error('更新图片分类失败:', error);
    res.status(500).json({ success: false, error: '更新图片分类失败', message: error.message });
  }
};
