/**
 * Schema Module - Colyseus State Definitions
 * Export all schema classes for state synchronization
 */

export { VectorSchema } from './VectorSchema.js';
export { PlayerState, PLAYER_COLORS } from './PlayerState.js';
export { TowerState } from './TowerState.js';
export { MonsterState } from './MonsterState.js';
export { BuildingState, SpawnerCooldown } from './BuildingState.js';
export { BulletState } from './BulletState.js';
export {
  GameState,
  MapConfig,
  WaveState,
  GamePhase,
  GameEndReason,
  type GamePhaseType,
  type GameEndReasonType,
} from './GameState.js';
export { LobbyState, LobbyPlayer, RoomListing } from './LobbyState.js';
