/**
 * Hammer tower variants
 *
 * Contains: Hammer, Hammer_Fast_1~3, Hammer_Power_1~3 (7 towers)
 * Now using data-driven configuration system.
 */

import { TowerHammer } from '../base/towerHammer';
import { registerTowersFromConfig, createTowerFromConfig } from '../config/factory';
import {
    HAMMER_TOWER_CONFIGS,
    HAMMER_CONFIG,
    HAMMER_FAST_1_CONFIG,
    HAMMER_FAST_2_CONFIG,
    HAMMER_FAST_3_CONFIG,
    HAMMER_POWER_1_CONFIG,
    HAMMER_POWER_2_CONFIG,
    HAMMER_POWER_3_CONFIG
} from '../config/hammerTowers';
import type { AnyTowerConfig } from '../config/types';

interface WorldLike {
    batterys: unknown[];
}

// Exported functions for backward compatibility
export function Hammer(world: WorldLike): TowerHammer {
    return createTowerFromConfig(HAMMER_CONFIG, world) as TowerHammer;
}

export function Hammer_Fast_1(world: WorldLike): TowerHammer {
    return createTowerFromConfig(HAMMER_FAST_1_CONFIG, world) as TowerHammer;
}

export function Hammer_Fast_2(world: WorldLike): TowerHammer {
    return createTowerFromConfig(HAMMER_FAST_2_CONFIG, world) as TowerHammer;
}

export function Hammer_Fast_3(world: WorldLike): TowerHammer {
    return createTowerFromConfig(HAMMER_FAST_3_CONFIG, world) as TowerHammer;
}

export function Hammer_Power_1(world: WorldLike): TowerHammer {
    return createTowerFromConfig(HAMMER_POWER_1_CONFIG, world) as TowerHammer;
}

export function Hammer_Power_2(world: WorldLike): TowerHammer {
    return createTowerFromConfig(HAMMER_POWER_2_CONFIG, world) as TowerHammer;
}

export function Hammer_Power_3(world: WorldLike): TowerHammer {
    return createTowerFromConfig(HAMMER_POWER_3_CONFIG, world) as TowerHammer;
}

// Register towers using configuration system
registerTowersFromConfig(HAMMER_TOWER_CONFIGS as AnyTowerConfig[]);
