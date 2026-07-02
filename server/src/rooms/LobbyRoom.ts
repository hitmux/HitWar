/**
 * Lobby Room - Matchmaking and room listing
 * Players join here to find games or create new rooms
 */
import { Room, Client, matchMaker } from '@colyseus/core';
import { LobbyState, LobbyPlayer, RoomListing } from '../schema/LobbyState.js';
import type { MapSize } from '../config.js';
import { LobbyMessage } from '../shared/types/messages.js';

/**
 * Create room options
 */
interface CreateRoomOptions {
  roomName?: string;
  mapSize?: MapSize;
  isPrivate?: boolean;
  password?: string;
}

/**
 * Join room options
 */
interface JoinRoomOptions {
  roomId: string;
  password?: string;
}

/**
 * Lobby room options
 */
interface LobbyOptions {
  playerName?: string;
}

export class LobbyRoom extends Room {
  // State type declaration
  declare state: LobbyState;
  // Quick match queue
  private matchQueue: Client[] = [];
  private matchCheckInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Room creation
   */
  onCreate(): void {
    console.log('[LobbyRoom] Lobby created');

    this.setState(new LobbyState());

    // No max clients for lobby
    this.maxClients = 1000;

    // Auto dispose when empty
    this.autoDispose = false;

    // Register message handlers
    this.registerMessageHandlers();

    // Start periodic room list refresh
    this.startRoomListRefresh();

    // Start match queue processor
    this.startMatchQueueProcessor();
  }

  /**
   * Register message handlers
   */
  private registerMessageHandlers(): void {
    this.onMessage(LobbyMessage.CREATE_ROOM, async (client, options: CreateRoomOptions) => {
      await this.handleCreateRoom(client, options);
    });

    this.onMessage(LobbyMessage.JOIN_ROOM, async (client, options: JoinRoomOptions) => {
      await this.handleJoinRoom(client, options);
    });

    this.onMessage(LobbyMessage.QUICK_MATCH, (client) => {
      this.handleQuickMatch(client);
    });

    this.onMessage(LobbyMessage.CANCEL_SEARCH, (client) => {
      this.handleCancelSearch(client);
    });

    this.onMessage(LobbyMessage.REFRESH_ROOMS, async (client) => {
      await this.refreshRoomList();
      client.send(LobbyMessage.ROOM_LIST_UPDATED, {
        rooms: this.state.availableRooms.toArray(),
      });
    });
  }

  /**
   * Start periodic room list refresh
   */
  private startRoomListRefresh(): void {
    // Refresh every 5 seconds
    this.clock.setInterval(async () => {
      await this.refreshRoomList();
    }, 5000);
  }

  /**
   * Start match queue processor
   */
  private startMatchQueueProcessor(): void {
    // Check queue every second
    this.matchCheckInterval = setInterval(() => {
      this.processMatchQueue();
    }, 1000);
  }

  /**
   * Process match queue
   */
  private processMatchQueue(): void {
    // Need at least 2 players to make a match
    while (this.matchQueue.length >= 2) {
      const player1 = this.matchQueue.shift()!;
      const player2 = this.matchQueue.shift()!;

      // Verify both clients are still connected
      if (!this.isClientConnected(player1) || !this.isClientConnected(player2)) {
        // Put back connected players
        if (this.isClientConnected(player1)) this.matchQueue.unshift(player1);
        if (this.isClientConnected(player2)) this.matchQueue.unshift(player2);
        continue;
      }

      // Create a match
      this.createMatchedGame(player1, player2);
    }
  }

  /**
   * Check if client is still connected
   */
  private isClientConnected(client: Client): boolean {
    return this.clients.includes(client);
  }

  /**
   * Create a matched game
   */
  private async createMatchedGame(player1: Client, player2: Client): Promise<void> {
    try {
      const lobbyPlayer1 = this.state.players.get(player1.sessionId);
      const lobbyPlayer2 = this.state.players.get(player2.sessionId);

      // Create game room
      const room = await matchMaker.createRoom('game', {
        mapSize: 'medium',
      });

      // Get reservation for both players
      const reservation1 = await matchMaker.reserveSeatFor(room, {
        playerName: lobbyPlayer1?.name || 'Player 1',
      });

      const reservation2 = await matchMaker.reserveSeatFor(room, {
        playerName: lobbyPlayer2?.name || 'Player 2',
      });

      // Send match info to both players
      player1.send(LobbyMessage.MATCH_FOUND, {
        roomId: room.roomId,
        reservation: reservation1,
      });

      player2.send(LobbyMessage.MATCH_FOUND, {
        roomId: room.roomId,
        reservation: reservation2,
      });

      // Update player search status
      if (lobbyPlayer1) lobbyPlayer1.isSearching = false;
      if (lobbyPlayer2) lobbyPlayer2.isSearching = false;

      console.log(
        `[LobbyRoom] Match created: ${lobbyPlayer1?.name} vs ${lobbyPlayer2?.name} in room ${room.roomId}`
      );
    } catch (error) {
      console.error('[LobbyRoom] Failed to create match:', error);

      // Put players back in queue
      this.matchQueue.unshift(player1);
      this.matchQueue.unshift(player2);
    }
  }

  /**
   * Refresh available room list
   */
  private async refreshRoomList(): Promise<void> {
    try {
      const rooms = await matchMaker.query({ name: 'game' });

      // Clear current list
      this.state.availableRooms.clear();

      let gamesInProgress = 0;

      for (const room of rooms) {
        // Only show rooms that are waiting for players
        if (!room.locked && room.clients < room.maxClients) {
          const listing = new RoomListing();
          listing.roomId = room.roomId;
          listing.roomName = room.metadata?.roomName || `Game ${room.roomId.slice(0, 6)}`;
          listing.hostName = room.metadata?.hostName || 'Unknown';
          listing.mapSize = room.metadata?.mapSize || 'medium';
          listing.playerCount = room.clients;
          listing.maxPlayers = room.maxClients;
          listing.isPrivate = room.metadata?.isPrivate || false;
          listing.isPlaying = room.metadata?.isPlaying || false;

          this.state.availableRooms.push(listing);
        }

        if (room.metadata?.isPlaying) {
          gamesInProgress++;
        }
      }

      this.state.gamesInProgress = gamesInProgress;
    } catch (error) {
      console.error('[LobbyRoom] Failed to refresh room list:', error);
    }
  }

  /**
   * Player joins lobby
   */
  onJoin(client: Client, options: LobbyOptions): void {
    const playerName = options.playerName || `Player ${this.state.onlineCount + 1}`;

    console.log(`[LobbyRoom] Player joined lobby: ${playerName} (${client.sessionId})`);

    const player = new LobbyPlayer(client.sessionId, playerName);
    this.state.players.set(client.sessionId, player);
    this.state.onlineCount = this.state.players.size;
  }

  /**
   * Player leaves lobby
   */
  onLeave(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    console.log(`[LobbyRoom] Player left lobby: ${player?.name || client.sessionId}`);

    // Remove from match queue
    const queueIndex = this.matchQueue.indexOf(client);
    if (queueIndex !== -1) {
      this.matchQueue.splice(queueIndex, 1);
    }

    this.state.players.delete(client.sessionId);
    this.state.onlineCount = this.state.players.size;
  }

  /**
   * Room disposal
   */
  onDispose(): void {
    console.log('[LobbyRoom] Lobby disposed');

    if (this.matchCheckInterval) {
      clearInterval(this.matchCheckInterval);
    }
  }

  // ==================== Message Handlers ====================

  /**
   * Handle create room
   */
  private async handleCreateRoom(client: Client, options: CreateRoomOptions): Promise<void> {
    try {
      const player = this.state.players.get(client.sessionId);

      const room = await matchMaker.createRoom('game', {
        mapSize: options.mapSize || 'medium',
        isPrivate: options.isPrivate || false,
      });

      // Get reservation for the creator
      const reservation = await matchMaker.reserveSeatFor(room, {
        playerName: player?.name || 'Host',
      });

      // Update room metadata
      await matchMaker.remoteRoomCall(room.roomId, 'setMetadata', [
        {
          roomName: options.roomName || `${player?.name}'s Game`,
          hostName: player?.name || 'Unknown',
          mapSize: options.mapSize || 'medium',
          isPrivate: options.isPrivate || false,
          isPlaying: false,
        },
      ]);

      client.send(LobbyMessage.ROOM_CREATED, {
        roomId: room.roomId,
        reservation,
      });

      console.log(`[LobbyRoom] Room created: ${room.roomId} by ${player?.name}`);
    } catch (error) {
      console.error('[LobbyRoom] Failed to create room:', error);
      client.send(LobbyMessage.ERROR, {
        code: 'CREATE_FAILED',
        message: 'Failed to create room',
      });
    }
  }

  /**
   * Handle join room
   */
  private async handleJoinRoom(client: Client, options: JoinRoomOptions): Promise<void> {
    try {
      const player = this.state.players.get(client.sessionId);

      // Query the room first to get its reference
      const rooms = await matchMaker.query({ roomId: options.roomId });
      if (rooms.length === 0) {
        throw new Error('Room not found');
      }

      const room = rooms[0];
      if (room.clients >= room.maxClients) {
        throw new Error('Room is full');
      }

      // Get a proper reservation (not joinById which returns Room directly)
      const reservation = await matchMaker.reserveSeatFor(room, {
        playerName: player?.name || 'Player',
      });

      client.send(LobbyMessage.MATCH_FOUND, {
        roomId: options.roomId,
        reservation,
      });

      console.log(`[LobbyRoom] Player ${player?.name} joining room ${options.roomId}`);
    } catch (error) {
      console.error('[LobbyRoom] Failed to join room:', error);
      client.send(LobbyMessage.ERROR, {
        code: 'JOIN_FAILED',
        message: 'Failed to join room. It may be full or no longer available.',
      });
    }
  }

  /**
   * Handle quick match
   */
  private handleQuickMatch(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    // Check if already in queue
    if (this.matchQueue.includes(client)) {
      return;
    }

    player.isSearching = true;
    this.matchQueue.push(client);

    console.log(`[LobbyRoom] Player ${player.name} joined match queue (queue size: ${this.matchQueue.length})`);
  }

  /**
   * Handle cancel search
   */
  private handleCancelSearch(client: Client): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;

    const index = this.matchQueue.indexOf(client);
    if (index !== -1) {
      this.matchQueue.splice(index, 1);
      player.isSearching = false;

      console.log(`[LobbyRoom] Player ${player.name} left match queue`);
    }
  }
}
