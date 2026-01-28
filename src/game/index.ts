/**
 * Game module exports
 */

export { World } from './world';

// New manager modules
export { SpatialQuerySystem } from './spatial';
export type { SpatialEntity, BuildingEntity, SpatialQueryContext } from './spatial';

export { EntityManager } from './entities';
export type {
    TowerLike,
    BuildingLike,
    MonsterLike,
    BullyLike,
    IEffect,
    EntityManagerContext,
    EntityRemovalCallbacks
} from './entities';

export { WaveManager } from './waves';
export type {
    MonsterFlow,
    PrecomputedMonsterAttrs,
    PrecomputedWave,
    WaveManagerContext,
    WaveEntityCallbacks
} from './waves';

export { WorldRenderer } from './rendering';
export type { WorldRendererContext } from './rendering';
