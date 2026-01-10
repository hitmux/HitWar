/**
 * Bomber monster variants
 *
 * Contains: Bomber1~3, Thrower1 (4 monsters)
 * Now using data-driven configuration system.
 */

import { Monster } from '../base/monster';
import { registerMonstersFromConfig, createMonsterFromConfig } from '../config/factory';
import {
    BOMBER_MONSTER_CONFIGS,
    BOMBER1_CONFIG,
    BOMBER2_CONFIG,
    BOMBER3_CONFIG,
    THROWER1_CONFIG
} from '../config/bomberMonsters';
import type { AnyMonsterConfig } from '../config/types';

interface WorldLike {
    [key: string]: unknown;
}

// Exported for backward compatibility
export function Bomber1(world: WorldLike): Monster {
    return createMonsterFromConfig(BOMBER1_CONFIG, world);
}

export function Bomber2(world: WorldLike): Monster {
    return createMonsterFromConfig(BOMBER2_CONFIG, world);
}

export function Bomber3(world: WorldLike): Monster {
    return createMonsterFromConfig(BOMBER3_CONFIG, world);
}

export function Thrower1(world: WorldLike): Monster {
    return createMonsterFromConfig(THROWER1_CONFIG, world);
}

// Register monsters using configuration system
registerMonstersFromConfig(BOMBER_MONSTER_CONFIGS as AnyMonsterConfig[]);
