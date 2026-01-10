/**
 * Shouter monster variants
 *
 * Contains: Shouter, Shouter_Stone, Shouter_Bomber, Shouter_Spike (4 monsters)
 * Now using data-driven configuration system.
 */

import { MonsterShooter } from '../base/monsterShooter';
import { registerMonstersFromConfig, createMonsterFromConfig } from '../config/factory';
import {
    SHOUTER_MONSTER_CONFIGS,
    SHOUTER_CONFIG,
    SHOUTER_STONE_CONFIG,
    SHOUTER_BOMBER_CONFIG,
    SHOUTER_SPIKE_CONFIG
} from '../config/shouterMonsters';
import type { AnyMonsterConfig } from '../config/types';

interface WorldLike {
    [key: string]: unknown;
}

// Exported for backward compatibility
export function Shouter(world: WorldLike): MonsterShooter {
    return createMonsterFromConfig(SHOUTER_CONFIG, world) as MonsterShooter;
}

export function Shouter_Stone(world: WorldLike): MonsterShooter {
    return createMonsterFromConfig(SHOUTER_STONE_CONFIG, world) as MonsterShooter;
}

export function Shouter_Bomber(world: WorldLike): MonsterShooter {
    return createMonsterFromConfig(SHOUTER_BOMBER_CONFIG, world) as MonsterShooter;
}

export function Shouter_Spike(world: WorldLike): MonsterShooter {
    return createMonsterFromConfig(SHOUTER_SPIKE_CONFIG, world) as MonsterShooter;
}

// Register monsters using configuration system
registerMonstersFromConfig(SHOUTER_MONSTER_CONFIGS as AnyMonsterConfig[]);
