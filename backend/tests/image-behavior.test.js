import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

import imageRoutes from '../routes/imageRoutes.js';
import config from '../config/config.js';
import { ensureDirectoriesExist, generateThumbnail } from '../utils/fileUtils.js';
import { createAuthToken } from '../utils/authToken.js';

test('DELETE /api/images/batch-delete should route to batch handler', async () => {
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

test('generateThumbnail should preserve png output format when path extension is .png', async () => {
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
