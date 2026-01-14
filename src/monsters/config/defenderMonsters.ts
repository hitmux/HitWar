/**
 * Defender monster configurations
 *
 * Contains: BulletWearer, BulletRepellent, DamageReducers, BlackHole (4 monsters)
 */

import type { MonsterConfig } from './types';

export const BULLET_WEARER_CONFIG: MonsterConfig = {
    id: 'BulletWearer',
    baseClass: 'Monster',
    name: '子弹削子',
    imgIndex: 12,
    addPrice: 5,
    comment: '自身会有一个场，这个场里的子弹会不停的减少子弹半径',
    params: {
        speedNumb: 0.35,
        bodyColor: [62, 134, 160, 1],
        bullyChange: {
            haveBullyChangeArea: true,
            r: 100,
            f: 5,
            bullyDR: -1
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'balanced',
            scanRadius: 300
        }
    }
};

export const BULLET_REPELLENT_CONFIG: MonsterConfig = {
    id: 'BulletRepellent',
    baseClass: 'Monster',
    name: '子弹排斥',
    imgIndex: 13,
    addPrice: 5,
    comment: '自身会有一个排斥子弹的场，能够把场内的飞过来的子弹向外排斥，改变子弹的轨迹，只是对子弹有效果，对激光和其他武器没有效果',
    params: {
        speedNumb: 0.25,
        bodyColor: [186, 166, 128, 1],
        bullyChange: {
            haveBullyChangeArea: true,
            r: 150,
            f: 1,
            bullyAN: 1
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'balanced',
            scanRadius: 300
        }
    }
};

export const DAMAGE_REDUCERS_CONFIG: MonsterConfig = {
    id: 'DamageReducers',
    baseClass: 'Monster',
    name: '子弹削弱',
    imgIndex: 14,
    addPrice: 5,
    comment: '能够对自身一定范围内的区域内的所有子弹减少伤害，伤害小的子弹比如小枪的子弹可能就没有伤害了。',
    params: {
        speedNumb: 0.35,
        bodyColor: [190, 145, 23, 1],
        bullyChange: {
            haveBullyChangeArea: true,
            r: 150,
            f: 1,
            bullyDD: -1
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'balanced',
            scanRadius: 300
        }
    }
};

export const BLACK_HOLE_CONFIG: MonsterConfig = {
    id: 'BlackHole',
    baseClass: 'Monster',
    name: '黑洞',
    imgIndex: 4,
    addPrice: 10,
    comment: '会把你的建筑吸走',
    params: {
        speedNumb: 0.2,
        r: 30,
        colishDamage: 10,
        throwAble: true,
        bodyColor: [0, 0, 0, 1],
        bodyStrokeColor: [0, 0, 0, 1],
        gravityArea: {
            haveGArea: true,
            gAreaR: 160,
            gAreaNum: 2
        },
        targetSelection: {
            targetSelectionAble: true,
            strategy: 'threat',
            scanRadius: 400
        }
    }
};

/**
 * All defender monster configurations
 */
export const DEFENDER_MONSTER_CONFIGS = [
    BULLET_WEARER_CONFIG,
    BULLET_REPELLENT_CONFIG,
    DAMAGE_REDUCERS_CONFIG,
    BLACK_HOLE_CONFIG
];
