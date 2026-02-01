/**
 * Collision Validator - Server-side collision detection for build actions
 */

import type { SpatialEntity } from '../systems/spatial/spatialHashGrid.js';

/**
 * Minimum distance between tower/building centers
 * Towers have radius ~15, buildings ~30, so minimum center distance should be ~35-50
 */
const MIN_ENTITY_DISTANCE = 35;

/**
 * Check if a position would collide with existing entities
 * @param x Position x
 * @param y Position y
 * @param radius Entity radius
 * @param existingEntities Iterable of existing entities with position and radius
 * @returns Colliding entity if found, null otherwise
 */
export function checkCollision<T extends SpatialEntity>(
  x: number,
  y: number,
  radius: number,
  existingEntities: Iterable<T>
): T | null {
  const minDist = radius + MIN_ENTITY_DISTANCE;
  const minDistSq = minDist * minDist;

  for (const entity of existingEntities) {
    const dx = x - entity.position.x;
    const dy = y - entity.position.y;
    const distSq = dx * dx + dy * dy;
    const combinedRadius = minDist + entity.radius;

    if (distSq < combinedRadius * combinedRadius) {
      return entity;
    }
  }
  return null;
}

/**
 * Check if a position would collide with any tower or building
 * Uses spatial hash grid for efficient queries if available
 */
export function checkBuildCollision(
  x: number,
  y: number,
  radius: number,
  towers: Iterable<SpatialEntity>,
  buildings: Iterable<SpatialEntity>
): { collides: boolean; collidingEntityId?: string } {
  // Check towers
  const collidingTower = checkCollision(x, y, radius, towers);
  if (collidingTower) {
    return { collides: true, collidingEntityId: collidingTower.id };
  }

  // Check buildings
  const collidingBuilding = checkCollision(x, y, radius, buildings);
  if (collidingBuilding) {
    return { collides: true, collidingEntityId: collidingBuilding.id };
  }

  return { collides: false };
}
