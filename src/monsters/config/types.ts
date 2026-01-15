/**
 * Monster configuration types
 *
 * Data-driven monster definition system
 */

/**
 * Movement behavior type names
 * Maps to Monster methods: selfExcitingMove, selfDoubleSwingMove, selfSwingMove, selfSuddenlyMove
 */
export type MovementType =
    | 'normal'
    | 'exciting'      // selfExcitingMove
    | 'doubleSwing'   // selfDoubleSwingMove
    | 'swing'         // selfSwingMove
    | 'suddenly';     // selfSuddenlyMove

/**
 * Monster base class type
 */
export type MonsterBaseClass =
    | 'Monster'
    | 'MonsterShooter'
    | 'MonsterMortis'
    | 'MonsterTerminator';

/**
 * RGBA color tuple
 */
export type ColorTuple = [number, number, number, number];

/**
 * Base configuration shared by all monsters
 */
export interface MonsterBaseConfig {
    /** Unique identifier for registry */
    id: string;
    /** Display name */
    name: string;
    /** Image sprite index */
    imgIndex: number;
    /** Additional price on kill (added to base 10) */
    addPrice?: number;
    /** Monster description */
    comment: string;
}

/**
 * Standard Monster (base class) parameters
 */
export interface MonsterParams {
    /** Movement speed */
    speedNumb?: number;
    /** Body radius */
    r?: number;
    /** Collision damage */
    colishDamage?: number;
    /** Initial HP (if set, uses hpInit instead of default) */
    hp?: number;
    /** Body color [r, g, b, a] */
    bodyColor?: ColorTuple;
    /** Body stroke color [r, g, b, a] */
    bodyStrokeColor?: ColorTuple;
    /** Body stroke width */
    bodyStrokeWidth?: number;
    /** Acceleration value */
    accelerationV?: number;
    /** Max speed */
    maxSpeedN?: number;
    /** Movement behavior type */
    movementType?: MovementType;
    /** Can teleport when hit */
    teleportingAble?: boolean;
    /** Can roll over buildings */
    throwAble?: boolean;
}

/**
 * Bomb self parameters
 */
export interface BombSelfParams {
    /** Enable bomb on death */
    bombSelfAble: boolean;
    /** Bomb explosion range */
    bombSelfRange: number;
    /** Bomb explosion damage */
    bombSelfDamage: number;
}

/**
 * Bullet change area parameters (affects bullets in range)
 */
export interface BullyChangeParams {
    /** Enable bullet change area */
    haveBullyChangeArea: boolean;
    /** Area radius */
    r: number;
    /** Effect frequency */
    f: number;
    /** Bullet radius change per tick */
    bullyDR?: number;
    /** Bullet acceleration number */
    bullyAN?: number;
    /** Bullet damage decrease per tick */
    bullyDD?: number;
}

/**
 * Gravity area parameters
 */
export interface GravityAreaParams {
    /** Enable gravity area */
    haveGArea: boolean;
    /** Gravity area radius */
    gAreaR: number;
    /** Gravity strength (positive = pull, negative = push) */
    gAreaNum: number;
}

/**
 * Laser defense parameters
 */
export interface LaserDefenseParams {
    /** Enable laser defense */
    haveLaserDefence: boolean;
    /** Defense frequency */
    laserFreeze: number;
    /** Pre-defense number */
    laserdefendPreNum: number;
    /** Max laser energy */
    maxLaserNum: number;
    /** Current defense energy */
    laserDefendNum: number;
    /** Recovery cooldown */
    laserRecoverFreeze: number;
    /** Recovery amount per tick */
    laserRecoverNum: number;
    /** Defense radius */
    laserRadius: number;
}

/**
 * Gain/buff other monsters parameters
 */
export interface GainParams {
    /** Enable gain ability */
    haveGain: boolean;
    /** Gain effect radius */
    gainRadius: number;
    /** Gain effect frequency */
    gainFrequency: number;
    /** Radius increase per tick */
    gainR?: number;
    /** Collision damage increase per tick */
    gainCollideDamageAddNum?: number;
    /** HP heal per tick */
    gainHpAddedNum?: number;
    /** Speed increase per tick */
    gainSpeedNAddNum?: number;
    /** HP heal rate (percentage of max HP) */
    gainHpAddedRate?: number;
    /** Max HP increase per tick */
    gainMaxHpAddedNum?: number;
}

/**
 * Summon other monsters parameters
 */
export interface SummonParams {
    /** Enable summon on death */
    deadSummonAble?: boolean;
    /** Enable continuous summon */
    summonAble?: boolean;
    /** Number of monsters to summon */
    summonCount?: number;
    /** Summon distance from self */
    summonDistance?: number;
    /** Monster type to summon (registry id) */
    summonMonsterName: string;
}

/**
 * Bullet dodge AI parameters
 */
export interface DodgeParams {
    /** Enable bullet dodging */
    dodgeAble: boolean;
    /** Detection radius for bullets */
    detectRadius?: number;
    /** Dodge strength (movement force) */
    dodgeStrength?: number;
    /** Reaction time interval (frames) */
    reactionTime?: number;
}

/**
 * Target selection strategy type
 */
export type TargetStrategyType = 'nearest' | 'weakest' | 'threat' | 'balanced';

/**
 * Dynamic target selection AI parameters
 */
export interface TargetSelectionParams {
    /** Enable dynamic target selection */
    targetSelectionAble: boolean;
    /** Selection strategy */
    strategy?: TargetStrategyType;
    /** Scan radius for buildings */
    scanRadius?: number;
    /** Update interval (frames) */
    updateInterval?: number;
}

/**
 * MonsterShooter specific parameters
 */
export interface ShooterParams {
    /** Attack range radius */
    rangeR?: number;
    /** Attack cooldown */
    clock?: number;
    /** Bullet type name (from BulletRegistry) */
    bulletType?: string;
}

/**
 * MonsterMortis specific parameters
 */
export interface MortisParams {
    /** View radius for target detection */
    viewRadius?: number;
    /** Bump damage */
    bumpDamage?: number;
    /** Bump distance */
    bumpDis?: number;
}

/**
 * MonsterTerminator specific parameters
 */
export interface TerminatorParams {
    // Currently uses default values, extend if needed
}

/**
 * Monster configuration for standard Monster class
 */
export interface MonsterConfig extends MonsterBaseConfig {
    baseClass: 'Monster';
    params?: MonsterParams & {
        bombSelf?: BombSelfParams;
        bullyChange?: BullyChangeParams;
        gravityArea?: GravityAreaParams;
        laserDefense?: LaserDefenseParams;
        gain?: GainParams;
        summon?: SummonParams;
        /** Bullet dodge AI */
        dodge?: DodgeParams;
        /** Dynamic target selection AI */
        targetSelection?: TargetSelectionParams;
    };
}

/**
 * Monster configuration for MonsterShooter class
 */
export interface ShooterMonsterConfig extends MonsterBaseConfig {
    baseClass: 'MonsterShooter';
    params?: MonsterParams & ShooterParams & {
        /** Bullet dodge AI */
        dodge?: DodgeParams;
        /** Dynamic target selection AI */
        targetSelection?: TargetSelectionParams;
    };
}

/**
 * Monster configuration for MonsterMortis class
 */
export interface MortisMonsterConfig extends MonsterBaseConfig {
    baseClass: 'MonsterMortis';
    params?: MonsterParams & MortisParams & {
        /** Bullet dodge AI */
        dodge?: DodgeParams;
        /** Dynamic target selection AI */
        targetSelection?: TargetSelectionParams;
    };
}

/**
 * Monster configuration for MonsterTerminator class
 */
export interface TerminatorMonsterConfig extends MonsterBaseConfig {
    baseClass: 'MonsterTerminator';
    params?: MonsterParams & TerminatorParams & {
        /** Bullet dodge AI */
        dodge?: DodgeParams;
        /** Dynamic target selection AI */
        targetSelection?: TargetSelectionParams;
    };
}

/**
 * Union type of all monster configurations
 */
export type AnyMonsterConfig =
    | MonsterConfig
    | ShooterMonsterConfig
    | MortisMonsterConfig
    | TerminatorMonsterConfig;
