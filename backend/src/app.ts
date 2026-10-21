import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health';
import { createPlansRouter, plansRouter } from './routes/plans';
import { GeminiClientLike } from './services/geminiService';
import { GeminiPlanCache } from './services/geminiCache';
import { config } from './config';

export interface AppOptions {
  planRateLimitMax?: number;
  geminiClient?: GeminiClientLike | null;
  geminiCache?: GeminiPlanCache;
}

export function createApp(options?: AppOptions): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS restriction (stateless API does not use cookies or cross-site credentials)
  app.use(
    cors({
      origin: config.corsOrigin,
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
    options?.planRateLimitMax !== undefined ||
    options?.geminiClient !== undefined ||
    options?.geminiCache !== undefined
      ? createPlansRouter({
          maxRequests: options?.planRateLimitMax,
          geminiClient: options?.geminiClient,
          geminiCache: options?.geminiCache,
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

  // Global error handler - guarantees sanitized 500 JSON response without stack traces
  app.use((_err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
    res.status(500).json({
      success: false,
      error: 'An internal server error occurred.',
    });
  });

  return app;
}

export const app: Express = createApp();
