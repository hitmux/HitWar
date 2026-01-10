/**
 * Boomerang tower variants
 *
 * Contains: Boomerang, Boomerang_Far_1~3, Boomerang_Power_1~3 (7 towers)
 * Now using data-driven configuration system.
 */

import { TowerBoomerang } from '../base/towerBoomerang';
import { registerTowersFromConfig, createTowerFromConfig } from '../config/factory';
import {
    BOOMERANG_TOWER_CONFIGS,
    BOOMERANG_CONFIG,
    BOOMERANG_FAR_1_CONFIG,
    BOOMERANG_FAR_2_CONFIG,
    BOOMERANG_FAR_3_CONFIG,
    BOOMERANG_POWER_1_CONFIG,
    BOOMERANG_POWER_2_CONFIG,
    BOOMERANG_POWER_3_CONFIG
} from '../config/boomerangTowers';
import type { AnyTowerConfig } from '../config/types';

interface WorldLike {
    batterys: unknown[];
}

// Exported functions for backward compatibility
export function Boomerang(world: WorldLike): TowerBoomerang {
    const tower = createTowerFromConfig(BOOMERANG_CONFIG, world) as TowerBoomerang;
    tower.bar = tower.initBar();
    return tower;
}

export function Boomerang_Far_1(world: WorldLike): TowerBoomerang {
    const tower = createTowerFromConfig(BOOMERANG_FAR_1_CONFIG, world) as TowerBoomerang;
    tower.bar = tower.initBar();
    return tower;
}

export function Boomerang_Far_2(world: WorldLike): TowerBoomerang {
    const tower = createTowerFromConfig(BOOMERANG_FAR_2_CONFIG, world) as TowerBoomerang;
    tower.bar = tower.initBar();
    return tower;
}

export function Boomerang_Far_3(world: WorldLike): TowerBoomerang {
    const tower = createTowerFromConfig(BOOMERANG_FAR_3_CONFIG, world) as TowerBoomerang;
    tower.bar = tower.initBar();
    return tower;
}

export function Boomerang_Power_1(world: WorldLike): TowerBoomerang {
    const tower = createTowerFromConfig(BOOMERANG_POWER_1_CONFIG, world) as TowerBoomerang;
    tower.bar = tower.initBar();
    return tower;
}

export function Boomerang_Power_2(world: WorldLike): TowerBoomerang {
    const tower = createTowerFromConfig(BOOMERANG_POWER_2_CONFIG, world) as TowerBoomerang;
    tower.bar = tower.initBar();
    return tower;
}

export function Boomerang_Power_3(world: WorldLike): TowerBoomerang {
    const tower = createTowerFromConfig(BOOMERANG_POWER_3_CONFIG, world) as TowerBoomerang;
    tower.bar = tower.initBar();
    return tower;
}

// Register towers using configuration system
registerTowersFromConfig(BOOMERANG_TOWER_CONFIGS as AnyTowerConfig[]);
