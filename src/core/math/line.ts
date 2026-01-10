/**
 * Line class
 * by littlefean
 */
import { Vector } from './vector';
import { MyColor } from '../../entities/myColor';
import type { Circle } from './circle';

export class Line {
    PosStart: Vector;
    PosEnd: Vector;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    strokeColor: MyColor;
    strokeWidth: number;

    /**
     * @param p1 start point
     * @param p2 end point
     */
    constructor(p1: Vector, p2: Vector) {
        this.PosStart = p1;
        this.PosEnd = p2;
        this.x1 = p1.x;
        this.x2 = p2.x;
        this.y1 = p1.y;
        this.y2 = p2.y;

        // Create new instance to avoid mutating shared static singleton
        this.strokeColor = new MyColor(0, 0, 0, 1);
        this.strokeWidth = 1;
    }

    /**
     * Reset line position by two endpoints
     */
    resetLine(p1: Vector, p2: Vector): void {
        this.PosStart = p1;
        this.PosEnd = p2;
        this.x1 = p1.x;
        this.x2 = p2.x;
        this.y1 = p1.y;
        this.y2 = p2.y;
    }

    /**
     * Move line to a center position
     */
    moveTo(loc: Vector): void {
        const oldCenter = this.getCenter();
        const dv = loc.sub(oldCenter);
        this.resetLine(this.PosStart.plus(dv), this.PosEnd.plus(dv));
    }

    /**
     * Translate line by a vector
     */
    move(vec: Vector): void {
        this.resetLine(this.PosStart.plus(vec), this.PosEnd.plus(vec));
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.strokeStyle = this.strokeColor.toStringRGBA();
        ctx.lineWidth = this.strokeWidth;
        ctx.beginPath();
        ctx.moveTo(this.x1, this.y1);
        ctx.lineTo(this.x2, this.y2);
        ctx.stroke();
    }

    /**
     * Get center point of line
     */
    getCenter(): Vector {
        return new Vector((this.x1 + this.x2) / 2, (this.y1 + this.y2) / 2);
    }

    /**
     * Check if line intersects with circle
     */
    intersectWithCircle(c: Circle): boolean {
        if (c.pointIn(this.x1, this.y1) || c.pointIn(this.x2, this.y2)) {
            return true;
        }
        const p1 = { x: this.x1, y: this.y1 };
        const p2 = { x: this.x2, y: this.y2 };
        const A = p1.y - p2.y;
        const B = p2.x - p1.x;
        const C = p1.x * p2.y - p2.x * p1.y;
        let dist1 = A * c.x + B * c.y + C;
        dist1 *= dist1;
        const dist2 = (A * A + B * B) * c.r * c.r;
        if (dist1 > dist2)
            return false;
        const angle1 = (c.x - p1.x) * (p2.x - p1.x) + (c.y - p1.y) * (p2.y - p1.y);
        const angle2 = (c.x - p2.x) * (p1.x - p2.x) + (c.y - p2.y) * (p1.y - p2.y);
        return angle1 > 0 && angle2 > 0;
    }
}
