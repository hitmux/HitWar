/**
 * Player types for multiplayer support
 */

import type { BuildingLike, VectorLike } from './worldLike';

/**
 * Player interface - represents a player in the game
 */
export interface Player {
    /** Unique player identifier */
    id: string;
    /** Display name */
    name: string;
    /** Player color for UI and entity rendering */
    color: string;
    /** Base building reference */
    baseBuilding: BuildingLike | null;
    /** Current money */
    money: number;
    /** Whether player is still alive */
    isAlive: boolean;
}

/**
 * Player configuration for game initialization
 */
export interface PlayerConfig {
    id: string;
    name: string;
    color: string;
    /** Initial base position */
    basePosition: VectorLike;
    /** Initial money amount */
    initialMoney: number;
}

/**
 * Entity with owner ID for multiplayer ownership tracking
 */
export interface OwnedEntity {
    /** Owner player ID, null for neutral entities */
    ownerId: string | null;
}

/**
 * Default player ID for single-player mode
 * All entities default to this owner when ownerId is null
 */
export const DEFAULT_PLAYER_ID = 'player-0';

/**
 * Neutral entity owner ID (e.g., neutral monsters)
 */
export const NEUTRAL_OWNER_ID: null = null;

/**
 * PvP configuration constants
 */
export const PVP_CONFIG = {
    // Player settings
    maxPlayers: 2,
    initialMoney: 1000,

    // Map sizes
    mapSizes: {
        small: { width: 4000, height: 3000 },
        medium: { width: 6000, height: 4000 },
        large: { width: 8000, height: 5000 },
    },

    // Base positions (ratio relative to map size)
    basePositions: [
        { xRatio: 0.20, yRatio: 0.50 }, // Player A (left)
        { xRatio: 0.80, yRatio: 0.50 }, // Player B (right)
    ],

    // Spawn system
    spawn: {
        costMultiplier: 2, // spawn cost = addPrice × 2
    },

    // Vision
    vision: {
        spawnedMonsterProvidesVision: false,
    },
} as const;

// Re-export from shared config (single source of truth)
export { PLAYER_COLORS } from '@shared/config/playerMeta';
