/**
 * Stone/Cannon tower variants
 *
 * Contains: StoneCannon, StoneCannon_Far_1~3, StoneCannon_Power_1~3 (7 towers)
 * Now using data-driven configuration system.
 */

import { Tower } from '../base/tower';
import { registerTowersFromConfig, createTowerFromConfig } from '../config/factory';
import {
    STONE_TOWER_CONFIGS,
    STONECANNON_CONFIG,
    STONECANNON_FAR_1_CONFIG,
    STONECANNON_FAR_2_CONFIG,
    STONECANNON_FAR_3_CONFIG,
    STONECANNON_POWER_1_CONFIG,
    STONECANNON_POWER_2_CONFIG,
    STONECANNON_POWER_3_CONFIG
} from '../config/stoneTowers';
import type { TowerConfig } from '../config/types';

interface WorldLike {
    batterys: unknown[];
}

// Exported functions for backward compatibility
export function StoneCannon(world: WorldLike): Tower {
    return createTowerFromConfig(STONECANNON_CONFIG, world);
}

export function StoneCannon_Far_1(world: WorldLike): Tower {
    return createTowerFromConfig(STONECANNON_FAR_1_CONFIG, world);
}

export function StoneCannon_Far_2(world: WorldLike): Tower {
    return createTowerFromConfig(STONECANNON_FAR_2_CONFIG, world);
}

export function StoneCannon_Far_3(world: WorldLike): Tower {
    return createTowerFromConfig(STONECANNON_FAR_3_CONFIG, world);
}

export function StoneCannon_Power_1(world: WorldLike): Tower {
    return createTowerFromConfig(STONECANNON_POWER_1_CONFIG, world);
}

export function StoneCannon_Power_2(world: WorldLike): Tower {
    return createTowerFromConfig(STONECANNON_POWER_2_CONFIG, world);
}

export function StoneCannon_Power_3(world: WorldLike): Tower {
    return createTowerFromConfig(STONECANNON_POWER_3_CONFIG, world);
}

// Register towers using configuration system
registerTowersFromConfig(STONE_TOWER_CONFIGS as TowerConfig[]);
