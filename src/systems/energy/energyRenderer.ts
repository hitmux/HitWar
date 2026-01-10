/**
 * EnergyRenderer - Screen edge red flash when energy is deficit
 */

import { Energy } from './energy';

interface WorldLike {
    energy: Energy;
    viewWidth: number;
    viewHeight: number;
}

export class EnergyRenderer {
    world: WorldLike;
    flashAlpha: number = 0;
    flashDirection: number = 1;

    constructor(world: WorldLike) {
        this.world = world;
    }

    render(ctx: CanvasRenderingContext2D): void {
        if (!this.world.energy.isDeficit()) {
            this.flashAlpha = 0;
            return;
        }

        // Screen edge red flash
        this.flashAlpha += 0.02 * this.flashDirection;
        if (this.flashAlpha >= 0.3) this.flashDirection = -1;
        if (this.flashAlpha <= 0) this.flashDirection = 1;

        const w = this.world.viewWidth;
        const h = this.world.viewHeight;
        const bw = 50;

        ctx.save();
        ctx.fillStyle = `rgba(255, 0, 0, ${this.flashAlpha})`;

        // Non-overlapping edges (avoid double-drawing corners)
        ctx.fillRect(bw, 0, w - 2 * bw, bw);           // Top (middle only)
        ctx.fillRect(bw, h - bw, w - 2 * bw, bw);      // Bottom (middle only)
        ctx.fillRect(0, 0, bw, h);                      // Left (full height)
        ctx.fillRect(w - bw, 0, bw, h);                 // Right (full height)

        ctx.restore();
    }
}
