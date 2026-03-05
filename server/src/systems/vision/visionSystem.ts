/**
 * VisionSystem - Coordinates vision calculations for all players
 * Main entry point for server-side fog of war.
 */

import {
    VisibilityMap,
    type VisibleEntity,
    type VisionTower,
    type VisionBuilding,
} from './visibilityMap.js';
import type { TowerState } from '../../schema/TowerState.js';
import type { MonsterState } from '../../schema/MonsterState.js';
import type { BuildingState } from '../../schema/BuildingState.js';
import type { MineState } from '../../schema/MineState.js';
import type { MapSchema } from '@colyseus/schema';

/** Recalculate vision every N ticks to reduce CPU cost */
const RECALC_INTERVAL = 3;

/** Reusable empty set for throttled recalculate returns */
const EMPTY_SET: Set<string> = new Set();

export class VisionSystem {
    private _maps: Map<string, VisibilityMap> = new Map();
    private _dirty = true;
    private _tickCounter = 0;

    // Reusable arrays to reduce per-tick allocations (H5)
    private _entityBuffer: VisibleEntity[] = [];
    private _towerBuffer: VisionTower[] = [];
    private _buildingBuffer: VisionBuilding[] = [];

    addPlayer(playerId: string): void {
        this._maps.set(playerId, new VisibilityMap(playerId));
        this._dirty = true;
    }

    removePlayer(playerId: string): void {
        this._maps.delete(playerId);
    }

    /**
     * Mark vision sources as dirty (call when towers/buildings change).
     * Next recalculate() will rebuild vision sources before checking visibility.
     */
    markDirty(): void {
        this._dirty = true;
    }

    /**
     * Check if an entity is visible to a specific player.
     * Called by @filterChildren callback - must be O(1).
     */
    isEntityVisible(playerId: string, entityId: string, entityOwnerId: string | null): boolean {
        // Own entities are always visible
        if (entityOwnerId === playerId) return true;

        const map = this._maps.get(playerId);
        if (!map) return false; // Fallback: hidden if player map not found
        return map.isVisible(entityId);
    }

    /**
     * Check if a world position is visible to a specific player.
     * Used for broadcast filtering.
     */
    isPositionVisible(playerId: string, x: number, y: number): boolean {
        const map = this._maps.get(playerId);
        if (!map) return false;
        return map.isPositionVisible(x, y, this._tickCounter);
    }

    /**
     * Recalculate visibility for all players.
     * Throttled to every RECALC_INTERVAL ticks.
     * Returns set of entity IDs whose visibility changed (for touch mechanism).
     */
    recalculate(
        currentTick: number,
        towers: MapSchema<TowerState>,
        monsters: MapSchema<MonsterState>,
        buildings: MapSchema<BuildingState>,
        mines: MapSchema<MineState>,
    ): Set<string> {
        this._tickCounter = currentTick;

        // Throttle recalculation
        if (currentTick % RECALC_INTERVAL !== 0) {
            return EMPTY_SET;
        }

        // Rebuild vision sources if dirty
        if (this._dirty) {
            const towerList = this._extractTowers(towers);
            const buildingList = this._extractBuildings(buildings);
            for (const map of this._maps.values()) {
                map.rebuildVisionSources(buildingList, towerList);
            }
            this._dirty = false;
        }

        // Collect all entities for visibility checks
        const allEntities = this._collectEntities(towers, monsters, buildings, mines);

        // Recalculate for each player, collect all changed entity IDs
        const allChanged = new Set<string>();
        for (const map of this._maps.values()) {
            const changed = map.recalculate(allEntities, currentTick);
            for (const id of changed) {
                allChanged.add(id);
            }
        }

        return allChanged;
    }

    // --- Private helpers ---

    private _extractTowers(towers: MapSchema<TowerState>): VisionTower[] {
        this._towerBuffer.length = 0;
        towers.forEach((tower, _key) => {
            this._towerBuffer.push({
                id: tower.id,
                ownerId: tower.ownerId,
                x: tower.position.x,
                y: tower.position.y,
                visionType: tower.visionType,
                visionLevel: tower.visionLevel,
            });
        });
        return this._towerBuffer;
    }

    private _extractBuildings(buildings: MapSchema<BuildingState>): VisionBuilding[] {
        this._buildingBuffer.length = 0;
        buildings.forEach((building, _key) => {
            this._buildingBuffer.push({
                id: building.id,
                ownerId: building.ownerId,
                x: building.position.x,
                y: building.position.y,
                isBase: building.isBase,
            });
        });
        return this._buildingBuffer;
    }

    private _collectEntities(
        towers: MapSchema<TowerState>,
        monsters: MapSchema<MonsterState>,
        buildings: MapSchema<BuildingState>,
        mines: MapSchema<MineState>,
    ): VisibleEntity[] {
        this._entityBuffer.length = 0;

        towers.forEach((t, _key) => {
            this._entityBuffer.push({ id: t.id, ownerId: t.ownerId, x: t.position.x, y: t.position.y, radius: t.radius });
        });
        monsters.forEach((m, _key) => {
            this._entityBuffer.push({ id: m.id, ownerId: m.ownerId, x: m.position.x, y: m.position.y, radius: m.radius });
        });
        buildings.forEach((b, _key) => {
            this._entityBuffer.push({ id: b.id, ownerId: b.ownerId, x: b.position.x, y: b.position.y, radius: b.radius });
        });
        mines.forEach((mine, _key) => {
            this._entityBuffer.push({ id: mine.id, ownerId: mine.ownerId, x: mine.position.x, y: mine.position.y, radius: mine.radius });
        });

        return this._entityBuffer;
    }
}
