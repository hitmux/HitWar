import { describe, expect, it } from 'vitest';

import {
  collides,
  sweepCollides,
  sweepCollidesRelative,
  sweepCollisionTime,
} from './circleCollision.js';

describe('collides', () => {
  it('detects overlap and exact tangent contact', () => {
    expect(collides(0, 0, 5, 9, 0, 5)).toBe(true);
    expect(collides(0, 0, 5, 10, 0, 5)).toBe(true);
  });

  it.each([
    [0, 0, 1, 1, 1, 1],
    [-5, -5, 3, -1, -5, 1],
    [2, 3, 0, 2, 3, 0],
  ])('detects representative static collisions %#', (x1, y1, r1, x2, y2, r2) => {
    expect(collides(x1, y1, r1, x2, y2, r2)).toBe(true);
    expect(collides(x2, y2, r2, x1, y1, r1)).toBe(true);
  });

  it('rejects separated circles', () => {
    expect(collides(0, 0, 5, 10.01, 0, 5)).toBe(false);
  });

  it.each([
    [0, 0, 2, 0, 5, 2],
    [-4, -4, 1, -1.9, -4, 1],
    [10, 10, 0, 10.01, 10, 0],
  ])('rejects representative separated circles %#', (x1, y1, r1, x2, y2, r2) => {
    expect(collides(x1, y1, r1, x2, y2, r2)).toBe(false);
  });
});

describe('sweepCollides', () => {
  it('returns true when start or end point is already colliding', () => {
    expect(sweepCollides(0, 0, 10, 0, 2, 0, 0, 2)).toBe(true);
    expect(sweepCollides(-10, 0, 0, 0, 2, 0, 0, 2)).toBe(true);
  });

  it('detects a collision along the segment even when endpoints are outside', () => {
    expect(sweepCollides(-10, 0, 10, 0, 1, 0, 0, 1)).toBe(true);
  });

  it.each([
    [-10, 2, 10, 2, 1, 0, 0, 1],
    [-10, -2, 10, 2, 1, 0, 0, 1],
    [0, -10, 0, 10, 2, 3, 0, 1],
  ])('detects tangent and diagonal sweep collisions %#', (x1, y1, x2, y2, movingR, cx, cy, targetR) => {
    expect(sweepCollides(x1, y1, x2, y2, movingR, cx, cy, targetR)).toBe(true);
  });

  it('rejects misses and zero-length non-colliding movement', () => {
    expect(sweepCollides(-10, 5, 10, 5, 1, 0, 0, 1)).toBe(false);
    expect(sweepCollides(10, 10, 10, 10, 1, 0, 0, 1)).toBe(false);
  });

  it.each([
    [-10, 2.01, 10, 2.01, 1, 0, 0, 1],
    [-10, -4, -5, -4, 1, 0, 0, 1],
    [5, 5, 10, 10, 1, 0, 0, 1],
  ])('rejects representative sweep misses %#', (x1, y1, x2, y2, movingR, cx, cy, targetR) => {
    expect(sweepCollides(x1, y1, x2, y2, movingR, cx, cy, targetR)).toBe(false);
  });
});

describe('sweepCollidesRelative', () => {
  it('detects collisions using relative motion between two moving circles', () => {
    expect(sweepCollidesRelative(-10, 0, 0, 0, 1, 10, 0, 0, 0, 1)).toBe(true);
  });

  it('rejects moving circles that keep the same separation', () => {
    expect(sweepCollidesRelative(0, 0, 10, 0, 1, 5, 0, 15, 0, 1)).toBe(false);
  });

  it.each([
    [-5, 0, 5, 0, 1, 5, 0, -5, 0, 1],
    [0, -5, 0, 5, 1, 0, 5, 0, -5, 1],
    [-10, 1, 0, 1, 1, 10, -1, 0, -1, 1],
  ])('detects relative collisions for opposing movement %#', (...args) => {
    expect(sweepCollidesRelative(...args)).toBe(true);
  });

  it.each([
    [0, 0, 0, 5, 1, 5, 0, 5, 5, 1],
    [-5, 5, 5, 5, 1, 5, -5, -5, -5, 1],
  ])('rejects relative movement misses %#', (...args) => {
    expect(sweepCollidesRelative(...args)).toBe(false);
  });
});

describe('sweepCollisionTime', () => {
  it('returns zero when already colliding at the start', () => {
    expect(sweepCollisionTime(0, 0, 10, 0, 2, 0, 0, 2)).toBe(0);
  });

  it('returns the first collision time in the [0, 1] segment range', () => {
    expect(sweepCollisionTime(-10, 0, 10, 0, 1, 0, 0, 1)).toBeCloseTo(0.4);
  });

  it.each([
    [-10, 2, 10, 2, 1, 0, 0, 1, 0.5],
    [-10, 0, 0, 0, 1, 0, 0, 1, 0.8],
    [0, -10, 0, 10, 2, 3, 0, 1, 0.5],
  ])('returns first collision time for representative sweeps %#', (x1, y1, x2, y2, movingR, cx, cy, targetR, expected) => {
    expect(sweepCollisionTime(x1, y1, x2, y2, movingR, cx, cy, targetR)).toBeCloseTo(expected);
  });

  it('returns -1 for misses, zero-length non-collisions, and collisions outside the segment', () => {
    expect(sweepCollisionTime(-10, 5, 10, 5, 1, 0, 0, 1)).toBe(-1);
    expect(sweepCollisionTime(10, 10, 10, 10, 1, 0, 0, 1)).toBe(-1);
    expect(sweepCollisionTime(-10, 0, -5, 0, 1, 0, 0, 1)).toBe(-1);
  });

  it.each([
    [-10, 2.01, 10, 2.01, 1, 0, 0, 1],
    [3, 0, 8, 0, 1, 0, 0, 1],
    [0, 3, 0, 8, 1, 0, 0, 1],
  ])('returns -1 for representative non-colliding times %#', (x1, y1, x2, y2, movingR, cx, cy, targetR) => {
    expect(sweepCollisionTime(x1, y1, x2, y2, movingR, cx, cy, targetR)).toBe(-1);
  });
});
