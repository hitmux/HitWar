/**
 * Effect - Base class for visual effects
 *
 * by littlefean
 */
import { Vector } from '../core/math/vector';

/**
 * Base effect class
 */
export class Effect {
    isPlay: boolean;
    time: number;
    duration: number;

    constructor() {
        this.isPlay = true;
        this.time = 0;
        this.duration = 10;
    }

    goStep(): void {
        this.time++;
        if (this.time >= this.duration) {
            this.isPlay = false;
        }
    }
}

/**
 * Text effect class - displays floating text
 */
export class EffectText extends Effect {
    pos: Vector;
    textColor: string;
    textSize: number;
    text: string;

    constructor(text: string) {
        super();
        this.duration = 20;
        this.pos = Vector.zero();
        this.textColor = "black";
        this.textSize = 16;
        this.text = text;
    }

    render(ctx: CanvasRenderingContext2D): void {
        ctx.fillStyle = this.textColor;
        ctx.font = `${this.textSize}px Microsoft YaHei`;
        ctx.textAlign = "center";
        ctx.fillText(this.text, this.pos.x, this.pos.y - this.time);
    }
}
