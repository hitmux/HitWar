/**
 * Mine Manager
 * Handles mine state transitions: upgrade, repair, downgrade, sell, damage
 */

import type { GameState } from '../../schema/GameState.js';
import { MineState } from '../../schema/MineState.js';
import type { EnergyCalculator } from '../energy/energyCalculator.js';
import type { TerritoryCalculator } from '../territory/territoryCalculator.js';
import { MINE_CONFIG, MineStateType } from '../../../../shared/config/mineMeta.js';
import { generateMinePositions } from './mineGenerator.js';

interface ActionResult {
  ok: boolean;
  error?: string;
  cost?: number;
  refund?: number;
}

export class MineManager {
  private state: GameState;
  private energyCalc: EnergyCalculator;
  private territoryCalc: TerritoryCalculator;

  constructor(
    state: GameState,
    energyCalc: EnergyCalculator,
    territoryCalc: TerritoryCalculator
  ) {
    this.state = state;
    this.energyCalc = energyCalc;
    this.territoryCalc = territoryCalc;
  }

  /**
   * Generate and populate mines at game start
   */
  generateMines(basePositions: { x: number; y: number }[]): void {
    const positions = generateMinePositions(
      this.state.mapConfig.width,
      this.state.mapConfig.height,
      basePositions
    );

    for (const pos of positions) {
      const mine = new MineState();
      mine.id = this.state.generateEntityId('mine');
      mine.setPosition(pos.x, pos.y);
      mine.mineState = MineStateType.NORMAL;
      mine.radius = MINE_CONFIG.normalRadius;
      this.state.mines.set(mine.id, mine);
    }

    console.log(`[MineManager] Generated ${positions.length} mines`);
  }

  /**
   * Upgrade a mine (normal→powerPlant lv1, or powerPlant lv+1)
   */
  upgradeMine(mineId: string, playerId: string): ActionResult {
    const mine = this.state.mines.get(mineId);
    if (!mine) return { ok: false, error: 'Mine not found' };

    const player = this.state.getPlayer(playerId);
    if (!player?.isAlive) return { ok: false, error: 'Player not alive' };

    // Determine upgrade cost and validate state
    let cost: number;
    let newLevel: number;

    if (mine.mineState === MineStateType.NORMAL) {
      cost = MINE_CONFIG.upgradePrices[0];
      newLevel = 1;
    } else if (mine.mineState === MineStateType.POWER_PLANT) {
      if (mine.level >= MINE_CONFIG.maxLevel) {
        return { ok: false, error: 'Already max level' };
      }
      // Only owner can upgrade their own power plant
      if (mine.ownerId !== playerId) {
        return { ok: false, error: 'Not your power plant' };
      }
      cost = MINE_CONFIG.upgradePrices[mine.level];
      newLevel = mine.level + 1;
    } else {
      return { ok: false, error: 'Cannot upgrade damaged mine' };
    }

    if (player.money < cost) {
      return { ok: false, error: 'Insufficient funds' };
    }

    // Apply upgrade
    player.money -= cost;
    mine.mineState = MineStateType.POWER_PLANT;
    mine.level = newLevel;
    mine.hp = MINE_CONFIG.upgradeHp[newLevel - 1];
    mine.maxHp = MINE_CONFIG.upgradeHp[newLevel - 1];
    mine.ownerId = playerId;
    mine.radius = MINE_CONFIG.powerPlantRadius;

    this.energyCalc.markDirty();
    this.territoryCalc.markDirty();

    return { ok: true, cost };
  }

  /**
   * Repair a damaged mine back to normal state
   */
  repairMine(mineId: string, playerId: string): ActionResult {
    const mine = this.state.mines.get(mineId);
    if (!mine) return { ok: false, error: 'Mine not found' };

    const player = this.state.getPlayer(playerId);
    if (!player?.isAlive) return { ok: false, error: 'Player not alive' };

    if (mine.mineState !== MineStateType.DAMAGED) {
      return { ok: false, error: 'Mine is not damaged' };
    }
    if (mine.repairing) {
      return { ok: false, error: 'Already repairing' };
    }
    if (player.money < MINE_CONFIG.repairCost) {
      return { ok: false, error: 'Insufficient funds' };
    }

    player.money -= MINE_CONFIG.repairCost;
    mine.repairing = true;
    mine.repairProgress = 0;
    mine.ownerId = playerId;

    return { ok: true, cost: MINE_CONFIG.repairCost };
  }

  /**
   * Downgrade a power plant (lv3→lv2, lv2→lv1, lv1→normal)
   */
  downgradeMine(mineId: string, playerId: string): ActionResult {
    const mine = this.state.mines.get(mineId);
    if (!mine) return { ok: false, error: 'Mine not found' };

    if (mine.mineState !== MineStateType.POWER_PLANT) {
      return { ok: false, error: 'Not a power plant' };
    }
    if (mine.ownerId !== playerId) {
      return { ok: false, error: 'Not your power plant' };
    }

    const refund = Math.floor(
      MINE_CONFIG.upgradePrices[mine.level - 1] * MINE_CONFIG.downgradeRefundRatio
    );

    const player = this.state.getPlayer(playerId);
    if (player) player.money += refund;

    if (mine.level > 1) {
      mine.level--;
      mine.hp = MINE_CONFIG.upgradeHp[mine.level - 1];
      mine.maxHp = MINE_CONFIG.upgradeHp[mine.level - 1];
    } else {
      // Level 1 → normal mine
      mine.mineState = MineStateType.NORMAL;
      mine.level = 0;
      mine.hp = 0;
      mine.maxHp = 0;
      mine.ownerId = '';
      mine.radius = MINE_CONFIG.normalRadius;
    }

    this.energyCalc.markDirty();
    this.territoryCalc.markDirty();

    return { ok: true, refund };
  }

  /**
   * Sell a power plant (refund 50% of total invested)
   */
  sellMine(mineId: string, playerId: string): ActionResult {
    const mine = this.state.mines.get(mineId);
    if (!mine) return { ok: false, error: 'Mine not found' };

    if (mine.mineState !== MineStateType.POWER_PLANT) {
      return { ok: false, error: 'Not a power plant' };
    }
    if (mine.ownerId !== playerId) {
      return { ok: false, error: 'Not your power plant' };
    }

    // Calculate total invested
    let totalInvested = 0;
    for (let i = 0; i < mine.level; i++) {
      totalInvested += MINE_CONFIG.upgradePrices[i];
    }
    const refund = Math.floor(totalInvested * MINE_CONFIG.sellRefundRatio);

    const player = this.state.getPlayer(playerId);
    if (player) player.money += refund;

    // Reset to normal mine
    mine.mineState = MineStateType.NORMAL;
    mine.level = 0;
    mine.hp = 0;
    mine.maxHp = 0;
    mine.ownerId = '';
    mine.radius = MINE_CONFIG.normalRadius;
    mine.repairing = false;
    mine.repairProgress = 0;

    this.energyCalc.markDirty();
    this.territoryCalc.markDirty();

    return { ok: true, refund };
  }

  /**
   * Apply damage to a mine (from monster melee).
   * Returns true if the mine was destroyed (became damaged).
   */
  damageMine(mineId: string, damage: number, _sourceId: string): boolean {
    const mine = this.state.mines.get(mineId);
    if (!mine || mine.mineState !== MineStateType.POWER_PLANT) return false;

    mine.hp -= damage;

    if (mine.hp <= 0) {
      // Power plant destroyed → damaged state
      mine.mineState = MineStateType.DAMAGED;
      mine.level = 0;
      mine.hp = 0;
      mine.maxHp = 0;
      mine.radius = MINE_CONFIG.normalRadius;
      mine.repairing = false;
      mine.repairProgress = 0;
      // Keep ownerId so client knows who lost it

      this.energyCalc.markDirty();
      this.territoryCalc.markDirty();
      return true;
    }

    return false;
  }

  /**
   * Process repair progress each tick
   */
  updateRepairs(): void {
    this.state.mines.forEach((mine) => {
      if (!mine.repairing) return;

      mine.repairProgress++;
      if (mine.repairProgress >= MINE_CONFIG.repairTicks) {
        mine.mineState = MineStateType.NORMAL;
        mine.repairing = false;
        mine.repairProgress = 0;
        mine.ownerId = '';
        mine.radius = MINE_CONFIG.normalRadius;
      }
    });
  }

  /**
   * Sync mine production data to EnergyCalculator.
   * Called after territory recalculation.
   */
  syncToEnergyCalc(validTerritoryIds: Map<string, Set<string>>): void {
    // Clear all existing mines in energy calc and re-register
    this.energyCalc.clearMines();

    this.state.mines.forEach((mine) => {
      if (mine.mineState !== MineStateType.POWER_PLANT || !mine.ownerId) return;

      // Check if mine is in owner's valid territory
      const playerValid = validTerritoryIds.get(mine.ownerId);
      const inTerritory = playerValid?.has(mine.id) ?? false;
      const production = inTerritory ? mine.level * MINE_CONFIG.productionPerLevel : 0;

      // Sync territory validity to MineState schema for client display
      mine.inValidTerritory = inTerritory;

      this.energyCalc.registerMine(mine.id, mine.ownerId, production);
    });
  }
}
