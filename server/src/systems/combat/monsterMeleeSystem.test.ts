import { MapSchema } from '@colyseus/schema';
import { describe, expect, it } from 'vitest';
import { BuildingState } from '../../schema/BuildingState.js';
import { MineState } from '../../schema/MineState.js';
import { MonsterState } from '../../schema/MonsterState.js';
import { TowerState } from '../../schema/TowerState.js';
import { MineStateType } from '../../../../shared/config/mineMeta.js';
import { processMonsterMelee } from './monsterMeleeSystem.js';

function monster(id: string, ownerId: string, x: number, y: number): MonsterState {
  const entity = new MonsterState();
  entity.id = id;
  entity.ownerId = ownerId;
  entity.hp = 40;
  entity.radius = 10;
  entity.prevX = x;
  entity.prevY = y;
  entity.setPosition(x, y);
  return entity;
}

function building(id: string, ownerId: string, x: number, y: number): BuildingState {
  const entity = new BuildingState();
  entity.id = id;
  entity.ownerId = ownerId;
  entity.radius = 15;
  entity.setPosition(x, y);
  return entity;
}

function tower(id: string, ownerId: string, x: number, y: number): TowerState {
  const entity = new TowerState();
  entity.id = id;
  entity.ownerId = ownerId;
  entity.radius = 15;
  entity.setPosition(x, y);
  return entity;
}

function mine(id: string, ownerId: string, x: number, y: number, state: string): MineState {
  const entity = new MineState();
  entity.id = id;
  entity.ownerId = ownerId;
  entity.mineState = state;
  entity.radius = 15;
  entity.setPosition(x, y);
  return entity;
}

describe('processMonsterMelee', () => {
  it('hits the closest enemy structure along the sweep path and uses runtime damage', () => {
    const monsters = new MapSchema<MonsterState>();
    const attacker = monster('m1', 'p1', 0, 0);
    attacker.prevX = 0;
    attacker.prevY = 0;
    attacker.setPosition(100, 0);
    attacker.runtime = {
      liveTime: 5,
      currentCollisionDamage: 77,
      keepAliveOnCollision: true,
    } as any;
    monsters.set(attacker.id, attacker);

    const buildings = new MapSchema<BuildingState>();
    buildings.set('b1', building('b1', 'p2', 90, 0));
    const towers = new MapSchema<TowerState>();
    towers.set('t1', tower('t1', 'p2', 40, 0));

    expect(processMonsterMelee(monsters, buildings, undefined, towers)).toEqual([
      {
        monsterId: 'm1',
        buildingId: 't1',
        damage: 77,
        monsterOwnerId: 'p1',
        keepAlive: true,
        targetType: 'tower',
        towerId: 't1',
      },
    ]);
  });

  it('ignores friendly targets and only damages enemy power-plant mines', () => {
    const monsters = new MapSchema<MonsterState>();
    const attacker = monster('m1', 'p1', 100, 100);
    attacker.runtime = { liveTime: 0 } as any;
    monsters.set(attacker.id, attacker);

    const buildings = new MapSchema<BuildingState>();
    buildings.set('friendly', building('friendly', 'p1', 100, 100));

    const mines = new MapSchema<MineState>();
    mines.set('normal', mine('normal', 'p2', 100, 100, MineStateType.NORMAL));
    mines.set('power', mine('power', 'p2', 100, 100, MineStateType.POWER_PLANT));

    expect(processMonsterMelee(monsters, buildings, mines)).toEqual([
      {
        monsterId: 'm1',
        buildingId: 'power',
        damage: 20,
        monsterOwnerId: 'p1',
        keepAlive: false,
        targetType: 'mine',
        mineId: 'power',
      },
    ]);
  });

  it('processes each monster at most once', () => {
    const monsters = new MapSchema<MonsterState>();
    const attacker = monster('m1', 'p1', 0, 0);
    attacker.setPosition(100, 0);
    attacker.runtime = { liveTime: 10 } as any;
    monsters.set(attacker.id, attacker);

    const buildings = new MapSchema<BuildingState>();
    buildings.set('b1', building('b1', 'p2', 40, 0));
    buildings.set('b2', building('b2', 'p2', 45, 0));

    expect(processMonsterMelee(monsters, buildings)).toHaveLength(1);
  });
});
