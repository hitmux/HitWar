/**
 * Traditional (military) tower variants
 *
 * Contains: TraditionalCannon, TraditionalCannon_Small/Middle/Large/MultiTube (5 towers)
 * Now using data-driven configuration system.
 */

import { Tower } from '../base/tower';
import { registerTowersFromConfig, createTowerFromConfig } from '../config/factory';
import {
    TRADITIONAL_TOWER_CONFIGS,
    TRADITIONALCANNON_CONFIG,
    TRADITIONALCANNON_SMALL_CONFIG,
    TRADITIONALCANNON_MIDDLE_CONFIG,
    TRADITIONALCANNON_LARGE_CONFIG,
    TRADITIONALCANNON_MULTITUBE_CONFIG
} from '../config/traditionalTowers';
import type { TowerConfig } from '../config/types';

interface WorldLike {
    batterys: unknown[];
}

// Exported functions for backward compatibility
export function TraditionalCannon(world: WorldLike): Tower {
    return createTowerFromConfig(TRADITIONALCANNON_CONFIG, world);
}

export function TraditionalCannon_Small(world: WorldLike): Tower {
    return createTowerFromConfig(TRADITIONALCANNON_SMALL_CONFIG, world);
}

export function TraditionalCannon_Middle(world: WorldLike): Tower {
    return createTowerFromConfig(TRADITIONALCANNON_MIDDLE_CONFIG, world);
}

export function TraditionalCannon_Large(world: WorldLike): Tower {
    return createTowerFromConfig(TRADITIONALCANNON_LARGE_CONFIG, world);
}

export function TraditionalCannon_MultiTube(world: WorldLike): Tower {
    return createTowerFromConfig(TRADITIONALCANNON_MULTITUBE_CONFIG, world);
}

// Register towers using configuration system
registerTowersFromConfig(TRADITIONAL_TOWER_CONFIGS as TowerConfig[]);
