/**
 * Thunder tower configurations
 *
 * Contains: Thunder_1~2, Thunder_Far_1~2, Thunder_Power_1~2, ThunderBall_1~3 (9 towers)
 */

import type { TowerConfig, LaserTowerConfig } from './types';

export const THUNDER_1_CONFIG: LaserTowerConfig = {
    id: 'Thunder_1',
    baseClass: 'TowerLaser',
    name: '1级雷电塔',
    imgIndex: 55,
    price: 400,
    comment: '能够发射一道闪电，击中敌人后会继续电传导击中附近100范围内的敌人，进行如上操作3次数，每次伤害是上一个击中目标的1.1倍数累加，闪电的基础伤害是300，最大蓄力伤害是500',
    levelUpArr: ['Thunder_2', 'ThunderBall_1'],
    levelDownGetter: 'FutureCannon_1',
    params: {
        rAdd: 5,
        rangeR: 250,
        laserFreezeMax: 30,
        laserBaseDamage: 300,
        laserMaxDamage: 500,
        laserDamagePreAdd: 1,
        zapCount: 3,
        damageMultipleRate: 1.1,
        zapLen: 100,
        zapInitColor: [0, 200, 255, 0.9],
        attackType: 'zapAttack'
    }
};

export const THUNDER_2_CONFIG: LaserTowerConfig = {
    id: 'Thunder_2',
    baseClass: 'TowerLaser',
    name: '2级雷电塔',
    imgIndex: 55,
    price: 600,
    comment: '能够发射一道闪电，击中敌人后会继续电传导击中附近110范围内的敌人，进行如上操作5次数，每次伤害是上一个击中目标的1.2倍数累加，闪电的基础伤害是300，最大蓄力伤害是500',
    levelUpArr: ['Thunder_Far_1', 'Thunder_Power_1'],
    levelDownGetter: 'Thunder_1',
    params: {
        rAdd: 10,
        rangeR: 270,
        laserFreezeMax: 30,
        laserBaseDamage: 300,
        laserMaxDamage: 500,
        laserDamagePreAdd: 1,
        zapCount: 5,
        damageMultipleRate: 1.2,
        zapLen: 110,
        zapInitColor: [0, 200, 255, 0.9],
        attackType: 'zapAttack'
    }
};

export const THUNDER_FAR_1_CONFIG: LaserTowerConfig = {
    id: 'Thunder_Far_1',
    baseClass: 'TowerLaser',
    name: '1级远程雷电塔',
    imgIndex: 55,
    price: 600,
    comment: '能够发射一道闪电，击中敌人后会继续电传导击中附近300范围内的敌人，进行如上操作10次数，每次伤害是上一个击中目标的0.9倍数累加，闪电的基础伤害是150，最大蓄力伤害是100',
    levelUpArr: ['Thunder_Far_2'],
    levelDownGetter: 'Thunder_2',
    params: {
        rAdd: 12,
        rangeR: 300,
        laserFreezeMax: 20,
        laserBaseDamage: 150,
        laserMaxDamage: 100,
        laserDamagePreAdd: 10,
        zapCount: 10,
        damageMultipleRate: 0.9,
        zapLen: 300,
        zapInitColor: [255, 20, 100, 0.9],
        attackType: 'zapAttack'
    }
};

export const THUNDER_FAR_2_CONFIG: LaserTowerConfig = {
    id: 'Thunder_Far_2',
    baseClass: 'TowerLaser',
    name: '2级远程雷电塔',
    imgIndex: 55,
    price: 600,
    comment: '能够发射一道闪电，击中敌人后会继续电传导击中附近500范围内的敌人，进行如上操作20次数，每次伤害是上一个击中目标的0.85倍数累加，闪电的基础伤害是140，最大蓄力伤害是120',
    levelUpArr: [],
    levelDownGetter: 'Thunder_Far_1',
    params: {
        rAdd: 13,
        rangeR: 320,
        laserFreezeMax: 18,
        laserBaseDamage: 140,
        laserMaxDamage: 120,
        laserDamagePreAdd: 8,
        zapCount: 20,
        damageMultipleRate: 0.85,
        zapLen: 500,
        zapInitColor: [255, 20, 20, 0.9],
        attackType: 'zapAttack'
    }
};

export const THUNDER_POWER_1_CONFIG: LaserTowerConfig = {
    id: 'Thunder_Power_1',
    baseClass: 'TowerLaser',
    name: '1级强力雷电塔',
    imgIndex: 55,
    price: 400,
    comment: '能够发射一道闪电，击中敌人后会继续电传导击中附近110范围内的敌人，进行如上操作3次数，每次伤害是上一个击中目标的1.8倍数累加，闪电的基础伤害是500，最大蓄力伤害是500',
    levelUpArr: ['Thunder_Power_2'],
    levelDownGetter: 'Thunder_2',
    params: {
        rAdd: 10,
        rangeR: 250,
        laserFreezeMax: 60,
        laserBaseDamage: 500,
        laserMaxDamage: 500,
        laserDamagePreAdd: 3,
        zapCount: 3,
        damageMultipleRate: 1.8,
        zapLen: 110,
        zapInitColor: [0, 20, 255, 0.9],
        attackType: 'zapAttack'
    }
};

export const THUNDER_POWER_2_CONFIG: LaserTowerConfig = {
    id: 'Thunder_Power_2',
    baseClass: 'TowerLaser',
    name: '2级强力雷电塔',
    imgIndex: 55,
    price: 1000,
    comment: '能够发射一道闪电，击中敌人后会继续电传导击中附近90范围内的敌人，进行如上操作3次数，每次伤害是上一个击中目标的2倍数累加，闪电的基础伤害是700，最大蓄力伤害是1000',
    levelUpArr: [],
    levelDownGetter: 'Thunder_Power_1',
    params: {
        rAdd: 12,
        rangeR: 245,
        laserFreezeMax: 70,
        laserBaseDamage: 700,
        laserMaxDamage: 1000,
        laserDamagePreAdd: 3,
        zapCount: 3,
        damageMultipleRate: 2,
        zapLen: 90,
        zapInitColor: [255, 0, 255, 0.9],
        attackType: 'zapAttack'
    }
};

export const THUNDERBALL_1_CONFIG: TowerConfig = {
    id: 'ThunderBall_1',
    baseClass: 'Tower',
    name: '1级球状闪电发生器',
    imgIndex: 56,
    price: 1000,
    comment: '发射出去的球状闪电具有很强的跟踪能力',
    levelUpArr: ['ThunderBall_2'],
    levelDownGetter: 'Thunder_1',
    params: {
        rAdd: 7,
        rangeR: 280,
        clock: 30,
        hp: 15000,
        bullySpeed: 10,
        bulletType: 'ThunderBall'
    }
};

export const THUNDERBALL_2_CONFIG: TowerConfig = {
    id: 'ThunderBall_2',
    baseClass: 'Tower',
    name: '2级球状闪电发生器',
    imgIndex: 56,
    price: 600,
    comment: '发射出去的球状闪电具有很强的跟踪能力',
    levelUpArr: ['ThunderBall_3'],
    levelDownGetter: 'ThunderBall_1',
    params: {
        rAdd: 12,
        rangeR: 290,
        clock: 18,
        hp: 16000,
        bullySpeed: 15,
        bulletType: 'ThunderBall'
    }
};

export const THUNDERBALL_3_CONFIG: TowerConfig = {
    id: 'ThunderBall_3',
    baseClass: 'Tower',
    name: '3级球状闪电发生器',
    imgIndex: 56,
    price: 600,
    comment: '发射出去的球状闪电具有很强的跟踪能力',
    levelUpArr: [],
    levelDownGetter: 'ThunderBall_2',
    params: {
        rAdd: 13,
        rangeR: 300,
        clock: 16,
        hp: 20000,
        bullySpeed: 20,
        bulletType: 'ThunderBall'
    }
};

export const THUNDER_TOWER_CONFIGS: (TowerConfig | LaserTowerConfig)[] = [
    THUNDER_1_CONFIG,
    THUNDER_2_CONFIG,
    THUNDER_FAR_1_CONFIG,
    THUNDER_FAR_2_CONFIG,
    THUNDER_POWER_1_CONFIG,
    THUNDER_POWER_2_CONFIG,
    THUNDERBALL_1_CONFIG,
    THUNDERBALL_2_CONFIG,
    THUNDERBALL_3_CONFIG
];
