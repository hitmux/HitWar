/**
 * Collision Validator - Re-exports shared collision detection for server use.
 *
 * All collision logic lives in shared/validation/towerValidation.ts
 * to ensure client and server use identical algorithms and constants.
 */

export {
  hasCollision,
  checkBuildCollision,
  MIN_BUILD_DISTANCE,
} from '../shared/validation/index.js';
