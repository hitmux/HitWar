/**
 * Network Module
 * Client-side networking for Cannon War multiplayer
 */

export { NetworkClient, getNetworkClient, ConnectionState, NetworkEvent } from './networkClient';
export {
  ClientMessage,
  ServerMessage,
  LobbyMessage,
  type BuildTowerPayload,
  type UpgradeTowerPayload,
  type SellTowerPayload,
  type SpawnMonsterPayload,
  type CannonFirePayload,
  type CannonSetAutoTargetPayload,
  type GameEndedPayload,
  type WaveStartingPayload,
  type ErrorPayload,
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
