import { describe, expect, it } from 'vitest';

import {
  TowerNumPriceAdded,
  TowerNumPriceAdded2,
  levelAddPrice,
  levelAddPriceHard,
  levelAddPriceNormal,
  levelCollideAdded,
  levelCollideAddedHard,
  levelMonsterFlowNum,
  levelMonsterFlowNumHard,
  levelMonsterHpAddedEasy,
  levelMonsterHpAddedHard,
  levelMonsterHpAddedNormal,
  levelT800Count,
  levelT800CountHard,
  tickAddMonsterNumEasy,
  tickAddMonsterNumHard,
  tickMonsterHpAddedEasy,
  tickMonsterHpAddedHard,
  timeAddPrise,
  timeHellTowerDamage,
  timeHellTowerDamage_E,
  timeMonsterAddedNum,
  timeMonsterAtt,
  timeMonsterHp,
  timeRateAlpha,
  timeRateAlphaDownFast,
} from './gameBalance.js';

describe('monster stat scaling formulas', () => {
  it('scales simple time-based monster stats linearly', () => {
    expect(timeMonsterHp(0)).toBe(0);
    expect(timeMonsterHp(30)).toBe(10);
    expect(timeMonsterAtt(25)).toBe(5);
  });

  it('clamps easy and normal level HP bonuses while hard remains uncapped', () => {
    expect(levelMonsterHpAddedEasy(1_000)).toBe(5_000);
    expect(levelMonsterHpAddedNormal(1_000)).toBe(100_000);
    expect(levelMonsterHpAddedHard(1_000)).toBeGreaterThan(100_000);
  });

  it('keeps HP growth non-decreasing across representative levels and ticks', () => {
    expect(levelMonsterHpAddedEasy(20)).toBeGreaterThanOrEqual(levelMonsterHpAddedEasy(10));
    expect(levelMonsterHpAddedNormal(20)).toBeGreaterThanOrEqual(levelMonsterHpAddedNormal(10));
    expect(levelMonsterHpAddedHard(20)).toBeGreaterThanOrEqual(levelMonsterHpAddedHard(10));
    expect(tickMonsterHpAddedEasy(1_000)).toBeGreaterThanOrEqual(tickMonsterHpAddedEasy(500));
    expect(tickMonsterHpAddedHard(1_000)).toBeGreaterThanOrEqual(tickMonsterHpAddedHard(500));
  });

  it.each([
    [0, 0],
    [3, 1],
    [300, 100],
  ])('calculates timeMonsterHp for representative ticks %#', (tick, expected) => {
    expect(timeMonsterHp(tick)).toBe(expected);
  });

  it.each([
    [0, 0],
    [5, 1],
    [250, 50],
  ])('calculates timeMonsterAtt for representative ticks %#', (tick, expected) => {
    expect(timeMonsterAtt(tick)).toBe(expected);
  });

  it.each([1, 2, 5, 10, 50])('keeps level HP formulas finite and non-negative at level %s', (level) => {
    expect(levelMonsterHpAddedEasy(level)).toBeGreaterThanOrEqual(0);
    expect(levelMonsterHpAddedNormal(level)).toBeGreaterThanOrEqual(0);
    expect(levelMonsterHpAddedHard(level)).toBeGreaterThanOrEqual(0);
  });

  it.each([0, 1, 500, 2_000, 10_000])('keeps tick HP formulas finite and non-negative at tick %s', (tick) => {
    expect(tickMonsterHpAddedEasy(tick)).toBeGreaterThanOrEqual(0);
    expect(tickMonsterHpAddedHard(tick)).toBeGreaterThanOrEqual(0);
  });
});

describe('wave and spawn-count formulas', () => {
  it('keeps wave flow counts above the one-monster floor for zero and positive levels', () => {
    expect(levelMonsterFlowNum(0)).toBeGreaterThanOrEqual(1);
    expect(levelMonsterFlowNumHard(0)).toBeGreaterThanOrEqual(1);
    expect(levelMonsterFlowNum(1)).toBeGreaterThanOrEqual(1);
    expect(levelMonsterFlowNumHard(1)).toBeGreaterThanOrEqual(1);
  });

  it('makes hard wave flow grow faster than normal for the same high level', () => {
    expect(levelMonsterFlowNumHard(50)).toBeGreaterThan(levelMonsterFlowNum(50));
  });

  it('calculates tick-based spawn counts with the configured divisors', () => {
    expect(tickAddMonsterNumEasy(199)).toBe(0);
    expect(tickAddMonsterNumEasy(200)).toBe(1);
    expect(tickAddMonsterNumHard(179)).toBe(0);
    expect(tickAddMonsterNumHard(180)).toBe(1);
  });

  it('documents current time-based spawn count floor behavior', () => {
    expect(timeMonsterAddedNum(0)).toBe(0);
    expect(timeMonsterAddedNum(20)).toBe(1);
  });

  it('caps normal T800 counts but leaves hard mode uncapped', () => {
    expect(levelT800Count(0)).toBe(1);
    expect(levelT800Count(1_000)).toBe(10);
    expect(levelT800CountHard(0)).toBe(1);
    expect(levelT800CountHard(1_000)).toBeGreaterThan(10);
  });

  it.each([0, 1, 5, 20, 100])('keeps normal and hard flow counts above one at level %s', (level) => {
    expect(levelMonsterFlowNum(level)).toBeGreaterThanOrEqual(1);
    expect(levelMonsterFlowNumHard(level)).toBeGreaterThanOrEqual(1);
  });

  it.each([
    [0, 0, 0],
    [179, 0, 0],
    [180, 0, 1],
    [200, 1, 1],
    [400, 2, 2],
  ])('calculates tick spawn counts near divisor thresholds %#', (tick, easy, hard) => {
    expect(tickAddMonsterNumEasy(tick)).toBe(easy);
    expect(tickAddMonsterNumHard(tick)).toBe(hard);
  });

  it.each([
    [0, 0],
    [20, 1],
    [640, 2],
  ])('documents timeMonsterAddedNum outputs %#', (tick, expected) => {
    expect(timeMonsterAddedNum(tick)).toBe(expected);
  });

  it.each([0, 1, 10, 100, 1_000])('keeps T800 count floors and caps for level %s', (level) => {
    expect(levelT800Count(level)).toBeGreaterThanOrEqual(1);
    expect(levelT800Count(level)).toBeLessThanOrEqual(10);
    expect(levelT800CountHard(level)).toBeGreaterThanOrEqual(1);
  });
});

describe('reward and economy formulas', () => {
  it('uses a minimum kill reward of one for early ticks', () => {
    expect(timeAddPrise(0)).toBe(1);
    expect(timeAddPrise(1)).toBe(1);
    expect(timeAddPrise(1_000)).toBe(3);
  });

  it('keeps easy wave reward above normal and hard for representative levels', () => {
    expect(levelAddPrice(20)).toBeGreaterThan(levelAddPriceNormal(20));
    expect(levelAddPriceNormal(20)).toBeGreaterThanOrEqual(levelAddPriceHard(20));
  });

  it('keeps tower count surcharge at zero until its threshold', () => {
    expect(TowerNumPriceAdded(7)).toBe(0);
    expect(TowerNumPriceAdded(8)).toBe(0);
    expect(TowerNumPriceAdded(9)).toBe(5);
    expect(TowerNumPriceAdded2(5)).toBe(0);
    expect(TowerNumPriceAdded2(6)).toBe(0);
    expect(TowerNumPriceAdded2(7)).toBe(1);
  });

  it.each([
    [1, 1],
    [9, 1],
    [10, 1],
    [100, 2],
    [10_000, 4],
  ])('calculates timeAddPrise at log thresholds %#', (tick, expected) => {
    expect(timeAddPrise(tick)).toBe(expected);
  });

  it.each([2, 10, 25, 100])('keeps easy reward at least 10 at level %s', (level) => {
    expect(levelAddPrice(level)).toBeGreaterThanOrEqual(10);
  });

  it.each([
    [0, 0],
    [8, 0],
    [9, 5],
    [10, 27],
  ])('calculates TowerNumPriceAdded threshold behavior %#', (count, expected) => {
    expect(TowerNumPriceAdded(count)).toBe(expected);
  });

  it.each([
    [0, 0],
    [6, 0],
    [7, 1],
    [10, 10],
  ])('calculates TowerNumPriceAdded2 threshold behavior %#', (count, expected) => {
    expect(TowerNumPriceAdded2(count)).toBe(expected);
  });
});

describe('combat and effect formulas', () => {
  it('makes hard collision damage grow faster than normal', () => {
    expect(levelCollideAddedHard(10)).toBeGreaterThan(levelCollideAdded(10));
  });

  it('calculates hell tower damage variants from their formulas', () => {
    expect(timeHellTowerDamage(10)).toBe(0.1);
    expect(timeHellTowerDamage_E(0)).toBe(1 / 100000_0000);
  });

  it('fades alpha from max at zero progress to zero at complete progress', () => {
    expect(timeRateAlpha(0)).toBe(0.25);
    expect(timeRateAlpha(1)).toBe(0);
    expect(timeRateAlphaDownFast(0)).toBe(0.0625);
    expect(timeRateAlphaDownFast(1)).toBe(0);
    expect(timeRateAlphaDownFast(0.5)).toBeLessThan(timeRateAlpha(0.5));
  });

  it.each([1, 5, 20, 100])('keeps hard collision damage at least normal at level %s', (level) => {
    expect(levelCollideAddedHard(level)).toBeGreaterThanOrEqual(levelCollideAdded(level));
  });

  it.each([
    [0, 0],
    [10, 0.1],
    [100, 10],
  ])('calculates quadratic hell tower damage %#', (tick, expected) => {
    expect(timeHellTowerDamage(tick)).toBe(expected);
  });

  it.each([
    [0, 0.25, 0.0625],
    [0.25, 0.1875, 0.03515625],
    [0.75, 0.0625, 0.00390625],
    [1, 0, 0],
  ])('calculates alpha fade curves %#', (rate, alpha, fastAlpha) => {
    expect(timeRateAlpha(rate)).toBe(alpha);
    expect(timeRateAlphaDownFast(rate)).toBe(fastAlpha);
  });
});
