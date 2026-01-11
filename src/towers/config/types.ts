/**
 * Tower configuration types
 *
 * Data-driven tower definition system
 */

import type { Tower } from '../base/tower';
import type { TowerLaser } from '../base/towerLaser';
import type { TowerHammer } from '../base/towerHammer';
import type { TowerBoomerang } from '../base/towerBoomerang';
import type { TowerHell } from '../base/towerHell';
import type { TowerRay } from '../base/towerRay';

/**
 * Attack function type names
 */
export type AttackType =
    | 'normalAttack'
    | 'shrapnelAttack'
    | 'laserAttack'
    | 'zapAttack'
    | 'earthquakeAttack'
    | 'scanningAttack'
    | 'shootingAttack'
    | 'gerAttack';

/**
 * Tower base class type
 */
export type TowerBaseClass =
    | typeof Tower
    | typeof TowerLaser
    | typeof TowerHammer
    | typeof TowerBoomerang
    | typeof TowerHell
    | typeof TowerRay;

/**
 * Base configuration shared by all towers
 */
export interface TowerBaseConfig {
    /** Unique identifier for registry */
    id: string;
    /** Display name */
    name: string;
    /** Image sprite index */
    imgIndex: number;
    /** Base price (before dynamic additions) */
    price: number;
    /** Tower description */
    comment: string;
    /** Upgrade options (tower ids) */
    levelUpArr: string[];
    /** Downgrade option (tower id or null) */
    levelDownGetter: string | null;
}

/**
 * Standard Tower (base class) parameters
 */
export interface TowerParams {
    /** Radius addition (added to base 15) */
    rAdd?: number;
    /** Attack range radius */
    rangeR?: number;
    /** Attack cooldown */
    clock?: number;
    /** Initial HP */
    hp?: number;
    /** Bullet type name (from BulletRegistry) */
    bulletType?: string;
    /** Bullet speed */
    bullySpeed?: number;
    /** Max bullet speed addition */
    bullySpeedAddMax?: number;
    /** Bullet rotation deviation */
    bullyDeviationRotate?: number;
    /** Bullet position deviation */
    bullyDeviation?: number;
    /** Bullet rotation angle */
    bullyRotate?: number;
    /** Number of bullets per attack */
    attackBullyNum?: number;
    /** Bullet slide rate */
    bullySlideRate?: number;
    /** Attack function type */
    attackType?: AttackType;
    /** Audio source path */
    audioSrcString?: string;
}

/**
 * TowerLaser specific parameters
 */
export interface LaserParams {
    /** Base laser damage */
    laserBaseDamage?: number;
    /** Max cooldown value */
    laserFreezeMax?: number;
    /** Max additional damage */
    laserMaxDamage?: number;
    /** Damage increase per step */
    laserDamagePreAdd?: number;
    /** Laser color [r, g, b, a] */
    laserColor?: [number, number, number, number];
    /** Chain lightning count */
    zapCount?: number;
    /** Chain damage multiplier */
    damageMultipleRate?: number;
    /** Chain range */
    zapLen?: number;
    /** Chain initial color [r, g, b, a] */
    zapInitColor?: [number, number, number, number];
}

/**
 * TowerHammer specific parameters
 */
export interface HammerParams {
    /** Hammer rotation range */
    itemRange?: number;
    /** Hammer ball radius */
    itemRidus?: number;
    /** Hammer damage */
    itemDamage?: number;
    /** Hammer rotation speed (lower = faster) */
    itemSpeed?: number;
    /** Whether to create addition item */
    hasAdditionItem?: boolean;
}

/**
 * TowerBoomerang specific parameters
 */
export interface BoomerangParams {
    /** Boomerang damage */
    damage?: number;
    /** Boomerang bar length */
    barLen?: number;
    /** Boomerang rotation distance */
    barDis?: number;
    /** Boomerang bar width */
    barWidth?: number;
    /** Boomerang self rotation speed */
    barRotateSelfSpeed?: number;
}

/**
 * TowerHell specific parameters
 */
export interface HellParams {
    /** Initial damage */
    nowDamage?: number;
    /** Damage increase rate */
    damageRate?: number;
    /** Max cooldown value */
    laserFreezeMax?: number;
}

/**
 * TowerRay specific parameters
 */
export interface RayParams {
    /** Ray length */
    rayLen?: number;
    /** Ray damage per tick */
    damage?: number;
    /** Scanning speed (radians per frame) */
    scanningSpeed?: number;
    /** Ray movement speed */
    rayMoveSpeed?: number;
    /** Number of rays */
    rayNum?: number;
    /** Ray rotation deviation */
    rayDeviationRotate?: number;
    /** Ray position deviation */
    rayDeviation?: number;
    /** Maximum ray range */
    rayMaxRange?: number;
    /** Ray attack clock */
    rayClock?: number;
    /** Whether ray can be thrown */
    rayThrowAble?: boolean;
    /** Ray repel force */
    rayRepel?: number;
    /** Ray color [r, g, b, a] */
    rayColor?: [number, number, number, number];
    /** Ray width */
    rayWidth?: number;
    /** Attack type: 'attack' (default), 'scanningAttack', 'shootingAttack', or 'gerAttack' */
    attackType?: 'attack' | 'scanningAttack' | 'shootingAttack' | 'gerAttack';
}

/**
 * Tower configuration for standard Tower class
 */
export interface TowerConfig extends TowerBaseConfig {
    baseClass: 'Tower';
    params?: TowerParams;
}

/**
 * Tower configuration for TowerLaser class
 */
export interface LaserTowerConfig extends TowerBaseConfig {
    baseClass: 'TowerLaser';
    params?: TowerParams & LaserParams;
}

/**
 * Tower configuration for TowerHammer class
 */
export interface HammerTowerConfig extends TowerBaseConfig {
    baseClass: 'TowerHammer';
    params?: TowerParams & HammerParams;
}

/**
 * Tower configuration for TowerBoomerang class
 */
export interface BoomerangTowerConfig extends TowerBaseConfig {
    baseClass: 'TowerBoomerang';
    params?: TowerParams & BoomerangParams;
}

/**
 * Tower configuration for TowerHell class
 */
export interface HellTowerConfig extends TowerBaseConfig {
    baseClass: 'TowerHell';
    params?: TowerParams & HellParams;
}

/**
 * Tower configuration for TowerRay class
 */
export interface RayTowerConfig extends TowerBaseConfig {
    baseClass: 'TowerRay';
    params?: TowerParams & RayParams;
}

/**
 * Union type of all tower configurations
 */
export type AnyTowerConfig =
    | TowerConfig
    | LaserTowerConfig
    | HammerTowerConfig
    | BoomerangTowerConfig
    | HellTowerConfig
    | RayTowerConfig;

/**
 * Special price calculator for BasicCannon
 * Returns additional price based on tower count
 */
export type PriceCalculator = (world: { batterys: unknown[] }) => number;

/**
 * Extended tower config with dynamic pricing
 */
export interface DynamicPriceTowerConfig extends TowerBaseConfig {
    baseClass: 'Tower';
    params?: TowerParams;
    /** Dynamic price addition calculator */
    priceCalculator?: PriceCalculator;
}
