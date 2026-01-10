/**
 * Special monster variants
 *
 * Contains: Bulldozer, Glans, witch_N, bat, Spoke, SpokeMan (6 monsters)
 * Now using data-driven configuration system.
 */

import { Monster } from '../base/monster';
import { registerMonstersFromConfig, createMonsterFromConfig } from '../config/factory';
import {
    SPECIAL_MONSTER_CONFIGS,
    BULLDOZER_CONFIG,
    GLANS_CONFIG,
    WITCH_N_CONFIG,
    BAT_CONFIG,
    SPOKE_CONFIG,
    SPOKEMAN_CONFIG
} from '../config/specialMonsters';
import type { AnyMonsterConfig } from '../config/types';

interface WorldLike {
    [key: string]: unknown;
}

// Exported for backward compatibility
export function Bulldozer(world: WorldLike): Monster {
    return createMonsterFromConfig(BULLDOZER_CONFIG, world);
}

export function Glans(world: WorldLike): Monster {
    return createMonsterFromConfig(GLANS_CONFIG, world);
}

export function witch_N(world: WorldLike): Monster {
    return createMonsterFromConfig(WITCH_N_CONFIG, world);
}

export function bat(world: WorldLike): Monster {
    return createMonsterFromConfig(BAT_CONFIG, world);
}

export function Spoke(world: WorldLike): Monster {
    return createMonsterFromConfig(SPOKE_CONFIG, world);
}

export function SpokeMan(world: WorldLike): Monster {
    return createMonsterFromConfig(SPOKEMAN_CONFIG, world);
}

// Register monsters using configuration system
registerMonstersFromConfig(SPECIAL_MONSTER_CONFIGS as AnyMonsterConfig[]);
