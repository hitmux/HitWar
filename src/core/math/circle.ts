/**
 * Circle shape class
 * by littlefean
 */
import { Vector } from './vector';
import { MyColor } from '../../entities/myColor';

export class Circle {
    // Precomputed constant
    private static readonly TWO_PI = Math.PI * 2;

    x: number;
    y: number;
    r: number;
    pos: Vector;
    strokeWidth: number;
    strokeColor: MyColor;
    fillColor: MyColor;

    // 样式键缓存
    private _styleKeyCache: string | null = null;

    constructor(x: number, y: number, r: number) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.pos = new Vector(x, y);
        this.strokeWidth = 2;

        // 创建新的颜色对象，避免多个 Circle 实例共享静态常量对象
        this.strokeColor = new MyColor(60, 63, 65, 1);  // GRAY
        this.fillColor = new MyColor(0, 0, 0, 1);        // BLACK
    }

    /**
     * Check if two circles collide
     */
    impact(otherC: Circle): boolean {
        const dx = otherC.x - this.x;
        const dy = otherC.y - this.y;
        const distSq = dx * dx + dy * dy;
        const radiusSum = this.r + otherC.r;
        return distSq <= radiusSum * radiusSum;
    }


    /**
     * Static collision check between two circles (no object allocation)
     * More efficient than creating Circle objects just for collision detection
     */
    static collides(
        x1: number, y1: number, r1: number,
        x2: number, y2: number, r2: number
    ): boolean {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distSq = dx * dx + dy * dy;
        const radiusSum = r1 + r2;
        return distSq <= radiusSum * radiusSum;
    }

    setStrokeWidth(n: number): void {
        this.strokeWidth = n;
        this._styleKeyCache = null;  // 使缓存失效
    }

    /**
     * 使样式缓存失效 (当颜色变化时调用)
     */
    invalidateStyleCache(): void {
        this._styleKeyCache = null;
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.fillColor.toStringRGBA();
        ctx.lineWidth = this.strokeWidth;
        ctx.strokeStyle = this.strokeColor.toStringRGBA();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Circle.TWO_PI);
        ctx.stroke();
        ctx.fill();
        ctx.closePath();
    }

    /**
     * Check if point is inside circle
     */
    pointIn(x: number, y: number): boolean {
        const dx = x - this.x;
        const dy = y - this.y;
        return dx * dx + dy * dy < this.r * this.r;
    }

    /**
     * Render as view circle
     * Optimized: directly uses Canvas API to avoid state pollution and object creation
     */
    renderView(ctx: CanvasRenderingContext2D): void {
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 0.1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Circle.TWO_PI);
        ctx.stroke();
    }

    /**
     * Get a unique key representing the rendering style
     * Used for batch rendering optimization
     * Cached for performance
     */
    getStyleKey(): string {
        if (this._styleKeyCache === null) {
            this._styleKeyCache = `${this.fillColor.toStringRGBA()}_${this.strokeColor.toStringRGBA()}_${this.strokeWidth}`;
        }
        return this._styleKeyCache;
    }

    /**
     * Render only the path (arc) without setting styles or managing path state
     * Used for batch rendering where styles are set once for multiple circles
     */
    renderPath(ctx: CanvasRenderingContext2D): void {
        ctx.moveTo(this.x + this.r, this.y);
        ctx.arc(this.x, this.y, this.r, 0, Circle.TWO_PI);
    }
}
