/**
 * Lobby State Schema
 * State for the lobby room
 */
import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';

/**
 * Available room listing
 */
export class RoomListing extends Schema {
  @type('string') roomId: string = '';
  @type('string') roomName: string = '';
  @type('string') hostName: string = '';
  @type('string') mapSize: string = 'medium';
  @type('number') playerCount: number = 0;
  @type('number') maxPlayers: number = 2;
  @type('boolean') isPrivate: boolean = false;
  @type('boolean') isPlaying: boolean = false;
  @type('number') createdAt: number = 0;

  constructor() {
    super();
    this.createdAt = Date.now();
  }
}

/**
 * Lobby player info
 */
export class LobbyPlayer extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type('boolean') isSearching: boolean = false;
  @type('number') joinedAt: number = 0;

  constructor(id: string = '', name: string = '') {
    super();
    this.id = id;
    this.name = name;
    this.joinedAt = Date.now();
  }
}

/**
 * Lobby state
 */
export class LobbyState extends Schema {
  @type({ map: LobbyPlayer }) players: MapSchema<LobbyPlayer> = new MapSchema<LobbyPlayer>();
  @type([RoomListing]) availableRooms: ArraySchema<RoomListing> = new ArraySchema<RoomListing>();
  @type('number') onlineCount: number = 0;
  @type('number') gamesInProgress: number = 0;

  constructor() {
    super();
    this.players = new MapSchema<LobbyPlayer>();
    this.availableRooms = new ArraySchema<RoomListing>();
  }
}
