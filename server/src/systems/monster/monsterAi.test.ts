import { describe, expect, it } from 'vitest';
import {
  calcBalancedTargetScore,
  calcDodgeOffset,
  calcDoubleSwingMovementOffset,
  calcExcitingMovementOffset,
  calcMovementTypeOffset,
  calcSingleProjectileDodgeVector,
  calcSuddenlyMovementOffset,
  calcSwingMovementOffset,
  calcTargetThreatScore,
  getMovementDirection,
  isEnemyOwned,
  isProjectileApproaching,
  isTargetWithinScanRange,
  isValidEnemyTarget,
  selectTargetEntity,
  selectTargetPosition,
  shouldRunAiStep,
} from './monsterAi.js';

const monster = {
  ownerId: 'p1',
  position: { x: 0, y: 0 },
  velocity: { x: 0, y: 1 },
  liveTime: 10,
};

const weights = { distance: 0.4, hp: 0.3, threat: 0.3 };

function target(id: string, ownerId: string, x: number, hp: number, extra = {}) {
  return {
    id,
    ownerId,
    hp,
    maxHp: 100,
    position: { x, y: 0 },
    radius: 10,
    damage: 10,
    clock: 10,
    ...extra,
  };
}

describe('monsterAi target selection helpers', () => {
  it.each([
    { liveTime: 0, interval: 1, expected: true },
    { liveTime: 14, interval: 7, expected: true },
    { liveTime: 15, interval: 7, expected: false },
    { liveTime: 15, interval: -1, expected: false },
  ])('evaluates AI interval case %#', ({ liveTime, interval, expected }) => {
    expect(shouldRunAiStep(liveTime, interval)).toBe(expected);
  });

  it.each([
    { x: 100, radius: 0, scanRadius: 100, expected: true },
    { x: 101, radius: 0, scanRadius: 100, expected: false },
    { x: 110, radius: 10, scanRadius: 100, expected: true },
    { x: 111, radius: 10, scanRadius: 100, expected: false },
  ])('checks radius-aware scan range case %#', ({ x, radius, scanRadius, expected }) => {
    expect(isTargetWithinScanRange(monster.position, target('case', 'p2', x, 100, { radius }), scanRadius)).toBe(expected);
  });

  it('checks enemy ownership and AI interval boundaries', () => {
    expect(isEnemyOwned({ ownerId: 'p1' }, { ownerId: 'p2' })).toBe(true);
    expect(isEnemyOwned({ ownerId: 'p1' }, { ownerId: 'p1' })).toBe(false);
    expect(shouldRunAiStep(0, 5)).toBe(true);
    expect(shouldRunAiStep(10, 5)).toBe(true);
    expect(shouldRunAiStep(11, 5)).toBe(false);
    expect(shouldRunAiStep(10, 0)).toBe(false);
  });

  it('validates target hp, ownership, and radius-adjusted scan range', () => {
    expect(isTargetWithinScanRange(monster.position, target('edge', 'p2', 110, 100), 100)).toBe(true);
    expect(isTargetWithinScanRange(monster.position, target('outside', 'p2', 111, 100), 100)).toBe(false);
    expect(isValidEnemyTarget(monster, target('valid', 'p2', 50, 10), 100)).toBe(true);
    expect(isValidEnemyTarget(monster, target('dead', 'p2', 50, 0), 100)).toBe(false);
    expect(isValidEnemyTarget(monster, target('friendly', 'p1', 50, 10), 100)).toBe(false);
    expect(isValidEnemyTarget(monster, target('far', 'p2', 200, 10), 100)).toBe(false);
  });

  it('scores target threat and balanced priority with safe fallbacks', () => {
    expect(calcTargetThreatScore(target('threat', 'p2', 10, 100, { damage: 50, clock: 5 }))).toBe(10);
    expect(calcTargetThreatScore(target('zeroClock', 'p2', 10, 100, { damage: 50, clock: 0 }))).toBe(50);
    expect(calcBalancedTargetScore(target('weak', 'p2', 10, 10), monster.position, weights)).toBeGreaterThan(
      calcBalancedTargetScore(target('healthy', 'p2', 10, 100), monster.position, weights)
    );
  });

  it('selects nearest, weakest, threat, and balanced targets', () => {
    const targets = [
      target('near', 'p2', 20, 100, { damage: 1, clock: 10 }),
      target('weak', 'p2', 80, 5, { damage: 1, clock: 10 }),
      target('threat', 'p2', 90, 80, { damage: 100, clock: 1 }),
      target('friendly', 'p1', 5, 1),
      target('dead', 'p2', 5, 0),
    ];

    expect(selectTargetEntity(monster, targets, { strategy: 'nearest', scanRadius: 100, weights })?.id).toBe('near');
    expect(selectTargetEntity(monster, targets, { strategy: 'weakest', scanRadius: 100, weights })?.id).toBe('weak');
    expect(selectTargetEntity(monster, targets, { strategy: 'threat', scanRadius: 100, weights })?.id).toBe('threat');
    expect(selectTargetEntity(monster, targets, { strategy: 'balanced', scanRadius: 100, weights })?.id).toBe('weak');
    expect(selectTargetEntity(monster, targets, { strategy: 'nearest', scanRadius: 9, weights })).toBeNull();
  });

  it('returns target positions only when the update interval allows selection', () => {
    const targets = [target('near', 'p2', 20, 100)];

    expect(selectTargetPosition(monster, targets, {
      strategy: 'nearest',
      scanRadius: 100,
      updateInterval: 5,
      weights,
    })).toEqual({ x: 20, y: 0 });
    expect(selectTargetPosition({ ...monster, liveTime: 11 }, targets, {
      strategy: 'nearest',
      scanRadius: 100,
      updateInterval: 5,
      weights,
    })).toBeNull();
  });
});

describe('monsterAi dodge helpers', () => {
  it.each([
    { position: { x: -10, y: 0 }, velocity: { x: 1, y: 0 }, expected: true },
    { position: { x: 10, y: 0 }, velocity: { x: 1, y: 0 }, expected: false },
    { position: { x: 0, y: -10 }, velocity: { x: 0, y: 1 }, expected: true },
    { position: { x: 0, y: -10 }, velocity: { x: 1, y: 0 }, expected: false },
  ])('detects projectile approach case %#', ({ position, velocity, expected }) => {
    expect(isProjectileApproaching(position, velocity, monster.position)).toBe(expected);
  });

  it('detects approaching projectiles by velocity dot product', () => {
    expect(isProjectileApproaching({ x: -10, y: 0 }, { x: 1, y: 0 }, monster.position)).toBe(true);
    expect(isProjectileApproaching({ x: -10, y: 0 }, { x: -1, y: 0 }, monster.position)).toBe(false);
    expect(isProjectileApproaching({ x: 0, y: 10 }, { x: 0, y: 0 }, monster.position)).toBe(false);
  });

  it('calculates single projectile dodge direction and ignores zero velocity', () => {
    expect(calcSingleProjectileDodgeVector(
      { position: { x: -30, y: 0 }, velocity: { x: 1, y: 0 } },
      monster.position,
      { x: 0, y: 1 },
      10
    )).toEqual({ x: -0, y: 8 });
    expect(calcSingleProjectileDodgeVector(
      { position: { x: -30, y: 0 }, velocity: { x: 0, y: 0 } },
      monster.position,
      { x: 0, y: 1 },
      10
    )).toEqual({ x: 0, y: 0 });
  });

  it('averages only nearby approaching projectiles on reaction ticks', () => {
    const projectiles = [
      { position: { x: -30, y: 0 }, velocity: { x: 1, y: 0 } },
      { position: { x: 30, y: 0 }, velocity: { x: 1, y: 0 } },
      { position: { x: -300, y: 0 }, velocity: { x: 1, y: 0 }, radius: 1 },
    ];

    const offset = calcDodgeOffset({ ...monster, liveTime: 12 }, projectiles, {
      detectRadius: 100,
      dodgeStrength: 10,
      reactionTime: 3,
    });

    expect(offset.x).toBeCloseTo(0);
    expect(offset.y).toBeCloseTo(8);
    expect(calcDodgeOffset({ ...monster, liveTime: 13 }, projectiles, {
      detectRadius: 100,
      dodgeStrength: 10,
      reactionTime: 3,
    })).toEqual({ x: 0, y: 0 });
  });
});

describe('monsterAi movement helpers', () => {
  it.each([
    { movementType: 'normal', expected: { x: 0, y: 0 } },
    { movementType: 'unknown', expected: { x: 0, y: 0 } },
    { movementType: 'suddenly', expected: { x: 2, y: 0 } },
    { movementType: 'exciting', expected: { x: 1.7999999999999998, y: 0 } },
    { movementType: 'doubleSwing', expected: { x: 20, y: 0 } },
  ])('dispatches movement offset case %#', ({ movementType, expected }) => {
    expect(calcMovementTypeOffset({
      position: { x: 0, y: 0 },
      destination: { x: 10, y: 0 },
      liveTime: 0,
      movementType,
    })).toEqual(expected);
  });

  it('normalizes movement direction and handles zero-length direction', () => {
    expect(getMovementDirection({ x: 0, y: 0 }, { x: 3, y: 4 })).toEqual({ x: 0.6, y: 0.8 });
    expect(getMovementDirection({ x: 1, y: 1 }, { x: 1, y: 1 })).toEqual({ x: 0, y: 0 });
  });

  it('calculates named movement offsets on the expected axis', () => {
    const direction = { x: 1, y: 0 };

    expect(calcSwingMovementOffset(direction, 0)).toEqual({ x: -0, y: 0 });
    expect(calcSuddenlyMovementOffset(direction, 0)).toEqual({ x: 2, y: 0 });
    expect(calcExcitingMovementOffset(direction, 0)).toEqual({ x: 1.7999999999999998, y: 0 });
    expect(calcDoubleSwingMovementOffset(direction, 0)).toEqual({ x: 20, y: 0 });
  });

  it('dispatches movement type offsets and falls back to no offset', () => {
    const input = {
      position: { x: 0, y: 0 },
      destination: { x: 10, y: 0 },
      liveTime: 0,
    };

    expect(calcMovementTypeOffset({ ...input, movementType: 'normal' })).toEqual({ x: 0, y: 0 });
    expect(calcMovementTypeOffset({ ...input, movementType: 'unknown' })).toEqual({ x: 0, y: 0 });
    expect(calcMovementTypeOffset({ ...input, movementType: 'suddenly' })).toEqual({ x: 2, y: 0 });
    expect(calcMovementTypeOffset({ ...input, movementType: 'doubleSwing' })).toEqual({ x: 20, y: 0 });
    expect(calcMovementTypeOffset({ ...input, position: { x: 1, y: 1 }, destination: { x: 1, y: 1 }, movementType: 'swing' })).toEqual({ x: 0, y: 0 });
  });
});
