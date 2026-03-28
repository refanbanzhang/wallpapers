import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

import imageRoutes from '../routes/imageRoutes.js';
import config from '../config/config.js';
import { ensureDirectoriesExist, generateThumbnail } from '../utils/fileUtils.js';
import { createAuthToken } from '../utils/authToken.js';
import { crawlWebsiteImages } from '../services/imageCrawlerService.js';

const createTestImageBuffer = async (format = 'png') => {
  const instance = sharp({
    create: {
      width: 24,
      height: 24,
      channels: 3,
      background: { r: 80, g: 120, b: 160 },
    },
  });

  return format === 'jpg' ? instance.jpeg().toBuffer() : instance.png().toBuffer();
};

const withTemporaryUploadDirs = async (run) => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wallpaper-crawl-test-'));
  const previousUploadConfig = { ...config.upload };

  config.upload.uploadsDir = tempDir;
  config.upload.originalDir = path.join(tempDir, 'origin');
  config.upload.thumbnailsDir = path.join(tempDir, 'thumbnails');

  ensureDirectoriesExist([
    config.upload.uploadsDir,
    config.upload.originalDir,
    config.upload.thumbnailsDir,
  ]);

  try {
    await run(tempDir);
  } finally {
    config.upload.uploadsDir = previousUploadConfig.uploadsDir;
    config.upload.originalDir = previousUploadConfig.originalDir;
    config.upload.thumbnailsDir = previousUploadConfig.thumbnailsDir;
    await fs.rm(tempDir, { recursive: true, force: true });
  }
};

const createFixtureSite = async () => {
  const jpgBuffer = await createTestImageBuffer('jpg');
  const pngBuffer = await createTestImageBuffer('png');
  const imageRequestTimes = [];
  let activeImageRequests = 0;
  let maxActiveImageRequests = 0;

  const server = http.createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(404);
      res.end();
      return;
    }

    if (req.url === '/gallery?page=1') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html>
          <body>
            <img src="/images/cat.jpg" />
            <img data-src="/images/cat.jpg?dup=1" />
            <a rel="next" href="/gallery?page=2">下一页</a>
          </body>
        </html>
      `);
      return;
    }

    if (req.url === '/gallery?page=2') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <html>
          <body>
            <img src="/images/dog.png" />
          </body>
        </html>
      `);
      return;
    }

    if (req.url.startsWith('/images/')) {
      imageRequestTimes.push(Date.now());
      activeImageRequests += 1;
      maxActiveImageRequests = Math.max(maxActiveImageRequests, activeImageRequests);

      await new Promise((resolve) => setTimeout(resolve, 25));

      const isPng = req.url.includes('dog.png');
      res.writeHead(200, { 'Content-Type': isPng ? 'image/png' : 'image/jpeg' });
      res.end(isPng ? pngBuffer : jpgBuffer);
      activeImageRequests -= 1;
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  return {
    baseUrl,
    imageRequestTimes,
    getMaxActiveImageRequests: () => maxActiveImageRequests,
    close: async () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
};

test('DELETE /api/images/batch-delete should route to batch handler', { concurrency: false }, async () => {
  ensureDirectoriesExist([
    config.upload.uploadsDir,
    config.upload.originalDir,
    config.upload.thumbnailsDir,
  ]);

  const app = express();
  app.use(express.json());
  app.use('/api/images', imageRoutes);

  const token = createAuthToken(
    { username: config.auth.username, role: config.auth.role },
    config.auth.secret,
    config.auth.tokenExpiresInSeconds,
  );

  const response = await request(app)
    .delete('/api/images/batch-delete')
    .set('Authorization', `Bearer ${token}`)
    .send({ ids: ['non-existent-id'] });

  assert.equal(response.status, 200);
  assert.notEqual(response.body.message, '删除成功');
  assert.match(response.body.message, /成功删除/);
});

test('generateThumbnail should preserve png output format when path extension is .png', { concurrency: false }, async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wallpaper-thumb-test-'));
  const inputPath = path.join(tempDir, 'source.png');
  const outputPath = path.join(tempDir, 'thumb.png');

  await sharp({
    create: {
      width: 20,
      height: 20,
      channels: 3,
      background: { r: 80, g: 120, b: 160 },
    },
  })
    .png()
    .toFile(inputPath);

  const generated = await generateThumbnail(inputPath, outputPath, {
    width: 10,
    height: 10,
    quality: 70,
  });

  assert.equal(generated, true);
  const metadata = await sharp(outputPath).metadata();
  assert.equal(metadata.format, 'png');

  await fs.rm(tempDir, { recursive: true, force: true });
});

test('crawlWebsiteImages should visit paginated pages and download images serially', { concurrency: false }, async () => {
  await withTemporaryUploadDirs(async () => {
    const fixtureSite = await createFixtureSite();

    try {
      const result = await crawlWebsiteImages({
        startUrl: `${fixtureSite.baseUrl}/gallery?page=1`,
        delayMs: 20,
        maxPages: 5,
        maxImages: 10,
      });

      assert.equal(result.pagesVisited, 2);
      assert.equal(result.imagesDownloaded, 3);
      assert.equal(result.pageSummaries.length, 2);
      assert.equal(fixtureSite.getMaxActiveImageRequests(), 1);

      const originalNames = result.downloadedImages.map((item) => item.originalFilename);
      assert.deepEqual(originalNames, ['cat.jpg', 'cat.jpg', 'dog.png']);

      const storedNames = result.downloadedImages.map((item) => item.storedFilename);
      assert.equal(new Set(storedNames).size, storedNames.length);

      for (let index = 1; index < fixtureSite.imageRequestTimes.length; index += 1) {
        assert.ok(fixtureSite.imageRequestTimes[index] - fixtureSite.imageRequestTimes[index - 1] >= 15);
      }
    } finally {
      await fixtureSite.close();
    }
  });
});

test('POST /api/images/crawl should save crawled images through the route', { concurrency: false }, async () => {
  await withTemporaryUploadDirs(async () => {
    const fixtureSite = await createFixtureSite();

    try {
      const app = express();
      app.use(express.json());
      app.use('/api/images', imageRoutes);

      const token = createAuthToken(
        { username: config.auth.username, role: config.auth.role },
        config.auth.secret,
        config.auth.tokenExpiresInSeconds,
      );

      const response = await request(app)
        .post('/api/images/crawl')
        .set('Authorization', `Bearer ${token}`)
        .send({
          startUrl: `${fixtureSite.baseUrl}/gallery?page=1`,
          delayMs: 500,
          maxPages: 1,
          maxImages: 1,
        });

      assert.equal(response.status, 200);
      assert.equal(response.body.success, true);
      assert.equal(response.body.data.imagesDownloaded, 1);

      const savedFiles = await fs.readdir(config.upload.originalDir);
      assert.equal(savedFiles.length, 1);
    } finally {
      await fixtureSite.close();
    }
  });
});
