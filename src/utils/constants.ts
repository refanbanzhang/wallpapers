/**
 * 常量工具函数
 * 用于在Vue模板中访问常量
 */
import * as sharedConstants from '@/constants/sharedConstants'

/**
 * 所有全局常量集合
 */
export const constants = {
  ...sharedConstants
}

/**
 * 获取常量的辅助函数
 * 用于在Vue模板中可以直接使用
 */
export function useConstants() {
  return constants
} 