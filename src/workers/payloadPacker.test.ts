import { describe, expect, it } from 'vitest';
import { packBuildingPositions, packVisionSources } from './payloadPacker';

describe('payloadPacker', () => {
    it.each([
        { sources: [{ x: 0, y: 0, radius: 0 }], expected: [0, 0, 0] },
        { sources: [{ x: 1.25, y: -2.5, radius: 3.75 }], expected: [1.25, -2.5, 3.75] },
        { sources: [{ x: 1024.5, y: 1, radius: 2 }], expected: [1024.5, 1, 2] },
    ])('packs single vision source values %#', ({ sources, expected }) => {
        const packed = packVisionSources(sources);

        expect(packed.count).toBe(sources.length);
        expect(Array.from(packed.buffer)).toEqual(expected);
    });

    it('packs vision sources into a dense Float32Array', () => {
        const packed = packVisionSources([
            { x: 1, y: 2, radius: 3 },
            { x: -4, y: 5.5, radius: 6 },
        ]);

        expect(packed.count).toBe(2);
        expect(packed.buffer).toBeInstanceOf(Float32Array);
        expect(Array.from(packed.buffer)).toEqual([1, 2, 3, -4, 5.5, 6]);
    });

    it.each([
        { buildings: [{ pos: { x: 0, y: 0 } }], expected: [0, 0] },
        { buildings: [{ pos: { x: -1.5, y: 2.25 } }], expected: [-1.5, 2.25] },
        { buildings: [{ pos: { x: 99, y: -100 } }, { pos: { x: 0.5, y: 0.25 } }], expected: [99, -100, 0.5, 0.25] },
    ])('packs representative building positions %#', ({ buildings, expected }) => {
        const packed = packBuildingPositions(buildings);

        expect(packed.count).toBe(buildings.length);
        expect(Array.from(packed.buffer)).toEqual(expected);
    });

    it('packs building positions into a dense Float32Array', () => {
        const packed = packBuildingPositions([
            { pos: { x: 10, y: 20 } },
            { pos: { x: -30, y: 40 } },
        ]);

        expect(packed.count).toBe(2);
        expect(packed.buffer).toBeInstanceOf(Float32Array);
        expect(Array.from(packed.buffer)).toEqual([10, 20, -30, 40]);
    });

    it('returns empty buffers for empty input', () => {
        expect(packVisionSources([])).toEqual({ buffer: new Float32Array(0), count: 0 });
        expect(packBuildingPositions([])).toEqual({ buffer: new Float32Array(0), count: 0 });
    });

    it('returns fresh buffers for each packing call', () => {
        const source = [{ x: 1, y: 2, radius: 3 }];
        const first = packVisionSources(source);
        const second = packVisionSources(source);

        first.buffer[0] = 99;

        expect(second.buffer[0]).toBe(1);
        expect(first.buffer).not.toBe(second.buffer);
    });
});
