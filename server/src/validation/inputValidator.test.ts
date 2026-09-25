import { describe, expect, it } from 'vitest';
import { BuildingState } from '../schema/BuildingState.js';
import { GameState } from '../schema/GameState.js';
import { PlayerState } from '../schema/PlayerState.js';
import { TowerState } from '../schema/TowerState.js';
import { ValidationErrorCode } from '../shared/validation/index.js';
import {
  BuildingMetaRegistry,
  InputValidator,
  SpawnableMonsterRegistry,
  TowerMetaRegistry,
} from './inputValidator.js';

function createState(): GameState {
  const state = new GameState();
  state.mapConfig.width = 1000;
  state.mapConfig.height = 800;
  state.wave.currentWave = 5;

  const player = new PlayerState('p1', 'Player 1');
  player.money = 500;
  state.players.set(player.id, player);

  const target = new PlayerState('p2', 'Player 2');
  target.money = 500;
  state.players.set(target.id, target);

  return state;
}

function createValidator(
  state: GameState,
  territoryOverrides: Partial<{
    positionValid: boolean;
    entityValid: boolean;
  }> = {}
): InputValidator {
  const territory = {
    isPositionInValidTerritory: () => territoryOverrides.positionValid ?? true,
    isInValidTerritory: () => territoryOverrides.entityValid ?? true,
  };
  const towerMeta = new TowerMetaRegistry();
  towerMeta.register('BasicTower', 100, ['AdvancedTower']);
  towerMeta.register('AdvancedTower', 250, []);

  const spawnableMeta = new SpawnableMonsterRegistry();
  spawnableMeta.register({
    monsterId: 'Normal',
    cost: 30,
    cooldownTicks: 90,
    unlockWave: 3,
  });

  const buildingMeta = new BuildingMetaRegistry();
  buildingMeta.register('Wall', 75, 20, 200);

  return new InputValidator(
    state,
    territory as any,
    towerMeta,
    spawnableMeta,
    buildingMeta
  );
}

function addTower(state: GameState, id: string, ownerId: string, x: number, y: number): TowerState {
  const tower = new TowerState();
  tower.id = id;
  tower.ownerId = ownerId;
  tower.towerType = 'BasicTower';
  tower.radius = 15;
  tower.attackRadius = 100;
  tower.currentAmmo = 1;
  tower.isManual = true;
  tower.setPosition(x, y);
  state.towers.set(id, tower);
  return tower;
}

function addSpawner(state: GameState, id: string, ownerId: string): BuildingState {
  const building = new BuildingState();
  building.id = id;
  building.ownerId = ownerId;
  building.buildingType = 'MonsterSpawner';
  building.isSpawner = true;
  building.radius = 25;
  building.setPosition(100, 100);
  state.buildings.set(id, building);
  return building;
}

describe('InputValidator registries', () => {
  it('stores tower and building metadata by id', () => {
    const towers = new TowerMetaRegistry();
    towers.register('BasicTower', 100, ['AdvancedTower']);
    const buildings = new BuildingMetaRegistry();
    buildings.register('Wall', 75, 20, 200);

    expect(towers.has('BasicTower')).toBe(true);
    expect(towers.get('BasicTower')).toEqual({
      id: 'BasicTower',
      price: 100,
      levelUpArr: ['AdvancedTower'],
    });
    expect(buildings.has('Wall')).toBe(true);
    expect(buildings.get('Wall')).toEqual({
      id: 'Wall',
      price: 75,
      radius: 20,
      hp: 200,
    });
  });
});

describe('InputValidator build validation', () => {
  it('validates build tower success and reports territory, collision, and money failures', () => {
    const state = createState();
    let validator = createValidator(state);

    expect(validator.validateBuildTower('p1', 'BasicTower', 200, 200)).toEqual({
      valid: true,
      data: { cost: 100, towerType: 'BasicTower' },
    });

    validator = createValidator(state, { positionValid: false });
    expect(validator.validateBuildTower('p1', 'BasicTower', 200, 200).errorCode).toBe(
      ValidationErrorCode.POSITION_NOT_IN_TERRITORY
    );

    validator = createValidator(state);
    addTower(state, 'existing', 'p1', 200, 200);
    expect(validator.validateBuildTower('p1', 'BasicTower', 200, 200).errorCode).toBe(
      ValidationErrorCode.POSITION_COLLISION
    );

    state.towers.delete('existing');
    state.getPlayer('p1')!.money = 10;
    expect(validator.validateBuildTower('p1', 'BasicTower', 200, 200).errorCode).toBe(
      ValidationErrorCode.INSUFFICIENT_MONEY
    );
  });

  it('validates build building metadata, bounds, territory, collision, and cost', () => {
    const state = createState();
    const validator = createValidator(state);

    expect(validator.validateBuildBuilding('p1', 'Wall', 300, 300)).toEqual({
      valid: true,
      data: { cost: 75, buildingType: 'Wall' },
    });
    expect(validator.validateBuildBuilding('p1', 'Missing', 300, 300).errorCode).toBe(
      ValidationErrorCode.TOWER_TYPE_INVALID
    );
    expect(validator.validateBuildBuilding('p1', 'Wall', -1, 300).errorCode).toBe(
      ValidationErrorCode.POSITION_OUT_OF_BOUNDS
    );

    addTower(state, 'existing', 'p1', 300, 300);
    expect(validator.validateBuildBuilding('p1', 'Wall', 300, 300).errorCode).toBe(
      ValidationErrorCode.POSITION_COLLISION
    );
  });
});

describe('InputValidator action validation', () => {
  it('delegates tower upgrade, sell, and cannon fire checks with server territory guard', () => {
    const state = createState();
    const tower = addTower(state, 't1', 'p1', 100, 100);
    const validator = createValidator(state);

    expect(validator.validateUpgradeTower('p1', 't1', 'AdvancedTower')).toEqual({
      valid: true,
      data: { cost: 250, targetType: 'AdvancedTower' },
    });
    expect(validator.validateSellTower('p1', 't1')).toEqual({
      valid: true,
      data: { refund: 50, towerId: 't1' },
    });
    expect(validator.validateCannonFire('p1', 't1', 150, 100)).toEqual({ valid: true });

    tower.inValidTerritory = false;
    expect(validator.validateCannonFire('p1', 't1', 150, 100).errorCode).toBe(
      ValidationErrorCode.POSITION_NOT_IN_TERRITORY
    );
  });

  it('validates spawn monster success and server-only territory failure', () => {
    const state = createState();
    const spawner = addSpawner(state, 's1', 'p1');
    const validator = createValidator(state);

    expect(validator.validateSpawnMonster('p1', 's1', 'Normal', 'p2')).toEqual({
      valid: true,
      data: {
        cost: 30,
        cooldownTicks: 90,
        monsterId: 'Normal',
      },
    });

    spawner.setCooldown('Normal', 10, 90);
    expect(validator.validateSpawnMonster('p1', 's1', 'Normal', 'p2').errorCode).toBe(
      ValidationErrorCode.SPAWN_ON_COOLDOWN
    );

    const territoryFailureValidator = createValidator(state, { entityValid: false });
    expect(territoryFailureValidator.validateSpawnMonster('p1', 's1', 'Normal', 'p2').errorCode).toBe(
      ValidationErrorCode.SPAWNER_NOT_IN_TERRITORY
    );
  });
});
