/**
 * Player module - Multiplayer support
 */

export { PlayerManager, type GameResult } from './playerManager';
export {
    isEnemy,
    isFriendly,
    belongsTo,
    isNeutral,
    filterEnemies,
    filterFriendlies,
} from './ownership';
