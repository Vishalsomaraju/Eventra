import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app';
import { loadConfig, config } from '../src/config';

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

  it('bounds and sanitizes PORT and GEMINI_TIMEOUT_MS', () => {
    // Port out of bounds
    assert.strictEqual(loadConfig({ PORT: '-5' }).port, 5000);
    assert.strictEqual(loadConfig({ PORT: '70000' }).port, 5000);
    assert.strictEqual(loadConfig({ PORT: '0' }).port, 5000);

    // Timeout bounds
    assert.strictEqual(loadConfig({ GEMINI_TIMEOUT_MS: '0' }).geminiTimeoutMs, 15000);
    assert.strictEqual(loadConfig({ GEMINI_TIMEOUT_MS: '-1000' }).geminiTimeoutMs, 15000);
    assert.strictEqual(loadConfig({ GEMINI_TIMEOUT_MS: '500000' }).geminiTimeoutMs, 15000);
    assert.strictEqual(loadConfig({ GEMINI_TIMEOUT_MS: '20000' }).geminiTimeoutMs, 20000);

    // Environment normalization
    assert.strictEqual(loadConfig({ NODE_ENV: 'staging' }).nodeEnv, 'development');
    assert.strictEqual(loadConfig({ NODE_ENV: 'test' }).nodeEnv, 'test');
  });
});

describe('Database TLS Configuration', () => {
  it('enforces strict TLS certificate verification (rejectUnauthorized: true) for Neon connections', async () => {
    const { getSslConfig } = await import('../src/db');
    const ssl = getSslConfig('postgresql://user:pass@ep-cool-lake-123.us-east-2.aws.neon.tech/neondb', 'development');
    assert.deepStrictEqual(ssl, { rejectUnauthorized: true });
  });

  it('enforces strict TLS certificate verification in production environments', async () => {
    const { getSslConfig } = await import('../src/db');
    const ssl = getSslConfig('postgresql://user:pass@localhost:5432/mydb', 'production');
    assert.deepStrictEqual(ssl, { rejectUnauthorized: true });
  });

  it('omits SSL for local development databases without neon hostnames', async () => {
    const { getSslConfig } = await import('../src/db');
    const ssl = getSslConfig('postgresql://user:pass@localhost:5432/mydb', 'development');
    assert.strictEqual(ssl, undefined);
  });

  it('returns undefined when databaseUrl is not provided', async () => {
    const { getSslConfig } = await import('../src/db');
    assert.strictEqual(getSslConfig(undefined, 'production'), undefined);
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

  it('GET /api/health/db reflects database configuration status safely', async () => {
    const response = await request(app).get('/api/health/db');

    if (!config.databaseUrl) {
      assert.strictEqual(response.status, 200);
      assert.strictEqual(response.body.status, 'unavailable');
      assert.strictEqual(response.body.database, 'not_configured');
    } else {
      // When DATABASE_URL is configured, endpoint returns 200 (connected) or 503 (disconnected)
      assert.ok([200, 503].includes(response.status));
      assert.ok(['ok', 'error'].includes(response.body.status));
      assert.ok(['connected', 'disconnected'].includes(response.body.database));
      // Ensures sensitive credentials or stack traces are NEVER exposed in error payload
      assert.strictEqual(response.body.stack, undefined);
      assert.strictEqual(JSON.stringify(response.body).includes('password'), false);
    }
  });

  it('checkDatabaseConnection reports unconfigured when database URL is null', async () => {
    const { checkDatabaseConnection } = await import('../src/db');
    const result = await checkDatabaseConnection(null);
    assert.strictEqual(result.configured, false);
    assert.strictEqual(result.connected, false);
  });

  it('includes standard security headers in responses', async () => {
    const response = await request(app).get('/api/health');

    assert.strictEqual(response.headers['x-content-type-options'], 'nosniff');
  });

  it('does not send Access-Control-Allow-Credentials on CORS responses', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');

    assert.strictEqual(response.status, 200);
    assert.strictEqual(response.headers['access-control-allow-credentials'], undefined);
  });

  it('returns 404 for unknown routes', async () => {
    const response = await request(app).get('/api/unknown-endpoint');

    assert.strictEqual(response.status, 404);
    assert.strictEqual(response.body.error, 'Endpoint not found');
  });
});
