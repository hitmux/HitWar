import { MapSchema } from '@colyseus/schema';
import { describe, expect, it } from 'vitest';
import { BuildingState } from '../../schema/BuildingState.js';
import { MonsterState } from '../../schema/MonsterState.js';
import { TowerState } from '../../schema/TowerState.js';
import { SpatialHashGrid, type SpatialEntity } from '../spatial/spatialHashGrid.js';
import { BulletManager } from './bulletManager.js';
import type { BulletCreationData } from './towerAttack.js';

interface MonsterEntity extends SpatialEntity {
  state: MonsterState;
  prevX?: number;
  prevY?: number;
}

interface BuildingEntity extends SpatialEntity {
  state: BuildingState;
}

interface TowerEntity extends SpatialEntity {
  state: TowerState;
}

function bulletData(overrides: Partial<BulletCreationData> = {}): BulletCreationData {
  return {
    bulletType: 'Normal',
    x: 0,
    y: 0,
    vx: 10,
    vy: 0,
    damage: 25,
    radius: 3,
    maxRange: 100,
    isExplosive: false,
    explosionRadius: 0,
    explosionDamage: 0,
    isPenetrating: false,
    penetrationCount: 0,
    freezeMultiplier: 1,
    burnRate: 0,
    ...overrides,
  };
}

function makeMonster(id: string, ownerId: string, x: number, y: number): MonsterState {
  const monster = new MonsterState();
  monster.id = id;
  monster.ownerId = ownerId;
  monster.hp = 100;
  monster.radius = 8;
  monster.prevX = x;
  monster.prevY = y;
  monster.setPosition(x, y);
  return monster;
}

function makeBuilding(id: string, ownerId: string, x: number, y: number): BuildingState {
  const building = new BuildingState();
  building.id = id;
  building.ownerId = ownerId;
  building.hp = 100;
  building.radius = 10;
  building.setPosition(x, y);
  return building;
}

function makeTower(id: string, ownerId: string, x: number, y: number): TowerState {
  const tower = new TowerState();
  tower.id = id;
  tower.ownerId = ownerId;
  tower.hp = 100;
  tower.radius = 10;
  tower.setPosition(x, y);
  return tower;
}

function monsterMap(monsters: MonsterState[]): MapSchema<MonsterState> {
  const map = new MapSchema<MonsterState>();
  for (const monster of monsters) map.set(monster.id, monster);
  return map;
}

function monsterGrid(monsters: MonsterState[]): SpatialHashGrid<MonsterEntity> {
  const grid = new SpatialHashGrid<MonsterEntity>(500, 500, 50);
  for (const monster of monsters) {
    grid.update({
      id: monster.id,
      position: monster.position,
      radius: monster.radius,
      state: monster,
      prevX: monster.prevX,
      prevY: monster.prevY,
    });
  }
  return grid;
}

function buildingGrid(buildings: BuildingState[]): SpatialHashGrid<BuildingEntity> {
  const grid = new SpatialHashGrid<BuildingEntity>(500, 500, 50);
  for (const building of buildings) {
    grid.update({
      id: building.id,
      position: building.position,
      radius: building.radius,
      state: building,
    });
  }
  return grid;
}

function towerGrid(towers: TowerState[]): SpatialHashGrid<TowerEntity> {
  const grid = new SpatialHashGrid<TowerEntity>(500, 500, 50);
  for (const tower of towers) {
    grid.update({
      id: tower.id,
      position: tower.position,
      radius: tower.radius,
      state: tower,
    });
  }
  return grid;
}

describe('BulletManager', () => {
  it('creates bullets and exposes fired events with source metadata', () => {
    const manager = new BulletManager();

    const bullet = manager.createBullet(
      bulletData({ targetId: 'm1', isExplosive: true, explosionRadius: 20, explosionDamage: 40 }),
      'tower1',
      'p1'
    );
    const event = manager.getBulletFiredEvent(bullet);

    expect(bullet.id).toBe('bullet_0');
    expect(bullet.isTracking).toBe(true);
    expect(bullet.targetId).toBe('m1');
    expect(bullet.isExplosive).toBe(true);
    expect(event).toMatchObject({
      bulletId: 'bullet_0',
      sourceId: 'tower1',
      sourceType: 'tower',
      towerId: 'tower1',
      ownerId: 'p1',
    });

    const monsterBullet = manager.createBullet(bulletData({ x: 5 }), 'monster1', 'p2', 'monster');
    expect(manager.getBulletFiredEvent(monsterBullet).towerId).toBeUndefined();
    expect(manager.getBulletCount()).toBe(2);
  });

  it('tracks live monster targets before moving and removes out-of-range bullets on cleanup', () => {
    const manager = new BulletManager();
    const target = makeMonster('m1', 'p2', 0, 40);
    manager.createBullet(bulletData({ targetId: 'm1', vx: 10, vy: 0, maxRange: 4 }), 'tower1', 'p1');

    manager.updatePositions(monsterMap([target]));
    const active = manager.getActiveBullets()[0];

    expect(active.velocity.x).toBeCloseTo(0);
    expect(active.velocity.y).toBeCloseTo(10);
    expect(active.position.x).toBeCloseTo(0);
    expect(active.position.y).toBeCloseTo(10);
    expect(manager.cleanup()).toEqual(['bullet_0']);
    expect(manager.getBulletCount()).toBe(0);
  });

  it('hits enemy monsters, ignores friendly monsters, and cleans non-penetrating bullets', () => {
    const manager = new BulletManager();
    const enemy = makeMonster('enemy', 'p2', 10, 0);
    const friendly = makeMonster('friendly', 'p1', 10, 0);
    manager.createBullet(bulletData({ freezeMultiplier: 0.6, burnRate: 0.2 }), 'tower1', 'p1');

    manager.updatePositions(monsterMap([enemy, friendly]));
    const hits = manager.processCollisions(monsterGrid([friendly, enemy]));

    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({
      bulletId: 'bullet_0',
      targetId: 'enemy',
      targetType: 'monster',
      damage: 25,
      freezeMultiplier: 0.6,
      burnRate: 0.2,
      isExplosion: false,
    });
    expect(manager.cleanup()).toEqual(['bullet_0']);
  });

  it('keeps penetrating bullets alive until their penetration count reaches zero', () => {
    const manager = new BulletManager();
    const enemy = makeMonster('enemy', 'p2', 10, 0);
    manager.createBullet(bulletData({ isPenetrating: true, penetrationCount: 2, radius: 10 }), 'tower1', 'p1');

    manager.updatePositions(monsterMap([enemy]));
    expect(manager.processCollisions(monsterGrid([enemy]))).toHaveLength(1);
    expect(manager.cleanup()).toEqual([]);
    expect(manager.getActiveBullets()[0].penetrationCount).toBe(1);
    expect(manager.getActiveBullets()[0].radius).toBe(9);

    expect(manager.processCollisions(monsterGrid([enemy]))).toHaveLength(1);
    expect(manager.cleanup()).toEqual(['bullet_0']);
  });

  it('adds explosion targets for enemy monsters with distance falloff', () => {
    const manager = new BulletManager();
    const direct = makeMonster('direct', 'p2', 10, 0);
    const splash = makeMonster('splash', 'p2', 20, 0);
    const friendly = makeMonster('friendly', 'p1', 20, 0);
    manager.createBullet(
      bulletData({ isExplosive: true, explosionRadius: 30, explosionDamage: 90 }),
      'tower1',
      'p1'
    );

    manager.updatePositions(monsterMap([direct, splash, friendly]));
    const [hit] = manager.processCollisions(monsterGrid([direct, splash, friendly]));

    expect(hit.isExplosion).toBe(true);
    expect(hit.explosionTargets.map((target) => target.id)).toEqual(['direct', 'splash']);
    expect(hit.explosionTargets[0].damage).toBeCloseTo(90);
    expect(hit.explosionTargets[1].damage).toBeCloseTo(60);
  });

  it('targets enemy buildings and towers when targetsTowers is set', () => {
    const manager = new BulletManager();
    const farBuilding = makeBuilding('farBuilding', 'p2', 40, 0);
    const nearTower = makeTower('nearTower', 'p2', 10, 0);
    const friendlyTower = makeTower('friendlyTower', 'p1', 5, 0);
    manager.createBullet(bulletData({ targetsTowers: true }), 'monster1', 'p1', 'monster');

    manager.updatePositions(new MapSchema<MonsterState>());
    const hits = manager.processCollisions(
      monsterGrid([]),
      buildingGrid([farBuilding]),
      towerGrid([friendlyTower, nearTower])
    );

    expect(hits).toHaveLength(1);
    expect(hits[0].targetId).toBe('nearTower');
    expect(hits[0].targetType).toBe('tower');
  });

  it('adds structure explosion targets for buildings and towers', () => {
    const manager = new BulletManager();
    const building = makeBuilding('b1', 'p2', 10, 0);
    const tower = makeTower('t1', 'p2', 20, 0);
    manager.createBullet(
      bulletData({ targetsTowers: true, isExplosive: true, explosionRadius: 30, explosionDamage: 60 }),
      'monster1',
      'p1',
      'monster'
    );

    manager.updatePositions(new MapSchema<MonsterState>());
    const [hit] = manager.processCollisions(monsterGrid([]), buildingGrid([building]), towerGrid([tower]));

    expect(hit.targetType).toBe('building');
    expect(hit.explosionTargets.map((target) => `${target.targetType}:${target.id}`)).toEqual([
      'building:b1',
      'tower:t1',
    ]);
    expect(hit.explosionTargets[0].damage).toBeCloseTo(60);
    expect(hit.explosionTargets[1].damage).toBeCloseTo(40);
  });

  it('supports direct remove, get, and clear operations', () => {
    const manager = new BulletManager();
    const first = manager.createBullet(bulletData(), 'tower1', 'p1');
    const second = manager.createBullet(bulletData(), 'tower1', 'p1');

    expect(manager.getBullet(first.id)).toBe(first);
    expect(manager.removeBullet(first.id)).toBe(true);
    expect(manager.getBullet(first.id)).toBeUndefined();
    expect(manager.cleanup()).toEqual(['bullet_0']);

    expect(manager.getBullet(second.id)).toBe(second);
    manager.clear();
    expect(manager.getActiveBullets()).toEqual([]);
    expect(manager.getBulletCount()).toBe(0);
  });
});
