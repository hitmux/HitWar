/**
 * Thunder tower variants
 *
 * Contains: Thunder_1~2, Thunder_Far_1~2, Thunder_Power_1~2, ThunderBall_1~3 (9 towers)
 * Now using data-driven configuration system.
 */

import { Tower } from '../base/tower';
import { TowerLaser } from '../base/towerLaser';
import { registerTowersFromConfig, createTowerFromConfig } from '../config/factory';
import {
    THUNDER_TOWER_CONFIGS,
    THUNDER_1_CONFIG,
    THUNDER_2_CONFIG,
    THUNDER_FAR_1_CONFIG,
    THUNDER_FAR_2_CONFIG,
    THUNDER_POWER_1_CONFIG,
    THUNDER_POWER_2_CONFIG,
    THUNDERBALL_1_CONFIG,
    THUNDERBALL_2_CONFIG,
    THUNDERBALL_3_CONFIG
} from '../config/thunderTowers';
import type { AnyTowerConfig } from '../config/types';

interface WorldLike {
    batterys: unknown[];
}

// Exported functions for backward compatibility
export function Thunder_1(world: WorldLike): TowerLaser {
    return createTowerFromConfig(THUNDER_1_CONFIG, world) as TowerLaser;
}

export function Thunder_2(world: WorldLike): TowerLaser {
    return createTowerFromConfig(THUNDER_2_CONFIG, world) as TowerLaser;
}

export function Thunder_Far_1(world: WorldLike): TowerLaser {
    return createTowerFromConfig(THUNDER_FAR_1_CONFIG, world) as TowerLaser;
}

export function Thunder_Far_2(world: WorldLike): TowerLaser {
    return createTowerFromConfig(THUNDER_FAR_2_CONFIG, world) as TowerLaser;
}

export function Thunder_Power_1(world: WorldLike): TowerLaser {
    return createTowerFromConfig(THUNDER_POWER_1_CONFIG, world) as TowerLaser;
}

export function Thunder_Power_2(world: WorldLike): TowerLaser {
    return createTowerFromConfig(THUNDER_POWER_2_CONFIG, world) as TowerLaser;
}

export function ThunderBall_1(world: WorldLike): Tower {
    return createTowerFromConfig(THUNDERBALL_1_CONFIG, world);
}

export function ThunderBall_2(world: WorldLike): Tower {
    return createTowerFromConfig(THUNDERBALL_2_CONFIG, world);
}

export function ThunderBall_3(world: WorldLike): Tower {
    return createTowerFromConfig(THUNDERBALL_3_CONFIG, world);
}

// Register towers using configuration system
registerTowersFromConfig(THUNDER_TOWER_CONFIGS as AnyTowerConfig[]);
