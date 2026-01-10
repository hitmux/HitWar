/**
 * Rectangle class
 * by littlefean
 */
import { Vector } from './vector';
import { MyColor } from '../../entities/myColor';

export class Rectangle {
    pos: Vector;
    width: number;
    height: number;
    strokeWidth: number;
    private _fillColor: MyColor;
    private _strokeColor: MyColor;

    constructor(x: number, y: number, w: number, h: number) {
        this.pos = new Vector(x, y);
        this.width = w;
        this.height = h;
        this.strokeWidth = 2;
        this._fillColor = MyColor.BLACK();
        this._strokeColor = MyColor.BLACK();
    }

    setStrokeWidth(n: number): void {
        this.strokeWidth = n;
    }

    setFillColor(r: number, g: number, b: number, a: number): void {
        this._fillColor.setRGBA(r, g, b, a);
    }

    setStrokeColor(r: number, g: number, b: number): void {
        this._strokeColor.setRGB(r, g, b);
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.fillStyle = this._fillColor.toStringRGBA();
        ctx.lineWidth = this.strokeWidth;
        ctx.strokeStyle = this._strokeColor.toStringRGB();
        ctx.rect(this.pos.x, this.pos.y, this.width, this.height);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
    }
}
