import { describe, expect, it } from 'vitest';

import { MINE_CONFIG, MINE_GENERATION, MineStateType, getMineGenerationForMap } from './mineMeta.js';
import { PLAYER_COLORS } from './playerMeta.js';
import { TERRITORY_PENALTY, TERRITORY_RADIUS } from './territoryMeta.js';
import {
  BASIC_TOWER_VISION,
  HEADQUARTERS_VISION,
  OBSERVER_MAX_LEVEL,
  OBSERVER_PRICE,
  OBSERVER_RADIUS,
  RADAR_MAX_LEVEL,
  RADAR_PRICE,
  RADAR_RADIUS,
  RADAR_SWEEP_ANGLE,
  RADAR_SWEEP_SPEED,
  VisionType,
  canUpgradeVision,
  getVisionRadius,
  getVisionUpgradePrice,
} from './visionMeta.js';

describe('mine metadata', () => {
  it('keeps mine config dimensions and ratios valid', () => {
    expect(MINE_CONFIG.maxLevel).toBe(MINE_CONFIG.upgradeHp.length);
    expect(MINE_CONFIG.upgradePrices.length).toBe(MINE_CONFIG.maxLevel);
    expect(MINE_CONFIG.productionPerLevel).toBeGreaterThan(0);
    expect(MINE_CONFIG.repairCost).toBeGreaterThan(0);
    expect(MINE_CONFIG.repairTicks).toBeGreaterThan(0);
    expect(MINE_CONFIG.sellRefundRatio).toBeGreaterThan(0);
    expect(MINE_CONFIG.sellRefundRatio).toBeLessThanOrEqual(1);
    expect(MINE_CONFIG.downgradeRefundRatio).toBeGreaterThan(0);
    expect(MINE_CONFIG.downgradeRefundRatio).toBeLessThanOrEqual(1);
    expect(MINE_CONFIG.normalRadius).toBeGreaterThan(0);
    expect(MINE_CONFIG.powerPlantRadius).toBeGreaterThan(MINE_CONFIG.normalRadius);
  });

  it('keeps mine generation distances and counts valid', () => {
    expect(MINE_GENERATION.guaranteedNearBase).toBeGreaterThan(0);
    expect(MINE_GENERATION.nearBaseMinDist).toBeLessThan(MINE_GENERATION.nearBaseMaxDist);
    expect(MINE_GENERATION.minesPerSide).toBeGreaterThan(MINE_GENERATION.guaranteedNearBase);
    expect(MINE_GENERATION.centerMines).toBeGreaterThan(0);
    expect(MINE_GENERATION.minDistFromBase).toBeGreaterThan(MINE_GENERATION.minDistBetweenMines);
  });

  it.each([
    [1_000, 1_000],
    [6_000, 4_000],
    [12_000, 8_000],
  ])('scales mine generation counts for map size %#', (width, height) => {
    const config = getMineGenerationForMap(width, height);

    expect(config.minesPerSide).toBeGreaterThanOrEqual(MINE_GENERATION.guaranteedNearBase);
    expect(config.centerMines).toBeGreaterThanOrEqual(4);
    expect(config.nearBaseMinDist).toBe(MINE_GENERATION.nearBaseMinDist);
  });

  it('keeps mine state values stable and unique', () => {
    const values = Object.values(MineStateType);

    expect(new Set(values).size).toBe(values.length);
    expect(values).toEqual(['normal', 'damaged', 'powerPlant']);
  });
});

describe('vision metadata', () => {
  it('keeps basic vision constants valid', () => {
    expect(HEADQUARTERS_VISION).toBeGreaterThan(BASIC_TOWER_VISION);
    expect(BASIC_TOWER_VISION).toBeGreaterThan(0);
    expect(RADAR_SWEEP_ANGLE).toBeGreaterThan(0);
    expect(RADAR_SWEEP_SPEED).toBeGreaterThan(0);
  });

  it.each([
    [VisionType.NONE, 1, BASIC_TOWER_VISION],
    [VisionType.OBSERVER, 1, OBSERVER_RADIUS[1]],
    [VisionType.OBSERVER, 3, OBSERVER_RADIUS[3]],
    [VisionType.OBSERVER, 99, BASIC_TOWER_VISION],
    [VisionType.RADAR, 1, RADAR_RADIUS[1]],
    [VisionType.RADAR, 5, RADAR_RADIUS[5]],
    [VisionType.RADAR, 99, RADAR_RADIUS[5]],
    ['unknown', 1, BASIC_TOWER_VISION],
  ])('calculates vision radius %#', (type, level, expected) => {
    expect(getVisionRadius(type, level)).toBe(expected);
  });

  it.each([
    [VisionType.NONE, 0, VisionType.OBSERVER, OBSERVER_PRICE[1]],
    [VisionType.OBSERVER, 1, VisionType.OBSERVER, OBSERVER_PRICE[2]],
    [VisionType.OBSERVER, 3, VisionType.OBSERVER, 0],
    [VisionType.NONE, 0, VisionType.RADAR, RADAR_PRICE[1]],
    [VisionType.RADAR, 4, VisionType.RADAR, RADAR_PRICE[5]],
    [VisionType.RADAR, 5, VisionType.RADAR, 0],
    [VisionType.NONE, 0, VisionType.NONE, 0],
  ])('calculates vision upgrade prices %#', (currentType, currentLevel, targetType, expected) => {
    expect(getVisionUpgradePrice(currentType, currentLevel, targetType)).toBe(expected);
  });

  it.each([
    [VisionType.NONE, 0, VisionType.OBSERVER, true],
    [VisionType.OBSERVER, OBSERVER_MAX_LEVEL - 1, VisionType.OBSERVER, true],
    [VisionType.OBSERVER, OBSERVER_MAX_LEVEL, VisionType.OBSERVER, false],
    [VisionType.RADAR, RADAR_MAX_LEVEL - 1, VisionType.RADAR, true],
    [VisionType.RADAR, RADAR_MAX_LEVEL, VisionType.RADAR, false],
    [VisionType.OBSERVER, 1, VisionType.RADAR, false],
  ])('checks vision upgrade eligibility %#', (currentType, currentLevel, targetType, expected) => {
    expect(canUpgradeVision(currentType, currentLevel, targetType)).toBe(expected);
  });
});

describe('player and territory metadata', () => {
  it('keeps player color entries usable and unique', () => {
    expect(PLAYER_COLORS.length).toBeGreaterThanOrEqual(2);
    expect(new Set(PLAYER_COLORS).size).toBe(PLAYER_COLORS.length);

    for (const color of PLAYER_COLORS) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('keeps territory constants in valid multiplier ranges', () => {
    expect(TERRITORY_RADIUS).toBeGreaterThan(0);
    expect(TERRITORY_PENALTY.DAMAGE_MULTIPLIER).toBeGreaterThan(0);
    expect(TERRITORY_PENALTY.DAMAGE_MULTIPLIER).toBeLessThan(1);
    expect(TERRITORY_PENALTY.RANGE_MULTIPLIER).toBeGreaterThan(0);
    expect(TERRITORY_PENALTY.RANGE_MULTIPLIER).toBeLessThan(1);
    expect(TERRITORY_PENALTY.HP_MULTIPLIER).toBeGreaterThan(0);
    expect(TERRITORY_PENALTY.HP_MULTIPLIER).toBeLessThan(1);
  });
});
