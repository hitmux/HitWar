/**
 * Monster configuration factory
 *
 * Creates monsters from configuration objects and handles registration
 */

import { Monster } from '../base/monster';
import { MonsterShooter } from '../base/monsterShooter';
import { MonsterMortis } from '../base/monsterMortis';
import { MonsterTerminator } from '../base/monsterTerminator';
import { MonsterRegistry } from '../monsterRegistry';
import { MyColor } from '../../entities/myColor';
import type {
    AnyMonsterConfig,
    MonsterConfig,
    ShooterMonsterConfig,
    MortisMonsterConfig,
    TerminatorMonsterConfig,
    MovementType
} from './types';
import { scaleSpeed, scalePeriod } from '../../core/speedScale';

// Declare globals for bullet types
declare const BullyFinally: Record<string, (() => unknown) | null> | undefined;

interface WorldLike {
    [key: string]: unknown;
}

/**
 * Get monster base class from config
 */
function getMonsterClass(baseClass: string): typeof Monster {
    switch (baseClass) {
        case 'Monster':
            return Monster;
        case 'MonsterShooter':
            return MonsterShooter as unknown as typeof Monster;
        case 'MonsterMortis':
            return MonsterMortis as unknown as typeof Monster;
        case 'MonsterTerminator':
            return MonsterTerminator as unknown as typeof Monster;
        default:
            return Monster;
    }
}

/**
 * Get movement function from type
 */
function getMovementFunc(monster: Monster, movementType: MovementType): (() => void) | null {
    switch (movementType) {
        case 'exciting':
            return monster.selfExcitingMove.bind(monster);
        case 'doubleSwing':
            return monster.selfDoubleSwingMove.bind(monster);
        case 'swing':
            return monster.selfSwingMove.bind(monster);
        case 'suddenly':
            return monster.selfSuddenlyMove.bind(monster);
        case 'normal':
        default:
            return null;
    }
}

/**
 * Get bullet getter function from name
 */
function getBulletFunc(bulletType: string): (() => unknown) | null {
    if (typeof BullyFinally !== 'undefined' && BullyFinally[bulletType]) {
        return BullyFinally[bulletType] as () => unknown;
    }
    return null;
}

/**
 * Apply common monster parameters
 */
function applyMonsterParams(monster: Monster, config: AnyMonsterConfig): void {
    // Apply base config
    monster.name = config.name;
    monster.imgIndex = config.imgIndex;
    monster.comment = config.comment;

    if (config.addPrice !== undefined) {
        monster.addPrice = 10 + config.addPrice;
    }

    // Apply params if present
    const params = config.params;
    if (!params) return;

    // Basic params (apply speed scaling)
    if (params.speedNumb !== undefined) monster.speedNumb = scaleSpeed(params.speedNumb);
    if (params.r !== undefined) monster.r = params.r;
    if (params.colishDamage !== undefined) monster.colishDamage = params.colishDamage;
    if (params.hp !== undefined) monster.hpInit(params.hp);
    if (params.bodyColor) monster.bodyColor = MyColor.arrTo(params.bodyColor);
    if (params.bodyStrokeColor) monster.bodyStrokeColor = MyColor.arrTo(params.bodyStrokeColor);
    if (params.bodyStrokeWidth !== undefined) monster.bodyStrokeWidth = params.bodyStrokeWidth;
    if (params.accelerationV !== undefined) monster.accelerationV = scaleSpeed(params.accelerationV);
    if (params.maxSpeedN !== undefined) monster.maxSpeedN = scaleSpeed(params.maxSpeedN);
    if (params.teleportingAble !== undefined) monster.teleportingAble = params.teleportingAble;
    if (params.throwAble !== undefined) monster.throwAble = params.throwAble;

    // Movement type
    if (params.movementType && params.movementType !== 'normal') {
        const movementFunc = getMovementFunc(monster, params.movementType);
        if (movementFunc) {
            monster.changeSpeedFunc = movementFunc;
        }
    }
}

/**
 * Apply Monster-specific extended params
 */
function applyExtendedParams(monster: Monster, config: MonsterConfig): void {
    const params = config.params;
    if (!params) return;

    // Bomb self
    if (params.bombSelf) {
        monster.bombSelfAble = params.bombSelf.bombSelfAble;
        monster.bombSelfRange = params.bombSelf.bombSelfRange;
        monster.bombSelfDamage = params.bombSelf.bombSelfDamage;
    }

    // Bully change area (apply period scaling to f)
    if (params.bullyChange) {
        monster.haveBullyChangeArea = params.bullyChange.haveBullyChangeArea;
        monster.bullyChangeDetails.r = params.bullyChange.r;
        monster.bullyChangeDetails.f = scalePeriod(params.bullyChange.f);
        if (params.bullyChange.bullyDR !== undefined) {
            monster.bullyChangeDetails.bullyDR = params.bullyChange.bullyDR;
        }
        if (params.bullyChange.bullyAN !== undefined) {
            monster.bullyChangeDetails.bullyAN = params.bullyChange.bullyAN;
        }
        if (params.bullyChange.bullyDD !== undefined) {
            monster.bullyChangeDetails.bullyDD = params.bullyChange.bullyDD;
        }
    }

    // Gravity area
    if (params.gravityArea) {
        monster.haveGArea = params.gravityArea.haveGArea;
        monster.gAreaR = params.gravityArea.gAreaR;
        monster.gAreaNum = params.gravityArea.gAreaNum;
    }

    // Laser defense (apply period scaling to freeze params)
    if (params.laserDefense) {
        monster.haveLaserDefence = params.laserDefense.haveLaserDefence;
        monster.laserFreeze = scalePeriod(params.laserDefense.laserFreeze);
        monster.laserdefendPreNum = params.laserDefense.laserdefendPreNum;
        monster.maxLaserNum = params.laserDefense.maxLaserNum;
        monster.laserDefendNum = params.laserDefense.laserDefendNum;
        monster.laserRecoverFreeze = scalePeriod(params.laserDefense.laserRecoverFreeze);
        monster.laserRecoverNum = params.laserDefense.laserRecoverNum;
        monster.laserRadius = params.laserDefense.laserRadius;
    }

    // Gain ability (apply period scaling to gainFrequency, speed scaling to gainSpeedNAddNum)
    if (params.gain) {
        monster.haveGain = params.gain.haveGain;
        monster.gainDetails = {
            gainRadius: params.gain.gainRadius,
            gainFrequency: scalePeriod(params.gain.gainFrequency),
            gainR: params.gain.gainR ?? 0,
            gainCollideDamageAddNum: params.gain.gainCollideDamageAddNum ?? 0,
            gainHpAddedNum: params.gain.gainHpAddedNum ?? 0,
            gainSpeedNAddNum: scaleSpeed(params.gain.gainSpeedNAddNum ?? 0),
            gainHpAddedRate: params.gain.gainHpAddedRate ?? 0,
            gainMaxHpAddedNum: params.gain.gainMaxHpAddedNum ?? 0,
        };
    }

    // Summon ability
    if (params.summon) {
        if (params.summon.deadSummonAble !== undefined) {
            monster.deadSummonAble = params.summon.deadSummonAble;
        }
        if (params.summon.summonAble !== undefined) {
            monster.summonAble = params.summon.summonAble;
        }
        if (params.summon.summonCount !== undefined) {
            monster.summonCount = params.summon.summonCount;
        }
        if (params.summon.summonDistance !== undefined) {
            monster.summonDistance = params.summon.summonDistance;
        }
        // Set summon function using registry
        const summonName = params.summon.summonMonsterName;
        monster.summonMonsterFunc = ((world: unknown) =>
            MonsterRegistry.create(summonName, world) as Monster) as any;
    }

    // AI: Bullet dodge
    if (params.dodge) {
        monster.dodgeAble = params.dodge.dodgeAble;
        if (params.dodge.detectRadius !== undefined) {
            monster.dodgeConfig.detectRadius = params.dodge.detectRadius;
        }
        if (params.dodge.dodgeStrength !== undefined) {
            monster.dodgeConfig.dodgeStrength = params.dodge.dodgeStrength;
        }
        if (params.dodge.reactionTime !== undefined) {
            monster.dodgeConfig.reactionTime = scalePeriod(params.dodge.reactionTime);
        }
    }

    // AI: Dynamic target selection
    if (params.targetSelection) {
        monster.targetSelectionAble = params.targetSelection.targetSelectionAble;
        if (params.targetSelection.strategy !== undefined) {
            monster.targetConfig.strategy = params.targetSelection.strategy;
        }
        if (params.targetSelection.scanRadius !== undefined) {
            monster.targetConfig.scanRadius = params.targetSelection.scanRadius;
        }
        if (params.targetSelection.updateInterval !== undefined) {
            monster.targetConfig.updateInterval = scalePeriod(params.targetSelection.updateInterval);
        }
    }
}

/**
 * Apply MonsterShooter-specific params
 */
function applyShooterParams(monster: MonsterShooter, config: ShooterMonsterConfig): void {
    const params = config.params;
    if (!params) return;

    if (params.rangeR !== undefined) monster.rangeR = params.rangeR;
    if (params.clock !== undefined) monster.clock = scalePeriod(params.clock);
    if (params.bulletType) {
        monster.getmMainBullyFunc = getBulletFunc(params.bulletType) as any;
    }
}

/**
 * Apply MonsterMortis-specific params
 */
function applyMortisParams(monster: MonsterMortis, config: MortisMonsterConfig): void {
    const params = config.params;
    if (!params) return;

    if (params.viewRadius !== undefined) monster.viewRadius = params.viewRadius;
    if (params.bumpDamage !== undefined) monster.bumpDamage = params.bumpDamage;
    if (params.bumpDis !== undefined) monster.bumpDis = params.bumpDis;
}

/**
 * Apply MonsterTerminator-specific params
 */
function applyTerminatorParams(_monster: MonsterTerminator, _config: TerminatorMonsterConfig): void {
    // Currently uses default values
}

/**
 * Create a monster from configuration
 */
export function createMonsterFromConfig(config: AnyMonsterConfig, world: WorldLike): Monster {
    const MonsterClass = getMonsterClass(config.baseClass);
    const monster = MonsterClass.randInit(world as any);

    // Apply common params
    applyMonsterParams(monster, config);

    // Apply class-specific params
    switch (config.baseClass) {
        case 'Monster':
            applyExtendedParams(monster, config as MonsterConfig);
            break;
        case 'MonsterShooter':
            applyShooterParams(monster as unknown as MonsterShooter, config as ShooterMonsterConfig);
            break;
        case 'MonsterMortis':
            applyMortisParams(monster as unknown as MonsterMortis, config as MortisMonsterConfig);
            break;
        case 'MonsterTerminator':
            applyTerminatorParams(monster as unknown as MonsterTerminator, config as TerminatorMonsterConfig);
            break;
    }

    return monster;
}

/**
 * Register a monster from configuration
 */
export function registerMonsterFromConfig(config: AnyMonsterConfig): void {
    const creator = (world: WorldLike) => createMonsterFromConfig(config, world);
    MonsterRegistry.register(config.id, creator as any);
}

/**
 * Register multiple monsters from configuration array
 */
export function registerMonstersFromConfig(configs: AnyMonsterConfig[]): void {
    for (const config of configs) {
        registerMonsterFromConfig(config);
    }
}
