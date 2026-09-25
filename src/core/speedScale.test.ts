import { describe, expect, it } from 'vitest';
import { SPEED_SCALE_FACTOR, scalePeriod, scaleSpeed } from './speedScale';

describe('speedScale', () => {
    it('exports the shared speed scale factor', () => {
        expect(SPEED_SCALE_FACTOR).toBe(3);
    });

    it.each([
        { value: 0, expected: 0 },
        { value: 1, expected: 3 },
        { value: -2, expected: -6 },
        { value: 2.5, expected: 7.5 },
    ])('scales speed linearly %#', ({ value, expected }) => {
        expect(scaleSpeed(value)).toBe(expected);
    });

    it.each([
        { value: 0, expected: 1 },
        { value: 1, expected: 1 },
        { value: 2, expected: 1 },
        { value: 3, expected: 1 },
        { value: 4, expected: 1 },
        { value: 5, expected: 2 },
        { value: 7, expected: 2 },
        { value: 8, expected: 3 },
        { value: 60, expected: 20 },
    ])('scales periods with rounding and a minimum of one %#', ({ value, expected }) => {
        expect(scalePeriod(value)).toBe(expected);
    });
});
