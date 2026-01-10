/**
 * Slime monster variants
 *
 * Contains: Slime_L, Slime_M, Slime_S (3 monsters)
 * Now using data-driven configuration system.
 */

import { Monster } from '../base/monster';
import { registerMonstersFromConfig, createMonsterFromConfig } from '../config/factory';
import {
    SLIME_MONSTER_CONFIGS,
    SLIME_L_CONFIG,
    SLIME_M_CONFIG,
    SLIME_S_CONFIG
} from '../config/slimeMonsters';
import type { AnyMonsterConfig } from '../config/types';

interface WorldLike {
    [key: string]: unknown;
}

// Exported for backward compatibility
export function Slime_L(world: WorldLike): Monster {
    return createMonsterFromConfig(SLIME_L_CONFIG, world);
}

export function Slime_M(world: WorldLike): Monster {
    return createMonsterFromConfig(SLIME_M_CONFIG, world);
}

export function Slime_S(world: WorldLike): Monster {
    return createMonsterFromConfig(SLIME_S_CONFIG, world);
}

// Register monsters using configuration system
registerMonstersFromConfig(SLIME_MONSTER_CONFIGS as AnyMonsterConfig[]);
