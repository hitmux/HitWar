/**
 * Basic monster variants
 *
 * Contains: Normal, Runner, TestMonster, Ox1~3 (6 monsters)
 * Now using data-driven configuration system.
 */

import { Monster } from '../base/monster';
import { registerMonstersFromConfig, createMonsterFromConfig } from '../config/factory';
import {
    BASIC_MONSTER_CONFIGS,
    NORMAL_CONFIG,
    RUNNER_CONFIG,
    TEST_MONSTER_CONFIG,
    OX1_CONFIG,
    OX2_CONFIG,
    OX3_CONFIG
} from '../config/basicMonsters';
import type { AnyMonsterConfig } from '../config/types';

interface WorldLike {
    [key: string]: unknown;
}

// Exported for backward compatibility
export function Normal(world: WorldLike): Monster {
    return createMonsterFromConfig(NORMAL_CONFIG, world);
}

export function Runner(world: WorldLike): Monster {
    return createMonsterFromConfig(RUNNER_CONFIG, world);
}

export function TestMonster(world: WorldLike): Monster {
    return createMonsterFromConfig(TEST_MONSTER_CONFIG, world);
}

export function Ox1(world: WorldLike): Monster {
    return createMonsterFromConfig(OX1_CONFIG, world);
}

export function Ox2(world: WorldLike): Monster {
    return createMonsterFromConfig(OX2_CONFIG, world);
}

export function Ox3(world: WorldLike): Monster {
    return createMonsterFromConfig(OX3_CONFIG, world);
}

// Register monsters using configuration system
registerMonstersFromConfig(BASIC_MONSTER_CONFIGS as AnyMonsterConfig[]);
