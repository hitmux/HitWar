/**
 * Validation Result Types
 * Shared between client and server validation layers
 */

/**
 * Error codes for validation failures
 * Prefix indicates category:
 * - PLAYER_* : Player state errors
 * - TOWER_*  : Tower validation errors
 * - SPAWNER_* : Monster spawning errors
 * - CANNON_* : Manual cannon errors
 * - MAP_*    : Position/boundary errors
 * - RESOURCE_* : Money/resource errors
 */
export const ValidationErrorCode = {
  // Player errors
  PLAYER_NOT_FOUND: 'PLAYER_NOT_FOUND',
  PLAYER_NOT_ALIVE: 'PLAYER_NOT_ALIVE',

  // Tower errors
  TOWER_TYPE_INVALID: 'TOWER_TYPE_INVALID',
  TOWER_NOT_FOUND: 'TOWER_NOT_FOUND',
  TOWER_NOT_OWNED: 'TOWER_NOT_OWNED',
  TOWER_UPGRADE_INVALID: 'TOWER_UPGRADE_INVALID',

  // Map/position errors
  POSITION_OUT_OF_BOUNDS: 'POSITION_OUT_OF_BOUNDS',
  POSITION_NOT_IN_TERRITORY: 'POSITION_NOT_IN_TERRITORY',
  POSITION_COLLISION: 'POSITION_COLLISION',

  // Resource errors
  INSUFFICIENT_MONEY: 'INSUFFICIENT_MONEY',

  // Spawner errors
  SPAWNER_NOT_FOUND: 'SPAWNER_NOT_FOUND',
  SPAWNER_NOT_OWNED: 'SPAWNER_NOT_OWNED',
  SPAWNER_INVALID: 'SPAWNER_INVALID',
  SPAWNER_NOT_IN_TERRITORY: 'SPAWNER_NOT_IN_TERRITORY',
  MONSTER_TYPE_INVALID: 'MONSTER_TYPE_INVALID',
  MONSTER_NOT_UNLOCKED: 'MONSTER_NOT_UNLOCKED',
  SPAWN_ON_COOLDOWN: 'SPAWN_ON_COOLDOWN',
  TARGET_PLAYER_INVALID: 'TARGET_PLAYER_INVALID',

  // Cannon errors
  CANNON_NOT_FOUND: 'CANNON_NOT_FOUND',
  CANNON_NOT_OWNED: 'CANNON_NOT_OWNED',
  CANNON_NOT_MANUAL: 'CANNON_NOT_MANUAL',
  CANNON_NO_AMMO: 'CANNON_NO_AMMO',
  CANNON_TARGET_OUT_OF_RANGE: 'CANNON_TARGET_OUT_OF_RANGE',
} as const;

export type ValidationErrorCodeType = (typeof ValidationErrorCode)[keyof typeof ValidationErrorCode];

/**
 * Validation result - either success or failure with details
 */
export interface ValidationResult {
  valid: boolean;
  errorCode?: ValidationErrorCodeType;
  errorMessage?: string;
  /** Extra data for successful validation (e.g., calculated cost) */
  data?: Record<string, unknown>;
}

/**
 * Create a success result
 */
export function validationSuccess(data?: Record<string, unknown>): ValidationResult {
  return { valid: true, data };
}

/**
 * Create a failure result
 */
export function validationFailure(
  errorCode: ValidationErrorCodeType,
  errorMessage?: string
): ValidationResult {
  return {
    valid: false,
    errorCode,
    errorMessage: errorMessage || errorCode,
  };
}
