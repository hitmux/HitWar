/**
 * Earthquake tower variants
 *
 * Contains: Earthquake, Earthquake_Power_1~2, Earthquake_Speed_1~2 (5 towers)
 * Now using data-driven configuration system.
 */

import { TowerLaser } from '../base/towerLaser';
import { registerTowersFromConfig, createTowerFromConfig } from '../config/factory';
import {
    EARTHQUAKE_TOWER_CONFIGS,
    EARTHQUAKE_CONFIG,
    EARTHQUAKE_POWER_1_CONFIG,
    EARTHQUAKE_POWER_2_CONFIG,
    EARTHQUAKE_SPEED_1_CONFIG,
    EARTHQUAKE_SPEED_2_CONFIG
} from '../config/earthquakeTowers';
import type { AnyTowerConfig } from '../config/types';

interface WorldLike {
    batterys: unknown[];
}

// Exported functions for backward compatibility
export function Earthquake(world: WorldLike): TowerLaser {
    return createTowerFromConfig(EARTHQUAKE_CONFIG, world) as TowerLaser;
}

export function Earthquake_Power_1(world: WorldLike): TowerLaser {
    return createTowerFromConfig(EARTHQUAKE_POWER_1_CONFIG, world) as TowerLaser;
}

export function Earthquake_Power_2(world: WorldLike): TowerLaser {
    return createTowerFromConfig(EARTHQUAKE_POWER_2_CONFIG, world) as TowerLaser;
}

export function Earthquake_Speed_1(world: WorldLike): TowerLaser {
    return createTowerFromConfig(EARTHQUAKE_SPEED_1_CONFIG, world) as TowerLaser;
}

export function Earthquake_Speed_2(world: WorldLike): TowerLaser {
    return createTowerFromConfig(EARTHQUAKE_SPEED_2_CONFIG, world) as TowerLaser;
}

// Register towers using configuration system
registerTowersFromConfig(EARTHQUAKE_TOWER_CONFIGS as AnyTowerConfig[]);
