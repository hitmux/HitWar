/**
 * EffectCircle - Circle visual effect with object pooling
 *
 * by littlefean
 */
import { Effect } from './effect';
import { Circle } from '../core/math/circle';
import { MyColor, ReadonlyColor } from '../entities/myColor';
import { Functions } from '../core/functions';

interface VectorLike {
    x: number;
    y: number;
}

/**
 * Circle effect class with object pooling for performance
 */
export class EffectCircle extends Effect {
    // Object pool
    static _pool: EffectCircle[] = [];
    static _poolMaxSize: number = 200;

    animationFunc: () => void;
    circle: Circle;

    /**
     * Acquire from pool or create new EffectCircle
     */
    static acquire(pos: VectorLike): EffectCircle {
        if (EffectCircle._pool.length > 0) {
            let effect = EffectCircle._pool.pop()!;
            effect.reset(pos);
            return effect;
        }
        return new EffectCircle(pos);
    }

    /**
     * Return effect to object pool
     */
    static release(effect: EffectCircle): void {
        if (EffectCircle._pool.length < EffectCircle._poolMaxSize) {
            EffectCircle._pool.push(effect);
        }
    }

    constructor(pos: VectorLike) {
        super();
        this.animationFunc = this.flashFireAnimation;
        this.circle = new Circle(pos.x, pos.y, 10);
    }

    /**
     * Reset effect state for reuse
     */
    reset(pos: VectorLike): void {
        this.isPlay = true;
        this.time = 0;
        this.duration = 10;
        this.circle.x = pos.x;
        this.circle.y = pos.y;
        this.circle.r = 10;
        this.circle.strokeWidth = 1;
        // 复用现有对象，使用 setRGBA 设置值
        this.circle.strokeColor.setRGBA(0, 0, 0, 1);
        this.circle.fillColor.setRGBA(0, 0, 0, 1);
        this.animationFunc = this.flashFireAnimation;
    }

    initCircleStyle(fillColor: ReadonlyColor, strokeColor: ReadonlyColor, width: number): void {
        this.circle.strokeWidth = width;
        this.circle.setStrokeColor(strokeColor);
        this.circle.setFillColor(fillColor);
    }

    /**
     * No effect animation
     */
    noneAnimation(): void {}

    /**
     * Explosion effect - electric explosion
     */
    bombAnimation(): void {
        this.circle.fillColor.changeAlpha(Functions.timeRateAlpha(this.time / this.duration));
        this.circle.r = this.time * 5;
    }

    flashAnimation(): void {
        this.circle.fillColor.changeAlpha(Functions.timeRateAlpha(this.time / this.duration));
    }

    /**
     * Yellow flash effect - for cannon bullet explosions
     */
    flashFireAnimation(): void {
        this.circle.setStrokeWidth(0);
        this.circle.strokeColor.setRGBA(0, 0, 0, 0);
        this.circle.fillColor.setRGBA(255, 255, 0, Functions.timeRateAlpha(this.time / this.duration));
    }

    flashBlueAnimation(): void {
        this.circle.setStrokeWidth(0);
        this.circle.strokeColor.setRGBA(0, 0, 0, 0);
        this.circle.fillColor.setRGBA(0, 100, 255, Functions.timeRateAlpha(this.time / this.duration));
    }

    flashRedAnimation(): void {
        this.circle.setStrokeWidth(0);
        this.circle.strokeColor.setRGBA(0, 0, 0, 0);
        this.circle.fillColor.setRGBA(255, 100, 0, Functions.timeRateAlpha(this.time / this.duration));
    }

    /**
     * Green flash effect
     */
    flashGreenAnimation(): void {
        this.circle.setStrokeWidth(0);
        this.circle.strokeColor.setRGBA(0, 0, 0, 0);
        this.circle.fillColor.setRGBA(20, 200, 0, Functions.timeRateAlphaDownFast(this.time / this.duration));
    }

    /**
     * Brown flash effect
     */
    flashBrownAnimation(): void {
        this.circle.setStrokeWidth(0);
        this.circle.strokeColor.setRGBA(0, 0, 0, 0);
        this.circle.fillColor.setRGBA(101, 77, 39, Functions.timeRateAlphaDownFast(this.time / this.duration));
    }

    /**
     * Collector harvest effect
     */
    energeticAnimation(): void {
        this.circle.setStrokeWidth(0);
        this.circle.strokeColor.setRGBA(0, 0, 0, 0);
        this.circle.fillColor.setRGBA(20, 200, 0, 1);
    }

    /**
     * Tower destruction effect
     */
    destroyAnimation(): void {
        this.circle.fillColor.setRGBA(0, 0, 0, Functions.timeRateAlpha(this.time / this.duration));
        this.circle.r = this.time * 10;
    }

    goStep(): void {
        super.goStep();
        this.animationFunc();
    }

    render(ctx: CanvasRenderingContext2D): void {
        this.circle.render(ctx);
    }
}
