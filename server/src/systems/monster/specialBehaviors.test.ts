import { describe, expect, it } from 'vitest';
import { scalePeriod, scaleSpeed } from '../../../../shared/constants/speedScale.js';
import { VectorSchema } from '../../schema/VectorSchema.js';
import {
  computeTerminatorAppliedDamage,
  computeTerminatorDamageResult,
  createMortisDashPlan,
  createShooterShotPlan,
  getMonsterDefinitionForState,
  getMortisDefinition,
  getShooterDefinition,
  hasMortisReachedDashEndpoint,
  isTerminatorMonster,
  isValidEnemyBuildingTarget,
  isValidEnemyStructureTarget,
  resolveMortisRuntimeConfig,
  resolveShooterRuntimeConfig,
  selectBuildingTarget,
  selectMortisDashTarget,
  selectShooterTarget,
  selectStructureTarget,
  shouldShooterFire,
} from './specialBehaviors.js';

function monster(monsterType: string, ownerId = 'p1', x = 0, y = 0) {
  return {
    monsterType,
    ownerId,
    position: new VectorSchema(x, y),
  };
}

function structure(id: string, ownerId: string, x: number, y: number, extra = {}) {
  return {
    id,
    ownerId,
    position: new VectorSchema(x, y),
    hp: 100,
    maxHp: 100,
    radius: 10,
    damage: 10,
    clock: 10,
    targetType: 'building' as const,
    ...extra,
  };
}

describe('specialBehaviors runtime resolution', () => {
  it('resolves shooter, mortis, and terminator definitions by monster type', () => {
    expect(getMonsterDefinitionForState(monster('Shouter'))?.id).toBe('Shouter');
    expect(getShooterDefinition(monster('Shouter_Stone'))?.baseClass).toBe('MonsterShooter');
    expect(getShooterDefinition(monster('Normal'))).toBeUndefined();
    expect(getMortisDefinition(monster('Mts'))?.baseClass).toBe('MonsterMortis');
    expect(getMortisDefinition(monster('Normal'))).toBeUndefined();
    expect(isTerminatorMonster(monster('T800'))).toBe(true);
    expect(isTerminatorMonster(monster('Normal'))).toBe(false);
  });

  it('maps shooter and mortis runtime configs from shared definitions', () => {
    expect(resolveShooterRuntimeConfig(monster('Shouter_Stone'))).toMatchObject({
      range: 128,
      fireIntervalTicks: scalePeriod(50),
      bulletType: 'CannonStone_L',
      bulletSpeed: scaleSpeed(8),
      shotCount: 1,
      maxRange: 128,
    });
    expect(resolveShooterRuntimeConfig(monster('Normal'))).toBeNull();

    expect(resolveMortisRuntimeConfig(monster('Mts'))).toMatchObject({
      viewRadius: 100,
      bumpDistance: 50,
      bumpSpeed: scaleSpeed(12),
      bumpDamage: 5,
    });
    expect(resolveMortisRuntimeConfig(monster('Normal'))).toBeNull();
  });
});

describe('specialBehaviors structure target selection', () => {
  it('validates enemy structure targets by hp, owner, and range', () => {
    const source = monster('Shouter', 'p1', 0, 0);

    expect(isValidEnemyStructureTarget(source, structure('valid', 'p2', 50, 0), 50)).toBe(true);
    expect(isValidEnemyStructureTarget(source, structure('dead', 'p2', 50, 0, { hp: 0 }), 50)).toBe(false);
    expect(isValidEnemyStructureTarget(source, structure('friendly', 'p1', 50, 0), 50)).toBe(false);
    expect(isValidEnemyStructureTarget(source, structure('far', 'p2', 100, 0), 50)).toBe(false);
    expect(isValidEnemyBuildingTarget(source, structure('valid', 'p2', 50, 0), 50)).toBe(true);
  });

  it('keeps current valid targets and otherwise uses the requested strategy', () => {
    const source = monster('Shouter', 'p1', 0, 0);
    const targets = [
      structure('near', 'p2', 20, 0, { hp: 100, damage: 5, clock: 10 }),
      structure('weak', 'p2', 80, 0, { hp: 1, damage: 5, clock: 10 }),
      structure('threat', 'p2', 90, 0, { hp: 100, damage: 100, clock: 1 }),
    ];

    expect(selectStructureTarget(source, targets, 100, undefined, 'weak')?.id).toBe('weak');
    expect(selectStructureTarget(source, targets, 100, { strategy: 'nearest' })?.id).toBe('near');
    expect(selectStructureTarget(source, targets, 100, { strategy: 'weakest' })?.id).toBe('weak');
    expect(selectStructureTarget(source, targets, 100, { strategy: 'threat' })?.id).toBe('threat');
    expect(selectStructureTarget(source, targets, 9)).toBeNull();
    expect(selectBuildingTarget(source, targets, 100, { strategy: 'nearest' })?.id).toBe('near');
  });

  it('selects shooter and mortis targets with their runtime ranges', () => {
    const shooter = monster('Shouter_Stone', 'p1', 0, 0);
    const mortis = monster('Mts', 'p1', 0, 0);
    const targets = [
      structure('near', 'p2', 100, 0),
      structure('far', 'p2', 400, 0),
    ];

    expect(selectShooterTarget(shooter, targets)?.id).toBe('near');
    expect(selectShooterTarget(monster('Normal'), targets)).toBeNull();
    expect(selectMortisDashTarget(mortis, targets)?.id).toBe('near');
    expect(selectMortisDashTarget(monster('Normal'), targets)).toBeNull();
  });
});

describe('specialBehaviors shooter and mortis actions', () => {
  it('checks shooter fire interval and creates structure-targeting shot plans', () => {
    const shooter = monster('Shouter_Stone', 'p1', 0, 0);
    const interval = resolveShooterRuntimeConfig(shooter)!.fireIntervalTicks;

    expect(shouldShooterFire(interval, shooter)).toBe(true);
    expect(shouldShooterFire(interval + 1, shooter)).toBe(false);
    expect(shouldShooterFire(interval, monster('Normal'))).toBe(false);

    const plan = createShooterShotPlan(shooter, structure('target', 'p2', 100, 0));
    expect(plan).toMatchObject({
      bulletType: 'CannonStone_L',
      x: 0,
      y: 0,
      vx: scaleSpeed(8),
      vy: 0,
      damage: 1000,
      radius: 8,
      maxRange: 128,
      targetsBuildings: true,
    });
    expect(createShooterShotPlan(monster('Normal'), structure('target', 'p2', 100, 0))).toBeNull();
    expect(createShooterShotPlan(shooter, structure('same', 'p2', 0, 0))).toBeNull();
  });

  it('creates mortis dash plans and detects endpoint arrival', () => {
    const mortis = monster('Mts', 'p1', 0, 0);
    const plan = createMortisDashPlan(mortis, structure('target', 'p2', 100, 0));

    expect(plan).toMatchObject({
      targetId: 'target',
      endPoint: { x: 150, y: 0 },
      velocity: { x: scaleSpeed(12), y: 0 },
      bumpDamage: 5,
      shouldKeepMoving: true,
    });
    expect(hasMortisReachedDashEndpoint({ position: new VectorSchema(155, 0) }, { x: 160, y: 0 })).toBe(true);
    expect(hasMortisReachedDashEndpoint({ position: new VectorSchema(140, 0) }, { x: 160, y: 0 })).toBe(false);
    expect(createMortisDashPlan(monster('Normal'), structure('target', 'p2', 100, 0))).toBeNull();
    expect(createMortisDashPlan(mortis, structure('same', 'p2', 0, 0))).toBeNull();
  });
});

describe('specialBehaviors terminator damage rules', () => {
  it.each([
    { incomingDamage: 0, appliedDamage: 0, ignored: true },
    { incomingDamage: 9, appliedDamage: 0, ignored: true },
    { incomingDamage: 10, appliedDamage: 1, ignored: false },
    { incomingDamage: 100, appliedDamage: 5, ignored: false },
    { incomingDamage: 300, appliedDamage: 100, ignored: false },
    { incomingDamage: 1500, appliedDamage: 500, ignored: false },
    { incomingDamage: 3000, appliedDamage: 2250, ignored: false },
  ])('applies terminator damage table case %#', ({ incomingDamage, appliedDamage, ignored }) => {
    expect(computeTerminatorDamageResult(incomingDamage)).toMatchObject({
      incomingDamage,
      appliedDamage,
      ignored,
    });
  });

  it('applies default terminator thresholds and clamps negative damage', () => {
    expect(computeTerminatorDamageResult(-10)).toEqual({
      incomingDamage: 0,
      appliedDamage: 0,
      ignored: true,
    });
    expect(computeTerminatorDamageResult(9)).toEqual({
      incomingDamage: 9,
      appliedDamage: 0,
      ignored: true,
    });
    expect(computeTerminatorDamageResult(10)).toMatchObject({ appliedDamage: 1, ignored: false });
    expect(computeTerminatorDamageResult(100)).toMatchObject({ appliedDamage: 5, ignored: false });
    expect(computeTerminatorDamageResult(300)).toMatchObject({ appliedDamage: 100, ignored: false });
    expect(computeTerminatorDamageResult(500)).toMatchObject({ appliedDamage: 300, ignored: false });
    expect(computeTerminatorDamageResult(1500)).toMatchObject({ appliedDamage: 500, ignored: false });
    expect(computeTerminatorDamageResult(3000)).toMatchObject({ appliedDamage: 2250, ignored: false });
    expect(computeTerminatorAppliedDamage(3000)).toBe(2250);
  });
});
