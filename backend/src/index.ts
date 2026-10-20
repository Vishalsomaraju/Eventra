import { app } from './app';
import { config } from './config';
import { closeDatabasePool } from './db';

const server = app.listen(config.port, () => {
  console.log(`[Eventra Backend] Server listening on port ${config.port} (env: ${config.nodeEnv})`);
});

const handleShutdown = (signal: string): void => {
  console.log(`[Eventra Backend] Received ${signal}. Closing HTTP server...`);
  server.close(async () => {
    try {
      await closeDatabasePool();
      console.log('[Eventra Backend] Database pool closed successfully.');
    } catch (err: unknown) {
      console.error('[Eventra Backend] Error while closing database pool:', err);
    } finally {
      process.exit(0);
    }
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
