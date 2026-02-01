/**
 * Spawnable monster configuration for MonsterSpawner building
 *
 * Defines which monsters can be spawned by players in multiplayer mode.
 */

import { scalePeriod } from '../core/speedScale';

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
    /** Cooldown in ticks after spawning (scalePeriod applied) */
    cooldownTicks: number;
    /** Minimum wave number to unlock this monster */
    unlockWave: number;
}

/**
 * List of all spawnable monsters
 *
 * Sorted by unlock wave for display purposes.
 * Cost is approximately 2x the monster's kill reward.
 */
export const SPAWNABLE_MONSTERS: SpawnableMonster[] = [
    {
        monsterId: 'Normal',
        name: '普通人',
        cost: 20,
        cooldownTicks: scalePeriod(180),
        unlockWave: 1,
    },
    {
        monsterId: 'Runner',
        name: '跑人',
        cost: 20,
        cooldownTicks: scalePeriod(240),
        unlockWave: 3,
    },
    {
        monsterId: 'Ox1',
        name: '冲锋牛',
        cost: 30,
        cooldownTicks: scalePeriod(360),
        unlockWave: 5,
    },
    {
        monsterId: 'Bomber1',
        name: '爆破者',
        cost: 40,
        cooldownTicks: scalePeriod(480),
        unlockWave: 8,
    },
    {
        monsterId: 'Mts',
        name: '忍者',
        cost: 100,
        cooldownTicks: scalePeriod(600),
        unlockWave: 10,
    },
    {
        monsterId: 'T800',
        name: 'T800',
        cost: 1200,
        cooldownTicks: scalePeriod(1800),
        unlockWave: 15,
    },
];
