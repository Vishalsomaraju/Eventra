import { Router, Request, Response, NextFunction } from 'express';
import { validatePlanInput } from '../validators/planValidator';
import { generateEventPlan, GeminiClientLike } from '../services/geminiService';
import { GeminiPlanCache } from '../services/geminiCache';
import { createRateLimiter } from '../middleware/rateLimiter';

export interface PlansRouterOptions {
  maxRequests?: number;
  windowMs?: number;
  geminiClient?: GeminiClientLike | null;
  geminiCache?: GeminiPlanCache;
}

export function createPlansRouter(options?: PlansRouterOptions): Router {
  const router = Router();

  const maxRequests = options?.maxRequests ?? 30;
  const windowMs = options?.windowMs ?? 60_000;
  const routerCache =
    options?.geminiCache ?? (options?.geminiClient !== undefined ? new GeminiPlanCache() : undefined);

  // Apply IP-based rate limiting
  const planGenerationLimiter = createRateLimiter({
    windowMs,
    maxRequests,
    message: 'Too many plan generation requests from this IP. Please try again after 60 seconds.',
  });

  /**
   * POST /api/plans/generate
   * Generates a celebration plan using Google Gemini AI, with automatic
   * fallback to rule-based generation if AI is unconfigured or unavailable.
   */
  router.post(
    '/generate',
    planGenerationLimiter,
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        // Validate Content-Type for requests with body payload
        const rawContentType = req.headers['content-type'];
        const contentType = Array.isArray(rawContentType) ? rawContentType[0] : rawContentType;
        const contentLength = req.headers['content-length'];
        const parsedLength = contentLength ? parseInt(contentLength, 10) : 0;
        const hasBody =
          (!isNaN(parsedLength) && parsedLength > 0) ||
          Boolean(req.body && Object.keys(req.body).length > 0);

        if (hasBody) {
          if (!contentType || typeof contentType !== 'string' || !contentType.toLowerCase().includes('application/json')) {
            res.status(415).json({
              success: false,
              error: 'Unsupported Media Type: Content-Type must be application/json.',
            });
            return;
          }
        }

        const validation = validatePlanInput(req.body);

        if (!validation.valid || !validation.data) {
          res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: validation.errors,
          });
          return;
        }

        // Generate plan using Gemini AI (with automatic fallback to rule-based)
        const plan = await generateEventPlan(validation.data, options?.geminiClient, {
          cache: routerCache,
        });

        res.status(200).json({
          success: true,
          data: plan,
        });
      } catch (err) {
        // Pass unhandled async errors to Express's global error handler
        next(err);
      }
    }
  );

  return router;
}

export const plansRouter = createPlansRouter();
