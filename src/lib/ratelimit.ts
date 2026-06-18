import { NextRequest } from "next/server";

// In-memory rate limiter for development.
// For production set RATE_LIMIT_DRIVER=upstash and provide Upstash credentials.
const store = new Map<string, { count: number; reset: number }>();

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export function rateLimit(config: RateLimitConfig) {
  return {
    check(req: NextRequest): { success: boolean; remaining: number } {
      const key = getIP(req);
      const now = Date.now();
      const entry = store.get(key);

      if (!entry || now > entry.reset) {
        store.set(key, { count: 1, reset: now + config.windowMs });
        return { success: true, remaining: config.maxRequests - 1 };
      }

      entry.count++;
      if (entry.count > config.maxRequests) {
        return { success: false, remaining: 0 };
      }
      return { success: true, remaining: config.maxRequests - entry.count };
    },
  };
}

export const authLimiter = rateLimit({ maxRequests: 10, windowMs: 60_000 });
export const spinLimiter = rateLimit({ maxRequests: 60, windowMs: 60_000 });
export const generalLimiter = rateLimit({ maxRequests: 120, windowMs: 60_000 });
