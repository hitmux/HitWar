/**
 * Artillery tower configurations
 *
 * Contains: Artillery_1~3, MissileGun_1~3 (6 towers)
 */

import type { TowerConfig } from './types';

// ==================== Artillery Series ====================

export const ARTILLERY_1_CONFIG: TowerConfig = {
    id: 'Artillery_1',
    baseClass: 'Tower',
    name: '1级火炮',
    imgIndex: 33,
    price: 500,
    comment: '这曾经是世界大战中的武器，发射出去的炮弹会持续加速，击中目标或者超出一定范围后发生爆炸，对范围内的怪物造成爆炸伤害，越接近爆炸中心，爆炸伤害越高',
    levelUpArr: ['Artillery_2'],
    levelDownGetter: 'TraditionalCannon_Large',
    params: {
        rAdd: 7,
        rangeR: 300, // base 100 + 200
        clock: 30, // base 10 + 20
        hp: 5000,
        bullySpeed: 1,
        bullySlideRate: 1.2,
        bullySpeedAddMax: 1,
        bulletType: 'H_S',
        audioSrcString: '/sound/发射音效/火箭发射.ogg'
    }
};

export const ARTILLERY_2_CONFIG: TowerConfig = {
    id: 'Artillery_2',
    baseClass: 'Tower',
    name: '2级火炮',
    imgIndex: 34,
    price: 800,
    comment: '能够同时发射两枚炮弹了，发射的火炮弹伤害大大提高',
    levelUpArr: ['Artillery_3'],
    levelDownGetter: 'Artillery_1',
    params: {
        rAdd: 9,
        rangeR: 250,
        clock: 35, // base 10 + 25
        hp: 8800,
        bullySpeed: 1,
        bullySlideRate: 1.2,
        bullySpeedAddMax: 1,
        bullyDeviationRotate: 0.2,
        bullyRotate: Math.PI / 12,
        attackBullyNum: 2,
        bulletType: 'H_L',
        attackType: 'shrapnelAttack',
        audioSrcString: '/sound/发射音效/火箭发射.ogg'
    }
};

export const ARTILLERY_3_CONFIG: TowerConfig = {
    id: 'Artillery_3',
    baseClass: 'Tower',
    name: '3级火炮',
    imgIndex: 34,
    price: 1000,
    comment: '每次攻击都会同时发射两枚超大型号的炮弹，造成很大的爆炸伤害',
    levelUpArr: [],
    levelDownGetter: 'Artillery_2',
    params: {
        rAdd: 11,
        rangeR: 300,
        clock: 50, // base 10 + 40
        hp: 30000,
        bullySpeed: 1,
        bullySlideRate: 1.1,
        bullyDeviationRotate: 0.8,
        bullyRotate: Math.PI / 12,
        attackBullyNum: 2,
        bulletType: 'H_LL',
        attackType: 'shrapnelAttack',
        audioSrcString: '/sound/发射音效/火箭发射.ogg'
    }
};

// ==================== MissileGun Series ====================

export const MISSILEGUN_1_CONFIG: TowerConfig = {
    id: 'MissileGun_1',
    baseClass: 'Tower',
    name: '1级跟踪导弹炮',
    imgIndex: 35,
    price: 700,
    comment: '发射出去的导弹具有追踪能力，同时也会爆炸，只不过因为会追踪，所以伤害没有火炮那么高了',
    levelUpArr: ['MissileGun_2'],
    levelDownGetter: 'TraditionalCannon_Large',
    params: {
        rAdd: 8,
        rangeR: 250,
        clock: 20, // base 10 + 10
        hp: 10000,
        bullySpeed: 7,
        bullySlideRate: 6,
        attackBullyNum: 1,
        bulletType: 'H_Target_S',
        audioSrcString: '/sound/发射音效/火箭发射.ogg'
    }
};

export const MISSILEGUN_2_CONFIG: TowerConfig = {
    id: 'MissileGun_2',
    baseClass: 'Tower',
    name: '2级跟踪导弹炮',
    imgIndex: 35,
    price: 750,
    comment: '每次发射能够发射三个导弹',
    levelUpArr: ['MissileGun_3'],
    levelDownGetter: 'MissileGun_1',
    params: {
        rAdd: 11,
        rangeR: 250,
        clock: 20, // base 10 + 10
        hp: 10000,
        bullySpeed: 8,
        bullySlideRate: 6,
        bullyRotate: Math.PI / 6,
        attackBullyNum: 3,
        bulletType: 'H_Target_S',
        attackType: 'shrapnelAttack',
        audioSrcString: '/sound/发射音效/火箭发射.ogg'
    }
};

export const MISSILEGUN_3_CONFIG: TowerConfig = {
    id: 'MissileGun_3',
    baseClass: 'Tower',
    name: '3级跟踪导弹炮',
    imgIndex: 35,
    price: 1000,
    comment: '每次发射能够发射五个导弹，这可以说是多管导弹炮',
    levelUpArr: [],
    levelDownGetter: 'MissileGun_2',
    params: {
        rAdd: 15,
        rangeR: 250,
        clock: 20, // base 10 + 10
        hp: 10000,
        bullySpeed: 10,
        bullySlideRate: 6,
        bullyRotate: Math.PI / 6,
        attackBullyNum: 5,
        bulletType: 'H_Target_S',
        attackType: 'shrapnelAttack',
        audioSrcString: '/sound/发射音效/火箭发射.ogg'
    }
};

/**
 * All artillery tower configurations
 */
export const ARTILLERY_TOWER_CONFIGS = [
    ARTILLERY_1_CONFIG,
    ARTILLERY_2_CONFIG,
    ARTILLERY_3_CONFIG,
    MISSILEGUN_1_CONFIG,
    MISSILEGUN_2_CONFIG,
    MISSILEGUN_3_CONFIG
];
