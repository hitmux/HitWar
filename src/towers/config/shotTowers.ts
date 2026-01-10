/**
 * Shot/Shotgun tower configurations
 *
 * Contains: ThreeTubeCannon, Shotgun_1~2, ShotCannon_1~2 (5 towers)
 */

import type { TowerConfig } from './types';

export const THREE_TUBE_CANNON_CONFIG: TowerConfig = {
    id: 'ThreeTubeCannon',
    baseClass: 'Tower',
    name: '三管炮塔',
    imgIndex: 42,
    price: 400,
    comment: '一种散弹',
    levelUpArr: ['Shotgun_1', 'ShotCannon_1'],
    levelDownGetter: 'TraditionalCannon_MultiTube',
    params: {
        rAdd: 6,
        rangeR: 230,
        clock: 4,
        bullySpeed: 3,
        bullyRotate: Math.PI / 12,
        attackBullyNum: 3,
        bulletType: 'Bully_M',
        attackType: 'shrapnelAttack',
        audioSrcString: '/sound/子弹音效/散弹子弹.mp3'
    }
};

export const SHOTGUN_1_CONFIG: TowerConfig = {
    id: 'Shotgun_1',
    baseClass: 'Tower',
    name: '1级快速散弹',
    imgIndex: 44,
    price: 500,
    comment: '发射频率很快的散弹子弹',
    levelUpArr: ['Shotgun_2'],
    levelDownGetter: 'ThreeTubeCannon',
    params: {
        rAdd: 10,
        rangeR: 250,
        clock: 3,
        hp: 5000,
        bullySpeed: 3,
        bullySpeedAddMax: 0.5,
        bullyRotate: Math.PI / 10,
        attackBullyNum: 5,
        bulletType: 'Bully_M',
        attackType: 'shrapnelAttack',
        audioSrcString: '/sound/子弹音效/散弹子弹.mp3'
    }
};

export const SHOTGUN_2_CONFIG: TowerConfig = {
    id: 'Shotgun_2',
    baseClass: 'Tower',
    name: '2级快速散弹',
    imgIndex: 44,
    price: 800,
    comment: '发射的频率更快了，但是子弹的移动速度可能并不是很快',
    levelUpArr: [],
    levelDownGetter: 'Shotgun_1',
    params: {
        rAdd: 23, // 11 + 12
        rangeR: 260,
        clock: 2,
        hp: 10000,
        bullySpeed: 2.8,
        bullySpeedAddMax: 0.7,
        bullyRotate: Math.PI / 6,
        attackBullyNum: 10,
        bulletType: 'Bully_M',
        attackType: 'shrapnelAttack',
        audioSrcString: '/sound/子弹音效/散弹子弹.mp3'
    }
};

export const SHOTCANNON_1_CONFIG: TowerConfig = {
    id: 'ShotCannon_1',
    baseClass: 'Tower',
    name: '1级喷泄炮',
    imgIndex: 43,
    price: 600,
    comment: '像人拉屎窜稀一样，快速的喷泄出大量子弹，喷泄出的子弹速度不一',
    levelUpArr: ['ShotCannon_2'],
    levelDownGetter: 'ThreeTubeCannon',
    params: {
        rAdd: 10,
        rangeR: 225,
        clock: 15,
        hp: 5000,
        bullySpeed: 3,
        bullySlideRate: 1,
        bullySpeedAddMax: 14,
        bullyDeviationRotate: 5,
        attackBullyNum: 40,
        bulletType: 'Bully_M',
        audioSrcString: '/sound/发射音效/喷泄.mp3'
    }
};

export const SHOTCANNON_2_CONFIG: TowerConfig = {
    id: 'ShotCannon_2',
    baseClass: 'Tower',
    name: '2级喷泄炮',
    imgIndex: 43,
    price: 900,
    comment: '喷泄量增加了',
    levelUpArr: [],
    levelDownGetter: 'ShotCannon_1',
    params: {
        rAdd: 11,
        rangeR: 335, // base 100 + 235
        clock: 18,
        hp: 5000,
        bullySpeed: 3,
        bullySlideRate: 1.1,
        bullySpeedAddMax: 16,
        bullyDeviationRotate: 8,
        attackBullyNum: 100,
        bulletType: 'Bully_M',
        audioSrcString: '/sound/发射音效/喷泄.mp3'
    }
};

/**
 * All shot tower configurations
 */
export const SHOT_TOWER_CONFIGS = [
    THREE_TUBE_CANNON_CONFIG,
    SHOTGUN_1_CONFIG,
    SHOTGUN_2_CONFIG,
    SHOTCANNON_1_CONFIG,
    SHOTCANNON_2_CONFIG
];
