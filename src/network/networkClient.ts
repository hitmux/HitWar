/**
 * Network Client
 * Manages connection to Colyseus server, lobby, and game rooms
 */
import * as Colyseus from 'colyseus.js';
import { NETWORK_CONFIG } from './config';
import { NetworkEventEmitter } from './eventEmitter';
import { getReconnectionManager } from './reconnectionManager';
import {
  ClientMessage,
  ServerMessage,
  LobbyMessage,
  type BuildTowerPayload,
  type BuildBuildingPayload,
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
  type UpgradeMinePayload,
  type RepairMinePayload,
  type DowngradeMinePayload,
  type SellMinePayload,
  type UpgradeVisionPayload,
} from './messages';

/**
 * Connection state
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED_LOBBY = 'connected_lobby',
  JOINING_GAME = 'joining_game',
  IN_GAME = 'in_game',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * Network events
 */
export const NetworkEvent = {
  // Connection events
  STATE_CHANGED: 'state_changed',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
  RECONNECTED: 'reconnected',
  ERROR: 'error',

  // Lobby events
  ROOMS_UPDATED: 'rooms_updated',
  MATCH_FOUND: 'match_found',

  // Game events
  GAME_STATE_CHANGED: 'game_state_changed',
  GAME_STARTING: 'game_starting',
  GAME_STARTED: 'game_started',
  GAME_PAUSED: 'game_paused',
  GAME_RESUMED: 'game_resumed',
  GAME_ENDED: 'game_ended',

  // Wave events
  WAVE_STARTING: 'wave_starting',
  WAVE_COMPLETED: 'wave_completed',

  // Combat events
  BULLET_FIRED: 'bullet_fired',
  MONSTER_DAMAGED: 'monster_damaged',
  MONSTER_KILLED: 'monster_killed',
  BUILDING_DAMAGED: 'building_damaged',
  BUILDING_DESTROYED: 'building_destroyed',

  // Player events
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  PLAYER_ELIMINATED: 'player_eliminated',
  PLAYER_DISCONNECTED: 'player_disconnected',
  PLAYER_RECONNECTED: 'player_reconnected',

  // Action feedback
  ACTION_REJECTED: 'action_rejected',
} as const;

/**
 * Main Network Client
 */
export class NetworkClient {
  private colyseusClient: Colyseus.Client;
  private lobbyRoom: Colyseus.Room | null = null;
  private gameRoom: Colyseus.Room | null = null;

  private _connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private _playerName: string = '';
  private _playerId: string = '';

  private reconnectAttempts: number = 0;

  public readonly events = new NetworkEventEmitter();

  constructor() {
    this.colyseusClient = new Colyseus.Client(NETWORK_CONFIG.serverUrl);
  }

  // ==================== Properties ====================

  get connectionState(): ConnectionState {
    return this._connectionState;
  }

  get playerName(): string {
    return this._playerName;
  }

  get playerId(): string {
    return this._playerId;
  }

  get isConnected(): boolean {
    return (
      this._connectionState === ConnectionState.CONNECTED_LOBBY ||
      this._connectionState === ConnectionState.IN_GAME
    );
  }

  get isInGame(): boolean {
    return this._connectionState === ConnectionState.IN_GAME;
  }

  get gameState(): unknown {
    return this.gameRoom?.state;
  }

  // ==================== Connection ====================

  /**
   * Connect to lobby
   */
  async connectToLobby(playerName: string): Promise<void> {
    this._playerName = playerName;
    this.setConnectionState(ConnectionState.CONNECTING);

    try {
      this.lobbyRoom = await this.colyseusClient.joinOrCreate('lobby', {
        playerName,
      });

      this._playerId = this.lobbyRoom.sessionId;

      // Register lobby message handlers
      this.setupLobbyHandlers(this.lobbyRoom);

      this.setConnectionState(ConnectionState.CONNECTED_LOBBY);
      this.reconnectAttempts = 0;
      this.events.emit(NetworkEvent.CONNECTED);

      console.log(`[NetworkClient] Connected to lobby as "${playerName}"`);
    } catch (error) {
      console.error('[NetworkClient] Failed to connect to lobby:', error);
      this.setConnectionState(ConnectionState.ERROR);
      this.events.emit(NetworkEvent.ERROR, error);
      throw error;
    }
  }

  /**
   * Disconnect from all rooms
   */
  async disconnect(): Promise<void> {
    if (this.gameRoom) {
      await this.gameRoom.leave(true);
      this.gameRoom = null;
    }

    if (this.lobbyRoom) {
      await this.lobbyRoom.leave(true);
      this.lobbyRoom = null;
    }

    this.setConnectionState(ConnectionState.DISCONNECTED);
    this.events.emit(NetworkEvent.DISCONNECTED);
    this.events.removeAll();

    console.log('[NetworkClient] Disconnected');
  }

  /**
   * Set server URL and recreate Colyseus client
   */
  setServerUrl(url: string): void {
    if (this.isConnected()) {
      throw new Error('Cannot change server URL while connected');
    }
    this.colyseusClient = new Colyseus.Client(url);
    console.log(`[NetworkClient] Server URL updated to: ${url}`);
  }

  // ==================== Lobby Actions ====================

  /**
   * Create a game room
   */
  async createRoom(options: {
    roomName?: string;
    mapSize?: string;
    isPrivate?: boolean;
  }): Promise<void> {
    if (!this.lobbyRoom) {
      throw new Error('Not connected to lobby');
    }

    this.lobbyRoom.send(LobbyMessage.CREATE_ROOM, options);
  }

  /**
   * Join a specific room
   */
  async joinRoom(roomId: string): Promise<void> {
    if (!this.lobbyRoom) {
      throw new Error('Not connected to lobby');
    }

    this.lobbyRoom.send(LobbyMessage.JOIN_ROOM, { roomId });
  }

  /**
   * Start quick match
   */
  quickMatch(): void {
    if (!this.lobbyRoom) {
      throw new Error('Not connected to lobby');
    }

    this.lobbyRoom.send(LobbyMessage.QUICK_MATCH);
  }

  /**
   * Cancel quick match search
   */
  cancelSearch(): void {
    if (!this.lobbyRoom) return;

    this.lobbyRoom.send(LobbyMessage.CANCEL_SEARCH);
  }

  /**
   * Refresh available rooms list
   */
  refreshRooms(): void {
    if (!this.lobbyRoom) return;

    this.lobbyRoom.send(LobbyMessage.REFRESH_ROOMS);
  }

  // ==================== Game Actions ====================

  /**
   * Set player ready state
   */
  setReady(ready: boolean): void {
    if (!this.gameRoom) return;

    this.gameRoom.send(ready ? ClientMessage.PLAYER_READY : ClientMessage.PLAYER_NOT_READY);
  }

  /**
   * Build a tower
   */
  buildTower(payload: BuildTowerPayload): void {
    if (!this.gameRoom) return;

    this.gameRoom.send(ClientMessage.BUILD_TOWER, payload);
  }

  buildBuilding(payload: BuildBuildingPayload): void {
    if (!this.gameRoom) return;

    this.gameRoom.send(ClientMessage.BUILD_BUILDING, payload);
  }

  /**
   * Upgrade a tower
   */
  upgradeTower(payload: UpgradeTowerPayload): void {
    if (!this.gameRoom) return;

    this.gameRoom.send(ClientMessage.UPGRADE_TOWER, payload);
  }

  /**
   * Sell a tower
   */
  sellTower(payload: SellTowerPayload): void {
    if (!this.gameRoom) return;

    this.gameRoom.send(ClientMessage.SELL_TOWER, payload);
  }

  // === Mine Operations ===

  upgradeMine(payload: UpgradeMinePayload): void {
    if (!this.gameRoom) return;
    this.gameRoom.send(ClientMessage.UPGRADE_MINE, payload);
  }

  repairMine(payload: RepairMinePayload): void {
    if (!this.gameRoom) return;
    this.gameRoom.send(ClientMessage.REPAIR_MINE, payload);
  }

  downgradeMine(payload: DowngradeMinePayload): void {
    if (!this.gameRoom) return;
    this.gameRoom.send(ClientMessage.DOWNGRADE_MINE, payload);
  }

  sellMine(payload: SellMinePayload): void {
    if (!this.gameRoom) return;
    this.gameRoom.send(ClientMessage.SELL_MINE, payload);
  }

  /**
   * Upgrade tower vision (observer/radar)
   */
  sendUpgradeVision(payload: UpgradeVisionPayload): void {
    if (!this.gameRoom) return;
    this.gameRoom.send(ClientMessage.UPGRADE_VISION, payload);
  }

  /**
   * Spawn a monster
   */
  spawnMonster(payload: SpawnMonsterPayload): void {
    if (!this.gameRoom) return;

    this.gameRoom.send(ClientMessage.SPAWN_MONSTER, payload);
  }

  /**
   * Fire manual cannon
   */
  cannonFire(payload: CannonFirePayload): void {
    if (!this.gameRoom) return;

    this.gameRoom.send(ClientMessage.CANNON_FIRE, payload);
  }

  /**
   * Set cannon auto-target
   */
  cannonSetAutoTarget(payload: CannonSetAutoTargetPayload): void {
    if (!this.gameRoom) return;

    this.gameRoom.send(ClientMessage.CANNON_SET_AUTO_TARGET, payload);
  }

  cannonClearAutoTarget(towerId: string): void {
    if (!this.gameRoom) return;
    this.gameRoom.send(ClientMessage.CANNON_SET_AUTO_TARGET, {
      towerId,
      targetX: 0,
      targetY: 0,
      radius: 0,
      clear: true,
    });
  }

  /**
   * Surrender
   */
  surrender(): void {
    if (!this.gameRoom) return;

    this.gameRoom.send(ClientMessage.SURRENDER);
  }

  /**
   * Leave current game
   */
  async leaveGame(): Promise<void> {
    if (this.gameRoom) {
      getReconnectionManager().clearSession();
      await this.gameRoom.leave(true);
      this.gameRoom = null;

      if (this.lobbyRoom) {
        this.setConnectionState(ConnectionState.CONNECTED_LOBBY);
      } else {
        this.setConnectionState(ConnectionState.DISCONNECTED);
      }
    }
  }

  /**
   * Reconnect to a game room using a previously saved reconnection token.
   * Uses Colyseus client.reconnect() which accepts the format "roomId:token".
   */
  async reconnectToGame(token: string): Promise<boolean> {
    try {
      this.gameRoom = await this.colyseusClient.reconnect(token);
      this.setupGameHandlers(this.gameRoom);
      this.setConnectionState(ConnectionState.IN_GAME);

      // Save updated token (may change after reconnection)
      getReconnectionManager().saveSession(this.gameRoom.reconnectionToken);
      this.reconnectAttempts = 0;

      console.log('[NetworkClient] Game room reconnected successfully');
      return true;
    } catch (error) {
      console.error('[NetworkClient] Game reconnect failed:', error);
      return false;
    }
  }

  // ==================== Private Methods ====================

  /**
   * Set up lobby message handlers
   */
  private setupLobbyHandlers(room: Colyseus.Room): void {
    room.onMessage(LobbyMessage.ROOM_CREATED, async (data: MatchFoundPayload) => {
      await this.joinGameRoom(data);
    });

    room.onMessage(LobbyMessage.MATCH_FOUND, async (data: MatchFoundPayload) => {
      this.events.emit(NetworkEvent.MATCH_FOUND, data);
      await this.joinGameRoom(data);
    });

    room.onMessage(LobbyMessage.ROOM_LIST_UPDATED, (data: { rooms: RoomInfo[] }) => {
      this.events.emit(NetworkEvent.ROOMS_UPDATED, data.rooms);
    });

    room.onMessage(LobbyMessage.ERROR, (data: ErrorPayload) => {
      console.error('[NetworkClient] Lobby error:', data);
      this.events.emit(NetworkEvent.ERROR, data);
    });

    room.onLeave((code: number) => {
      console.log(`[NetworkClient] Left lobby (code: ${code})`);
      if (code !== 1000) {
        // Abnormal disconnection
        this.handleLobbyDisconnect();
      }
    });

    room.onError((code: number, message?: string) => {
      console.error(`[NetworkClient] Lobby error: ${code} - ${message}`);
      this.events.emit(NetworkEvent.ERROR, { code, message });
    });
  }

  /**
   * Join a game room using reservation
   */
  private async joinGameRoom(data: MatchFoundPayload): Promise<void> {
    this.setConnectionState(ConnectionState.JOINING_GAME);

    try {
      this.gameRoom = await this.colyseusClient.consumeSeatReservation(
        data.reservation as Colyseus.SeatReservation
      );

      // Setup game handlers
      this.setupGameHandlers(this.gameRoom);

      this.setConnectionState(ConnectionState.IN_GAME);

      // Save reconnection token for potential reconnection
      getReconnectionManager().saveSession(this.gameRoom.reconnectionToken);

      console.log(`[NetworkClient] Joined game room: ${data.roomId}`);
    } catch (error) {
      console.error('[NetworkClient] Failed to join game room:', error);
      this.setConnectionState(ConnectionState.CONNECTED_LOBBY);
      this.events.emit(NetworkEvent.ERROR, error);
    }
  }

  /**
   * Set up game room message handlers
   */
  private setupGameHandlers(room: Colyseus.Room): void {
    // State change listener
    room.onStateChange((state) => {
      this.events.emit(NetworkEvent.GAME_STATE_CHANGED, state);
    });

    // Game lifecycle events
    room.onMessage(ServerMessage.GAME_STARTING, (data) => {
      this.events.emit(NetworkEvent.GAME_STARTING, data);
    });

    room.onMessage(ServerMessage.GAME_STARTED, (data) => {
      this.events.emit(NetworkEvent.GAME_STARTED, data);
    });

    room.onMessage(ServerMessage.GAME_PAUSED, (data) => {
      this.events.emit(NetworkEvent.GAME_PAUSED, data);
    });

    room.onMessage(ServerMessage.GAME_RESUMED, (data) => {
      this.events.emit(NetworkEvent.GAME_RESUMED, data);
    });

    room.onMessage(ServerMessage.GAME_ENDED, (data: GameEndedPayload) => {
      this.events.emit(NetworkEvent.GAME_ENDED, data);
    });

    // Wave events
    room.onMessage(ServerMessage.WAVE_STARTING, (data: WaveStartingPayload) => {
      this.events.emit(NetworkEvent.WAVE_STARTING, data);
    });

    room.onMessage(ServerMessage.WAVE_COMPLETED, (data) => {
      this.events.emit(NetworkEvent.WAVE_COMPLETED, data);
    });

    // Combat events
    room.onMessage(ServerMessage.BULLET_FIRED, (data) => {
      this.events.emit(NetworkEvent.BULLET_FIRED, data);
    });

    room.onMessage(ServerMessage.MONSTER_DAMAGED, (data) => {
      this.events.emit(NetworkEvent.MONSTER_DAMAGED, data);
    });

    room.onMessage(ServerMessage.MONSTER_KILLED, (data) => {
      this.events.emit(NetworkEvent.MONSTER_KILLED, data);
    });

    room.onMessage(ServerMessage.BUILDING_DAMAGED, (data) => {
      this.events.emit(NetworkEvent.BUILDING_DAMAGED, data);
    });

    room.onMessage(ServerMessage.BUILDING_DESTROYED, (data) => {
      this.events.emit(NetworkEvent.BUILDING_DESTROYED, data);
    });

    // Player events
    room.onMessage(ServerMessage.PLAYER_JOINED, (data) => {
      this.events.emit(NetworkEvent.PLAYER_JOINED, data);
    });

    room.onMessage(ServerMessage.PLAYER_LEFT, (data) => {
      this.events.emit(NetworkEvent.PLAYER_LEFT, data);
    });

    room.onMessage(ServerMessage.PLAYER_ELIMINATED, (data) => {
      this.events.emit(NetworkEvent.PLAYER_ELIMINATED, data);
    });

    room.onMessage(ServerMessage.PLAYER_DISCONNECTED, (data) => {
      this.events.emit(NetworkEvent.PLAYER_DISCONNECTED, data);
    });

    room.onMessage(ServerMessage.PLAYER_RECONNECTED, (data) => {
      this.events.emit(NetworkEvent.PLAYER_RECONNECTED, data);
    });

    // Error handling
    room.onMessage(ServerMessage.ERROR, (data: ErrorPayload) => {
      console.error('[NetworkClient] Game error:', data);
      this.events.emit(NetworkEvent.ERROR, data);
    });

    // Action rejection feedback (e.g. insufficient funds, invalid position)
    room.onMessage(ServerMessage.ACTION_REJECTED, (data: { action: string; reason: string; errorCode?: string }) => {
      this.events.emit(NetworkEvent.ACTION_REJECTED, data);
    });

    // Room lifecycle
    room.onLeave((code: number) => {
      console.log(`[NetworkClient] Left game room (code: ${code})`);
      this.gameRoom = null;

      if (code !== 1000) {
        // Abnormal disconnection - attempt reconnect
        this.handleGameDisconnect();
      } else {
        // Normal leave
        if (this.lobbyRoom) {
          this.setConnectionState(ConnectionState.CONNECTED_LOBBY);
        } else {
          this.setConnectionState(ConnectionState.DISCONNECTED);
        }
      }
    });

    room.onError((code: number, message?: string) => {
      console.error(`[NetworkClient] Game room error: ${code} - ${message}`);
      this.events.emit(NetworkEvent.ERROR, { code, message });
    });
  }

  /**
   * Handle lobby disconnection
   */
  private async handleLobbyDisconnect(): Promise<void> {
    this.lobbyRoom = null;

    if (this.reconnectAttempts < NETWORK_CONFIG.maxReconnectAttempts) {
      this.setConnectionState(ConnectionState.RECONNECTING);
      this.events.emit(NetworkEvent.RECONNECTING, {
        attempt: this.reconnectAttempts + 1,
        maxAttempts: NETWORK_CONFIG.maxReconnectAttempts,
      });

      this.reconnectAttempts++;

      try {
        await new Promise((resolve) =>
          setTimeout(resolve, NETWORK_CONFIG.reconnectInterval)
        );
        await this.connectToLobby(this._playerName);
        this.events.emit(NetworkEvent.RECONNECTED);
      } catch {
        this.handleLobbyDisconnect();
      }
    } else {
      this.setConnectionState(ConnectionState.DISCONNECTED);
      this.events.emit(NetworkEvent.DISCONNECTED);
    }
  }

  /**
   * Handle game disconnection
   */
  private handleGameDisconnect(): void {
    // The server handles reconnection via allowReconnection()
    // The client just needs to attempt reconnection
    this.setConnectionState(ConnectionState.RECONNECTING);
    this.events.emit(NetworkEvent.RECONNECTING);

    console.log('[NetworkClient] Game disconnected, server will wait for reconnection');
  }

  /**
   * Set connection state and emit event
   */
  private setConnectionState(state: ConnectionState): void {
    if (this._connectionState !== state) {
      const oldState = this._connectionState;
      this._connectionState = state;
      this.events.emit(NetworkEvent.STATE_CHANGED, { oldState, newState: state });
    }
  }
}

/**
 * Singleton network client instance
 */
let networkClientInstance: NetworkClient | null = null;

export function getNetworkClient(): NetworkClient {
  if (!networkClientInstance) {
    networkClientInstance = new NetworkClient();
  }
  return networkClientInstance;
}
