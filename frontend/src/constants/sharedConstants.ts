/**
 * 前端导入共享常量的桥接文件
 * 用于在TypeScript环境中导入共享常量
 */

// 直接从本地常量文件导入
import {
  MAX_FILE_SIZE,
  DEFAULT_THUMBNAIL_WIDTH,
  DEFAULT_THUMBNAIL_HEIGHT,
  DEFAULT_THUMBNAIL_QUALITY
} from './constants';

// 重新导出常量
export {
  MAX_FILE_SIZE,
  DEFAULT_THUMBNAIL_WIDTH,
  DEFAULT_THUMBNAIL_HEIGHT,
  DEFAULT_THUMBNAIL_QUALITY
}; 