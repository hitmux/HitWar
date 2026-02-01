/**
 * Vector utilities for server-side calculations
 * Pure functions for 2D vector operations (no class instantiation for performance)
 */

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Add two vectors
 */
export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

/**
 * Subtract b from a
 */
export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

/**
 * Multiply vector by scalar
 */
export function mul(v: Vec2, n: number): Vec2 {
  return { x: v.x * n, y: v.y * n };
}

/**
 * Get squared distance between two points (faster, no sqrt)
 */
export function distSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * Get distance between two points
 */
export function dist(a: Vec2, b: Vec2): number {
  return Math.sqrt(distSq(a, b));
}

/**
 * Get squared magnitude (faster, no sqrt)
 */
export function magSq(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}

/**
 * Get magnitude
 */
export function mag(v: Vec2): number {
  return Math.sqrt(magSq(v));
}

/**
 * Normalize to unit vector
 */
export function normalize(v: Vec2): Vec2 {
  const m = mag(v);
  if (m === 0) return { x: 0, y: 0 };
  return { x: v.x / m, y: v.y / m };
}

/**
 * Dot product
 */
export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

/**
 * Rotate vector by angle (radians)
 */
export function rotate(v: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

/**
 * Rotate 90 degrees counter-clockwise
 */
export function rotate90(v: Vec2): Vec2 {
  return { x: -v.y, y: v.x };
}

/**
 * Convert to angle (radians)
 */
export function toAngle(v: Vec2): number {
  return Math.atan2(v.x, v.y);
}

/**
 * Create vector from angle and magnitude
 */
export function fromAngle(angle: number, magnitude: number = 1): Vec2 {
  return {
    x: Math.sin(angle) * magnitude,
    y: Math.cos(angle) * magnitude,
  };
}

/**
 * Linear interpolation between two vectors
 */
export function lerp(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

/**
 * Random unit vector
 */
export function randUnit(): Vec2 {
  const angle = Math.random() * Math.PI * 2;
  return { x: Math.sin(angle), y: Math.cos(angle) };
}

/**
 * Zero vector
 */
export function zero(): Vec2 {
  return { x: 0, y: 0 };
}
