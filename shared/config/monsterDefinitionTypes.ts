/**
 * Shared raw monster definition types.
 *
 * These types mirror the single-player monster config structure so both
 * client and server can consume the same unscaled source definitions.
 */

/**
 * Movement behavior type names.
 */
export type MovementType =
  | 'normal'
  | 'exciting'
  | 'doubleSwing'
  | 'swing'
  | 'suddenly';

/**
 * Monster base class type.
 */
export type MonsterBaseClass =
  | 'Monster'
  | 'MonsterShooter'
  | 'MonsterMortis'
  | 'MonsterTerminator';

/**
 * RGBA color tuple.
 */
export type ColorTuple = [number, number, number, number];

/**
 * Base definition shared by all monsters.
 */
export interface MonsterBaseDefinition {
  /** Unique identifier for registry lookup. */
  id: string;
  /** Monster base class. */
  baseClass: MonsterBaseClass;
  /** Display name. */
  name: string;
  /** Sprite image index. */
  imgIndex: number;
  /** Additional reward value on kill. */
  addPrice?: number;
  /** Monster description. */
  comment: string;
}

/**
 * Shared parameters for standard monsters.
 */
export interface MonsterParams {
  /** Raw movement speed. */
  speedNumb?: number;
  /** Body radius. */
  r?: number;
  /** Collision damage. */
  colishDamage?: number;
  /** Initial HP. */
  hp?: number;
  /** Body fill color. */
  bodyColor?: ColorTuple;
  /** Body stroke color. */
  bodyStrokeColor?: ColorTuple;
  /** Body stroke width. */
  bodyStrokeWidth?: number;
  /** Raw acceleration value. */
  accelerationV?: number;
  /** Raw max speed value. */
  maxSpeedN?: number;
  /** Special movement behavior. */
  movementType?: MovementType;
  /** Whether teleport-on-hit is enabled. */
  teleportingAble?: boolean;
  /** Teleport distance per trigger. */
  teleportingRange?: number;
  /** Max teleport triggers before depletion. */
  teleportingCount?: number;
  /** Whether the monster can roll over buildings. */
  throwAble?: boolean;
}

/**
 * Bomb-on-death parameters.
 */
export interface BombSelfParams {
  bombSelfAble: boolean;
  bombSelfRange: number;
  bombSelfDamage: number;
}

/**
 * Bullet-changing area parameters.
 */
export interface BulletChangeParams {
  haveBulletChangeArea: boolean;
  r: number;
  f: number;
  bulletDR?: number;
  bulletAN?: number;
  bulletDD?: number;
}

/**
 * Gravity area parameters.
 */
export interface GravityAreaParams {
  haveGArea: boolean;
  gAreaR: number;
  gAreaNum: number;
}

/**
 * Laser defense parameters.
 */
export interface LaserDefenseParams {
  haveLaserDefence: boolean;
  laserFreeze: number;
  laserdefendPreNum: number;
  maxLaserNum: number;
  laserDefendNum: number;
  laserRecoverFreeze: number;
  laserRecoverNum: number;
  laserRadius: number;
}

/**
 * Ally gain/buff parameters.
 */
export interface GainParams {
  haveGain: boolean;
  gainRadius: number;
  gainFrequency: number;
  gainR?: number;
  gainCollideDamageAddNum?: number;
  gainHpAddedNum?: number;
  gainSpeedNAddNum?: number;
  gainHpAddedRate?: number;
  gainMaxHpAddedNum?: number;
}

/**
 * Summoning parameters.
 */
export interface SummonParams {
  deadSummonAble?: boolean;
  summonAble?: boolean;
  summonCount?: number;
  summonDistance?: number;
  summonMonsterName: string;
}

/**
 * Bullet dodge AI parameters.
 */
export interface DodgeParams {
  dodgeAble: boolean;
  detectRadius?: number;
  dodgeStrength?: number;
  reactionTime?: number;
}

/**
 * Target selection strategy type.
 */
export type TargetStrategyType = 'nearest' | 'weakest' | 'threat' | 'balanced';

/**
 * Dynamic target selection parameters.
 */
export interface TargetSelectionParams {
  targetSelectionAble: boolean;
  strategy?: TargetStrategyType;
  scanRadius?: number;
  updateInterval?: number;
}

/**
 * MonsterShooter-specific parameters.
 */
export interface ShooterParams {
  rangeR?: number;
  clock?: number;
  bulletType?: string;
}

/**
 * MonsterMortis-specific parameters.
 */
export interface MortisParams {
  viewRadius?: number;
  bumpDamage?: number;
  bumpDis?: number;
}

/**
 * MonsterTerminator-specific parameters.
 */
export interface TerminatorParams {
  // Reserved for future raw Terminator overrides.
}

/**
 * Raw definition for the standard Monster base class.
 */
export interface MonsterDefinition extends MonsterBaseDefinition {
  baseClass: 'Monster';
  params?: MonsterParams & {
    bombSelf?: BombSelfParams;
    bulletChange?: BulletChangeParams;
    gravityArea?: GravityAreaParams;
    laserDefense?: LaserDefenseParams;
    gain?: GainParams;
    summon?: SummonParams;
    dodge?: DodgeParams;
    targetSelection?: TargetSelectionParams;
  };
}

/**
 * Raw definition for the MonsterShooter base class.
 */
export interface ShooterMonsterDefinition extends MonsterBaseDefinition {
  baseClass: 'MonsterShooter';
  params?: MonsterParams & ShooterParams & {
    dodge?: DodgeParams;
    targetSelection?: TargetSelectionParams;
  };
}

/**
 * Raw definition for the MonsterMortis base class.
 */
export interface MortisMonsterDefinition extends MonsterBaseDefinition {
  baseClass: 'MonsterMortis';
  params?: MonsterParams & MortisParams & {
    dodge?: DodgeParams;
    targetSelection?: TargetSelectionParams;
  };
}

/**
 * Raw definition for the MonsterTerminator base class.
 */
export interface TerminatorMonsterDefinition extends MonsterBaseDefinition {
  baseClass: 'MonsterTerminator';
  params?: MonsterParams & TerminatorParams & {
    dodge?: DodgeParams;
    targetSelection?: TargetSelectionParams;
  };
}

/**
 * Union of all raw monster definitions.
 */
export type AnyMonsterDefinition =
  | MonsterDefinition
  | ShooterMonsterDefinition
  | MortisMonsterDefinition
  | TerminatorMonsterDefinition;

/**
 * Definition map keyed by monster id.
 */
export type MonsterDefinitionMap = Record<string, AnyMonsterDefinition>;
