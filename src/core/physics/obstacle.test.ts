import { describe, expect, it, vi } from 'vitest';
import { Circle } from '../math/circle';
import { Vector } from '../math/vector';
import { Obstacle } from './obstacle';

function world(width = 200, height = 200, base = new Vector(100, 100)) {
    return {
        width,
        height,
        getBaseBuilding: () => ({ pos: base }),
    };
}

describe('Obstacle', () => {
    it('initializes position, radius, and default colors', () => {
        const obstacle = new Obstacle(new Vector(1, 2), 3);

        expect(obstacle.pos).toEqual(new Vector(1, 2));
        expect(obstacle.radius).toBe(3);
        expect(obstacle.color).toBe('#6B4423');
        expect(obstacle.borderColor).toBe('#8B5A2B');
    });

    it.each([
        { point: [10, 10] as const, inside: true },
        { point: [15, 10] as const, inside: true },
        { point: [16, 10] as const, inside: false },
        { point: [7, 6] as const, inside: true },
    ])('checks point containment with inclusive radius %#', ({ point, inside }) => {
        const obstacle = new Obstacle(new Vector(10, 10), 5);
        const [x, y] = point;

        expect(obstacle.containsPoint(x, y)).toBe(inside);
    });

    it.each([
        { circle: new Circle(17.99, 10, 3), intersects: true },
        { circle: new Circle(20, 10, 5), intersects: false },
        { circle: new Circle(19.99, 10, 5), intersects: true },
        { circle: new Circle(30, 30, 2), intersects: false },
    ])('checks circle intersection with strict tangent behavior %#', ({ circle, intersects }) => {
        const obstacle = new Obstacle(new Vector(10, 10), 5);

        expect(obstacle.intersectsCircle(circle)).toBe(intersects);
    });

    it('serializes and deserializes save data', () => {
        const obstacle = new Obstacle(new Vector(4, 5), 6);

        const saved = obstacle.serialize();
        const restored = Obstacle.deserialize(saved);

        expect(saved).toEqual({ x: 4, y: 5, radius: 6 });
        expect(restored).toBeInstanceOf(Obstacle);
        expect(restored.pos).toEqual(new Vector(4, 5));
        expect(restored.radius).toBe(6);
    });

    it('renders using the configured canvas styles', () => {
        const obstacle = new Obstacle(new Vector(4, 5), 6);
        const ctx = {
            beginPath: vi.fn(),
            arc: vi.fn(),
            fill: vi.fn(),
            stroke: vi.fn(),
            closePath: vi.fn(),
            fillStyle: '',
            strokeStyle: '',
            lineWidth: 0,
        };

        obstacle.render(ctx as unknown as CanvasRenderingContext2D);

        expect(ctx.beginPath).toHaveBeenCalledOnce();
        expect(ctx.arc).toHaveBeenCalledWith(4, 5, 6, 0, Math.PI * 2);
        expect(ctx.fillStyle).toBe('#6B4423');
        expect(ctx.strokeStyle).toBe('#8B5A2B');
        expect(ctx.lineWidth).toBe(2);
        expect(ctx.fill).toHaveBeenCalledOnce();
        expect(ctx.stroke).toHaveBeenCalledOnce();
        expect(ctx.closePath).toHaveBeenCalledOnce();
    });

    it('generates the requested random obstacle count when candidates are valid', () => {
        const random = vi.spyOn(Math, 'random');
        random
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0.2).mockReturnValueOnce(0.2).mockReturnValueOnce(0)
            .mockReturnValueOnce(0.8).mockReturnValueOnce(0.2).mockReturnValueOnce(0)
            .mockReturnValueOnce(0.2).mockReturnValueOnce(0.8).mockReturnValueOnce(0);

        const obstacles = Obstacle.generateRandom(world(), 3, 3);

        expect(obstacles).toHaveLength(3);
        expect(obstacles.map((obs) => obs.radius)).toEqual([10, 10, 10]);
        expect(obstacles[0].pos).toEqual(new Vector(40, 40));
        expect(obstacles[1].pos).toEqual(new Vector(160, 40));
        expect(obstacles[2].pos).toEqual(new Vector(40, 160));
        random.mockRestore();
    });

    it('stops random generation after max attempts when all candidates are invalid', () => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);

        const obstacles = Obstacle.generateRandom(world(), 2, 2);

        expect(obstacles).toEqual([]);
        expect(random).toHaveBeenCalledTimes(601);
        random.mockRestore();
    });

    it('generates pseudo-symmetric obstacles on both sides outside the center gap', () => {
        const random = vi.spyOn(Math, 'random');
        random
            .mockReturnValueOnce(0.4).mockReturnValueOnce(0.2).mockReturnValueOnce(0)
            .mockReturnValueOnce(0.6).mockReturnValueOnce(0.2).mockReturnValueOnce(0);

        const obstacles = Obstacle.generatePseudoSymmetric(
            world(200, 200),
            [new Vector(20, 100), new Vector(180, 100)],
            1
        );

        expect(obstacles).toHaveLength(2);
        expect(obstacles[0].pos.x).toBe(20);
        expect(obstacles[1].pos.x).toBe(180);
        expect(obstacles.every((obs) => obs.radius === 10)).toBe(true);
        random.mockRestore();
    });
});
