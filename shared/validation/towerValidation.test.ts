import { describe, expect, it } from 'vitest';

import {
  checkBuildCollision,
  hasCollision,
  isPositionInBounds,
  validateBuildTowerBasic,
  validateCannonFire,
  validateCannonSetAutoTarget,
  validateSellTower,
  validateUpgradeTower,
  type CollidableEntity,
  type PlayerValidationState,
  type TowerMetaData,
  type TowerValidationState,
} from './towerValidation.js';
import { ValidationErrorCode } from './types.js';

const alivePlayer: PlayerValidationState = {
  id: 'player-1',
  isAlive: true,
  money: 100,
};

const deadPlayer: PlayerValidationState = {
  id: 'player-1',
  isAlive: false,
  money: 100,
};

const basicTowerMeta: TowerMetaData = {
  id: 'basic',
  price: 50,
  levelUpArr: ['laser'],
};

const laserTowerMeta: TowerMetaData = {
  id: 'laser',
  price: 80,
  levelUpArr: [],
};

const ownedTower: TowerValidationState = {
  id: 'tower-1',
  ownerId: 'player-1',
  towerType: 'basic',
  position: { x: 100, y: 100 },
  radius: 15,
  attackRadius: 120,
  isManual: false,
  currentAmmo: 0,
};

const manualCannon: TowerValidationState = {
  ...ownedTower,
  towerType: 'manual-cannon',
  isManual: true,
  currentAmmo: 3,
};

describe('tower validation geometry helpers', () => {
  it('treats map bounds as inclusive after applying margin', () => {
    expect(isPositionInBounds(15, 15, { width: 200, height: 100 }, 15)).toBe(true);
    expect(isPositionInBounds(185, 85, { width: 200, height: 100 }, 15)).toBe(true);
    expect(isPositionInBounds(14.99, 15, { width: 200, height: 100 }, 15)).toBe(false);
    expect(isPositionInBounds(185.01, 85, { width: 200, height: 100 }, 15)).toBe(false);
  });

  it('finds collisions inside combined radius and excludes exact tangent contact', () => {
    const entities: CollidableEntity[] = [
      { id: 'near', position: { x: 19, y: 0 }, radius: 10 },
      { id: 'far', position: { x: 100, y: 100 }, radius: 10 },
    ];

    expect(hasCollision(0, 0, 10, entities)?.id).toBe('near');
    expect(hasCollision(0, 0, 10, [{ position: { x: 20, y: 0 }, radius: 10 }])).toBeNull();
  });

  it('checks towers before buildings when reporting build collisions', () => {
    const towers: CollidableEntity[] = [{ id: 'tower-hit', position: { x: 10, y: 0 }, radius: 15 }];
    const buildings: CollidableEntity[] = [{ id: 'building-hit', position: { x: 10, y: 0 }, radius: 30 }];

    expect(checkBuildCollision(0, 0, 15, towers, buildings)).toEqual({
      collides: true,
      collidingEntityId: 'tower-hit',
    });
  });

  it('reports non-collision when towers and buildings are outside build spacing', () => {
    expect(
      checkBuildCollision(
        0,
        0,
        15,
        [{ id: 'tower', position: { x: 100, y: 0 }, radius: 15 }],
        [{ id: 'building', position: { x: 0, y: 120 }, radius: 30 }],
      ),
    ).toEqual({ collides: false });
  });

  it.each([
    [0, 0, { width: 100, height: 100 }, 0, true],
    [100, 100, { width: 100, height: 100 }, 0, true],
    [-0.01, 50, { width: 100, height: 100 }, 0, false],
    [50, 100.01, { width: 100, height: 100 }, 0, false],
    [10, 10, { width: 100, height: 100 }, 10, true],
    [9.99, 10, { width: 100, height: 100 }, 10, false],
    [90.01, 90, { width: 100, height: 100 }, 10, false],
  ])('checks map bounds with margins %#', (x, y, bounds, margin, expected) => {
    expect(isPositionInBounds(x, y, bounds, margin)).toBe(expected);
  });

  it.each([
    [0, 0, 10, [{ id: 'a', position: { x: 19.99, y: 0 }, radius: 10 }], 0, 'a'],
    [0, 0, 10, [{ id: 'touch', position: { x: 20, y: 0 }, radius: 10 }], 0, undefined],
    [0, 0, 10, [{ id: 'margin', position: { x: 25, y: 0 }, radius: 10 }], 5, undefined],
    [0, 0, 10, [{ id: 'margin-hit', position: { x: 24.99, y: 0 }, radius: 10 }], 5, 'margin-hit'],
  ])('checks collision distance boundaries %#', (x, y, radius, entities, minDistance, expectedId) => {
    expect(hasCollision(x, y, radius, entities, minDistance)?.id).toBe(expectedId);
  });

  it('reports building collisions when no tower collides', () => {
    expect(
      checkBuildCollision(
        0,
        0,
        15,
        [{ id: 'tower-far', position: { x: 200, y: 0 }, radius: 15 }],
        [{ id: 'building-hit', position: { x: 40, y: 0 }, radius: 30 }],
      ),
    ).toEqual({
      collides: true,
      collidingEntityId: 'building-hit',
    });
  });
});

describe('validateBuildTowerBasic', () => {
  it('rejects missing or dead players before tower metadata checks', () => {
    expect(validateBuildTowerBasic(undefined, 'basic', 50, 50, basicTowerMeta, { width: 200, height: 200 })).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.PLAYER_NOT_FOUND,
    });
    expect(validateBuildTowerBasic(deadPlayer, 'basic', 50, 50, basicTowerMeta, { width: 200, height: 200 })).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.PLAYER_NOT_ALIVE,
    });
  });

  it('rejects unknown tower types', () => {
    expect(validateBuildTowerBasic(alivePlayer, 'unknown', 50, 50, undefined, { width: 200, height: 200 })).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.TOWER_TYPE_INVALID,
      errorMessage: 'Unknown tower type: unknown',
    });
  });

  it('rejects positions outside the default tower radius margin', () => {
    expect(validateBuildTowerBasic(alivePlayer, 'basic', 14, 50, basicTowerMeta, { width: 200, height: 200 })).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.POSITION_OUT_OF_BOUNDS,
    });
    expect(validateBuildTowerBasic(alivePlayer, 'basic', 186, 50, basicTowerMeta, { width: 200, height: 200 })).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.POSITION_OUT_OF_BOUNDS,
    });
  });

  it('returns base price and tower type for valid builds', () => {
    expect(validateBuildTowerBasic(alivePlayer, 'basic', 15, 185, basicTowerMeta, { width: 200, height: 200 })).toEqual({
      valid: true,
      data: {
        basePrice: 50,
        towerType: 'basic',
      },
    });
  });

  it.each([
    [15, 15],
    [185, 15],
    [15, 185],
    [185, 185],
  ])('allows build positions exactly on the default radius boundary %#', (x, y) => {
    expect(validateBuildTowerBasic(alivePlayer, 'basic', x, y, basicTowerMeta, { width: 200, height: 200 })).toMatchObject({
      valid: true,
      data: {
        basePrice: 50,
        towerType: 'basic',
      },
    });
  });
});

describe('validateUpgradeTower', () => {
  it('rejects missing players, missing towers, and non-owned towers', () => {
    expect(validateUpgradeTower(undefined, ownedTower, 'laser', basicTowerMeta, laserTowerMeta)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.PLAYER_NOT_FOUND,
    });
    expect(validateUpgradeTower(alivePlayer, undefined, 'laser', basicTowerMeta, laserTowerMeta)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.TOWER_NOT_FOUND,
    });
    expect(validateUpgradeTower(alivePlayer, { ...ownedTower, ownerId: 'player-2' }, 'laser', basicTowerMeta, laserTowerMeta)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.TOWER_NOT_OWNED,
    });
  });

  it('rejects invalid current metadata, upgrade paths, target metadata, and money', () => {
    expect(validateUpgradeTower(alivePlayer, ownedTower, 'laser', undefined, laserTowerMeta)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.TOWER_TYPE_INVALID,
      errorMessage: 'Unknown current tower type: basic',
    });
    expect(validateUpgradeTower(alivePlayer, ownedTower, 'artillery', basicTowerMeta, laserTowerMeta)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.TOWER_UPGRADE_INVALID,
    });
    expect(validateUpgradeTower(alivePlayer, ownedTower, 'laser', basicTowerMeta, undefined)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.TOWER_TYPE_INVALID,
      errorMessage: 'Unknown target tower type: laser',
    });
    expect(validateUpgradeTower({ ...alivePlayer, money: 79 }, ownedTower, 'laser', basicTowerMeta, laserTowerMeta)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.INSUFFICIENT_MONEY,
      errorMessage: 'Need 80, have 79',
    });
  });

  it('returns upgrade cost and target type on success', () => {
    expect(validateUpgradeTower(alivePlayer, ownedTower, 'laser', basicTowerMeta, laserTowerMeta)).toEqual({
      valid: true,
      data: {
        cost: 80,
        targetType: 'laser',
      },
    });
  });

  it('allows upgrade when player money exactly matches target price', () => {
    expect(validateUpgradeTower({ ...alivePlayer, money: 80 }, ownedTower, 'laser', basicTowerMeta, laserTowerMeta)).toEqual({
      valid: true,
      data: {
        cost: 80,
        targetType: 'laser',
      },
    });
  });

  it('rejects dead players before tower existence and ownership checks', () => {
    expect(validateUpgradeTower(deadPlayer, undefined, 'laser', basicTowerMeta, laserTowerMeta)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.PLAYER_NOT_ALIVE,
    });
  });
});

describe('validateSellTower', () => {
  it('rejects invalid player and ownership states', () => {
    expect(validateSellTower(undefined, ownedTower, basicTowerMeta)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.PLAYER_NOT_FOUND,
    });
    expect(validateSellTower(deadPlayer, ownedTower, basicTowerMeta)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.PLAYER_NOT_ALIVE,
    });
    expect(validateSellTower(alivePlayer, undefined, basicTowerMeta)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.TOWER_NOT_FOUND,
    });
    expect(validateSellTower(alivePlayer, { ...ownedTower, ownerId: 'player-2' }, basicTowerMeta)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.TOWER_NOT_OWNED,
    });
  });

  it('calculates refunds from metadata, custom rates, and default base price', () => {
    expect(validateSellTower(alivePlayer, ownedTower, basicTowerMeta)).toEqual({
      valid: true,
      data: { refund: 25, towerId: 'tower-1' },
    });
    expect(validateSellTower(alivePlayer, ownedTower, basicTowerMeta, 0.75)).toEqual({
      valid: true,
      data: { refund: 37, towerId: 'tower-1' },
    });
    expect(validateSellTower(alivePlayer, ownedTower, undefined)).toEqual({
      valid: true,
      data: { refund: 25, towerId: 'tower-1' },
    });
  });

  it.each([
    [0, 0],
    [0.1, 5],
    [0.333, 16],
    [1, 50],
  ])('calculates sell refund rates with floor rounding %#', (rate, expectedRefund) => {
    expect(validateSellTower(alivePlayer, ownedTower, basicTowerMeta, rate)).toEqual({
      valid: true,
      data: { refund: expectedRefund, towerId: 'tower-1' },
    });
  });
});

describe('manual cannon validation', () => {
  it('rejects invalid cannon fire states in validation order', () => {
    expect(validateCannonFire(undefined, manualCannon, 100, 100)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.PLAYER_NOT_FOUND,
    });
    expect(validateCannonFire(alivePlayer, undefined, 100, 100)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.CANNON_NOT_FOUND,
    });
    expect(validateCannonFire(alivePlayer, { ...manualCannon, ownerId: 'player-2' }, 100, 100)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.CANNON_NOT_OWNED,
    });
    expect(validateCannonFire(alivePlayer, { ...manualCannon, isManual: false }, 100, 100)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.CANNON_NOT_MANUAL,
    });
    expect(validateCannonFire(alivePlayer, { ...manualCannon, currentAmmo: 0 }, 100, 100)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.CANNON_NO_AMMO,
    });
    expect(validateCannonFire(alivePlayer, manualCannon, 221, 100)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.CANNON_TARGET_OUT_OF_RANGE,
    });
  });

  it('allows cannon fire at the attack radius boundary', () => {
    expect(validateCannonFire(alivePlayer, manualCannon, 220, 100)).toEqual({ valid: true, data: undefined });
  });

  it.each([
    [100, 100],
    [100, 220],
    [-20, 100],
    [184.85, 184.85],
  ])('allows cannon fire inside or on the attack radius %#', (targetX, targetY) => {
    expect(validateCannonFire(alivePlayer, manualCannon, targetX, targetY)).toEqual({
      valid: true,
      data: undefined,
    });
  });

  it('rejects dead players before cannon ownership checks', () => {
    expect(validateCannonFire(deadPlayer, { ...manualCannon, ownerId: 'player-2' }, 100, 100)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.PLAYER_NOT_ALIVE,
    });
  });

  it('validates auto target range before auto target radius', () => {
    expect(validateCannonSetAutoTarget(alivePlayer, manualCannon, 221, 100, 30)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.CANNON_TARGET_OUT_OF_RANGE,
    });
    expect(validateCannonSetAutoTarget(alivePlayer, manualCannon, 220, 100, 0)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.CANNON_RADIUS_INVALID,
    });
    expect(validateCannonSetAutoTarget(alivePlayer, manualCannon, 220, 100, 121)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.CANNON_RADIUS_INVALID,
    });
  });

  it('allows auto target at attack radius and radius upper boundary', () => {
    expect(validateCannonSetAutoTarget(alivePlayer, manualCannon, 220, 100, 120)).toEqual({
      valid: true,
      data: undefined,
    });
  });

  it.each([
    [100, 100, 1],
    [220, 100, 1],
    [100, 220, 120],
    [184.85, 184.85, 60],
  ])('allows auto target inside range with valid radius %#', (targetX, targetY, radius) => {
    expect(validateCannonSetAutoTarget(alivePlayer, manualCannon, targetX, targetY, radius)).toEqual({
      valid: true,
      data: undefined,
    });
  });

  it('rejects dead players before auto target tower checks', () => {
    expect(validateCannonSetAutoTarget(deadPlayer, undefined, 100, 100, 10)).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.PLAYER_NOT_ALIVE,
    });
  });
});
