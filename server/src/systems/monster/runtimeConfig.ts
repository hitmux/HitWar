/**
 * Server-side monster runtime config derivation.
 *
 * This module turns shared raw monster definitions into runtime-ready config
 * objects that already include:
 * - single-player-equivalent defaults
 * - scaleSpeed / scalePeriod conversions
 * - base-class-specific ability defaults
 *
 * The goal is to let multiplayer systems consume one normalized config shape.
 */

import { scalePeriod, scaleSpeed } from '../../../../shared/constants/speedScale.js';
import {
  MONSTER_DEFINITION_LIST,
  MONSTER_DEFINITIONS,
  getMonsterDefinition,
} from '../../../../shared/config/monsterDefinitions.js';
import type {
  AnyMonsterDefinition,
  MonsterBaseClass,
  MovementType,
  TargetStrategyType,
} from '../../../../shared/config/monsterDefinitionTypes.js';
import type {
  MonsterAbilityConfig,
  MonsterBaseClassDefaults,
  MonsterBombSelfConfig,
  MonsterBulletChangeConfig,
  MonsterCoreStats,
  MonsterDodgeConfig,
  MonsterGainConfig,
  MonsterGravityAreaConfig,
  MonsterLaserDefenseConfig,
  MonsterMortisRuntimeConfig,
  MonsterRuntimeConfig,
  MonsterShooterRuntimeConfig,
  MonsterSummonConfig,
  MonsterTargetSelectionConfig,
  MonsterTargetWeights,
  MonsterTerminatorDamageRule,
  MonsterTerminatorRuntimeConfig,
} from './runtimeTypes.js';

export const DEFAULT_TARGET_WEIGHTS: MonsterTargetWeights = Object.freeze({
  distance: 0.4,
  hp: 0.3,
  threat: 0.3,
});

export const DEFAULT_TERMINATOR_DAMAGE_RULES: readonly MonsterTerminatorDamageRule[] =
  Object.freeze([
    { maxIncomingDamageExclusive: 10, mode: 'ignore' },
    { maxIncomingDamageExclusive: 100, mode: 'flat', appliedDamage: 1 },
    { maxIncomingDamageExclusive: 300, mode: 'flat', appliedDamage: 5 },
    { maxIncomingDamageExclusive: 500, mode: 'flat', appliedDamage: 100 },
    { maxIncomingDamageExclusive: 1500, mode: 'flat', appliedDamage: 300 },
    { maxIncomingDamageExclusive: 3000, mode: 'flat', appliedDamage: 500 },
    { maxIncomingDamageExclusive: Number.POSITIVE_INFINITY, mode: 'ratio', multiplier: 0.75 },
  ]);

export const MONSTER_BASE_CLASS_DEFAULTS: Record<
  MonsterBaseClass,
  MonsterBaseClassDefaults
> = Object.freeze({
  Monster: Object.freeze({
    baseClass: 'Monster',
    rawSpeed: 1,
    rawAcceleration: 0,
    rawMaxSpeed: 15,
    baseHp: 100,
    radius: 15,
    colishDamage: 100,
    reward: 5,
    movementType: 'normal',
    teleportingAble: false,
    throwAble: false,
  }),
  MonsterShooter: Object.freeze({
    baseClass: 'MonsterShooter',
    rawSpeed: 1,
    rawAcceleration: 0,
    rawMaxSpeed: 15,
    baseHp: 100,
    radius: 15,
    colishDamage: 100,
    reward: 5,
    movementType: 'normal',
    teleportingAble: false,
    throwAble: false,
  }),
  MonsterMortis: Object.freeze({
    baseClass: 'MonsterMortis',
    rawSpeed: 1,
    rawAcceleration: 0,
    rawMaxSpeed: 15,
    baseHp: 100,
    radius: 15,
    colishDamage: 100,
    reward: 5,
    movementType: 'normal',
    teleportingAble: false,
    throwAble: true,
  }),
  MonsterTerminator: Object.freeze({
    baseClass: 'MonsterTerminator',
    rawSpeed: 0.3,
    rawAcceleration: 0,
    rawMaxSpeed: 15,
    baseHp: 100,
    radius: 15,
    colishDamage: 100,
    reward: 5,
    movementType: 'normal',
    teleportingAble: false,
    throwAble: false,
  }),
});

function getBaseClassDefaults(baseClass: MonsterBaseClass): MonsterBaseClassDefaults {
  return MONSTER_BASE_CLASS_DEFAULTS[baseClass];
}

function deriveReward(definition: AnyMonsterDefinition): number {
  return definition.addPrice !== undefined ? 10 + definition.addPrice : 5;
}

function deriveStats(definition: AnyMonsterDefinition): MonsterCoreStats {
  const defaults = getBaseClassDefaults(definition.baseClass);
  const params = definition.params;

  const rawSpeed = params?.speedNumb ?? defaults.rawSpeed;
  const rawAcceleration = params?.accelerationV ?? defaults.rawAcceleration;
  const rawMaxSpeed = params?.maxSpeedN ?? defaults.rawMaxSpeed;

  return {
    rawSpeed,
    speed: scaleSpeed(rawSpeed),
    rawAcceleration,
    acceleration: scaleSpeed(rawAcceleration),
    rawMaxSpeed,
    maxSpeed: scaleSpeed(rawMaxSpeed),
    baseHp: params?.hp ?? defaults.baseHp,
    radius: params?.r ?? defaults.radius,
    colishDamage: params?.colishDamage ?? defaults.colishDamage,
    reward: deriveReward(definition),
  };
}

function deriveMovementType(definition: AnyMonsterDefinition): MovementType {
  return definition.params?.movementType ?? getBaseClassDefaults(definition.baseClass).movementType;
}

function deriveThrowAble(definition: AnyMonsterDefinition): boolean {
  return definition.params?.throwAble ?? getBaseClassDefaults(definition.baseClass).throwAble;
}

function deriveTeleportingAble(definition: AnyMonsterDefinition): boolean {
  return (
    definition.params?.teleportingAble ??
    getBaseClassDefaults(definition.baseClass).teleportingAble
  );
}

function deriveTeleportingRange(definition: AnyMonsterDefinition): number {
  return definition.params?.teleportingRange ?? 100;
}

function deriveTeleportingCount(definition: AnyMonsterDefinition): number {
  return definition.params?.teleportingCount ?? 3;
}

function deriveBombSelf(definition: AnyMonsterDefinition): MonsterBombSelfConfig {
  const config = definition.baseClass === 'Monster' ? definition.params?.bombSelf : undefined;

  return {
    enabled: config?.bombSelfAble ?? false,
    range: config?.bombSelfRange ?? 100,
    damage: config?.bombSelfDamage ?? 500,
    triggerOnDeath: true,
    triggerOnCollision: true,
  };
}

function deriveSummon(definition: AnyMonsterDefinition): MonsterSummonConfig {
  const config = definition.baseClass === 'Monster' ? definition.params?.summon : undefined;
  const summonOnDeath = config?.deadSummonAble ?? false;
  const summonWhileAlive = config?.summonAble ?? false;

  return {
    enabled: summonOnDeath || summonWhileAlive,
    summonOnDeath,
    summonWhileAlive,
    intervalTicks: scalePeriod(100),
    count: config?.summonCount ?? 4,
    distance: config?.summonDistance ?? 30,
    summonMonsterType: config?.summonMonsterName ?? 'Normal',
  };
}

function deriveGain(definition: AnyMonsterDefinition): MonsterGainConfig {
  const config = definition.baseClass === 'Monster' ? definition.params?.gain : undefined;

  return {
    enabled: config?.haveGain ?? false,
    radius: config?.gainRadius ?? 250,
    intervalTicks: scalePeriod(config?.gainFrequency ?? 10),
    radiusDelta: config?.gainR ?? 0,
    collideDamageDelta: config?.gainCollideDamageAddNum ?? 0,
    hpAdd: config?.gainHpAddedNum ?? 0,
    rawSpeedAdd: config?.gainSpeedNAddNum ?? 0,
    speedAdd: scaleSpeed(config?.gainSpeedNAddNum ?? 0),
    hpRateAdd: config?.gainHpAddedRate ?? 0,
    maxHpAdd: config?.gainMaxHpAddedNum ?? 0,
  };
}

function deriveGravityArea(definition: AnyMonsterDefinition): MonsterGravityAreaConfig {
  const config = definition.baseClass === 'Monster' ? definition.params?.gravityArea : undefined;

  return {
    enabled: config?.haveGArea ?? false,
    radius: config?.gAreaR ?? 0,
    strength: config?.gAreaNum ?? 0,
  };
}

function deriveBulletChange(definition: AnyMonsterDefinition): MonsterBulletChangeConfig {
  const config = definition.baseClass === 'Monster' ? definition.params?.bulletChange : undefined;

  return {
    enabled: config?.haveBulletChangeArea ?? false,
    radius: config?.r ?? 100,
    intervalTicks: scalePeriod(config?.f ?? 5),
    bulletDR: config?.bulletDR ?? 0,
    bulletAN: config?.bulletAN ?? 0,
    bulletDD: config?.bulletDD ?? 0,
  };
}

function deriveLaserDefense(definition: AnyMonsterDefinition): MonsterLaserDefenseConfig {
  const config = definition.baseClass === 'Monster' ? definition.params?.laserDefense : undefined;

  return {
    enabled: config?.haveLaserDefence ?? false,
    consumeIntervalTicks: scalePeriod(config?.laserFreeze ?? 1),
    defendPreCost: config?.laserdefendPreNum ?? 10,
    maxCharge: config?.maxLaserNum ?? 1000,
    initialCharge: config?.laserDefendNum ?? 1000,
    recoverIntervalTicks: scalePeriod(config?.laserRecoverFreeze ?? 10),
    recoverAmount: config?.laserRecoverNum ?? 10,
    radius: config?.laserRadius ?? 100,
  };
}

function deriveDodge(definition: AnyMonsterDefinition): MonsterDodgeConfig {
  const config = definition.params?.dodge;

  return {
    enabled: config?.dodgeAble ?? false,
    detectRadius: config?.detectRadius ?? 120,
    dodgeStrength: config?.dodgeStrength ?? 8,
    reactionTicks: scalePeriod(config?.reactionTime ?? 3),
  };
}

function deriveTargetSelection(definition: AnyMonsterDefinition): MonsterTargetSelectionConfig {
  const config = definition.params?.targetSelection;

  return {
    enabled: config?.targetSelectionAble ?? false,
    strategy: (config?.strategy ?? 'balanced') as TargetStrategyType,
    scanRadius: config?.scanRadius ?? 300,
    updateIntervalTicks: scalePeriod(config?.updateInterval ?? 30),
    weights: DEFAULT_TARGET_WEIGHTS,
  };
}

function deriveShooter(definition: AnyMonsterDefinition): MonsterShooterRuntimeConfig {
  const isShooter = definition.baseClass === 'MonsterShooter';
  const params = isShooter ? definition.params : undefined;

  return {
    enabled: isShooter,
    range: params?.rangeR ?? 100,
    attackIntervalTicks: scalePeriod(params?.clock ?? 30),
    bulletType: params?.bulletType ?? 'S',
  };
}

function deriveMortis(definition: AnyMonsterDefinition): MonsterMortisRuntimeConfig {
  const isMortis = definition.baseClass === 'MonsterMortis';
  const params = isMortis ? definition.params : undefined;
  const rawBumpSpeed = 12;

  return {
    enabled: isMortis,
    viewRadius: params?.viewRadius ?? 100,
    bumpDamage: params?.bumpDamage ?? 5,
    bumpDistance: params?.bumpDis ?? 50,
    rawBumpSpeed,
    bumpSpeed: scaleSpeed(rawBumpSpeed),
  };
}

function deriveTerminator(definition: AnyMonsterDefinition): MonsterTerminatorRuntimeConfig {
  return {
    enabled: definition.baseClass === 'MonsterTerminator',
    meleeStopsMovement: true,
    damageRules: DEFAULT_TERMINATOR_DAMAGE_RULES,
  };
}

function deriveAbilities(definition: AnyMonsterDefinition): MonsterAbilityConfig {
  return {
    bombSelf: deriveBombSelf(definition),
    summon: deriveSummon(definition),
    gain: deriveGain(definition),
    gravityArea: deriveGravityArea(definition),
    bulletChange: deriveBulletChange(definition),
    laserDefense: deriveLaserDefense(definition),
    dodge: deriveDodge(definition),
    targetSelection: deriveTargetSelection(definition),
    shooter: deriveShooter(definition),
    mortis: deriveMortis(definition),
    terminator: deriveTerminator(definition),
  };
}

export function deriveMonsterRuntimeConfig(
  definition: AnyMonsterDefinition
): MonsterRuntimeConfig {
  return {
    monsterId: definition.id,
    name: definition.name,
    comment: definition.comment,
    imgIndex: definition.imgIndex,
    baseClass: definition.baseClass,
    definition,
    defaults: getBaseClassDefaults(definition.baseClass),
    movementType: deriveMovementType(definition),
    teleportingAble: deriveTeleportingAble(definition),
    teleportingRange: deriveTeleportingRange(definition),
    teleportingCount: deriveTeleportingCount(definition),
    throwAble: deriveThrowAble(definition),
    stats: deriveStats(definition),
    abilities: deriveAbilities(definition),
  };
}

export const MONSTER_RUNTIME_CONFIGS: Record<string, MonsterRuntimeConfig> = Object.freeze(
  Object.fromEntries(
    MONSTER_DEFINITION_LIST.map((definition) => [
      definition.id,
      deriveMonsterRuntimeConfig(definition),
    ])
  ) as Record<string, MonsterRuntimeConfig>
);

export const MONSTER_RUNTIME_CONFIG_LIST = Object.freeze(
  Object.values(MONSTER_RUNTIME_CONFIGS)
) as readonly MonsterRuntimeConfig[];

export function getMonsterRuntimeConfig(monsterType: string): MonsterRuntimeConfig | undefined {
  return MONSTER_RUNTIME_CONFIGS[monsterType];
}

export function hasMonsterRuntimeConfig(monsterType: string): boolean {
  return monsterType in MONSTER_RUNTIME_CONFIGS;
}

export function getRequiredMonsterRuntimeConfig(monsterType: string): MonsterRuntimeConfig {
  const config = getMonsterRuntimeConfig(monsterType);
  if (!config) {
    throw new Error(`[monsterRuntimeConfig] Missing runtime config for monster: ${monsterType}`);
  }
  return config;
}

export function getRequiredMonsterDefinition(monsterType: string): AnyMonsterDefinition {
  const definition = getMonsterDefinition(monsterType);
  if (!definition) {
    throw new Error(`[monsterRuntimeConfig] Missing shared monster definition: ${monsterType}`);
  }
  return definition;
}

export function deriveMonsterRuntimeConfigById(monsterType: string): MonsterRuntimeConfig {
  return deriveMonsterRuntimeConfig(getRequiredMonsterDefinition(monsterType));
}

export { MONSTER_DEFINITIONS };
