/**
 * Speed scale constants for game calculations
 * Shared between client and server
 *
 * Speed scale factor reduces tick calculations:
 * Setting to 3 means: speed x3, period /3, so 1x speed = original 3x effect
 */

export const SPEED_SCALE_FACTOR = 3;

/**
 * Scale speed value (multiply by factor)
 * Used for linear speeds (movement, bullet velocity, etc.)
 */
export const scaleSpeed = (v: number): number => v * SPEED_SCALE_FACTOR;

/**
 * Scale period/interval value (divide by factor)
 * Used for time periods/intervals (attack cooldown, animation period, etc.)
 */
export const scalePeriod = (v: number): number => Math.max(1, Math.round(v / SPEED_SCALE_FACTOR));
