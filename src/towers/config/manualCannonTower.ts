/**
 * Manual Cannon tower configuration
 *
 * Special tower that can attack enemy buildings.
 * Only one tower type - no upgrade tree (intentional design).
 */

import type { TowerBaseConfig, TowerParams } from './types';

/**
 * Manual cannon specific parameters
 */
export interface ManualCannonParams extends TowerParams {
    /** Maximum ammo capacity */
    maxAmmo?: number;
    /** Ticks to reload one ammo (before speed scaling) */
    reloadTime?: number;
    /** Explosion damage */
    explosionDamage?: number;
    /** Explosion radius */
    explosionRadius?: number;
}

/**
 * Manual cannon tower config type
 */
export interface ManualCannonTowerConfig extends TowerBaseConfig {
    baseClass: 'TowerManualCannon';
    params?: ManualCannonParams;
}

/**
 * ManualCannon - The only tower that can attack enemy buildings
 */
export const MANUAL_CANNON_CONFIG: ManualCannonTowerConfig = {
    id: 'ManualCannon',
    baseClass: 'TowerManualCannon',
    name: '手动炮塔',
    imgIndex: 100,
    price: 800,
    comment: '唯一能够攻击敌方建筑的塔。需要手动瞄准目标，发射爆炸性炮弹。弹药有限，需要时间装填。',
    levelUpArr: [], // No upgrades - intentional
    levelDownGetter: null, // Cannot downgrade
    params: {
        rAdd: 0, // r = 12 (set in constructor)
        rangeR: 400,
        hp: 2000,
        maxAmmo: 3,
        reloadTime: 60, // ~1 second at base speed
        explosionDamage: 100,
        explosionRadius: 50
    }
};

export const MANUAL_CANNON_TOWER_CONFIGS: ManualCannonTowerConfig[] = [
    MANUAL_CANNON_CONFIG
];
