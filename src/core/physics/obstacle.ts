/**
 * Obstacle - Blocks building placement, does not affect monster movement
 */
import { Vector } from '../math/vector';
import type { Circle } from '../math/circle';

export interface ObstacleSaveData {
    x: number;
    y: number;
    radius: number;
}

interface WorldLike {
    width: number;
    height: number;
    getBaseBuilding(playerId?: string): { pos: Vector };
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
    static generateRandom(world: WorldLike, minCount: number = 70, maxCount: number = 80): Obstacle[] {
        const obstacles: Obstacle[] = [];
        const count = Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;

        const rootPos = world.getBaseBuilding().pos;
        const minDistance = Math.min(world.width, world.height) * 0.15;

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

    /**
     * Generate pseudo-symmetric obstacles for multiplayer maps
     * Each side of the map gets independent random placement but same count and density
     * @param world The world reference for dimensions
     * @param basePositions Array of base positions (one per player)
     * @param countPerSide Number of obstacles per side (default 35)
     */
    static generatePseudoSymmetric(
        world: WorldLike,
        basePositions: Vector[],
        countPerSide: number = 35
    ): Obstacle[] {
        const obstacles: Obstacle[] = [];
        const centerX = world.width / 2;
        const minDistFromBase = Math.min(world.width, world.height) * 0.15;
        const gapHalf = 50; // No obstacles in the center gap

        // Generate for left side
        const leftObs = Obstacle._generateForRegion(
            world, 0, centerX - gapHalf, basePositions, minDistFromBase, countPerSide, obstacles
        );
        obstacles.push(...leftObs);

        // Generate for right side (independent random, same count)
        const rightObs = Obstacle._generateForRegion(
            world, centerX + gapHalf, world.width, basePositions, minDistFromBase, countPerSide, obstacles
        );
        obstacles.push(...rightObs);

        return obstacles;
    }

    /**
     * Generate obstacles within a specific x-region
     */
    private static _generateForRegion(
        world: WorldLike,
        minX: number,
        maxX: number,
        basePositions: Vector[],
        minDistFromBase: number,
        count: number,
        existingObstacles: Obstacle[]
    ): Obstacle[] {
        const result: Obstacle[] = [];
        let attempts = 0;
        const maxAttempts = count * 100;

        while (result.length < count && attempts < maxAttempts) {
            attempts++;

            const x = minX + Math.random() * (maxX - minX);
            const y = Math.random() * world.height;
            const radius = Math.random() * 15 + 10;

            // Check edge margin
            const margin = radius;
            if (x < margin || x > world.width - margin ||
                y < margin || y > world.height - margin) {
                continue;
            }

            // Check distance from all bases
            let tooCloseToBase = false;
            for (const basePos of basePositions) {
                const dx = x - basePos.x;
                const dy = y - basePos.y;
                if (Math.sqrt(dx * dx + dy * dy) < minDistFromBase) {
                    tooCloseToBase = true;
                    break;
                }
            }
            if (tooCloseToBase) continue;

            // Check overlap with existing obstacles
            let overlaps = false;
            for (const obs of existingObstacles) {
                const distObs = Math.sqrt((x - obs.pos.x) ** 2 + (y - obs.pos.y) ** 2);
                if (distObs < radius + obs.radius + 5) {
                    overlaps = true;
                    break;
                }
            }
            if (overlaps) continue;

            // Check overlap with new obstacles in this region
            for (const obs of result) {
                const distObs = Math.sqrt((x - obs.pos.x) ** 2 + (y - obs.pos.y) ** 2);
                if (distObs < radius + obs.radius + 5) {
                    overlaps = true;
                    break;
                }
            }
            if (overlaps) continue;

            result.push(new Obstacle(new Vector(x, y), radius));
        }

        return result;
    }
}
