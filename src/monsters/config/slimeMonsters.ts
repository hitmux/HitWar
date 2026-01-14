/**
 * Slime monster configurations
 *
 * Contains: Slime_L, Slime_M, Slime_S (3 monsters)
 */

import type { MonsterConfig } from './types';

export const SLIME_L_CONFIG: MonsterConfig = {
    id: 'Slime_L',
    baseClass: 'Monster',
    name: '大史莱姆',
    imgIndex: 16,
    addPrice: 10,
    comment: '大型史莱姆，死亡之后会分裂成四个中型史莱姆，每个中型史莱姆死亡之后又会分裂成四个小型史莱姆',
    params: {
        speedNumb: 0.4,
        r: 50,
        bodyColor: [171, 236, 97, 0.8],
        bodyStrokeColor: [47, 113, 56, 1],
        bodyStrokeWidth: 12,
        summon: {
            deadSummonAble: true,
            summonMonsterName: 'Slime_M'
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'balanced',
            scanRadius: 300
        }
    }
};

export const SLIME_M_CONFIG: MonsterConfig = {
    id: 'Slime_M',
    baseClass: 'Monster',
    name: '中史莱姆',
    imgIndex: 16,
    addPrice: 10,
    comment: '中型史莱姆，由大型史莱姆分裂得到',
    params: {
        speedNumb: 0.6,
        r: 30,
        bodyColor: [171, 236, 97, 0.8],
        bodyStrokeColor: [47, 113, 56, 1],
        bodyStrokeWidth: 5,
        summon: {
            deadSummonAble: true,
            summonMonsterName: 'Slime_S'
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'balanced',
            scanRadius: 280
        }
    }
};

export const SLIME_S_CONFIG: MonsterConfig = {
    id: 'Slime_S',
    baseClass: 'Monster',
    name: '小史莱姆',
    imgIndex: 16,
    addPrice: 10,
    comment: '小型史莱姆，跑的比较快',
    params: {
        speedNumb: 0.8,
        r: 10,
        bodyColor: [171, 236, 97, 0.8],
        bodyStrokeColor: [47, 113, 56, 1],
        bodyStrokeWidth: 3,
        dodge: {
            dodgeAble: true,
            detectRadius: 80,
            dodgeStrength: 5
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'nearest',
            scanRadius: 250
        }
    }
};

/**
 * All slime monster configurations
 */
export const SLIME_MONSTER_CONFIGS = [
    SLIME_L_CONFIG,
    SLIME_M_CONFIG,
    SLIME_S_CONFIG
];
