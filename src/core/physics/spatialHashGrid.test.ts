import { describe, expect, it } from 'vitest';
import { SpatialHashGrid, type SpatialGridObject } from './spatialHashGrid';

interface TestObject extends SpatialGridObject {
    id: string;
}

function obj(id: string, x: number, y: number, r: number): TestObject {
    return { id, pos: { x, y }, r };
}

describe('SpatialHashGrid', () => {
    it.each([
        { query: [0, 0, 1] as const, hit: obj('origin', 0, 0, 0) },
        { query: [-20, -20, 10] as const, hit: obj('negative', -20, -20, 5) },
        { query: [199, 199, 5] as const, hit: obj('edge', 199, 199, 1) },
    ])('indexes representative coordinate ranges %#', ({ query, hit }) => {
        const grid = new SpatialHashGrid<TestObject>(200, 200, 50);
        const [x, y, radius] = query;

        grid.insert(hit);

        expect(grid.queryRange(x, y, radius)).toContain(hit);
    });

    it('inserts and queries objects from occupied cells', () => {
        const grid = new SpatialHashGrid<TestObject>(200, 200, 50);
        const a = obj('a', 25, 25, 5);
        const b = obj('b', 125, 125, 5);

        grid.insert(a);
        grid.insert(b);

        expect(grid.queryRange(20, 20, 20)).toEqual([a]);
        expect(grid.queryRange(100, 100, 80)).toEqual(expect.arrayContaining([a, b]));
    });

    it('does not duplicate objects spanning multiple cells in a single query', () => {
        const grid = new SpatialHashGrid<TestObject>(200, 200, 50);
        const large = obj('large', 50, 50, 60);

        grid.insert(large);

        expect(grid.queryRange(50, 50, 80)).toEqual([large]);
    });

    it('removes objects and clears their cached cells', () => {
        const grid = new SpatialHashGrid<TestObject>(200, 200, 50);
        const item = obj('item', 20, 20, 5);

        grid.insert(item);
        grid.remove(item);

        expect(grid.queryRange(20, 20, 10)).toEqual([]);
        expect(item._gridCells).toBeUndefined();
    });

    it('updates moved objects between cells', () => {
        const grid = new SpatialHashGrid<TestObject>(200, 200, 50);
        const item = obj('item', 20, 20, 5);

        grid.insert(item);
        item.pos.x = 160;
        item.pos.y = 160;
        grid.update(item);

        expect(grid.queryRange(20, 20, 10)).toEqual([]);
        expect(grid.queryRange(160, 160, 10)).toEqual([item]);
    });

    it('keeps moved objects queryable when they remain inside the same cells', () => {
        const grid = new SpatialHashGrid<TestObject>(200, 200, 50);
        const item = obj('item', 20, 20, 5);

        grid.insert(item);
        item.pos.x = 21;
        item.pos.y = 21;
        grid.update(item);

        expect(grid.queryRange(20, 20, 10)).toEqual([item]);
        expect(item._gridCells).toBeInstanceOf(Set);
    });

    it('updateAll inserts objects that were not already tracked', () => {
        const grid = new SpatialHashGrid<TestObject>(200, 200, 50);
        const a = obj('a', -20, -20, 5);
        const b = obj('b', 75, 75, 5);

        grid.updateAll([a, b]);

        expect(grid.queryRange(-20, -20, 10)).toEqual([a]);
        expect(grid.queryRange(75, 75, 10)).toEqual([b]);
    });

    it('can remove an object that was never inserted', () => {
        const grid = new SpatialHashGrid<TestObject>(200, 200, 50);
        const item = obj('item', 20, 20, 5);

        grid.remove(item);

        expect(item._gridCells).toBeUndefined();
        expect(grid.queryRange(20, 20, 10)).toEqual([]);
    });

    it('allows reinserting an object after removal', () => {
        const grid = new SpatialHashGrid<TestObject>(200, 200, 50);
        const item = obj('item', 20, 20, 5);

        grid.insert(item);
        grid.remove(item);
        item.pos.x = 80;
        item.pos.y = 80;
        grid.insert(item);

        expect(grid.queryRange(20, 20, 10)).toEqual([]);
        expect(grid.queryRange(80, 80, 10)).toEqual([item]);
    });

    it('clears all buckets', () => {
        const grid = new SpatialHashGrid<TestObject>(200, 200, 50);
        grid.insert(obj('a', 20, 20, 5));

        grid.clear();

        expect(grid.queryRange(20, 20, 10)).toEqual([]);
    });

    it('clearing buckets does not detach cached cells from tracked objects', () => {
        const grid = new SpatialHashGrid<TestObject>(200, 200, 50);
        const item = obj('item', 20, 20, 5);
        grid.insert(item);

        grid.clear();

        expect(item._gridCells).toBeInstanceOf(Set);
        expect(grid.queryRange(20, 20, 10)).toEqual([]);
        grid.update(item);
        expect(grid.queryRange(20, 20, 10)).toEqual([]);
    });
});
