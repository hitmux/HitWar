import { describe, expect, it } from 'vitest';
import { DamageCalculator, calculateDamage } from './damageCalculator.js';

describe('DamageCalculator', () => {
  it('multiplies territory and energy factors for tower damage', () => {
    const territory = {
      getTerritoryMultiplier: (towerId: string, ownerId: string) =>
        towerId === 'valid' && ownerId === 'p1' ? 1 : 1 / 3,
    };
    const energy = {
      getSatisfactionRatio: (ownerId: string) => ownerId === 'p1' ? 0.5 : 1,
    };
    const calculator = new DamageCalculator(territory as any, energy as any);

    expect(calculator.getDamageMultiplier('valid', 'p1')).toBe(0.5);
    expect(calculator.calculateDamage(90, 'invalid', 'p2')).toBe(30);
  });

  it('supports cached multipliers and standalone damage calculation', () => {
    const calculator = new DamageCalculator({} as any, {} as any);

    expect(calculator.calculateDamageWithMultiplier(120, 0.25)).toBe(30);
    expect(calculateDamage(90, true, 0.5)).toBe(45);
    expect(calculateDamage(90, false, 1)).toBe(30);
  });
});
