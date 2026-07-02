/**
 * Ownership utility functions for multiplayer support
 *
 * Re-exports from shared module.
 * OwnedEntity type is defined in @/types/player.ts to maintain existing import structure.
 */

export {
    isEnemy,
    isFriendly,
    belongsTo,
    isNeutral,
    filterEnemies,
    filterFriendlies,
} from '@shared/types/ownership';
