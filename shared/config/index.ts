/**
 * Shared Config Exports
 */
export { TOWER_META, getTowerMeta, isTowerTypeValid } from './towerMeta.js';
export type { TowerMetaData } from '../validation/towerValidation.js';

export {
  SPAWNABLE_MONSTER_META,
  getMonsterMeta,
  isMonsterTypeValid,
  getMonstersForWave,
} from './monsterMeta.js';
export type { MonsterMetaData } from './monsterMeta.js';

export { BULLET_COMBAT_META, getBulletCombatData } from './bulletCombatMeta.js';
export type { BulletCombatData } from './bulletCombatMeta.js';

export { TOWER_COMBAT_META, getTowerCombatData } from './towerCombatMeta.js';
export type { TowerCombatData } from './towerCombatMeta.js';

export { TOWER_BASE_META, getTowerBaseMeta } from './towerBaseMeta.js';
export type { TowerBaseMeta } from './towerBaseMeta.js';

export { MINE_CONFIG, MineStateType, MINE_GENERATION } from './mineMeta.js';

export { PLAYER_COLORS } from './playerMeta.js';

export {
  VisionType,
  HEADQUARTERS_VISION, BASIC_TOWER_VISION,
  OBSERVER_RADIUS, OBSERVER_PRICE, OBSERVER_MAX_LEVEL,
  RADAR_RADIUS, RADAR_PRICE, RADAR_MAX_LEVEL,
  RADAR_SWEEP_ANGLE, RADAR_SWEEP_SPEED,
  getVisionRadius, getVisionUpgradePrice, canUpgradeVision,
} from './visionMeta.js';

export { TERRITORY_PENALTY, TERRITORY_RADIUS } from './territoryMeta.js';

export { BUILDING_META, getBuildingMeta, isBuildingTypeValid } from './buildingMeta.js';
export type { BuildingMetaData } from './buildingMeta.js';
