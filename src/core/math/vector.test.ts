import { describe, expect, it, vi } from 'vitest';
import { Vector } from './vector';

describe('Vector', () => {
    it.each([
        { a: new Vector(0, 0), b: new Vector(0, 0), sum: new Vector(0, 0), diff: new Vector(0, 0) },
        { a: new Vector(-3, 4), b: new Vector(5, -6), sum: new Vector(2, -2), diff: new Vector(-8, 10) },
        { a: new Vector(1.5, -2.25), b: new Vector(-0.5, 0.25), sum: new Vector(1, -2), diff: new Vector(2, -2.5) },
    ])('adds and subtracts representative vectors %#', ({ a, b, sum, diff }) => {
        expect(a.plus(b)).toEqual(sum);
        expect(a.sub(b)).toEqual(diff);
        expect(a).not.toBe(sum);
        expect(a).not.toBe(diff);
    });

    it('returns new vectors for non-mutating arithmetic', () => {
        const a = new Vector(3, 4);
        const b = new Vector(1, 2);

        expect(a.plus(b)).toEqual(new Vector(4, 6));
        expect(a.sub(b)).toEqual(new Vector(2, 2));
        expect(a.mul(2)).toEqual(new Vector(6, 8));
        expect(a).toEqual(new Vector(3, 4));
    });

    it('mutates the current vector for in-place arithmetic', () => {
        const vector = new Vector(3, 4);

        expect(vector.subInPlace(new Vector(1, 1))).toBe(vector);
        expect(vector).toEqual(new Vector(2, 3));
        expect(vector.mulInPlace(3)).toBe(vector);
        expect(vector).toEqual(new Vector(6, 9));
        expect(vector.plusInPlace(new Vector(-1, 2))).toBe(vector);
        expect(vector).toEqual(new Vector(5, 11));
    });

    it('computes magnitude and distance values', () => {
        const vector = new Vector(3, 4);

        expect(vector.abs()).toBe(5);
        expect(vector.absSq()).toBe(25);
        expect(vector.dis(new Vector(6, 8))).toBe(5);
        expect(vector.disSq(new Vector(6, 8))).toBe(25);
    });

    it('normalizes vectors using both allocation and out-parameter APIs', () => {
        const vector = new Vector(3, 4);
        const out = new Vector(0, 0);

        expect(vector.to1()).toEqual(new Vector(0.6, 0.8));
        expect(Vector.normalizeTo(vector, out)).toBe(out);
        expect(out).toEqual(new Vector(0.6, 0.8));

        expect(vector.normalizeInPlace()).toBe(vector);
        expect(vector.x).toBeCloseTo(0.6);
        expect(vector.y).toBeCloseTo(0.8);
    });

    it('rotates vectors and points around pivots', () => {
        const vector = new Vector(1, 0);
        const rotated = vector.rotate(Math.PI / 2);
        const aroundPivot = Vector.rotatePoint(new Vector(1, 1), new Vector(2, 1), Math.PI / 2);

        expect(vector.rotate(0)).toBe(vector);
        expect(rotated.x).toBeCloseTo(0);
        expect(rotated.y).toBeCloseTo(1);
        const rotated90 = vector.rotate90();
        expect(rotated90.x).toBeCloseTo(0);
        expect(rotated90.y).toBeCloseTo(1);
        expect(aroundPivot.x).toBeCloseTo(1);
        expect(aroundPivot.y).toBeCloseTo(2);
    });

    it('writes results into supplied output vectors', () => {
        const out = new Vector(0, 0);

        expect(Vector.subTo(new Vector(5, 4), new Vector(2, 1), out)).toBe(out);
        expect(out).toEqual(new Vector(3, 3));
        expect(Vector.mulTo(new Vector(2, -3), 4, out)).toBe(out);
        expect(out).toEqual(new Vector(8, -12));
        expect(Vector.rotate90To(new Vector(2, 3), out)).toBe(out);
        expect(out).toEqual(new Vector(-3, 2));
        expect(Vector.rotatePointTo(new Vector(1, 1), new Vector(2, 1), Math.PI / 2, out)).toBe(out);
        expect(out.x).toBeCloseTo(1);
        expect(out.y).toBeCloseTo(2);
    });

    it('copies values and formats as a coordinate string', () => {
        const vector = new Vector(7, -2);
        const target = Vector.zero();

        expect(vector.copy()).toEqual(new Vector(7, -2));
        expect(vector.copy()).not.toBe(vector);
        expect(target.copyFrom(vector)).toBe(target);
        expect(target).toEqual(vector);
        expect(vector.toString()).toBe('(7,-2)');
    });

    it.each([
        { vector: new Vector(0, 1), theta: 0 },
        { vector: new Vector(1, 0), theta: Math.PI / 2 },
        { vector: new Vector(0, -1), theta: Math.PI },
        { vector: new Vector(-1, 0), theta: -Math.PI / 2 },
    ])('converts direction to y-axis-based angle %#', ({ vector, theta }) => {
        expect(vector.toTheta()).toBeCloseTo(theta);
    });

    it.each([
        { rand: 0, expected: new Vector(0, 1) },
        { rand: 0.25, expected: new Vector(1, 0) },
        { rand: 0.5, expected: new Vector(0, -1) },
        { rand: 0.75, expected: new Vector(-1, 0) },
    ])('maps random unit-circle samples %#', ({ rand, expected }) => {
        const random = vi.spyOn(Math, 'random').mockReturnValue(rand);

        const result = Vector.randCircle();

        expect(result.x).toBeCloseTo(expected.x);
        expect(result.y).toBeCloseTo(expected.y);
        random.mockRestore();
    });

    it.each([
        { randoms: [0, 0.5], expected: new Vector(10, 0) },
        { randoms: [0.25, 0.5], expected: new Vector(10, 100) },
        { randoms: [0.5, 0.5], expected: new Vector(0, 50) },
        { randoms: [0.75, 0.5], expected: new Vector(20, 50) },
    ])('chooses a deterministic rectangle edge sample %#', ({ randoms, expected }) => {
        const random = vi.spyOn(Math, 'random');
        for (const value of randoms) {
            random.mockReturnValueOnce(value);
        }

        expect(Vector.randRectBrim(10, 30, 100, 200)).toEqual(expected);
        random.mockRestore();
    });

    it.each([
        { randoms: [0, 0], expected: new Vector(15, 20) },
        { randoms: [0.25, 0.5], expected: new Vector(10, 30) },
        { randoms: [0.5, 1], expected: new Vector(-5, 20) },
    ])('generates deterministic annular samples %#', ({ randoms, expected }) => {
        const random = vi.spyOn(Math, 'random');
        for (const value of randoms) {
            random.mockReturnValueOnce(value);
        }

        const result = Vector.randCircleOutside(10, 20, 5, 15, 100, 100);

        expect(result.x).toBeCloseTo(expected.x);
        expect(result.y).toBeCloseTo(expected.y);
        random.mockRestore();
    });

    it.each([
        { vector: new Vector(3, 4), scalar: 0, expected: new Vector(0, 0) },
        { vector: new Vector(-3, 4), scalar: -2, expected: new Vector(6, -8) },
        { vector: new Vector(1.5, -2), scalar: 2.5, expected: new Vector(3.75, -5) },
    ])('multiplies by scalar values %#', ({ vector, scalar, expected }) => {
        expect(vector.mul(scalar)).toEqual(expected);
        expect(vector).not.toBe(expected);
    });

    it('uses Math.random for bounded deviation and unit-circle generation', () => {
        const random = vi.spyOn(Math, 'random');
        random.mockReturnValueOnce(0.25).mockReturnValueOnce(0.75);
        expect(new Vector(10, 20).deviation(8)).toEqual(new Vector(8, 22));

        random.mockReturnValueOnce(0);
        expect(Vector.randCircle()).toEqual(new Vector(0, 1));

        random.mockRestore();
    });
});
