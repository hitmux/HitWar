/**
 * PlayerManager - Manages player state for multiplayer support
 *
 * In single-player mode, there's one player (DEFAULT_PLAYER_ID).
 * In multiplayer mode, manages multiple players with their own
 * bases, money, and alive status.
 */

import type { Player, PlayerConfig } from '@/types/player';
import type { BuildingLike } from '@/types/worldLike';
import { DEFAULT_PLAYER_ID, PLAYER_COLORS, PVP_CONFIG } from '@/types/player';

/**
 * Game result after checking win conditions
 */
export interface GameResult {
    ended: boolean;
    winner: Player | null;
    reason?: 'last_standing' | 'draw' | 'timeout';
}

export class PlayerManager {
    /** Map of player ID to player */
    private _players: Map<string, Player> = new Map();

    /** Current local player ID (for rendering perspective) */
    private _localPlayerId: string = DEFAULT_PLAYER_ID;

    /** Whether this is a multiplayer game */
    private _isMultiplayer: boolean = false;

    constructor() {
        // Initialize with default single-player
        this.initSinglePlayer();
    }

    /**
     * Initialize for single-player mode
     */
    initSinglePlayer(initialMoney: number = 200): void {
        this._players.clear();
        this._isMultiplayer = false;
        this._localPlayerId = DEFAULT_PLAYER_ID;

        const player: Player = {
            id: DEFAULT_PLAYER_ID,
            name: 'Player',
            color: PLAYER_COLORS[0],
            baseBuilding: null,
            money: initialMoney,
            isAlive: true,
        };

        this._players.set(player.id, player);
    }

    /**
     * Initialize for multiplayer mode
     */
    initMultiplayer(configs: PlayerConfig[]): void {
        this._players.clear();
        this._isMultiplayer = true;

        for (let i = 0; i < configs.length; i++) {
            const config = configs[i];
            const player: Player = {
                id: config.id,
                name: config.name,
                color: config.color || PLAYER_COLORS[i] || '#888888',
                baseBuilding: null,
                money: config.initialMoney ?? PVP_CONFIG.initialMoney,
                isAlive: true,
            };
            this._players.set(player.id, player);
        }

        // Default local player to first player
        if (configs.length > 0) {
            this._localPlayerId = configs[0].id;
        }
    }

    /**
     * Set local player ID (for multiplayer client)
     */
    setLocalPlayer(playerId: string): void {
        if (this._players.has(playerId)) {
            this._localPlayerId = playerId;
        }
    }

    /**
     * Get a player by ID
     */
    getPlayer(id: string): Player | undefined {
        return this._players.get(id);
    }

    /**
     * Get the current local player
     */
    getLocalPlayer(): Player | undefined {
        return this._players.get(this._localPlayerId);
    }

    /**
     * Get all players
     */
    getAllPlayers(): Player[] {
        return Array.from(this._players.values());
    }

    /**
     * Get all alive players
     */
    getAlivePlayers(): Player[] {
        return this.getAllPlayers().filter(p => p.isAlive);
    }

    /**
     * Get player count
     */
    get playerCount(): number {
        return this._players.size;
    }

    /**
     * Check if multiplayer mode
     */
    get isMultiplayer(): boolean {
        return this._isMultiplayer;
    }

    /**
     * Get local player ID
     */
    get localPlayerId(): string {
        return this._localPlayerId;
    }

    // =========================================================================
    // Money management
    // =========================================================================

    /**
     * Get money for a player
     */
    getMoney(playerId?: string): number {
        const id = playerId ?? this._localPlayerId;
        const player = this._players.get(id);
        return player?.money ?? 0;
    }

    /**
     * Add money to a player
     */
    addMoney(amount: number, playerId?: string): void {
        // Guard against NaN
        if (Number.isNaN(amount)) return;
        const id = playerId ?? this._localPlayerId;
        const player = this._players.get(id);
        if (player) {
            player.money += amount;
        }
    }

    /**
     * Spend money from a player
     * @returns true if successful, false if not enough money
     */
    spendMoney(amount: number, playerId?: string): boolean {
        // Guard against NaN
        if (Number.isNaN(amount)) return false;
        const id = playerId ?? this._localPlayerId;
        const player = this._players.get(id);
        if (!player) return false;

        if (player.money >= amount) {
            player.money -= amount;
            return true;
        }
        return false;
    }

    /**
     * Set money for a player
     */
    setMoney(amount: number, playerId?: string): void {
        // Guard against NaN
        if (Number.isNaN(amount)) return;
        const id = playerId ?? this._localPlayerId;
        const player = this._players.get(id);
        if (player) {
            player.money = amount;
        }
    }

    // =========================================================================
    // Base building management
    // =========================================================================

    /**
     * Set base building for a player
     */
    setBaseBuilding(building: BuildingLike, playerId?: string): void {
        const id = playerId ?? this._localPlayerId;
        const player = this._players.get(id);
        if (player) {
            player.baseBuilding = building;
        }
    }

    /**
     * Get base building for a player
     */
    getBaseBuilding(playerId?: string): BuildingLike | null {
        const id = playerId ?? this._localPlayerId;
        const player = this._players.get(id);
        return player?.baseBuilding ?? null;
    }

    /**
     * Get all base buildings (for multi-base scenarios)
     */
    getAllBaseBuildings(): BuildingLike[] {
        const bases: BuildingLike[] = [];
        for (const player of this._players.values()) {
            if (player.baseBuilding && player.isAlive) {
                bases.push(player.baseBuilding);
            }
        }
        return bases;
    }

    // =========================================================================
    // Game state management
    // =========================================================================

    /**
     * Mark a player as eliminated
     */
    eliminatePlayer(playerId: string): void {
        const player = this._players.get(playerId);
        if (player) {
            player.isAlive = false;
        }
    }

    /**
     * Check win conditions
     */
    checkGameEnd(): GameResult {
        const alivePlayers = this.getAlivePlayers();

        // Only one player alive -> winner
        if (alivePlayers.length === 1) {
            return {
                ended: true,
                winner: alivePlayers[0],
                reason: 'last_standing',
            };
        }

        // No players alive -> draw
        if (alivePlayers.length === 0) {
            return {
                ended: true,
                winner: null,
                reason: 'draw',
            };
        }

        // Game continues
        return { ended: false, winner: null };
    }

    /**
     * Handle building destroyed event
     */
    onBuildingDestroyed(building: BuildingLike): GameResult | null {
        // Check if this was a base building
        for (const player of this._players.values()) {
            if (player.baseBuilding === building) {
                player.isAlive = false;
                return this.checkGameEnd();
            }
        }
        return null;
    }
}
