/**
 * Arrow tower configurations
 *
 * Contains: ArrowBow_1~4, Crossbow_1~3 (7 towers)
 */

import type { TowerConfig } from './types';

// ==================== ArrowBow Series ====================

export const ARROWBOW_1_CONFIG: TowerConfig = {
    id: 'ArrowBow_1',
    baseClass: 'Tower',
    name: '弓箭塔1级',
    imgIndex: 4,
    price: 60,
    comment: '这个弓箭塔是中世纪最基本的一种塔楼',
    levelUpArr: ['ArrowBow_2', 'Crossbow_1'],
    levelDownGetter: 'AncientCannon',
    params: {
        rAdd: 2,
        hp: 1500,
        rangeR: 200,
        clock: 15,
        bulletType: 'Arrow',
        audioSrcString: '/sound/发射音效/弓箭发射.mp3'
    }
};

export const ARROWBOW_2_CONFIG: TowerConfig = {
    id: 'ArrowBow_2',
    baseClass: 'Tower',
    name: '弓箭塔2级',
    imgIndex: 4,
    price: 70,
    comment: '弓箭塔是偏远程的一种防御塔',
    levelUpArr: ['ArrowBow_3'],
    levelDownGetter: 'ArrowBow_1',
    params: {
        rAdd: 3,
        hp: 2000,
        rangeR: 250,
        clock: 12,
        bullySpeed: 10,
        bulletType: 'Arrow_L',
        audioSrcString: '/sound/发射音效/弓箭发射.mp3'
    }
};

export const ARROWBOW_3_CONFIG: TowerConfig = {
    id: 'ArrowBow_3',
    baseClass: 'Tower',
    name: '弓箭塔3级',
    imgIndex: 4,
    price: 80,
    comment: '没什么',
    levelUpArr: ['ArrowBow_4'],
    levelDownGetter: 'ArrowBow_2',
    params: {
        rAdd: 4,
        hp: 5000,
        rangeR: 300,
        clock: 10,
        bullySpeed: 12,
        bulletType: 'Arrow_L',
        audioSrcString: '/sound/发射音效/弓箭发射.mp3'
    }
};

export const ARROWBOW_4_CONFIG: TowerConfig = {
    id: 'ArrowBow_4',
    baseClass: 'Tower',
    name: '弓箭塔4级',
    imgIndex: 4,
    price: 150,
    comment: '四级弓箭塔更换了弓箭子弹，伤害提高了',
    levelUpArr: [],
    levelDownGetter: 'ArrowBow_3',
    params: {
        rAdd: 5,
        hp: 8000,
        rangeR: 320,
        clock: 8,
        bullySpeed: 13,
        bulletType: 'Arrow_LL',
        audioSrcString: '/sound/发射音效/弓箭发射.mp3'
    }
};

// ==================== Crossbow Series ====================

export const CROSSBOW_1_CONFIG: TowerConfig = {
    id: 'Crossbow_1',
    baseClass: 'Tower',
    name: '连弩1级',
    imgIndex: 3,
    price: 120,
    comment: '连弩视野范围没有弓箭塔那么大，但是射速更快了',
    levelUpArr: ['Crossbow_2'],
    levelDownGetter: 'ArrowBow_1',
    params: {
        rAdd: 3,
        hp: 6000,
        rangeR: 160,
        clock: 11,
        bullySpeed: 10,
        bullySpeedAddMax: 3,
        bullyDeviation: 3,
        attackBullyNum: 2,
        bulletType: 'Arrow',
        audioSrcString: '/sound/发射音效/弓箭发射.mp3'
    }
};

export const CROSSBOW_2_CONFIG: TowerConfig = {
    id: 'Crossbow_2',
    baseClass: 'Tower',
    name: '连弩2级',
    imgIndex: 3,
    price: 130,
    comment: '射速进一步加快，一次性能够射出3发子弹',
    levelUpArr: ['Crossbow_3'],
    levelDownGetter: 'Crossbow_1',
    params: {
        rAdd: 5,
        hp: 10000,
        rangeR: 200,
        clock: 9,
        bullySpeed: 13,
        bullySpeedAddMax: 5,
        bullyDeviation: 5,
        attackBullyNum: 3,
        bulletType: 'Arrow',
        audioSrcString: '/sound/发射音效/弓箭发射.mp3'
    }
};

export const CROSSBOW_3_CONFIG: TowerConfig = {
    id: 'Crossbow_3',
    baseClass: 'Tower',
    name: '连弩3级',
    imgIndex: 3,
    price: 200,
    comment: '射速更快了，一次性能射出4发子弹',
    levelUpArr: [],
    levelDownGetter: 'Crossbow_2',
    params: {
        rAdd: 7,
        hp: 20000,
        rangeR: 250,
        clock: 5,
        bullySpeed: 15,
        bullySpeedAddMax: 5,
        bullyDeviation: 10,
        attackBullyNum: 4,
        bulletType: 'Arrow_L',
        audioSrcString: '/sound/发射音效/弓箭发射.mp3'
    }
};

/**
 * All arrow tower configurations
 */
export const ARROW_TOWER_CONFIGS = [
    ARROWBOW_1_CONFIG,
    ARROWBOW_2_CONFIG,
    ARROWBOW_3_CONFIG,
    ARROWBOW_4_CONFIG,
    CROSSBOW_1_CONFIG,
    CROSSBOW_2_CONFIG,
    CROSSBOW_3_CONFIG
];
