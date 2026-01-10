/**
 * Air cannon tower configurations
 *
 * Contains: AirCannon_1~3 (3 towers)
 */

import type { RayTowerConfig } from './types';

export const AIRCANNON_1_CONFIG: RayTowerConfig = {
    id: 'AirCannon_1',
    baseClass: 'TowerRay',
    name: '1级空气炮',
    imgIndex: 30,
    price: 300,
    comment: '发射出一个空气波，这个空气波对怪物具有击退作用',
    levelUpArr: ['AirCannon_2'],
    levelDownGetter: 'TraditionalCannon_Middle',
    params: {
        rAdd: 5,
        rangeR: 120,
        hp: 4000,
        rayMoveSpeed: 8,
        rayMaxRange: 300,
        rayClock: 50,
        rayLen: 30,
        rayWidth: 10,
        rayRepel: 0.1,
        rayColor: [103, 150, 138, 0.5],
        attackType: 'gerAttack'
    }
};

export const AIRCANNON_2_CONFIG: RayTowerConfig = {
    id: 'AirCannon_2',
    baseClass: 'TowerRay',
    name: '2级空气炮',
    imgIndex: 30,
    price: 320,
    comment: '击退作用加强，运用的好可能可以赖敌人',
    levelUpArr: ['AirCannon_3'],
    levelDownGetter: 'AirCannon_1',
    params: {
        rAdd: 7,
        rangeR: 130,
        hp: 5000,
        rayMoveSpeed: 9,
        rayMaxRange: 300,
        rayClock: 50,
        rayLen: 40,
        rayRepel: 0.2,
        rayColor: [103, 150, 138, 0.5],
        attackType: 'gerAttack'
    }
};

export const AIRCANNON_3_CONFIG: RayTowerConfig = {
    id: 'AirCannon_3',
    baseClass: 'TowerRay',
    name: '3级空气炮',
    imgIndex: 30,
    price: 400,
    comment: '击退进一步加强了',
    levelUpArr: [],
    levelDownGetter: 'AirCannon_2',
    params: {
        rAdd: 8,
        rangeR: 150,
        hp: 10000,
        rayMoveSpeed: 10,
        rayMaxRange: 300,
        rayClock: 50,
        rayLen: 50,
        rayRepel: 0.25,
        rayColor: [103, 150, 138, 0.5],
        attackType: 'gerAttack'
    }
};

export const AIR_TOWER_CONFIGS: RayTowerConfig[] = [
    AIRCANNON_1_CONFIG,
    AIRCANNON_2_CONFIG,
    AIRCANNON_3_CONFIG
];
