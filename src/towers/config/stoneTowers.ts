/**
 * Stone/Cannon tower configurations
 *
 * Contains: StoneCannon, StoneCannon_Far_1~3, StoneCannon_Power_1~3 (7 towers)
 */

import type { TowerConfig } from './types';

export const STONECANNON_CONFIG: TowerConfig = {
    id: 'StoneCannon',
    baseClass: 'Tower',
    name: '加农炮',
    imgIndex: 7,
    price: 100,
    comment: '发射石头蛋子，威力超过弓箭很多很多，但是攻击速度慢了',
    levelUpArr: ['StoneCannon_Far_1', 'StoneCannon_Power_1'],
    levelDownGetter: 'AncientCannon',
    params: {
        rAdd: 3,
        rangeR: 120,
        clock: 20,
        hp: 3000,
        bullySpeed: 3,
        bullySpeedAddMax: 7,
        bullySlideRate: 1.5,
        bulletType: 'CannonStone_S',
        audioSrcString: '/sound/子弹音效/石头蛋子.mp3'
    }
};

export const STONECANNON_FAR_1_CONFIG: TowerConfig = {
    id: 'StoneCannon_Far_1',
    baseClass: 'Tower',
    name: '远程加农炮1级',
    imgIndex: 8,
    price: 200,
    comment: '增加了攻击距离',
    levelUpArr: ['StoneCannon_Far_2'],
    levelDownGetter: 'StoneCannon',
    params: {
        rAdd: 4,
        rangeR: 260,
        clock: 20,
        hp: 3000,
        bullySpeed: 7,
        bullySpeedAddMax: 2,
        bullySlideRate: 2,
        bulletType: 'CannonStone_S',
        audioSrcString: '/sound/子弹音效/石头蛋子.mp3'
    }
};

export const STONECANNON_FAR_2_CONFIG: TowerConfig = {
    id: 'StoneCannon_Far_2',
    baseClass: 'Tower',
    name: '远程加农炮2级',
    imgIndex: 8,
    price: 250,
    comment: '进一步增加了攻击距离',
    levelUpArr: ['StoneCannon_Far_3'],
    levelDownGetter: 'StoneCannon_Far_1',
    params: {
        rAdd: 5,
        rangeR: 270,
        clock: 20,
        bullySpeed: 7,
        bullySpeedAddMax: 3,
        bullySlideRate: 2.2,
        bulletType: 'CannonStone_M',
        audioSrcString: '/sound/子弹音效/石头蛋子.mp3'
    }
};

export const STONECANNON_FAR_3_CONFIG: TowerConfig = {
    id: 'StoneCannon_Far_3',
    baseClass: 'Tower',
    name: '远程加农炮3级',
    imgIndex: 8,
    price: 300,
    comment: '攻击距离更远了，射出的子弹成了中型号的石头蛋子',
    levelUpArr: [],
    levelDownGetter: 'StoneCannon_Far_2',
    params: {
        rAdd: 6,
        rangeR: 300,
        clock: 20,
        bullySpeed: 7,
        bullySpeedAddMax: 4,
        bullySlideRate: 2.2,
        bulletType: 'CannonStone_M',
        audioSrcString: '/sound/子弹音效/石头蛋子.mp3'
    }
};

export const STONECANNON_POWER_1_CONFIG: TowerConfig = {
    id: 'StoneCannon_Power_1',
    baseClass: 'Tower',
    name: '重型加农炮1级',
    imgIndex: 9,
    price: 120,
    comment: '发射大型石头蛋子，大型石头蛋子打中怪物之后会碎裂成一些有伤害的小石头蛋子',
    levelUpArr: ['StoneCannon_Power_2'],
    levelDownGetter: 'StoneCannon',
    params: {
        rAdd: 4,
        rangeR: 180,
        clock: 50,
        hp: 9000,
        bullySpeed: 8,
        bullySpeedAddMax: 1,
        bullySlideRate: 1.5,
        bulletType: 'CannonStone_M',
        audioSrcString: '/sound/子弹音效/石头蛋子.mp3'
    }
};

export const STONECANNON_POWER_2_CONFIG: TowerConfig = {
    id: 'StoneCannon_Power_2',
    baseClass: 'Tower',
    name: '重型加农炮2级',
    imgIndex: 9,
    price: 300,
    comment: '增加了一点攻击范围，石头蛋子滑出视野的距离增加了',
    levelUpArr: ['StoneCannon_Power_3'],
    levelDownGetter: 'StoneCannon_Power_1',
    params: {
        rAdd: 5,
        rangeR: 200,
        clock: 50,
        hp: 30000,
        bullySpeed: 8,
        bullySlideRate: 2.5,
        bulletType: 'CannonStone_L',
        audioSrcString: '/sound/子弹音效/石头蛋子.mp3'
    }
};

export const STONECANNON_POWER_3_CONFIG: TowerConfig = {
    id: 'StoneCannon_Power_3',
    baseClass: 'Tower',
    name: '重型加农炮3级',
    imgIndex: 9,
    price: 320,
    comment: '范围进一步增加',
    levelUpArr: [],
    levelDownGetter: 'StoneCannon_Power_2',
    params: {
        rAdd: 6,
        rangeR: 230,
        clock: 65,
        hp: 100000,
        bullySpeed: 10,
        bulletType: 'CannonStone_L',
        audioSrcString: '/sound/子弹音效/石头蛋子.mp3'
    }
};

export const STONE_TOWER_CONFIGS: TowerConfig[] = [
    STONECANNON_CONFIG,
    STONECANNON_FAR_1_CONFIG,
    STONECANNON_FAR_2_CONFIG,
    STONECANNON_FAR_3_CONFIG,
    STONECANNON_POWER_1_CONFIG,
    STONECANNON_POWER_2_CONFIG,
    STONECANNON_POWER_3_CONFIG
];
