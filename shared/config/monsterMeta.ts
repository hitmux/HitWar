/**
 * Shared Monster Metadata
 * Minimal monster data needed for server-side spawning and validation
 * Contains spawnable monsters suitable for PvP multiplayer mode
 */

/**
 * Monster metadata for server-side use
 */
export interface MonsterMetaData {
  /** Monster type ID (matches client registry) */
  monsterId: string;
  /** Display name (Chinese) */
  name: string;
  /** Cost to spawn this monster */
  cost: number;
  /** Cooldown in ticks before spawning again */
  cooldownTicks: number;
  /** Wave number required to unlock */
  unlockWave: number;
  /** Reward for killing this monster */
  reward: number;
  /** Base HP value */
  baseHp: number;
  /** Movement speed */
  speed: number;
  /** Collision radius */
  radius: number;
}

/**
 * Spawnable monster metadata registry
 * Contains ~21 monsters suitable for PvP multiplayer
 */
export const SPAWNABLE_MONSTER_META: Record<string, MonsterMetaData> = {
  // === Basic Monsters ===
  Normal: {
    monsterId: 'Normal',
    name: '普通人',
    cost: 20,
    cooldownTicks: 60,
    unlockWave: 1,
    reward: 10,
    baseHp: 100,
    speed: 0.3,
    radius: 10,
  },
  Runner: {
    monsterId: 'Runner',
    name: '跑人',
    cost: 20,
    cooldownTicks: 80,
    unlockWave: 3,
    reward: 10,
    baseHp: 80,
    speed: 1,
    radius: 10,
  },
  Ox1: {
    monsterId: 'Ox1',
    name: '冲锋1级',
    cost: 30,
    cooldownTicks: 120,
    unlockWave: 5,
    reward: 10,
    baseHp: 120,
    speed: 0.01,
    radius: 10,
  },
  Ox3: {
    monsterId: 'Ox3',
    name: '冲锋3级',
    cost: 50,
    cooldownTicks: 140,
    unlockWave: 6,
    reward: 15,
    baseHp: 150,
    speed: 0.01,
    radius: 10,
  },

  // === Bomber Monsters ===
  Bomber1: {
    monsterId: 'Bomber1',
    name: '炸弹1级',
    cost: 40,
    cooldownTicks: 160,
    unlockWave: 8,
    reward: 10,
    baseHp: 100,
    speed: 0.5,
    radius: 10,
  },
  Bomber2: {
    monsterId: 'Bomber2',
    name: '炸弹2级',
    cost: 60,
    cooldownTicks: 160,
    unlockWave: 7,
    reward: 20,
    baseHp: 120,
    speed: 0.55,
    radius: 10,
  },
  Bomber3: {
    monsterId: 'Bomber3',
    name: '炸弹3级',
    cost: 100,
    cooldownTicks: 200,
    unlockWave: 12,
    reward: 20,
    baseHp: 150,
    speed: 0.6,
    radius: 10,
  },

  // === Elite Monsters ===
  Exciting: {
    monsterId: 'Exciting',
    name: '激动人',
    cost: 35,
    cooldownTicks: 100,
    unlockWave: 5,
    reward: 10,
    baseHp: 80,
    speed: 3,
    radius: 10,
  },
  Visitor: {
    monsterId: 'Visitor',
    name: '旋转人',
    cost: 35,
    cooldownTicks: 100,
    unlockWave: 5,
    reward: 10,
    baseHp: 80,
    speed: 3,
    radius: 10,
  },
  Mts: {
    monsterId: 'Mts',
    name: '忍者',
    cost: 100,
    cooldownTicks: 200,
    unlockWave: 10,
    reward: 50,
    baseHp: 200,
    speed: 1,
    radius: 35,
  },
  T800: {
    monsterId: 'T800',
    name: '恐怖机器人',
    cost: 1200,
    cooldownTicks: 600,
    unlockWave: 15,
    reward: 600,
    baseHp: 5000,
    speed: 0.5,
    radius: 40,
  },

  // === Defender Monsters ===
  BulletWearer: {
    monsterId: 'BulletWearer',
    name: '子弹削子',
    cost: 45,
    cooldownTicks: 120,
    unlockWave: 6,
    reward: 15,
    baseHp: 100,
    speed: 0.35,
    radius: 10,
  },
  BulletRepellent: {
    monsterId: 'BulletRepellent',
    name: '子弹排斥',
    cost: 50,
    cooldownTicks: 140,
    unlockWave: 7,
    reward: 15,
    baseHp: 100,
    speed: 0.25,
    radius: 10,
  },

  // === Shouter Monsters ===
  Shouter: {
    monsterId: 'Shouter',
    name: '射击者',
    cost: 55,
    cooldownTicks: 150,
    unlockWave: 8,
    reward: 15,
    baseHp: 100,
    speed: 0.35,
    radius: 20,
  },
  Shouter_Stone: {
    monsterId: 'Shouter_Stone',
    name: '石头蛋子射击者',
    cost: 70,
    cooldownTicks: 180,
    unlockWave: 10,
    reward: 15,
    baseHp: 120,
    speed: 0.3,
    radius: 20,
  },

  // === Slime Monsters ===
  Slime_L: {
    monsterId: 'Slime_L',
    name: '大史莱姆',
    cost: 80,
    cooldownTicks: 200,
    unlockWave: 9,
    reward: 20,
    baseHp: 300,
    speed: 0.4,
    radius: 50,
  },

  // === Support Monsters ===
  Medic: {
    monsterId: 'Medic',
    name: '加血辅助',
    cost: 60,
    cooldownTicks: 160,
    unlockWave: 8,
    reward: 20,
    baseHp: 150,
    speed: 0.5,
    radius: 30,
  },
  SpeedAdder: {
    monsterId: 'SpeedAdder',
    name: '加速辅助',
    cost: 55,
    cooldownTicks: 150,
    unlockWave: 7,
    reward: 20,
    baseHp: 100,
    speed: 0.35,
    radius: 10,
  },

  // === Special Monsters ===
  BlackHole: {
    monsterId: 'BlackHole',
    name: '黑洞',
    cost: 90,
    cooldownTicks: 200,
    unlockWave: 11,
    reward: 20,
    baseHp: 200,
    speed: 0.2,
    radius: 30,
  },
  Glans: {
    monsterId: 'Glans',
    name: '激光防御',
    cost: 70,
    cooldownTicks: 180,
    unlockWave: 9,
    reward: 20,
    baseHp: 150,
    speed: 0.3,
    radius: 30,
  },
  witch_N: {
    monsterId: 'witch_N',
    name: '召唤师',
    cost: 85,
    cooldownTicks: 220,
    unlockWave: 10,
    reward: 20,
    baseHp: 180,
    speed: 0.3,
    radius: 30,
  },
};

/**
 * Get monster metadata by ID
 */
export function getMonsterMeta(monsterId: string): MonsterMetaData | undefined {
  return SPAWNABLE_MONSTER_META[monsterId];
}

/**
 * Check if a monster type is valid for spawning
 */
export function isMonsterTypeValid(monsterId: string): boolean {
  return monsterId in SPAWNABLE_MONSTER_META;
}

/**
 * Get all monsters available for a given wave number
 */
export function getMonstersForWave(waveNumber: number): MonsterMetaData[] {
  return Object.values(SPAWNABLE_MONSTER_META).filter(
    (meta) => meta.unlockWave <= waveNumber
  );
}
