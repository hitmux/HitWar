/**
 * Player State Schema
 * Represents a player in the multiplayer game
 */
import { Schema, type } from '@colyseus/schema';
import { VectorSchema } from './VectorSchema.js';

export class PlayerState extends Schema {
  @type('string') id: string = '';
  @type('string') name: string = '';
  @type('string') color: string = '#ffffff';
  @type('number') money: number = 0;
  @type('boolean') isAlive: boolean = true;
  @type('boolean') isConnected: boolean = true;
  @type('boolean') isReady: boolean = false;
  @type('string') sessionId: string = ''; // For reconnection
  @type(VectorSchema) basePosition: VectorSchema = new VectorSchema();

  // Player index (0 for left, 1 for right)
  @type('number') playerIndex: number = 0;

  // Statistics
  @type('number') towersBuilt: number = 0;
  @type('number') monstersKilled: number = 0;
  @type('number') monstersSpawned: number = 0;

  constructor(id: string = '', name: string = '', playerIndex: number = 0) {
    super();
    this.id = id;
    this.name = name;
    this.playerIndex = playerIndex;
  }
}

/**
 * Player colors for multiplayer
 */
export const PLAYER_COLORS = ['#4a90d9', '#d94a4a', '#4ad94a', '#d9d94a'];
