/**
 * Game State Schema
 * Main state container for multiplayer game
 */
import { Schema, type, MapSchema, ArraySchema } from '@colyseus/schema';
import { PlayerState } from './PlayerState.js';
import { TowerState } from './TowerState.js';
import { MonsterState } from './MonsterState.js';
import { BuildingState } from './BuildingState.js';
import { BulletState } from './BulletState.js';

/**
 * Game phase enum
 */
export const GamePhase = {
  WAITING: 'waiting', // Waiting for players
  STARTING: 'starting', // Countdown before game starts
  PLAYING: 'playing', // Game in progress
  PAUSED: 'paused', // Game paused (e.g., player disconnected)
  ENDED: 'ended', // Game over
} as const;

export type GamePhaseType = (typeof GamePhase)[keyof typeof GamePhase];

/**
 * Game end reason
 */
export const GameEndReason = {
  LAST_STANDING: 'last_standing', // Only one player alive
  DRAW: 'draw', // All players eliminated
  SURRENDER: 'surrender', // Player surrendered
  DISCONNECT_TIMEOUT: 'disconnect_timeout', // Player didn't reconnect
} as const;

export type GameEndReasonType = (typeof GameEndReason)[keyof typeof GameEndReason];

/**
 * Map configuration
 */
export class MapConfig extends Schema {
  @type('string') size: string = 'medium'; // small, medium, large
  @type('number') width: number = 6000;
  @type('number') height: number = 4000;
}

/**
 * Wave state
 */
export class WaveState extends Schema {
  @type('number') currentWave: number = 0;
  @type('number') monstersRemaining: number = 0;
  @type('number') nextWaveTime: number = 0; // Ticks until next wave
  @type('boolean') isWaveActive: boolean = false;
}

/**
 * Main game state
 */
export class GameState extends Schema {
  // Game metadata
  @type('string') roomId: string = '';
  @type('string') phase: string = GamePhase.WAITING;
  @type('string') winnerId: string = ''; // Player ID of winner
  @type('string') endReason: string = '';

  // Timing
  @type('number') currentTick: number = 0;
  @type('number') startTime: number = 0; // Timestamp when game started
  @type('number') pauseTime: number = 0; // Timestamp when paused
  @type('number') countdownTicks: number = 0; // Countdown before game starts

  // Map configuration
  @type(MapConfig) mapConfig: MapConfig = new MapConfig();

  // Wave state
  @type(WaveState) wave: WaveState = new WaveState();

  // Entity collections (using MapSchema for efficient delta sync)
  @type({ map: PlayerState }) players: MapSchema<PlayerState> = new MapSchema<PlayerState>();
  @type({ map: TowerState }) towers: MapSchema<TowerState> = new MapSchema<TowerState>();
  @type({ map: MonsterState }) monsters: MapSchema<MonsterState> = new MapSchema<MonsterState>();
  @type({ map: BuildingState }) buildings: MapSchema<BuildingState> = new MapSchema<BuildingState>();
  @type({ map: BulletState }) bullets: MapSchema<BulletState> = new MapSchema<BulletState>();

  // Disconnection handling
  @type('string') disconnectedPlayerId: string = '';
  @type('number') reconnectDeadline: number = 0; // Timestamp

  constructor() {
    super();
    this.mapConfig = new MapConfig();
    this.wave = new WaveState();
    this.players = new MapSchema<PlayerState>();
    this.towers = new MapSchema<TowerState>();
    this.monsters = new MapSchema<MonsterState>();
    this.buildings = new MapSchema<BuildingState>();
    this.bullets = new MapSchema<BulletState>();
  }

  /**
   * Get player by ID
   */
  getPlayer(playerId: string): PlayerState | undefined {
    return this.players.get(playerId);
  }

  /**
   * Get all alive players
   */
  getAlivePlayers(): PlayerState[] {
    return Array.from(this.players.values()).filter((p) => p.isAlive);
  }

  /**
   * Get player count
   */
  getPlayerCount(): number {
    return this.players.size;
  }

  /**
   * Check if game can start
   */
  canStart(): boolean {
    const readyPlayers = Array.from(this.players.values()).filter((p) => p.isReady);
    return readyPlayers.length >= 2;
  }

  /**
   * Generate unique entity ID
   */
  generateEntityId(prefix: string): string {
    return `${prefix}_${this.currentTick}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
