/**
 * Obstacle - Blocks building placement, does not affect monster movement
 */
import { Vector } from '../math/vector';
import type { Circle } from '../math/circle';

interface ObstacleSaveData {
    x: number;
    y: number;
    radius: number;
}

interface WorldLike {
    width: number;
    height: number;
    rootBuilding: { pos: Vector };
}

export class Obstacle {
    pos: Vector;
    radius: number;
    color: string;
    borderColor: string;

    constructor(pos: Vector, radius: number) {
        this.pos = pos;
        this.radius = radius;
        this.color = '#6B4423';
        this.borderColor = '#8B5A2B';
    }

    /**
     * Render obstacle
     */
    render(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = this.borderColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    }

    /**
     * Check if point is inside obstacle
     */
    containsPoint(x: number, y: number): boolean {
        const dx = x - this.pos.x;
        const dy = y - this.pos.y;
        return dx * dx + dy * dy <= this.radius * this.radius;
    }

    /**
     * Check if intersects with circle
     */
    intersectsCircle(circle: Circle): boolean {
        const dx = circle.x - this.pos.x;
        const dy = circle.y - this.pos.y;
        const distSq = dx * dx + dy * dy;
        const radiusSum = this.radius + circle.r;
        return distSq < radiusSum * radiusSum;
    }

    /**
     * Serialize for save data
     */
    serialize(): ObstacleSaveData {
        return {
            x: this.pos.x,
            y: this.pos.y,
            radius: this.radius
        };
    }

    /**
     * Deserialize from save data
     */
    static deserialize(data: ObstacleSaveData): Obstacle {
        return new Obstacle(new Vector(data.x, data.y), data.radius);
    }

    /**
     * Generate random obstacles
     */
    static generateRandom(world: WorldLike, minCount: number = 40, maxCount: number = 80): Obstacle[] {
        const obstacles: Obstacle[] = [];
        const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;

        const rootPos = world.rootBuilding.pos;
        const minDistance = Math.min(world.width, world.height) * 0.20;

        let attempts = 0;
        const maxAttempts = count * 100;

        while (obstacles.length < count && attempts < maxAttempts) {
            attempts++;

            const x = Math.random() * world.width;
            const y = Math.random() * world.height;
            const radius = Math.random() * 15 + 10;

            const dx = x - rootPos.x;
            const dy = y - rootPos.y;
            const distanceToRoot = Math.sqrt(dx * dx + dy * dy);

            if (distanceToRoot < minDistance) {
                continue;
            }

            const margin = radius;
            if (x < margin || x > world.width - margin ||
                y < margin || y > world.height - margin) {
                continue;
            }

            let overlaps = false;
            for (const obs of obstacles) {
                const distObs = Math.sqrt(
                    (x - obs.pos.x) ** 2 + (y - obs.pos.y) ** 2
                );
                if (distObs < radius + obs.radius + 5) {
                    overlaps = true;
                    break;
                }
            }

            if (!overlaps) {
                obstacles.push(new Obstacle(new Vector(x, y), radius));
            }
        }

        return obstacles;
    }
}
