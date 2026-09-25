import { describe, expect, it } from 'vitest';

import {
  add,
  dist,
  distSq,
  dot,
  fromAngle,
  lerp,
  mag,
  magSq,
  mul,
  normalize,
  rotate,
  rotate90,
  sub,
  toAngle,
  zero,
} from './vector.js';

const expectVecCloseTo = (actual: { x: number; y: number }, expected: { x: number; y: number }) => {
  expect(actual.x).toBeCloseTo(expected.x);
  expect(actual.y).toBeCloseTo(expected.y);
};

describe('vector arithmetic', () => {
  it('adds, subtracts, and scales vectors without mutating inputs', () => {
    const a = { x: 3, y: 4 };
    const b = { x: -1, y: 2 };

    expect(add(a, b)).toEqual({ x: 2, y: 6 });
    expect(sub(a, b)).toEqual({ x: 4, y: 2 });
    expect(mul(a, 2)).toEqual({ x: 6, y: 8 });
    expect(a).toEqual({ x: 3, y: 4 });
    expect(b).toEqual({ x: -1, y: 2 });
  });

  it.each([
    [{ x: -3, y: 7 }, { x: 4, y: -2 }, { x: 1, y: 5 }],
    [{ x: 0.5, y: -1.5 }, { x: 1.25, y: 3 }, { x: 1.75, y: 1.5 }],
    [{ x: 0, y: 0 }, { x: 12, y: -8 }, { x: 12, y: -8 }],
  ])('adds representative vectors %#', (a, b, expected) => {
    expect(add(a, b)).toEqual(expected);
  });

  it.each([
    [{ x: -3, y: 7 }, { x: 4, y: -2 }, { x: -7, y: 9 }],
    [{ x: 0.5, y: -1.5 }, { x: 1.25, y: 3 }, { x: -0.75, y: -4.5 }],
    [{ x: 0, y: 0 }, { x: 12, y: -8 }, { x: -12, y: 8 }],
  ])('subtracts representative vectors %#', (a, b, expected) => {
    expect(sub(a, b)).toEqual(expected);
  });

  it.each([
    [{ x: 3, y: -4 }, 0, { x: 0, y: -0 }],
    [{ x: 3, y: -4 }, -2, { x: -6, y: 8 }],
    [{ x: 0.25, y: 0.5 }, 4, { x: 1, y: 2 }],
  ])('scales vectors by scalar %#', (v, n, expected) => {
    expect(mul(v, n)).toEqual(expected);
  });

  it('calculates squared and actual distances and magnitudes', () => {
    expect(distSq({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(magSq({ x: 3, y: 4 })).toBe(25);
    expect(mag({ x: 3, y: 4 })).toBe(5);
  });

  it.each([
    [{ x: -1, y: -1 }, { x: -4, y: -5 }, 25],
    [{ x: 10, y: 10 }, { x: 10, y: 10 }, 0],
    [{ x: 2.5, y: -1 }, { x: -1.5, y: 2 }, 25],
  ])('calculates squared distance for representative points %#', (a, b, expected) => {
    expect(distSq(a, b)).toBe(expected);
    expect(dist(a, b)).toBeCloseTo(Math.sqrt(expected));
  });

  it.each([
    [{ x: -3, y: -4 }, 25, 5],
    [{ x: 0, y: -7 }, 49, 7],
    [{ x: 1.5, y: 2 }, 6.25, 2.5],
  ])('calculates magnitude for representative vectors %#', (v, expectedSq, expected) => {
    expect(magSq(v)).toBe(expectedSq);
    expect(mag(v)).toBe(expected);
  });

  it('normalizes non-zero vectors and leaves zero vectors at zero', () => {
    expect(normalize({ x: 3, y: 4 })).toEqual({ x: 0.6, y: 0.8 });
    expect(normalize({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it.each([
    [{ x: -3, y: 4 }, { x: -0.6, y: 0.8 }],
    [{ x: 0, y: -5 }, { x: 0, y: -1 }],
    [{ x: 12, y: 0 }, { x: 1, y: 0 }],
  ])('normalizes directional vectors %#', (v, expected) => {
    expectVecCloseTo(normalize(v), expected);
  });

  it('calculates dot products', () => {
    expect(dot({ x: 1, y: 2 }, { x: 3, y: 4 })).toBe(11);
    expect(dot({ x: 1, y: 0 }, { x: 0, y: 1 })).toBe(0);
  });

  it.each([
    [{ x: -1, y: 2 }, { x: 3, y: -4 }, -11],
    [{ x: 2.5, y: 4 }, { x: 2, y: 0.5 }, 7],
    [{ x: 0, y: 0 }, { x: 99, y: -99 }, 0],
  ])('calculates dot products for representative vectors %#', (a, b, expected) => {
    expect(dot(a, b)).toBe(expected);
  });
});

describe('vector rotation and angle conversion', () => {
  it('rotates vectors by radians and by 90 degrees counter-clockwise', () => {
    const rotated = rotate({ x: 1, y: 0 }, Math.PI / 2);

    expect(rotated.x).toBeCloseTo(0);
    expect(rotated.y).toBeCloseTo(1);
    expect(rotate90({ x: 2, y: 3 })).toEqual({ x: -3, y: 2 });
  });

  it.each([
    [{ x: 1, y: 0 }, Math.PI, { x: -1, y: 0 }],
    [{ x: 0, y: 1 }, Math.PI / 2, { x: -1, y: 0 }],
    [{ x: 2, y: -3 }, 0, { x: 2, y: -3 }],
  ])('rotates vectors by selected angles %#', (v, angle, expected) => {
    expectVecCloseTo(rotate(v, angle), expected);
  });

  it.each([
    [{ x: 0, y: 1 }, { x: -1, y: 0 }],
    [{ x: -4, y: 2 }, { x: -2, y: -4 }],
    [{ x: 0, y: 0 }, { x: -0, y: 0 }],
  ])('rotates vectors 90 degrees counter-clockwise %#', (v, expected) => {
    expect(rotate90(v)).toEqual(expected);
  });

  it('uses the project angle convention where x is sin and y is cos', () => {
    expect(toAngle({ x: 0, y: 1 })).toBe(0);
    expect(toAngle({ x: 1, y: 0 })).toBeCloseTo(Math.PI / 2);
    expect(fromAngle(0)).toEqual({ x: 0, y: 1 });
    expect(fromAngle(Math.PI / 2, 2).x).toBeCloseTo(2);
    expect(fromAngle(Math.PI / 2, 2).y).toBeCloseTo(0);
  });

  it.each([
    [Math.PI, 3, { x: 0, y: -3 }],
    [(3 * Math.PI) / 2, 2, { x: -2, y: 0 }],
    [Math.PI / 6, 4, { x: 2, y: 2 * Math.sqrt(3) }],
  ])('creates vectors from angles and magnitudes %#', (angle, magnitude, expected) => {
    expectVecCloseTo(fromAngle(angle, magnitude), expected);
  });

  it.each([
    [{ x: 0, y: -1 }, Math.PI],
    [{ x: -1, y: 0 }, -Math.PI / 2],
    [{ x: 1, y: 1 }, Math.PI / 4],
  ])('converts vectors to project angles %#', (v, expected) => {
    expect(toAngle(v)).toBeCloseTo(expected);
  });
});

describe('vector interpolation and constants', () => {
  it('linearly interpolates inside and outside the [0, 1] range', () => {
    expect(lerp({ x: 0, y: 10 }, { x: 10, y: 20 }, 0.5)).toEqual({ x: 5, y: 15 });
    expect(lerp({ x: 0, y: 10 }, { x: 10, y: 20 }, -1)).toEqual({ x: -10, y: 0 });
    expect(lerp({ x: 0, y: 10 }, { x: 10, y: 20 }, 2)).toEqual({ x: 20, y: 30 });
  });

  it('returns a new zero vector', () => {
    expect(zero()).toEqual({ x: 0, y: 0 });
    expect(zero()).not.toBe(zero());
  });

  it.each([
    [{ x: -10, y: 10 }, { x: 10, y: -10 }, 0.25, { x: -5, y: 5 }],
    [{ x: 2, y: 2 }, { x: 6, y: 10 }, 0, { x: 2, y: 2 }],
    [{ x: 2, y: 2 }, { x: 6, y: 10 }, 1, { x: 6, y: 10 }],
  ])('interpolates selected vector pairs %#', (a, b, t, expected) => {
    expect(lerp(a, b, t)).toEqual(expected);
  });
});
