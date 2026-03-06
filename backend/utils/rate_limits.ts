import { RequestHandler } from "express";

import { config } from "../config/env";

type BucketState = {
  tokens: number;
  lastRefill: number;
  lastSeen: number;
};

export class RateLimits {
  private readonly capacity: number;
  private readonly refillRate: number;
  private readonly buckets = new Map<string, BucketState>(); // LRU
  private readonly bucketIdleTtlMs: number;
  private readonly maxBuckets: number;
  private lastCleanupAt = 0;

  private static readonly DEFAULT_BUCKET_IDLE_TTL_MS = 30 * 60 * 1000;
  private static readonly DEFAULT_MAX_BUCKETS = 20_000;
  private static readonly CLEANUP_INTERVAL_MS = 60 * 1000;

  constructor(
    capacity = config.tokenBucket.capacity,
    refillRate = config.tokenBucket.refillRate,
  ) {
    this.capacity = capacity;
    this.refillRate = refillRate;
    this.bucketIdleTtlMs = RateLimits.DEFAULT_BUCKET_IDLE_TTL_MS;
    this.maxBuckets = RateLimits.DEFAULT_MAX_BUCKETS;
  }

  private getOrCreateBucket(scope: string, ip: string, now: number) {
    const key = `${scope}:${ip}`;
    let bucket = this.buckets.get(key);

    if (!bucket) {
      this.lruClean(); // clean before adding
      bucket = {
        tokens: this.capacity,
        lastRefill: now,
        lastSeen: now,
      };
    } else {
      this.buckets.delete(key);
    }

    this.buckets.set(key, bucket);

    return bucket;
  }

  private refill(bucket: BucketState, now: number) {
    const timeElapsedMs = now - bucket.lastRefill;
    const tokensToAdd = (timeElapsedMs / 1000) * this.refillRate;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
    bucket.lastSeen = now;
  }

  private cleanupBuckets(now: number) {
    if (now - this.lastCleanupAt < RateLimits.CLEANUP_INTERVAL_MS) {
      return;
    }

    this.lastCleanupAt = now;

    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastSeen > this.bucketIdleTtlMs) {
        this.buckets.delete(key);
      }
    }

    if (this.buckets.size <= this.maxBuckets) {
      return;
    }

    this.lruClean();
  }

  private lruClean() {
    while (this.buckets.size >= this.maxBuckets) {
      const oldestKey = this.buckets.keys().next().value;
      if (!oldestKey) {
        break;
      }
      this.buckets.delete(oldestKey);
    }

  }

  private shouldAllowReq(scope: string, ip: string, cost: number) {
    const now = Date.now();
    this.cleanupBuckets(now);

    const bucket = this.getOrCreateBucket(scope, ip, now);

    this.refill(bucket, now);

    if (bucket.tokens < cost) {
      return false;
    }

    bucket.tokens -= cost;

    return true;
  }

  private createTokenBucketMiddleware = (
    scope: string,
    cost: number,
    message = "Too many requests, please try again later.",
  ): RequestHandler => {
    return (req, res, next) => {
      const ip = req.ip || req.socket.remoteAddress || "unknown";

      if (this.shouldAllowReq(scope, ip, cost)) {
        next();
        return;
      }

      res.status(429).json({ error: message });
    };
  };

  public readonly generalRateLimiter = this.createTokenBucketMiddleware(
    "general",
    config.tokenBucket.costByRoute.general,
    "Rate limit reached for general requests. Please try again later.",
  );

  public readonly auditRateLimiter = this.createTokenBucketMiddleware(
    "audit",
    config.tokenBucket.costByRoute.audit,
    "Rate limit reached for audit requests. Please try again later.",
  );

  public readonly aiRateLimiter = this.createTokenBucketMiddleware(
    "summary",
    config.tokenBucket.costByRoute.summary,
    "Rate limit reached for AI summary requests. Please try again later.",
  );

  public readonly fixPlanRateLimiter = this.createTokenBucketMiddleware(
    "fixplan",
    config.tokenBucket.costByRoute.fixplan,
    "Rate limit reached for fix plan requests. Please try again later.",
  );

  public readonly inlineAiRateLimiter = this.createTokenBucketMiddleware(
    "inline",
    config.tokenBucket.costByRoute.inline,
    "Rate limit reached for inline AI requests. Please try again later.",
  );

  getSnapshot = () => {
    this.cleanupBuckets(Date.now());

    return {
      capacity: this.capacity,
      refillRate: this.refillRate,
      activeBuckets: this.buckets.size,
    };
  };
}

export const rateLimits = new RateLimits();