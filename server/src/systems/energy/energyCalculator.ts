/**
 * Energy Calculator - Server-side energy production/consumption calculation
 * Determines energy satisfaction ratio for damage multipliers
 *
 * Port of src/systems/energy/energy.ts for server use
 */

import type { TowerState } from '../../schema/TowerState.js';
import type { BuildingState } from '../../schema/BuildingState.js';
import type { MapSchema } from '@colyseus/schema';
import { scalePeriod } from '../../shared/constants/speedScale.js';

/**
 * Configuration for energy calculation
 */
export interface EnergyConfig {
  rootProduction: number; // Base production from headquarters
  penaltyInterval: number; // Ticks between penalty application
  penaltyCost: number; // Money cost per energy deficit
  bonusInterval: number; // Ticks between bonus application
  consumptionPerTowerLevel: number; // Energy per tower level
  consumptionPerRepairBuilding: number; // Energy per repair building
}

const DEFAULT_CONFIG: EnergyConfig = {
  rootProduction: 6,
  penaltyInterval: scalePeriod(120),
  penaltyCost: 1,
  bonusInterval: scalePeriod(400),
  consumptionPerTowerLevel: 0.5,
  consumptionPerRepairBuilding: 0.5,
};

/**
 * Energy state for a player
 */
export interface PlayerEnergyState {
  production: number;
  consumption: number;
  balance: number;
  satisfactionRatio: number;
  isDeficit: boolean;
}

/**
 * Mine-like entity for energy production
 */
interface MineEntity {
  id: string;
  ownerId: string;
  production: number; // Energy production value
}

/**
 * Calculate energy for all players
 */
export class EnergyCalculator {
  private config: EnergyConfig;

  // Cache per player
  private playerStates: Map<string, PlayerEnergyState> = new Map();
  private dirty: boolean = true;

  // Track mines separately (buildings with energy production)
  private mines: Map<string, MineEntity> = new Map();

  constructor(config: Partial<EnergyConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Mark energy as needing recalculation
   */
  markDirty(): void {
    this.dirty = true;
  }

  /**
   * Register a mine (energy-producing building)
   */
  registerMine(id: string, ownerId: string, production: number): void {
    this.mines.set(id, { id, ownerId, production });
    this.markDirty();
  }

  /**
   * Unregister a mine
   */
  unregisterMine(id: string): void {
    this.mines.delete(id);
    this.markDirty();
  }

  /**
   * Update mine production
   */
  updateMineProduction(id: string, production: number): void {
    const mine = this.mines.get(id);
    if (mine) {
      mine.production = production;
      this.markDirty();
    }
  }

  /**
   * Recalculate energy for all players
   */
  recalculate(
    towers: MapSchema<TowerState>,
    buildings: MapSchema<BuildingState>,
    validTerritoryIds: Map<string, Set<string>> // playerId -> set of valid entity IDs
  ): Map<string, PlayerEnergyState> {
    if (!this.dirty) return this.playerStates;
    this.dirty = false;

    // Collect all player IDs
    const playerIds = new Set<string>();
    towers.forEach((t) => {
      if (t.ownerId) playerIds.add(t.ownerId);
    });
    buildings.forEach((b) => {
      if (b.ownerId) playerIds.add(b.ownerId);
    });

    // Calculate for each player
    for (const playerId of playerIds) {
      const state = this.calculatePlayerEnergy(
        playerId,
        towers,
        buildings,
        validTerritoryIds.get(playerId) || new Set()
      );
      this.playerStates.set(playerId, state);
    }

    return this.playerStates;
  }

  /**
   * Calculate energy for a single player
   */
  private calculatePlayerEnergy(
    playerId: string,
    towers: MapSchema<TowerState>,
    buildings: MapSchema<BuildingState>,
    validTerritoryIds: Set<string>
  ): PlayerEnergyState {
    // Production: base + mines
    let production = this.config.rootProduction;

    for (const mine of this.mines.values()) {
      if (mine.ownerId === playerId) {
        production += mine.production;
      }
    }

    // Consumption: towers in valid territory
    let consumption = 0;

    towers.forEach((tower) => {
      if (tower.ownerId !== playerId) return;
      if (!validTerritoryIds.has(tower.id)) return;

      consumption += this.config.consumptionPerTowerLevel * tower.level;
    });

    // Consumption: repair buildings in valid territory
    buildings.forEach((building) => {
      if (building.ownerId !== playerId) return;
      if (!validTerritoryIds.has(building.id)) return;

      // Check if it's a repair building (otherHpAddAble)
      if (building.buildingType === 'RepairBuilding') {
        consumption += this.config.consumptionPerRepairBuilding;
      }
    });

    const balance = production - consumption;
    let satisfactionRatio = 1;

    if (consumption > 0 && production < consumption) {
      satisfactionRatio = production / consumption;
    }

    return {
      production,
      consumption,
      balance,
      satisfactionRatio,
      isDeficit: balance < 0,
    };
  }

  /**
   * Get energy state for a specific player
   */
  getPlayerState(playerId: string): PlayerEnergyState | undefined {
    return this.playerStates.get(playerId);
  }

  /**
   * Get satisfaction ratio for a player (used for damage calculation)
   * Returns 1.0 if player not found or no deficit
   */
  getSatisfactionRatio(playerId: string): number {
    const state = this.playerStates.get(playerId);
    return state?.satisfactionRatio ?? 1;
  }

  /**
   * Process energy tick (apply penalties/bonuses)
   * Returns map of playerId -> money change (negative for penalty, positive for bonus)
   */
  processTick(currentTick: number): Map<string, number> {
    const moneyChanges = new Map<string, number>();

    for (const [playerId, state] of this.playerStates) {
      let change = 0;

      // Penalty for deficit
      if (state.isDeficit && currentTick % this.config.penaltyInterval === 0) {
        change -= this.config.penaltyCost;
      }

      // Bonus for surplus
      if (state.balance > 0 && currentTick % this.config.bonusInterval === 0) {
        change += Math.floor(state.balance);
      }

      if (change !== 0) {
        moneyChanges.set(playerId, change);
      }
    }

    return moneyChanges;
  }
}
