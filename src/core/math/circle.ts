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

    /**
     * 基础扫掠检测：移动圆 vs 静态圆
     * 检测一个从 (x1,y1) 移动到 (x2,y2) 的圆是否与静态圆碰撞
     * @param x1 移动圆起点 x
     * @param y1 移动圆起点 y
     * @param x2 移动圆终点 x
     * @param y2 移动圆终点 y
     * @param movingR 移动圆半径
     * @param cx 静态圆圆心 x
     * @param cy 静态圆圆心 y
     * @param targetR 静态圆半径
     */
    static sweepCollides(
        x1: number, y1: number,
        x2: number, y2: number,
        movingR: number,
        cx: number, cy: number,
        targetR: number
    ): boolean {
        const combinedR = movingR + targetR;
        const combinedRSq = combinedR * combinedR;

        // 快速检查：起点已在碰撞范围内
        const dx1 = x1 - cx, dy1 = y1 - cy;
        if (dx1 * dx1 + dy1 * dy1 <= combinedRSq) return true;

        // 快速检查：终点已在碰撞范围内
        const dx2 = x2 - cx, dy2 = y2 - cy;
        if (dx2 * dx2 + dy2 * dy2 <= combinedRSq) return true;

        // 线段方向向量
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return false;

        // 解二次方程: at² + bt + c = 0
        // 找到线段上最近点，检查是否在 t∈[0,1] 范围内与圆相交
        const fx = x1 - cx, fy = y1 - cy;
        const a = lenSq;
        const b = 2 * (fx * dx + fy * dy);
        const c = fx * fx + fy * fy - combinedRSq;

        const discriminant = b * b - 4 * a * c;
        if (discriminant < 0) return false;

        const sqrtD = Math.sqrt(discriminant);
        const t1 = (-b - sqrtD) / (2 * a);
        const t2 = (-b + sqrtD) / (2 * a);

        // 检查是否有解在 [0,1] 范围内
        return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
    }

    /**
     * 相对速度扫掠检测：两个移动圆
     * 将问题转换到目标参考系，目标视为静止
     * @param ax1 物体 A 起点 x
     * @param ay1 物体 A 起点 y
     * @param ax2 物体 A 终点 x
     * @param ay2 物体 A 终点 y
     * @param aR 物体 A 半径
     * @param bx1 物体 B 起点 x
     * @param by1 物体 B 起点 y
     * @param bx2 物体 B 终点 x
     * @param by2 物体 B 终点 y
     * @param bR 物体 B 半径
     */
    static sweepCollidesRelative(
        ax1: number, ay1: number, ax2: number, ay2: number, aR: number,
        bx1: number, by1: number, bx2: number, by2: number, bR: number
    ): boolean {
        // 转换到 B 的参考系：B 视为静止在原点
        // A 的相对起点（相对于 B 起点）
        const relX1 = ax1 - bx1;
        const relY1 = ay1 - by1;
        // A 的相对终点 = 相对起点 + (A位移 - B位移)
        const relX2 = relX1 + (ax2 - ax1) - (bx2 - bx1);
        const relY2 = relY1 + (ay2 - ay1) - (by2 - by1);

        // 检测相对路径与半径和圆的碰撞（圆心在原点）
        return Circle.sweepCollides(relX1, relY1, relX2, relY2, aR, 0, 0, bR);
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
