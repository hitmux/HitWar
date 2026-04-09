/**
 * Per-client Rate Limiter using Token Bucket algorithm.
 * Prevents message flooding / DoS from malicious clients.
 */

/** Configuration for a single message type's rate limit */
export interface RateLimitConfig {
  /** Maximum requests allowed per second */
  readonly maxPerSecond: number;
  /** Maximum burst size (tokens that can accumulate) */
  readonly burst: number;
}

/** Internal bucket state per client per message type */
interface TokenBucket {
  tokens: number;
  lastRefillTick: number;
}

/** Rate limit configurations for all throttled message types */
export const MESSAGE_RATE_LIMITS: Record<string, RateLimitConfig> = {
  // Building actions - moderate frequency
  build_tower: { maxPerSecond: 10, burst: 3 },
  build_building: { maxPerSecond: 10, burst: 3 },
  upgrade_tower: { maxPerSecond: 10, burst: 3 },
  sell_tower: { maxPerSecond: 10, burst: 3 },

  // Combat actions - higher frequency for cannon
  cannon_fire: { maxPerSecond: 20, burst: 5 },
  cannon_set_auto_target: { maxPerSecond: 10, burst: 3 },

  // Spawner actions - lower frequency
  spawn_monster: { maxPerSecond: 5, burst: 2 },

  // Mine actions - moderate frequency
  upgrade_mine: { maxPerSecond: 10, burst: 3 },
  repair_mine: { maxPerSecond: 10, burst: 3 },
  downgrade_mine: { maxPerSecond: 10, burst: 3 },
  sell_mine: { maxPerSecond: 10, burst: 3 },

  // Vision actions
  upgrade_vision: { maxPerSecond: 5, burst: 2 },

  // Game control - very low frequency
  surrender: { maxPerSecond: 1, burst: 1 },
  player_ready: { maxPerSecond: 3, burst: 2 },
  player_not_ready: { maxPerSecond: 3, burst: 2 },
};

export class RateLimiter {
  /** Map: clientSessionId -> messageType -> TokenBucket */
  private buckets = new Map<string, Map<string, TokenBucket>>();

  /** Server tick rate (ticks per second) */
  private readonly tickRate: number;

  /** Current server tick, updated via setCurrentTick() */
  private currentTick = 0;

  constructor(tickRate: number) {
    this.tickRate = tickRate;
  }

  /** Update the current tick from the game loop */
  setCurrentTick(tick: number): void {
    this.currentTick = tick;
  }

  /**
   * Check if a message from a client is allowed under rate limits.
   * Returns true if allowed, false if rate-limited.
   */
  consume(clientId: string, messageType: string): boolean {
    const config = MESSAGE_RATE_LIMITS[messageType];
    // No config = no rate limit for this message type
    if (!config) return true;

    const clientBuckets = this.getOrCreateClientBuckets(clientId);
    const bucket = this.getOrCreateBucket(clientBuckets, messageType, config);

    this.refill(bucket, config);

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    return false;
  }

  /** Remove all buckets for a disconnected client */
  removeClient(clientId: string): void {
    this.buckets.delete(clientId);
  }

  /** Clear all state (e.g. on room dispose) */
  clear(): void {
    this.buckets.clear();
  }

  private getOrCreateClientBuckets(clientId: string): Map<string, TokenBucket> {
    let map = this.buckets.get(clientId);
    if (!map) {
      map = new Map();
      this.buckets.set(clientId, map);
    }
    return map;
  }

  private getOrCreateBucket(
    clientBuckets: Map<string, TokenBucket>,
    messageType: string,
    config: RateLimitConfig
  ): TokenBucket {
    let bucket = clientBuckets.get(messageType);
    if (!bucket) {
      bucket = { tokens: config.burst, lastRefillTick: this.currentTick };
      clientBuckets.set(messageType, bucket);
    }
    return bucket;
  }

  private refill(bucket: TokenBucket, config: RateLimitConfig): void {
    const elapsedTicks = this.currentTick - bucket.lastRefillTick;
    if (elapsedTicks <= 0) return;

    const elapsedSeconds = elapsedTicks / this.tickRate;
    const refillAmount = elapsedSeconds * config.maxPerSecond;

    bucket.tokens = Math.min(config.burst, bucket.tokens + refillAmount);
    bucket.lastRefillTick = this.currentTick;
  }
}
