import { Pool } from 'pg';
import { config } from './config';

let pool: Pool | null = null;

export function getDatabasePool(): Pool | null {
  if (!config.databaseUrl) {
    return null;
  }

  if (!pool) {
    const isNeon = config.databaseUrl.includes('neon.tech');
    const isProduction = config.nodeEnv === 'production';

    pool = new Pool({
      connectionString: config.databaseUrl,
      ssl: isNeon || isProduction ? { rejectUnauthorized: false } : undefined,
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

export async function checkDatabaseConnection(): Promise<DatabaseHealthStatus> {
  if (!config.databaseUrl) {
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
