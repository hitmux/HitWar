/**
 * Shouter monster configurations
 *
 * Contains: Shouter, Shouter_Stone, Shouter_Bomber, Shouter_Spike (4 monsters)
 */

import type { ShooterMonsterConfig } from './types';

export const SHOUTER_CONFIG: ShooterMonsterConfig = {
    id: 'Shouter',
    baseClass: 'MonsterShooter',
    name: '射击者',
    imgIndex: 15,
    addPrice: 5,
    comment: '会对你的建筑进行远程射击，造成伤害',
    params: {
        speedNumb: 0.35,
        r: 20,
        bodyColor: [190, 145, 23, 1],
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'threat',
            scanRadius: 250
        }
    }
};

export const SHOUTER_STONE_CONFIG: ShooterMonsterConfig = {
    id: 'Shouter_Stone',
    baseClass: 'MonsterShooter',
    name: '石头蛋子射击者',
    imgIndex: 15,
    addPrice: 5,
    comment: '会对你的建筑进行远程射击伤害巨大的石头蛋子',
    params: {
        speedNumb: 0.30,
        r: 20,
        bodyColor: [190, 145, 23, 1],
        bulletType: 'CannonStone_L',
        clock: 50,
        rangeR: 170,
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'weakest',
            scanRadius: 200
        }
    }
};

export const SHOUTER_BOMBER_CONFIG: ShooterMonsterConfig = {
    id: 'Shouter_Bomber',
    baseClass: 'MonsterShooter',
    name: '火炮射击者',
    imgIndex: 15,
    addPrice: 5,
    comment: '会对你的建筑进行远程射击伤害巨大的火炮',
    params: {
        speedNumb: 0.30,
        r: 20,
        bodyColor: [190, 145, 23, 1],
        bulletType: 'H_S',
        clock: 50,
        rangeR: 128,
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'weakest',
            scanRadius: 200
        }
    }
};

export const SHOUTER_SPIKE_CONFIG: ShooterMonsterConfig = {
    id: 'Shouter_Spike',
    baseClass: 'MonsterShooter',
    name: '绿球射击者',
    imgIndex: 15,
    addPrice: 5,
    comment: '会对你的建筑进行远程射击仙人球',
    params: {
        speedNumb: 0.30,
        r: 20,
        bodyColor: [190, 145, 23, 1],
        bulletType: 'SpikeBully',
        clock: 8,
        rangeR: 100,
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'threat',
            scanRadius: 150
        }
    }
};

/**
 * All shouter monster configurations
 */
export const SHOUTER_MONSTER_CONFIGS = [
    SHOUTER_CONFIG,
    SHOUTER_STONE_CONFIG,
    SHOUTER_BOMBER_CONFIG,
    SHOUTER_SPIKE_CONFIG
];
