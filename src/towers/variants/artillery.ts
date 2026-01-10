/**
 * Artillery tower variants
 *
 * Contains: Artillery_1~3, MissileGun_1~3 (6 towers)
 * Now using data-driven configuration system.
 */

import { Tower } from '../base/tower';
import { registerTowersFromConfig, createTowerFromConfig } from '../config/factory';
import {
    ARTILLERY_TOWER_CONFIGS,
    ARTILLERY_1_CONFIG,
    ARTILLERY_2_CONFIG,
    ARTILLERY_3_CONFIG,
    MISSILEGUN_1_CONFIG,
    MISSILEGUN_2_CONFIG,
    MISSILEGUN_3_CONFIG
} from '../config/artilleryTowers';
import type { TowerConfig } from '../config/types';

interface WorldLike {
    batterys: unknown[];
}

// Exported functions for backward compatibility
export function Artillery_1(world: WorldLike): Tower {
    return createTowerFromConfig(ARTILLERY_1_CONFIG, world);
}

export function Artillery_2(world: WorldLike): Tower {
    return createTowerFromConfig(ARTILLERY_2_CONFIG, world);
}

export function Artillery_3(world: WorldLike): Tower {
    return createTowerFromConfig(ARTILLERY_3_CONFIG, world);
}

export function MissileGun_1(world: WorldLike): Tower {
    return createTowerFromConfig(MISSILEGUN_1_CONFIG, world);
}

export function MissileGun_2(world: WorldLike): Tower {
    return createTowerFromConfig(MISSILEGUN_2_CONFIG, world);
}

export function MissileGun_3(world: WorldLike): Tower {
    return createTowerFromConfig(MISSILEGUN_3_CONFIG, world);
}

// Register towers using configuration system
registerTowersFromConfig(ARTILLERY_TOWER_CONFIGS as TowerConfig[]);
