/**
 * Mine Position Generator
 * Generates pseudo-symmetric mine positions for PvP maps
 * Ported from client-side world.ts generateMinesPseudoSymmetric
 */

import { MINE_GENERATION } from '../../../../shared/config/mineMeta.js';

interface Position {
  x: number;
  y: number;
}

/**
 * Generate mine positions for a PvP map.
 * Distributes mines pseudo-symmetrically around player bases.
 */
export function generateMinePositions(
  mapWidth: number,
  mapHeight: number,
  basePositions: Position[]
): Position[] {
  if (basePositions.length < 2) return [];

  const positions: Position[] = [];
  const centerX = mapWidth / 2;
  const {
    guaranteedNearBase,
    nearBaseMinDist,
    nearBaseMaxDist,
    minesPerSide,
    centerMines,
    minDistFromEdge,
    minDistFromBase,
  } = MINE_GENERATION;

  // Phase 1: Guaranteed mines near each base
  for (const basePos of basePositions) {
    let generated = 0;
    let attempts = 0;
    const maxAttempts = 100 * guaranteedNearBase;

    while (generated < guaranteedNearBase && attempts < maxAttempts) {
      const angle = Math.random() * Math.PI * 2;
      const dist = nearBaseMinDist + Math.random() * (nearBaseMaxDist - nearBaseMinDist);
      const x = basePos.x + Math.cos(angle) * dist;
      const y = basePos.y + Math.sin(angle) * dist;
      attempts++;

      if (!isInBounds(x, y, mapWidth, mapHeight, minDistFromEdge)) continue;
      if (isTooCloseToExisting(x, y, positions)) continue;

      positions.push({ x, y });
      generated++;
    }
  }

  // Phase 2: Left side mines
  generateMinesInRegion(
    positions,
    minDistFromEdge,
    centerX - 100,
    minDistFromEdge,
    mapHeight - minDistFromEdge,
    minesPerSide - guaranteedNearBase,
    basePositions,
    minDistFromBase
  );

  // Phase 3: Right side mines
  generateMinesInRegion(
    positions,
    centerX + 100,
    mapWidth - minDistFromEdge,
    minDistFromEdge,
    mapHeight - minDistFromEdge,
    minesPerSide - guaranteedNearBase,
    basePositions,
    minDistFromBase
  );

  // Phase 4: Center contested zone
  generateMinesInRegion(
    positions,
    centerX - 100,
    centerX + 100,
    minDistFromEdge,
    mapHeight - minDistFromEdge,
    centerMines,
    basePositions,
    minDistFromBase
  );

  return positions;
}

/**
 * Generate mines in a rectangular region using grid distribution
 */
function generateMinesInRegion(
  positions: Position[],
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  count: number,
  basePositions: Position[],
  minDistFromBase: number
): void {
  const effectiveWidth = maxX - minX;
  const effectiveHeight = maxY - minY;

  if (effectiveWidth <= 0 || effectiveHeight <= 0 || count <= 0) return;

  const gridCols = Math.max(1, Math.ceil(Math.sqrt(count * effectiveWidth / effectiveHeight)));
  const gridRows = Math.max(1, Math.ceil(count / gridCols));
  const cellWidth = effectiveWidth / gridCols;
  const cellHeight = effectiveHeight / gridRows;

  // Shuffle cell indices for random distribution
  const cellIndices: number[] = [];
  for (let i = 0; i < gridCols * gridRows; i++) {
    cellIndices.push(i);
  }
  for (let i = cellIndices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cellIndices[i], cellIndices[j]] = [cellIndices[j], cellIndices[i]];
  }

  let generated = 0;
  const maxAttempts = 100;

  for (const idx of cellIndices) {
    if (generated >= count) break;

    const col = idx % gridCols;
    const row = Math.floor(idx / gridCols);

    const margin = 20;
    const baseX = minX + col * cellWidth;
    const baseY = minY + row * cellHeight;

    let attempts = 0;
    let placed = false;

    while (!placed && attempts < maxAttempts) {
      const x = baseX + margin + Math.random() * Math.max(0, cellWidth - 2 * margin);
      const y = baseY + margin + Math.random() * Math.max(0, cellHeight - 2 * margin);
      attempts++;

      // Check distance from bases
      let tooCloseToBase = false;
      for (const bp of basePositions) {
        const dx = x - bp.x;
        const dy = y - bp.y;
        if (dx * dx + dy * dy < minDistFromBase * minDistFromBase) {
          tooCloseToBase = true;
          break;
        }
      }
      if (tooCloseToBase) continue;

      // Check distance from other mines
      if (isTooCloseToExisting(x, y, positions)) continue;

      positions.push({ x, y });
      generated++;
      placed = true;
    }
  }
}

function isInBounds(
  x: number,
  y: number,
  mapWidth: number,
  mapHeight: number,
  margin: number
): boolean {
  return x >= margin && x <= mapWidth - margin && y >= margin && y <= mapHeight - margin;
}

function isTooCloseToExisting(x: number, y: number, positions: Position[]): boolean {
  const minDist = MINE_GENERATION.minDistBetweenMines;
  const minDistSq = minDist * minDist;
  for (const pos of positions) {
    const dx = x - pos.x;
    const dy = y - pos.y;
    if (dx * dx + dy * dy < minDistSq) return true;
  }
  return false;
}
