/**
 * Manual Cannon tower variant
 *
 * Special tower that can attack enemy buildings.
 * Uses manual targeting with ammo system.
 */

import { TowerManualCannon } from '../base/towerManualCannon';
import { TowerRegistry, type TowerMeta } from '../towerRegistry';
import { MANUAL_CANNON_CONFIG } from '../config/manualCannonTower';
import { scalePeriod } from '../../core/speedScale';

interface WorldLike {
    batterys: unknown[];
}

/**
 * ManualCannon factory function
 */
export function ManualCannon(world: WorldLike): TowerManualCannon {
    const tower = new TowerManualCannon(0, 0, world);
    const params = MANUAL_CANNON_CONFIG.params;

    // Apply config values
    tower.name = MANUAL_CANNON_CONFIG.name;
    tower.imgIndex = MANUAL_CANNON_CONFIG.imgIndex;
    tower.price = MANUAL_CANNON_CONFIG.price;
    tower.comment = MANUAL_CANNON_CONFIG.comment;
    tower.levelUpArr = [...MANUAL_CANNON_CONFIG.levelUpArr];
    tower.levelDownGetter = MANUAL_CANNON_CONFIG.levelDownGetter;

    if (params) {
        if (params.rangeR !== undefined) tower.rangeR = params.rangeR;
        if (params.hp !== undefined) tower.hpInit(params.hp);
        if (params.maxAmmo !== undefined) tower.maxAmmo = params.maxAmmo;
        if (params.reloadTime !== undefined) tower.reloadTime = scalePeriod(params.reloadTime);
        if (params.explosionDamage !== undefined) tower.explosionDamage = params.explosionDamage;
        if (params.explosionRadius !== undefined) tower.explosionRadius = params.explosionRadius;
    }

    // Initialize ammo
    tower.currentAmmo = tower.maxAmmo;

    return tower;
}

// Register tower with registry
const meta: TowerMeta = {
    name: MANUAL_CANNON_CONFIG.name,
    imgIndex: MANUAL_CANNON_CONFIG.imgIndex,
    basePrice: MANUAL_CANNON_CONFIG.price
};

TowerRegistry.register('ManualCannon', ManualCannon, meta);
