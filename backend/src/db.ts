import { Pool } from 'pg';
import { config } from './config';

let pool: Pool | null = null;

export function getSslConfig(databaseUrl?: string, nodeEnv?: string): { rejectUnauthorized: boolean } | undefined {
  if (!databaseUrl) {
    return undefined;
  }
  const isNeon = databaseUrl.includes('neon.tech');
  const isProduction = nodeEnv === 'production';
  // Enforce standard TLS certificate verification (rejectUnauthorized: true) for Neon and production
  return isNeon || isProduction ? { rejectUnauthorized: true } : undefined;
}

export function getDatabasePool(): Pool | null {
  if (!config.databaseUrl) {
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: getSslConfig(config.databaseUrl, config.nodeEnv),
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }

  return pool;
}

export interface DatabaseHealthStatus {
  configured: boolean;
  connected: boolean;
  error?: string;
}

export async function checkDatabaseConnection(overrideUrl?: string | null): Promise<DatabaseHealthStatus> {
  const dbUrl = overrideUrl !== undefined ? overrideUrl : config.databaseUrl;
  if (!dbUrl) {
    return { configured: false, connected: false };
  }

  const dbPool = getDatabasePool();
  if (!dbPool) {
    return { configured: false, connected: false };
  }

  try {
    const client = await dbPool.connect();
    try {
      await client.query('SELECT 1 AS health_check');
      return { configured: true, connected: true };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database error occurred';
    return { configured: true, connected: false, error: message };
  }
}

export async function closeDatabasePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
