/**
 * Hammer tower configurations
 *
 * Contains: Hammer, Hammer_Fast_1~3, Hammer_Power_1~3 (7 towers)
 */

import type { HammerTowerConfig } from './types';

export const HAMMER_CONFIG: HammerTowerConfig = {
    id: 'Hammer',
    baseClass: 'TowerHammer',
    name: '流星锤',
    imgIndex: 5,
    price: 230,
    comment: '他有一个转动的大铁球，这个转动的大铁球只要一碰到敌人，就能够造成很大的伤害。',
    levelUpArr: ['Hammer_Fast_1', 'Hammer_Power_1'],
    levelDownGetter: 'AncientCannon',
    params: {
        rAdd: 3,
        hp: 5000,
        rangeR: 80,
        itemDamage: 200
    }
};

export const HAMMER_FAST_1_CONFIG: HammerTowerConfig = {
    id: 'Hammer_Fast_1',
    baseClass: 'TowerHammer',
    name: '快速流星锤1级',
    imgIndex: 5,
    price: 300,
    comment: '这个转动的大铁球变小了，伤害变小了，但是转的更快了，能够更好的应对突然过来的怪物了',
    levelUpArr: ['Hammer_Fast_2'],
    levelDownGetter: 'Hammer',
    params: {
        rAdd: 5,
        hp: 6000,
        rangeR: 100,
        itemRidus: 15,
        itemDamage: 250,
        itemSpeed: 4,
        hasAdditionItem: true
    }
};

export const HAMMER_FAST_2_CONFIG: HammerTowerConfig = {
    id: 'Hammer_Fast_2',
    baseClass: 'TowerHammer',
    name: '快速流星锤2级',
    imgIndex: 5,
    price: 370,
    comment: '转的又更快了，伤害继续增加了一点，转动半径也增加了',
    levelUpArr: ['Hammer_Fast_3'],
    levelDownGetter: 'Hammer_Fast_1',
    params: {
        rAdd: 7,
        hp: 10000,
        rangeR: 150,
        itemRidus: 15,
        itemDamage: 300,
        itemSpeed: 3,
        hasAdditionItem: true
    }
};

export const HAMMER_FAST_3_CONFIG: HammerTowerConfig = {
    id: 'Hammer_Fast_3',
    baseClass: 'TowerHammer',
    name: '快速流星锤3级',
    imgIndex: 5,
    price: 320,
    comment: '转的飞快了，伤害继续增加，转动半径继续增加',
    levelUpArr: [],
    levelDownGetter: 'Hammer_Fast_2',
    params: {
        rAdd: 8,
        hp: 18000,
        rangeR: 180,
        itemRidus: 15,
        itemDamage: 400,
        itemSpeed: 2,
        hasAdditionItem: true
    }
};

export const HAMMER_POWER_1_CONFIG: HammerTowerConfig = {
    id: 'Hammer_Power_1',
    baseClass: 'TowerHammer',
    name: '重型流星锤1级',
    imgIndex: 6,
    price: 400,
    comment: '转的更慢了，但是大铁球变得更大了，转的慢了之后，对敌人的伤害也更高了，因为触碰一下就会伤害怪物，增加了铁球和敌人的触碰时间',
    levelUpArr: ['Hammer_Power_2'],
    levelDownGetter: 'Hammer',
    params: {
        rAdd: 3,
        hp: 10000,
        rangeR: 90,
        itemRidus: 30,
        itemDamage: 100,
        itemSpeed: 20,
        hasAdditionItem: true
    }
};

export const HAMMER_POWER_2_CONFIG: HammerTowerConfig = {
    id: 'Hammer_Power_2',
    baseClass: 'TowerHammer',
    name: '重型流星锤2级',
    imgIndex: 6,
    price: 450,
    comment: '更大，更慢，更强',
    levelUpArr: ['Hammer_Power_3'],
    levelDownGetter: 'Hammer_Power_1',
    params: {
        rAdd: 5,
        hp: 20000,
        rangeR: 100,
        itemRidus: 35,
        itemDamage: 100,
        itemSpeed: 30,
        hasAdditionItem: true
    }
};

export const HAMMER_POWER_3_CONFIG: HammerTowerConfig = {
    id: 'Hammer_Power_3',
    baseClass: 'TowerHammer',
    name: '重型流星锤3级',
    imgIndex: 6,
    price: 500,
    comment: '更大，更慢，更强',
    levelUpArr: [],
    levelDownGetter: 'Hammer_Power_2',
    params: {
        rAdd: 7,
        hp: 30000,
        rangeR: 110,
        itemRidus: 38,
        itemDamage: 200,
        itemSpeed: 50,
        hasAdditionItem: true
    }
};

/**
 * All hammer tower configurations
 */
export const HAMMER_TOWER_CONFIGS = [
    HAMMER_CONFIG,
    HAMMER_FAST_1_CONFIG,
    HAMMER_FAST_2_CONFIG,
    HAMMER_FAST_3_CONFIG,
    HAMMER_POWER_1_CONFIG,
    HAMMER_POWER_2_CONFIG,
    HAMMER_POWER_3_CONFIG
];
