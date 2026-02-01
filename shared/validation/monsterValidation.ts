/**
 * Monster/Spawner Validation Pure Functions
 * Shared between client and server for consistent validation
 */

import type { ValidationResult } from './types.js';
import {
  ValidationErrorCode,
  validationSuccess,
  validationFailure,
} from './types.js';
import type { PlayerValidationState, Position } from './towerValidation.js';

/**
 * Spawnable monster configuration
 */
export interface SpawnableMonsterConfig {
  monsterId: string;
  cost: number;
  cooldownTicks: number;
  unlockWave: number;
}

/**
 * Spawner state minimal interface for validation
 */
export interface SpawnerValidationState {
  id: string;
  ownerId: string;
  isSpawner: boolean;
  position: Position;
  /** Get remaining cooldown ticks for a monster type */
  getCooldownRemaining(monsterType: string): number;
}

/**
 * Target player minimal interface
 */
export interface TargetPlayerState {
  id: string;
  isAlive: boolean;
}

/**
 * Validate SPAWN_MONSTER action
 */
export function validateSpawnMonster(
  player: PlayerValidationState | undefined,
  spawner: SpawnerValidationState | undefined,
  monsterType: string,
  targetPlayerId: string,
  currentWave: number,
  monsterConfig: SpawnableMonsterConfig | undefined,
  getTargetPlayer: (id: string) => TargetPlayerState | undefined
): ValidationResult {
  // 1. Player must exist and be alive
  if (!player) {
    return validationFailure(ValidationErrorCode.PLAYER_NOT_FOUND);
  }
  if (!player.isAlive) {
    return validationFailure(ValidationErrorCode.PLAYER_NOT_ALIVE);
  }

  // 2. Spawner must exist
  if (!spawner) {
    return validationFailure(ValidationErrorCode.SPAWNER_NOT_FOUND);
  }

  // 3. Spawner must be a valid spawner
  if (!spawner.isSpawner) {
    return validationFailure(ValidationErrorCode.SPAWNER_INVALID);
  }

  // 4. Spawner must be owned by player
  if (spawner.ownerId !== player.id) {
    return validationFailure(ValidationErrorCode.SPAWNER_NOT_OWNED);
  }

  // 5. Monster type must be valid
  if (!monsterConfig) {
    return validationFailure(
      ValidationErrorCode.MONSTER_TYPE_INVALID,
      `Unknown monster type: ${monsterType}`
    );
  }

  // 6. Monster must be unlocked (wave requirement)
  if (currentWave < monsterConfig.unlockWave) {
    return validationFailure(
      ValidationErrorCode.MONSTER_NOT_UNLOCKED,
      `${monsterType} unlocks at wave ${monsterConfig.unlockWave}, current wave: ${currentWave}`
    );
  }

  // 7. Spawner must not be on cooldown for this monster type
  const remainingCooldown = spawner.getCooldownRemaining(monsterType);
  if (remainingCooldown > 0) {
    return validationFailure(
      ValidationErrorCode.SPAWN_ON_COOLDOWN,
      `Cooldown remaining: ${remainingCooldown} ticks`
    );
  }

  // 8. Player must have enough money
  if (player.money < monsterConfig.cost) {
    return validationFailure(
      ValidationErrorCode.INSUFFICIENT_MONEY,
      `Need ${monsterConfig.cost}, have ${player.money}`
    );
  }

  // 9. Target player must be valid and alive (and not self)
  if (targetPlayerId === player.id) {
    return validationFailure(
      ValidationErrorCode.TARGET_PLAYER_INVALID,
      'Cannot target yourself'
    );
  }

  const targetPlayer = getTargetPlayer(targetPlayerId);
  if (!targetPlayer) {
    return validationFailure(
      ValidationErrorCode.TARGET_PLAYER_INVALID,
      'Target player not found'
    );
  }
  if (!targetPlayer.isAlive) {
    return validationFailure(
      ValidationErrorCode.TARGET_PLAYER_INVALID,
      'Target player is not alive'
    );
  }

  return validationSuccess({
    cost: monsterConfig.cost,
    cooldownTicks: monsterConfig.cooldownTicks,
    monsterId: monsterConfig.monsterId,
  });
}
