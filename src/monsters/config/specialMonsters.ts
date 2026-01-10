/**
 * Special monster configurations
 *
 * Contains: Bulldozer, Glans, witch_N, bat, Spoke, SpokeMan (6 monsters)
 */

import type { MonsterConfig } from './types';

export const BULLDOZER_CONFIG: MonsterConfig = {
    id: 'Bulldozer',
    baseClass: 'Monster',
    name: '排斥人',
    imgIndex: 5,
    addPrice: 10,
    comment: '会把你的建筑推开，和黑洞相反',
    params: {
        speedNumb: 0.3,
        r: 25,
        colishDamage: 10,
        throwAble: true,
        bodyColor: [50, 30, 50, 1],
        bodyStrokeColor: [0, 0, 0, 1],
        gravityArea: {
            haveGArea: true,
            gAreaR: 50,
            gAreaNum: -2
        }
    }
};

export const GLANS_CONFIG: MonsterConfig = {
    id: 'Glans',
    baseClass: 'Monster',
    name: '激光防御',
    imgIndex: 6,
    addPrice: 10,
    comment: '有激光防御能力，就是能摧毁射过来的子弹，但是摧毁子弹需要激光能量，激光能量是有限的，弱点是非子弹类伤害',
    params: {
        speedNumb: 0.3,
        r: 30,
        bodyColor: [152, 118, 170, 1],
        laserDefense: {
            haveLaserDefence: true,
            laserFreeze: 1,
            laserdefendPreNum: 10,
            maxLaserNum: 1000,
            laserDefendNum: 1000,
            laserRecoverFreeze: 100,
            laserRecoverNum: 20,
            laserRadius: 100
        }
    }
};

export const WITCH_N_CONFIG: MonsterConfig = {
    id: 'witch_N',
    baseClass: 'Monster',
    name: '召唤师',
    imgIndex: 17,
    addPrice: 10,
    comment: '召唤师会不停的召唤小怪物',
    params: {
        speedNumb: 0.3,
        r: 30,
        bodyColor: [152, 118, 170, 0.8],
        bodyStrokeColor: [152, 118, 170, 1],
        bodyStrokeWidth: 5,
        summon: {
            deadSummonAble: true,
            summonAble: true,
            summonCount: 4,
            summonDistance: 45, // ~30 + 15 (avg of random 30-60)
            summonMonsterName: 'bat'
        }
    }
};

export const BAT_CONFIG: MonsterConfig = {
    id: 'bat',
    baseClass: 'Monster',
    name: '小怪物',
    imgIndex: 18,
    addPrice: 10,
    comment: '快速飞到你的大本，对你的大本造成撞击伤害',
    params: {
        speedNumb: 3,
        r: 5,
        accelerationV: 0.01,
        maxSpeedN: 5,
        bodyColor: [152, 118, 170, 0.8],
        bodyStrokeColor: [152, 118, 170, 1],
        bodyStrokeWidth: 5
    }
};

export const SPOKE_CONFIG: MonsterConfig = {
    id: 'Spoke',
    baseClass: 'Monster',
    name: '摇摆人',
    imgIndex: 19,
    comment: '一种移动路径来回摇摆的普通人',
    params: {
        speedNumb: 3,
        movementType: 'swing'
    }
};

export const SPOKEMAN_CONFIG: MonsterConfig = {
    id: 'SpokeMan',
    baseClass: 'Monster',
    name: '突进人',
    imgIndex: 20,
    comment: '一种路径来回前后突进的普通怪物',
    params: {
        speedNumb: 3,
        movementType: 'suddenly'
    }
};

/**
 * All special monster configurations
 */
export const SPECIAL_MONSTER_CONFIGS = [
    BULLDOZER_CONFIG,
    GLANS_CONFIG,
    WITCH_N_CONFIG,
    BAT_CONFIG,
    SPOKE_CONFIG,
    SPOKEMAN_CONFIG
];
