/**
 * FogRenderer - Fog of War rendering class
 * Uses offscreen canvas composition to avoid destination-out affecting game elements
 */

import { FogOfWar } from './fogOfWar';
import { VISION_CONFIG, RadarSweepArea, VisionType } from './visionConfig';
import { PR } from '@/core/staticInitData';

export class FogRenderer {
    private _fog: FogOfWar;

    // Static fog layer (cached, only rebuild when vision sources change)
    private _staticCanvas: HTMLCanvasElement | null = null;
    private _staticCtx: CanvasRenderingContext2D | null = null;
    private _staticCacheValid: boolean = false;

    // Composite layer (rebuild each frame: static layer + radar holes)
    private _compositeCanvas: HTMLCanvasElement | null = null;
    private _compositeCtx: CanvasRenderingContext2D | null = null;
    private _dynamicDirty: boolean = true;

    // Cached world dimensions and pixel ratio
    private _cachedWidth: number = 0;
    private _cachedHeight: number = 0;
    private _cachedPR: number = 1;

    // Radar sweep area cache (for optimization: skip compose when changes are small)
    private _lastRadarAreas: RadarSweepArea[] = [];
    private _lastRadarCount: number = 0;

    // Pre-rendered vision hole mask (avoid creating RadialGradient every time)
    private _holeMaskCanvas: HTMLCanvasElement | null = null;
    private _holeMaskSize: number = 0;

    constructor(fog: FogOfWar) {
        this._fog = fog;
    }

    /**
     * Mark static cache invalid (call when vision sources change)
     */
    invalidateCache(): void {
        this._staticCacheValid = false;
        this._dynamicDirty = true;
        // Reset radar area cache when static vision changes
        this._lastRadarAreas = [];
        this._lastRadarCount = 0;
    }

    /**
     * Mark dynamic layer needs rebuild (call each frame for radar sweep)
     */
    markDynamicDirty(): void {
        this._dynamicDirty = true;
    }

    /**
     * Main render method
     *
     * Key design:
     * 1. Offscreen canvas contains fog for entire world (worldWidth x worldHeight)
     * 2. Draw with Camera transform preserved, from world coordinates (0,0)
     * 3. Camera will auto-clip to visible area
     *
     * Performance optimization:
     * - No radar towers: use static cache directly, skip composite layer copy
     */
    render(ctx: CanvasRenderingContext2D, worldWidth: number, worldHeight: number): void {
        if (!this._fog.enabled) return;

        const pr = PR;

        // Check dimension changes, reinitialize canvas
        if (worldWidth !== this._cachedWidth || worldHeight !== this._cachedHeight || pr !== this._cachedPR) {
            this._initCanvases(worldWidth, worldHeight, pr);
        }

        // 1. Ensure static cache is valid
        if (!this._staticCacheValid) {
            this._rebuildStaticCache(worldWidth, worldHeight, pr);
        }

        // 2. Choose render path: with radar use composite layer, without use static directly
        if (this._fog.hasRadarTowers()) {
            // Compose final fog layer (static layer + radar sweep holes)
            if (this._dynamicDirty) {
                this._composeFrame(worldWidth, worldHeight, pr);
                this._dynamicDirty = false;
            }
            // Draw composed fog layer
            if (this._compositeCanvas) {
                ctx.drawImage(
                    this._compositeCanvas,
                    0, 0, worldWidth * pr, worldHeight * pr,
                    0, 0, worldWidth, worldHeight
                );
            }
        } else {
            // [Performance] No radar towers: use static cache directly, skip composite copy
            if (this._staticCanvas) {
                ctx.drawImage(
                    this._staticCanvas,
                    0, 0, worldWidth * pr, worldHeight * pr,
                    0, 0, worldWidth, worldHeight
                );
            }
        }
    }

    /**
     * Initialize offscreen canvases
     */
    private _initCanvases(width: number, height: number, pr: number): void {
        this._cachedWidth = width;
        this._cachedHeight = height;
        this._cachedPR = pr;

        // Static cache canvas
        if (!this._staticCanvas) {
            this._staticCanvas = document.createElement('canvas');
            this._staticCtx = this._staticCanvas.getContext('2d');
        }
        this._staticCanvas.width = width * pr;
        this._staticCanvas.height = height * pr;

        // Composite canvas
        if (!this._compositeCanvas) {
            this._compositeCanvas = document.createElement('canvas');
            this._compositeCtx = this._compositeCanvas.getContext('2d');
        }
        this._compositeCanvas.width = width * pr;
        this._compositeCanvas.height = height * pr;

        // Initialize pre-rendered hole mask
        this._initHoleMask();

        this._staticCacheValid = false;
    }


    /**
     * Initialize pre-rendered vision hole mask
     * Creates a standard-size radial gradient mask that can be scaled when drawing
     * New: gradient extends outward from visible radius, creating 30% opacity fog at edge
     */
    private _initHoleMask(): void {
        const { outerGradientSize, innerEdgeFogOpacity } = VISION_CONFIG;
        // Use a fixed size for the mask (outer gradient size determines effective radius)
        const maskRadius = outerGradientSize * 4;
        const size = (maskRadius + outerGradientSize) * 2;

        if (!this._holeMaskCanvas || this._holeMaskSize !== size) {
            this._holeMaskCanvas = document.createElement('canvas');
            this._holeMaskCanvas.width = size;
            this._holeMaskCanvas.height = size;
            this._holeMaskSize = size;

            const ctx = this._holeMaskCanvas.getContext('2d')!;
            const center = maskRadius + outerGradientSize;

            // 1. Fill center area with full alpha (100% transparent / 0% fog)
            ctx.beginPath();
            ctx.arc(center, center, maskRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,1)';  // Full carve out
            ctx.fill();

            // 2. Draw gradient ring for edge transition (25% -> 100% fog)
            // destination-out: alpha determines how much fog is removed
            const innerAlpha = 1 - innerEdgeFogOpacity;  // 0.75 for 25% fog
            const gradient = ctx.createRadialGradient(
                center, center, maskRadius,
                center, center, maskRadius + outerGradientSize
            );
            gradient.addColorStop(0, `rgba(0,0,0,${innerAlpha})`);  // Inner edge: 25% fog
            gradient.addColorStop(1, 'rgba(0,0,0,0)');              // Outer edge: 100% fog

            ctx.beginPath();
            ctx.arc(center, center, maskRadius + outerGradientSize, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        }
    }

    /**
     * Rebuild static fog cache
     * On offscreen canvas: fill fog -> destination-out carve out static vision areas
     */
    private _rebuildStaticCache(width: number, height: number, pr: number): void {
        const ctx = this._staticCtx!;
        ctx.setTransform(pr, 0, 0, pr, 0, 0);

        // Clear and fill fog
        ctx.clearRect(0, 0, width, height);
        const { fogColor } = VISION_CONFIG;
        ctx.fillStyle = `rgba(${fogColor.r}, ${fogColor.g}, ${fogColor.b}, ${fogColor.a})`;
        ctx.fillRect(0, 0, width, height);

        // Use destination-out to carve out visible areas (safe on offscreen canvas)
        ctx.globalCompositeOperation = 'destination-out';
        const sources = this._fog.getStaticVisionSources();

        for (const src of sources) {
            this._drawVisionHole(ctx, src.x, src.y, src.radius);
        }

        ctx.globalCompositeOperation = 'source-over';
        this._staticCacheValid = true;
    }

    /**
     * Check if radar sweep areas have changed significantly enough to require recomposition
     * Returns true if composition can be skipped (use previous frame's result)
     */
    private _shouldSkipCompose(areas: RadarSweepArea[], count: number): boolean {
        if (count !== this._lastRadarCount) return false;
        if (count === 0) return true; // No radar towers, use static cache

        const ANGLE_THRESHOLD = 0.01; // Angle change threshold (rad) ~0.57 degrees

        for (let i = 0; i < count; i++) {
            const current = areas[i];
            const last = this._lastRadarAreas[i];
            if (!last) return false;

            // Compare position and radius
            if (Math.abs(current.x - last.x) > 0.1 ||
                Math.abs(current.y - last.y) > 0.1 ||
                Math.abs(current.radius - last.radius) > 0.1) {
                return false;
            }

            // Compare angle (using center angle)
            const currentCenter = (current.startAngle + current.endAngle) / 2;
            const lastCenter = (last.startAngle + last.endAngle) / 2;
            const angleDiff = Math.abs(currentCenter - lastCenter);
            const normalizedDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);

            if (normalizedDiff > ANGLE_THRESHOLD) {
                return false;
            }
        }

        return true; // Changes are below threshold, can skip composition
    }

    /**
     * Compose each frame's final fog layer
     * 1. Copy static cache to composite canvas
     * 2. Carve out radar sweep areas on composite canvas
     */
    private _composeFrame(width: number, height: number, pr: number): void {
        const { areas, count } = this._fog.getRadarSweepAreas();

        // Check if composition can be skipped (optimization: avoid expensive canvas operations)
        if (this._shouldSkipCompose(areas, count)) {
            return; // Skip composition, reuse previous frame's result
        }

        const ctx = this._compositeCtx!;

        // 1. Copy static cache (full copy, preserve high DPI)
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, width * pr, height * pr);
        if (this._staticCanvas) {
            ctx.drawImage(this._staticCanvas, 0, 0);
        }

        // 2. Carve out radar sweep areas on composite layer
        ctx.setTransform(pr, 0, 0, pr, 0, 0);
        ctx.globalCompositeOperation = 'destination-out';

        for (let i = 0; i < count; i++) {
            const area = areas[i];
            this._drawRadarSweepHole(ctx, area);
        }

        ctx.globalCompositeOperation = 'source-over';

        // 3. Draw radar scan line effects (visual enhancement, doesn't affect fog)
        this._renderRadarScanLines(ctx);

        // 4. Update radar area cache for next frame's optimization
        // Snapshot values instead of sharing pooled objects (pooled objects mutate each frame)
        this._lastRadarAreas = [];
        for (let i = 0; i < count; i++) {
            const area = areas[i];
            this._lastRadarAreas.push({
                x: area.x,
                y: area.y,
                radius: area.radius,
                startAngle: area.startAngle,
                endAngle: area.endAngle,
                alpha: area.alpha
            });
        }
        this._lastRadarCount = count;
    }

    /**
     * Draw circular vision hole (with outer gradient edge)
     * New: gradient extends outward from visible radius
     */
    private _drawVisionHole(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number): void {
        const { outerGradientSize, innerEdgeFogOpacity } = VISION_CONFIG;

        // Use pre-rendered mask if available
        if (this._holeMaskCanvas && this._holeMaskSize > 0) {
            const maskRadius = outerGradientSize * 4;
            const scale = radius / maskRadius;
            const drawSize = this._holeMaskSize * scale;

            ctx.drawImage(
                this._holeMaskCanvas,
                x - drawSize / 2,
                y - drawSize / 2,
                drawSize,
                drawSize
            );
            return;
        }

        // Fallback: create directly (only if mask not initialized)
        // 1. Fill center area with full alpha (100% transparent / 0% fog)
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,1)';  // Full carve out
        ctx.fill();

        // 2. Draw gradient ring for edge transition (25% -> 100% fog)
        const innerAlpha = 1 - innerEdgeFogOpacity;  // 0.75 for 25% fog
        const gradient = ctx.createRadialGradient(
            x, y, radius,
            x, y, radius + outerGradientSize
        );
        gradient.addColorStop(0, `rgba(0,0,0,${innerAlpha})`);  // Inner edge: 25% fog
        gradient.addColorStop(1, 'rgba(0,0,0,0)');              // Outer edge: 100% fog

        ctx.beginPath();
        ctx.arc(x, y, radius + outerGradientSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    /**
     * Draw radar sweep sector hole (with gradient edge and alpha)
     */
    private _drawRadarSweepHole(ctx: CanvasRenderingContext2D, area: RadarSweepArea): void {
        const { edgeGradientRatio } = VISION_CONFIG;
        const edgeGradientSize = area.radius * edgeGradientRatio;

        const gradient = ctx.createRadialGradient(
            area.x, area.y, Math.max(0, area.radius - edgeGradientSize),
            area.x, area.y, area.radius
        );
        gradient.addColorStop(0, `rgba(0,0,0,${area.alpha})`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.beginPath();
        ctx.moveTo(area.x, area.y);
        ctx.arc(area.x, area.y, area.radius, area.startAngle, area.endAngle);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    /**
     * Render radar scan line effects (visual enhancement)
     */
    private _renderRadarScanLines(ctx: CanvasRenderingContext2D): void {
        const towers = this._fog.world.batterys;

        ctx.save();
        ctx.globalCompositeOperation = 'source-over';

        for (const tower of towers) {
            if (!tower.inValidTerritory) continue;
            if (tower.visionType !== VisionType.RADAR || tower.visionLevel <= 0) continue;

            const radius = tower.getVisionRadius();

            // Draw scan line
            ctx.beginPath();
            ctx.moveTo(tower.pos.x, tower.pos.y);
            const endX = tower.pos.x + Math.cos(tower.radarAngle) * radius;
            const endY = tower.pos.y + Math.sin(tower.radarAngle) * radius;
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.8)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw scan sector edge glow
            ctx.beginPath();
            ctx.moveTo(tower.pos.x, tower.pos.y);
            ctx.arc(
                tower.pos.x, tower.pos.y, radius,
                tower.radarAngle - VISION_CONFIG.radar.sweepAngle,
                tower.radarAngle + VISION_CONFIG.radar.sweepAngle
            );
            ctx.closePath();
            ctx.strokeStyle = 'rgba(0, 255, 100, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        ctx.restore();
    }
}
