/**
 * LineObject - Base class for line-based game entities
 * by littlefean
 */
import { Line } from '../../core/math/line';
import { Vector } from '../../core/math/vector';

export class LineObject extends Line {
    speed: Vector;

    constructor(line: Line, world: unknown) {
        super(line.PosStart, line.PosEnd);
        this.speed = Vector.zero();
    }

    lineGoStep(): void {
        super.move(this.speed);
    }
}
