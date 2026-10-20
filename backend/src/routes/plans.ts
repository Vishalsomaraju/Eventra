import { Router, Request, Response } from 'express';
import { validatePlanInput } from '../validators/planValidator';
import { generateEventPlan, GeminiClientLike } from '../services/geminiService';
import { createRateLimiter } from '../middleware/rateLimiter';

export interface PlansRouterOptions {
  maxRequests?: number;
  windowMs?: number;
  geminiClient?: GeminiClientLike | null;
}

export function createPlansRouter(options?: PlansRouterOptions): Router {
  const router = Router();

  const maxRequests = options?.maxRequests ?? 30;
  const windowMs = options?.windowMs ?? 60_000;

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
    async (req: Request, res: Response): Promise<void> => {
      // Validate Content-Type for requests with body payload
      const contentType = req.headers['content-type'];
      const contentLength = req.headers['content-length'];
      const hasBody =
        (contentLength !== undefined && parseInt(contentLength, 10) > 0) ||
        Boolean(req.body && Object.keys(req.body).length > 0);

      if (hasBody) {
        if (!contentType || !contentType.toLowerCase().includes('application/json')) {
          res.status(415).json({
            success: false,
            error: 'Unsupported Media Type: Content-Type must be application/json.',
          });
          return;
        }
      }

      try {
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
        const plan = await generateEventPlan(validation.data, options?.geminiClient);

        res.status(200).json({
          success: true,
          data: plan,
        });
      } catch {
        // Do not expose internal stack traces or database info to clients
        res.status(500).json({
          success: false,
          error: 'An internal error occurred while generating the plan.',
        });
      }
    }
  );

  return router;
}

export const plansRouter = createPlansRouter();
