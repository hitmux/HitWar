import { describe, expect, it, vi } from 'vitest';
import { Rectangle } from './rectangle';
import { Vector } from './vector';

describe('Rectangle', () => {
    it.each([
        { args: [0, 0, 10, 20] as const },
        { args: [-5, 6, 0, 12] as const },
        { args: [1.5, 2.5, 3.5, 4.5] as const },
    ])('preserves constructor geometry %#', ({ args }) => {
        const [x, y, width, height] = args;
        const rect = new Rectangle(x, y, width, height);

        expect(rect.pos).toEqual(new Vector(x, y));
        expect(rect.width).toBe(width);
        expect(rect.height).toBe(height);
    });

    it('initializes geometry and stroke width', () => {
        const rect = new Rectangle(1, 2, 30, 40);

        expect(rect.pos).toEqual(new Vector(1, 2));
        expect(rect.width).toBe(30);
        expect(rect.height).toBe(40);
        expect(rect.strokeWidth).toBe(2);
    });

    it('renders with configured colors and dimensions', () => {
        const rect = new Rectangle(1, 2, 30, 40);
        const ctx = {
            beginPath: vi.fn(),
            closePath: vi.fn(),
            rect: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
        };

        rect.setStrokeWidth(5);
        rect.setFillColor(10, 20, 30, 0.5);
        rect.setStrokeColor(40, 50, 60);
        rect.render(ctx as unknown as CanvasRenderingContext2D);

        expect(ctx.beginPath).toHaveBeenCalledOnce();
        expect(ctx.rect).toHaveBeenCalledWith(1, 2, 30, 40);
        expect(ctx.closePath).toHaveBeenCalledOnce();
        expect(ctx.stroke).toHaveBeenCalledOnce();
        expect(ctx.fill).toHaveBeenCalledOnce();
        expect(ctx.fillStyle).toBe('rgba(10, 20, 30, 0.5)');
        expect(ctx.strokeStyle).toBe('rgb(40, 50, 60)');
        expect(ctx.lineWidth).toBe(5);
    });

    it('clamps configured colors through MyColor before rendering', () => {
        const rect = new Rectangle(0, 0, 1, 1);
        const ctx = {
            beginPath: vi.fn(),
            closePath: vi.fn(),
            rect: vi.fn(),
            stroke: vi.fn(),
            fill: vi.fn(),
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
        };

        rect.setFillColor(300, -20, 128, 2);
        rect.setStrokeColor(-1, 256, 40);
        rect.render(ctx as unknown as CanvasRenderingContext2D);

        expect(ctx.fillStyle).toBe('rgba(255, 0, 128, 1)');
        expect(ctx.strokeStyle).toBe('rgb(0, 255, 40)');
    });
});
