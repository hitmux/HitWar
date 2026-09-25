import { describe, expect, it } from 'vitest';
import {
  MIN_BUILD_DISTANCE,
  checkBuildCollision,
  hasCollision,
} from './collisionValidator.js';

function entity(id: string, x: number, y: number, radius: number) {
  return { id, position: { x, y }, radius };
}

describe('collisionValidator re-exported collision helpers', () => {
  it.each([
    { distance: 19, expected: 'target' },
    { distance: 20, expected: undefined },
    { distance: 21, expected: undefined },
  ])('uses strict overlap collision boundary case %#', ({ distance, expected }) => {
    expect(hasCollision(0, 0, 10, [entity('target', distance, 0, 10)])?.id).toBe(expected);
  });

  it('finds the first colliding entity using entity radius and optional spacing', () => {
    const entities = [
      entity('near', 19, 0, 10),
      entity('far', 100, 0, 10),
    ];

    expect(hasCollision(0, 0, 10, entities)?.id).toBe('near');
    expect(hasCollision(0, 0, 5, [entity('gap', 20, 0, 10)])).toBeNull();
    expect(hasCollision(0, 0, 5, [entity('gap', 20, 0, 10)], 6)?.id).toBe('gap');
  });

  it('checks towers before buildings for build collisions', () => {
    const towers = [entity('tower', 20, 0, 10)];
    const buildings = [entity('building', 20, 0, 10)];

    expect(MIN_BUILD_DISTANCE).toBe(35);
    expect(checkBuildCollision(0, 0, 10, towers, buildings)).toEqual({
      collides: true,
      collidingEntityId: 'tower',
    });
    expect(checkBuildCollision(0, 0, 10, [], buildings)).toEqual({
      collides: true,
      collidingEntityId: 'building',
    });
    expect(checkBuildCollision(200, 0, 10, towers, buildings)).toEqual({ collides: false });
  });
});
