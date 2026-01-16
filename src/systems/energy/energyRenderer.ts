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

        // Warning text at bottom center
        const warningText = "能源不足! 将面临惩罚! 快点击黑色三角形(矿井)来建造发电厂吧!";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        
        // Text background for better readability
        const textWidth = ctx.measureText(warningText).width;
        const textHeight = 30;
        const textX = w / 2;
        const textY = h - 60;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(textX - textWidth / 2 - 10, textY - textHeight / 2, textWidth + 20, textHeight);
        
        // Flashing text (sync with edge flash)
        ctx.fillStyle = `rgba(255, ${Math.floor(200 * (1 - this.flashAlpha / 0.3))}, 0, 1)`;
        ctx.fillText(warningText, textX, textY);

        ctx.restore();
    }
}
