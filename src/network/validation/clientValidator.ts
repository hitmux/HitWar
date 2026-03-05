/**
 * ClientValidator - Client-side pre-validation for UX fast feedback
 *
 * Uses shared validation pure functions + local World state
 * Does NOT replace server-side validation - just provides quick feedback
 */

import type { World } from '../../game/world';
import type { TowerRegistry } from '../../towers/towerRegistry';
import { TowerRegistry as TowerReg } from '../../towers/towerRegistry';
import {
  type ValidationResult,
  ValidationErrorCode,
  validationSuccess,
  validationFailure,
  validateBuildTowerBasic,
  validateCannonFire,
  checkBuildCollision,
  type TowerMetaData,
  type TowerValidationState,
  type PlayerValidationState,
} from '../../../shared/validation';
import { SPAWNABLE_MONSTERS } from '../../buildings/spawnerConfig';

/**
 * Minimal local player state for validation
 */
interface LocalPlayerState {
  isAlive: boolean;
  money: number;
}

/**
 * Get tower metadata from TowerRegistry
 */
function getTowerMeta(towerType: string): TowerMetaData | undefined {
  const meta = TowerReg.getMeta(towerType);
  if (!meta) return undefined;
  // levelUpArr not directly available from meta, return empty for basic check
  return {
    id: towerType,
    price: meta.basePrice,
    levelUpArr: [], // Will be filled if we have config access
  };
}

/**
 * Client-side validator for pre-flight checks
 */
export class ClientValidator {
  private world: World;

  constructor(world: World) {
    this.world = world;
  }

  /**
   * Update world reference
   */
  setWorld(world: World): void {
    this.world = world;
  }

  /**
   * Get local player state for validation
   */
  private getLocalPlayer(): PlayerValidationState | undefined {
    // In single player or local context, we use world's getMoney
    return {
      id: 'local',
      isAlive: !this.world.getBaseBuilding()?.isDead?.(),
      money: this.world.getMoney() ?? 0,
    };
  }

  /**
   * Pre-validate BUILD_TOWER
   * Quick check without full territory calculation
   */
  validateBuildTower(
    towerType: string,
    x: number,
    y: number
  ): ValidationResult {
    const player = this.getLocalPlayer();
    const meta = getTowerMeta(towerType);
    const bounds = {
      width: this.world.width,
      height: this.world.height,
    };

    // Basic validation
    const basicResult = validateBuildTowerBasic(player, towerType, x, y, meta, bounds);
    if (!basicResult.valid) return basicResult;

    // Simple territory check (in own territory)
    const territory = this.world.territory;
    if (territory && !territory.isPositionInValidTerritory({ x, y } as any)) {
      // Check if in enemy territory (for PVP, need different check)
      // For now, just fail if not in own territory
      return validationFailure(ValidationErrorCode.POSITION_NOT_IN_TERRITORY);
    }

    // Collision check with existing towers and buildings
    const towers = this.world.batterys || [];
    const buildings = this.world.buildings || [];

    const towerColliders = towers.map((t: any) => ({
      position: { x: t.pos?.x ?? t.x, y: t.pos?.y ?? t.y },
      radius: t.r,
      id: t.id,
    }));
    const buildingColliders = (buildings as any[]).map((b: any) => ({
      position: { x: b.pos?.x ?? b.x, y: b.pos?.y ?? b.y },
      radius: b.r,
      id: b.id,
    }));

    const collisionResult = checkBuildCollision(x, y, 15, towerColliders, buildingColliders);
    if (collisionResult.collides) {
      return validationFailure(ValidationErrorCode.POSITION_COLLISION);
    }

    // Money check
    const price = meta!.price;
    if (player!.money < price) {
      return validationFailure(
        ValidationErrorCode.INSUFFICIENT_MONEY,
        `Need ${price}, have ${player!.money}`
      );
    }

    return validationSuccess({ cost: price, towerType });
  }

  /**
   * Pre-validate SPAWN_MONSTER
   */
  validateSpawnMonster(
    monsterType: string,
    currentWave: number
  ): ValidationResult {
    const player = this.getLocalPlayer();

    if (!player || !player.isAlive) {
      return validationFailure(ValidationErrorCode.PLAYER_NOT_ALIVE);
    }

    // Find monster config
    const config = SPAWNABLE_MONSTERS.find(m => m.monsterId === monsterType);
    if (!config) {
      return validationFailure(
        ValidationErrorCode.MONSTER_TYPE_INVALID,
        `Unknown monster type: ${monsterType}`
      );
    }

    // Wave unlock check
    if (currentWave < config.unlockWave) {
      return validationFailure(
        ValidationErrorCode.MONSTER_NOT_UNLOCKED,
        `Unlocks at wave ${config.unlockWave}`
      );
    }

    // Money check
    if (player.money < config.cost) {
      return validationFailure(
        ValidationErrorCode.INSUFFICIENT_MONEY,
        `Need ${config.cost}, have ${player.money}`
      );
    }

    return validationSuccess({ cost: config.cost });
  }

  /**
   * Pre-validate CANNON_FIRE
   */
  validateCannonFire(
    towerId: string,
    targetX: number,
    targetY: number
  ): ValidationResult {
    const player = this.getLocalPlayer();

    // Find tower in world
    const towers = this.world.batterys || [];
    const tower = towers.find((t: any) => t.id === towerId) as any;

    if (!tower) {
      return validationFailure(ValidationErrorCode.CANNON_NOT_FOUND);
    }

    const towerValidation: TowerValidationState = {
      id: towerId,
      ownerId: 'local',
      towerType: tower.constructor.name,
      position: { x: tower.pos?.x ?? tower.x, y: tower.pos?.y ?? tower.y },
      radius: tower.r,
      attackRadius: tower.rangeR || 200,
      isManual: tower.isManual || false,
      currentAmmo: tower.currentAmmo ?? 1,
    };

    return validateCannonFire(player, towerValidation, targetX, targetY);
  }
}
