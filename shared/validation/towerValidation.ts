/**
 * Tower Validation Pure Functions
 * Shared between client and server for consistent validation
 */

import type { ValidationResult } from './types.js';
import {
  ValidationErrorCode,
  validationSuccess,
  validationFailure,
} from './types.js';

/**
 * Minimal tower metadata needed for validation
 */
export interface TowerMetaData {
  id: string;
  price: number;
  levelUpArr: string[];
}

/**
 * Position with x, y coordinates
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Entity with position and radius (for collision checking)
 */
export interface CollidableEntity {
  position: Position;
  radius: number;
  id?: string;
}

/**
 * Player state minimal interface for validation
 */
export interface PlayerValidationState {
  id: string;
  isAlive: boolean;
  money: number;
}

/**
 * Tower state minimal interface for validation
 */
export interface TowerValidationState {
  id: string;
  ownerId: string;
  towerType: string;
  position: Position;
  radius: number;
  attackRadius: number;
  isManual: boolean;
  currentAmmo: number;
}

/**
 * Map bounds
 */
export interface MapBounds {
  width: number;
  height: number;
}

/**
 * Check if a position is within map bounds
 */
export function isPositionInBounds(
  x: number,
  y: number,
  bounds: MapBounds,
  margin: number = 0
): boolean {
  return (
    x >= margin &&
    y >= margin &&
    x <= bounds.width - margin &&
    y <= bounds.height - margin
  );
}

/**
 * Minimum distance gap between entity edges when building.
 * With tower radius ~15 and building radius ~30, this ensures
 * a comfortable spacing between placed entities.
 */
export const MIN_BUILD_DISTANCE = 35;

/**
 * Check for collision with existing entities.
 * Returns the colliding entity if found, null otherwise.
 */
export function hasCollision(
  x: number,
  y: number,
  radius: number,
  entities: Iterable<CollidableEntity>,
  minDistance: number = 0
): CollidableEntity | null {
  const checkRadius = radius + minDistance;
  for (const entity of entities) {
    const dx = x - entity.position.x;
    const dy = y - entity.position.y;
    const distSq = dx * dx + dy * dy;
    const combinedRadius = checkRadius + entity.radius;
    if (distSq < combinedRadius * combinedRadius) {
      return entity;
    }
  }
  return null;
}

/**
 * Check if a build position collides with any existing tower or building.
 * Uses MIN_BUILD_DISTANCE as the spacing requirement.
 */
export function checkBuildCollision(
  x: number,
  y: number,
  radius: number,
  towers: Iterable<CollidableEntity>,
  buildings: Iterable<CollidableEntity>
): { collides: boolean; collidingEntityId?: string } {
  const collidingTower = hasCollision(x, y, radius, towers, MIN_BUILD_DISTANCE);
  if (collidingTower) {
    return { collides: true, collidingEntityId: collidingTower.id };
  }

  const collidingBuilding = hasCollision(x, y, radius, buildings, MIN_BUILD_DISTANCE);
  if (collidingBuilding) {
    return { collides: true, collidingEntityId: collidingBuilding.id };
  }

  return { collides: false };
}

/**
 * Validate BUILD_TOWER action
 * Does NOT validate territory (server-specific with TerritoryCalculator)
 */
export function validateBuildTowerBasic(
  player: PlayerValidationState | undefined,
  towerType: string,
  x: number,
  y: number,
  towerMeta: TowerMetaData | undefined,
  bounds: MapBounds
): ValidationResult {
  // 1. Player must exist and be alive
  if (!player) {
    return validationFailure(ValidationErrorCode.PLAYER_NOT_FOUND);
  }
  if (!player.isAlive) {
    return validationFailure(ValidationErrorCode.PLAYER_NOT_ALIVE);
  }

  // 2. Tower type must be valid
  if (!towerMeta) {
    return validationFailure(
      ValidationErrorCode.TOWER_TYPE_INVALID,
      `Unknown tower type: ${towerType}`
    );
  }

  // 3. Position must be within map bounds (with margin for tower radius)
  const towerRadius = 15; // Default tower radius
  if (!isPositionInBounds(x, y, bounds, towerRadius)) {
    return validationFailure(ValidationErrorCode.POSITION_OUT_OF_BOUNDS);
  }

  // Return success with base price (territory cost multiplier applied separately)
  return validationSuccess({ basePrice: towerMeta.price, towerType });
}

/**
 * Validate UPGRADE_TOWER action
 */
export function validateUpgradeTower(
  player: PlayerValidationState | undefined,
  tower: TowerValidationState | undefined,
  targetType: string,
  currentTowerMeta: TowerMetaData | undefined,
  targetTowerMeta: TowerMetaData | undefined
): ValidationResult {
  // 1. Player must exist and be alive
  if (!player) {
    return validationFailure(ValidationErrorCode.PLAYER_NOT_FOUND);
  }
  if (!player.isAlive) {
    return validationFailure(ValidationErrorCode.PLAYER_NOT_ALIVE);
  }

  // 2. Tower must exist
  if (!tower) {
    return validationFailure(ValidationErrorCode.TOWER_NOT_FOUND);
  }

  // 3. Tower must be owned by player
  if (tower.ownerId !== player.id) {
    return validationFailure(ValidationErrorCode.TOWER_NOT_OWNED);
  }

  // 4. Current tower meta must exist
  if (!currentTowerMeta) {
    return validationFailure(
      ValidationErrorCode.TOWER_TYPE_INVALID,
      `Unknown current tower type: ${tower.towerType}`
    );
  }

  // 5. Target type must be in levelUpArr
  if (!currentTowerMeta.levelUpArr.includes(targetType)) {
    return validationFailure(
      ValidationErrorCode.TOWER_UPGRADE_INVALID,
      `Cannot upgrade from ${tower.towerType} to ${targetType}`
    );
  }

  // 6. Target tower meta must exist
  if (!targetTowerMeta) {
    return validationFailure(
      ValidationErrorCode.TOWER_TYPE_INVALID,
      `Unknown target tower type: ${targetType}`
    );
  }

  // 7. Player must have enough money
  if (player.money < targetTowerMeta.price) {
    return validationFailure(
      ValidationErrorCode.INSUFFICIENT_MONEY,
      `Need ${targetTowerMeta.price}, have ${player.money}`
    );
  }

  return validationSuccess({ cost: targetTowerMeta.price, targetType });
}

/**
 * Validate SELL_TOWER action
 */
export function validateSellTower(
  player: PlayerValidationState | undefined,
  tower: TowerValidationState | undefined,
  towerMeta: TowerMetaData | undefined,
  sellRefundRate: number = 0.5
): ValidationResult {
  // 1. Player must exist and be alive
  if (!player) {
    return validationFailure(ValidationErrorCode.PLAYER_NOT_FOUND);
  }
  if (!player.isAlive) {
    return validationFailure(ValidationErrorCode.PLAYER_NOT_ALIVE);
  }

  // 2. Tower must exist
  if (!tower) {
    return validationFailure(ValidationErrorCode.TOWER_NOT_FOUND);
  }

  // 3. Tower must be owned by player
  if (tower.ownerId !== player.id) {
    return validationFailure(ValidationErrorCode.TOWER_NOT_OWNED);
  }

  // Calculate refund (default 50% of base price)
  const basePrice = towerMeta?.price || 50;
  const refund = Math.floor(basePrice * sellRefundRate);

  return validationSuccess({ refund, towerId: tower.id });
}

/**
 * Validate CANNON_FIRE action
 */
export function validateCannonFire(
  player: PlayerValidationState | undefined,
  tower: TowerValidationState | undefined,
  targetX: number,
  targetY: number
): ValidationResult {
  // 1. Player must exist and be alive
  if (!player) {
    return validationFailure(ValidationErrorCode.PLAYER_NOT_FOUND);
  }
  if (!player.isAlive) {
    return validationFailure(ValidationErrorCode.PLAYER_NOT_ALIVE);
  }

  // 2. Tower must exist
  if (!tower) {
    return validationFailure(ValidationErrorCode.CANNON_NOT_FOUND);
  }

  // 3. Tower must be owned by player
  if (tower.ownerId !== player.id) {
    return validationFailure(ValidationErrorCode.CANNON_NOT_OWNED);
  }

  // 4. Tower must be a manual cannon
  if (!tower.isManual) {
    return validationFailure(ValidationErrorCode.CANNON_NOT_MANUAL);
  }

  // 5. Tower must have ammo
  if (tower.currentAmmo <= 0) {
    return validationFailure(ValidationErrorCode.CANNON_NO_AMMO);
  }

  // 6. Target must be within attack radius
  const dx = targetX - tower.position.x;
  const dy = targetY - tower.position.y;
  const distSq = dx * dx + dy * dy;
  if (distSq > tower.attackRadius * tower.attackRadius) {
    return validationFailure(ValidationErrorCode.CANNON_TARGET_OUT_OF_RANGE);
  }

  return validationSuccess();
}
