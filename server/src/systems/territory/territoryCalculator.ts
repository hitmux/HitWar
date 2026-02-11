/**
 * Territory Calculator - Server-side territory connectivity calculation
 * Uses BFS to determine which buildings are connected to the base
 *
 * Port of src/systems/territory/territory.ts for server use
 */

import type { BuildingState } from '../../schema/BuildingState.js';
import type { TowerState } from '../../schema/TowerState.js';
import type { MineState } from '../../schema/MineState.js';
import type { MapSchema } from '@colyseus/schema';
import { distSq } from '../../shared/math/vector.js';
import { MineStateType } from '../../../../shared/config/mineMeta.js';

/**
 * Configuration for territory calculation
 */
export interface TerritoryConfig {
  territoryRadius: number; // Territory radius in pixels (default 100)
}

/**
 * Entity that can be in territory
 */
interface TerritoryEntity {
  id: string;
  ownerId: string;
  position: { x: number; y: number };
  isBase?: boolean;
  // Territory flags
  inValidTerritory?: boolean;
}

/**
 * Result of territory calculation for a player
 */
export interface TerritoryResult {
  validBuildings: Set<string>; // IDs of buildings in valid territory
  invalidBuildings: Set<string>; // IDs of buildings in invalid territory
}

const DEFAULT_CONFIG: TerritoryConfig = {
  territoryRadius: 100,
};

/**
 * Calculate territory connectivity using BFS
 * Determines which buildings are connected to the player's base
 */
export class TerritoryCalculator {
  private config: TerritoryConfig;
  private territoryRadiusSq: number;
  private connectionRadiusSq: number;

  // Cache per player
  private playerResults: Map<string, TerritoryResult> = new Map();
  private dirty: boolean = true;

  constructor(config: Partial<TerritoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.territoryRadiusSq = this.config.territoryRadius ** 2;
    // Two buildings connect if distance <= 2 * territoryRadius
    this.connectionRadiusSq = (this.config.territoryRadius * 2) ** 2;
  }

  /**
   * Mark territory as needing recalculation
   */
  markDirty(): void {
    this.dirty = true;
  }

  /**
   * Check if dirty
   */
  isDirty(): boolean {
    return this.dirty;
  }

  /**
   * Recalculate territory for all players
   */
  recalculate(
    buildings: MapSchema<BuildingState>,
    towers: MapSchema<TowerState>,
    mines?: MapSchema<MineState>
  ): Map<string, TerritoryResult> {
    if (!this.dirty) return this.playerResults;
    this.dirty = false;

    this.playerResults.clear();

    // Group entities by owner
    const playerEntities = new Map<string, TerritoryEntity[]>();
    const playerBases = new Map<string, TerritoryEntity>();

    // Process buildings
    buildings.forEach((building) => {
      if (!building.ownerId) return;

      const entity: TerritoryEntity = {
        id: building.id,
        ownerId: building.ownerId,
        position: { x: building.position.x, y: building.position.y },
        isBase: building.isBase,
      };

      if (building.isBase) {
        playerBases.set(building.ownerId, entity);
      }

      if (!playerEntities.has(building.ownerId)) {
        playerEntities.set(building.ownerId, []);
      }
      playerEntities.get(building.ownerId)!.push(entity);
    });

    // Process towers
    towers.forEach((tower) => {
      if (!tower.ownerId) return;

      const entity: TerritoryEntity = {
        id: tower.id,
        ownerId: tower.ownerId,
        position: { x: tower.position.x, y: tower.position.y },
        isBase: false,
      };

      if (!playerEntities.has(tower.ownerId)) {
        playerEntities.set(tower.ownerId, []);
      }
      playerEntities.get(tower.ownerId)!.push(entity);
    });

    // Process mines (only powerPlant state participates in territory)
    if (mines) {
      mines.forEach((mine) => {
        if (!mine.ownerId || mine.mineState !== MineStateType.POWER_PLANT) return;

        const entity: TerritoryEntity = {
          id: mine.id,
          ownerId: mine.ownerId,
          position: { x: mine.position.x, y: mine.position.y },
          isBase: false,
        };

        if (!playerEntities.has(mine.ownerId)) {
          playerEntities.set(mine.ownerId, []);
        }
        playerEntities.get(mine.ownerId)!.push(entity);
      });
    }

    // Calculate territory for each player
    for (const [playerId, entities] of playerEntities) {
      const base = playerBases.get(playerId);
      if (!base) {
        // No base, all buildings invalid
        this.playerResults.set(playerId, {
          validBuildings: new Set(),
          invalidBuildings: new Set(entities.map((e) => e.id)),
        });
        continue;
      }

      const result = this.calculatePlayerTerritory(base, entities);
      this.playerResults.set(playerId, result);
    }

    return this.playerResults;
  }

  /**
   * Calculate territory for a single player using BFS
   */
  private calculatePlayerTerritory(
    base: TerritoryEntity,
    entities: TerritoryEntity[]
  ): TerritoryResult {
    const visited = new Set<string>();
    const queue: TerritoryEntity[] = [base];
    let queueIndex = 0;
    visited.add(base.id);

    // BFS from base to find all connected territory providers
    while (queueIndex < queue.length) {
      const current = queue[queueIndex++];

      for (const other of entities) {
        if (visited.has(other.id)) continue;

        // Check if within connection range (2 * territoryRadius)
        const dist = distSq(current.position, other.position);
        if (dist <= this.connectionRadiusSq) {
          visited.add(other.id);
          queue.push(other);
        }
      }
    }

    // Separate valid and invalid
    const validBuildings = new Set<string>();
    const invalidBuildings = new Set<string>();

    for (const entity of entities) {
      if (visited.has(entity.id)) {
        validBuildings.add(entity.id);
      } else {
        invalidBuildings.add(entity.id);
      }
    }

    return { validBuildings, invalidBuildings };
  }

  /**
   * Get territory result for a specific player
   */
  getPlayerResult(playerId: string): TerritoryResult | undefined {
    return this.playerResults.get(playerId);
  }

  /**
   * Check if a building/tower is in valid territory
   */
  isInValidTerritory(entityId: string, ownerId: string): boolean {
    const result = this.playerResults.get(ownerId);
    if (!result) return false;
    return result.validBuildings.has(entityId);
  }

  /**
   * Check if a position is within valid territory of a player
   * Used for placing new buildings
   */
  isPositionInValidTerritory(
    x: number,
    y: number,
    playerId: string,
    buildings: MapSchema<BuildingState>,
    towers: MapSchema<TowerState>
  ): boolean {
    const result = this.playerResults.get(playerId);
    if (!result) return false;

    const pos = { x, y };

    // Check buildings
    for (const building of buildings.values()) {
      if (building.ownerId !== playerId) continue;
      if (!result.validBuildings.has(building.id)) continue;

      const dist = distSq(pos, { x: building.position.x, y: building.position.y });
      if (dist <= this.territoryRadiusSq) {
        return true;
      }
    }

    // Check towers
    for (const tower of towers.values()) {
      if (tower.ownerId !== playerId) continue;
      if (!result.validBuildings.has(tower.id)) continue;

      const dist = distSq(pos, { x: tower.position.x, y: tower.position.y });
      if (dist <= this.territoryRadiusSq) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the territory multiplier for an entity
   * Returns 1.0 for valid territory, 0.33 for invalid
   */
  getTerritoryMultiplier(entityId: string, ownerId: string): number {
    if (this.isInValidTerritory(entityId, ownerId)) {
      return 1.0;
    }
    return 1 / 3;
  }
}
