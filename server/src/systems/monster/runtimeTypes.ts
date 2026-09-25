/**
 * Server-side monster runtime config types.
 *
 * This layer derives runtime-ready values from shared raw monster definitions.
 * It keeps the data model explicit so GameRoom / combat / AI systems can import
 * the same config contract without depending on client-side monster classes.
 */

import type {
  AnyMonsterDefinition,
  MonsterBaseClass,
  MovementType,
  TargetStrategyType,
} from '../../../../shared/config/monsterDefinitionTypes.js';

/**
 * Shared weighted scoring config used by dynamic target selection.
 */
export interface MonsterTargetWeights {
  distance: number;
  hp: number;
  threat: number;
}

/**
 * Base class defaults after applying single-player semantics.
 */
export interface MonsterBaseClassDefaults {
  baseClass: MonsterBaseClass;
  rawSpeed: number;
  rawAcceleration: number;
  rawMaxSpeed: number;
  baseHp: number;
  radius: number;
  colishDamage: number;
  reward: number;
  movementType: MovementType;
  teleportingAble: boolean;
  throwAble: boolean;
}

/**
 * Runtime-ready core monster stats.
 */
export interface MonsterCoreStats {
  rawSpeed: number;
  speed: number;
  rawAcceleration: number;
  acceleration: number;
  rawMaxSpeed: number;
  maxSpeed: number;
  baseHp: number;
  radius: number;
  colishDamage: number;
  reward: number;
}

/**
 * Generic boolean-gated runtime ability config.
 */
export interface MonsterAbilityGate {
  enabled: boolean;
}

export interface MonsterBombSelfConfig extends MonsterAbilityGate {
  range: number;
  damage: number;
  triggerOnDeath: boolean;
  triggerOnCollision: boolean;
}

export interface MonsterSummonConfig extends MonsterAbilityGate {
  summonOnDeath: boolean;
  summonWhileAlive: boolean;
  intervalTicks: number;
  count: number;
  distance: number;
  summonMonsterType: string;
}

export interface MonsterGainConfig extends MonsterAbilityGate {
  radius: number;
  intervalTicks: number;
  radiusDelta: number;
  collideDamageDelta: number;
  hpAdd: number;
  rawSpeedAdd: number;
  speedAdd: number;
  hpRateAdd: number;
  maxHpAdd: number;
}

export interface MonsterGravityAreaConfig extends MonsterAbilityGate {
  radius: number;
  strength: number;
}

export interface MonsterBulletChangeConfig extends MonsterAbilityGate {
  radius: number;
  intervalTicks: number;
  bulletDR: number;
  bulletAN: number;
  bulletDD: number;
}

export interface MonsterLaserDefenseConfig extends MonsterAbilityGate {
  consumeIntervalTicks: number;
  defendPreCost: number;
  maxCharge: number;
  initialCharge: number;
  recoverIntervalTicks: number;
  recoverAmount: number;
  radius: number;
}

export interface MonsterDodgeConfig extends MonsterAbilityGate {
  detectRadius: number;
  dodgeStrength: number;
  reactionTicks: number;
}

export interface MonsterTargetSelectionConfig extends MonsterAbilityGate {
  strategy: TargetStrategyType;
  scanRadius: number;
  updateIntervalTicks: number;
  weights: MonsterTargetWeights;
}

export interface MonsterShooterRuntimeConfig extends MonsterAbilityGate {
  range: number;
  attackIntervalTicks: number;
  bulletType: string;
}

export interface MonsterMortisRuntimeConfig extends MonsterAbilityGate {
  viewRadius: number;
  bumpDamage: number;
  bumpDistance: number;
  rawBumpSpeed: number;
  bumpSpeed: number;
}

/**
 * Terminator damage mapping mode.
 */
export type TerminatorDamageRuleMode = 'ignore' | 'flat' | 'ratio';

/**
 * Runtime damage remap rule derived from MonsterTerminator.hpChange().
 */
export interface MonsterTerminatorDamageRule {
  maxIncomingDamageExclusive: number;
  mode: TerminatorDamageRuleMode;
  appliedDamage?: number;
  multiplier?: number;
}

export interface MonsterTerminatorRuntimeConfig extends MonsterAbilityGate {
  meleeStopsMovement: boolean;
  damageRules: readonly MonsterTerminatorDamageRule[];
}

/**
 * Full ability bundle for a monster runtime entry.
 */
export interface MonsterAbilityConfig {
  bombSelf: MonsterBombSelfConfig;
  summon: MonsterSummonConfig;
  gain: MonsterGainConfig;
  gravityArea: MonsterGravityAreaConfig;
  bulletChange: MonsterBulletChangeConfig;
  laserDefense: MonsterLaserDefenseConfig;
  dodge: MonsterDodgeConfig;
  targetSelection: MonsterTargetSelectionConfig;
  shooter: MonsterShooterRuntimeConfig;
  mortis: MonsterMortisRuntimeConfig;
  terminator: MonsterTerminatorRuntimeConfig;
}

/**
 * Runtime-ready monster configuration consumed by the server.
 */
export interface MonsterRuntimeConfig {
  monsterId: string;
  name: string;
  comment: string;
  imgIndex: number;
  baseClass: MonsterBaseClass;
  definition: AnyMonsterDefinition;
  defaults: MonsterBaseClassDefaults;
  movementType: MovementType;
  teleportingAble: boolean;
  teleportingRange: number;
  teleportingCount: number;
  throwAble: boolean;
  stats: MonsterCoreStats;
  abilities: MonsterAbilityConfig;
}
