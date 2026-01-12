/**
 * Tower configuration factory
 *
 * Creates tower instances and registers them from config definitions
 */

import { Tower } from '../base/tower';
import { TowerLaser } from '../base/towerLaser';
import { TowerHammer } from '../base/towerHammer';
import { TowerBoomerang } from '../base/towerBoomerang';
import { TowerHell } from '../base/towerHell';
import { TowerRay } from '../base/towerRay';
import { TowerRegistry, type TowerMeta } from '../towerRegistry';
import { MyColor } from '@/entities/myColor';
import { scaleSpeed, scalePeriod } from '@/core/speedScale';
import type {
    AnyTowerConfig,
    TowerConfig,
    LaserTowerConfig,
    HammerTowerConfig,
    BoomerangTowerConfig,
    HellTowerConfig,
    RayTowerConfig,
    DynamicPriceTowerConfig,
    AttackType
} from './types';

// Bullet creators reference (resolved from global scope)
declare const BullyFinally: Record<string, (() => unknown) | null> | undefined;

// Price calculator reference (resolved from global scope)
declare const Functions: {
    TowerNumPriceAdded(num: number): number;
} | undefined;

interface WorldLike {
    batterys: unknown[];
    cheatMode?: {
        enabled: boolean;
        priceMultiplier: number;
    };
}

/**
 * Map base class string to actual class
 */
const BASE_CLASS_MAP = {
    'Tower': Tower,
    'TowerLaser': TowerLaser,
    'TowerHammer': TowerHammer,
    'TowerBoomerang': TowerBoomerang,
    'TowerHell': TowerHell,
    'TowerRay': TowerRay
} as const;

/**
 * Get attack function from tower instance
 */
function getAttackFunc(tower: Tower, attackType?: AttackType): (() => void) | undefined {
    if (!attackType) return undefined;

    switch (attackType) {
        case 'normalAttack':
            return tower.normalAttack.bind(tower);
        case 'shrapnelAttack':
            return tower.shrapnelAttack.bind(tower);
        case 'laserAttack':
            if (tower instanceof TowerLaser) {
                return tower.laserAttack.bind(tower);
            }
            break;
        case 'zapAttack':
            if (tower instanceof TowerLaser) {
                return tower.zapAttack.bind(tower);
            }
            break;
        case 'earthquakeAttack':
            if (tower instanceof TowerLaser) {
                return tower.earthquakeAttack.bind(tower);
            }
            break;
        case 'scanningAttack':
            if (tower instanceof TowerRay) {
                return tower.scanningAttack.bind(tower);
            }
            break;
        case 'shootingAttack':
            if (tower instanceof TowerRay) {
                return tower.shootingAttack.bind(tower);
            }
            break;
        case 'gerAttack':
            if (tower instanceof TowerRay) {
                return tower.gerAttack.bind(tower);
            }
            break;
    }
    return undefined;
}

/**
 * Apply base tower parameters
 */
function applyTowerParams(tower: Tower, config: AnyTowerConfig): void {
    const params = config.params;
    if (!params) return;

    // Basic properties
    if (params.rAdd !== undefined) tower.r += params.rAdd;
    if (params.rangeR !== undefined) tower.rangeR = params.rangeR;
    if (params.clock !== undefined) tower.clock = scalePeriod(params.clock);
    if (params.hp !== undefined) tower.hpInit(params.hp);

    // Bullet properties
    if (params.bulletType && typeof BullyFinally !== 'undefined') {
        const bulletCreator = BullyFinally[params.bulletType];
        if (bulletCreator) {
            tower.getmMainBullyFunc = bulletCreator as any;
        }
    }
    if (params.bullySpeed !== undefined) tower.bullySpeed = scaleSpeed(params.bullySpeed);
    if (params.bullySpeedAddMax !== undefined) tower.bullySpeedAddMax = scaleSpeed(params.bullySpeedAddMax);
    if (params.bullyDeviationRotate !== undefined) tower.bullyDeviationRotate = params.bullyDeviationRotate;
    if (params.bullyDeviation !== undefined) tower.bullyDeviation = params.bullyDeviation;
    if (params.bullyRotate !== undefined) tower.bullyRotate = params.bullyRotate;
    if (params.attackBullyNum !== undefined) tower.attackBullyNum = params.attackBullyNum;
    if (params.bullySlideRate !== undefined) tower.bullySlideRate = params.bullySlideRate;

    // Attack function
    const attackFunc = getAttackFunc(tower, params.attackType);
    if (attackFunc) {
        tower.attackFunc = attackFunc;
    }

    // Audio
    if (params.audioSrcString !== undefined) tower.audioSrcString = params.audioSrcString;
}

/**
 * Apply laser tower parameters
 */
function applyLaserParams(tower: TowerLaser, config: LaserTowerConfig): void {
    const params = config.params;
    if (!params) return;

    if (params.laserBaseDamage !== undefined) tower.laserBaseDamage = params.laserBaseDamage;
    if (params.laserFreezeMax !== undefined) tower.laserFreezeMax = scalePeriod(params.laserFreezeMax);
    if (params.laserMaxDamage !== undefined) tower.laserMaxDamage = params.laserMaxDamage;
    if (params.laserDamagePreAdd !== undefined) tower.laserDamagePreAdd = params.laserDamagePreAdd;
    if (params.laserColor) {
        tower.laserColor = new MyColor(...params.laserColor);
    }
    if (params.zapCount !== undefined) tower.zapCount = params.zapCount;
    if (params.damageMultipleRate !== undefined) tower.damageMultipleRate = params.damageMultipleRate;
    if (params.zapLen !== undefined) tower.zapLen = params.zapLen;
    if (params.zapInitColor) {
        tower.zapInitColor = new MyColor(...params.zapInitColor);
    }
}

/**
 * Apply hammer tower parameters
 */
function applyHammerParams(tower: TowerHammer, config: HammerTowerConfig): void {
    const params = config.params;
    if (!params) return;

    if (params.itemRange !== undefined) tower.itemRange = params.itemRange;
    if (params.itemRidus !== undefined) tower.itemRidus = params.itemRidus;
    if (params.itemDamage !== undefined) tower.itemDamage = params.itemDamage;
    if (params.itemSpeed !== undefined) tower.itemSpeed = scalePeriod(params.itemSpeed);
    if (params.hasAdditionItem) {
        tower.additionItem = tower.initAdditionItem();
    }
}

/**
 * Apply boomerang tower parameters
 */
function applyBoomerangParams(tower: TowerBoomerang, config: BoomerangTowerConfig): void {
    const params = config.params;
    if (!params) return;

    if (params.damage !== undefined) tower.damage = params.damage;
    if (params.barLen !== undefined) tower.barLen = params.barLen;
    if (params.barDis !== undefined) tower.barDis = params.barDis;
    if (params.barWidth !== undefined) tower.barWidth = params.barWidth;
    if (params.barRotateSelfSpeed !== undefined) tower.barRotateSelfSpeed = scaleSpeed(params.barRotateSelfSpeed);
}

/**
 * Apply hell tower parameters
 */
function applyHellParams(tower: TowerHell, config: HellTowerConfig): void {
    const params = config.params;
    if (!params) return;

    if (params.nowDamage !== undefined) tower.nowDamage = params.nowDamage;
    if (params.damageRate !== undefined) tower.damageRate = params.damageRate;
    if (params.laserFreezeMax !== undefined) tower.laserFreezeMax = scalePeriod(params.laserFreezeMax);
}

/**
 * Apply ray tower parameters
 */
function applyRayParams(tower: TowerRay, config: RayTowerConfig): void {
    const params = config.params;
    if (!params) return;

    if (params.rayLen !== undefined) tower.rayLen = params.rayLen;
    if (params.damage !== undefined) tower.damage = params.damage;
    // scanningSpeed 是视觉旋转角速度，不使用 scaleSpeed
    if (params.scanningSpeed !== undefined) tower.scanningSpeed = params.scanningSpeed;
    if (params.rayMoveSpeed !== undefined) tower.rayMoveSpeed = scaleSpeed(params.rayMoveSpeed);
    if (params.rayNum !== undefined) tower.rayNum = params.rayNum;
    if (params.rayDeviationRotate !== undefined) tower.rayDeviationRotate = params.rayDeviationRotate;
    if (params.rayDeviation !== undefined) tower.rayDeviation = params.rayDeviation;
    if (params.rayMaxRange !== undefined) tower.rayMaxRange = params.rayMaxRange;
    if (params.rayClock !== undefined) tower.rayClock = scalePeriod(params.rayClock);
    if (params.rayThrowAble !== undefined) tower.rayThrowAble = params.rayThrowAble;
    if (params.rayRepel !== undefined) tower.rayRepel = params.rayRepel;
    if (params.rayColor) {
        tower.rayColor = new MyColor(...params.rayColor);
    }
    if (params.rayWidth !== undefined) tower.rayWidth = params.rayWidth;
    if (params.attackType !== undefined) {
        switch (params.attackType) {
            case 'scanningAttack':
                tower.attackFunc = tower.scanningAttack;
                break;
            case 'shootingAttack':
                tower.attackFunc = tower.shootingAttack;
                break;
            case 'gerAttack':
                tower.attackFunc = tower.gerAttack;
                break;
            default:
                tower.attackFunc = tower.attack;
        }
    }
}

/**
 * Create a tower instance from configuration
 */
export function createTowerFromConfig(
    config: AnyTowerConfig | DynamicPriceTowerConfig,
    world: WorldLike
): Tower {
    const BaseClass = BASE_CLASS_MAP[config.baseClass];
    const tower = new BaseClass(0, 0, world as any);

    // Apply base properties
    tower.name = config.name;
    tower.levelUpArr = [...config.levelUpArr];
    tower.levelDownGetter = config.levelDownGetter;
    tower.imgIndex = config.imgIndex;
    tower.comment = config.comment;

    // Calculate price
    let price = config.price;
    if ('priceCalculator' in config && config.priceCalculator) {
        const priceAdded = config.priceCalculator(world);
        let finalAddition = priceAdded;
        if (world.cheatMode && world.cheatMode.enabled) {
            finalAddition = Math.floor(priceAdded * world.cheatMode.priceMultiplier);
        }
        price += finalAddition;
    }
    tower.price = price;

    // Apply base tower params
    applyTowerParams(tower, config);

    // Apply class-specific params
    switch (config.baseClass) {
        case 'TowerLaser':
            applyLaserParams(tower as TowerLaser, config as LaserTowerConfig);
            break;
        case 'TowerHammer':
            applyHammerParams(tower as TowerHammer, config as HammerTowerConfig);
            break;
        case 'TowerBoomerang':
            applyBoomerangParams(tower as TowerBoomerang, config as BoomerangTowerConfig);
            break;
        case 'TowerHell':
            applyHellParams(tower as TowerHell, config as HellTowerConfig);
            break;
        case 'TowerRay':
            applyRayParams(tower as TowerRay, config as RayTowerConfig);
            break;
    }

    return tower;
}

/**
 * Register a single tower from configuration
 */
export function registerTowerFromConfig(config: AnyTowerConfig | DynamicPriceTowerConfig): void {
    const creator = (world: WorldLike) => createTowerFromConfig(config, world);

    const meta: TowerMeta = {
        name: config.name,
        imgIndex: config.imgIndex,
        basePrice: config.price
    };

    TowerRegistry.register(config.id, creator as any, meta);
}

/**
 * Register multiple towers from configurations
 */
export function registerTowersFromConfig(configs: (AnyTowerConfig | DynamicPriceTowerConfig)[]): void {
    for (const config of configs) {
        registerTowerFromConfig(config);
    }
}

/**
 * Helper: Create standard price calculator for BasicCannon
 */
export function createBasicCannonPriceCalculator(): (world: { batterys: unknown[] }) => number {
    return (world) => {
        if (typeof Functions !== 'undefined') {
            return Functions.TowerNumPriceAdded(world.batterys.length);
        }
        return 0;
    };
}
