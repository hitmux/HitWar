/**
 * FogOfWar - Fog of War main class
 * Manages fog state and vision sources
 */

import { VisionSource, RadarSweepArea, VISION_CONFIG, VisionType } from './visionConfig';
import { FogRenderer } from './fogRenderer';

// Interface definitions (for decoupling)
interface TowerLike {
    pos: { x: number; y: number };
    inValidTerritory: boolean;
    visionType: VisionType;
    visionLevel: number;
    radarAngle: number;
    getVisionRadius(): number;
}

interface WorldLike {
    width: number;
    height: number;
    rootBuilding: { pos: { x: number; y: number } };
    batterys: TowerLike[];
    territory?: {
        validBuildings: Set<unknown>;
        recalculate(): void;
    };
}

export class FogOfWar {
    world: WorldLike;
    renderer: FogRenderer;
    enabled: boolean = true;

    // Vision source cache
    private _visionSourcesDirty: boolean = true;
    private _staticVisionSources: VisionSource[] = [];

    // Visibility grid cache (performance optimization - 2D array instead of Map+string key)
    private _visibilityGrid: (boolean | undefined)[][] = [];
    private _gridWidth: number = 0;
    private _gridHeight: number = 0;
    private _gridDirty: boolean = true;

    // Radar sweep area object pool (avoid creating temporary objects each frame)
    private _radarAreasPool: RadarSweepArea[] = [];
    private _radarAreasCount: number = 0;

    // Pre-computed radar area cache (updated in update() each frame)
    private _cachedRadarAreas: { areas: RadarSweepArea[], count: number } = { areas: [], count: 0 };

    // Radar tower count cache (for rendering optimization: skip composite layer when no radar)
    private _hasRadarTowers: boolean = false;
    private _radarFrameInterval: number = 3;
    private _radarAngleThreshold: number = Math.PI / 90; // ~2 degrees
    private _framesSinceRadarUpdate: number = 0;
    private _lastRadarAngles: WeakMap<TowerLike, number> = new WeakMap();
    private _lastRadarCount: number = 0;

    constructor(world: WorldLike) {
        this.world = world;
        this.renderer = new FogRenderer(this);
        this._initVisibilityGrid();
    }

    /**
     * Initialize visibility grid (2D array)
     */
    private _initVisibilityGrid(): void {
        const cellSize = VISION_CONFIG.visibilityGridCellSize;
        this._gridWidth = Math.ceil(this.world.width / cellSize) + 1;
        this._gridHeight = Math.ceil(this.world.height / cellSize) + 1;
        this._visibilityGrid = [];
        for (let y = 0; y < this._gridHeight; y++) {
            this._visibilityGrid[y] = new Array(this._gridWidth);
        }
    }

    /**
     * Clear grid cache
     */
    private _clearVisibilityGrid(): void {
        for (let y = 0; y < this._gridHeight; y++) {
            for (let x = 0; x < this._gridWidth; x++) {
                this._visibilityGrid[y][x] = undefined;
            }
        }
    }

    /**
     * Mark vision sources need recalculation
     * Call when: tower add/remove, territory change, vision upgrade
     */
    markDirty(): void {
        this._visionSourcesDirty = true;
        this._gridDirty = true;
        this.renderer.invalidateCache();
    }

    /**
     * Update each frame
     */
    update(): void {
        if (!this.enabled) return;

        this._framesSinceRadarUpdate++;
        const radarTowers = this._collectRadarTowers();
        this._hasRadarTowers = radarTowers.length > 0;

        const shouldUpdateRadar = this._shouldUpdateRadar(radarTowers);
        if (shouldUpdateRadar) {
            // Pre-compute radar sweep areas for this frame (optimization: avoid repeated calculation in isPositionVisible)
            this._cachedRadarAreas = this._computeRadarSweepAreas(radarTowers);
            this._framesSinceRadarUpdate = 0;
            this._updateRadarAnglesCache(radarTowers);
            // Radar sweep is dynamic, need to re-composite render each frame
            this.renderer.markDynamicDirty();
        } else if (!this._hasRadarTowers && this._cachedRadarAreas.count !== 0) {
            // Clear cached areas when radar towers disappear
            this._cachedRadarAreas = { areas: this._radarAreasPool, count: 0 };
            this.renderer.markDynamicDirty();
        }
    }

    /**
     * Check if position is visible
     * Performance critical path, may be called thousands of times per frame
     *
     * Cache strategy:
     * - Static vision (headquarters + normal towers + observer towers) uses grid cache
     * - Radar sweep areas checked in real-time (angle changes each frame, not suitable for caching)
     */
    isPositionVisible(x: number, y: number): boolean {
        if (!this.enabled) return true;

        // 1. Check static vision first (using grid cache)
        if (this._isInStaticVision(x, y)) return true;

        // 2. Then check radar sweep areas (real-time calculation, no cache)
        return this._isInRadarSweep(x, y);
    }

    /**
     * Check if a circle (entity with radius) is visible
     * Returns true if any part of the circle is in vision range
     */
    isCircleVisible(x: number, y: number, radius: number): boolean {
        if (!this.enabled) return true;

        // 1. Check static vision (expand detection range by entity radius)
        if (this._isCircleInStaticVision(x, y, radius)) return true;

        // 2. Check radar sweep areas
        return this._isCircleInRadarSweep(x, y, radius);
    }

    /**
     * Check if position is in static vision (using grid cache optimization)
     */
    private _isInStaticVision(x: number, y: number): boolean {
        // 1. Calculate grid coordinates
        const cellSize = VISION_CONFIG.visibilityGridCellSize;
        const gx = Math.floor(x / cellSize);
        const gy = Math.floor(y / cellSize);

        // Boundary check
        if (gx < 0 || gx >= this._gridWidth || gy < 0 || gy >= this._gridHeight) {
            return false;
        }

        // 2. Check grid cache (2D array O(1) access)
        if (!this._gridDirty && this._visibilityGrid[gy][gx] !== undefined) {
            return this._visibilityGrid[gy][gx]!;
        }

        // 3. Compute static visibility
        const visible = this._computeStaticVisibility(x, y);

        // 4. Cache result (only cache static vision results)
        this._visibilityGrid[gy][gx] = visible;

        return visible;
    }

    /**
     * Check if a circle intersects with static vision sources
     */
    private _isCircleInStaticVision(x: number, y: number, radius: number): boolean {
        const sources = this.getStaticVisionSources();
        // 100% fog boundary is at src.radius + outerGradientSize
        const outerGradientSize = VISION_CONFIG.outerGradientSize;
        for (const src of sources) {
            const dx = x - src.x;
            const dy = y - src.y;
            // Include gradient zone - entity visible until fully in 100% fog
            const combinedRadius = src.radius + outerGradientSize + radius;
            if (dx * dx + dy * dy <= combinedRadius * combinedRadius) {
                return true;
            }
        }
        return false;
    }

    /**
     * Actually compute position visibility (only check static vision sources)
     * Radar sweep areas checked separately by _isInRadarSweep, no caching
     */
    private _computeStaticVisibility(x: number, y: number): boolean {
        // Check static vision sources
        const sources = this.getStaticVisionSources();
        for (const src of sources) {
            const dx = x - src.x;
            const dy = y - src.y;
            if (dx * dx + dy * dy <= src.radius * src.radius) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if position is in radar sweep area (real-time calculation, no cache)
     */
    private _isInRadarSweep(x: number, y: number): boolean {
        const { areas, count } = this._cachedRadarAreas;
        for (let i = 0; i < count; i++) {
            if (this._isInSweepArea(x, y, areas[i])) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if a circle intersects with radar sweep areas
     */
    private _isCircleInRadarSweep(x: number, y: number, radius: number): boolean {
        const { areas, count } = this._cachedRadarAreas;
        for (let i = 0; i < count; i++) {
            if (this._isCircleInSweepArea(x, y, radius, areas[i])) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if a circle intersects with a single radar sweep area
     */
    private _isCircleInSweepArea(x: number, y: number, radius: number, area: RadarSweepArea): boolean {
        const dx = x - area.x;
        const dy = y - area.y;
        const distSq = dx * dx + dy * dy;
        const combinedRadius = area.radius + radius;

        // Check distance first (expanded by entity radius)
        if (distSq > combinedRadius * combinedRadius) return false;

        // Check angle
        const angle = Math.atan2(dy, dx);
        const normalizedAngle = FogOfWar._normalizeAngle(angle - area.startAngle);
        const sweepRange = FogOfWar._normalizeAngle(area.endAngle - area.startAngle);

        return normalizedAngle <= sweepRange;
    }

    // Pre-computed constant to avoid repeated calculation
    private static readonly TWO_PI = Math.PI * 2;

    /**
     * Normalize angle to [0, 2pi) range (static method, avoid creating arrow function each call)
     */
    private static _normalizeAngle(a: number): number {
        return ((a % FogOfWar.TWO_PI) + FogOfWar.TWO_PI) % FogOfWar.TWO_PI;
    }

    /**
     * Check if point is in sector sweep area
     * Uses robust angle normalization algorithm, correctly handles crossing ±pi boundary
     */
    private _isInSweepArea(x: number, y: number, area: RadarSweepArea): boolean {
        const dx = x - area.x;
        const dy = y - area.y;
        const distSq = dx * dx + dy * dy;

        // Check distance first
        if (distSq > area.radius * area.radius) return false;

        // Check angle (use static method to avoid creating temporary function)
        const angle = Math.atan2(dy, dx);
        const normalizedAngle = FogOfWar._normalizeAngle(angle - area.startAngle);
        const sweepRange = FogOfWar._normalizeAngle(area.endAngle - area.startAngle);

        return normalizedAngle <= sweepRange;
    }

    /**
     * Get static vision sources (headquarters + towers in valid territory)
     */
    getStaticVisionSources(): VisionSource[] {
        if (!this._visionSourcesDirty) {
            return this._staticVisionSources;
        }

        this._staticVisionSources = [];
        this._visionSourcesDirty = false;

        // Headquarters always provides vision
        this._staticVisionSources.push({
            x: this.world.rootBuilding.pos.x,
            y: this.world.rootBuilding.pos.y,
            radius: VISION_CONFIG.headquarters,
            type: 'static'
        });

        // Only towers in valid territory provide vision
        for (const tower of this.world.batterys) {
            if (!tower.inValidTerritory) continue;

            // Radar tower: basic 120px + 5*level (125, 130, 135, 140, 145)
            // Other towers: use getVisionRadius()
            const radius = tower.visionType === VisionType.RADAR
                ? VISION_CONFIG.basicTower + tower.visionLevel * 5
                : tower.getVisionRadius();

            this._staticVisionSources.push({
                x: tower.pos.x,
                y: tower.pos.y,
                radius: radius,
                type: 'static'
            });
        }

        // Clear grid cache
        this._clearVisibilityGrid();
        this._gridDirty = false;

        return this._staticVisionSources;
    }

    /**
     * Get radar sweep areas (return pre-computed cache)
     * Used by renderer to draw radar sweep effects
     */
    getRadarSweepAreas(): { areas: RadarSweepArea[], count: number } {
        return this._cachedRadarAreas;
    }

    private _collectRadarTowers(): TowerLike[] {
        const radarTowers: TowerLike[] = [];
        for (const t of this.world.batterys) {
            if (t.inValidTerritory && t.visionType === VisionType.RADAR && t.visionLevel > 0) {
                radarTowers.push(t);
            }
        }
        return radarTowers;
    }

    private _shouldUpdateRadar(radarTowers: TowerLike[]): boolean {
        if (radarTowers.length !== this._lastRadarCount) {
            return true;
        }
        if (this._framesSinceRadarUpdate >= this._radarFrameInterval) {
            return true;
        }
        if (!this._hasRadarTowers) {
            return this._cachedRadarAreas.count !== 0;
        }
        const threshold = this._radarAngleThreshold;
        if (threshold <= 0) return false;
        for (const tower of radarTowers) {
            const last = this._lastRadarAngles.get(tower);
            if (last === undefined) {
                return true;
            }
            const diff = Math.abs(tower.radarAngle - last);
            if (diff >= threshold) {
                return true;
            }
        }
        return false;
    }

    private _updateRadarAnglesCache(radarTowers: TowerLike[]): void {
        this._lastRadarCount = radarTowers.length;
        this._lastRadarAngles = new WeakMap();
        for (const tower of radarTowers) {
            this._lastRadarAngles.set(tower, tower.radarAngle);
        }
    }

    /**
     * Whether there are radar towers (for rendering optimization)
     */
    hasRadarTowers(): boolean {
        return this._hasRadarTowers;
    }

    /**
     * Compute radar sweep areas (use object pool to avoid creating temporary objects each frame)
     * Called once per frame in update(), result cached to _cachedRadarAreas
     */
    private _computeRadarSweepAreas(radarTowers?: TowerLike[]): { areas: RadarSweepArea[], count: number } {
        this._radarAreasCount = 0;
        const { sweepAngle, tailSegments } = VISION_CONFIG.radar;
        const towers = radarTowers ?? this._collectRadarTowers();
        this._hasRadarTowers = towers.length > 0;

        if (towers.length === 0) {
            return { areas: this._radarAreasPool, count: 0 };
        }

        // Dynamically adjust tail segments: more radar towers, fewer tails (performance optimization)
        const effectiveTailSegments = Math.max(2, Math.floor(tailSegments / Math.max(1, towers.length)));

        for (const tower of towers) {
            const radius = tower.getVisionRadius();
            const currentAngle = tower.radarAngle;

            // Add trailing sectors (multiple fading sectors)
            for (let i = 0; i <= effectiveTailSegments; i++) {
                const alpha = 1 - (i / effectiveTailSegments);
                const angleOffset = (i / effectiveTailSegments) * (Math.PI / 3);

                // Use object pool: reuse or expand
                if (this._radarAreasCount >= this._radarAreasPool.length) {
                    this._radarAreasPool.push({
                        x: 0, y: 0, radius: 0,
                        startAngle: 0, endAngle: 0, alpha: 0
                    });
                }

                // Update object in pool (avoid creating new objects)
                const area = this._radarAreasPool[this._radarAreasCount];
                area.x = tower.pos.x;
                area.y = tower.pos.y;
                area.radius = radius;
                area.startAngle = currentAngle - sweepAngle - angleOffset;
                area.endAngle = currentAngle + sweepAngle - angleOffset;
                area.alpha = alpha;

                this._radarAreasCount++;
            }
        }

        return { areas: this._radarAreasPool, count: this._radarAreasCount };
    }
}
