/**
 * Spray cannon tower configurations
 *
 * Contains: SprayCannon_1~3, SprayCannon_Double, SprayCannon_Three (5 towers)
 */

import type { TowerConfig } from './types';

export const SPRAYCANNON_1_CONFIG: TowerConfig = {
    id: 'SprayCannon_1',
    baseClass: 'Tower',
    name: '1级溅射炮塔',
    imgIndex: 40,
    price: 250,
    comment: '发射出去的子弹可以发生分裂',
    levelUpArr: ['SprayCannon_2', 'SprayCannon_Double'],
    levelDownGetter: 'TraditionalCannon_MultiTube',
    params: {
        rAdd: 10,
        rangeR: 200,
        clock: 30,
        hp: 1000,
        bullySpeed: 5,
        bulletType: 'SS_S',
        audioSrcString: '/sound/发射音效/喷泄.mp3'
    }
};

export const SPRAYCANNON_2_CONFIG: TowerConfig = {
    id: 'SprayCannon_2',
    baseClass: 'Tower',
    name: '2级溅射炮塔',
    imgIndex: 40,
    price: 360,
    comment: '发射的子弹由小型分裂弹变为中型分裂弹',
    levelUpArr: ['SprayCannon_3'],
    levelDownGetter: 'SprayCannon_1',
    params: {
        rAdd: 11,
        rangeR: 220,
        clock: 30,
        hp: 3000,
        bullySpeed: 8,
        bulletType: 'SS_M',
        audioSrcString: '/sound/发射音效/喷泄.mp3'
    }
};

export const SPRAYCANNON_3_CONFIG: TowerConfig = {
    id: 'SprayCannon_3',
    baseClass: 'Tower',
    name: '3级溅射炮塔',
    imgIndex: 40,
    price: 500,
    comment: '发射大型分裂弹',
    levelUpArr: [],
    levelDownGetter: 'SprayCannon_2',
    params: {
        rAdd: 12,
        rangeR: 250,
        clock: 30,
        hp: 5000,
        bullySpeed: 11,
        bulletType: 'SS_L',
        audioSrcString: '/sound/发射音效/喷泄.mp3'
    }
};

export const SPRAYCANNON_DOUBLE_CONFIG: TowerConfig = {
    id: 'SprayCannon_Double',
    baseClass: 'Tower',
    name: '二次溅射炮塔',
    imgIndex: 41,
    price: 600,
    comment: '发射的子弹能够发生分裂，发生分裂后的子弹碰到怪物还能继续发生分裂',
    levelUpArr: ['SprayCannon_Three'],
    levelDownGetter: 'SprayCannon_1',
    params: {
        rAdd: 13,
        rangeR: 250,
        clock: 30,
        hp: 10000,
        bullySpeed: 15,
        bulletType: 'SS_Second',
        audioSrcString: '/sound/发射音效/喷泄.mp3'
    }
};

export const SPRAYCANNON_THREE_CONFIG: TowerConfig = {
    id: 'SprayCannon_Three',
    baseClass: 'Tower',
    name: '三次溅射炮塔',
    imgIndex: 41,
    price: 900,
    comment: '发生出去的子弹发生分裂，分裂后继续分裂，分裂后还能分裂！总共能够分裂三次',
    levelUpArr: [],
    levelDownGetter: 'SprayCannon_Double',
    params: {
        rAdd: 15,
        rangeR: 250,
        clock: 30,
        hp: 10000,
        bullySpeed: 15,
        bulletType: 'SS_Third',
        audioSrcString: '/sound/发射音效/喷泄.mp3'
    }
};

export const SPRAY_TOWER_CONFIGS: TowerConfig[] = [
    SPRAYCANNON_1_CONFIG,
    SPRAYCANNON_2_CONFIG,
    SPRAYCANNON_3_CONFIG,
    SPRAYCANNON_DOUBLE_CONFIG,
    SPRAYCANNON_THREE_CONFIG
];
