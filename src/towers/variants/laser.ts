/**
 * Laser tower variants
 *
 * Contains: Laser, Laser_Blue_1~3, Laser_Green_1~3, Laser_Hell_1~2,
 *           Laser_Red, Laser_Red_Alpha_1~2, Laser_Red_Beta_1~2 (14 towers)
 * Now using data-driven configuration system.
 */

import { TowerLaser } from '../base/towerLaser';
import { TowerHell } from '../base/towerHell';
import { TowerRay } from '../base/towerRay';
import { registerTowersFromConfig, createTowerFromConfig } from '../config/factory';
import {
    LASER_TOWER_CONFIGS,
    LASER_CONFIG,
    LASER_BLUE_1_CONFIG,
    LASER_BLUE_2_CONFIG,
    LASER_BLUE_3_CONFIG,
    LASER_GREEN_1_CONFIG,
    LASER_GREEN_2_CONFIG,
    LASER_GREEN_3_CONFIG,
    LASER_HELL_1_CONFIG,
    LASER_HELL_2_CONFIG,
    LASER_RED_CONFIG,
    LASER_RED_ALPHA_1_CONFIG,
    LASER_RED_ALPHA_2_CONFIG,
    LASER_RED_BETA_1_CONFIG,
    LASER_RED_BETA_2_CONFIG
} from '../config/laserTowers';
import type { AnyTowerConfig } from '../config/types';

interface WorldLike {
    batterys: unknown[];
}

// Exported functions for backward compatibility
export function Laser(world: WorldLike): TowerLaser {
    return createTowerFromConfig(LASER_CONFIG, world) as TowerLaser;
}

export function Laser_Blue_1(world: WorldLike): TowerLaser {
    return createTowerFromConfig(LASER_BLUE_1_CONFIG, world) as TowerLaser;
}

export function Laser_Blue_2(world: WorldLike): TowerLaser {
    return createTowerFromConfig(LASER_BLUE_2_CONFIG, world) as TowerLaser;
}

export function Laser_Blue_3(world: WorldLike): TowerLaser {
    return createTowerFromConfig(LASER_BLUE_3_CONFIG, world) as TowerLaser;
}

export function Laser_Hell_1(world: WorldLike): TowerHell {
    return createTowerFromConfig(LASER_HELL_1_CONFIG, world) as TowerHell;
}

export function Laser_Hell_2(world: WorldLike): TowerHell {
    return createTowerFromConfig(LASER_HELL_2_CONFIG, world) as TowerHell;
}

export function Laser_Green_1(world: WorldLike): TowerLaser {
    return createTowerFromConfig(LASER_GREEN_1_CONFIG, world) as TowerLaser;
}

export function Laser_Green_2(world: WorldLike): TowerLaser {
    return createTowerFromConfig(LASER_GREEN_2_CONFIG, world) as TowerLaser;
}

export function Laser_Green_3(world: WorldLike): TowerLaser {
    return createTowerFromConfig(LASER_GREEN_3_CONFIG, world) as TowerLaser;
}

export function Laser_Red(world: WorldLike): TowerRay {
    return createTowerFromConfig(LASER_RED_CONFIG, world) as TowerRay;
}

export function Laser_Red_Alpha_1(world: WorldLike): TowerRay {
    return createTowerFromConfig(LASER_RED_ALPHA_1_CONFIG, world) as TowerRay;
}

export function Laser_Red_Alpha_2(world: WorldLike): TowerRay {
    return createTowerFromConfig(LASER_RED_ALPHA_2_CONFIG, world) as TowerRay;
}

export function Laser_Red_Beta_1(world: WorldLike): TowerRay {
    return createTowerFromConfig(LASER_RED_BETA_1_CONFIG, world) as TowerRay;
}

export function Laser_Red_Beta_2(world: WorldLike): TowerRay {
    return createTowerFromConfig(LASER_RED_BETA_2_CONFIG, world) as TowerRay;
}

// Register towers using configuration system
registerTowersFromConfig(LASER_TOWER_CONFIGS as AnyTowerConfig[]);
