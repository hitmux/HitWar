import { describe, expect, it } from 'vitest';
import { MINE_GENERATION } from '../../../../shared/config/mineMeta.js';
import { generateMinePositions } from './mineGenerator.js';

function withFixedRandom<T>(value: number, fn: () => T): T {
  const originalRandom = Math.random;
  Math.random = () => value;
  try {
    return fn();
  } finally {
    Math.random = originalRandom;
  }
}

describe('generateMinePositions', () => {
  it('returns no mines when fewer than two bases are provided', () => {
    expect(generateMinePositions(1000, 1000, [{ x: 100, y: 100 }])).toEqual([]);
  });

  it('generates deterministic in-bounds mines with fixed randomness', () => {
    const positions = withFixedRandom(0.5, () =>
      generateMinePositions(6000, 4000, [
        { x: 500, y: 2000 },
        { x: 5500, y: 2000 },
      ])
    );

    expect(positions.length).toBeGreaterThan(0);
    for (const position of positions) {
      expect(position.x).toBeGreaterThanOrEqual(MINE_GENERATION.minDistFromEdge);
      expect(position.x).toBeLessThanOrEqual(6000 - MINE_GENERATION.minDistFromEdge);
      expect(position.y).toBeGreaterThanOrEqual(MINE_GENERATION.minDistFromEdge);
      expect(position.y).toBeLessThanOrEqual(4000 - MINE_GENERATION.minDistFromEdge);
    }
  });

  it('keeps generated mines separated by the configured minimum distance', () => {
    const positions = withFixedRandom(0.25, () =>
      generateMinePositions(6000, 4000, [
        { x: 500, y: 2000 },
        { x: 5500, y: 2000 },
      ])
    );
    const minDistSq = MINE_GENERATION.minDistBetweenMines ** 2;

    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const dx = positions[i].x - positions[j].x;
        const dy = positions[i].y - positions[j].y;
        expect(dx * dx + dy * dy).toBeGreaterThanOrEqual(minDistSq);
      }
    }
  });
});
