import config from '../config/config.js';
import { createAuthToken } from '../utils/authToken.js';

export const login = (req, res) => {
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      error: '用户名和密码不能为空',
    });
  }

  if (username !== config.auth.username || password !== config.auth.password) {
    return res.status(401).json({
      success: false,
      error: '用户名或密码错误',
    });
  }

  const token = createAuthToken(
    { username: config.auth.username },
    config.auth.secret,
    config.auth.tokenExpiresInSeconds,
  );

  return res.json({
    success: true,
    data: {
      token,
      tokenType: 'Bearer',
      expiresIn: config.auth.tokenExpiresInSeconds,
    },
  });
};
