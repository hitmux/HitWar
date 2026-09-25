import { describe, expect, it } from 'vitest';
import { SpatialHashGrid, type SpatialEntity } from './spatialHashGrid.js';

function entity(id: string, x: number, y: number, radius: number = 5): SpatialEntity {
  return { id, position: { x, y }, radius };
}

describe('SpatialHashGrid', () => {
  it('returns inserted entities from overlapping range and rect queries without duplicates', () => {
    const grid = new SpatialHashGrid<SpatialEntity>(500, 500, 50);
    const large = entity('large', 48, 48, 60);
    const far = entity('far', 300, 300);

    grid.insert(large);
    grid.insert(far);

    expect(grid.queryRange(50, 50, 10).map((item) => item.id)).toEqual(['large']);
    expect(grid.queryRect(0, 0, 120, 120).map((item) => item.id)).toEqual(['large']);
  });

  it('updates moved objects and removes old cell membership', () => {
    const grid = new SpatialHashGrid<SpatialEntity>(500, 500, 50);
    const moving = entity('moving', 10, 10);

    grid.insert(moving);
    moving.position.x = 220;
    moving.position.y = 220;
    grid.update(moving);

    expect(grid.queryRange(10, 10, 20)).toEqual([]);
    expect(grid.queryRange(220, 220, 20)).toEqual([moving]);

    grid.remove(moving);
    expect(grid.queryRange(220, 220, 20)).toEqual([]);
  });

  it('treats update of a new entity as insert and supports negative coordinates', () => {
    const grid = new SpatialHashGrid<SpatialEntity>(500, 500, 50);
    const negative = entity('negative', -25, -25, 10);

    grid.update(negative);
    expect(grid.queryRange(-25, -25, 5)).toEqual([negative]);

    grid.clear();
    expect(grid.queryRange(-25, -25, 100)).toEqual([]);
  });

  it('does not duplicate large entities that span many cells', () => {
    const grid = new SpatialHashGrid<SpatialEntity>(500, 500, 25);
    const large = entity('large', 100, 100, 100);

    grid.insert(large);

    expect(grid.queryRange(100, 100, 150)).toEqual([large]);
    expect(grid.queryRect(0, 0, 250, 250)).toEqual([large]);
  });

  it('supports batch updates and removing unknown entities without affecting results', () => {
    const grid = new SpatialHashGrid<SpatialEntity>(500, 500, 50);
    const a = entity('a', 10, 10);
    const b = entity('b', 100, 100);
    const missing = entity('missing', 200, 200);

    grid.updateAll([a, b]);
    expect(grid.queryRect(0, 0, 150, 150).map((item) => item.id).sort()).toEqual(['a', 'b']);

    a.position.x = 300;
    a.position.y = 300;
    b.position.x = 320;
    b.position.y = 300;
    grid.updateAll([a, b]);
    grid.remove(missing);

    expect(grid.queryRect(0, 0, 150, 150)).toEqual([]);
    expect(grid.queryRange(310, 300, 30).map((item) => item.id).sort()).toEqual(['a', 'b']);
  });
});
