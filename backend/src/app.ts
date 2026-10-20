import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health';
import { createPlansRouter, plansRouter } from './routes/plans';
import { GeminiClientLike } from './services/geminiService';
import { config } from './config';

export interface AppOptions {
  planRateLimitMax?: number;
  geminiClient?: GeminiClientLike | null;
}

export function createApp(options?: AppOptions): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS restriction
  app.use(
    cors({
      origin: config.corsOrigin,
      credentials: true,
    })
  );

  // Safe body parsing limit (restricted to 50kb to prevent payload denial-of-service)
  app.use(express.json({ limit: '50kb' }));

  // Middleware to catch malformed JSON syntax errors safely
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction): void => {
    if (
      err instanceof SyntaxError &&
      'status' in err &&
      (err as { status: number }).status === 400
    ) {
      res.status(400).json({
        success: false,
        error: 'Malformed JSON in request body.',
      });
      return;
    }
    next(err);
  });

  // Health check routes
  app.use('/api/health', healthRouter);
  app.use('/health', healthRouter);

  // Planning API route (supports rate limit and mock Gemini injection for testing)
  const activePlansRouter =
    options?.planRateLimitMax !== undefined || options?.geminiClient !== undefined
      ? createPlansRouter({
          maxRequests: options?.planRateLimitMax,
          geminiClient: options?.geminiClient,
        })
      : plansRouter;

  app.use('/api/plans', activePlansRouter);

  // 404 handler for undefined routes
  app.use((_req: Request, res: Response): void => {
    res.status(404).json({
      success: false,
      error: 'Endpoint not found',
    });
  });

  return app;
}

export const app: Express = createApp();
