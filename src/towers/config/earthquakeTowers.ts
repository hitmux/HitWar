/**
 * Earthquake tower configurations
 *
 * Contains: Earthquake, Earthquake_Power_1~2, Earthquake_Speed_1~2 (5 towers)
 */

import type { LaserTowerConfig } from './types';

export const EARTHQUAKE_CONFIG: LaserTowerConfig = {
    id: 'Earthquake',
    baseClass: 'TowerLaser',
    name: '地震发生器',
    imgIndex: 31,
    price: 250,
    comment: '直接发生一个地震，对范围内的敌人统一造成伤害，妥妥的群伤',
    levelUpArr: ['Earthquake_Power_1', 'Earthquake_Speed_1'],
    levelDownGetter: 'TraditionalCannon_Middle',
    params: {
        rAdd: 5,
        rangeR: 120,
        hp: 5000,
        laserBaseDamage: 500,
        laserFreezeMax: 50,
        laserMaxDamage: 200,
        laserDamagePreAdd: 5,
        attackType: 'earthquakeAttack'
    }
};

export const EARTHQUAKE_POWER_1_CONFIG: LaserTowerConfig = {
    id: 'Earthquake_Power_1',
    baseClass: 'TowerLaser',
    name: '1级重型地震发生器',
    imgIndex: 32,
    price: 260,
    comment: '很长时间才能地震一次，但是一旦地震，伤害巨大，并且还可以蓄力',
    levelUpArr: ['Earthquake_Power_2'],
    levelDownGetter: 'Earthquake',
    params: {
        rAdd: 10,
        rangeR: 250,
        hp: 10000,
        laserBaseDamage: 5000,
        laserFreezeMax: 500,
        laserMaxDamage: 5000,
        laserDamagePreAdd: 20,
        attackType: 'earthquakeAttack'
    }
};

export const EARTHQUAKE_POWER_2_CONFIG: LaserTowerConfig = {
    id: 'Earthquake_Power_2',
    baseClass: 'TowerLaser',
    name: '2级重型地震发生器',
    imgIndex: 32,
    price: 300,
    comment: '地震伤害本来很大了，但是这下子更大了',
    levelUpArr: [],
    levelDownGetter: 'Earthquake_Power_1',
    params: {
        rAdd: 15,
        rangeR: 260,
        hp: 100000,
        laserBaseDamage: 10000,
        laserFreezeMax: 500,
        laserMaxDamage: 10000,
        laserDamagePreAdd: 50,
        attackType: 'earthquakeAttack'
    }
};

export const EARTHQUAKE_SPEED_1_CONFIG: LaserTowerConfig = {
    id: 'Earthquake_Speed_1',
    baseClass: 'TowerLaser',
    name: '1级高频地震发生器',
    imgIndex: 31,
    price: 260,
    comment: '地震伤害变得很小了，但是频率非常高',
    levelUpArr: ['Earthquake_Speed_2'],
    levelDownGetter: 'Earthquake',
    params: {
        rAdd: 10,
        rangeR: 250,
        hp: 6000,
        laserBaseDamage: 100,
        laserFreezeMax: 5,
        laserMaxDamage: 200,
        laserDamagePreAdd: 5,
        attackType: 'earthquakeAttack'
    }
};

export const EARTHQUAKE_SPEED_2_CONFIG: LaserTowerConfig = {
    id: 'Earthquake_Speed_2',
    baseClass: 'TowerLaser',
    name: '2级高频地震发生器',
    imgIndex: 31,
    price: 400,
    comment: '地震的频率进一步提高了，非常快',
    levelUpArr: [],
    levelDownGetter: 'Earthquake_Speed_1',
    params: {
        rAdd: 12,
        rangeR: 300,
        hp: 9000,
        laserBaseDamage: 10,
        laserFreezeMax: 2,
        laserMaxDamage: 300,
        laserDamagePreAdd: 5,
        attackType: 'earthquakeAttack'
    }
};

export const EARTHQUAKE_TOWER_CONFIGS: LaserTowerConfig[] = [
    EARTHQUAKE_CONFIG,
    EARTHQUAKE_POWER_1_CONFIG,
    EARTHQUAKE_POWER_2_CONFIG,
    EARTHQUAKE_SPEED_1_CONFIG,
    EARTHQUAKE_SPEED_2_CONFIG
];
