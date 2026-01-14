/**
 * Support monster configurations
 *
 * Contains: Medic, Medic_S, Medic_M, SpeedAdder, AttackAdder (5 monsters)
 */

import type { MonsterConfig } from './types';

export const MEDIC_CONFIG: MonsterConfig = {
    id: 'Medic',
    baseClass: 'Monster',
    name: '加血辅助',
    imgIndex: 7,
    addPrice: 10,
    comment: '不停的给队友恢复固定的血量',
    params: {
        speedNumb: 0.5,
        r: 30,
        bodyColor: [105, 117, 60, 1],
        gain: {
            haveGain: true,
            gainRadius: 100,
            gainFrequency: 10,
            gainR: 0,
            gainCollideDamageAddNum: 0,
            gainHpAddedNum: 10,
            gainSpeedNAddNum: 0,
            gainHpAddedRate: 0.0,
            gainMaxHpAddedNum: 0
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'balanced',
            scanRadius: 300
        }
    }
};

export const MEDIC_S_CONFIG: MonsterConfig = {
    id: 'Medic_S',
    baseClass: 'Monster',
    name: '加比例血辅助',
    imgIndex: 8,
    addPrice: 10,
    comment: '不停的给队友恢复他们自身最大血量一定比例的血量',
    params: {
        speedNumb: 0.5,
        r: 30,
        bodyColor: [92, 117, 79, 1],
        gain: {
            haveGain: true,
            gainRadius: 200,
            gainFrequency: 20,
            gainR: 0,
            gainCollideDamageAddNum: 0,
            gainHpAddedNum: 0,
            gainSpeedNAddNum: 0,
            gainHpAddedRate: 0.1,
            gainMaxHpAddedNum: 0
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'balanced',
            scanRadius: 300
        }
    }
};

export const MEDIC_M_CONFIG: MonsterConfig = {
    id: 'Medic_M',
    baseClass: 'Monster',
    name: '加上限血辅助',
    imgIndex: 9,
    addPrice: 10,
    comment: '不停的给身边的队友增加血量上限',
    params: {
        speedNumb: 0.3,
        r: 40,
        bodyColor: [120, 188, 85, 1],
        gain: {
            haveGain: true,
            gainRadius: 200,
            gainFrequency: 30,
            gainR: 2,
            gainCollideDamageAddNum: 0,
            gainHpAddedNum: 0,
            gainSpeedNAddNum: 0,
            gainHpAddedRate: 0.0,
            gainMaxHpAddedNum: 100
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'balanced',
            scanRadius: 300
        }
    }
};

export const SPEED_ADDER_CONFIG: MonsterConfig = {
    id: 'SpeedAdder',
    baseClass: 'Monster',
    name: '加速辅助',
    imgIndex: 10,
    addPrice: 10,
    comment: '会给身边的队友增加速度，但是不能给自己增加速度，但是两个它们在一起的时候就有意思了',
    params: {
        speedNumb: 0.35,
        bodyColor: [68, 230, 249, 1],
        gain: {
            haveGain: true,
            gainRadius: 100,
            gainFrequency: 5,
            gainR: 0,
            gainCollideDamageAddNum: 0,
            gainHpAddedNum: 0,
            gainSpeedNAddNum: 0.02,
            gainHpAddedRate: 0.0,
            gainMaxHpAddedNum: 0
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'balanced',
            scanRadius: 300
        }
    }
};

export const ATTACK_ADDER_CONFIG: MonsterConfig = {
    id: 'AttackAdder',
    baseClass: 'Monster',
    name: '加攻击辅助',
    imgIndex: 11,
    addPrice: 10,
    comment: '不停的给身边的队友增加攻击力，增加的攻击力是撞击伤害。所以你要小心一点。',
    params: {
        speedNumb: 0.55,
        bodyColor: [255, 198, 109, 1],
        gain: {
            haveGain: true,
            gainRadius: 100,
            gainFrequency: 1,
            gainR: 0.1,
            gainCollideDamageAddNum: 10,
            gainHpAddedNum: 0,
            gainSpeedNAddNum: 0.0,
            gainHpAddedRate: 0.0,
            gainMaxHpAddedNum: 0
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'threat',
            scanRadius: 300
        }
    }
};

/**
 * All support monster configurations
 */
export const SUPPORT_MONSTER_CONFIGS = [
    MEDIC_CONFIG,
    MEDIC_S_CONFIG,
    MEDIC_M_CONFIG,
    SPEED_ADDER_CONFIG,
    ATTACK_ADDER_CONFIG
];
