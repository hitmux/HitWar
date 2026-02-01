/**
 * Circle collision detection utilities
 * Shared between client and server
 *
 * Pure functions for static and sweep collision detection between circles.
 * Critical for bullet-monster collision in the two-phase update system.
 */

/**
 * Check if two circles collide (static)
 */
export function collides(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
): boolean {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distSq = dx * dx + dy * dy;
  const radiusSum = r1 + r2;
  return distSq <= radiusSum * radiusSum;
}

/**
 * Sweep collision: moving circle vs static circle
 * Checks if a circle moving from (x1,y1) to (x2,y2) collides with static circle
 * @param x1 Moving circle start x
 * @param y1 Moving circle start y
 * @param x2 Moving circle end x
 * @param y2 Moving circle end y
 * @param movingR Moving circle radius
 * @param cx Static circle center x
 * @param cy Static circle center y
 * @param targetR Static circle radius
 * @returns true if collision occurs during movement
 */
export function sweepCollides(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  movingR: number,
  cx: number,
  cy: number,
  targetR: number,
): boolean {
  const combinedR = movingR + targetR;
  const combinedRSq = combinedR * combinedR;

  // Quick check: start point already in collision range
  const dx1 = x1 - cx;
  const dy1 = y1 - cy;
  if (dx1 * dx1 + dy1 * dy1 <= combinedRSq) return true;

  // Quick check: end point already in collision range
  const dx2 = x2 - cx;
  const dy2 = y2 - cy;
  if (dx2 * dx2 + dy2 * dy2 <= combinedRSq) return true;

  // Line segment direction vector
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return false;

  // Solve quadratic: at^2 + bt + c = 0
  // Find closest point on segment, check if in t in [0,1] range
  const fx = x1 - cx;
  const fy = y1 - cy;
  const a = lenSq;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - combinedRSq;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return false;

  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b - sqrtD) / (2 * a);
  const t2 = (-b + sqrtD) / (2 * a);

  // Check if any solution in [0,1] range
  return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1);
}

/**
 * Relative velocity sweep collision: two moving circles
 * Transforms to target's reference frame (target appears static)
 * @param ax1 Object A start x
 * @param ay1 Object A start y
 * @param ax2 Object A end x
 * @param ay2 Object A end y
 * @param aR Object A radius
 * @param bx1 Object B start x
 * @param by1 Object B start y
 * @param bx2 Object B end x
 * @param by2 Object B end y
 * @param bR Object B radius
 * @returns true if collision occurs during movement
 */
export function sweepCollidesRelative(
  ax1: number,
  ay1: number,
  ax2: number,
  ay2: number,
  aR: number,
  bx1: number,
  by1: number,
  bx2: number,
  by2: number,
  bR: number,
): boolean {
  // Transform to B's reference frame: B appears static at origin
  const relX1 = ax1 - bx1;
  const relY1 = ay1 - by1;
  // A's relative end = relative start + (A displacement - B displacement)
  const relX2 = relX1 + (ax2 - ax1) - (bx2 - bx1);
  const relY2 = relY1 + (ay2 - ay1) - (by2 - by1);

  return sweepCollides(relX1, relY1, relX2, relY2, aR, 0, 0, bR);
}

/**
 * Get collision time (t in [0,1]) for sweep collision
 * Returns -1 if no collision
 */
export function sweepCollisionTime(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  movingR: number,
  cx: number,
  cy: number,
  targetR: number,
): number {
  const combinedR = movingR + targetR;
  const combinedRSq = combinedR * combinedR;

  // Check if already colliding at start
  const dx1 = x1 - cx;
  const dy1 = y1 - cy;
  if (dx1 * dx1 + dy1 * dy1 <= combinedRSq) return 0;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return -1;

  const fx = x1 - cx;
  const fy = y1 - cy;
  const a = lenSq;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - combinedRSq;

  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return -1;

  const sqrtD = Math.sqrt(discriminant);
  const t1 = (-b - sqrtD) / (2 * a);

  if (t1 >= 0 && t1 <= 1) return t1;

  const t2 = (-b + sqrtD) / (2 * a);
  if (t2 >= 0 && t2 <= 1) return t2;

  return -1;
}
