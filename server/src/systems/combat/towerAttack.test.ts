import { MapSchema } from '@colyseus/schema';
import { describe, expect, it } from 'vitest';
import { MonsterState } from '../../schema/MonsterState.js';
import { TowerState } from '../../schema/TowerState.js';
import { SpatialHashGrid, type SpatialEntity } from '../spatial/spatialHashGrid.js';
import { TowerAttackSystem, type TowerAttackConfig } from './towerAttack.js';

interface MonsterEntity extends SpatialEntity {
  state: MonsterState;
}

function makeTower(id: string, ownerId: string, x: number, y: number): TowerState {
  const tower = new TowerState();
  tower.id = id;
  tower.ownerId = ownerId;
  tower.towerType = 'BasicTower';
  tower.radius = 15;
  tower.attackRadius = 100;
  tower.setPosition(x, y);
  return tower;
}

function makeMonster(id: string, ownerId: string, x: number, y: number, hp = 100): MonsterState {
  const monster = new MonsterState();
  monster.id = id;
  monster.ownerId = ownerId;
  monster.hp = hp;
  monster.maxHp = 100;
  monster.radius = 10;
  monster.speed = 1;
  monster.setPosition(x, y);
  return monster;
}

function makeGrid(monsters: MonsterState[]): SpatialHashGrid<MonsterEntity> {
  const grid = new SpatialHashGrid<MonsterEntity>(500, 500, 50);
  for (const monster of monsters) {
    grid.update({
      id: monster.id,
      position: monster.position,
      radius: monster.radius,
      state: monster,
    });
  }
  return grid;
}

function makeConfig(overrides: Partial<TowerAttackConfig> = {}): TowerAttackConfig {
  return {
    attackRadius: 100,
    attackClock: 10,
    bulletCount: 1,
    bulletSpread: Math.PI / 4,
    bulletType: 'Normal',
    bulletDamage: 40,
    bulletSpeed: 5,
    bulletRadius: 2,
    isShrapnel: false,
    ...overrides,
  };
}

const fullDamage = {
  getDamageMultiplier: () => 1,
};

describe('TowerAttackSystem', () => {
  it('registers and reads tower configs by type', () => {
    const system = new TowerAttackSystem();
    const config = makeConfig({ bulletType: 'Arrow' });

    system.registerTowerConfig('ArrowTower', config);

    expect(system.getTowerConfig('ArrowTower')).toBe(config);
    expect(system.getTowerConfig('MissingTower')).toBeUndefined();
  });

  it('fires at an enemy target after cooldown and creates bullet data from config', () => {
    const system = new TowerAttackSystem();
    system.registerTowerConfig('BasicTower', makeConfig({ isTracking: true, freezeMultiplier: 0.8, burnRate: 0.1 }));
    const towers = new MapSchema<TowerState>();
    const tower = makeTower('t1', 'p1', 50, 50);
    towers.set(tower.id, tower);
    const target = makeMonster('m1', 'p2', 90, 50);

    const result = system.processAttacks(10, towers, makeGrid([target]), fullDamage as any);

    expect(result).toHaveLength(1);
    expect(result[0].towerId).toBe('t1');
    expect(result[0].ownerId).toBe('p1');
    expect(result[0].bullets).toHaveLength(1);
    expect(result[0].bullets[0]).toMatchObject({
      bulletType: 'Normal',
      x: 50,
      y: 50,
      vx: 5,
      vy: 0,
      damage: 40,
      radius: 2,
      maxRange: 100,
      targetId: 'm1',
      freezeMultiplier: 0.8,
      burnRate: 0.1,
    });
  });

  it('applies damage multiplier and suppresses attacks during cooldown', () => {
    const system = new TowerAttackSystem();
    system.registerTowerConfig('BasicTower', makeConfig({ bulletDamage: 80 }));
    const towers = new MapSchema<TowerState>();
    towers.set('t1', makeTower('t1', 'p1', 50, 50));
    const grid = makeGrid([makeMonster('m1', 'p2', 80, 50)]);
    const halfDamage = { getDamageMultiplier: () => 0.5 };

    const first = system.processAttacks(10, towers, grid, halfDamage as any);
    const second = system.processAttacks(19, towers, grid, halfDamage as any);
    const third = system.processAttacks(20, towers, grid, halfDamage as any);

    expect(first[0].bullets[0].damage).toBe(40);
    expect(second).toEqual([]);
    expect(third).toHaveLength(1);
  });

  it('skips manual towers, missing configs, friendly monsters, and out-of-range monsters', () => {
    const system = new TowerAttackSystem();
    system.registerTowerConfig('BasicTower', makeConfig());
    const towers = new MapSchema<TowerState>();
    const manual = makeTower('manual', 'p1', 50, 50);
    manual.isManual = true;
    towers.set('manual', manual);
    towers.set('missing', makeTower('missing', 'p1', 50, 50));
    towers.get('missing')!.towerType = 'MissingTower';
    towers.set('normal', makeTower('normal', 'p1', 50, 50));

    expect(system.processAttacks(10, towers, makeGrid([makeMonster('friendly', 'p1', 70, 50)]), fullDamage as any)).toEqual([]);
    expect(system.processAttacks(20, towers, makeGrid([makeMonster('far', 'p2', 300, 50)]), fullDamage as any)).toEqual([]);
  });

  it('creates spread shrapnel bullets without target ids', () => {
    const system = new TowerAttackSystem();
    system.registerTowerConfig('BasicTower', makeConfig({
      bulletCount: 3,
      bulletSpread: Math.PI / 2,
      bulletSpeed: 10,
      isShrapnel: true,
      isExplosive: true,
      explosionRadius: 30,
      explosionDamage: 70,
    }));
    const towers = new MapSchema<TowerState>();
    towers.set('t1', makeTower('t1', 'p1', 50, 50));

    const result = system.processAttacks(10, towers, makeGrid([makeMonster('m1', 'p2', 100, 50)]), fullDamage as any);

    expect(result[0].bullets).toHaveLength(3);
    expect(result[0].bullets.map((bullet) => bullet.targetId)).toEqual([undefined, undefined, undefined]);
    expect(result[0].bullets.every((bullet) => bullet.isExplosive)).toBe(true);
    expect(result[0].bullets[0].vy).toBeLessThan(0);
    expect(result[0].bullets[2].vy).toBeGreaterThan(0);
  });

  it('resets and removes cooldown state for immediate re-engagement', () => {
    const system = new TowerAttackSystem();
    system.registerTowerConfig('BasicTower', makeConfig());
    const towers = new MapSchema<TowerState>();
    towers.set('t1', makeTower('t1', 'p1', 50, 50));
    const grid = makeGrid([makeMonster('m1', 'p2', 80, 50)]);

    expect(system.processAttacks(10, towers, grid, fullDamage as any)).toHaveLength(1);
    expect(system.processAttacks(11, towers, grid, fullDamage as any)).toHaveLength(0);

    system.resetTowerCooldown('t1');
    expect(system.processAttacks(11, towers, grid, fullDamage as any)).toHaveLength(1);

    system.removeTower('t1');
    expect(system.processAttacks(12, towers, grid, fullDamage as any)).toHaveLength(1);
  });

  it('honors checkAndSetCooldown boundaries', () => {
    const system = new TowerAttackSystem();

    expect(system.checkAndSetCooldown('t1', 59, 60)).toBe(false);
    expect(system.checkAndSetCooldown('t1', 60, 60)).toBe(true);
    expect(system.checkAndSetCooldown('t1', 119, 60)).toBe(false);
    expect(system.checkAndSetCooldown('t1', 120, 60)).toBe(true);
  });
});
