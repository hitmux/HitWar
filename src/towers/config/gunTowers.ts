/**
 * Gun tower configurations
 *
 * Contains: Rifle_1~3, MachineGun_1~3, ArmorPiercing_1~3 (9 towers)
 */

import type { TowerConfig } from './types';

// ==================== Rifle Series ====================

export const RIFLE_1_CONFIG: TowerConfig = {
    id: 'Rifle_1',
    baseClass: 'Tower',
    name: '1级步枪',
    imgIndex: 25,
    price: 160,
    comment: '就是步枪了啦',
    levelUpArr: ['Rifle_2'],
    levelDownGetter: 'TraditionalCannon_Small',
    params: {
        rAdd: 3,
        rangeR: 200,
        clock: 4,
        bullySpeed: 8, // base 5 + 3
        bulletType: 'Rifle_Bully_L',
        audioSrcString: '/sound/子弹音效/步枪子弹.mp3'
    }
};

export const RIFLE_2_CONFIG: TowerConfig = {
    id: 'Rifle_2',
    baseClass: 'Tower',
    name: '2级步枪',
    imgIndex: 25,
    price: 170,
    comment: '范围和射速增加了啦',
    levelUpArr: ['Rifle_3'],
    levelDownGetter: 'Rifle_1',
    params: {
        rAdd: 3,
        rangeR: 230,
        clock: 3,
        bullySpeed: 9, // base 5 + 4
        bulletType: 'Rifle_Bully_M',
        audioSrcString: '/sound/子弹音效/步枪子弹.mp3'
    }
};

export const RIFLE_3_CONFIG: TowerConfig = {
    id: 'Rifle_3',
    baseClass: 'Tower',
    name: '3级步枪',
    imgIndex: 25,
    price: 180,
    comment: '子弹的速度增加了，步枪子弹也加强了',
    levelUpArr: [],
    levelDownGetter: 'Rifle_2',
    params: {
        rAdd: 4,
        rangeR: 260,
        clock: 3,
        bullySpeed: 10, // base 5 + 5
        bulletType: 'Rifle_Bully_L',
        audioSrcString: '/sound/子弹音效/步枪子弹.mp3'
    }
};

// ==================== MachineGun Series ====================

export const MACHINEGUN_1_CONFIG: TowerConfig = {
    id: 'MachineGun_1',
    baseClass: 'Tower',
    name: '1级重机枪',
    imgIndex: 26,
    price: 250,
    comment: '就是机枪了啦',
    levelUpArr: ['MachineGun_2'],
    levelDownGetter: 'TraditionalCannon_Small',
    params: {
        rAdd: 3,
        rangeR: 220,
        clock: 2,
        hp: 2000,
        bullySpeed: 7, // base 5 + 2
        bullySpeedAddMax: 5,
        bullyDeviation: 20,
        bulletType: 'F_S',
        audioSrcString: '/sound/子弹音效/机枪子弹.mp3'
    }
};

export const MACHINEGUN_2_CONFIG: TowerConfig = {
    id: 'MachineGun_2',
    baseClass: 'Tower',
    name: '2级重机枪',
    imgIndex: 26,
    price: 300,
    comment: '射速更快，子弹更多',
    levelUpArr: ['MachineGun_3'],
    levelDownGetter: 'MachineGun_1',
    params: {
        rAdd: 5,
        rangeR: 190,
        clock: 1,
        hp: 5000,
        bullySpeed: 2,
        bullySlideRate: 1.1,
        bullySpeedAddMax: 10,
        bullyDeviation: 20,
        attackBullyNum: 3,
        bulletType: 'F_M',
        audioSrcString: '/sound/子弹音效/机枪子弹.mp3'
    }
};

export const MACHINEGUN_3_CONFIG: TowerConfig = {
    id: 'MachineGun_3',
    baseClass: 'Tower',
    name: '3级重机枪',
    imgIndex: 27,
    price: 500,
    comment: '射速又加强了，子弹也加强了',
    levelUpArr: [],
    levelDownGetter: 'MachineGun_2',
    params: {
        rAdd: 7,
        rangeR: 250,
        clock: 1,
        hp: 10000,
        bullySpeed: 8.2,
        bullySlideRate: 1,
        bullySpeedAddMax: 3,
        bullyDeviation: 30,
        attackBullyNum: 3,
        bulletType: 'F_L',
        audioSrcString: '/sound/子弹音效/机枪子弹.mp3'
    }
};

// ==================== ArmorPiercing Series ====================

export const ARMORPIERCING_1_CONFIG: TowerConfig = {
    id: 'ArmorPiercing_1',
    baseClass: 'Tower',
    name: '1级穿甲炮',
    imgIndex: 28,
    price: 220,
    comment: '穿甲炮的子弹能够穿过敌人，在穿过敌人的过程中对敌人持续造成伤害，但是子弹半径会变小，直到子弹消失，消失前子弹伤害是不变的',
    levelUpArr: ['ArmorPiercing_2'],
    levelDownGetter: 'TraditionalCannon_Small',
    params: {
        rAdd: 5,
        rangeR: 200,
        clock: 4,
        hp: 1500,
        bullySpeed: 8, // base 5 + 3
        bullySlideRate: 3,
        bulletType: 'T_M',
        audioSrcString: '/sound/子弹音效/穿甲弹.mp3'
    }
};

export const ARMORPIERCING_2_CONFIG: TowerConfig = {
    id: 'ArmorPiercing_2',
    baseClass: 'Tower',
    name: '2级穿甲炮',
    imgIndex: 29,
    price: 250,
    comment: '子弹加强了，射速也更快了',
    levelUpArr: ['ArmorPiercing_3'],
    levelDownGetter: 'AirCannon_1',
    params: {
        rAdd: 7,
        rangeR: 220,
        clock: 2,
        hp: 5000,
        bullySpeed: 8, // base 5 + 3
        bullySlideRate: 5,
        bullySpeedAddMax: 3,
        bulletType: 'T_L',
        audioSrcString: '/sound/子弹音效/穿甲弹.mp3'
    }
};

export const ARMORPIERCING_3_CONFIG: TowerConfig = {
    id: 'ArmorPiercing_3',
    baseClass: 'Tower',
    name: '3级穿甲炮',
    imgIndex: 29,
    price: 400,
    comment: '射速更慢了，但是子弹变成大型的穿甲弹了',
    levelUpArr: [],
    levelDownGetter: 'AirCannon_2',
    params: {
        rAdd: 9,
        rangeR: 230,
        clock: 10,
        hp: 10000,
        bullySpeed: 4,
        bullySlideRate: 5,
        bullySpeedAddMax: 4,
        bulletType: 'T_LL',
        audioSrcString: '/sound/子弹音效/穿甲弹.mp3'
    }
};

/**
 * All gun tower configurations
 */
export const GUN_TOWER_CONFIGS = [
    RIFLE_1_CONFIG,
    RIFLE_2_CONFIG,
    RIFLE_3_CONFIG,
    MACHINEGUN_1_CONFIG,
    MACHINEGUN_2_CONFIG,
    MACHINEGUN_3_CONFIG,
    ARMORPIERCING_1_CONFIG,
    ARMORPIERCING_2_CONFIG,
    ARMORPIERCING_3_CONFIG
];
