import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app';
import { loadConfig } from '../src/config';

describe('Application Configuration', () => {
  it('loads sensible defaults when environment variables are omitted', () => {
    const config = loadConfig({});
    assert.strictEqual(config.port, 5000);
    assert.strictEqual(config.nodeEnv, 'development');
    assert.strictEqual(config.corsOrigin, 'http://localhost:5173');
    assert.strictEqual(config.databaseUrl, undefined);
  });

  it('correctly parses custom PORT and DATABASE_URL', () => {
    const config = loadConfig({
      PORT: '8080',
      NODE_ENV: 'production',
      CORS_ORIGIN: 'https://example.com',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
    });
    assert.strictEqual(config.port, 8080);
    assert.strictEqual(config.nodeEnv, 'production');
    assert.strictEqual(config.corsOrigin, 'https://example.com');
    assert.strictEqual(config.databaseUrl, 'postgresql://test:test@localhost:5432/testdb');
  });

  it('falls back to port 5000 when PORT is invalid', () => {
    const config = loadConfig({ PORT: 'invalid-port' });
    assert.strictEqual(config.port, 5000);
  });
});

describe('Health Check Endpoints', () => {
  const app = createApp();

  it('GET /api/health returns 200 with status ok and timestamp', async () => {
    const response = await request(app).get('/api/health');

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.status, 'ok');
    assert.strictEqual(typeof response.body.uptime, 'number');
    assert.ok(response.body.timestamp);
    assert.ok(!isNaN(Date.parse(response.body.timestamp)));
  });

  it('GET /health alias returns 200 with status ok', async () => {
    const response = await request(app).get('/health');

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.status, 'ok');
  });

  it('GET /api/health/db returns unavailable when DATABASE_URL is unconfigured', async () => {
    const response = await request(app).get('/api/health/db');

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.body.status, 'unavailable');
    assert.strictEqual(response.body.database, 'not_configured');
  });

  it('includes standard security headers in responses', async () => {
    const response = await request(app).get('/api/health');

    assert.strictEqual(response.headers['x-content-type-options'], 'nosniff');
  });

  it('returns 404 for unknown routes', async () => {
    const response = await request(app).get('/api/unknown-endpoint');

    assert.strictEqual(response.status, 404);
    assert.strictEqual(response.body.error, 'Endpoint not found');
  });
});
