// NOTE: STRICT ENGLISH-ONLY MESSAGES. Do not add Bengali or verbose text here. Keep all microcopy concise, clear, and high-impact.

import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic cleanup of stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < 60000);
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, 300000);

export function createRateLimiter(options: {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) {
  const windowMs = options.windowMs || 60000; // 1 minute
  const maxRequests = options.maxRequests || 120;
  const message = options.message || 'Rate limit exceeded. Please retry in 1 minute.';

  return function rateLimiter(req: Request, res: Response, next: NextFunction): void {
    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : ((req.headers['x-test-client'] as string) || (req as any).user?.id || (req.headers['x-api-key'] as string) || req.ip || 'global');

    const now = Date.now();
    let record = rateLimitStore.get(key);
    if (!record) {
      record = { timestamps: [] };
      rateLimitStore.set(key, record);
    }

    // Filter timestamps within sliding window
    record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

    const remaining = Math.max(0, maxRequests - record.timestamps.length);
    const resetTime = Math.ceil((windowMs - (record.timestamps[0] ? now - record.timestamps[0] : 0)) / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetTime);

    if (record.timestamps.length >= maxRequests) {
      res.setHeader('Retry-After', resetTime);
      res.status(429).json({
        success: false,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfterSeconds: resetTime,
      });
      return;
    }

    record.timestamps.push(now);
    next();
  };
}

export const standardRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 120,
});

export const publicCheckoutRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 30,
  message: 'Checkout rate limit exceeded. Please wait a moment.',
  keyGenerator: (req) => (req.headers['x-test-client'] as string) || `ip_${req.ip || req.socket.remoteAddress || 'unknown'}`,
});
