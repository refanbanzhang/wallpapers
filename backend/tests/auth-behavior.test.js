import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';

import routes from '../routes/index.js';
import config from '../config/config.js';
import { createAuthToken } from '../utils/authToken.js';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api', routes);
  return app;
};

test('POST /api/auth/login should return token with valid credentials', async () => {
  const app = createApp();

  const response = await request(app).post('/api/auth/login').send({
    username: '15014095291',
    password: '332881532',
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(typeof response.body.data?.token, 'string');
  assert.ok(response.body.data?.token.length > 20);
});

test('POST /api/auth/login should reject invalid credentials', async () => {
  const app = createApp();

  const response = await request(app).post('/api/auth/login').send({
    username: '15014095291',
    password: 'wrong-password',
  });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test('PUT /api/images/:id/category should be blocked without token', async () => {
  const app = createApp();

  const response = await request(app)
    .put('/api/images/non-existent-id/category')
    .send({ category: 'nature' });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test('PUT /api/images/:id/category should pass auth middleware with valid token', async () => {
  const app = createApp();

  const loginResponse = await request(app).post('/api/auth/login').send({
    username: '15014095291',
    password: '332881532',
  });

  const token = loginResponse.body.data?.token;
  assert.equal(typeof token, 'string');

  const response = await request(app)
    .put('/api/images/non-existent-id/category')
    .set('Authorization', `Bearer ${token}`)
    .send({ category: 'nature' });

  assert.notEqual(response.status, 401);
});

test('PUT /api/images/:id/category should reject non-admin token', async () => {
  const app = createApp();

  const token = createAuthToken(
    { username: 'demo-user', role: 'viewer' },
    config.auth.secret,
    config.auth.tokenExpiresInSeconds,
  );

  const response = await request(app)
    .put('/api/images/non-existent-id/category')
    .set('Authorization', `Bearer ${token}`)
    .send({ category: 'nature' });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
});
