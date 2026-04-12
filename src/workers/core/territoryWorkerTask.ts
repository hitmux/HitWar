/**
 * TerritoryWorkerTask — Renders territory visualization on OffscreenCanvas inside a Web Worker.
 *
 * Core flow (mirrors TerritoryRenderer._rebuildCache on the main thread):
 * 1. Set coordinate transform mapping world coords → canvas pixels
 * 2. Clear canvas
 * 3. Draw valid territory circles (light blue)
 * 4. Draw invalid territory circles (light yellow)
 * 5. Transfer the result as an ImageBitmap back to the main thread
 */

import type { TerritoryRebuildPayload, WorkerRenderBufferBounds } from '../types';

/** Buffer expansion ratio — must match TerritoryRenderer.BUFFER_RATIO */
const BUFFER_RATIO = 1.5;

export class TerritoryWorkerTask {
    private _canvas: OffscreenCanvas | null = null;
    private _ctx: OffscreenCanvasRenderingContext2D | null = null;

    /** Last canvas dimensions — skip recreation when unchanged */
    private _lastPixelWidth = 0;
    private _lastPixelHeight = 0;

    /** Buffer world area boundaries (carried within the rendered bitmap) */
    bufferLeft = 0;
    bufferTop = 0;
    bufferWorldWidth = 0;
    bufferWorldHeight = 0;

    /**
     * Rebuild territory layer and return ImageBitmap.
     */
    async rebuild(
        payload: TerritoryRebuildPayload
    ): Promise<{ bitmap: ImageBitmap; bufferBounds: WorkerRenderBufferBounds }> {
        const {
            canvasWidth, canvasHeight, pr,
            cameraX, cameraY, cameraZoom,
            cameraViewWidth, cameraViewHeight,
            worldWidth, worldHeight,
            validBuildingsBuffer, validBuildingsCount,
            invalidBuildingsBuffer, invalidBuildingsCount,
            territoryRadius,
            validColor, invalidColor,
        } = payload;

        // Ensure canvas exists and matches dimensions
        const pixelWidth = canvasWidth * pr;
        const pixelHeight = canvasHeight * pr;
        this._ensureCanvas(pixelWidth, pixelHeight);
        const ctx = this._ctx!;

        // Calculate viewport world size (affected by zoom)
        const viewWorldWidth = cameraViewWidth / cameraZoom;
        const viewWorldHeight = cameraViewHeight / cameraZoom;
        this.bufferWorldWidth = viewWorldWidth * BUFFER_RATIO;
        this.bufferWorldHeight = viewWorldHeight * BUFFER_RATIO;

        // Calculate camera center
        const cameraCenterX = cameraX + viewWorldWidth / 2;
        const cameraCenterY = cameraY + viewWorldHeight / 2;

        // Buffer world area boundaries (clipped to world bounds)
        this.bufferLeft = Math.max(0, cameraCenterX - this.bufferWorldWidth / 2);
        this.bufferTop = Math.max(0, cameraCenterY - this.bufferWorldHeight / 2);
        const bufferRight = Math.min(worldWidth, this.bufferLeft + this.bufferWorldWidth);
        const bufferBottom = Math.min(worldHeight, this.bufferTop + this.bufferWorldHeight);

        // Update actual world size based on clipping
        this.bufferWorldWidth = bufferRight - this.bufferLeft;
        this.bufferWorldHeight = bufferBottom - this.bufferTop;

        // Guard against zero-size buffer (division by zero)
        if (this.bufferWorldWidth <= 0 || this.bufferWorldHeight <= 0) {
            return {
                bitmap: this._canvas!.transferToImageBitmap(),
                bufferBounds: this._getBufferBounds(),
            };
        }

        // Coordinate transform: world coords → canvas pixels
        const scaleX = pixelWidth / this.bufferWorldWidth;
        const scaleY = pixelHeight / this.bufferWorldHeight;
        ctx.setTransform(scaleX, 0, 0, scaleY, -this.bufferLeft * scaleX, -this.bufferTop * scaleY);

        // Clear canvas
        ctx.clearRect(this.bufferLeft, this.bufferTop, this.bufferWorldWidth, this.bufferWorldHeight);

        // Render valid territory (light blue)
        ctx.fillStyle = validColor;
        ctx.beginPath();
        let hasValidPath = false;
        for (let i = 0; i < validBuildingsCount; i++) {
            const x = validBuildingsBuffer[i * 2];
            const y = validBuildingsBuffer[i * 2 + 1];
            // Skip buildings outside buffer
            if (x + territoryRadius < this.bufferLeft || x - territoryRadius > bufferRight ||
                y + territoryRadius < this.bufferTop || y - territoryRadius > bufferBottom) {
                continue;
            }
            ctx.moveTo(x + territoryRadius, y);
            ctx.arc(x, y, territoryRadius, 0, Math.PI * 2);
            hasValidPath = true;
        }
        if (hasValidPath) ctx.fill();

        // Render invalid territory (light yellow)
        ctx.fillStyle = invalidColor;
        ctx.beginPath();
        let hasInvalidPath = false;
        for (let i = 0; i < invalidBuildingsCount; i++) {
            const x = invalidBuildingsBuffer[i * 2];
            const y = invalidBuildingsBuffer[i * 2 + 1];
            // Skip buildings outside buffer
            if (x + territoryRadius < this.bufferLeft || x - territoryRadius > bufferRight ||
                y + territoryRadius < this.bufferTop || y - territoryRadius > bufferBottom) {
                continue;
            }
            ctx.moveTo(x + territoryRadius, y);
            ctx.arc(x, y, territoryRadius, 0, Math.PI * 2);
            hasInvalidPath = true;
        }
        if (hasInvalidPath) ctx.fill();

        // Transfer result as ImageBitmap
        return {
            bitmap: this._canvas!.transferToImageBitmap(),
            bufferBounds: this._getBufferBounds(),
        };
    }

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

    private _ensureCanvas(pixelWidth: number, pixelHeight: number): void {
        if (this._canvas &&
            this._lastPixelWidth === pixelWidth &&
            this._lastPixelHeight === pixelHeight) {
            return;
        }
        this._canvas = new OffscreenCanvas(pixelWidth, pixelHeight);
        this._ctx = this._canvas.getContext('2d')!;
        this._lastPixelWidth = pixelWidth;
        this._lastPixelHeight = pixelHeight;
    }

    private _getBufferBounds(): WorkerRenderBufferBounds {
        return {
            bufferLeft: this.bufferLeft,
            bufferTop: this.bufferTop,
            bufferWorldWidth: this.bufferWorldWidth,
            bufferWorldHeight: this.bufferWorldHeight,
        };
    }
}
