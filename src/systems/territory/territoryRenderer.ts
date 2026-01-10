/**
 * TerritoryRenderer - Territory visualization renderer
 * Uses offscreen canvas caching for performance
 */

import { Territory } from './territory';

export class TerritoryRenderer {
    territory: Territory;
    validColor: string = 'rgba(100, 180, 255, 0.15)';    // Light blue - valid territory
    invalidColor: string = 'rgba(255, 220, 100, 0.15)';  // Light yellow - invalid territory

    // Offscreen canvas cache
    private _offscreenCanvas: HTMLCanvasElement | null = null;
    private _offscreenCtx: CanvasRenderingContext2D | null = null;
    private _cacheValid: boolean = false;

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
     * Ensure offscreen canvas is created with correct size
     */
    private _ensureOffscreenCanvas(): void {
        const world = this.territory.world;
        const width = world.width;
        const height = world.height;

        if (!this._offscreenCanvas) {
            this._offscreenCanvas = document.createElement('canvas');
            this._offscreenCtx = this._offscreenCanvas.getContext('2d');
        }

        // Check if size needs update
        if (this._offscreenCanvas.width !== width || this._offscreenCanvas.height !== height) {
            this._offscreenCanvas.width = width;
            this._offscreenCanvas.height = height;
            this._cacheValid = false;
        }
    }

    /**
     * Rebuild offscreen canvas cache
     */
    private _rebuildCache(): void {
        this._ensureOffscreenCanvas();

        const ctx = this._offscreenCtx;
        if (!ctx) return;

        const territory = this.territory;
        const radius = territory.territoryRadius;

        // Clear offscreen canvas
        ctx.clearRect(0, 0, this._offscreenCanvas!.width, this._offscreenCanvas!.height);

        // Render valid territory (light blue)
        ctx.fillStyle = this.validColor;
        ctx.beginPath();
        let hasValidPath = false;
        for (const b of territory.validBuildings) {
            if (!territory._canProvideTerritory(b)) continue;
            const pos = (b as any).pos;
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
            ctx.moveTo(pos.x + radius, pos.y);
            ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
            hasInvalidPath = true;
        }
        if (hasInvalidPath) ctx.fill();

        this._cacheValid = true;
    }

    /**
     * Render territory (using cache)
     */
    render(ctx: CanvasRenderingContext2D): void {
        // If cache is invalid, rebuild it
        if (!this._cacheValid) {
            this._rebuildCache();
        }

        // Draw cached offscreen canvas
        if (this._offscreenCanvas) {
            ctx.drawImage(this._offscreenCanvas, 0, 0);
        }
    }
}
