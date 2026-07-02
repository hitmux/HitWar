/**
 * MultiPlayerTerritory - Manages multiple Territory instances for multiplayer mode
 *
 * In multiplayer mode, each player has their own Territory instance that tracks
 * only their owned buildings. This class provides a unified interface to manage
 * all player territories and calculate build cost multipliers for building in
 * enemy territory.
 */

import { Territory, TerritoryWorldLike, type BuildingLike as TerritoryBuildingLike } from './territory';
import { Vector } from '../../core/math/vector';


interface BuildingLike extends TerritoryBuildingLike {
}

export class MultiPlayerTerritory {
    private _territoryByPlayer: Map<string, Territory> = new Map();
    private _world: TerritoryWorldLike;

    constructor(world: TerritoryWorldLike, playerIds: string[]) {
        this._world = world;
        for (const playerId of playerIds) {
            this._territoryByPlayer.set(playerId, new Territory(world, playerId));
        }
    }

    /**
     * Get Territory instance for a specific player
     */
    getTerritory(playerId: string): Territory | undefined {
        return this._territoryByPlayer.get(playerId);
    }

    /**
     * Get all Territory instances
     */
    getAllTerritories(): Territory[] {
        return Array.from(this._territoryByPlayer.values());
    }

    /**
     * Mark all territories as dirty
     */
    markDirty(): void {
        for (const territory of this._territoryByPlayer.values()) {
            territory.markDirty();
        }
    }

    /**
     * Recalculate all territories
     */
    recalculate(): void {
        for (const territory of this._territoryByPlayer.values()) {
            territory.recalculate();
        }
    }

    /**
     * Add building incrementally to the appropriate player's territory
     * Note: The building's ownerId determines which territory it belongs to
     */
    addBuildingIncremental(building: BuildingLike): void {
        if (building.ownerId) {
            const territory = this._territoryByPlayer.get(building.ownerId);
            territory?.addBuildingIncremental(building);
        }
    }

    /**
     * Remove building incrementally from the appropriate player's territory
     */
    removeBuildingIncremental(building: BuildingLike): void {
        if (building.ownerId) {
            const territory = this._territoryByPlayer.get(building.ownerId);
            territory?.removeBuildingIncremental(building);
        }
    }

    /**
     * Check if position is in ANY player's territory (for enemy territory detection)
     * @param pos Position to check
     * @param excludePlayerId Optional player ID to exclude from check (e.g., local player)
     */
    isPositionInAnyTerritory(pos: Vector, excludePlayerId?: string): boolean {
        for (const [playerId, territory] of this._territoryByPlayer) {
            if (excludePlayerId && playerId === excludePlayerId) {
                continue;
            }
            if (territory.isPositionInAnyTerritory(pos)) {
                return true;
            }
        }
        return false;
    }
}
