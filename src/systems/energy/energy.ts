/**
 * Energy - Energy system core management
 * Handles energy production/consumption calculation, penalty logic
 *
 * In multiplayer mode, each player has their own Energy instance with a playerId.
 * The instance only counts mines/towers owned by that player.
 * In single-player mode, playerId is null and all entities are counted.
 */

import { scalePeriod } from '../../core/speedScale';

interface MineLike {
    getEnergyProduction: () => number;
    ownerId?: string | null;
}

interface TowerLike {
    inValidTerritory: boolean;
    getTowerLevel: () => number;
    ownerId?: string | null;
}

interface BuildingLike {
    otherHpAddAble?: boolean;
    inValidTerritory: boolean;
    ownerId?: string | null;
}

interface WorldLike {
    time: number;
    cheatMode: { enabled: boolean; disableEnergy: boolean };
    mines: Set<MineLike>;
    batterys: TowerLike[];
    buildings: BuildingLike[];
    // Money management (multiplayer compatible)
    addMoneyToOwner(ownerId: string | null, amount: number): void;
    spendMoneyFromOwner(ownerId: string | null, amount: number, force?: boolean): boolean;
}

export class Energy {
    world: WorldLike;

    // Player ID for multiplayer (null = single-player mode, counts all entities)
    playerId: string | null = null;

    PENALTY_INTERVAL: number = scalePeriod(120); // Penalty interval (ticks)
    PENALTY_COST: number = 1;       // Money cost per energy deficit unit
    ROOT_PRODUCTION: number = 6;    // Headquarters fixed production
    BONUS_INTERVAL: number = scalePeriod(400); // Bonus interval (ticks)

    // Cache for production and consumption
    private _productionCache: number = 0;
    private _consumptionCache: number = 0;
    private _productionDirty: boolean = true;
    private _consumptionDirty: boolean = true;

    constructor(world: WorldLike, playerId?: string) {
        this.world = world;
        this.playerId = playerId ?? null;
    }

    /**
     * Mark cache as dirty (should be called at the start of each tick)
     */
    markDirty(): void {
        this._productionDirty = true;
        this._consumptionDirty = true;
    }

    /**
     * Calculate total energy production
     * In multiplayer mode, only counts mines owned by this player
     */
    getTotalProduction(): number {
        if (this._productionDirty) {
            let total = this.ROOT_PRODUCTION;  // Headquarters fixed 6 units
            for (const mine of this.world.mines) {
                // Multiplayer: only count mines owned by this player
                if (this.playerId !== null && mine.ownerId !== this.playerId) continue;
                const prod = mine.getEnergyProduction();
                // Guard against NaN
                if (!Number.isNaN(prod)) {
                    total += prod;
                }
            }
            this._productionCache = total;
            this._productionDirty = false;
        }
        return this._productionCache;
    }

    /**
     * Calculate total energy consumption
     * In multiplayer mode, only counts towers/buildings owned by this player
     */
    getTotalConsumption(): number {
        if (this._consumptionDirty) {
            let total = 0;
            // Tower consumption
            for (const t of this.world.batterys) {
                // Multiplayer: only count towers owned by this player
                if (this.playerId !== null && t.ownerId !== this.playerId) continue;
                if (t.inValidTerritory) {
                    const level = t.getTowerLevel();
                    // Guard against NaN
                    if (!Number.isNaN(level)) {
                        total += 0.5 * level;
                    }
                }
            }
            // Repair tower consumption
            for (const b of this.world.buildings) {
                // Multiplayer: only count buildings owned by this player
                if (this.playerId !== null && b.ownerId !== this.playerId) continue;
                if (b.otherHpAddAble && b.inValidTerritory) {
                    total += 0.5;
                }
            }
            this._consumptionCache = total;
            this._consumptionDirty = false;
        }
        return this._consumptionCache;
    }

    /**
     * Get energy balance
     */
    getBalance(): number {
        return this.getTotalProduction() - this.getTotalConsumption();
    }

    /**
     * Get energy satisfaction ratio (production / consumption)
     * Returns 1 if no consumption or surplus, returns ratio if deficit
     */
    getSatisfactionRatio(): number {
        // Return 1 (no penalty) when energy system is disabled
        if (this.world.cheatMode.enabled && this.world.cheatMode.disableEnergy) {
            return 1;
        }
        const production = this.getTotalProduction();
        const consumption = this.getTotalConsumption();
        if (consumption <= 0) return 1;
        if (production >= consumption) return 1;
        return production / consumption;
    }

    /**
     * Check if energy is deficit
     */
    isDeficit(): boolean {
        // Never show deficit in cheat mode
        if (this.world.cheatMode.enabled && this.world.cheatMode.disableEnergy) {
            return false;
        }
        return this.getBalance() < 0;
    }

    /**
     * Called every tick
     */
    goTick(): void {
        // Mark cache as dirty at the start of each tick
        this.markDirty();

        // Disable energy penalty in cheat mode
        if (this.world.cheatMode.enabled && this.world.cheatMode.disableEnergy) {
            return;
        }

        const balance = this.getBalance();
        if (balance < 0 && this.world.time % this.PENALTY_INTERVAL === 0) {
            // Use playerId to penalize the correct player
            this.world.spendMoneyFromOwner(this.playerId, this.PENALTY_COST, true);
        }

        // Energy surplus bonus: +1 gold per surplus energy every BONUS_INTERVAL ticks
        if (balance > 0 && this.world.time % this.BONUS_INTERVAL === 0) {
            // Guard against NaN to prevent money corruption
            if (!Number.isNaN(balance)) {
                // Use playerId to reward the correct player
                this.world.addMoneyToOwner(this.playerId, balance);
            }
        }
    }
}
