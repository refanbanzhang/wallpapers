// 错误处理中间件

/**
 * 404错误处理中间件
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`找不到路径: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * 全局错误处理中间件
 */
export const errorHandler = (err, req, res, next) => {
  // 确定状态码 (如果已经发送了响应头，保留当前状态码，否则使用500)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  
  // 构建错误响应
  const response = {
    success: false,
    error: err.message,
  };
  
  // 在开发环境下添加堆栈信息
  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }
  
  // 记录错误
  console.error(`[错误] ${err.message}`);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }
  
  // 发送JSON响应
  res.json(response);
};

/**
 * Multer错误处理中间件
 */
export const multerErrorHandler = (err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      error: '文件大小超出限制'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      error: '意外的文件字段'
    });
  }
  
  next(err);
};