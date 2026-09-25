import { describe, expect, it, vi } from 'vitest';
import { Circle } from './circle';
import { MyColor } from '../../entities/myColor';

describe('Circle', () => {
    it('initializes geometry and independent mutable colors', () => {
        const a = new Circle(1, 2, 3);
        const b = new Circle(4, 5, 6);

        a.setFillColor(new MyColor(10, 20, 30, 0.4));
        a.setStrokeColor(new MyColor(40, 50, 60, 0.8));

        expect(a.x).toBe(1);
        expect(a.y).toBe(2);
        expect(a.r).toBe(3);
        expect(a.pos.x).toBe(1);
        expect(a.pos.y).toBe(2);
        expect(b.fillColor.toStringRGBA()).toBe('rgba(0, 0, 0, 1)');
        expect(b.strokeColor.toStringRGBA()).toBe('rgba(60, 63, 65, 1)');
    });

    it('detects object circle collisions including tangent contact', () => {
        const circle = new Circle(0, 0, 10);

        expect(circle.impact({ x: 15, y: 0, r: 5 })).toBe(true);
        expect(circle.impact({ x: 16, y: 0, r: 5 })).toBe(false);
    });

    it.each([
        { point: [10, 10], inside: true },
        { point: [14.9, 10], inside: true },
        { point: [15, 10], inside: false },
        { point: [16, 10], inside: false },
        { point: [10, 4.9], inside: false },
    ])('checks strict point inclusion %#', ({ point, inside }) => {
        const circle = new Circle(10, 10, 5);

        expect(circle.pointIn(point[0], point[1])).toBe(inside);
    });

    it('checks point inclusion with a strict boundary', () => {
        const circle = new Circle(10, 10, 5);

        expect(circle.pointIn(13, 13)).toBe(true);
        expect(circle.pointIn(15, 10)).toBe(false);
    });

    it('delegates static circle collision checks', () => {
        expect(Circle.collides(0, 0, 10, 20, 0, 10)).toBe(true);
        expect(Circle.collides(0, 0, 10, 21, 0, 10)).toBe(false);
    });

    it.each([
        { args: [0, 0, 5, 0, 0, 5] as const, collides: true },
        { args: [0, 0, 5, 9.99, 0, 5] as const, collides: true },
        { args: [0, 0, 5, 10, 0, 5] as const, collides: true },
        { args: [0, 0, 5, 10.01, 0, 5] as const, collides: false },
        { args: [-5, -5, 2, -1, -2, 3] as const, collides: true },
    ])('handles static collision boundaries %#', ({ args, collides }) => {
        const [x1, y1, r1, x2, y2, r2] = args;
        expect(Circle.collides(x1, y1, r1, x2, y2, r2)).toBe(collides);
    });

    it('detects sweep collisions at endpoints, during movement, and tangent paths', () => {
        expect(Circle.sweepCollides(50, 50, 100, 50, 10, 50, 50, 30)).toBe(true);
        expect(Circle.sweepCollides(0, 0, 50, 50, 10, 50, 50, 30)).toBe(true);
        expect(Circle.sweepCollides(0, 0, 100, 0, 5, 50, 10, 10)).toBe(true);
        expect(Circle.sweepCollides(0, 0, 100, 0, 5, 50, 15, 10)).toBe(true);
    });

    it('rejects sweep collisions when the path misses the target', () => {
        expect(Circle.sweepCollides(0, 0, 100, 0, 5, 50, 50, 10)).toBe(false);
    });

    it.each([
        { args: [0, 0, 0, 0, 5, 0, 0, 5] as const, collides: true },
        { args: [0, 0, 0, 0, 5, 20, 0, 5] as const, collides: false },
        { args: [0, 0, 100, 0, 5, 50, 16, 10] as const, collides: false },
        { args: [0, 0, 100, 100, 5, 50, 50, 1] as const, collides: true },
    ])('handles sweep edge cases %#', ({ args, collides }) => {
        const [startX, startY, endX, endY, radius, targetX, targetY, targetRadius] = args;
        expect(Circle.sweepCollides(startX, startY, endX, endY, radius, targetX, targetY, targetRadius)).toBe(collides);
    });

    it('handles relative sweep collisions between two moving circles', () => {
        expect(Circle.sweepCollidesRelative(
            0, 0, 40, 0, 10,
            100, 0, 60, 0, 10
        )).toBe(true);

        expect(Circle.sweepCollidesRelative(
            0, 0, 100, 0, 10,
            0, 50, 100, 50, 10
        )).toBe(false);
    });

    it('invalidates style keys when stroke or fill styling changes', () => {
        const circle = new Circle(0, 0, 5);
        const initial = circle.getStyleKey();

        circle.setFillColor(new MyColor(1, 2, 3, 0.5));
        const afterFill = circle.getStyleKey();
        circle.setStrokeColor(new MyColor(4, 5, 6, 1));
        const afterStroke = circle.getStyleKey();
        circle.setStrokeWidth(7);
        const afterWidth = circle.getStyleKey();

        expect(afterFill).not.toBe(initial);
        expect(afterStroke).not.toBe(afterFill);
        expect(afterWidth).not.toBe(afterStroke);
        expect(afterWidth).toContain('7');
    });

    it('renders full circles and reusable paths through Canvas API', () => {
        const circle = new Circle(2, 3, 4);
        const ctx = {
            beginPath: vi.fn(),
            arc: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            closePath: vi.fn(),
            moveTo: vi.fn(),
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
        };

        circle.setFillColor(new MyColor(1, 2, 3, 0.5));
        circle.setStrokeWidth(6);
        circle.render(ctx as unknown as CanvasRenderingContext2D);
        circle.renderView(ctx as unknown as CanvasRenderingContext2D);
        circle.renderPath(ctx as unknown as CanvasRenderingContext2D);

        expect(ctx.beginPath).toHaveBeenCalledTimes(2);
        expect(ctx.arc).toHaveBeenCalledTimes(3);
        expect(ctx.arc).toHaveBeenNthCalledWith(1, 2, 3, 4, 0, Math.PI * 2);
        expect(ctx.stroke).toHaveBeenCalledTimes(2);
        expect(ctx.fill).toHaveBeenCalledOnce();
        expect(ctx.closePath).toHaveBeenCalledOnce();
        expect(ctx.moveTo).toHaveBeenCalledWith(6, 3);
        expect(ctx.fillStyle).toBe('rgba(1, 2, 3, 0.5)');
        expect(ctx.lineWidth).toBe(0.1);
        expect(ctx.strokeStyle).toBe('black');
    });
});
