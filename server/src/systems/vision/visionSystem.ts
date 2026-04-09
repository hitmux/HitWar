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

    // Reusable arrays to reduce per-tick allocations
    private _entityBuffer: VisibleEntity[] = [];
    private _towerBuffer: VisionTower[] = [];
    private _buildingBuffer: VisionBuilding[] = [];
    // Reusable set for recalculate return value
    private _allChangedBuffer: Set<string> = new Set();

    addPlayer(playerId: string): void {
        this._maps.set(playerId, new VisibilityMap(playerId));
        this._dirty = true;
    }

    removePlayer(playerId: string): void {
        this._maps.delete(playerId);
    }

    /**
     * Mark vision sources as dirty (e.g. tower built/sold/destroyed).
     * Rebuilds vision circles on next recalculate().
     */
    markDirty(): void {
        this._dirty = true;
    }

    /**
     * Check if an entity is visible to a player.
     * Own entities are always visible; others checked via VisibilityMap.
     */
    isEntityVisible(playerId: string, entityId: string, entityOwnerId: string | null): boolean {
        // Own entities are always visible
        if (entityOwnerId === playerId) return true;

        const map = this._maps.get(playerId);
        if (!map) return false; // Fallback: hidden if player map not found
        return map.isVisible(entityId);
    }

    /**
     * Fast visibility check for @filterChildren callback.
     * Delegates directly to VisibilityMap.isVisible() — O(1) Set.has() lookup.
     * No separate cache needed; _visibleEntities is already pre-computed.
     */
    isFilterCached(playerId: string, entityId: string): boolean {
        return this._maps.get(playerId)?.isVisible(entityId) ?? false;
    }

    /**
     * Check if a world position is visible to a player.
     * Used for broadcast filtering.
     */
    isPositionVisible(playerId: string, x: number, y: number): boolean {
        const map = this._maps.get(playerId);
        if (!map) return false;
        return map.isPositionVisible(x, y, this._tickCounter);
    }

    /**
     * Recalculate vision for all players.
     * Throttled to run every RECALC_INTERVAL ticks.
     * Returns the set of entity IDs whose visibility changed.
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
        const allChanged = this._allChangedBuffer;
        allChanged.clear();
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
        towers.forEach((t) => {
            this._towerBuffer.push({
                id: t.id, ownerId: t.ownerId,
                x: t.position.x, y: t.position.y,
                visionType: t.visionType, visionLevel: t.visionLevel,
            });
        });
        return this._towerBuffer;
    }

    private _extractBuildings(buildings: MapSchema<BuildingState>): VisionBuilding[] {
        this._buildingBuffer.length = 0;
        buildings.forEach((b) => {
            this._buildingBuffer.push({
                id: b.id, ownerId: b.ownerId,
                x: b.position.x, y: b.position.y,
                isBase: b.isBase,
            });
        });
        return this._buildingBuffer;
    }

    /**
     * Collect all entities into a flat buffer for visibility checks.
     * Reuses objects in the buffer to avoid per-tick allocations.
     */
    private _collectEntities(
        towers: MapSchema<TowerState>,
        monsters: MapSchema<MonsterState>,
        buildings: MapSchema<BuildingState>,
        mines: MapSchema<MineState>,
    ): VisibleEntity[] {
        let idx = 0;
        const buf = this._entityBuffer;

        towers.forEach((t) => {
            if (idx < buf.length) {
                const e = buf[idx];
                e.id = t.id; e.ownerId = t.ownerId; e.x = t.position.x; e.y = t.position.y; e.radius = t.radius;
            } else {
                buf.push({ id: t.id, ownerId: t.ownerId, x: t.position.x, y: t.position.y, radius: t.radius });
            }
            idx++;
        });
        monsters.forEach((m) => {
            if (idx < buf.length) {
                const e = buf[idx];
                e.id = m.id; e.ownerId = m.ownerId; e.x = m.position.x; e.y = m.position.y; e.radius = m.radius;
            } else {
                buf.push({ id: m.id, ownerId: m.ownerId, x: m.position.x, y: m.position.y, radius: m.radius });
            }
            idx++;
        });
        buildings.forEach((b) => {
            if (idx < buf.length) {
                const e = buf[idx];
                e.id = b.id; e.ownerId = b.ownerId; e.x = b.position.x; e.y = b.position.y; e.radius = b.radius;
            } else {
                buf.push({ id: b.id, ownerId: b.ownerId, x: b.position.x, y: b.position.y, radius: b.radius });
            }
            idx++;
        });
        mines.forEach((mine) => {
            if (idx < buf.length) {
                const e = buf[idx];
                e.id = mine.id; e.ownerId = mine.ownerId; e.x = mine.position.x; e.y = mine.position.y; e.radius = mine.radius;
            } else {
                buf.push({ id: mine.id, ownerId: mine.ownerId, x: mine.position.x, y: mine.position.y, radius: mine.radius });
            }
            idx++;
        });

        buf.length = idx;

        // Shrink buffer if capacity is excessive (>2000 and using <50%)
        if (buf.length > 2000 && idx < buf.length / 2) {
            this._entityBuffer = buf.slice(0, idx);
        }

        return buf;
    }
}
