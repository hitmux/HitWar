/**
 * Spawnable monster configuration for MonsterSpawner building
 *
 * Derives from shared MonsterMetaData (single source of truth).
 * This file provides the client-side SpawnableMonster interface
 * used by MonsterSpawner, SpawnerPanel, and ClientValidator.
 */

import { SPAWNABLE_MONSTER_META } from '@shared/config/monsterMeta';

/**
 * Configuration for a spawnable monster
 */
export interface SpawnableMonster {
    /** MonsterRegistry ID */
    monsterId: string;
    /** Display name (Chinese) */
    name: string;
    /** Spawn cost (energy) */
    cost: number;
    /** Cooldown in ticks after spawning */
    cooldownTicks: number;
    /** Minimum wave number to unlock this monster */
    unlockWave: number;
}

/**
 * List of all spawnable monsters, derived from shared config.
 * Sorted by unlock wave, then by cost for display purposes.
 */
export const SPAWNABLE_MONSTERS: SpawnableMonster[] = Object.values(
    SPAWNABLE_MONSTER_META
)
    .map((meta) => ({
        monsterId: meta.monsterId,
        name: meta.name,
        cost: meta.cost,
        cooldownTicks: meta.cooldownTicks,
        unlockWave: meta.unlockWave,
    }))
    .sort((a, b) => a.unlockWave - b.unlockWave || a.cost - b.cost);
