/**
 * TerritoryRenderer - Territory visualization renderer
 * Uses viewport-level offscreen canvas caching for performance
 *
 * Buffer strategy:
 * - Canvas pixel size = viewport pixel size × BUFFER_RATIO × PR
 * - Buffer world range = viewport world size × BUFFER_RATIO (affected by zoom)
 * - Buffer canvas is centered on camera center, covering larger world area
 * - Rebuild conditions: camera moves beyond 25% of buffer edge, or zoom shrinks > 10%
 */

import { Territory } from './territory';
import { PR } from '@/core/staticInitData';

/** Buffer expansion ratio: Canvas covers 1.5x viewport area to reduce rebuild frequency */
const BUFFER_RATIO = 1.5;

export class TerritoryRenderer {
    territory: Territory;
    validColor: string = 'rgba(100, 180, 255, 0.15)';    // Light blue - valid territory
    invalidColor: string = 'rgba(255, 220, 100, 0.15)';  // Light yellow - invalid territory

    // Offscreen canvas cache
    private _offscreenCanvas: HTMLCanvasElement | null = null;
    private _offscreenCtx: CanvasRenderingContext2D | null = null;
    private _cacheValid: boolean = false;

    // Buffer tracking properties
    private _lastCameraX = 0;
    private _lastCameraY = 0;
    private _lastZoom = 1;
    private _bufferLeft = 0;        // Buffer world area left boundary
    private _bufferTop = 0;         // Buffer world area top boundary
    private _bufferWorldWidth = 0;  // Buffer world width
    private _bufferWorldHeight = 0; // Buffer world height
    private _canvasWidth = 0;       // Canvas logical width (before PR)
    private _canvasHeight = 0;      // Canvas logical height (before PR)
    private _cachedPR = 1;          // Cached pixel ratio

    constructor(territory: Territory) {
        this.territory = territory;
    }

    /**
     * Mark cache as invalid, needs redraw
     */
    invalidateCache(): void {
        this._cacheValid = false;
    }

    /**
     * Check if cache rebuild is needed due to camera movement or zoom change
     */
    private _shouldRebuildForCamera(): boolean {
        const camera = this.territory.world.camera;

        // Zoom shrink detection: must rebuild when zooming out
        if (camera.zoom < this._lastZoom * 0.9) {
            return true;
        }

        // Position change detection
        const viewWorldWidth = camera.viewWidth / camera.zoom;
        const viewWorldHeight = camera.viewHeight / camera.zoom;
        const thresholdX = viewWorldWidth * 0.25;
        const thresholdY = viewWorldHeight * 0.25;

        const dx = Math.abs(camera.x - this._lastCameraX);
        const dy = Math.abs(camera.y - this._lastCameraY);

        return dx > thresholdX || dy > thresholdY;
    }

    /**
     * Ensure offscreen canvas is created with correct viewport-level size
     */
    private _ensureOffscreenCanvas(): void {
        const world = this.territory.world;
        const camera = world.camera;
        const pr = PR;
        const width = world.viewWidth * BUFFER_RATIO;
        const height = world.viewHeight * BUFFER_RATIO;

        if (!this._offscreenCanvas) {
            this._offscreenCanvas = document.createElement('canvas');
            this._offscreenCtx = this._offscreenCanvas.getContext('2d');
        }

        // Canvas uses high-resolution pixels
        const targetPixelWidth = width * pr;
        const targetPixelHeight = height * pr;

        // Check if size or PR needs update
        if (this._offscreenCanvas.width !== targetPixelWidth ||
            this._offscreenCanvas.height !== targetPixelHeight ||
            pr !== this._cachedPR) {
            this._offscreenCanvas.width = targetPixelWidth;
            this._offscreenCanvas.height = targetPixelHeight;
            this._canvasWidth = width;
            this._canvasHeight = height;
            this._cachedPR = pr;
            this._cacheValid = false;
        }

        // Check camera movement or zoom
        if (this._shouldRebuildForCamera()) {
            this._cacheValid = false;
        }
    }

    /**
     * Rebuild offscreen canvas cache with viewport-level buffer
     */
    private _rebuildCache(): void {
        this._ensureOffscreenCanvas();

        const ctx = this._offscreenCtx;
        if (!ctx) return;

        const territory = this.territory;
        const camera = territory.world.camera;
        const world = territory.world;
        const radius = territory.territoryRadius;
        const pr = this._cachedPR;

        // Calculate viewport world size (affected by zoom)
        const viewWorldWidth = camera.viewWidth / camera.zoom;
        const viewWorldHeight = camera.viewHeight / camera.zoom;

        // Buffer world range
        this._bufferWorldWidth = viewWorldWidth * BUFFER_RATIO;
        this._bufferWorldHeight = viewWorldHeight * BUFFER_RATIO;

        // Calculate camera center (world coordinates)
        // Note: camera.x, camera.y is viewport top-left, not center!
        const cameraCenterX = camera.x + viewWorldWidth / 2;
        const cameraCenterY = camera.y + viewWorldHeight / 2;

        // Buffer world area boundaries (with world boundary clipping)
        this._bufferLeft = Math.max(0, cameraCenterX - this._bufferWorldWidth / 2);
        this._bufferTop = Math.max(0, cameraCenterY - this._bufferWorldHeight / 2);
        const bufferRight = Math.min(world.width, this._bufferLeft + this._bufferWorldWidth);
        const bufferBottom = Math.min(world.height, this._bufferTop + this._bufferWorldHeight);

        // Update world size based on actual clipping
        this._bufferWorldWidth = bufferRight - this._bufferLeft;
        this._bufferWorldHeight = bufferBottom - this._bufferTop;

        // Coordinate transform (with PR): map world coordinates to canvas pixels
        // Scale factor = canvas pixel size / world size
        const scaleX = (this._canvasWidth * pr) / this._bufferWorldWidth;
        const scaleY = (this._canvasHeight * pr) / this._bufferWorldHeight;
        ctx.setTransform(scaleX, 0, 0, scaleY, -this._bufferLeft * scaleX, -this._bufferTop * scaleY);

        // Clear offscreen canvas
        ctx.clearRect(this._bufferLeft, this._bufferTop, this._bufferWorldWidth, this._bufferWorldHeight);

        // Render valid territory (light blue)
        ctx.fillStyle = this.validColor;
        ctx.beginPath();
        let hasValidPath = false;
        for (const b of territory.validBuildings) {
            if (!territory._canProvideTerritory(b)) continue;
            const pos = (b as any).pos;
            // Skip buildings outside buffer
            if (pos.x + radius < this._bufferLeft || pos.x - radius > bufferRight ||
                pos.y + radius < this._bufferTop || pos.y - radius > bufferBottom) {
                continue;
            }
            ctx.moveTo(pos.x + radius, pos.y);
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            hasValidPath = true;
        }
        if (hasValidPath) ctx.fill();

        // Render invalid territory (light yellow)
        ctx.fillStyle = this.invalidColor;
        ctx.beginPath();
        let hasInvalidPath = false;
        for (const b of territory.invalidBuildings) {
            if (!territory._canProvideTerritory(b)) continue;
            const pos = (b as any).pos;
            // Skip buildings outside buffer
            if (pos.x + radius < this._bufferLeft || pos.x - radius > bufferRight ||
                pos.y + radius < this._bufferTop || pos.y - radius > bufferBottom) {
                continue;
            }
            ctx.moveTo(pos.x + radius, pos.y);
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            hasInvalidPath = true;
        }
        if (hasInvalidPath) ctx.fill();

        // Record camera state
        this._lastCameraX = camera.x;
        this._lastCameraY = camera.y;
        this._lastZoom = camera.zoom;
        this._cacheValid = true;
    }

    /**
     * Render territory (using cache)
     * Uses 9-parameter drawImage to map canvas pixels to world coordinates
     */
    render(ctx: CanvasRenderingContext2D): void {
        // If cache is invalid, rebuild it
        if (!this._cacheValid) {
            this._rebuildCache();
        }

        // Draw cached offscreen canvas to correct world position
        if (this._offscreenCanvas) {
            const pr = this._cachedPR;
            // 9-parameter form: source region → target region
            ctx.drawImage(
                this._offscreenCanvas,
                0, 0, this._canvasWidth * pr, this._canvasHeight * pr,  // Source: entire canvas
                this._bufferLeft, this._bufferTop,
                this._bufferWorldWidth, this._bufferWorldHeight         // Target: world coordinates
            );
        }
    }
}
