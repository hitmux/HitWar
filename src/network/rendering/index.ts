/**
 * Network Rendering Module
 * Client-side rendering adapter for multiplayer mode
 *
 * Provides WorldRendererContext from Colyseus GameState,
 * enabling the existing WorldRenderer to render network game state.
 */

export { NetworkWorldAdapter } from './networkWorldAdapter';

export {
    TowerRenderProxy,
    MonsterRenderProxy,
    BuildingRenderProxy,
    BulletRenderProxy,
    resetCirclePool,
} from './renderProxy';

export {
    InterpolationSystem,
    getInterpolationSystem,
    resetInterpolationSystem,
} from './interpolation';

export {
    LocalEffectsManager,
    getLocalEffectsManager,
    resetLocalEffectsManager,
    type LocalEffectType,
} from './localEffects';

export {
    ClientPrediction,
    GhostTowerProxy,
    getClientPrediction,
    resetClientPrediction,
    type PredictionState,
    type PredictedTower,
    type PredictedSell,
} from './clientPrediction';
