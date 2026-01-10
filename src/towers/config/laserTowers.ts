/**
 * Laser tower configurations
 *
 * Contains: Laser, Laser_Blue_1~3, Laser_Green_1~3, Laser_Hell_1~2,
 *           Laser_Red, Laser_Red_Alpha_1~2, Laser_Red_Beta_1~2 (14 towers)
 */

import type { LaserTowerConfig, HellTowerConfig, RayTowerConfig } from './types';

// ==================== TowerLaser Series ====================

export const LASER_CONFIG: LaserTowerConfig = {
    id: 'Laser',
    baseClass: 'TowerLaser',
    name: '激光塔',
    imgIndex: 60,
    price: 350,
    comment: '蓄力发射激光直接瞬间命中敌人，攻击冷却是10个时间刻度，每次击中基础伤害是50，最大额外蓄力伤害是300',
    levelUpArr: ['Laser_Blue_1', 'Laser_Red', 'Laser_Green_1'],
    levelDownGetter: 'FutureCannon_1',
    params: {
        rAdd: 6,
        rangeR: 120,
        laserBaseDamage: 50,
        laserFreezeMax: 10,
        laserMaxDamage: 300,
        laserDamagePreAdd: 1,
        laserColor: [100, 100, 100, 0.7]
    }
};

export const LASER_BLUE_1_CONFIG: LaserTowerConfig = {
    id: 'Laser_Blue_1',
    baseClass: 'TowerLaser',
    name: '1级蓝激光',
    imgIndex: 59,
    price: 600,
    comment: '蓄力发射激光直接瞬间命中敌人，攻击冷却是20个时间刻度，每次击中基础伤害是150，最大额外蓄力伤害是700',
    levelUpArr: ['Laser_Blue_2', 'Laser_Hell_1'],
    levelDownGetter: 'Laser',
    params: {
        rAdd: 7,
        rangeR: 130,
        laserBaseDamage: 150,
        laserFreezeMax: 20,
        laserMaxDamage: 700,
        laserDamagePreAdd: 5
    }
};

export const LASER_BLUE_2_CONFIG: LaserTowerConfig = {
    id: 'Laser_Blue_2',
    baseClass: 'TowerLaser',
    name: '2级蓝激光',
    imgIndex: 59,
    price: 1200,
    comment: '蓄力发射激光直接瞬间命中敌人，攻击冷却是20个时间刻度，每次击中基础伤害是300，最大额外蓄力伤害是1000',
    levelUpArr: ['Laser_Blue_3'],
    levelDownGetter: 'Laser_Blue_1',
    params: {
        rAdd: 10,
        rangeR: 150,
        laserBaseDamage: 300,
        laserFreezeMax: 20,
        laserMaxDamage: 1000,
        laserDamagePreAdd: 10
    }
};

export const LASER_BLUE_3_CONFIG: LaserTowerConfig = {
    id: 'Laser_Blue_3',
    baseClass: 'TowerLaser',
    name: '3级蓝激光',
    imgIndex: 59,
    price: 1000,
    comment: '蓄力发射激光直接瞬间命中敌人，攻击冷却是30个时间刻度，每次击中基础伤害是500，最大额外蓄力伤害是5000',
    levelUpArr: [],
    levelDownGetter: 'Laser_Blue_2',
    params: {
        rAdd: 13,
        rangeR: 170,
        laserBaseDamage: 500,
        laserFreezeMax: 30,
        laserMaxDamage: 5000,
        laserDamagePreAdd: 10
    }
};

export const LASER_GREEN_1_CONFIG: LaserTowerConfig = {
    id: 'Laser_Green_1',
    baseClass: 'TowerLaser',
    name: '1级绿激光',
    imgIndex: 58,
    price: 400,
    comment: '蓄力发射激光直接瞬间命中敌人，攻击冷却是4个时间刻度，每次击中基础伤害是40，最大额外蓄力伤害是100',
    levelUpArr: ['Laser_Green_2'],
    levelDownGetter: 'Laser',
    params: {
        rAdd: 7,
        rangeR: 200,
        laserBaseDamage: 40,
        laserFreezeMax: 4,
        laserMaxDamage: 100,
        laserDamagePreAdd: 1,
        laserColor: [24, 212, 107, 0.7]
    }
};

export const LASER_GREEN_2_CONFIG: LaserTowerConfig = {
    id: 'Laser_Green_2',
    baseClass: 'TowerLaser',
    name: '2级绿激光',
    imgIndex: 58,
    price: 500,
    comment: '蓄力发射激光直接瞬间命中敌人，攻击冷却是3个时间刻度，每次击中基础伤害是35，最大额外蓄力伤害是120',
    levelUpArr: ['Laser_Green_3'],
    levelDownGetter: 'Laser_Green_1',
    params: {
        rAdd: 8,
        rangeR: 250,
        laserBaseDamage: 35,
        laserFreezeMax: 3,
        laserMaxDamage: 120,
        laserDamagePreAdd: 2,
        laserColor: [24, 212, 107, 0.7]
    }
};

export const LASER_GREEN_3_CONFIG: LaserTowerConfig = {
    id: 'Laser_Green_3',
    baseClass: 'TowerLaser',
    name: '3级绿激光',
    imgIndex: 58,
    price: 700,
    comment: '蓄力发射激光直接瞬间命中敌人，攻击冷却是2个时间刻度，每次击中基础伤害是55，最大额外蓄力伤害是200',
    levelUpArr: [],
    levelDownGetter: 'Laser_Blue_2',
    params: {
        rAdd: 10,
        rangeR: 300,
        laserBaseDamage: 55,
        laserFreezeMax: 2,
        laserMaxDamage: 200,
        laserDamagePreAdd: 4,
        laserColor: [24, 212, 107, 0.7]
    }
};

// ==================== TowerHell Series ====================

export const LASER_HELL_1_CONFIG: HellTowerConfig = {
    id: 'Laser_Hell_1',
    baseClass: 'TowerHell',
    name: '1级地狱激光塔',
    imgIndex: 69,
    price: 2000,
    comment: '锁定敌人之后会持续对敌人发射激光，激光会越来越强，随着时间推移伤害会越来越高，无限制增高，血量再厚的敌人也抵挡不过它',
    levelUpArr: ['Laser_Hell_2'],
    levelDownGetter: 'Laser_Blue_1',
    params: {
        rAdd: 13,
        damageRate: 1000
    }
};

export const LASER_HELL_2_CONFIG: HellTowerConfig = {
    id: 'Laser_Hell_2',
    baseClass: 'TowerHell',
    name: '2级地狱激光塔',
    imgIndex: 69,
    price: 1000,
    comment: '锁定目标后伤害增加的速度变得更快了',
    levelUpArr: [],
    levelDownGetter: 'Laser_Hell_1',
    params: {
        rAdd: 15,
        damageRate: 100
    }
};

// ==================== TowerRay Series ====================

export const LASER_RED_CONFIG: RayTowerConfig = {
    id: 'Laser_Red',
    baseClass: 'TowerRay',
    name: '红激光',
    imgIndex: 57,
    price: 800,
    comment: '绿色激光是一种高频激光，蓝色激光是一种低频高伤害激光，而红色激光是一种大范围群体伤害激光，能够穿射',
    levelUpArr: ['Laser_Red_Alpha_1', 'Laser_Red_Beta_1'],
    levelDownGetter: 'Laser',
    params: {
        rAdd: 7,
        hp: 10000,
        rangeR: 250,
        rayLen: 300,
        rayClock: 10,
        rayWidth: 5,
        damage: 100,
        rayColor: [255, 0, 0, 1]
    }
};

export const LASER_RED_ALPHA_1_CONFIG: RayTowerConfig = {
    id: 'Laser_Red_Alpha_1',
    baseClass: 'TowerRay',
    name: '1级Alpha红激光',
    imgIndex: 57,
    price: 800,
    comment: '穿刺范围大大增加了',
    levelUpArr: ['Laser_Red_Alpha_2'],
    levelDownGetter: 'Laser_Red',
    params: {
        rAdd: 9,
        hp: 20000,
        rangeR: 300,
        rayLen: 1000,
        rayClock: 30,
        rayWidth: 10,
        damage: 300,
        rayColor: [255, 0, 0, 1]
    }
};

export const LASER_RED_ALPHA_2_CONFIG: RayTowerConfig = {
    id: 'Laser_Red_Alpha_2',
    baseClass: 'TowerRay',
    name: '2级Alpha红激光',
    imgIndex: 57,
    price: 1000,
    comment: '穿刺长度又大大增加了，伤害减少了一些，但是频率提高了',
    levelUpArr: [],
    levelDownGetter: 'Laser_Red_Alpha_1',
    params: {
        rAdd: 11,
        hp: 30000,
        rangeR: 350,
        rayLen: 1500,
        rayClock: 10,
        rayWidth: 13,
        damage: 200,
        rayColor: [255, 0, 0, 1]
    }
};

export const LASER_RED_BETA_1_CONFIG: RayTowerConfig = {
    id: 'Laser_Red_Beta_1',
    baseClass: 'TowerRay',
    name: '1级Beta红激光',
    imgIndex: 57,
    price: 800,
    comment: '全屏扫射',
    levelUpArr: ['Laser_Red_Beta_2'],
    levelDownGetter: 'Laser_Red',
    params: {
        rAdd: 10,
        hp: 30000,
        rangeR: 0,
        rayLen: 800,
        rayWidth: 4,
        damage: 30,
        rayColor: [255, 0, 0, 1],
        attackType: 'scanningAttack'
    }
};

export const LASER_RED_BETA_2_CONFIG: RayTowerConfig = {
    id: 'Laser_Red_Beta_2',
    baseClass: 'TowerRay',
    name: '2级Beta红激光',
    imgIndex: 57,
    price: 1000,
    comment: '全屏扫射',
    levelUpArr: [],
    levelDownGetter: 'Laser_Red_Beta_1',
    params: {
        rAdd: 13,
        hp: 50000,
        rangeR: 0,
        rayLen: 1000,
        rayWidth: 5,
        damage: 50,
        rayColor: [255, 0, 0, 1],
        attackType: 'scanningAttack'
    }
};

/**
 * All laser tower configurations
 */
export const LASER_TOWER_CONFIGS = [
    LASER_CONFIG,
    LASER_BLUE_1_CONFIG,
    LASER_BLUE_2_CONFIG,
    LASER_BLUE_3_CONFIG,
    LASER_GREEN_1_CONFIG,
    LASER_GREEN_2_CONFIG,
    LASER_GREEN_3_CONFIG,
    LASER_HELL_1_CONFIG,
    LASER_HELL_2_CONFIG,
    LASER_RED_CONFIG,
    LASER_RED_ALPHA_1_CONFIG,
    LASER_RED_ALPHA_2_CONFIG,
    LASER_RED_BETA_1_CONFIG,
    LASER_RED_BETA_2_CONFIG
];
