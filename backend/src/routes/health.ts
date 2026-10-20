import { Router, Request, Response, NextFunction } from 'express';
import { checkDatabaseConnection } from '../db';

export const healthRouter = Router();

/**
 * Basic service health check.
 * Verifies that the Express application is running and responding.
 */
healthRouter.get('/', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Database connectivity health check.
 * Verifies live connection to PostgreSQL (Neon) when configured.
 */
healthRouter.get('/db', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const dbHealth = await checkDatabaseConnection();

    if (!dbHealth.configured) {
      res.status(200).json({
        status: 'unavailable',
        database: 'not_configured',
        message: 'DATABASE_URL is not configured',
      });
      return;
    }

    if (dbHealth.connected) {
      res.status(200).json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Do not expose sensitive internal error details to API consumers
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      message: 'Database connection failed',
    });
  } catch (err) {
    next(err);
  }
});
