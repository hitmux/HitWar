/**
 * Entities module - 实体管理模块
 */

export { EntityManager } from './entityManager';
export type {
    TowerLike,
    BuildingLike,
    MonsterLike,
    BullyLike,
    EntityManagerContext,
    EntityRemovalCallbacks
} from './entityManager';

// Re-export IEffect from types for backward compatibility
export type { IEffect } from '../../types';
