import { crawlWebsiteImages } from '../services/imageCrawlerService.js';

export const startImageCrawl = async (req, res) => {
  try {
    const { startUrl, category = '', delayMs = 1000, maxPages = 20, maxImages = 200 } = req.body || {};

    if (!startUrl || typeof startUrl !== 'string') {
      return res.status(400).json({ success: false, error: '请提供有效的网站地址' });
    }

    const normalizedDelayMs = Math.max(500, Math.min(10000, Number(delayMs) || 1000));
    const normalizedMaxPages = Math.max(1, Math.min(100, Number(maxPages) || 20));
    const normalizedMaxImages = Math.max(1, Math.min(2000, Number(maxImages) || 200));

    const result = await crawlWebsiteImages({
      startUrl: startUrl.trim(),
      category: typeof category === 'string' ? category.trim() : '',
      delayMs: normalizedDelayMs,
      maxPages: normalizedMaxPages,
      maxImages: normalizedMaxImages,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('抓取网站图片失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '抓取网站图片失败',
    });
  }
};
