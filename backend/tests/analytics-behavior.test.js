import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';

import routes from '../routes/index.js';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api', routes);
  return app;
};

test('POST /api/analytics/track should count PV each time and UV once per visitor per day', async () => {
  const app = createApp();
  const visitorId = 'visitor-abc-123';

  const firstResponse = await request(app)
    .post('/api/analytics/track')
    .set('User-Agent', 'analytics-test-agent/1.0')
    .set('x-forwarded-for', '203.0.113.10')
    .send({ visitorId, path: '/' });

  assert.equal(firstResponse.status, 200);
  assert.equal(firstResponse.body.success, true);
  assert.equal(firstResponse.body.data.pvToday, 1);
  assert.equal(firstResponse.body.data.uvToday, 1);
  assert.equal(firstResponse.body.data.isNewVisitorToday, true);

  const secondResponse = await request(app)
    .post('/api/analytics/track')
    .set('User-Agent', 'analytics-test-agent/1.0')
    .set('x-forwarded-for', '203.0.113.10')
    .send({ visitorId, path: '/' });

  assert.equal(secondResponse.status, 200);
  assert.equal(secondResponse.body.success, true);
  assert.equal(secondResponse.body.data.pvToday, 2);
  assert.equal(secondResponse.body.data.uvToday, 1);
  assert.equal(secondResponse.body.data.isNewVisitorToday, false);
});

test('POST /api/analytics/track should fallback to ip+ua identity when visitorId is missing', async () => {
  const app = createApp();

  const firstResponse = await request(app)
    .post('/api/analytics/track')
    .set('User-Agent', 'analytics-test-agent/2.0')
    .set('x-forwarded-for', '198.51.100.50')
    .send({ path: '/about' });

  assert.equal(firstResponse.status, 200);
  assert.equal(firstResponse.body.success, true);
  assert.equal(firstResponse.body.data.isNewVisitorToday, true);

  const secondResponse = await request(app)
    .post('/api/analytics/track')
    .set('User-Agent', 'analytics-test-agent/2.0')
    .set('x-forwarded-for', '198.51.100.50')
    .send({ path: '/about' });

  assert.equal(secondResponse.status, 200);
  assert.equal(secondResponse.body.success, true);
  assert.equal(secondResponse.body.data.isNewVisitorToday, false);
});
