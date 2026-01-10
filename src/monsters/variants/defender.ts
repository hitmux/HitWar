/**
 * Defender monster variants
 *
 * Contains: BulletWearer, BulletRepellent, DamageReducers, BlackHole (4 monsters)
 * Now using data-driven configuration system.
 */

import { Monster } from '../base/monster';
import { registerMonstersFromConfig, createMonsterFromConfig } from '../config/factory';
import {
    DEFENDER_MONSTER_CONFIGS,
    BULLET_WEARER_CONFIG,
    BULLET_REPELLENT_CONFIG,
    DAMAGE_REDUCERS_CONFIG,
    BLACK_HOLE_CONFIG
} from '../config/defenderMonsters';
import type { AnyMonsterConfig } from '../config/types';

interface WorldLike {
    [key: string]: unknown;
}

// Exported for backward compatibility
export function BulletWearer(world: WorldLike): Monster {
    return createMonsterFromConfig(BULLET_WEARER_CONFIG, world);
}

export function BulletRepellent(world: WorldLike): Monster {
    return createMonsterFromConfig(BULLET_REPELLENT_CONFIG, world);
}

export function DamageReducers(world: WorldLike): Monster {
    return createMonsterFromConfig(DAMAGE_REDUCERS_CONFIG, world);
}

export function BlackHole(world: WorldLike): Monster {
    return createMonsterFromConfig(BLACK_HOLE_CONFIG, world);
}

// Register monsters using configuration system
registerMonstersFromConfig(DEFENDER_MONSTER_CONFIGS as AnyMonsterConfig[]);
