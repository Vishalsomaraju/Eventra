import { Router, Request, Response } from 'express';

export const healthRouter = Router();

/**
 * Basic service health check.
 * Verifies that the application is running and responding.
 */
healthRouter.get('/', (_req: Request, res: Response): void => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
