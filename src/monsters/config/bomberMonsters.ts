/**
 * Bomber monster configurations
 *
 * Contains: Bomber1~3, Thrower1 (4 monsters)
 */

import type { MonsterConfig } from './types';

export const BOMBER1_CONFIG: MonsterConfig = {
    id: 'Bomber1',
    baseClass: 'Monster',
    name: '炸弹1级',
    imgIndex: 2,
    comment: '死了会爆炸',
    params: {
        speedNumb: 0.5,
        bodyColor: [60, 60, 20, 1],
        bombSelf: {
            bombSelfAble: true,
            bombSelfRange: 80,
            bombSelfDamage: 200
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'balanced',
            scanRadius: 300
        }
    }
};

export const BOMBER2_CONFIG: MonsterConfig = {
    id: 'Bomber2',
    baseClass: 'Monster',
    name: '炸弹2级',
    imgIndex: 2,
    addPrice: 10,
    comment: '爆炸伤害更大',
    params: {
        speedNumb: 0.55,
        bodyColor: [90, 90, 30, 1],
        bombSelf: {
            bombSelfAble: true,
            bombSelfRange: 120,
            bombSelfDamage: 800
        },
        dodge: {
            dodgeAble: true,
            detectRadius: 100,
            dodgeStrength: 5
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'balanced',
            scanRadius: 350
        }
    }
};

export const BOMBER3_CONFIG: MonsterConfig = {
    id: 'Bomber3',
    baseClass: 'Monster',
    name: '炸弹3级',
    imgIndex: 2,
    addPrice: 10,
    comment: '爆炸伤害更更大',
    params: {
        speedNumb: 0.6,
        bodyColor: [150, 150, 50, 1],
        bombSelf: {
            bombSelfAble: true,
            bombSelfRange: 200,
            bombSelfDamage: 5000
        },
        dodge: {
            dodgeAble: true,
            detectRadius: 120,
            dodgeStrength: 6
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'balanced',
            scanRadius: 400
        }
    }
};

export const THROWER1_CONFIG: MonsterConfig = {
    id: 'Thrower1',
    baseClass: 'Monster',
    name: '压路机1级',
    imgIndex: 3,
    addPrice: 10,
    comment: '直接碾压你的建筑，伤害很大',
    params: {
        speedNumb: 0.4,
        r: 30,
        throwAble: true,
        bodyColor: [50, 150, 150, 0.5],
        bodyStrokeColor: [5, 15, 15, 1],
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'weakest',
            scanRadius: 300
        }
    }
};

/**
 * All bomber monster configurations
 */
export const BOMBER_MONSTER_CONFIGS = [
    BOMBER1_CONFIG,
    BOMBER2_CONFIG,
    BOMBER3_CONFIG,
    THROWER1_CONFIG
];
