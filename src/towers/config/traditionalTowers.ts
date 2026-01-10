/**
 * Traditional (military) tower configurations
 *
 * Contains: TraditionalCannon, TraditionalCannon_Small/Middle/Large/MultiTube (5 towers)
 */

import type { TowerConfig } from './types';

export const TRADITIONALCANNON_CONFIG: TowerConfig = {
    id: 'TraditionalCannon',
    baseClass: 'Tower',
    name: '军事炮塔',
    imgIndex: 20,
    price: 120,
    comment: '接下来的风格都是军事风格的炮塔',
    levelUpArr: ['TraditionalCannon_Small', 'TraditionalCannon_Middle', 'TraditionalCannon_Large', 'TraditionalCannon_MultiTube'],
    levelDownGetter: 'BasicCannon',
    params: {
        rAdd: 1,
        rangeR: 105,
        hp: 5000,
        audioSrcString: '/sound/子弹音效/军事子弹.mp3'
    }
};

export const TRADITIONALCANNON_SMALL_CONFIG: TowerConfig = {
    id: 'TraditionalCannon_Small',
    baseClass: 'Tower',
    name: '小型炮塔',
    imgIndex: 21,
    price: 120,
    comment: '该炮塔是小型枪械的过渡',
    levelUpArr: ['Rifle_1', 'MachineGun_1', 'ArmorPiercing_1'],
    levelDownGetter: 'TraditionalCannon',
    params: {
        rAdd: 2,
        rangeR: 200,
        clock: 3,
        bulletType: 'Bully_S',
        audioSrcString: '/sound/子弹音效/军事子弹.mp3'
    }
};

export const TRADITIONALCANNON_MIDDLE_CONFIG: TowerConfig = {
    id: 'TraditionalCannon_Middle',
    baseClass: 'Tower',
    name: '中型炮塔',
    imgIndex: 22,
    price: 130,
    comment: '该炮塔能发展成一些比较特殊的军事器械',
    levelUpArr: ['AirCannon_1', 'Earthquake'],
    levelDownGetter: 'TraditionalCannon',
    params: {
        rAdd: 3,
        rangeR: 200,
        clock: 3,
        bulletType: 'Bully_M',
        audioSrcString: '/sound/子弹音效/军事子弹.mp3'
    }
};

export const TRADITIONALCANNON_LARGE_CONFIG: TowerConfig = {
    id: 'TraditionalCannon_Large',
    baseClass: 'Tower',
    name: '大型炮塔',
    imgIndex: 23,
    price: 140,
    comment: '该炮塔能够发展成更有火药，伤害更强的军事器械',
    levelUpArr: ['Artillery_1', 'MissileGun_1'],
    levelDownGetter: 'TraditionalCannon',
    params: {
        rAdd: 4,
        rangeR: 200,
        clock: 3,
        bulletType: 'Bully_L',
        audioSrcString: '/sound/子弹音效/军事子弹.mp3'
    }
};

export const TRADITIONALCANNON_MULTITUBE_CONFIG: TowerConfig = {
    id: 'TraditionalCannon_MultiTube',
    baseClass: 'Tower',
    name: '双管炮塔',
    imgIndex: 24,
    price: 135,
    comment: '该炮塔主要朝着多发、散弹、群体伤害方向发展',
    levelUpArr: ['ThreeTubeCannon', 'SprayCannon_1', 'PowderCannon'],
    levelDownGetter: 'TraditionalCannon',
    params: {
        rAdd: 4,
        rangeR: 200,
        clock: 4,
        bulletType: 'Bully_M',
        bullyRotate: Math.PI / 36,
        attackBullyNum: 2,
        attackType: 'shrapnelAttack',
        audioSrcString: '/sound/子弹音效/军事子弹.mp3'
    }
};

export const TRADITIONAL_TOWER_CONFIGS: TowerConfig[] = [
    TRADITIONALCANNON_CONFIG,
    TRADITIONALCANNON_SMALL_CONFIG,
    TRADITIONALCANNON_MIDDLE_CONFIG,
    TRADITIONALCANNON_LARGE_CONFIG,
    TRADITIONALCANNON_MULTITUBE_CONFIG
];
