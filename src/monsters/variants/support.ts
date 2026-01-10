/**
 * Support monster variants
 *
 * Contains: Medic, Medic_S, Medic_M, SpeedAdder, AttackAdder (5 monsters)
 * Now using data-driven configuration system.
 */

import { Monster } from '../base/monster';
import { registerMonstersFromConfig, createMonsterFromConfig } from '../config/factory';
import {
    SUPPORT_MONSTER_CONFIGS,
    MEDIC_CONFIG,
    MEDIC_S_CONFIG,
    MEDIC_M_CONFIG,
    SPEED_ADDER_CONFIG,
    ATTACK_ADDER_CONFIG
} from '../config/supportMonsters';
import type { AnyMonsterConfig } from '../config/types';

interface WorldLike {
    [key: string]: unknown;
}

// Exported for backward compatibility
export function Medic(world: WorldLike): Monster {
    return createMonsterFromConfig(MEDIC_CONFIG, world);
}

export function Medic_S(world: WorldLike): Monster {
    return createMonsterFromConfig(MEDIC_S_CONFIG, world);
}

export function Medic_M(world: WorldLike): Monster {
    return createMonsterFromConfig(MEDIC_M_CONFIG, world);
}

export function SpeedAdder(world: WorldLike): Monster {
    return createMonsterFromConfig(SPEED_ADDER_CONFIG, world);
}

export function AttackAdder(world: WorldLike): Monster {
    return createMonsterFromConfig(ATTACK_ADDER_CONFIG, world);
}

// Register monsters using configuration system
registerMonstersFromConfig(SUPPORT_MONSTER_CONFIGS as AnyMonsterConfig[]);
