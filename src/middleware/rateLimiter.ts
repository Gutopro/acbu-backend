import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../config/env";
import { AuthRequest } from "./auth";
import { cacheService } from "../utils/cache";

/**
 * Create rate limiter based on API key or IP
 */
export const createRateLimiter = (windowMs: number, maxRequests: number) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many requests, please try again later.",
        },
      });
    },
  });
};

/**
 * Rate limiter for API key-based requests
 */
export const apiKeyRateLimiter = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.apiKey) {
    return next();
  }

  const cacheKey = `rate_limit:api_key:${req.apiKey.id}`;
  const cached = await cacheService.get<{ count: number; resetAt: number }>(
    cacheKey,
  );

  const now = Date.now();
  const windowMs = config.rateLimitWindowMs;
  const maxRequests = req.apiKey.rateLimit || config.rateLimitMaxRequests;

  if (cached) {
    if (cached.resetAt > now) {
      if (cached.count >= maxRequests) {
        res.status(429).json({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "API key rate limit exceeded",
          },
        });
        return;
      }
      await cacheService.set(cacheKey, {
        count: cached.count + 1,
        resetAt: cached.resetAt,
      });
    } else {
      await cacheService.set(
        cacheKey,
        { count: 1, resetAt: now + windowMs },
        { ttl: windowMs / 1000 },
      );
    }
  } else {
    await cacheService.set(
      cacheKey,
      { count: 1, resetAt: now + windowMs },
      { ttl: windowMs / 1000 },
    );
  }

  next();
};

/**
 * Standard rate limiter for general endpoints
 */
export const standardRateLimiter = createRateLimiter(
  config.rateLimitWindowMs,
  config.rateLimitMaxRequests,
);
