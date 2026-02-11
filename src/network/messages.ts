/**
 * Network Message Types
 * Re-exported from shared/types/messages.ts (single source of truth)
 */

// Message enums
export {
  ClientMessage,
  ServerMessage,
  LobbyMessage,
  type ClientMessageType,
  type ServerMessageType,
  type LobbyMessageType,
} from '@shared/types/messages';

// Client message payloads
export type {
  BuildTowerPayload,
  UpgradeTowerPayload,
  SellTowerPayload,
  SpawnMonsterPayload,
  CannonAimPayload,
  CannonFirePayload,
  CannonSetAutoTargetPayload,
  ChatMessagePayload,
} from '@shared/types/messages';

// Server message payloads
export type {
  GameEndedPayload,
  WaveStartingPayload,
  TowerAttackPayload,
  MonsterDamagedPayload,
  MonsterKilledPayload,
  BuildingDamagedPayload,
  BuildingDestroyedPayload,
  PlayerEliminatedPayload,
  ErrorPayload,
  ActionRejectedPayload,
  BulletFiredPayload,
  BulletHitPayload,
  BulletExplosionPayload,
  MineDestroyedPayload,
} from '@shared/types/messages';

// Mine message payloads
export type {
  UpgradeMinePayload,
  RepairMinePayload,
  DowngradeMinePayload,
  SellMinePayload,
} from '@shared/types/messages';

// Lobby / Room payloads
export type { RoomInfo, MatchFoundPayload } from '@shared/types/messages';
