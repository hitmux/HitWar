/**
 * Gun tower variants
 *
 * Contains: Rifle_1~3, MachineGun_1~3, ArmorPiercing_1~3 (9 towers)
 * Now using data-driven configuration system.
 */

import { Tower } from '../base/tower';
import { registerTowersFromConfig, createTowerFromConfig } from '../config/factory';
import {
    GUN_TOWER_CONFIGS,
    RIFLE_1_CONFIG,
    RIFLE_2_CONFIG,
    RIFLE_3_CONFIG,
    MACHINEGUN_1_CONFIG,
    MACHINEGUN_2_CONFIG,
    MACHINEGUN_3_CONFIG,
    ARMORPIERCING_1_CONFIG,
    ARMORPIERCING_2_CONFIG,
    ARMORPIERCING_3_CONFIG
} from '../config/gunTowers';
import type { TowerConfig } from '../config/types';

interface WorldLike {
    batterys: unknown[];
}

// Exported functions for backward compatibility
export function Rifle_1(world: WorldLike): Tower {
    return createTowerFromConfig(RIFLE_1_CONFIG, world);
}

export function Rifle_2(world: WorldLike): Tower {
    return createTowerFromConfig(RIFLE_2_CONFIG, world);
}

export function Rifle_3(world: WorldLike): Tower {
    return createTowerFromConfig(RIFLE_3_CONFIG, world);
}

export function MachineGun_1(world: WorldLike): Tower {
    return createTowerFromConfig(MACHINEGUN_1_CONFIG, world);
}

export function MachineGun_2(world: WorldLike): Tower {
    return createTowerFromConfig(MACHINEGUN_2_CONFIG, world);
}

export function MachineGun_3(world: WorldLike): Tower {
    return createTowerFromConfig(MACHINEGUN_3_CONFIG, world);
}

export function ArmorPiercing_1(world: WorldLike): Tower {
    return createTowerFromConfig(ARMORPIERCING_1_CONFIG, world);
}

export function ArmorPiercing_2(world: WorldLike): Tower {
    return createTowerFromConfig(ARMORPIERCING_2_CONFIG, world);
}

export function ArmorPiercing_3(world: WorldLike): Tower {
    return createTowerFromConfig(ARMORPIERCING_3_CONFIG, world);
}

// Register towers using configuration system
registerTowersFromConfig(GUN_TOWER_CONFIGS as TowerConfig[]);
