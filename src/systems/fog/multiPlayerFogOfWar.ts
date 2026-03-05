/**
 * MultiPlayerFogOfWar - Manages multiple FogOfWar instances for multiplayer mode
 *
 * In multiplayer mode, each player has their own FogOfWar instance that tracks
 * only their owned towers for vision. For performance optimization, only the
 * local player's fog is updated each frame.
 */

import { FogOfWar } from './fogOfWar';

interface WorldLike {
    width: number;
    height: number;
    viewWidth: number;
    viewHeight: number;
    camera: { x: number; y: number; zoom: number; viewWidth: number; viewHeight: number };
    getBaseBuilding(playerId?: string): { pos: { x: number; y: number } };
    batterys: Array<{
        pos: { x: number; y: number };
        inValidTerritory: boolean;
        ownerId?: string | null;
    }>;
    territory?: {
        validBuildings: Set<unknown>;
        recalculate(): void;
    };
}

export class MultiPlayerFogOfWar {
    private _fogByPlayer: Map<string, FogOfWar> = new Map();
    private _localPlayerId: string;
    private _world: WorldLike;

    constructor(world: WorldLike, playerIds: string[], localPlayerId: string) {
        this._world = world;
        this._localPlayerId = localPlayerId;

        // Only create FogOfWar for the local player - non-local instances are never used
        this._fogByPlayer.set(localPlayerId, new FogOfWar(world as any, localPlayerId));
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
