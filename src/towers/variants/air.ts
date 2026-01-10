/**
 * Air cannon tower variants
 *
 * Contains: AirCannon_1~3 (3 towers)
 * Now using data-driven configuration system.
 */

import { TowerRay } from '../base/towerRay';
import { registerTowersFromConfig, createTowerFromConfig } from '../config/factory';
import {
    AIR_TOWER_CONFIGS,
    AIRCANNON_1_CONFIG,
    AIRCANNON_2_CONFIG,
    AIRCANNON_3_CONFIG
} from '../config/airTowers';
import type { AnyTowerConfig } from '../config/types';

interface WorldLike {
    batterys: unknown[];
}

// Exported functions for backward compatibility
export function AirCannon_1(world: WorldLike): TowerRay {
    return createTowerFromConfig(AIRCANNON_1_CONFIG, world) as TowerRay;
}

export function AirCannon_2(world: WorldLike): TowerRay {
    return createTowerFromConfig(AIRCANNON_2_CONFIG, world) as TowerRay;
}

export function AirCannon_3(world: WorldLike): TowerRay {
    return createTowerFromConfig(AIRCANNON_3_CONFIG, world) as TowerRay;
}

// Register towers using configuration system
registerTowersFromConfig(AIR_TOWER_CONFIGS as AnyTowerConfig[]);
