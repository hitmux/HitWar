import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rateLimiter.js';

describe('RateLimiter', () => {
  it('denies unknown message types and exposes configured message types', () => {
    const limiter = new RateLimiter(60);

    expect(limiter.isConfigured('build_tower')).toBe(true);
    expect(limiter.isConfigured('unknown')).toBe(false);
    expect(limiter.consume('client', 'unknown')).toBe(false);
  });

  it('uses token bucket burst limits and refills from server ticks', () => {
    const limiter = new RateLimiter(60);
    limiter.setCurrentTick(0);

    expect(limiter.consume('client', 'cannon_fire')).toBe(true);
    expect(limiter.consume('client', 'cannon_fire')).toBe(true);
    expect(limiter.consume('client', 'cannon_fire')).toBe(true);
    expect(limiter.consume('client', 'cannon_fire')).toBe(false);

    limiter.setCurrentTick(3);
    expect(limiter.consume('client', 'cannon_fire')).toBe(true);
    expect(limiter.consume('client', 'cannon_fire')).toBe(false);
  });

  it('keeps clients isolated and can migrate, remove, or clear buckets', () => {
    const limiter = new RateLimiter(60);

    expect(limiter.consume('a', 'surrender')).toBe(true);
    expect(limiter.consume('a', 'surrender')).toBe(false);
    expect(limiter.consume('b', 'surrender')).toBe(true);

    limiter.migrateClient('a', 'a-reconnected');
    expect(limiter.consume('a-reconnected', 'surrender')).toBe(false);

    limiter.removeClient('a-reconnected');
    expect(limiter.consume('a-reconnected', 'surrender')).toBe(true);

    limiter.clear();
    expect(limiter.consume('b', 'surrender')).toBe(true);
  });
});
