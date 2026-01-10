/**
 * Spray cannon tower variants
 *
 * Contains: SprayCannon_1~3, SprayCannon_Double, SprayCannon_Three (5 towers)
 * Now using data-driven configuration system.
 */

import { Tower } from '../base/tower';
import { registerTowersFromConfig, createTowerFromConfig } from '../config/factory';
import {
    SPRAY_TOWER_CONFIGS,
    SPRAYCANNON_1_CONFIG,
    SPRAYCANNON_2_CONFIG,
    SPRAYCANNON_3_CONFIG,
    SPRAYCANNON_DOUBLE_CONFIG,
    SPRAYCANNON_THREE_CONFIG
} from '../config/sprayTowers';
import type { TowerConfig } from '../config/types';

interface WorldLike {
    batterys: unknown[];
}

// Exported functions for backward compatibility
export function SprayCannon_1(world: WorldLike): Tower {
    return createTowerFromConfig(SPRAYCANNON_1_CONFIG, world);
}

export function SprayCannon_2(world: WorldLike): Tower {
    return createTowerFromConfig(SPRAYCANNON_2_CONFIG, world);
}

export function SprayCannon_3(world: WorldLike): Tower {
    return createTowerFromConfig(SPRAYCANNON_3_CONFIG, world);
}

export function SprayCannon_Double(world: WorldLike): Tower {
    return createTowerFromConfig(SPRAYCANNON_DOUBLE_CONFIG, world);
}

export function SprayCannon_Three(world: WorldLike): Tower {
    return createTowerFromConfig(SPRAYCANNON_THREE_CONFIG, world);
}

// Register towers using configuration system
registerTowersFromConfig(SPRAY_TOWER_CONFIGS as TowerConfig[]);
