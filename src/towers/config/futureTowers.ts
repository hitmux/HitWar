/**
 * Future tech tower configurations
 *
 * Contains: FutureCannon_1~5 (5 towers)
 */

import type { RayTowerConfig } from './types';

export const FUTURECANNON_1_CONFIG: RayTowerConfig = {
    id: 'FutureCannon_1',
    baseClass: 'TowerRay',
    name: '高科技炮塔',
    imgIndex: 50,
    price: 800,
    comment: '想要获取更强大的激光、闪电等等的高科技武器，就要从此处升级开始，该高科技炮塔会发射激光粒子子弹',
    levelUpArr: ['FutureCannon_2', 'Thunder_1', 'Laser'],
    levelDownGetter: 'BasicCannon',
    params: {
        rAdd: 1,
        rangeR: 150,
        hp: 5000,
        rayMoveSpeed: 10,
        rayMaxRange: 200,
        rayClock: 10,
        rayNum: 1,
        rayDeviationRotate: 0,
        damage: 15,
        rayThrowAble: false,
        rayLen: 15,
        rayWidth: 2,
        rayColor: [69, 214, 165, 1],
        attackType: 'shootingAttack',
        audioSrcString: '/sound/发射音效/高科技塔发射.mp3'
    }
};

export const FUTURECANNON_2_CONFIG: RayTowerConfig = {
    id: 'FutureCannon_2',
    baseClass: 'TowerRay',
    name: '2级高科技塔',
    imgIndex: 51,
    price: 300,
    comment: '高科技塔，发射的光粒子弹加强了',
    levelUpArr: ['FutureCannon_3'],
    levelDownGetter: 'FutureCannon_1',
    params: {
        rAdd: 5,
        rangeR: 170,
        hp: 10000,
        rayMoveSpeed: 15,
        rayMaxRange: 250,
        rayClock: 6,
        rayNum: 1,
        rayDeviationRotate: 0,
        damage: 20,
        rayThrowAble: false,
        rayLen: 30,
        rayWidth: 4,
        rayColor: [69, 200, 165, 0.9],
        attackType: 'shootingAttack'
    }
};

export const FUTURECANNON_3_CONFIG: RayTowerConfig = {
    id: 'FutureCannon_3',
    baseClass: 'TowerRay',
    name: '3级高科技塔',
    imgIndex: 52,
    price: 600,
    comment: '发射的子弹进一步加强',
    levelUpArr: ['FutureCannon_4'],
    levelDownGetter: 'FutureCannon_2',
    params: {
        rAdd: 7,
        rangeR: 200,
        hp: 20000,
        rayMoveSpeed: 17,
        rayMaxRange: 300,
        rayClock: 5,
        rayNum: 1,
        rayDeviationRotate: 0.1,
        damage: 35,
        rayThrowAble: true,
        rayLen: 40,
        rayWidth: 5,
        rayColor: [69, 195, 165, 0.6],
        attackType: 'shootingAttack'
    }
};

export const FUTURECANNON_4_CONFIG: RayTowerConfig = {
    id: 'FutureCannon_4',
    baseClass: 'TowerRay',
    name: '4级高科技塔',
    imgIndex: 53,
    price: 800,
    comment: '发射的子弹能够穿过敌人了',
    levelUpArr: ['FutureCannon_5'],
    levelDownGetter: 'FutureCannon_3',
    params: {
        rAdd: 9,
        rangeR: 250,
        hp: 50000,
        rayMoveSpeed: 16,
        rayMaxRange: 400,
        rayClock: 4,
        rayNum: 1,
        rayDeviationRotate: 0.2,
        damage: 37,
        rayThrowAble: true,
        rayLen: 40,
        rayWidth: 6,
        rayColor: [69, 180, 165, 0.6],
        attackType: 'shootingAttack'
    }
};

export const FUTURECANNON_5_CONFIG: RayTowerConfig = {
    id: 'FutureCannon_5',
    baseClass: 'TowerRay',
    name: '5级高科技塔',
    imgIndex: 54,
    price: 1200,
    comment: '发射的子弹进一步加强了',
    levelUpArr: [],
    levelDownGetter: 'FutureCannon_4',
    params: {
        rAdd: 12,
        rangeR: 280,
        hp: 100000,
        rayMoveSpeed: 16,
        rayMaxRange: 400,
        rayClock: 2,
        rayNum: 1,
        rayDeviationRotate: 0.3,
        damage: 40,
        rayThrowAble: true,
        rayLen: 45,
        rayWidth: 7,
        rayColor: [69, 150, 165, 0.6],
        attackType: 'shootingAttack'
    }
};

export const FUTURE_TOWER_CONFIGS: RayTowerConfig[] = [
    FUTURECANNON_1_CONFIG,
    FUTURECANNON_2_CONFIG,
    FUTURECANNON_3_CONFIG,
    FUTURECANNON_4_CONFIG,
    FUTURECANNON_5_CONFIG
];
