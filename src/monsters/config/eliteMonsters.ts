/**
 * Elite monster configurations
 *
 * Contains: Exciting, Visitor, Enderman, Mts, T800 (5 monsters)
 */

import type { MonsterConfig, MortisMonsterConfig, TerminatorMonsterConfig } from './types';

export const EXCITING_CONFIG: MonsterConfig = {
    id: 'Exciting',
    baseClass: 'Monster',
    name: '激动人',
    imgIndex: 21,
    comment: '一种移动路径前后更加剧烈的快速的怪物，看起来很激动',
    params: {
        speedNumb: 3,
        movementType: 'exciting',
        dodge: {
            dodgeAble: true,
            detectRadius: 120,
            dodgeStrength: 8
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'balanced',
            scanRadius: 300
        }
    }
};

export const VISITOR_CONFIG: MonsterConfig = {
    id: 'Visitor',
    baseClass: 'Monster',
    name: '旋转人',
    imgIndex: 22,
    comment: '移动路径会很怪，它会旋转的走向目标，绕很多圈才会进行撞击，像是来参观的',
    params: {
        speedNumb: 3,
        movementType: 'doubleSwing',
        dodge: {
            dodgeAble: true,
            detectRadius: 120,
            dodgeStrength: 7
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'balanced',
            scanRadius: 300
        }
    }
};

export const ENDERMAN_CONFIG: MonsterConfig = {
    id: 'Enderman',
    baseClass: 'Monster',
    name: '小黑',
    imgIndex: 23,
    comment: '一旦受到子弹碰撞，就会瞬移，所以它免疫子弹撞击伤害（不能免疫爆炸等其他伤害），但是它可能会一不小心瞬移到你的建筑上，然后撞死了。',
    params: {
        speedNumb: 1,
        teleportingAble: true,
        dodge: {
            dodgeAble: true,
            detectRadius: 150,
            dodgeStrength: 10
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'threat',
            scanRadius: 350
        }
    }
};

export const MTS_CONFIG: MortisMonsterConfig = {
    id: 'Mts',
    baseClass: 'MonsterMortis',
    name: '忍者',
    imgIndex: 24,
    addPrice: 40, // addPrice will be 10 + 40 = 50
    comment: '像忍者一样，一旦发现了你的建筑，便会迅速对你的建筑进行收割，像忍者一样来回穿过你的建筑，对你的建筑造成伤害',
    params: {
        r: 35,
        speedNumb: 1,
        dodge: {
            dodgeAble: true,
            detectRadius: 130,
            dodgeStrength: 9
        }
    }
};

export const T800_CONFIG: TerminatorMonsterConfig = {
    id: 'T800',
    baseClass: 'MonsterTerminator',
    name: '恐怖机器人',
    imgIndex: 25,
    addPrice: 590, // addPrice will be 10 + 590 = 600
    comment: '一种由金属打造而成的恐怖机器，威力小的子弹几乎对他没有伤害。具有很强的近战能力。'
};

/**
 * All elite monster configurations
 */
export const ELITE_MONSTER_CONFIGS = [
    EXCITING_CONFIG,
    VISITOR_CONFIG,
    ENDERMAN_CONFIG,
    MTS_CONFIG,
    T800_CONFIG
];
