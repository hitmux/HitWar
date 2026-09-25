import { describe, expect, it } from 'vitest';
import { getInterpolationSystem, InterpolationSystem, resetInterpolationSystem } from './interpolation';

describe('InterpolationSystem', () => {
    it('initializes render time with a 50ms buffer delay', () => {
        const interpolation = new InterpolationSystem();

        interpolation.initRenderTime(120);

        expect(interpolation.getRenderTime()).toBe(70);
    });

    it.each([
        { initial: -10, expected: 0 },
        { initial: 0, expected: 0 },
        { initial: 25, expected: 0 },
        { initial: 50, expected: 0 },
        { initial: 75, expected: 25 },
    ])('clamps initial render time %#', ({ initial, expected }) => {
        const interpolation = new InterpolationSystem();

        interpolation.initRenderTime(initial);

        expect(interpolation.getRenderTime()).toBe(expected);
    });

    it.each([
        { dt: 0 },
        { dt: -1 },
        { dt: Number.NaN },
        { dt: Number.POSITIVE_INFINITY },
    ])('ignores invalid frame deltas %#', ({ dt }) => {
        const interpolation = new InterpolationSystem();
        interpolation.initRenderTime(100);

        interpolation.updateRenderTime(dt);

        expect(interpolation.getRenderTime()).toBe(50);
    });

    it('returns null for unknown entities and current position for a single snapshot', () => {
        const interpolation = new InterpolationSystem();

        expect(interpolation.getPosition('missing')).toBeNull();
        interpolation.pushSnapshot('m1', 10, 20, 1);

        expect(interpolation.getPosition('m1')).toEqual({ x: 10, y: 20 });
        expect(interpolation.getPositionOrDefault('missing', 1, 2)).toEqual({ x: 1, y: 2 });
    });

    it('interpolates between snapshots using buffered render time', () => {
        const interpolation = new InterpolationSystem();
        interpolation.initRenderTime(50);
        interpolation.pushSnapshot('m1', 0, 0, 1);
        interpolation.updateRenderTime(100);
        interpolation.pushSnapshot('m1', 100, 50, 2);

        expect(interpolation.getPosition('m1')).toEqual({ x: 50, y: 25 });
    });

    it('clamps interpolation factor to current snapshot when render time passes current time', () => {
        const interpolation = new InterpolationSystem();
        interpolation.initRenderTime(50);
        interpolation.pushSnapshot('m1', 0, 0, 1);
        interpolation.updateRenderTime(100);
        interpolation.pushSnapshot('m1', 100, 50, 2);
        interpolation.updateRenderTime(200);

        expect(interpolation.getPosition('m1')).toEqual({ x: 100, y: 50 });
    });

    it('returns current position for stale snapshots', () => {
        const interpolation = new InterpolationSystem();
        interpolation.pushSnapshot('m1', 0, 0, 1);
        interpolation.updateRenderTime(100);
        interpolation.pushSnapshot('m1', 100, 50, 2);
        interpolation.updateRenderTime(501);

        expect(interpolation.getPosition('m1')).toEqual({ x: 100, y: 50 });
    });

    it('teleports when snapshot distance exceeds the threshold', () => {
        const interpolation = new InterpolationSystem();
        interpolation.initRenderTime(50);
        interpolation.pushSnapshot('m1', 0, 0, 1);
        interpolation.updateRenderTime(100);
        interpolation.pushSnapshot('m1', 300, 0, 2);
        interpolation.updateRenderTime(50);

        expect(interpolation.getPosition('m1')).toEqual({ x: 300, y: 0 });
    });

    it('ignores duplicate position snapshots', () => {
        const interpolation = new InterpolationSystem();
        interpolation.initRenderTime(50);
        interpolation.pushSnapshot('m1', 10, 10, 1);
        interpolation.updateRenderTime(100);
        interpolation.pushSnapshot('m1', 10, 10, 2);
        interpolation.updateRenderTime(50);

        expect(interpolation.getPosition('m1')).toEqual({ x: 10, y: 10 });
    });

    it('tracks entity presence, removal, and clear', () => {
        const interpolation = new InterpolationSystem();
        interpolation.pushSnapshot('a', 1, 1, 1);
        interpolation.pushSnapshot('b', 2, 2, 1);

        expect(interpolation.hasEntity('a')).toBe(true);
        expect(interpolation.getEntityCount()).toBe(2);
        interpolation.removeEntity('a');
        expect(interpolation.hasEntity('a')).toBe(false);
        expect(interpolation.getEntityCount()).toBe(1);
        interpolation.clear();
        expect(interpolation.getEntityCount()).toBe(0);
    });

    it('resets the singleton interpolation system', () => {
        const first = getInterpolationSystem();
        first.pushSnapshot('a', 1, 1, 1);

        resetInterpolationSystem();
        const second = getInterpolationSystem();

        expect(second).not.toBe(first);
        expect(second.getEntityCount()).toBe(0);
        resetInterpolationSystem();
    });
});
