/**
 * Network Module
 * Client-side networking for Cannon War multiplayer
 */

export { NetworkClient, getNetworkClient, ConnectionState, NetworkEvent } from './networkClient';
export {
  ClientMessage,
  ServerMessage,
  LobbyMessage,
  type ClientMessageType,
  type ServerMessageType,
  type LobbyMessageType,
  type BuildTowerPayload,
  type UpgradeTowerPayload,
  type SellTowerPayload,
  type SpawnMonsterPayload,
  type CannonAimPayload,
  type CannonFirePayload,
  type CannonSetAutoTargetPayload,
  type ChatMessagePayload,
  type GameEndedPayload,
  type WaveStartingPayload,
  type TowerAttackPayload,
  type MonsterDamagedPayload,
  type MonsterKilledPayload,
  type BuildingDamagedPayload,
  type BuildingDestroyedPayload,
  type PlayerEliminatedPayload,
  type ErrorPayload,
  type ActionRejectedPayload,
  type BulletFiredPayload,
  type BulletHitPayload,
  type BulletExplosionPayload,
  type RoomInfo,
  type MatchFoundPayload,
} from './messages';
export { NETWORK_CONFIG } from './config';
export { NetworkEventEmitter } from './eventEmitter';
export {
  ReconnectionManager,
  getReconnectionManager,
  type ReconnectionState,
} from './reconnectionManager';
export {
  NetworkWorldAdapter,
  TowerRenderProxy,
  MonsterRenderProxy,
  BuildingRenderProxy,
  BulletRenderProxy,
  InterpolationSystem,
  getInterpolationSystem,
  LocalEffectsManager,
  getLocalEffectsManager,
  ClientPrediction,
  getClientPrediction,
} from './rendering';
export { ClientValidator } from './validation';
