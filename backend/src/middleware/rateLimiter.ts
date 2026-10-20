import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTimeMs: number;
}

/**
 * In-memory IP-based rate limiter middleware.
 *
 * NOTE ON ARCHITECTURE & LIMITATIONS:
 * Counters are process-local and stored in memory. In a multi-replica or cluster
 * deployment, each process tracks its own limit independently. For distributed production
 * deployments, a shared store (such as Redis) should be used instead.
 */
export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  message?: string;
}) {
  const { windowMs, maxRequests, message } = options;
  const store = new Map<string, RateLimitRecord>();

  // Maximum number of distinct client keys allowed in memory to prevent memory exhaustion
  const MAX_STORE_SIZE = 10_000;

  // Cleanup expired entries periodically to prevent memory growth
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTimeMs) {
        store.delete(key);
      }
    }
  }, Math.max(windowMs, 60_000));

  // Do not hold process alive purely for rate limit cleanup in tests
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // Determine client identifier using Express's validated req.ip (respects trust proxy setting)
    // Avoid reading raw x-forwarded-for header directly when proxy is untrusted, which allows trivial IP spoofing
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const record = store.get(ip);

    if (!record || now > record.resetTimeMs) {
      // Evict oldest or expired keys if store reaches capacity under heavy IP flooding
      if (store.size >= MAX_STORE_SIZE) {
        for (const [key, r] of store.entries()) {
          if (now > r.resetTimeMs) {
            store.delete(key);
          }
        }
        // If still full after deleting expired, prune the oldest entry
        if (store.size >= MAX_STORE_SIZE) {
          const firstKey = store.keys().next().value;
          if (firstKey) {
            store.delete(firstKey);
          }
        }
      }

      // First request or window expired
      store.set(ip, {
        count: 1,
        resetTimeMs: now + windowMs,
      });

      res.setHeader('X-RateLimit-Limit', maxRequests.toString());
      res.setHeader('X-RateLimit-Remaining', (maxRequests - 1).toString());
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000).toString());
      next();
      return;
    }

    // Existing window
    record.count += 1;
    const remaining = Math.max(0, maxRequests - record.count);
    const retryAfterSec = Math.ceil((record.resetTimeMs - now) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTimeMs / 1000).toString());

    if (record.count > maxRequests) {
      res.setHeader('Retry-After', retryAfterSec.toString());
      res.status(429).json({
        success: false,
        error: message || 'Too many plan generation requests from this IP. Please try again later.',
      });
      return;
    }

    next();
  };
}
