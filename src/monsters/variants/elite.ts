/**
 * Elite monster variants
 *
 * Contains: Exciting, Visitor, Enderman, Mts, T800 (5 monsters)
 * Now using data-driven configuration system.
 */

import { Monster } from '../base/monster';
import { MonsterMortis } from '../base/monsterMortis';
import { MonsterTerminator } from '../base/monsterTerminator';
import { registerMonstersFromConfig, createMonsterFromConfig } from '../config/factory';
import {
    ELITE_MONSTER_CONFIGS,
    EXCITING_CONFIG,
    VISITOR_CONFIG,
    ENDERMAN_CONFIG,
    MTS_CONFIG,
    T800_CONFIG
} from '../config/eliteMonsters';
import type { AnyMonsterConfig } from '../config/types';

interface WorldLike {
    [key: string]: unknown;
}

// Exported for backward compatibility
export function Exciting(world: WorldLike): Monster {
    return createMonsterFromConfig(EXCITING_CONFIG, world);
}

export function Visitor(world: WorldLike): Monster {
    return createMonsterFromConfig(VISITOR_CONFIG, world);
}

export function Enderman(world: WorldLike): Monster {
    return createMonsterFromConfig(ENDERMAN_CONFIG, world);
}

export function Mts(world: WorldLike): MonsterMortis {
    return createMonsterFromConfig(MTS_CONFIG, world) as MonsterMortis;
}

export function T800(world: WorldLike): MonsterTerminator {
    return createMonsterFromConfig(T800_CONFIG, world) as MonsterTerminator;
}

// Register monsters using configuration system
registerMonstersFromConfig(ELITE_MONSTER_CONFIGS as AnyMonsterConfig[]);
