/**
 * InputValidator - Server-side authoritative validation for all player actions
 *
 * Uses shared validation pure functions + server-specific checks
 * (territory, collision, real-time resource deduction)
 */

import type { GameState } from '../schema/GameState.js';
import type { TowerState } from '../schema/TowerState.js';
import type { BuildingState } from '../schema/BuildingState.js';
import type { MapSchema } from '@colyseus/schema';
import type { TerritoryCalculator } from '../systems/territory/territoryCalculator.js';
import {
  type ValidationResult,
  ValidationErrorCode,
  validationSuccess,
  validationFailure,
  validateBuildTowerBasic,
  validateUpgradeTower,
  validateSellTower,
  validateCannonFire,
  validateCannonSetAutoTarget,
  validateSpawnMonster,
  type TowerMetaData,
  type PlayerValidationState,
  type TowerValidationState,
  type SpawnableMonsterConfig,
  type SpawnerValidationState,
} from '../shared/validation/index.js';
import { checkBuildCollision } from './collisionValidator.js';

/**
 * Tower metadata registry for server-side validation
 * Populated from shared config data
 */
export class TowerMetaRegistry {
  private metas: Map<string, TowerMetaData> = new Map();

  register(id: string, price: number, levelUpArr: string[]): void {
    this.metas.set(id, { id, price, levelUpArr });
  }

  get(id: string): TowerMetaData | undefined {
    return this.metas.get(id);
  }

  has(id: string): boolean {
    return this.metas.has(id);
  }
}

/**
 * Spawnable monster config registry
 */
export class SpawnableMonsterRegistry {
  private configs: Map<string, SpawnableMonsterConfig> = new Map();

  register(config: SpawnableMonsterConfig): void {
    this.configs.set(config.monsterId, config);
  }

  get(monsterId: string): SpawnableMonsterConfig | undefined {
    return this.configs.get(monsterId);
  }
}

/**
 * Building metadata registry for server-side validation
 */
export class BuildingMetaRegistry {
  private metas: Map<string, { id: string; price: number; radius: number; hp: number }> = new Map();

  register(id: string, price: number, radius: number, hp: number): void {
    this.metas.set(id, { id, price, radius, hp });
  }

  get(id: string): { id: string; price: number; radius: number; hp: number } | undefined {
    return this.metas.get(id);
  }

  has(id: string): boolean {
    return this.metas.has(id);
  }
}

/**
 * Adapt PlayerState to PlayerValidationState interface
 */
function toPlayerValidation(
  player: { id: string; isAlive: boolean; money: number } | undefined
): PlayerValidationState | undefined {
  if (!player) return undefined;
  return { id: player.id, isAlive: player.isAlive, money: player.money };
}

/**
 * Adapt TowerState to TowerValidationState interface
 */
function toTowerValidation(
  tower: TowerState | undefined
): TowerValidationState | undefined {
  if (!tower) return undefined;
  return {
    id: tower.id,
    ownerId: tower.ownerId,
    towerType: tower.towerType,
    position: { x: tower.position.x, y: tower.position.y },
    radius: tower.radius,
    attackRadius: tower.attackRadius,
    isManual: tower.isManual,
    currentAmmo: tower.currentAmmo,
  };
}

/**
 * Adapt BuildingState to SpawnerValidationState interface
 */
function toSpawnerValidation(
  building: BuildingState | undefined
): SpawnerValidationState | undefined {
  if (!building) return undefined;
  return {
    id: building.id,
    ownerId: building.ownerId,
    isSpawner: building.isSpawner,
    position: { x: building.position.x, y: building.position.y },
    getCooldownRemaining(monsterType: string): number {
      const cd = building.getCooldown(monsterType);
      return cd ? cd.remainingTicks : 0;
    },
  };
}

/**
 * Convert MapSchema to iterable with spatial interface
 */
function* toSpatialIterable(
  entities: MapSchema<TowerState> | MapSchema<BuildingState>
): Iterable<{ id: string; position: { x: number; y: number }; radius: number }> {
  for (const entity of entities.values()) {
    yield {
      id: entity.id,
      position: { x: entity.position.x, y: entity.position.y },
      radius: entity.radius,
    };
  }
}

/**
 * Main server-side input validator
 * Provides authoritative validation for all player actions
 */
export class InputValidator {
  private state: GameState;
  private territory: TerritoryCalculator;
  private towerMeta: TowerMetaRegistry;
  private spawnableMeta: SpawnableMonsterRegistry;
  private buildingMeta: BuildingMetaRegistry;

  constructor(
    state: GameState,
    territory: TerritoryCalculator,
    towerMeta: TowerMetaRegistry,
    spawnableMeta: SpawnableMonsterRegistry,
    buildingMeta: BuildingMetaRegistry
  ) {
    this.state = state;
    this.territory = territory;
    this.towerMeta = towerMeta;
    this.spawnableMeta = spawnableMeta;
    this.buildingMeta = buildingMeta;
  }

  /**
   * Update references (call if state or territory is replaced)
   */
  updateRefs(state: GameState, territory: TerritoryCalculator): void {
    this.state = state;
    this.territory = territory;
  }

  /**
   * Validate BUILD_TOWER action
   * Full server validation: shared checks + territory + collision + money deduction
   */
  validateBuildTower(
    playerId: string,
    towerType: string,
    x: number,
    y: number
  ): ValidationResult {
    const player = this.state.getPlayer(playerId);
    const meta = this.towerMeta.get(towerType);
    const bounds = {
      width: this.state.mapConfig.width,
      height: this.state.mapConfig.height,
    };

    // Step 1: Shared basic validation (player state, type, bounds)
    const basicResult = validateBuildTowerBasic(
      toPlayerValidation(player),
      towerType,
      x,
      y,
      meta,
      bounds
    );
    if (!basicResult.valid) return basicResult;

    // Step 2: Territory check - must be in own territory
    const inOwnTerritory = this.territory.isPositionInValidTerritory(
      x,
      y,
      playerId,
      this.state.buildings,
      this.state.towers
    );

    if (!inOwnTerritory) {
      return validationFailure(ValidationErrorCode.POSITION_NOT_IN_TERRITORY);
    }

    // Step 3: Collision check
    const collisionResult = checkBuildCollision(
      x,
      y,
      15, // default tower radius
      toSpatialIterable(this.state.towers),
      toSpatialIterable(this.state.buildings)
    );
    if (collisionResult.collides) {
      return validationFailure(
        ValidationErrorCode.POSITION_COLLISION,
        `Collision with entity: ${collisionResult.collidingEntityId}`
      );
    }

    // Step 4: Check money
    const cost = meta!.price;
    if (player!.money < cost) {
      return validationFailure(
        ValidationErrorCode.INSUFFICIENT_MONEY,
        `Need ${cost}, have ${player!.money}`
      );
    }

    return validationSuccess({ cost, towerType });
  }

  validateBuildBuilding(
    playerId: string,
    buildingType: string,
    x: number,
    y: number
  ): ValidationResult {
    const player = this.state.getPlayer(playerId);
    const meta = this.buildingMeta.get(buildingType);
    const bounds = {
      width: this.state.mapConfig.width,
      height: this.state.mapConfig.height,
    };

    // Step 1: Basic validation
    if (!player || !player.isAlive) {
      return validationFailure(ValidationErrorCode.PLAYER_NOT_FOUND);
    }
    if (!meta) {
      return validationFailure(ValidationErrorCode.TOWER_TYPE_INVALID);
    }
    if (x < 0 || x > bounds.width || y < 0 || y > bounds.height) {
      return validationFailure(ValidationErrorCode.POSITION_OUT_OF_BOUNDS);
    }

    // Step 2: Territory check - must be in own territory
    const inOwnTerritory = this.territory.isPositionInValidTerritory(
      x,
      y,
      playerId,
      this.state.buildings,
      this.state.towers
    );

    if (!inOwnTerritory) {
      return validationFailure(ValidationErrorCode.POSITION_NOT_IN_TERRITORY);
    }

    // Step 3: Collision check
    const collisionResult = checkBuildCollision(
      x,
      y,
      meta.radius,
      toSpatialIterable(this.state.towers),
      toSpatialIterable(this.state.buildings)
    );
    if (collisionResult.collides) {
      return validationFailure(
        ValidationErrorCode.POSITION_COLLISION,
        `Collision with entity: ${collisionResult.collidingEntityId}`
      );
    }

    // Step 4: Check money
    const cost = meta.price;
    if (player.money < cost) {
      return validationFailure(
        ValidationErrorCode.INSUFFICIENT_MONEY,
        `Need ${cost}, have ${player.money}`
      );
    }

    return validationSuccess({ cost, buildingType });
  }

  /**
   * Validate UPGRADE_TOWER action
   */
  validateUpgradeTower(
    playerId: string,
    towerId: string,
    targetType: string
  ): ValidationResult {
    const player = this.state.getPlayer(playerId);
    const tower = this.state.towers.get(towerId);
    const currentMeta = tower ? this.towerMeta.get(tower.towerType) : undefined;
    const targetMeta = this.towerMeta.get(targetType);

    return validateUpgradeTower(
      toPlayerValidation(player),
      toTowerValidation(tower),
      targetType,
      currentMeta,
      targetMeta
    );
  }

  /**
   * Validate SELL_TOWER action
   */
  validateSellTower(
    playerId: string,
    towerId: string
  ): ValidationResult {
    const player = this.state.getPlayer(playerId);
    const tower = this.state.towers.get(towerId);
    const meta = tower ? this.towerMeta.get(tower.towerType) : undefined;

    return validateSellTower(
      toPlayerValidation(player),
      toTowerValidation(tower),
      meta,
      0.5 // 50% refund rate
    );
  }

  /**
   * Validate SPAWN_MONSTER action
   */
  validateSpawnMonster(
    playerId: string,
    spawnerId: string,
    monsterType: string,
    targetPlayerId: string
  ): ValidationResult {
    const player = this.state.getPlayer(playerId);
    const spawner = this.state.buildings.get(spawnerId);
    const monsterConfig = this.spawnableMeta.get(monsterType);

    // Territory check for spawner
    if (spawner && spawner.isSpawner) {
      const inTerritory = this.territory.isInValidTerritory(
        spawner.id,
        spawner.ownerId
      );
      if (!inTerritory) {
        return validationFailure(
          ValidationErrorCode.SPAWNER_NOT_IN_TERRITORY,
          'Spawner is not in valid territory'
        );
      }
    }

    return validateSpawnMonster(
      toPlayerValidation(player),
      toSpawnerValidation(spawner),
      monsterType,
      targetPlayerId,
      this.state.wave.currentWave,
      monsterConfig,
      (id: string) => {
        const p = this.state.getPlayer(id);
        if (!p) return undefined;
        return { id: p.id, isAlive: p.isAlive };
      }
    );
  }

  /**
   * Validate CANNON_FIRE action
   */
  validateCannonFire(
    playerId: string,
    towerId: string,
    targetX: number,
    targetY: number
  ): ValidationResult {
    const player = this.state.getPlayer(playerId);
    const tower = this.state.towers.get(towerId);

    const result = validateCannonFire(
      toPlayerValidation(player),
      toTowerValidation(tower),
      targetX,
      targetY
    );

    if (!result.valid) {
      return result;
    }

    if (tower && !tower.inValidTerritory) {
      return validationFailure(
        ValidationErrorCode.POSITION_NOT_IN_TERRITORY,
        'Manual cannon is not in valid territory'
      );
    }

    return result;
  }

  /**
   * Validate CANNON_SET_AUTO_TARGET action
   */
  validateCannonSetAutoTarget(
    playerId: string,
    towerId: string,
    targetX: number,
    targetY: number,
    radius: number
  ): ValidationResult {
    const player = this.state.getPlayer(playerId);
    const tower = this.state.towers.get(towerId);

    return validateCannonSetAutoTarget(
      toPlayerValidation(player),
      toTowerValidation(tower),
      targetX,
      targetY,
      radius
    );
  }
}
