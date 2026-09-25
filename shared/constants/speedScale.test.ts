import { describe, expect, it } from 'vitest';

import { SPEED_SCALE_FACTOR, scalePeriod, scaleSpeed } from './speedScale.js';

describe('speed scale helpers', () => {
  it('uses the shared scale factor for linear speeds', () => {
    expect(SPEED_SCALE_FACTOR).toBe(3);
    expect(scaleSpeed(0)).toBe(0);
    expect(scaleSpeed(1)).toBe(3);
    expect(scaleSpeed(2.5)).toBe(7.5);
  });

  it.each([
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
    [4, 1],
    [5, 2],
    [8, 3],
    [10, 3],
    [30, 10],
  ])('scales periods with rounding and a minimum of one %#', (period, expected) => {
    expect(scalePeriod(period)).toBe(expected);
  });
});
