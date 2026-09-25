import { describe, expect, it } from 'vitest';

import {
  DEFAULT_TOWER_TARGET_WEIGHTS,
  calcMonsterTargetScore,
  type TargetWeights,
} from './targetScoring.js';

describe('calcMonsterTargetScore', () => {
  it('combines distance, HP, and threat scores with default weights', () => {
    expect(calcMonsterTargetScore(25, 100, 25, 100, 5, 10)).toBeCloseTo(0.7);
  });

  it('clamps distance and threat scores at their upper bounds', () => {
    expect(calcMonsterTargetScore(400, 100, 100, 100, 50, 10)).toBeCloseTo(DEFAULT_TOWER_TARGET_WEIGHTS.threat);
  });

  it('returns zero contribution for distance, HP, and threat when denominators are invalid', () => {
    expect(calcMonsterTargetScore(10, 0, 10, 0, 10, 0)).toBe(0);
    expect(calcMonsterTargetScore(10, -1, 10, -1, 10, -1)).toBe(0);
  });

  it('supports custom weights for distance-only targeting', () => {
    const weights: TargetWeights = { distance: 1, hp: 0, threat: 0 };

    expect(calcMonsterTargetScore(0, 100, 100, 100, 0, 10, weights)).toBe(1);
    expect(calcMonsterTargetScore(100, 100, 0, 100, 10, 10, weights)).toBe(0);
  });

  it('ranks closer, weaker, and faster targets higher when other inputs match', () => {
    expect(calcMonsterTargetScore(10, 100, 50, 100, 5, 10)).toBeGreaterThan(
      calcMonsterTargetScore(50, 100, 50, 100, 5, 10),
    );
    expect(calcMonsterTargetScore(25, 100, 10, 100, 5, 10)).toBeGreaterThan(
      calcMonsterTargetScore(25, 100, 90, 100, 5, 10),
    );
    expect(calcMonsterTargetScore(25, 100, 50, 100, 9, 10)).toBeGreaterThan(
      calcMonsterTargetScore(25, 100, 50, 100, 1, 10),
    );
  });

  it.each([
    [0, 100, 100, 100, 0, 10, 0.5],
    [50, 100, 100, 100, 0, 10, 0.25],
    [100, 100, 100, 100, 0, 10, 0],
  ])('scores distance contribution with default weights %#', (distSq, attackRadiusSq, hp, maxHp, speed, maxSpeed, expected) => {
    expect(calcMonsterTargetScore(distSq, attackRadiusSq, hp, maxHp, speed, maxSpeed)).toBeCloseTo(expected);
  });

  it.each([
    [0, 100, 0, 100, 0, 10, 0.8],
    [0, 100, 50, 100, 0, 10, 0.65],
    [0, 100, 100, 100, 0, 10, 0.5],
  ])('scores HP contribution with default weights %#', (distSq, attackRadiusSq, hp, maxHp, speed, maxSpeed, expected) => {
    expect(calcMonsterTargetScore(distSq, attackRadiusSq, hp, maxHp, speed, maxSpeed)).toBeCloseTo(expected);
  });

  it.each([
    [100, 100, 100, 100, 0, 10, 0],
    [100, 100, 100, 100, 5, 10, 0.1],
    [100, 100, 100, 100, 10, 10, 0.2],
    [100, 100, 100, 100, 15, 10, 0.2],
  ])('scores threat contribution with default weights %#', (distSq, attackRadiusSq, hp, maxHp, speed, maxSpeed, expected) => {
    expect(calcMonsterTargetScore(distSq, attackRadiusSq, hp, maxHp, speed, maxSpeed)).toBeCloseTo(expected);
  });

  it('allows custom weights to over- or under-weight score components', () => {
    const weights: TargetWeights = { distance: 0.2, hp: 0.7, threat: 0.1 };

    expect(calcMonsterTargetScore(25, 100, 25, 100, 5, 10, weights)).toBeCloseTo(0.725);
  });

  it('documents current unclamped HP behavior for overhealed targets', () => {
    expect(calcMonsterTargetScore(0, 100, 150, 100, 0, 10)).toBeCloseTo(0.35);
  });
});
