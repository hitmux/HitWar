/**
 * MultiPlayerEnergy - Manages multiple Energy instances for multiplayer mode
 *
 * In multiplayer mode, each player has their own Energy instance that tracks
 * only their owned mines, towers, and buildings.
 */

import { Energy } from './energy';

interface WorldLike {
    time: number;
    cheatMode: { enabled: boolean; disableEnergy: boolean };
    mines: Set<{ getEnergyProduction: () => number; ownerId?: string | null }>;
    batterys: Array<{ inValidTerritory: boolean; getTowerLevel: () => number; ownerId?: string | null }>;
    buildings: Array<{ otherHpAddAble?: boolean; inValidTerritory: boolean; ownerId?: string | null }>;
    getMoney(): number;
    addMoney(amount: number): void;
    spendMoney(amount: number, force?: boolean): boolean;
    addMoneyToOwner(ownerId: string | null, amount: number): void;
    spendMoneyFromOwner(ownerId: string | null, amount: number, force?: boolean): boolean;
}

export class MultiPlayerEnergy {
    private _energyByPlayer: Map<string, Energy> = new Map();
    private _world: WorldLike;

    constructor(world: WorldLike, playerIds: string[]) {
        this._world = world;
        for (const playerId of playerIds) {
            this._energyByPlayer.set(playerId, new Energy(world, playerId));
        }
    }

    /**
     * Get Energy instance for a specific player
     */
    getEnergy(playerId: string): Energy | undefined {
        return this._energyByPlayer.get(playerId);
    }

    /**
     * Get all Energy instances
     */
    getAllEnergies(): Energy[] {
        return Array.from(this._energyByPlayer.values());
    }

    /**
     * Mark all energy instances as dirty
     */
    markDirty(): void {
        for (const energy of this._energyByPlayer.values()) {
            energy.markDirty();
        }
    }

    /**
     * Update all energy instances each tick
     * Note: In multiplayer, each player's penalties/bonuses should use their own money
     * For now, we'll need World to provide player-specific money methods
     */
    goTick(): void {
        for (const energy of this._energyByPlayer.values()) {
            energy.goTick();
        }
    }
}
