import fs from 'node:fs/promises';
import path from 'node:path';

import config from '../config/config.js';
import { generateSafeFilename, generateThumbnail } from '../utils/fileUtils.js';

const IMAGE_MIME_TO_EXT = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const IMAGE_TAG_PATTERN = /<img\b[^>]*>/gi;
const ANCHOR_TAG_PATTERN = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
const ATTR_PATTERN = /([^\s"'=<>`/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const NEXT_TEXT_PATTERN = /^(下一页|下页|next|next page|older|›|»|→)$/i;
const PAGE_PARAM_PATTERN = /(page=)(\d+)/i;
const PAGE_PATH_PATTERN = /(\/page\/)(\d+)(\/?)/i;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class RequestThrottle {
  constructor(delayMs) {
    this.delayMs = Math.max(0, Number(delayMs) || 0);
    this.lastRequestAt = 0;
  }

  async waitTurn() {
    if (!this.lastRequestAt || this.delayMs === 0) {
      this.lastRequestAt = Date.now();
      return;
    }

    const waitMs = this.delayMs - (Date.now() - this.lastRequestAt);
    if (waitMs > 0) {
      await sleep(waitMs);
    }

    this.lastRequestAt = Date.now();
  }
}

const parseAttributes = (rawTag) => {
  const attrs = {};
  for (const matched of rawTag.matchAll(ATTR_PATTERN)) {
    const name = matched[1]?.toLowerCase();
    if (!name) {
      continue;
    }

    attrs[name] = matched[2] ?? matched[3] ?? matched[4] ?? '';
  }

  return attrs;
};

const resolveUrl = (value, baseUrl) => {
  if (!value || value.startsWith('data:') || value.startsWith('javascript:') || value.startsWith('#')) {
    return '';
  }

  try {
    const url = new URL(value, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      return '';
    }

    return url.toString();
  } catch {
    return '';
  }
};

const pickSrcFromSet = (value) => {
  if (!value) {
    return '';
  }

  const firstCandidate = value
    .split(',')
    .map((item) => item.trim().split(/\s+/)[0])
    .find(Boolean);

  return firstCandidate || '';
};

const extractImageUrls = (html, pageUrl) => {
  const urls = new Set();

  for (const matched of html.matchAll(IMAGE_TAG_PATTERN)) {
    const rawTag = matched[0];
    const attrs = parseAttributes(rawTag);
    const candidates = [
      attrs.src,
      attrs['data-src'],
      attrs['data-original'],
      attrs['data-lazy-src'],
      attrs['data-url'],
      pickSrcFromSet(attrs.srcset),
      pickSrcFromSet(attrs['data-srcset']),
    ];

    for (const candidate of candidates) {
      const resolved = resolveUrl(candidate, pageUrl);
      if (resolved) {
        urls.add(resolved);
      }
    }
  }

  return [...urls];
};

const normalizePageLink = (href, pageUrl) => {
  const resolved = resolveUrl(href, pageUrl);
  if (!resolved || resolved === pageUrl) {
    return '';
  }

  return resolved;
};

const buildIncrementedPageCandidates = (pageUrl) => {
  const candidates = [];

  const nextQueryUrl = pageUrl.replace(PAGE_PARAM_PATTERN, (_, prefix, current) => `${prefix}${Number(current) + 1}`);
  if (nextQueryUrl !== pageUrl) {
    candidates.push(nextQueryUrl);
  }

  const nextPathUrl = pageUrl.replace(PAGE_PATH_PATTERN, (_, prefix, current, suffix) => `${prefix}${Number(current) + 1}${suffix}`);
  if (nextPathUrl !== pageUrl) {
    candidates.push(nextPathUrl);
  }

  return candidates;
};

const findNextPageUrl = (html, pageUrl) => {
  const currentUrl = new URL(pageUrl);
  const candidateLinks = [];

  for (const matched of html.matchAll(ANCHOR_TAG_PATTERN)) {
    const attrs = parseAttributes(matched[1] || '');
    const text = matched[2]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || '';
    const href = attrs.href || '';
    const resolvedHref = normalizePageLink(href, pageUrl);
    if (!resolvedHref) {
      continue;
    }

    const classText = `${attrs.class || ''} ${attrs.rel || ''} ${attrs.id || ''}`.toLowerCase();
    const score =
      (attrs.rel || '').toLowerCase() === 'next'
        ? 100
        : /(^|\s)(next|pagination-next|pager-next|next-page)(\s|$)/.test(classText)
          ? 80
          : NEXT_TEXT_PATTERN.test(text)
            ? 60
            : 0;

    if (score > 0) {
      candidateLinks.push({ href: resolvedHref, score });
    }
  }

  if (candidateLinks.length > 0) {
    candidateLinks.sort((left, right) => right.score - left.score);
    return candidateLinks[0].href;
  }

  const fallbackCandidates = buildIncrementedPageCandidates(pageUrl);
  for (const candidate of fallbackCandidates) {
    try {
      const candidateUrl = new URL(candidate);
      if (candidateUrl.origin === currentUrl.origin) {
        return candidateUrl.toString();
      }
    } catch {
      continue;
    }
  }

  return '';
};

const sanitizeOriginalFilename = (url, contentType) => {
  const pathname = new URL(url).pathname;
  const rawBaseName = path.basename(pathname) || '';
  const decodedBaseName = rawBaseName ? decodeURIComponent(rawBaseName) : '';
  const extFromUrl = path.extname(decodedBaseName).toLowerCase();
  const normalizedExt = config.allowedImageTypes.includes(extFromUrl)
    ? extFromUrl
    : IMAGE_MIME_TO_EXT[contentType?.split(';')[0].toLowerCase()] || '.jpg';
  const baseName = path.basename(decodedBaseName || 'image', extFromUrl || normalizedExt).trim() || 'image';

  return `${baseName}${normalizedExt}`;
};

const fetchWithBrowserHeaders = async (url, fetchImpl, referer = '') => {
  return fetchImpl(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      Referer: referer,
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  });
};

const saveImageFromUrl = async (imageUrl, category, fetchImpl, referer = '') => {
  const response = await fetchWithBrowserHeaders(imageUrl, fetchImpl, referer);
  if (!response.ok) {
    throw new Error(`下载失败: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error(`资源不是图片: ${contentType || 'unknown'}`);
  }

  const originalFilename = sanitizeOriginalFilename(imageUrl, contentType);
  const storedFilename = generateSafeFilename(originalFilename, category);
  const originalFilePath = path.join(config.upload.originalDir, storedFilename);
  const thumbnailFilePath = path.join(config.upload.thumbnailsDir, storedFilename);
  const buffer = Buffer.from(await response.arrayBuffer());

  await fs.writeFile(originalFilePath, buffer);
  await generateThumbnail(originalFilePath, thumbnailFilePath);

  return {
    sourceUrl: imageUrl,
    originalFilename,
    storedFilename,
    fileSize: buffer.length,
    originalUrl: `/upload/origin/${storedFilename}`,
    thumbnailUrl: `/upload/thumbnails/${storedFilename}`,
  };
};

export const crawlWebsiteImages = async ({
  startUrl,
  category = '',
  delayMs = 1000,
  maxPages = 20,
  maxImages = 200,
  fetchImpl = globalThis.fetch,
}) => {
  if (!fetchImpl) {
    throw new Error('当前运行环境不支持 fetch');
  }

  let normalizedStartUrl;
  try {
    normalizedStartUrl = new URL(startUrl).toString();
  } catch {
    throw new Error('网站地址无效');
  }

  const throttle = new RequestThrottle(delayMs);
  const visitedPages = new Set();
  const downloadedImageUrls = new Set();
  const downloadedImages = [];
  const skippedImages = [];
  const pageSummaries = [];
  let currentPageUrl = normalizedStartUrl;

  while (
    currentPageUrl &&
    !visitedPages.has(currentPageUrl) &&
    visitedPages.size < Math.max(1, Number(maxPages) || 1) &&
    downloadedImages.length < Math.max(1, Number(maxImages) || 1)
  ) {
    await throttle.waitTurn();

    const pageResponse = await fetchWithBrowserHeaders(currentPageUrl, fetchImpl, currentPageUrl);
    if (!pageResponse.ok) {
      if (visitedPages.size === 0) {
        throw new Error(`抓取页面失败: ${currentPageUrl} (${pageResponse.status})`);
      }

      break;
    }

    visitedPages.add(currentPageUrl);
    const html = await pageResponse.text();
    const pageImageUrls = extractImageUrls(html, currentPageUrl).filter((url) => !downloadedImageUrls.has(url));
    const pageDownloadCountBefore = downloadedImages.length;

    for (const imageUrl of pageImageUrls) {
      if (downloadedImages.length >= maxImages) {
        break;
      }

      downloadedImageUrls.add(imageUrl);
      await throttle.waitTurn();

      try {
        const savedImage = await saveImageFromUrl(imageUrl, category, fetchImpl, currentPageUrl);
        downloadedImages.push(savedImage);
      } catch (error) {
        skippedImages.push({
          sourceUrl: imageUrl,
          reason: error instanceof Error ? error.message : '下载失败',
        });
      }
    }

    pageSummaries.push({
      pageUrl: currentPageUrl,
      discoveredImages: pageImageUrls.length,
      downloadedImages: downloadedImages.length - pageDownloadCountBefore,
    });

    currentPageUrl = findNextPageUrl(html, currentPageUrl);
  }

  return {
    startUrl: normalizedStartUrl,
    category: category || null,
    delayMs: Math.max(0, Number(delayMs) || 0),
    pagesVisited: visitedPages.size,
    imagesDownloaded: downloadedImages.length,
    imagesSkipped: skippedImages.length,
    pageSummaries,
    downloadedImages,
    skippedImages,
  };
};
