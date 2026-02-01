/**
 * Damage Calculator - Server-side damage multiplier calculation
 * Combines territory and energy factors for tower damage
 *
 * Based on src/towers/base/tower.ts getDamageMultiplier()
 */

import type { TerritoryCalculator } from '../territory/territoryCalculator.js';
import type { EnergyCalculator } from '../energy/energyCalculator.js';

/**
 * Calculate final damage multiplier for a tower
 *
 * Multiplier = territoryMultiplier * energyRatio
 * - territoryMultiplier: 1.0 in valid territory, 0.33 in invalid
 * - energyRatio: production / consumption (capped at 1.0)
 */
export class DamageCalculator {
  private territoryCalc: TerritoryCalculator;
  private energyCalc: EnergyCalculator;

  constructor(territoryCalc: TerritoryCalculator, energyCalc: EnergyCalculator) {
    this.territoryCalc = territoryCalc;
    this.energyCalc = energyCalc;
  }

  /**
   * Get damage multiplier for a tower
   * @param towerId Tower ID
   * @param ownerId Owner player ID
   * @returns Damage multiplier (0.0 to 1.0)
   */
  getDamageMultiplier(towerId: string, ownerId: string): number {
    // Territory multiplier: 1.0 or 0.33
    const territoryMult = this.territoryCalc.getTerritoryMultiplier(towerId, ownerId);

    // Energy ratio: 0.0 to 1.0
    const energyRatio = this.energyCalc.getSatisfactionRatio(ownerId);

    return territoryMult * energyRatio;
  }

  /**
   * Calculate actual damage from base damage
   * @param baseDamage Tower's base damage
   * @param towerId Tower ID
   * @param ownerId Owner player ID
   * @returns Actual damage after multipliers
   */
  calculateDamage(baseDamage: number, towerId: string, ownerId: string): number {
    const multiplier = this.getDamageMultiplier(towerId, ownerId);
    return baseDamage * multiplier;
  }

  /**
   * Calculate actual damage with provided multiplier (for caching)
   */
  calculateDamageWithMultiplier(baseDamage: number, multiplier: number): number {
    return baseDamage * multiplier;
  }
}

/**
 * Standalone function for damage calculation without calculator instances
 * Useful for simple cases where you already have the values
 */
export function calculateDamage(
  baseDamage: number,
  inValidTerritory: boolean,
  energySatisfactionRatio: number
): number {
  const territoryMult = inValidTerritory ? 1.0 : 1 / 3;
  return baseDamage * territoryMult * energySatisfactionRatio;
}
