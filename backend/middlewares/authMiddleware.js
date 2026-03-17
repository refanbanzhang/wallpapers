import config from '../config/config.js';
import { verifyAuthToken } from '../utils/authToken.js';

export const requireAuth = (req, res, next) => {
  const authorizationHeader = req.headers.authorization || '';
  const [tokenType, token] = authorizationHeader.split(' ');

  if (tokenType !== 'Bearer' || !token) {
    return res.status(401).json({
      success: false,
      error: '未授权，请先登录',
    });
  }

  const payload = verifyAuthToken(token, config.auth.secret);
  if (!payload) {
    return res.status(401).json({
      success: false,
      error: '登录状态已失效，请重新登录',
    });
  }

  req.auth = payload;
  next();
};

export const requireAdmin = (req, res, next) => {
  if (req.auth?.role !== config.auth.role) {
    return res.status(403).json({
      success: false,
      error: '无管理员权限',
    });
  }

  next();
};
