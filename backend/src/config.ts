import dotenv from 'dotenv';

dotenv.config();

export interface AppConfig {
  readonly port: number;
  readonly nodeEnv: string;
  readonly corsOrigin: string;
  readonly databaseUrl?: string;
  readonly geminiApiKey?: string;
  readonly geminiModel: string;
  readonly geminiTimeoutMs: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsedPort = parseInt(env.PORT || '5000', 10);
  const port = isNaN(parsedPort) || parsedPort <= 0 || parsedPort > 65535 ? 5000 : parsedPort;

  const geminiApiKey =
    env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim().length > 0
      ? env.GEMINI_API_KEY.trim()
      : undefined;

  const geminiModel =
    env.GEMINI_MODEL && env.GEMINI_MODEL.trim().length > 0
      ? env.GEMINI_MODEL.trim()
      : 'gemini-2.5-flash';

  const parsedTimeout = parseInt(env.GEMINI_TIMEOUT_MS || '15000', 10);
  const geminiTimeoutMs = isNaN(parsedTimeout) || parsedTimeout <= 0 || parsedTimeout > 300_000 ? 15000 : parsedTimeout;

  const nodeEnv = env.NODE_ENV === 'production' || env.NODE_ENV === 'test' ? env.NODE_ENV : 'development';

  return {
    port,
    nodeEnv,
    corsOrigin: env.CORS_ORIGIN || 'http://localhost:5173',
    databaseUrl: env.DATABASE_URL && env.DATABASE_URL.trim().length > 0 ? env.DATABASE_URL.trim() : undefined,
    geminiApiKey,
    geminiModel,
    geminiTimeoutMs,
  };
}

export const config: AppConfig = loadConfig();
