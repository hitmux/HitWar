/**
 * Basic monster configurations
 *
 * Contains: Normal, Runner, TestMonster, Ox1~3 (6 monsters)
 */

import type { MonsterConfig } from './types';

export const NORMAL_CONFIG: MonsterConfig = {
    id: 'Normal',
    baseClass: 'Monster',
    name: '普通人',
    imgIndex: 0,
    comment: '普通人',
    params: {
        speedNumb: 0.3,
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'nearest',
            scanRadius: 250
        }
    }
};

export const RUNNER_CONFIG: MonsterConfig = {
    id: 'Runner',
    baseClass: 'Monster',
    name: '跑人',
    imgIndex: 0,
    comment: '跑人',
    params: {
        speedNumb: 1,
        dodge: {
            dodgeAble: true,
            detectRadius: 100,
            dodgeStrength: 6
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'nearest',
            scanRadius: 200
        }
    }
};

export const TEST_MONSTER_CONFIG: MonsterConfig = {
    id: 'TestMonster',
    baseClass: 'Monster',
    name: '测试',
    imgIndex: 0,
    comment: '这个是程序测试用的',
    params: {
        hp: 1,
        colishDamage: 0
    },
    addPrice: 0 // addPrice will be 10 + 0 = 10
};

export const OX1_CONFIG: MonsterConfig = {
    id: 'Ox1',
    baseClass: 'Monster',
    name: '冲锋1级',
    imgIndex: 1,
    comment: '速度会越来越快',
    params: {
        speedNumb: 0.01,
        accelerationV: 0.01,
        maxSpeedN: 5,
        bodyColor: [80, 20, 20, 1],
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'weakest',
            scanRadius: 300
        }
    }
};

export const OX2_CONFIG: MonsterConfig = {
    id: 'Ox2',
    baseClass: 'Monster',
    name: '冲锋2级',
    imgIndex: 1,
    comment: '加速度，速度越来越快',
    params: {
        speedNumb: 0.01,
        accelerationV: 0.05,
        maxSpeedN: 7,
        bodyColor: [120, 20, 20, 1],
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'weakest',
            scanRadius: 300
        }
    }
};

export const OX3_CONFIG: MonsterConfig = {
    id: 'Ox3',
    baseClass: 'Monster',
    name: '冲锋3级',
    imgIndex: 1,
    comment: '比普通冲锋加速的更快',
    params: {
        speedNumb: 0.01,
        accelerationV: 0.1,
        maxSpeedN: 10,
        bodyColor: [150, 20, 20, 1],
        dodge: {
            dodgeAble: true,
            detectRadius: 120,
            dodgeStrength: 5
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'weakest',
            scanRadius: 350
        }
    }
};

/**
 * All basic monster configurations
 */
export const BASIC_MONSTER_CONFIGS = [
    NORMAL_CONFIG,
    RUNNER_CONFIG,
    TEST_MONSTER_CONFIG,
    OX1_CONFIG,
    OX2_CONFIG,
    OX3_CONFIG
];
