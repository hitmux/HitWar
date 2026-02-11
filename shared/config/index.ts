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

export { MINE_CONFIG, MineStateType, MINE_GENERATION } from './mineMeta.js';
