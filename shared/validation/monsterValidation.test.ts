import { describe, expect, it } from 'vitest';

import { ValidationErrorCode } from './types.js';
import {
  validateSpawnMonster,
  type SpawnableMonsterConfig,
  type SpawnerValidationState,
  type TargetPlayerState,
} from './monsterValidation.js';
import type { PlayerValidationState } from './towerValidation.js';

const player: PlayerValidationState = {
  id: 'player-1',
  isAlive: true,
  money: 100,
};

const spawner: SpawnerValidationState = {
  id: 'spawner-1',
  ownerId: 'player-1',
  isSpawner: true,
  position: { x: 50, y: 50 },
  getCooldownRemaining: () => 0,
};

const monsterConfig: SpawnableMonsterConfig = {
  monsterId: 'runner',
  cost: 30,
  cooldownTicks: 120,
  unlockWave: 3,
};

const targetPlayers = new Map<string, TargetPlayerState>([
  ['player-1', { id: 'player-1', isAlive: true }],
  ['player-2', { id: 'player-2', isAlive: true }],
  ['dead-target', { id: 'dead-target', isAlive: false }],
]);

const getTargetPlayer = (id: string) => targetPlayers.get(id);

describe('validateSpawnMonster', () => {
  it('rejects missing and dead players before spawner checks', () => {
    expect(
      validateSpawnMonster(undefined, spawner, 'runner', 'player-2', 3, monsterConfig, getTargetPlayer),
    ).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.PLAYER_NOT_FOUND,
    });

    expect(
      validateSpawnMonster({ ...player, isAlive: false }, spawner, 'runner', 'player-2', 3, monsterConfig, getTargetPlayer),
    ).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.PLAYER_NOT_ALIVE,
    });
  });

  it('rejects missing, invalid, and non-owned spawners', () => {
    expect(
      validateSpawnMonster(player, undefined, 'runner', 'player-2', 3, monsterConfig, getTargetPlayer),
    ).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.SPAWNER_NOT_FOUND,
    });

    expect(
      validateSpawnMonster(player, { ...spawner, isSpawner: false }, 'runner', 'player-2', 3, monsterConfig, getTargetPlayer),
    ).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.SPAWNER_INVALID,
    });

    expect(
      validateSpawnMonster(player, { ...spawner, ownerId: 'player-2' }, 'runner', 'player-2', 3, monsterConfig, getTargetPlayer),
    ).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.SPAWNER_NOT_OWNED,
    });
  });

  it('rejects unknown monsters before wave, cooldown, and money checks', () => {
    expect(
      validateSpawnMonster({ ...player, money: 0 }, { ...spawner, getCooldownRemaining: () => 99 }, 'unknown', 'player-2', 0, undefined, getTargetPlayer),
    ).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.MONSTER_TYPE_INVALID,
      errorMessage: 'Unknown monster type: unknown',
    });
  });

  it('rejects locked monsters until the unlock wave is reached', () => {
    expect(
      validateSpawnMonster(player, spawner, 'runner', 'player-2', 2, monsterConfig, getTargetPlayer),
    ).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.MONSTER_NOT_UNLOCKED,
      errorMessage: 'runner unlocks at wave 3, current wave: 2',
    });
  });

  it('rejects positive cooldown and allows zero cooldown to continue', () => {
    expect(
      validateSpawnMonster(player, { ...spawner, getCooldownRemaining: () => 1 }, 'runner', 'player-2', 3, monsterConfig, getTargetPlayer),
    ).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.SPAWN_ON_COOLDOWN,
      errorMessage: 'Cooldown remaining: 1 ticks',
    });

    expect(
      validateSpawnMonster(player, { ...spawner, getCooldownRemaining: () => 0 }, 'runner', 'player-2', 3, monsterConfig, getTargetPlayer),
    ).toMatchObject({
      valid: true,
    });
  });

  it('rejects insufficient money before target-player checks', () => {
    expect(
      validateSpawnMonster({ ...player, money: 29 }, spawner, 'runner', 'missing-target', 3, monsterConfig, getTargetPlayer),
    ).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.INSUFFICIENT_MONEY,
      errorMessage: 'Need 30, have 29',
    });
  });

  it('rejects self, missing, and dead target players', () => {
    expect(
      validateSpawnMonster(player, spawner, 'runner', 'player-1', 3, monsterConfig, getTargetPlayer),
    ).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.TARGET_PLAYER_INVALID,
      errorMessage: 'Cannot target yourself',
    });

    expect(
      validateSpawnMonster(player, spawner, 'runner', 'missing-target', 3, monsterConfig, getTargetPlayer),
    ).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.TARGET_PLAYER_INVALID,
      errorMessage: 'Target player not found',
    });

    expect(
      validateSpawnMonster(player, spawner, 'runner', 'dead-target', 3, monsterConfig, getTargetPlayer),
    ).toMatchObject({
      valid: false,
      errorCode: ValidationErrorCode.TARGET_PLAYER_INVALID,
      errorMessage: 'Target player is not alive',
    });
  });

  it('returns spawn cost, cooldown, and monster id on success', () => {
    expect(validateSpawnMonster(player, spawner, 'runner', 'player-2', 3, monsterConfig, getTargetPlayer)).toEqual({
      valid: true,
      data: {
        cost: 30,
        cooldownTicks: 120,
        monsterId: 'runner',
      },
    });
  });

  it('allows spawning when player money exactly matches cost', () => {
    expect(
      validateSpawnMonster({ ...player, money: 30 }, spawner, 'runner', 'player-2', 3, monsterConfig, getTargetPlayer),
    ).toEqual({
      valid: true,
      data: {
        cost: 30,
        cooldownTicks: 120,
        monsterId: 'runner',
      },
    });
  });

  it('allows spawning on the exact unlock wave', () => {
    expect(validateSpawnMonster(player, spawner, 'runner', 'player-2', 3, monsterConfig, getTargetPlayer)).toMatchObject({
      valid: true,
    });
  });

  it.each([
    [1, true],
    [60, true],
    [0, false],
    [-1, false],
  ])('only positive cooldown blocks spawning %#', (cooldown, shouldBlock) => {
    const result = validateSpawnMonster(
      player,
      { ...spawner, getCooldownRemaining: () => cooldown },
      'runner',
      'player-2',
      3,
      monsterConfig,
      getTargetPlayer,
    );

    expect(result.valid).toBe(!shouldBlock);
    expect(result.errorCode).toBe(shouldBlock ? ValidationErrorCode.SPAWN_ON_COOLDOWN : undefined);
  });

  it.each([
    [2, ValidationErrorCode.MONSTER_NOT_UNLOCKED],
    [3, undefined],
    [99, undefined],
  ])('checks unlock wave boundaries %#', (wave, expectedErrorCode) => {
    const result = validateSpawnMonster(player, spawner, 'runner', 'player-2', wave, monsterConfig, getTargetPlayer);

    expect(result.errorCode).toBe(expectedErrorCode);
  });

  it('does not call target lookup when money is insufficient', () => {
    let calls = 0;
    const result = validateSpawnMonster(
      { ...player, money: 29 },
      spawner,
      'runner',
      'player-2',
      3,
      monsterConfig,
      () => {
        calls += 1;
        return targetPlayers.get('player-2');
      },
    );

    expect(result.errorCode).toBe(ValidationErrorCode.INSUFFICIENT_MONEY);
    expect(calls).toBe(0);
  });
});
