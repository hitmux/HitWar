/**
 * Elemental tower variants
 *
 * Contains: Flamethrower_1~2, FrozenCannon_1~2, Poison_1~2, PowderCannon (7 towers)
 * Now using data-driven configuration system.
 */

import { Tower } from '../base/tower';
import { registerTowersFromConfig, createTowerFromConfig } from '../config/factory';
import {
    ELEMENTAL_TOWER_CONFIGS,
    POWDERCANNON_CONFIG,
    FLAMETHROWER_1_CONFIG,
    FLAMETHROWER_2_CONFIG,
    FROZENCANNON_1_CONFIG,
    FROZENCANNON_2_CONFIG,
    POISON_1_CONFIG,
    POISON_2_CONFIG
} from '../config/elementalTowers';
import type { TowerConfig } from '../config/types';

interface WorldLike {
    batterys: unknown[];
}

// Exported functions for backward compatibility
export function PowderCannon(world: WorldLike): Tower {
    return createTowerFromConfig(POWDERCANNON_CONFIG, world);
}

export function Flamethrower_1(world: WorldLike): Tower {
    return createTowerFromConfig(FLAMETHROWER_1_CONFIG, world);
}

export function Flamethrower_2(world: WorldLike): Tower {
    return createTowerFromConfig(FLAMETHROWER_2_CONFIG, world);
}

export function FrozenCannon_1(world: WorldLike): Tower {
    return createTowerFromConfig(FROZENCANNON_1_CONFIG, world);
}

export function FrozenCannon_2(world: WorldLike): Tower {
    return createTowerFromConfig(FROZENCANNON_2_CONFIG, world);
}

export function Poison_1(world: WorldLike): Tower {
    return createTowerFromConfig(POISON_1_CONFIG, world);
}

export function Poison_2(world: WorldLike): Tower {
    return createTowerFromConfig(POISON_2_CONFIG, world);
}

// Register towers using configuration system
registerTowersFromConfig(ELEMENTAL_TOWER_CONFIGS as TowerConfig[]);
