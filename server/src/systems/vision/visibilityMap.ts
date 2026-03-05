/**
 * VisibilityMap - Per-player visibility state
 * Tracks which entities are visible to a specific player based on vision sources.
 */

import {
    VisionType,
    HEADQUARTERS_VISION,
    BASIC_TOWER_VISION,
    RADAR_SWEEP_ANGLE,
    RADAR_SWEEP_SPEED,
    getVisionRadius,
} from '../../../shared/config/visionMeta.js';

/** Circular vision source */
interface VisionCircle {
    x: number;
    y: number;
    radius: number;
    radiusSq: number; // Pre-computed for fast distance check
}

/** Radar sweep source (sector-based) */
interface RadarSource {
    x: number;
    y: number;
    radius: number;
    radiusSq: number;
    sweepAngle: number;
    baseCircleRadiusSq: number; // Basic tower vision as a circle
}

/** Minimal entity interface for visibility checks */
export interface VisibleEntity {
    id: string;
    ownerId: string | null;
    x: number;
    y: number;
    radius?: number;
}

/** Minimal tower interface for building vision sources */
export interface VisionTower {
    id: string;
    ownerId: string;
    x: number;
    y: number;
    visionType: string;
    visionLevel: number;
}

/** Minimal building interface for building vision sources */
export interface VisionBuilding {
    id: string;
    ownerId: string;
    x: number;
    y: number;
    isBase: boolean;
}

const HYSTERESIS_MARGIN = 30;

export class VisibilityMap {
    readonly playerId: string;

    private _visibleEntities: Set<string> = new Set();
    private _visionCircles: VisionCircle[] = [];
    private _radarSources: RadarSource[] = [];
    private _dirty = true;

    constructor(playerId: string) {
        this.playerId = playerId;
    }

    /** Mark that vision sources need rebuilding */
    markDirty(): void {
        this._dirty = true;
    }

    /** Check if an entity is currently visible (O(1)) */
    isVisible(entityId: string): boolean {
        return this._visibleEntities.has(entityId);
    }

    /**
     * Rebuild vision source lists from player's buildings and towers.
     * Call this when towers/buildings change (build, sell, upgrade, destroy).
     */
    rebuildVisionSources(buildings: VisionBuilding[], towers: VisionTower[]): void {
        this._visionCircles.length = 0;
        this._radarSources.length = 0;

        // Buildings: headquarters provide large vision
        for (const b of buildings) {
            if (b.ownerId !== this.playerId) continue;
            if (b.isBase) {
                const r = HEADQUARTERS_VISION;
                this._visionCircles.push({ x: b.x, y: b.y, radius: r, radiusSq: r * r });
            }
        }

        // Towers: basic vision + special vision types
        for (const t of towers) {
            if (t.ownerId !== this.playerId) continue;

            // All own towers provide basic vision
            const basicR = BASIC_TOWER_VISION;
            this._visionCircles.push({ x: t.x, y: t.y, radius: basicR, radiusSq: basicR * basicR });

            if (t.visionType === VisionType.OBSERVER && t.visionLevel > 0) {
                // Observer: larger static circle (replaces basic)
                const obsR = getVisionRadius(VisionType.OBSERVER, t.visionLevel);
                if (obsR > basicR) {
                    // Replace the basic circle with the larger observer circle
                    const last = this._visionCircles[this._visionCircles.length - 1];
                    last.radius = obsR;
                    last.radiusSq = obsR * obsR;
                }
            } else if (t.visionType === VisionType.RADAR && t.visionLevel > 0) {
                // Radar: sweep sector with large radius
                const radarR = getVisionRadius(VisionType.RADAR, t.visionLevel);
                this._radarSources.push({
                    x: t.x,
                    y: t.y,
                    radius: radarR,
                    radiusSq: radarR * radarR,
                    sweepAngle: RADAR_SWEEP_ANGLE,
                    baseCircleRadiusSq: basicR * basicR,
                });
            }
        }

        this._dirty = false;
    }

    /**
     * Recalculate visibility for all non-own entities.
     * Returns the set of entity IDs whose visibility changed.
     */
    recalculate(entities: VisibleEntity[], currentTick: number): Set<string> {
        const changed = new Set<string>();
        const newVisible = new Set<string>();

        for (const entity of entities) {
            // Own entities are always visible (handled by @filterChildren callback)
            if (entity.ownerId === this.playerId) continue;

            const wasVisible = this._visibleEntities.has(entity.id);
            const margin = wasVisible ? HYSTERESIS_MARGIN : 0;
            const isVisible = this._checkVisibility(entity.x, entity.y, entity.radius || 0, margin, currentTick);

            if (isVisible) {
                newVisible.add(entity.id);
            }

            if (isVisible !== wasVisible) {
                changed.add(entity.id);
            }
        }

        this._visibleEntities = newVisible;
        return changed;
    }

    /**
     * Check if a world position is visible to this player.
     * Used for broadcast filtering.
     */
    isPositionVisible(x: number, y: number, currentTick: number): boolean {
        return this._checkVisibility(x, y, 0, 0, currentTick);
    }

    get isDirty(): boolean {
        return this._dirty;
    }

    // --- Private ---

    private _checkVisibility(
        x: number, y: number, entityRadius: number, margin: number, currentTick: number
    ): boolean {
        // Check static vision circles
        for (const circle of this._visionCircles) {
            const dx = x - circle.x;
            const dy = y - circle.y;
            const distSq = dx * dx + dy * dy;
            const threshold = circle.radius + entityRadius + margin;
            if (distSq <= threshold * threshold) {
                return true;
            }
        }

        // Check radar sweep sectors
        for (const radar of this._radarSources) {
            const dx = x - radar.x;
            const dy = y - radar.y;
            const distSq = dx * dx + dy * dy;

            // Radar towers also have basic vision circle (already included in _visionCircles)
            // Here we check the sweep sector only
            const threshold = radar.radius + entityRadius + margin;
            if (distSq > threshold * threshold) continue;

            // Check if entity is within the sweep sector
            const currentAngle = (RADAR_SWEEP_SPEED * currentTick) % (Math.PI * 2);
            const entityAngle = Math.atan2(dy, dx);

            if (isInSweepSector(entityAngle, currentAngle, radar.sweepAngle)) {
                return true;
            }
        }

        return false;
    }
}

/**
 * Check if an angle is within a sweep sector.
 * Handles wrap-around at ±PI.
 */
function isInSweepSector(entityAngle: number, sweepCenter: number, sweepWidth: number): boolean {
    let diff = entityAngle - sweepCenter;
    // Normalize to [-PI, PI]
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return Math.abs(diff) <= sweepWidth / 2;
}
