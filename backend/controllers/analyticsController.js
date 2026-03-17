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
const getHour = () => new Date().getHours();

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
      byPath: new Map(),
      byHour: Array(24).fill(0),
      visitCountByVisitor: new Map()
    });
  }

  return analyticsStore.daily.get(dayKey);
};

export const trackVisit = (req, res) => {
  const dayKey = getDayKey();
  const hour = getHour();
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
  dailyRecord.byHour[hour] += 1;

  const currentVisitorCount = dailyRecord.visitCountByVisitor.get(identityKey) || 0;
  dailyRecord.visitCountByVisitor.set(identityKey, currentVisitorCount + 1);

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

const getRecentDayKeys = (days) => {
  const keys = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() - i);
    keys.push(date.toISOString().slice(0, 10));
  }

  return keys;
};

const buildOverview = (dailyRecord) => {
  if (!dailyRecord) {
    return {
      pvToday: 0,
      uvToday: 0,
      totalPv: analyticsStore.totalPv,
      avgPvPerVisitor: 0,
      singleVisitVisitorRate: 0,
      uniquePathsToday: 0
    };
  }

  const uvToday = dailyRecord.visitors.size;
  const singleVisitUsers = Array.from(dailyRecord.visitCountByVisitor.values()).filter((count) => count === 1).length;

  return {
    pvToday: dailyRecord.pv,
    uvToday,
    totalPv: analyticsStore.totalPv,
    avgPvPerVisitor: uvToday ? Number((dailyRecord.pv / uvToday).toFixed(2)) : 0,
    singleVisitVisitorRate: uvToday ? Number((singleVisitUsers / uvToday).toFixed(4)) : 0,
    uniquePathsToday: dailyRecord.byPath.size
  };
};

export const getAnalyticsSummary = (req, res) => {
  const todayKey = getDayKey();
  const todayRecord = analyticsStore.daily.get(todayKey);

  const dailyTrend = getRecentDayKeys(7).map((day) => {
    const record = analyticsStore.daily.get(day);
    return {
      day,
      pv: record?.pv || 0,
      uv: record?.visitors.size || 0
    };
  });

  const topPaths = todayRecord
    ? Array.from(todayRecord.byPath.entries())
      .map(([path, pv]) => ({ path, pv }))
      .sort((a, b) => b.pv - a.pv)
      .slice(0, 8)
    : [];

  const hourlyPv = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    pv: todayRecord?.byHour[hour] || 0
  }));

  res.json({
    success: true,
    data: {
      overview: buildOverview(todayRecord),
      dailyTrend,
      topPaths,
      hourlyPv
    }
  });
};
