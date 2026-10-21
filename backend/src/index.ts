import { app } from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log(`[Eventra Backend] Server listening on port ${config.port} (env: ${config.nodeEnv})`);
});

const handleShutdown = (signal: string): void => {
  console.log(`[Eventra Backend] Received ${signal}. Closing HTTP server...`);
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
