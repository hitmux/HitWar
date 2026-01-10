/**
 * Elemental tower configurations
 *
 * Contains: Flamethrower_1~2, FrozenCannon_1~2, Poison_1~2, PowderCannon (7 towers)
 */

import type { TowerConfig } from './types';

export const POWDERCANNON_CONFIG: TowerConfig = {
    id: 'PowderCannon',
    baseClass: 'Tower',
    name: '粉尘炮塔',
    imgIndex: 36,
    price: 260,
    comment: '这个炮塔发射的是呛人的瓦斯烟雾，同时也是为了进化成发射粉尘类，烟雾类等等的炮塔而过渡',
    levelUpArr: ['Flamethrower_1', 'FrozenCannon_1', 'Poison_1'],
    levelDownGetter: 'TraditionalCannon_MultiTube',
    params: {
        rAdd: 5,
        rangeR: 150,
        clock: 1,
        bullySpeed: 10,
        bullyDeviationRotate: 3,
        bulletType: 'Powder',
        audioSrcString: '/sound/子弹音效/烟雾.mp3'
    }
};

export const FLAMETHROWER_1_CONFIG: TowerConfig = {
    id: 'Flamethrower_1',
    baseClass: 'Tower',
    name: '1级喷火器',
    imgIndex: 37,
    price: 420,
    comment: '喷射火焰，让敌人持续受到伤害，同时让敌人获得烧伤效果，敌人获得烧伤效果之后会按照比例持续掉血，血量再厚的敌人也撑不过多久，坏处就是烧伤会让敌人加速',
    levelUpArr: ['Flamethrower_2'],
    levelDownGetter: 'PowderCannon',
    params: {
        rAdd: 7,
        rangeR: 200,
        clock: 1,
        hp: 5000,
        bullySpeed: 15,
        attackBullyNum: 2,
        bullyDeviationRotate: 4,
        bulletType: 'Fire_L'
    }
};

export const FLAMETHROWER_2_CONFIG: TowerConfig = {
    id: 'Flamethrower_2',
    baseClass: 'Tower',
    name: '2级喷火器',
    imgIndex: 37,
    price: 500,
    comment: '喷射的火焰采用了冷火焰，好处是让敌人加速的不那么快了，伤害丝毫不会打折扣',
    levelUpArr: [],
    levelDownGetter: 'Flamethrower_1',
    params: {
        rAdd: 9,
        rangeR: 200,
        clock: 1,
        hp: 10000,
        bullySpeed: 18,
        attackBullyNum: 2,
        bullyDeviationRotate: 4,
        bulletType: 'Fire_LL'
    }
};

export const FROZENCANNON_1_CONFIG: TowerConfig = {
    id: 'FrozenCannon_1',
    baseClass: 'Tower',
    name: '1级冰冻炮',
    imgIndex: 39,
    price: 620,
    comment: '击中之后的冰冻蛋子会发生小爆炸，爆炸范围内的敌人会减速，这个减速效果可以累加，直到达到一个上限。但是冰冻和烧伤是互斥的，二者不能同时存在',
    levelUpArr: ['FrozenCannon_2'],
    levelDownGetter: 'PowderCannon',
    params: {
        rAdd: 7,
        rangeR: 150,
        clock: 10,
        hp: 2000,
        bullySpeed: 4,
        bullySlideRate: 1,
        bulletType: 'Frozen_L',
        audioSrcString: '/sound/子弹音效/冰冻.mp3'
    }
};

export const FROZENCANNON_2_CONFIG: TowerConfig = {
    id: 'FrozenCannon_2',
    baseClass: 'Tower',
    name: '2级冰冻炮',
    imgIndex: 39,
    price: 1200,
    comment: '迅速发射大量更密集的冰冻蛋子',
    levelUpArr: [],
    levelDownGetter: 'FrozenCannon_1',
    params: {
        rAdd: 8,
        rangeR: 200,
        clock: 3,
        hp: 3000,
        bullySpeed: 6,
        bullySlideRate: 1,
        attackBullyNum: 3,
        bullyDeviationRotate: 5,
        bulletType: 'Frozen_L',
        audioSrcString: '/sound/子弹音效/冰冻.mp3'
    }
};

export const POISON_1_CONFIG: TowerConfig = {
    id: 'Poison_1',
    baseClass: 'Tower',
    name: '1级毒气喷射器',
    imgIndex: 38,
    price: 400,
    comment: '被毒气烟雾熏到的敌人会受到伤害',
    levelUpArr: ['Poison_2'],
    levelDownGetter: 'PowderCannon',
    params: {
        rAdd: 8,
        rangeR: 250,
        clock: 10,
        hp: 10000,
        bullySpeed: 9,
        attackBullyNum: 10,
        bullyDeviationRotate: 8,
        bulletType: 'P_L'
    }
};

export const POISON_2_CONFIG: TowerConfig = {
    id: 'Poison_2',
    baseClass: 'Tower',
    name: '2级毒气喷射器',
    imgIndex: 38,
    price: 600,
    comment: '毒气伤害增加',
    levelUpArr: [],
    levelDownGetter: 'Poison_1',
    params: {
        rAdd: 9.5,
        rangeR: 260,
        clock: 13,
        hp: 15000,
        bullySpeed: 9,
        attackBullyNum: 10,
        bullyDeviationRotate: 8,
        bulletType: 'P_M'
    }
};

export const ELEMENTAL_TOWER_CONFIGS: TowerConfig[] = [
    POWDERCANNON_CONFIG,
    FLAMETHROWER_1_CONFIG,
    FLAMETHROWER_2_CONFIG,
    FROZENCANNON_1_CONFIG,
    FROZENCANNON_2_CONFIG,
    POISON_1_CONFIG,
    POISON_2_CONFIG
];
