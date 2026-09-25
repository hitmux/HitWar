import { describe, expect, it, vi } from 'vitest';
import { Line } from './line';
import { Vector } from './vector';
import type { CircleLike } from '../../types/worldLike';

function circle(x: number, y: number, r: number): CircleLike {
    return {
        x,
        y,
        r,
        impact: () => false,
    };
}

describe('Line', () => {
    it('initializes endpoints and default drawing style without sharing endpoint copies', () => {
        const start = new Vector(1, 2);
        const end = new Vector(3, 4);
        const line = new Line(start, end);

        expect(line.PosStart).toBe(start);
        expect(line.PosEnd).toBe(end);
        expect(line.x1).toBe(1);
        expect(line.y1).toBe(2);
        expect(line.x2).toBe(3);
        expect(line.y2).toBe(4);
        expect(line.strokeWidth).toBe(1);
        expect(line.strokeColor.toStringRGBA()).toBe('rgba(0, 0, 0, 1)');
    });

    it('tracks endpoints and center when reset or moved', () => {
        const line = new Line(new Vector(0, 0), new Vector(10, 0));

        expect(line.getCenter()).toEqual(new Vector(5, 0));

        line.move(new Vector(5, 5));
        expect(line.PosStart).toEqual(new Vector(5, 5));
        expect(line.PosEnd).toEqual(new Vector(15, 5));
        expect(line.getCenter()).toEqual(new Vector(10, 5));

        line.moveTo(new Vector(0, 0));
        expect(line.PosStart).toEqual(new Vector(-5, 0));
        expect(line.PosEnd).toEqual(new Vector(5, 0));

        line.resetLine(new Vector(1, 2), new Vector(3, 4));
        expect(line.x1).toBe(1);
        expect(line.y1).toBe(2);
        expect(line.x2).toBe(3);
        expect(line.y2).toBe(4);
    });

    it('detects circle intersections through endpoints, crossing, and tangent contact', () => {
        expect(new Line(new Vector(0, 0), new Vector(10, 0)).intersectWithCircle(circle(1, 0, 2))).toBe(true);
        expect(new Line(new Vector(0, 0), new Vector(10, 0)).intersectWithCircle(circle(5, 1, 2))).toBe(true);
        expect(new Line(new Vector(0, 0), new Vector(10, 0)).intersectWithCircle(circle(5, 2, 2))).toBe(true);
    });

    it.each([
        { line: new Line(new Vector(0, 0), new Vector(10, 0)), c: circle(5, 0, 1), expected: true },
        { line: new Line(new Vector(0, 0), new Vector(0, 10)), c: circle(0, 5, 1), expected: true },
        { line: new Line(new Vector(0, 0), new Vector(10, 10)), c: circle(5, 5, 1), expected: true },
        { line: new Line(new Vector(0, 0), new Vector(10, 10)), c: circle(7, 5, 1), expected: false },
        { line: new Line(new Vector(0, 0), new Vector(10, 0)), c: circle(-2, 0, 1), expected: false },
    ])('checks representative circle intersections %#', ({ line, c, expected }) => {
        expect(line.intersectWithCircle(c)).toBe(expected);
    });

    it('rejects circles outside the segment or beyond radius distance', () => {
        const line = new Line(new Vector(0, 0), new Vector(10, 0));

        expect(line.intersectWithCircle(circle(5, 3, 2))).toBe(false);
        expect(line.intersectWithCircle(circle(12, 0, 1))).toBe(false);
    });

    it('renders with configured stroke style', () => {
        const line = new Line(new Vector(1, 2), new Vector(3, 4));
        const ctx = {
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            strokeStyle: '',
            lineWidth: 0,
        };

        line.strokeWidth = 5;
        line.strokeColor.setRGB(10, 20, 30);
        line.render(ctx as unknown as CanvasRenderingContext2D);

        expect(ctx.beginPath).toHaveBeenCalledOnce();
        expect(ctx.moveTo).toHaveBeenCalledWith(1, 2);
        expect(ctx.lineTo).toHaveBeenCalledWith(3, 4);
        expect(ctx.stroke).toHaveBeenCalledOnce();
        expect(ctx.strokeStyle).toBe('rgba(10, 20, 30, 1)');
        expect(ctx.lineWidth).toBe(5);
    });
});
