/**
 * FogWorkerTask — Renders the fog-of-war static layer on OffscreenCanvas inside a Web Worker.
 *
 * Core flow (mirrors FogRenderer._rebuildStaticCache on the main thread):
 * 1. Fill entire buffer area with fog color
 * 2. Switch to destination-out compositing
 * 3. Carve vision holes using a pre-rendered radial-gradient hole mask
 * 4. Transfer the result as an ImageBitmap back to the main thread
 *
 * The mask is lazily created and reused across rebuilds. Canvas is recreated
 * only when dimensions change.
 */

import type { FogRebuildStaticPayload } from '../types';

/** Buffer expansion ratio — must match FogRenderer.BUFFER_RATIO */
const BUFFER_RATIO = 1.5;

export class FogWorkerTask {
    private _canvas: OffscreenCanvas | null = null;
    private _ctx: OffscreenCanvasRenderingContext2D | null = null;

    /** Pre-rendered hole mask canvas for radial gradient carving */
    private _holeMask: OffscreenCanvas | null = null;
    private _holeMaskSize = 0;

    /** Last canvas dimensions — skip recreation when unchanged */
    private _lastCanvasWidth = 0;
    private _lastCanvasHeight = 0;

    /** Buffer world area boundaries (carried within the rendered bitmap) */
    bufferLeft = 0;
    bufferTop = 0;
    bufferWorldWidth = 0;
    bufferWorldHeight = 0;

    /**
     * Rebuild static fog layer and return ImageBitmap.
     */
    async rebuild(payload: FogRebuildStaticPayload): Promise<ImageBitmap> {
        const {
            canvasWidth, canvasHeight, pr,
            cameraX, cameraY, cameraZoom,
            cameraViewWidth, cameraViewHeight,
            worldWidth, worldHeight,
            visionSourcesBuffer, visionSourcesCount,
            fogColorR, fogColorG, fogColorB, fogColorA,
            outerGradientSize,
        } = payload;

        // Ensure canvas exists and matches dimensions
        this._ensureCanvas(canvasWidth * pr, canvasHeight * pr);
        const ctx = this._ctx!;

        // Calculate buffer world area (same as FogRenderer._rebuildStaticCache)
        const viewWorldWidth = cameraViewWidth / cameraZoom;
        const viewWorldHeight = cameraViewHeight / cameraZoom;
        const bufferWorldWidth = viewWorldWidth * BUFFER_RATIO;
        const bufferWorldHeight = viewWorldHeight * BUFFER_RATIO;
        const cameraCenterX = cameraX + viewWorldWidth / 2;
        const cameraCenterY = cameraY + viewWorldHeight / 2;

        this.bufferLeft = Math.max(0, cameraCenterX - bufferWorldWidth / 2);
        this.bufferTop = Math.max(0, cameraCenterY - bufferWorldHeight / 2);
        const bufferRight = Math.min(worldWidth, this.bufferLeft + bufferWorldWidth);
        const bufferBottom = Math.min(worldHeight, this.bufferTop + bufferWorldHeight);
        this.bufferWorldWidth = bufferRight - this.bufferLeft;
        this.bufferWorldHeight = bufferBottom - this.bufferTop;

        // Guard against zero-size buffer (division by zero)
        if (this.bufferWorldWidth <= 0 || this.bufferWorldHeight <= 0) {
            return this._canvas!.transferToImageBitmap();
        }

        // Coordinate transform: world coords → canvas pixels
        const pixelWidth = canvasWidth * pr;
        const pixelHeight = canvasHeight * pr;
        const scaleX = pixelWidth / this.bufferWorldWidth;
        const scaleY = pixelHeight / this.bufferWorldHeight;
        ctx.setTransform(scaleX, 0, 0, scaleY, -this.bufferLeft * scaleX, -this.bufferTop * scaleY);

        // Clear and fill with fog color
        ctx.clearRect(this.bufferLeft, this.bufferTop, this.bufferWorldWidth, this.bufferWorldHeight);
        ctx.fillStyle = `rgba(${fogColorR}, ${fogColorG}, ${fogColorB}, ${fogColorA})`;
        ctx.fillRect(this.bufferLeft, this.bufferTop, this.bufferWorldWidth, this.bufferWorldHeight);

        // Carve vision holes using destination-out
        ctx.globalCompositeOperation = 'destination-out';

        // Initialize hole mask if needed
        const maskRadius = outerGradientSize * 4;
        this._initHoleMask(maskRadius, outerGradientSize);

        for (let i = 0; i < visionSourcesCount; i++) {
            const x = visionSourcesBuffer[i * 3];
            const y = visionSourcesBuffer[i * 3 + 1];
            const radius = visionSourcesBuffer[i * 3 + 2];

            // Cull sources outside buffer area
            if (x + radius < this.bufferLeft || x - radius > bufferRight ||
                y + radius < this.bufferTop || y - radius > bufferBottom) {
                continue;
            }

            this._drawVisionHole(ctx, x, y, radius, maskRadius);
        }

        ctx.globalCompositeOperation = 'source-over';

        // Transfer result as ImageBitmap
        return this._canvas!.transferToImageBitmap();
    }

    // ---------------------------------------------------------------------------
    // Private helpers
    // ---------------------------------------------------------------------------

    private _ensureCanvas(pixelWidth: number, pixelHeight: number): void {
        if (this._canvas &&
            this._lastCanvasWidth === pixelWidth &&
            this._lastCanvasHeight === pixelHeight) {
            return;
        }
        this._canvas = new OffscreenCanvas(pixelWidth, pixelHeight);
        this._ctx = this._canvas.getContext('2d')!;
        this._lastCanvasWidth = pixelWidth;
        this._lastCanvasHeight = pixelHeight;
    }

    /**
     * Create a pre-rendered radial-gradient hole mask (mirrors FogRenderer._initHoleMask).
     * The mask is a circle where center is fully opaque and the outer edge fades to transparent.
     */
    private _initHoleMask(maskRadius: number, outerGradientSize: number): void {
        const size = (maskRadius + outerGradientSize) * 2;
        if (this._holeMask && this._holeMaskSize === size) return;

        this._holeMask = new OffscreenCanvas(size, size);
        this._holeMaskSize = size;
        const ctx = this._holeMask.getContext('2d')!;
        const center = maskRadius + outerGradientSize;

        // Radial gradient: center (full alpha) → outer edge (zero alpha)
        const gradient = ctx.createRadialGradient(
            center, center, 0,
            center, center, maskRadius + outerGradientSize
        );
        gradient.addColorStop(0, 'rgba(0,0,0,1)');

        const gradientStart = maskRadius / (maskRadius + outerGradientSize);
        gradient.addColorStop(gradientStart, 'rgba(0,0,0,1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.beginPath();
        ctx.arc(center, center, maskRadius + outerGradientSize, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    /**
     * Draw a vision hole using the pre-rendered mask (mirrors FogRenderer._drawVisionHole).
     */
    private _drawVisionHole(
        ctx: OffscreenCanvasRenderingContext2D,
        x: number, y: number, radius: number,
        maskRadius: number
    ): void {
        // Scale the pre-rendered mask to match the source radius
        const scale = radius / maskRadius;
        const drawSize = this._holeMaskSize * scale;

        ctx.drawImage(
            this._holeMask!,
            x - drawSize / 2,
            y - drawSize / 2,
            drawSize,
            drawSize
        );
    }
}