import crypto from 'node:crypto';
import config from '../config/config.js';

const MAX_VISITOR_ID_LENGTH = 128;
const MAX_PATH_LENGTH = 512;
const MAX_UA_LENGTH = 256;

const analyticsStore = {
  totalPv: 0,
  daily: new Map()
};

const getDayKey = () => new Date().toISOString().slice(0, 10);

const getForwardedIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded !== 'string') {
    return '';
  }

  return forwarded.split(',')[0].trim();
};

const getClientIp = (req) => {
  return (
    getForwardedIp(req) ||
    req.ip ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    '0.0.0.0'
  );
};

const hashIp = (ip) => {
  const salt = process.env.ANALYTICS_IP_SALT || config.auth.secret || 'wallpaper-analytics-salt';
  return crypto.createHmac('sha256', salt).update(ip).digest('hex');
};

const normalizeVisitorId = (visitorId) => {
  if (typeof visitorId !== 'string') {
    return '';
  }

  return visitorId.trim().slice(0, MAX_VISITOR_ID_LENGTH);
};

const normalizePath = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return '/';
  }

  return value.trim().slice(0, MAX_PATH_LENGTH);
};

const normalizeUserAgent = (userAgent) => {
  if (typeof userAgent !== 'string') {
    return 'unknown-agent';
  }

  return userAgent.slice(0, MAX_UA_LENGTH);
};

const getDailyRecord = (dayKey) => {
  if (!analyticsStore.daily.has(dayKey)) {
    analyticsStore.daily.set(dayKey, {
      pv: 0,
      visitors: new Set(),
      byPath: new Map()
    });
  }

  return analyticsStore.daily.get(dayKey);
};

export const trackVisit = (req, res) => {
  const dayKey = getDayKey();
  const dailyRecord = getDailyRecord(dayKey);

  const path = normalizePath(req.body?.path);
  const visitorId = normalizeVisitorId(req.body?.visitorId);
  const userAgent = normalizeUserAgent(req.headers['user-agent']);
  const ip = getClientIp(req);
  const ipHash = hashIp(ip);

  const identityKey = visitorId ? `v:${visitorId}` : `f:${ipHash}:${userAgent}`;
  const isNewVisitorToday = !dailyRecord.visitors.has(identityKey);

  dailyRecord.pv += 1;
  analyticsStore.totalPv += 1;

  if (isNewVisitorToday) {
    dailyRecord.visitors.add(identityKey);
  }

  const currentPathCount = dailyRecord.byPath.get(path) || 0;
  dailyRecord.byPath.set(path, currentPathCount + 1);

  res.json({
    success: true,
    data: {
      day: dayKey,
      path,
      pvToday: dailyRecord.pv,
      uvToday: dailyRecord.visitors.size,
      pathPvToday: dailyRecord.byPath.get(path) || 0,
      totalPv: analyticsStore.totalPv,
      isNewVisitorToday
    }
  });
};
