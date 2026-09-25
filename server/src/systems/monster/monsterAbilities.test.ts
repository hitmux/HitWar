import { describe, expect, it } from 'vitest';
import {
  buildCircularSummonOffsets,
  clampLaserDefenseCharges,
  computeBombSelfHits,
  computeBulletChangeEffects,
  computeGainEffects,
  computeGravityAreaEffects,
  computeLaserDefenseStep,
  computeSummonSpawnPlans,
  filterBulletsInRange,
  filterEnemyBuildingsInRange,
  filterEnemyMinesInRange,
  filterFriendlyMonstersInRange,
  getMonsterAbilitySet,
  recoverLaserDefenseCharges,
} from './monsterAbilities.js';

function circle(id: string, ownerId: string, x: number, y: number, radius = 10) {
  return { id, ownerId, position: { x, y }, radius };
}

function monster(id: string, ownerId: string, x: number, y: number, extra = {}) {
  return {
    ...circle(id, ownerId, x, y, 10),
    monsterType: 'Normal',
    hp: 50,
    maxHp: 100,
    speed: 1,
    colishDamage: 10,
    ...extra,
  };
}

function bullet(id: string, ownerId: string, x: number, y: number, extra = {}) {
  return {
    ...circle(id, ownerId, x, y, 3),
    damage: 10,
    velocity: { x: 1, y: 0 },
    laserDestoryAble: true,
    ...extra,
  };
}

describe('monsterAbilities range filters', () => {
  it('filters enemy buildings, friendly monsters, bullets, and enemy mines by ownership and range', () => {
    const source = circle('source', 'p1', 0, 0, 10);
    const buildings = [
      circle('enemy', 'p2', 20, 0, 5),
      circle('friendly', 'p1', 20, 0, 5),
      circle('far', 'p2', 200, 0, 5),
    ];
    const monsters = [
      monster('source', 'p1', 0, 0),
      monster('ally', 'p1', 20, 0),
      monster('enemy', 'p2', 20, 0),
    ];
    const bullets = [
      bullet('near', 'p2', 20, 0),
      bullet('far', 'p2', 200, 0),
    ];

    expect(filterEnemyBuildingsInRange(source, buildings, 30).map((item) => item.id)).toEqual(['enemy']);
    expect(filterFriendlyMonstersInRange(source, monsters, 30).map((item) => item.id)).toEqual(['ally']);
    expect(filterBulletsInRange(source, bullets, 30).map((item) => item.id)).toEqual(['near']);
    expect(filterEnemyMinesInRange(source, buildings, 30).map((item) => item.id)).toEqual(['enemy']);
    expect(filterEnemyBuildingsInRange(source, buildings, 0)).toEqual([]);
  });

  it('reads ability subsets only for monsters with configured abilities', () => {
    expect(getMonsterAbilitySet('Bomber1')?.bombSelf).toBeDefined();
    expect(getMonsterAbilitySet('Normal')).toBeUndefined();
    expect(getMonsterAbilitySet('missing')).toBeUndefined();
  });
});

describe('monsterAbilities effect computations', () => {
  it('computes bomb-self hits against enemy buildings with distance falloff', () => {
    const source = circle('bomber', 'p1', 0, 0, 10);
    const buildings = [
      circle('near', 'p2', 0, 0, 5),
      circle('edge', 'p2', 50, 0, 5),
      circle('friendly', 'p1', 0, 0, 5),
    ];

    const hits = computeBombSelfHits(source, {
      bombSelfAble: true,
      bombSelfRange: 50,
      bombSelfDamage: 100,
    }, buildings);

    expect(hits.map((hit) => hit.buildingId)).toEqual(['near']);
    expect(hits[0].damage).toBe(100);
    expect(computeBombSelfHits(source, undefined, buildings)).toEqual([]);
    expect(computeBombSelfHits(source, { bombSelfAble: false, bombSelfRange: 50, bombSelfDamage: 100 }, buildings)).toEqual([]);
  });

  it('computes ally gain effects without mutating targets', () => {
    const source = circle('medic', 'p1', 0, 0, 10);
    const ally = monster('ally', 'p1', 20, 0, { radius: 20, speed: 1.5 });
    const large = monster('large', 'p1', 20, 0, { radius: 200, speed: 3 });

    const effects = computeGainEffects(source, {
	      haveGain: true,
	      gainRadius: 50,
	      gainFrequency: 1,
	      gainHpAddedRate: 0.1,
      gainHpAddedNum: 5,
      gainMaxHpAddedNum: 7,
      gainR: 2,
      gainSpeedNAddNum: 3,
      gainCollideDamageAddNum: 4,
    }, [ally, large]);

    expect(effects).toHaveLength(2);
    expect(effects[0]).toMatchObject({
      monsterId: 'ally',
      hpDelta: 15,
      maxHpDelta: 7,
      radiusDelta: 2,
      speedDelta: 3,
      collisionDamageDelta: 4,
    });
    expect(effects[1].radiusDelta).toBe(0);
    expect(effects[1].speedDelta).toBe(0);
    expect(ally.hp).toBe(50);
  });

  it('computes bullet change effects with acceleration attenuation', () => {
    const source = circle('repeller', 'p1', 0, 0, 10);
    const effects = computeBulletChangeEffects(source, {
	      haveBulletChangeArea: true,
	      r: 100,
	      f: 1,
	      bulletDR: -1,
      bulletDD: 5,
      bulletAN: 10,
    }, [
      bullet('near', 'p2', 50, 0),
      bullet('edge', 'p2', 100, 0),
      bullet('far', 'p2', 200, 0),
    ]);

    expect(effects.map((effect) => effect.bulletId)).toEqual(['near', 'edge']);
    expect(effects[0].radiusDelta).toBe(-1);
    expect(effects[0].damageDelta).toBe(5);
    expect(effects[0].acceleration).toEqual({ x: 5, y: 0 });
    expect(effects[1].acceleration).toEqual({ x: 0, y: 0 });
  });

  it('computes gravity structure displacement and mine damage', () => {
    const source = circle('blackHole', 'p1', 0, 0, 10);
    const enemyBuilding = circle('building', 'p2', 30, 0, 5);
    const friendlyBuilding = circle('friendly', 'p1', 30, 0, 5);
    const enemyMine = circle('mine', 'p2', 20, 0, 5);

    const result = computeGravityAreaEffects(source, {
      haveGArea: true,
      gAreaR: 100,
      gAreaNum: 4,
    }, [enemyBuilding, friendlyBuilding], [enemyMine]);

    expect(result.buildingDisplacements).toHaveLength(1);
    expect(result.buildingDisplacements[0].structureId).toBe('building');
    expect(result.buildingDisplacements[0].displacement).toEqual({ x: -4, y: 0 });
    expect(result.mineDamages).toEqual([{ mine: enemyMine, mineId: 'mine', damage: 8 }]);
    expect(computeGravityAreaEffects(source, undefined, [enemyBuilding])).toEqual({
      buildingDisplacements: [],
      mineDamages: [],
    });
  });
});

describe('monsterAbilities laser and summon helpers', () => {
	  const laserParams = {
	    haveLaserDefence: true,
	    laserFreeze: 1,
	    laserRadius: 50,
	    laserdefendPreNum: 2,
	    laserDefendNum: 2,
	    laserRecoverFreeze: 1,
	    laserRecoverNum: 3,
	    maxLaserNum: 5,
	  };

  it('clamps and recovers laser-defense charges', () => {
    expect(clampLaserDefenseCharges(-2, laserParams)).toBe(0);
    expect(clampLaserDefenseCharges(10, laserParams)).toBe(5);
    expect(clampLaserDefenseCharges(10, undefined)).toBe(10);
    expect(recoverLaserDefenseCharges(4, laserParams)).toBe(5);
    expect(recoverLaserDefenseCharges(-1, undefined)).toBe(0);
  });

  it('destroys eligible bullets up to charge and per-activation limits', () => {
    const source = circle('laser', 'p1', 0, 0, 10);
    const bullets = [
      bullet('first', 'p2', 10, 0),
      bullet('immune', 'p2', 10, 0, { laserDestoryAble: false }),
      bullet('second', 'p2', 20, 0),
      bullet('third', 'p2', 30, 0),
      bullet('far', 'p2', 100, 0),
    ];

    const result = computeLaserDefenseStep(source, laserParams, bullets, 3);

    expect(result.destroyedBulletIds).toEqual(['first', 'second']);
    expect(result.destroyedBullets).toEqual([bullets[0], bullets[2]]);
    expect(result.consumedCharges).toBe(2);
    expect(result.remainingCharges).toBe(1);
    expect(computeLaserDefenseStep(source, laserParams, bullets, 0).destroyedBulletIds).toEqual([]);
  });

  it('builds circular summon offsets and deterministic spawn plans', () => {
    const offsets = buildCircularSummonOffsets(4, 10);

    expect(offsets).toHaveLength(4);
    expect(offsets[0]).toEqual({ x: 10, y: 0 });
    expect(offsets[1].x).toBeCloseTo(0);
    expect(offsets[1].y).toBeCloseTo(10);
    expect(buildCircularSummonOffsets(0, 10)).toEqual([]);
    expect(buildCircularSummonOffsets(3, 0)).toEqual([]);

    expect(computeSummonSpawnPlans(circle('summoner', 'p1', 100, 100), {
      summonCount: 2,
      summonDistance: 10,
      summonMonsterName: 'Normal',
    }, [{ x: 1, y: 2 }, { x: 3, y: 4 }])).toEqual([
      { monsterType: 'Normal', index: 0, position: { x: 101, y: 102 } },
      { monsterType: 'Normal', index: 1, position: { x: 103, y: 104 } },
    ]);
  });
});
