/**
 * Network Message Types (shared between client and server)
 * Duplicated from server/src/shared/types/messages.ts
 * Keep these in sync!
 */

// ==================== Client -> Server Messages ====================

export const ClientMessage = {
  PLAYER_READY: 'player_ready',
  PLAYER_NOT_READY: 'player_not_ready',
  BUILD_TOWER: 'build_tower',
  UPGRADE_TOWER: 'upgrade_tower',
  SELL_TOWER: 'sell_tower',
  BUILD_SPAWNER: 'build_spawner',
  SPAWN_MONSTER: 'spawn_monster',
  SET_SPAWN_TARGET: 'set_spawn_target',
  CANNON_AIM: 'cannon_aim',
  CANNON_FIRE: 'cannon_fire',
  CANNON_SET_AUTO_TARGET: 'cannon_set_auto_target',
  SURRENDER: 'surrender',
  PAUSE_REQUEST: 'pause_request',
  RESUME_REQUEST: 'resume_request',
  CHAT_MESSAGE: 'chat_message',
} as const;

export type ClientMessageType = (typeof ClientMessage)[keyof typeof ClientMessage];

// ==================== Server -> Client Messages ====================

export const ServerMessage = {
  GAME_STARTING: 'game_starting',
  GAME_STARTED: 'game_started',
  GAME_PAUSED: 'game_paused',
  GAME_RESUMED: 'game_resumed',
  GAME_ENDED: 'game_ended',
  WAVE_STARTING: 'wave_starting',
  WAVE_COMPLETED: 'wave_completed',
  TOWER_ATTACK: 'tower_attack',
  MONSTER_DAMAGED: 'monster_damaged',
  MONSTER_KILLED: 'monster_killed',
  BUILDING_DAMAGED: 'building_damaged',
  BUILDING_DESTROYED: 'building_destroyed',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  PLAYER_ELIMINATED: 'player_eliminated',
  PLAYER_DISCONNECTED: 'player_disconnected',
  PLAYER_RECONNECTED: 'player_reconnected',
  ERROR: 'error',
  ACTION_REJECTED: 'action_rejected',
  CHAT_MESSAGE: 'chat_message',
} as const;

export type ServerMessageType = (typeof ServerMessage)[keyof typeof ServerMessage];

// ==================== Lobby Messages ====================

export const LobbyMessage = {
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  QUICK_MATCH: 'quick_match',
  CANCEL_SEARCH: 'cancel_search',
  REFRESH_ROOMS: 'refresh_rooms',
  ROOM_CREATED: 'room_created',
  MATCH_FOUND: 'match_found',
  ROOM_LIST_UPDATED: 'room_list_updated',
  ERROR: 'error',
} as const;

export type LobbyMessageType = (typeof LobbyMessage)[keyof typeof LobbyMessage];

// ==================== Payload Types ====================

export interface BuildTowerPayload {
  towerType: string;
  x: number;
  y: number;
}

export interface UpgradeTowerPayload {
  towerId: string;
}

export interface SellTowerPayload {
  towerId: string;
}

export interface SpawnMonsterPayload {
  spawnerId: string;
  monsterType: string;
  targetPlayerId: string;
}

export interface CannonFirePayload {
  towerId: string;
  targetX: number;
  targetY: number;
}

export interface CannonSetAutoTargetPayload {
  towerId: string;
  targetX: number;
  targetY: number;
  radius: number;
}

export interface GameEndedPayload {
  winnerId: string;
  reason: string;
  stats: {
    playerId: string;
    towersBuilt: number;
    monstersKilled: number;
    monstersSpawned: number;
  }[];
}

export interface WaveStartingPayload {
  waveNumber: number;
  monsterCount: number;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

// ==================== Room Info ====================

export interface RoomInfo {
  roomId: string;
  roomName: string;
  hostName: string;
  mapSize: string;
  playerCount: number;
  maxPlayers: number;
  isPrivate: boolean;
  isPlaying: boolean;
}

export interface MatchFoundPayload {
  roomId: string;
  reservation: unknown; // Colyseus reservation object
}
