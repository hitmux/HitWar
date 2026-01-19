/**
 * EffectLine - Line visual effect with object pooling
 *
 * by littlefean
 */
import { Effect } from './effect';
import { Line } from '../core/math/line';
import { MyColor, ReadonlyColor } from '../entities/myColor';
import { Functions } from '../core/functions';
import type { Vector } from '../core/math/vector';
import type { Circle } from '../core/math/circle';

interface MonsterLike {
    getBodyCircle(): Circle;
    hpChange(dh: number): void;
}

interface WorldLike {
    getMonstersInRange(x: number, y: number, radius: number): MonsterLike[];
}

interface LineLike extends Line {
    initWidth?: number | null;
}

/**
 * Line effect class with object pooling for performance
 */
export class EffectLine extends Effect {
    // Object pool
    static _pool: EffectLine[] = [];
    static _poolMaxSize: number = 200;

    line: LineLike;
    animationFunc: () => void;
    world: WorldLike | null;
    damage: number;

    /**
     * Acquire from pool or create new EffectLine
     */
    static acquire(p1: Vector, p2: Vector): EffectLine {
        if (EffectLine._pool.length > 0) {
            let effect = EffectLine._pool.pop()!;
            effect.reset(p1, p2);
            return effect;
        }
        return new EffectLine(p1, p2);
    }

    /**
     * Return effect to object pool
     */
    static release(effect: EffectLine): void {
        if (EffectLine._pool.length < EffectLine._poolMaxSize) {
            EffectLine._pool.push(effect);
        }
    }

    constructor(p1: Vector, p2: Vector) {
        super();
        this.line = new Line(p1, p2) as LineLike;
        this.animationFunc = this.flashAnimation;
        this.world = null;
        this.damage = 0;
    }

    /**
     * Reset effect state for reuse
     */
    reset(p1: Vector, p2: Vector): void {
        this.isPlay = true;
        this.time = 0;
        this.duration = 10;
        this.line.PosStart = p1;
        this.line.PosEnd = p2;
        this.line.x1 = p1.x;
        this.line.y1 = p1.y;
        this.line.x2 = p2.x;
        this.line.y2 = p2.y;
        this.line.initWidth = null;
        this.line.strokeWidth = 1;
        // Reuse existing MyColor object instead of creating new one
        this.line.strokeColor.setRGBA(0, 0, 0, 1);
        this.animationFunc = this.flashAnimation;
        this.world = null;
        this.damage = 0;
    }

    /**
     * Initialize effect line color
     */
    initLineStyle(color: ReadonlyColor, width: number): void {
        this.line.strokeWidth = width;
        // Copy color values instead of reference to avoid mutation issues
        this.line.strokeColor.setRGBA(color.r, color.g, color.b, color.a);
    }

    /**
     * Initialize damage properties for continuous damage dealing
     */
    initDamage(world: WorldLike, damage: number): void {
        this.world = world;
        this.damage = damage;
    }

    /**
     * Deal damage to monsters on path
     * Optimization: check every 3 frames, use quad tree spatial query
     */
    doDamage(): void {
        if (this.world && this.damage > 0) {
            if (this.time % 3 !== 0) {
                return;
            }
            const actualDamage = this.damage * 3;

            const line = this.line;
            const centerX = (line.x1 + line.x2) / 2;
            const centerY = (line.y1 + line.y2) / 2;
            const halfWidth = Math.abs(line.x2 - line.x1) / 2;
            const halfHeight = Math.abs(line.y2 - line.y1) / 2;
            const queryRadius = Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight) + 50;

            const nearbyMonsters = this.world.getMonstersInRange(centerX, centerY, queryRadius);
            for (let m of nearbyMonsters) {
                if (line.intersectWithCircle(m.getBodyCircle())) {
                    m.hpChange(-actualDamage);
                }
            }
        }
    }

    randomColorAnimation(): void {
        let c = 10;
        this.line.strokeColor.change(Math.random() * c, Math.random() * c, Math.random() * c, 1);
    }

    /**
     * Line fade out animation
     */
    flashAnimation(): void {
        this.line.strokeColor.changeAlpha(Functions.timeRateAlpha(this.time / this.duration));
    }

    /**
     * Line thinning animation
     */
    laserAnimation(): void {
        if (this.line.initWidth === undefined || this.line.initWidth === null) {
            this.line.initWidth = this.line.strokeWidth;
        }
        this.line.strokeWidth = Functions.timeRateAlpha(this.time / this.duration) * this.line.initWidth;
    }

    goStep(): void {
        super.goStep();
        this.animationFunc();
        this.doDamage();
    }

    render(ctx: CanvasRenderingContext2D): void {
        this.line.render(ctx);
    }
}
