/**
 * MultiPlayerFogOfWar - Manages multiple FogOfWar instances for multiplayer mode
 *
 * In multiplayer mode, each player has their own FogOfWar instance that tracks
 * only their owned towers for vision. For performance optimization, only the
 * local player's fog is updated each frame.
 */

import { FogOfWar, WorldLike as FogWorldLike } from './fogOfWar';

export class MultiPlayerFogOfWar {
    private _fogByPlayer: Map<string, FogOfWar> = new Map();
    private _localPlayerId: string;
    private _world: FogWorldLike;

    constructor(world: FogWorldLike, playerIds: string[], localPlayerId: string) {
        this._world = world;
        this._localPlayerId = localPlayerId;

        // Create FogOfWar for all players
        for (const playerId of playerIds) {
            this._fogByPlayer.set(playerId, new FogOfWar(world, playerId));
        }
    }

    /**
     * Get FogOfWar instance for the local player
     */
    getLocalFog(): FogOfWar | undefined {
        return this._fogByPlayer.get(this._localPlayerId);
    }

    /**
     * Get FogOfWar instance for a specific player
     */
    getFog(playerId: string): FogOfWar | undefined {
        return this._fogByPlayer.get(playerId);
    }

    /**
     * Get all FogOfWar instances
     */
    getAllFogs(): FogOfWar[] {
        return Array.from(this._fogByPlayer.values());
    }

    /**
     * Update fog of war - only updates the local player's fog for performance
     */
    update(): void {
        this.getLocalFog()?.update();
    }

    /**
     * Mark all fog instances as dirty
     */
    markDirty(): void {
        for (const fog of this._fogByPlayer.values()) {
            fog.markDirty();
        }
    }
}
