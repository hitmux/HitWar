/**
 * Energy - Energy system core management
 * Handles energy production/consumption calculation, penalty logic
 */

interface WorldLike {
    time: number;
    user: { money: number };
    cheatMode: { enabled: boolean; disableEnergy: boolean };
    mines: Set<{ getEnergyProduction: () => number }>;
    batterys: Array<{ inValidTerritory: boolean; getTowerLevel: () => number }>;
    buildings: Array<{ otherHpAddAble?: boolean; inValidTerritory: boolean }>;
}

export class Energy {
    world: WorldLike;
    PENALTY_INTERVAL: number = 120; // Penalty interval (ticks)
    PENALTY_COST: number = 1;       // Money cost per energy deficit unit
    ROOT_PRODUCTION: number = 6;    // Headquarters fixed production

    // Cache for production and consumption
    private _productionCache: number = 0;
    private _consumptionCache: number = 0;
    private _productionDirty: boolean = true;
    private _consumptionDirty: boolean = true;

    constructor(world: WorldLike) {
        this.world = world;
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
     */
    getTotalProduction(): number {
        if (this._productionDirty) {
            let total = this.ROOT_PRODUCTION;  // Headquarters fixed 6 units
            for (const mine of this.world.mines) {
                total += mine.getEnergyProduction();
            }
            this._productionCache = total;
            this._productionDirty = false;
        }
        return this._productionCache;
    }

    /**
     * Calculate total energy consumption
     */
    getTotalConsumption(): number {
        if (this._consumptionDirty) {
            let total = 0;
            // Tower consumption
            for (const t of this.world.batterys) {
                if (t.inValidTerritory) {
                    total += 0.5 * t.getTowerLevel();
                }
            }
            // Repair tower consumption
            for (const b of this.world.buildings) {
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
            this.world.user.money -= this.PENALTY_COST;
        }
        
        // Energy surplus bonus: +1 gold per surplus energy every 400 ticks
        if (balance > 0 && this.world.time % 400 === 0) {
            this.world.user.money += balance;
        }
    }
}
