import { describe, expect, it } from 'vitest';

import { BULLET_COMBAT_META } from './bulletCombatMeta.js';
import { BUILDING_META, getBuildingMeta, isBuildingTypeValid } from './buildingMeta.js';
import { TOWER_BASE_META, getTowerBaseMeta } from './towerBaseMeta.js';
import { TOWER_COMBAT_META, getTowerCombatData } from './towerCombatMeta.js';
import { TOWER_META, getTowerMeta, isTowerTypeValid } from './towerMeta.js';

describe('tower metadata registry', () => {
  it('keeps tower metadata keys, ids, prices, and upgrade arrays valid', () => {
    for (const [id, meta] of Object.entries(TOWER_META)) {
      expect(meta.id).toBe(id);
      expect(meta.price).toBeGreaterThan(0);
      expect(Array.isArray(meta.levelUpArr)).toBe(true);
      expect(new Set(meta.levelUpArr).size).toBe(meta.levelUpArr.length);
    }
  });

  it('keeps every tower upgrade target present in tower metadata', () => {
    for (const meta of Object.values(TOWER_META)) {
      for (const targetId of meta.levelUpArr) {
        expect(TOWER_META[targetId]).toBeDefined();
      }
    }
  });

  it.each(['BasicCannon', 'Laser', 'ManualCannon'])('looks up valid tower type %s', (towerType) => {
    expect(getTowerMeta(towerType)?.id).toBe(towerType);
    expect(isTowerTypeValid(towerType)).toBe(true);
  });

  it.each(['', 'UnknownTower', 'basiccannon'])('rejects invalid tower type %s', (towerType) => {
    expect(getTowerMeta(towerType)).toBeUndefined();
    expect(isTowerTypeValid(towerType)).toBe(false);
  });
});

describe('tower combat and base metadata', () => {
  it('keeps every tower covered by either combat or base metadata', () => {
    for (const towerType of Object.keys(TOWER_META)) {
      expect(TOWER_COMBAT_META[towerType] ?? TOWER_BASE_META[towerType]).toBeDefined();
    }
  });

  it('keeps combat tower keys, ids, dimensions, and bullet references valid', () => {
    for (const [towerType, meta] of Object.entries(TOWER_COMBAT_META)) {
      expect(meta.id).toBe(towerType);
      expect(TOWER_META[towerType]).toBeDefined();
      expect(meta.hp).toBeGreaterThan(0);
      expect(meta.radius).toBeGreaterThan(0);
      expect(meta.attackRadius).toBeGreaterThan(0);
      expect(meta.attackClock).toBeGreaterThanOrEqual(1);
      expect(meta.bulletCount).toBeGreaterThanOrEqual(1);
      expect(BULLET_COMBAT_META[meta.bulletType]).toBeDefined();
    }
  });

  it('copies special bullet properties into tower combat metadata', () => {
    expect(TOWER_COMBAT_META.Artillery_1).toMatchObject({
      bulletType: 'H_S',
      isExplosive: true,
      explosionRadius: BULLET_COMBAT_META.H_S.explosionRadius,
    });
    expect(TOWER_COMBAT_META.MissileGun_1).toMatchObject({
      bulletType: 'H_Target_S',
      isTracking: true,
      trackingRadius: BULLET_COMBAT_META.H_Target_S.trackingRadius,
    });
    expect(TOWER_COMBAT_META.ArmorPiercing_1).toMatchObject({
      bulletType: 'T_M',
      isPenetrating: true,
      penetrationCount: BULLET_COMBAT_META.T_M.penetrationCount,
    });
  });

  it.each(['BasicCannon', 'Artillery_1', 'Shotgun_2'])('looks up combat tower data %s', (towerType) => {
    expect(getTowerCombatData(towerType)?.id).toBe(towerType);
  });

  it.each(['Laser', 'ManualCannon', 'FutureCannon_5'])('looks up base tower data %s', (towerType) => {
    expect(getTowerBaseMeta(towerType)?.id).toBe(towerType);
  });

  it('keeps base tower keys, ids, and dimensions valid', () => {
    for (const [towerType, meta] of Object.entries(TOWER_BASE_META)) {
      expect(meta.id).toBe(towerType);
      expect(TOWER_META[towerType]).toBeDefined();
      expect(meta.hp).toBeGreaterThan(0);
      expect(meta.radius).toBeGreaterThan(0);
      expect(meta.attackRadius).toBeGreaterThanOrEqual(0);
    }
  });

  it('keeps ManualCannon base metadata complete', () => {
    expect(TOWER_BASE_META.ManualCannon).toMatchObject({
      isManual: true,
      maxAmmo: 3,
      reloadTicks: 60,
      attackRadius: 400,
    });
  });
});

describe('bullet and building metadata', () => {
  it('keeps bullet metadata keys, ids, dimensions, and special flags consistent', () => {
    for (const [bulletType, meta] of Object.entries(BULLET_COMBAT_META)) {
      expect(meta.id).toBe(bulletType);
      expect(meta.damage).toBeGreaterThan(0);
      expect(meta.radius).toBeGreaterThan(0);
      expect(meta.explosionDamage).toBeGreaterThanOrEqual(0);
      expect(meta.explosionRadius).toBeGreaterThanOrEqual(0);
      expect(meta.trackingRadius).toBeGreaterThanOrEqual(0);
      expect(meta.penetrationCount).toBeGreaterThanOrEqual(0);
      expect(meta.freezeMultiplier).toBeGreaterThan(0);
      expect(meta.burnRate).toBeGreaterThanOrEqual(0);
    }
  });

  it.each(['H_S', 'H_Target_S', 'ThunderBall', 'ManualCannon_Shell'])('marks explosive bullet %s with an explosion radius', (bulletType) => {
    expect(BULLET_COMBAT_META[bulletType].isExplosive).toBe(true);
    expect(BULLET_COMBAT_META[bulletType].explosionRadius).toBeGreaterThan(0);
  });

  it.each(['H_Target_S', 'ThunderBall'])('marks tracking bullet %s with tracking radius', (bulletType) => {
    expect(BULLET_COMBAT_META[bulletType].isTracking).toBe(true);
    expect(BULLET_COMBAT_META[bulletType].trackingRadius).toBeGreaterThan(0);
  });

  it('keeps building metadata valid and lookup helpers strict', () => {
    for (const [buildingType, meta] of Object.entries(BUILDING_META)) {
      expect(meta.id).toBe(buildingType);
      expect(meta.price).toBeGreaterThan(0);
      expect(meta.radius).toBeGreaterThan(0);
      expect(meta.hp).toBeGreaterThan(0);
      expect(meta.displayName.length).toBeGreaterThan(0);
      expect(getBuildingMeta(buildingType)).toBe(meta);
      expect(isBuildingTypeValid(buildingType)).toBe(true);
    }

    expect(getBuildingMeta('UnknownBuilding')).toBeUndefined();
    expect(isBuildingTypeValid('UnknownBuilding')).toBe(false);
  });
});
