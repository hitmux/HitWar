/**
 * Shot/Shotgun tower variants
 *
 * Contains: ThreeTubeCannon, Shotgun_1~2, ShotCannon_1~2 (5 towers)
 * Now using data-driven configuration system.
 */

import { Tower } from '../base/tower';
import { registerTowersFromConfig, createTowerFromConfig } from '../config/factory';
import {
    SHOT_TOWER_CONFIGS,
    THREE_TUBE_CANNON_CONFIG,
    SHOTGUN_1_CONFIG,
    SHOTGUN_2_CONFIG,
    SHOTCANNON_1_CONFIG,
    SHOTCANNON_2_CONFIG
} from '../config/shotTowers';
import type { TowerConfig } from '../config/types';

interface WorldLike {
    batterys: unknown[];
}

// Exported functions for backward compatibility
export function ThreeTubeCannon(world: WorldLike): Tower {
    return createTowerFromConfig(THREE_TUBE_CANNON_CONFIG, world);
}

export function Shotgun_1(world: WorldLike): Tower {
    return createTowerFromConfig(SHOTGUN_1_CONFIG, world);
}

export function Shotgun_2(world: WorldLike): Tower {
    return createTowerFromConfig(SHOTGUN_2_CONFIG, world);
}

export function ShotCannon_1(world: WorldLike): Tower {
    return createTowerFromConfig(SHOTCANNON_1_CONFIG, world);
}

export function ShotCannon_2(world: WorldLike): Tower {
    return createTowerFromConfig(SHOTCANNON_2_CONFIG, world);
}

// Register towers using configuration system
registerTowersFromConfig(SHOT_TOWER_CONFIGS as TowerConfig[]);
