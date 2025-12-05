/**
 * Simple in-memory rate limiter for expensive API operations
 * Prevents abuse of Whisper and GPT-4 APIs
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory store: userId -> operation -> record
const rateLimitStore = new Map<string, Map<string, RateLimitRecord>>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

// Default configs for expensive operations
export const RATE_LIMITS = {
  transcribe: {
    maxRequests: 10, // 10 transcriptions per hour
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  analyzeSOAP: {
    maxRequests: 15, // 15 SOAP generations per hour
    windowMs: 60 * 60 * 1000, // 1 hour
  },
} as const;

/**
 * Check if user has exceeded rate limit for operation
 * @returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  userId: number,
  operation: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number; resetIn: number } {
  const key = `${userId}`;
  const now = Date.now();

  // Get or create user's rate limit map
  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, new Map());
  }
  const userLimits = rateLimitStore.get(key)!;

  // Get or create operation record
  let record = userLimits.get(operation);

  // Reset if window expired
  if (!record || now >= record.resetAt) {
    record = {
      count: 0,
      resetAt: now + config.windowMs,
    };
    userLimits.set(operation, record);
  }

  // Check if allowed
  const allowed = record.count < config.maxRequests;

  // Increment if allowed
  if (allowed) {
    record.count++;
  }

  const remaining = Math.max(0, config.maxRequests - record.count);
  const resetIn = Math.max(0, Math.ceil((record.resetAt - now) / 1000)); // seconds

  return {
    allowed,
    remaining,
    resetAt: record.resetAt,
    resetIn,
  };
}

/**
 * tRPC middleware for rate limiting
 */
export function rateLimitMiddleware(operation: string, config: RateLimitConfig) {
  return async ({ ctx, next }: any) => {
    if (!ctx.user) {
      // Rate limiting only applies to authenticated users
      return next();
    }

    const result = checkRateLimit(ctx.user.id, operation, config);

    if (!result.allowed) {
      const resetInMinutes = Math.ceil(result.resetIn / 60);
      throw new Error(
        `Limite de uso excedido. Você pode fazer ${config.maxRequests} ${operation}(s) por hora. ` +
        `Tente novamente em ${resetInMinutes} minuto(s).`
      );
    }

    // Add rate limit info to response headers (informational)
    if (ctx.res) {
      ctx.res.setHeader("X-RateLimit-Limit", config.maxRequests);
      ctx.res.setHeader("X-RateLimit-Remaining", result.remaining);
      ctx.res.setHeader("X-RateLimit-Reset", Math.floor(result.resetAt / 1000));
    }

    return next();
  };
}

/**
 * Log rate limit event (for monitoring)
 */
export function logRateLimitEvent(userId: number, operation: string, allowed: boolean) {
  const timestamp = new Date().toISOString();
  const status = allowed ? "ALLOWED" : "BLOCKED";
  console.log(`[RateLimit] ${timestamp} - User ${userId} - ${operation} - ${status}`);
}

/**
 * Cleanup old records periodically (optional, for memory management)
 * Call this in a background job if needed
 */
export function cleanupExpiredRecords() {
  const now = Date.now();
  let cleaned = 0;

  for (const [userId, userLimits] of rateLimitStore.entries()) {
    for (const [operation, record] of userLimits.entries()) {
      if (now >= record.resetAt) {
        userLimits.delete(operation);
        cleaned++;
      }
    }

    // Remove user if no operations left
    if (userLimits.size === 0) {
      rateLimitStore.delete(userId);
    }
  }

  if (cleaned > 0) {
    console.log(`[RateLimit] Cleaned up ${cleaned} expired records`);
  }
}

// Run cleanup every hour
if (typeof setInterval !== "undefined") {
  setInterval(cleanupExpiredRecords, 60 * 60 * 1000);
}
