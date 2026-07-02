/**
 * Mine Shared Configuration
 * Constants shared between client and server for mine/power plant mechanics
 */

/** Mine upgrade/HP/production configuration */
export const MINE_CONFIG = {
  // Upgrade prices per level (index 0 = normal→lv1, index 1 = lv1→lv2, etc.)
  upgradePrices: [150, 200, 250] as readonly number[],
  // HP per level (index 0 = lv1, index 1 = lv2, index 2 = lv3)
  upgradeHp: [3000, 5000, 10000] as readonly number[],
  // Production per level = level * productionPerLevel
  productionPerLevel: 2,
  // Max level
  maxLevel: 3,
  // Repair cost
  repairCost: 50,
  // Repair duration in ticks
  repairTicks: 1000,
  // Sell refund ratio (of total invested)
  sellRefundRatio: 0.5,
  // Downgrade refund ratio (of current level price)
  downgradeRefundRatio: 0.25,
  // Mine entity radius (for collision)
  normalRadius: 15,
  powerPlantRadius: 20,
} as const;

/** Mine state types */
export const MineStateType = {
  NORMAL: 'normal',
  DAMAGED: 'damaged',
  POWER_PLANT: 'powerPlant',
} as const;

/** Mine generation config for PvP maps */
export const MINE_GENERATION = {
  guaranteedNearBase: 3,
  nearBaseMinDist: 100,
  nearBaseMaxDist: 300,
  minesPerSide: 100,
  centerMines: 20,
  centerGapHalfWidth: 100,
  minDistFromEdge: 100,
  minDistFromBase: 200,
  minDistBetweenMines: 50,
} as const;

const MEDIUM_MAP_AREA = 6000 * 4000;
const MIN_MINE_SCALE = 0.75;
const MAX_MINE_SCALE = 1.5;

export function getMineGenerationForMap(mapWidth: number, mapHeight: number) {
  const area = Math.max(1, mapWidth * mapHeight);
  const rawScale = area / MEDIUM_MAP_AREA;
  const scale = Math.max(MIN_MINE_SCALE, Math.min(MAX_MINE_SCALE, rawScale));

  return {
    ...MINE_GENERATION,
    minesPerSide: Math.max(
      MINE_GENERATION.guaranteedNearBase,
      Math.round(MINE_GENERATION.minesPerSide * scale)
    ),
    centerMines: Math.max(4, Math.round(MINE_GENERATION.centerMines * scale)),
  };
}
