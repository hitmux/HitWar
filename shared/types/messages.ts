/**
 * Network Message Types
 * Define all client-server message types
 */

/**
 * Client -> Server Messages
 */
export const ClientMessage = {
  // Player actions
  PLAYER_READY: 'player_ready',
  PLAYER_NOT_READY: 'player_not_ready',

  // Building actions
  BUILD_TOWER: 'build_tower',
  UPGRADE_TOWER: 'upgrade_tower',
  SELL_TOWER: 'sell_tower',
  BUILD_SPAWNER: 'build_spawner',
  BUILD_BUILDING: 'build_building',

  // Spawner actions
  SPAWN_MONSTER: 'spawn_monster',
  SET_SPAWN_TARGET: 'set_spawn_target',

  // Manual cannon actions
  CANNON_AIM: 'cannon_aim',
  CANNON_FIRE: 'cannon_fire',
  CANNON_SET_AUTO_TARGET: 'cannon_set_auto_target',

  // Mine actions
  UPGRADE_MINE: 'upgrade_mine',
  REPAIR_MINE: 'repair_mine',
  DOWNGRADE_MINE: 'downgrade_mine',
  SELL_MINE: 'sell_mine',

  // Vision actions
  UPGRADE_VISION: 'upgrade_vision',

  // Game control
  SURRENDER: 'surrender',
  PAUSE_REQUEST: 'pause_request',
  RESUME_REQUEST: 'resume_request',

  // Chat (optional)
  CHAT_MESSAGE: 'chat_message',
} as const;

export type ClientMessageType = (typeof ClientMessage)[keyof typeof ClientMessage];

/**
 * Server -> Client Messages
 */
export const ServerMessage = {
  // Game state events
  GAME_STARTING: 'game_starting',
  GAME_STARTED: 'game_started',
  GAME_PAUSED: 'game_paused',
  GAME_RESUMED: 'game_resumed',
  GAME_ENDED: 'game_ended',

  // Wave events
  WAVE_STARTING: 'wave_starting',
  WAVE_COMPLETED: 'wave_completed',

  // Combat events (for client visual effects)
  BULLET_FIRED: 'bullet_fired',
  BULLET_HIT: 'bullet_hit',
  BULLET_EXPLOSION: 'bullet_explosion',
  MONSTER_DAMAGED: 'monster_damaged',
  MONSTER_KILLED: 'monster_killed',
  BUILDING_DAMAGED: 'building_damaged',
  BUILDING_DESTROYED: 'building_destroyed',

  // Mine events
  MINE_DESTROYED: 'mine_destroyed',

  // Player events
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  PLAYER_ELIMINATED: 'player_eliminated',
  PLAYER_DISCONNECTED: 'player_disconnected',
  PLAYER_RECONNECTED: 'player_reconnected',

  // Error messages
  ERROR: 'error',
  ACTION_REJECTED: 'action_rejected',

  // Chat (optional)
  CHAT_MESSAGE: 'chat_message',

  // Territory sync
  TERRITORY_SYNC: 'territory_sync',
} as const;

export type ServerMessageType = (typeof ServerMessage)[keyof typeof ServerMessage];

/**
 * Lobby Messages (used by both client and server lobby rooms)
 */
export const LobbyMessage = {
  // Client -> Server
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  QUICK_MATCH: 'quick_match',
  CANCEL_SEARCH: 'cancel_search',
  REFRESH_ROOMS: 'refresh_rooms',

  // Server -> Client
  ROOM_CREATED: 'room_created',
  MATCH_FOUND: 'match_found',
  ROOM_LIST_UPDATED: 'room_list_updated',
  ERROR: 'error',
} as const;

export type LobbyMessageType = (typeof LobbyMessage)[keyof typeof LobbyMessage];

/**
 * Message payload types
 */

// Client messages
export interface BuildTowerPayload {
  towerType: string;
  x: number;
  y: number;
  requestId?: string; // Client prediction ID for matching server response
}

export interface UpgradeTowerPayload {
  towerId: string;
  targetType: string; // Required: target tower type for upgrade
}

export interface SellTowerPayload {
  towerId: string;
  requestId?: string; // Client prediction ID for matching server response
}

export interface BuildBuildingPayload {
  buildingType: string;
  x: number;
  y: number;
  requestId?: string; // Client prediction ID for matching server response
}

export interface UpgradeVisionPayload {
  towerId: string;
  visionType: 'observer' | 'radar';
}

export interface SpawnMonsterPayload {
  spawnerId: string;
  monsterType: string;
  targetPlayerId: string;
}

export interface CannonAimPayload {
  towerId: string;
  targetX: number;
  targetY: number;
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
  clear?: boolean;
}

export interface ChatMessagePayload {
  message: string;
}

// Server messages
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

export interface MonsterDamagedPayload {
  monsterId: string;
  damage: number;
  sourceId: string;
}

export interface MonsterKilledPayload {
  monsterId: string;
  killerId: string;
  reward: number;
}

export interface BuildingDamagedPayload {
  buildingId: string;
  damage: number;
  sourceId: string;
}

export interface BuildingDestroyedPayload {
  buildingId: string;
  sourceId: string;
  wasBase: boolean;
}

export interface PlayerEliminatedPayload {
  playerId: string;
  eliminatedBy: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface ActionRejectedPayload {
  action: string;
  reason: string;
  errorCode?: string;
}

// Bullet event payloads
export interface BulletFiredPayload {
  bulletId: string;
  bulletType: string;
  towerId: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRange: number;
}

export interface BulletHitPayload {
  bulletId: string;
  targetId: string;
  targetType: 'monster' | 'building';
  x: number;
  y: number;
  damage: number;
}

export interface BulletExplosionPayload {
  bulletId: string;
  x: number;
  y: number;
  radius: number;
  damage: number;
  hitTargets: string[];
}

// ==================== Room / Lobby Payload Types ====================

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

// ==================== Mine Payload Types ====================

export interface UpgradeMinePayload {
  mineId: string;
}

export interface RepairMinePayload {
  mineId: string;
}

export interface DowngradeMinePayload {
  mineId: string;
}

export interface SellMinePayload {
  mineId: string;
}

export interface MineDestroyedPayload {
  mineId: string;
  destroyedBy: string;
}


/**
 * Territory synchronization payload
 * Server sends authoritative territory state to clients
 */
export interface TerritorySyncPayload {
  territories: {
    [playerId: string]: {
      validBuildings: string[];
      invalidBuildings: string[];
    };
  };
}
