import { MapSchema } from '@colyseus/schema';
import { describe, expect, it } from 'vitest';
import { BuildingState } from '../../schema/BuildingState.js';
import { TowerState } from '../../schema/TowerState.js';
import { EnergyCalculator } from './energyCalculator.js';

function tower(id: string, ownerId: string, level: number): TowerState {
  const entity = new TowerState();
  entity.id = id;
  entity.ownerId = ownerId;
  entity.level = level;
  return entity;
}

function building(id: string, ownerId: string, buildingType: string): BuildingState {
  const entity = new BuildingState();
  entity.id = id;
  entity.ownerId = ownerId;
  entity.buildingType = buildingType;
  return entity;
}

describe('EnergyCalculator', () => {
  it('calculates production, valid-territory consumption, and satisfaction ratios per player', () => {
    const towers = new MapSchema<TowerState>();
    towers.set('t1', tower('t1', 'p1', 4));
    towers.set('t2', tower('t2', 'p1', 50));
    towers.set('t3', tower('t3', 'p2', 1));

    const buildings = new MapSchema<BuildingState>();
    buildings.set('b1', building('b1', 'p1', 'RepairBuilding'));
    buildings.set('b2', building('b2', 'p2', 'Base'));

    const calculator = new EnergyCalculator({
      rootProduction: 2,
      consumptionPerTowerLevel: 1,
      consumptionPerRepairBuilding: 2,
    });
    calculator.registerMine('m1', 'p1', 3);

    const result = calculator.recalculate(
      towers,
      buildings,
      new Map([
        ['p1', new Set(['t1', 'b1'])],
        ['p2', new Set(['t3', 'b2'])],
      ])
    );

    expect(result.get('p1')).toEqual({
      production: 5,
      consumption: 6,
      balance: -1,
      satisfactionRatio: 5 / 6,
      isDeficit: true,
    });
    expect(result.get('p2')).toEqual({
      production: 2,
      consumption: 1,
      balance: 1,
      satisfactionRatio: 1,
      isDeficit: false,
    });
    expect(calculator.getSatisfactionRatio('missing')).toBe(1);
  });

  it('marks dirty when mine production changes and removes eliminated player state', () => {
    const towers = new MapSchema<TowerState>();
    towers.set('t1', tower('t1', 'p1', 4));
    const buildings = new MapSchema<BuildingState>();
    const validIds = new Map([['p1', new Set(['t1'])]]);
    const calculator = new EnergyCalculator({
      rootProduction: 0,
      consumptionPerTowerLevel: 1,
    });

    calculator.registerMine('m1', 'p1', 2);
    calculator.recalculate(towers, buildings, validIds);
    expect(calculator.getPlayerState('p1')?.satisfactionRatio).toBe(0.5);

    calculator.updateMineProduction('m1', 4);
    calculator.recalculate(towers, buildings, validIds);
    expect(calculator.getPlayerState('p1')?.satisfactionRatio).toBe(1);

    calculator.removePlayer('p1');
    expect(calculator.getPlayerState('p1')).toBeUndefined();
  });

  it('applies configured deficit penalties and surplus bonuses on matching ticks', () => {
    const towers = new MapSchema<TowerState>();
    towers.set('t1', tower('t1', 'p1', 5));

    const buildings = new MapSchema<BuildingState>();
    buildings.set('b1', building('b1', 'p2', 'Base'));

    const calculator = new EnergyCalculator({
      rootProduction: 2,
      consumptionPerTowerLevel: 1,
      penaltyInterval: 2,
      penaltyCost: 7,
      bonusInterval: 5,
    });

    calculator.recalculate(
      towers,
      buildings,
      new Map([
        ['p1', new Set(['t1'])],
        ['p2', new Set(['b1'])],
      ])
    );

    expect(calculator.processTick(10)).toEqual(new Map([
      ['p1', -7],
      ['p2', 2],
    ]));
    expect(calculator.processTick(11).size).toBe(0);
  });

  it('keeps cached states until marked dirty and clamps satisfaction between zero and one', () => {
    const towers = new MapSchema<TowerState>();
    towers.set('t1', tower('t1', 'p1', 4));
    const buildings = new MapSchema<BuildingState>();
    const calculator = new EnergyCalculator({
      rootProduction: 0,
      consumptionPerTowerLevel: 1,
    });
    const validIds = new Map([['p1', new Set(['t1'])]]);

    const first = calculator.recalculate(towers, buildings, validIds);
    towers.get('t1')!.level = 100;
    const cached = calculator.recalculate(towers, buildings, validIds);
    expect(cached).toBe(first);
    expect(calculator.getPlayerState('p1')?.consumption).toBe(4);
    expect(calculator.getPlayerState('p1')?.satisfactionRatio).toBe(0);

    calculator.markDirty();
    calculator.registerMine('m1', 'p1', 200);
    calculator.recalculate(towers, buildings, validIds);
    expect(calculator.getPlayerState('p1')?.consumption).toBe(100);
    expect(calculator.getPlayerState('p1')?.satisfactionRatio).toBe(1);
  });

  it('clears and unregisters mines from production calculations', () => {
    const towers = new MapSchema<TowerState>();
    towers.set('t1', tower('t1', 'p1', 10));
    const buildings = new MapSchema<BuildingState>();
    const validIds = new Map([['p1', new Set(['t1'])]]);
    const calculator = new EnergyCalculator({
      rootProduction: 0,
      consumptionPerTowerLevel: 1,
    });

    calculator.registerMine('m1', 'p1', 5);
    calculator.registerMine('m2', 'p1', 5);
    calculator.unregisterMine('m1');
    calculator.recalculate(towers, buildings, validIds);
    expect(calculator.getPlayerState('p1')?.production).toBe(5);

    calculator.clearMines();
    calculator.recalculate(towers, buildings, validIds);
    expect(calculator.getPlayerState('p1')?.production).toBe(0);
    expect(calculator.getPlayerState('p1')?.isDeficit).toBe(true);
  });
});
