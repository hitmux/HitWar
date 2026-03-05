/**
 * Territory Penalty Configuration
 */

/** Territory penalty multipliers for buildings in invalid territory */
export const TERRITORY_PENALTY = {
  /** Damage multiplier (1/3) */
  DAMAGE_MULTIPLIER: 1 / 3,

  /** Attack range multiplier (2/3) */
  RANGE_MULTIPLIER: 2 / 3,

  /** HP multiplier (1/2) */
  HP_MULTIPLIER: 0.5,
} as const;
