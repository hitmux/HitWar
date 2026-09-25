import { describe, expect, it } from 'vitest';
import { QuadTree } from './quadTree';

function obj(id: string, x: number, y: number, r: number) {
    return { id, pos: { x, y }, r };
}

describe('QuadTree', () => {
    it('initializes boundaries and tuning parameters', () => {
        const tree = new QuadTree(1, 2, 3, 4, 5, 6, 7);

        expect(tree.x).toBe(1);
        expect(tree.y).toBe(2);
        expect(tree.w).toBe(3);
        expect(tree.h).toBe(4);
        expect(tree.maxObjects).toBe(5);
        expect(tree.maxLevels).toBe(6);
        expect(tree.level).toBe(7);
        expect(tree.objects).toEqual([]);
        expect(tree.nodes).toEqual([]);
    });

    it('identifies quadrants touched by an object bounds', () => {
        const tree = new QuadTree(0, 0, 100, 100);

        expect(tree.getIndices(obj('tl', 10, 10, 5))).toEqual([0]);
        expect(tree.getIndices(obj('tr', 90, 10, 5))).toEqual([1]);
        expect(tree.getIndices(obj('bl', 10, 90, 5))).toEqual([2]);
        expect(tree.getIndices(obj('br', 90, 90, 5))).toEqual([3]);
        expect(tree.getIndices(obj('center', 50, 50, 5))).toEqual([0, 1, 2, 3]);
    });

    it.each([
        { item: obj('top', 50, 10, 2), indices: [0, 1] },
        { item: obj('bottom', 50, 90, 2), indices: [2, 3] },
        { item: obj('left', 10, 50, 2), indices: [0, 2] },
        { item: obj('right', 90, 50, 2), indices: [1, 3] },
        { item: obj('wide', 50, 50, 60), indices: [0, 1, 2, 3] },
    ])('identifies objects spanning multiple quadrants %#', ({ item, indices }) => {
        const tree = new QuadTree(0, 0, 100, 100);

        expect(tree.getIndices(item)).toEqual(indices);
    });

    it('stores objects until the split threshold is exceeded', () => {
        const tree = new QuadTree(0, 0, 100, 100, 2, 4);
        const a = obj('a', 10, 10, 2);
        const b = obj('b', 20, 20, 2);

        tree.insert(a);
        tree.insert(b);

        expect(tree.nodes).toHaveLength(0);
        expect(tree.retrieve(a)).toEqual(expect.arrayContaining([a, b]));
    });

    it('splits and retrieves candidates from child nodes', () => {
        const tree = new QuadTree(0, 0, 100, 100, 1, 4);
        const a = obj('a', 10, 10, 2);
        const b = obj('b', 80, 80, 2);

        tree.insert(a);
        tree.insert(b);

        expect(tree.nodes).toHaveLength(4);
        expect(tree.objects).toEqual([]);
        expect(tree.retrieve(obj('query', 10, 10, 3))).toContain(a);
        expect(tree.retrieveInRange(80, 80, 3)).toContain(b);
    });

    it('does not split beyond maxLevels', () => {
        const tree = new QuadTree(0, 0, 100, 100, 1, 0);
        const a = obj('a', 10, 10, 2);
        const b = obj('b', 20, 20, 2);

        tree.insert(a);
        tree.insert(b);

        expect(tree.nodes).toEqual([]);
        expect(tree.objects).toEqual([a, b]);
    });

    it('reuses cleared nodes with updated geometry on the next split', () => {
        const tree = new QuadTree(0, 0, 100, 100, 1, 4);
        tree.insert(obj('a', 10, 10, 2));
        tree.insert(obj('b', 80, 80, 2));
        tree.clear();

        const next = new QuadTree(100, 100, 80, 80, 1, 4);
        next.insert(obj('c', 110, 110, 2));
        next.insert(obj('d', 170, 170, 2));

        expect(next.nodes).toHaveLength(4);
        expect(next.nodes[0].x).toBe(100);
        expect(next.nodes[0].y).toBe(100);
        expect(next.nodes[0].w).toBe(40);
        expect(next.nodes[0].h).toBe(40);
    });

    it('clears objects and child nodes', () => {
        const tree = new QuadTree(0, 0, 100, 100, 1, 4);
        tree.insert(obj('a', 10, 10, 2));
        tree.insert(obj('b', 80, 80, 2));

        tree.clear();

        expect(tree.objects).toEqual([]);
        expect(tree.nodes).toEqual([]);
        expect(tree.retrieve(obj('query', 10, 10, 3))).toEqual([]);
    });
});
