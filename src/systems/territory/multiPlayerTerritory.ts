/**
 * MultiPlayerTerritory - Manages multiple Territory instances for multiplayer mode
 *
 * In multiplayer mode, each player has their own Territory instance that tracks
 * only their owned buildings. This class provides a unified interface to manage
 * all player territories and calculate build cost multipliers for building in
 * enemy territory.
 */

import { Territory } from './territory';
import { Vector } from '../../core/math/vector';
import { PVP_CONFIG } from '../../types/player';

interface BuildingLike {
    pos: Vector;
    ownerId?: string | null;
}

interface WorldLike {
    width: number;
    height: number;
    viewWidth: number;
    viewHeight: number;
    camera: { x: number; y: number; zoom: number; viewWidth: number; viewHeight: number };
    getBaseBuilding(playerId?: string): BuildingLike;
    batterys: BuildingLike[];
    buildings: BuildingLike[];
    mines: Set<BuildingLike>;
    fog?: { markDirty(): void };
}

export class MultiPlayerTerritory {
    private _territoryByPlayer: Map<string, Territory> = new Map();
    private _world: WorldLike;

    constructor(world: WorldLike, playerIds: string[]) {
        this._world = world;
        for (const playerId of playerIds) {
            this._territoryByPlayer.set(playerId, new Territory(world as any, playerId));
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
     * Check if a position is in an enemy's valid territory
     * Returns true if the position is in any player's valid territory other than the specified player
     */
    isPositionInEnemyTerritory(pos: Vector, playerId: string): boolean {
        for (const [id, territory] of this._territoryByPlayer) {
            if (id === playerId) continue;
            if (territory.isPositionInValidTerritory(pos)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Get build cost multiplier for a position
     * Returns 2x (PVP_CONFIG.territory.enemyBuildCostMultiplier) if in enemy territory, 1x otherwise
     */
    getBuildCostMultiplier(pos: Vector, playerId: string): number {
        if (this.isPositionInEnemyTerritory(pos, playerId)) {
            return PVP_CONFIG.territory.enemyBuildCostMultiplier;
        }
        return 1;
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
            territory?.addBuildingIncremental(building as any);
        }
    }

    /**
     * Remove building incrementally from the appropriate player's territory
     */
    removeBuildingIncremental(building: BuildingLike): void {
        if (building.ownerId) {
            const territory = this._territoryByPlayer.get(building.ownerId);
            territory?.removeBuildingIncremental(building as any);
        }
    }
}
