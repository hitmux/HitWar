/**
 * Boomerang tower configurations
 *
 * Contains: Boomerang, Boomerang_Far_1~3, Boomerang_Power_1~3 (7 towers)
 */

import type { BoomerangTowerConfig } from './types';

export const BOOMERANG_CONFIG: BoomerangTowerConfig = {
    id: 'Boomerang',
    baseClass: 'TowerBoomerang',
    name: '回旋镖',
    imgIndex: 2,
    price: 190,
    comment: '一种威力不小的攻击东西，回旋镖能够穿过敌人，对所有穿过的敌人造成伤害',
    levelUpArr: ['Boomerang_Far_1', 'Boomerang_Power_1'],
    levelDownGetter: 'AncientCannon',
    params: {
        rAdd: 2,
        rangeR: 120,
        hp: 3000,
        damage: 100
    }
};

export const BOOMERANG_FAR_1_CONFIG: BoomerangTowerConfig = {
    id: 'Boomerang_Far_1',
    baseClass: 'TowerBoomerang',
    name: '远程回旋镖1级',
    imgIndex: 2,
    price: 230,
    comment: '回旋镖的距离更远了',
    levelUpArr: ['Boomerang_Far_2'],
    levelDownGetter: 'Boomerang',
    params: {
        rAdd: 3,
        rangeR: 140,
        hp: 6000,
        damage: 100,
        barRotateSelfSpeed: 0.6
    }
};

export const BOOMERANG_FAR_2_CONFIG: BoomerangTowerConfig = {
    id: 'Boomerang_Far_2',
    baseClass: 'TowerBoomerang',
    name: '远程回旋镖2级',
    imgIndex: 2,
    price: 350,
    comment: '距离又远了',
    levelUpArr: ['Boomerang_Far_3'],
    levelDownGetter: 'Boomerang_Far_1',
    params: {
        rAdd: 4,
        rangeR: 160,
        hp: 6000,
        damage: 100,
        barWidth: 10,
        barRotateSelfSpeed: 0.7
    }
};

export const BOOMERANG_FAR_3_CONFIG: BoomerangTowerConfig = {
    id: 'Boomerang_Far_3',
    baseClass: 'TowerBoomerang',
    name: '远程回旋镖3级',
    imgIndex: 2,
    price: 300,
    comment: '距离又又又远了',
    levelUpArr: [],
    levelDownGetter: 'Boomerang_Far_2',
    params: {
        rAdd: 5,
        rangeR: 200,
        hp: 6000,
        damage: 120,
        barWidth: 10,
        barRotateSelfSpeed: 0.8
    }
};

export const BOOMERANG_POWER_1_CONFIG: BoomerangTowerConfig = {
    id: 'Boomerang_Power_1',
    baseClass: 'TowerBoomerang',
    name: '力量回旋镖1级',
    imgIndex: 2,
    price: 300,
    comment: '相对于普通的回旋镖，距离虽然没那么远了，但是伤害更大了，回旋镖也更大更强了',
    levelUpArr: ['Boomerang_Power_2'],
    levelDownGetter: 'Boomerang',
    params: {
        rAdd: 2,
        rangeR: 100,
        hp: 3000,
        damage: 250,
        barWidth: 10,
        barLen: 20,
        barRotateSelfSpeed: 0.2
    }
};

export const BOOMERANG_POWER_2_CONFIG: BoomerangTowerConfig = {
    id: 'Boomerang_Power_2',
    baseClass: 'TowerBoomerang',
    name: '力量回旋镖2级',
    imgIndex: 2,
    price: 350,
    comment: '伤害又继续猛增',
    levelUpArr: ['Boomerang_Power_3'],
    levelDownGetter: 'Boomerang_Power_1',
    params: {
        rAdd: 3,
        rangeR: 100,
        hp: 5000,
        damage: 500,
        barWidth: 15,
        barLen: 30,
        barRotateSelfSpeed: 0.1
    }
};

export const BOOMERANG_POWER_3_CONFIG: BoomerangTowerConfig = {
    id: 'Boomerang_Power_3',
    baseClass: 'TowerBoomerang',
    name: '力量回旋镖3级',
    imgIndex: 2,
    price: 400,
    comment: '伤害更大了，这恐怕不是回旋镖了，叫回旋的板砖儿...',
    levelUpArr: [],
    levelDownGetter: 'Boomerang_Power_2',
    params: {
        rAdd: 4,
        rangeR: 110,
        hp: 10000,
        damage: 800,
        barWidth: 20,
        barLen: 40,
        barRotateSelfSpeed: 0.05
    }
};

export const BOOMERANG_TOWER_CONFIGS: BoomerangTowerConfig[] = [
    BOOMERANG_CONFIG,
    BOOMERANG_FAR_1_CONFIG,
    BOOMERANG_FAR_2_CONFIG,
    BOOMERANG_FAR_3_CONFIG,
    BOOMERANG_POWER_1_CONFIG,
    BOOMERANG_POWER_2_CONFIG,
    BOOMERANG_POWER_3_CONFIG
];
