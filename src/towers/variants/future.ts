/**
 * Future tech tower variants
 *
 * Contains: FutureCannon_1~5 (5 towers)
 * Now using data-driven configuration system.
 */

import { TowerRay } from '../base/towerRay';
import { registerTowersFromConfig, createTowerFromConfig } from '../config/factory';
import {
    FUTURE_TOWER_CONFIGS,
    FUTURECANNON_1_CONFIG,
    FUTURECANNON_2_CONFIG,
    FUTURECANNON_3_CONFIG,
    FUTURECANNON_4_CONFIG,
    FUTURECANNON_5_CONFIG
} from '../config/futureTowers';
import type { AnyTowerConfig } from '../config/types';

interface WorldLike {
    batterys: unknown[];
}

// Exported functions for backward compatibility
export function FutureCannon_1(world: WorldLike): TowerRay {
    return createTowerFromConfig(FUTURECANNON_1_CONFIG, world) as TowerRay;
}

export function FutureCannon_2(world: WorldLike): TowerRay {
    return createTowerFromConfig(FUTURECANNON_2_CONFIG, world) as TowerRay;
}

export function FutureCannon_3(world: WorldLike): TowerRay {
    return createTowerFromConfig(FUTURECANNON_3_CONFIG, world) as TowerRay;
}

export function FutureCannon_4(world: WorldLike): TowerRay {
    return createTowerFromConfig(FUTURECANNON_4_CONFIG, world) as TowerRay;
}

export function FutureCannon_5(world: WorldLike): TowerRay {
    return createTowerFromConfig(FUTURECANNON_5_CONFIG, world) as TowerRay;
}

// Register towers using configuration system
registerTowersFromConfig(FUTURE_TOWER_CONFIGS as AnyTowerConfig[]);
