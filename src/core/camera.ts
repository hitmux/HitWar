/**
 * Camera - Manages viewport and world coordinate transformation
 */
import { Vector } from './math/vector';
import { PR } from './staticInitData';

export class Camera {
    x: number;
    y: number;
    zoom: number;
    minZoom: number;
    maxZoom: number;
    viewWidth: number;
    viewHeight: number;
    worldWidth: number;
    worldHeight: number;

    constructor(viewWidth: number, viewHeight: number, worldWidth: number, worldHeight: number) {
        this.x = 0;
        this.y = 0;

        this.zoom = 1.0;
        this.minZoom = Math.max(viewWidth / worldWidth, viewHeight / worldHeight);
        this.maxZoom = 2.0;

        this.viewWidth = viewWidth;
        this.viewHeight = viewHeight;

        this.worldWidth = worldWidth;
        this.worldHeight = worldHeight;
    }

    /**
     * World coordinate to screen coordinate
     */
    worldToScreen(worldPos: Vector): Vector {
        return new Vector(
            (worldPos.x - this.x) * this.zoom,
            (worldPos.y - this.y) * this.zoom
        );
    }

    /**
     * Screen coordinate to world coordinate
     */
    screenToWorld(screenPos: Vector): Vector {
        return new Vector(
            screenPos.x / this.zoom + this.x,
            screenPos.y / this.zoom + this.y
        );
    }

    /**
     * Pan camera
     */
    pan(dx: number, dy: number): void {
        this.x -= dx / this.zoom;
        this.y -= dy / this.zoom;
        this.clampPosition();
    }

    /**
     * Zoom at a specific screen point
     */
    zoomAt(factor: number, screenPos: Vector): void {
        const worldPosBefore = this.screenToWorld(screenPos);

        const newZoom = this.zoom * factor;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));

        this.x = worldPosBefore.x - screenPos.x / this.zoom;
        this.y = worldPosBefore.y - screenPos.y / this.zoom;

        this.clampPosition();
    }

    /**
     * Clamp camera position to world boundaries
     */
    clampPosition(): void {
        const viewWorldWidth = this.viewWidth / this.zoom;
        const viewWorldHeight = this.viewHeight / this.zoom;

        if (viewWorldWidth >= this.worldWidth) {
            this.x = (this.worldWidth - viewWorldWidth) / 2;
        } else {
            this.x = Math.max(0, Math.min(this.worldWidth - viewWorldWidth, this.x));
        }

        if (viewWorldHeight >= this.worldHeight) {
            this.y = (this.worldHeight - viewWorldHeight) / 2;
        } else {
            this.y = Math.max(0, Math.min(this.worldHeight - viewWorldHeight, this.y));
        }
    }

    /**
     * Center camera on a world coordinate
     */
    centerOn(worldPos: Vector): void {
        const viewWorldWidth = this.viewWidth / this.zoom;
        const viewWorldHeight = this.viewHeight / this.zoom;

        this.x = worldPos.x - viewWorldWidth / 2;
        this.y = worldPos.y - viewWorldHeight / 2;

        this.clampPosition();
    }

    /**
     * Apply camera transform to canvas context
     */
    applyTransform(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        ctx.scale(PR, PR);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x, -this.y);
    }

    /**
     * Reset canvas context transform
     */
    resetTransform(ctx: CanvasRenderingContext2D): void {
        ctx.restore();
    }

    /**
     * Update viewport size
     */
    updateViewSize(viewWidth: number, viewHeight: number): void {
        this.viewWidth = viewWidth;
        this.viewHeight = viewHeight;
        this.clampPosition();
    }

    /**
     * Get visible world bounds for culling
     * Returns [left, top, right, bottom] in world coordinates
     */
    getVisibleBounds(): [number, number, number, number] {
        const viewWorldWidth = this.viewWidth / this.zoom;
        const viewWorldHeight = this.viewHeight / this.zoom;

        const left = this.x;
        const top = this.y;
        const right = this.x + viewWorldWidth;
        const bottom = this.y + viewWorldHeight;

        return [left, top, right, bottom];
    }
}
