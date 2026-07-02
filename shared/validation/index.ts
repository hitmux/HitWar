/**
 * Shared Validation Module
 * Provides pure validation functions used by both client and server
 */

export {
  ValidationErrorCode,
  validationSuccess,
  validationFailure,
  type ValidationErrorCodeType,
  type ValidationResult,
} from './types.js';

export {
  isPositionInBounds,
  hasCollision,
  checkBuildCollision,
  MIN_BUILD_DISTANCE,
  validateBuildTowerBasic,
  validateUpgradeTower,
  validateSellTower,
  validateCannonFire,
  validateCannonSetAutoTarget,
  type TowerMetaData,
  type Position,
  type CollidableEntity,
  type PlayerValidationState,
  type TowerValidationState,
  type MapBounds,
} from './towerValidation.js';

export {
  validateSpawnMonster,
  type SpawnableMonsterConfig,
  type SpawnerValidationState,
  type TargetPlayerState,
} from './monsterValidation.js';
