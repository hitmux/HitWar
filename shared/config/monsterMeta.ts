/**
 * Shared Monster Metadata
 * Derived PvP metadata using single-player monster definitions as the source of truth.
 */

import { scaleSpeed } from '../constants/speedScale.js';
import { MONSTER_DEFINITIONS } from './monsterDefinitions.js';

type MonsterBaseClassLike =
  | 'Monster'
  | 'MonsterShooter'
  | 'MonsterMortis'
  | 'MonsterTerminator';

interface MonsterDefinitionLike {
  id: string;
  name: string;
  baseClass: MonsterBaseClassLike;
  addPrice?: number;
  params?: {
    hp?: number;
    r?: number;
    speedNumb?: number;
  };
}

interface MonsterPvPConfig {
  cost: number;
  cooldownTicks: number;
  unlockWave: number;
  threatSpeedRaw?: number;
}

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
  /** Reward for killing this monster (single-player semantic) */
  reward: number;
  /** Base HP value (single-player semantic) */
  baseHp: number;
  /** Effective movement speed (already scaleSpeed-applied) */
  speed: number;
  /** Effective speed used for target threat scoring */
  threatSpeed?: number;
  /** Collision radius (single-player semantic) */
  radius: number;
}

const MONSTER_DEFINITION_MAP = MONSTER_DEFINITIONS as Record<string, MonsterDefinitionLike>;

const SPAWNABLE_MONSTER_PVP_CONFIG = {
  Normal: {
    cost: 20,
    cooldownTicks: 60,
    unlockWave: 1,
  },
  Runner: {
    cost: 20,
    cooldownTicks: 80,
    unlockWave: 3,
  },
  Ox1: {
    cost: 30,
    cooldownTicks: 120,
    unlockWave: 5,
    threatSpeedRaw: 5,
  },
  Ox3: {
    cost: 50,
    cooldownTicks: 140,
    unlockWave: 6,
    threatSpeedRaw: 10,
  },
  Bomber1: {
    cost: 40,
    cooldownTicks: 160,
    unlockWave: 8,
  },
  Bomber2: {
    cost: 60,
    cooldownTicks: 160,
    unlockWave: 7,
  },
  Bomber3: {
    cost: 100,
    cooldownTicks: 200,
    unlockWave: 12,
  },
  Exciting: {
    cost: 35,
    cooldownTicks: 100,
    unlockWave: 5,
  },
  Visitor: {
    cost: 35,
    cooldownTicks: 100,
    unlockWave: 5,
  },
  Mts: {
    cost: 100,
    cooldownTicks: 200,
    unlockWave: 10,
  },
  T800: {
    cost: 1200,
    cooldownTicks: 600,
    unlockWave: 15,
  },
  BulletWearer: {
    cost: 45,
    cooldownTicks: 120,
    unlockWave: 6,
  },
  BulletRepellent: {
    cost: 50,
    cooldownTicks: 140,
    unlockWave: 7,
  },
  Shouter: {
    cost: 55,
    cooldownTicks: 150,
    unlockWave: 8,
  },
  Shouter_Stone: {
    cost: 70,
    cooldownTicks: 180,
    unlockWave: 10,
  },
  Slime_L: {
    cost: 80,
    cooldownTicks: 200,
    unlockWave: 9,
  },
  Medic: {
    cost: 60,
    cooldownTicks: 160,
    unlockWave: 8,
  },
  SpeedAdder: {
    cost: 55,
    cooldownTicks: 150,
    unlockWave: 7,
  },
  BlackHole: {
    cost: 90,
    cooldownTicks: 200,
    unlockWave: 11,
  },
  Glans: {
    cost: 70,
    cooldownTicks: 180,
    unlockWave: 9,
  },
  witch_N: {
    cost: 85,
    cooldownTicks: 220,
    unlockWave: 10,
  },
} as const satisfies Record<string, MonsterPvPConfig>;

function getRequiredMonsterDefinition(monsterId: string): MonsterDefinitionLike {
  const definition = MONSTER_DEFINITION_MAP[monsterId];
  if (!definition) {
    throw new Error(`[monsterMeta] Missing monster definition for spawnable monster: ${monsterId}`);
  }
  if (definition.id !== monsterId) {
    throw new Error(
      `[monsterMeta] Monster definition id mismatch for ${monsterId}: got ${definition.id}`
    );
  }
  return definition;
}

function getDefaultRawSpeed(baseClass: MonsterBaseClassLike): number {
  switch (baseClass) {
    case 'MonsterTerminator':
      return 0.3;
    case 'Monster':
    case 'MonsterShooter':
    case 'MonsterMortis':
    default:
      return 1;
  }
}

function deriveReward(definition: MonsterDefinitionLike): number {
  return definition.addPrice !== undefined ? 10 + definition.addPrice : 5;
}

function deriveBaseHp(definition: MonsterDefinitionLike): number {
  return definition.params?.hp ?? 100;
}

function deriveRadius(definition: MonsterDefinitionLike): number {
  return definition.params?.r ?? 15;
}

function deriveEffectiveSpeed(definition: MonsterDefinitionLike): number {
  const rawSpeed = definition.params?.speedNumb ?? getDefaultRawSpeed(definition.baseClass);
  return scaleSpeed(rawSpeed);
}

function deriveMonsterMeta(monsterId: string, pvpConfig: MonsterPvPConfig): MonsterMetaData {
  const definition = getRequiredMonsterDefinition(monsterId);

  return {
    monsterId: definition.id,
    name: definition.name,
    cost: pvpConfig.cost,
    cooldownTicks: pvpConfig.cooldownTicks,
    unlockWave: pvpConfig.unlockWave,
    reward: deriveReward(definition),
    baseHp: deriveBaseHp(definition),
    speed: deriveEffectiveSpeed(definition),
    threatSpeed:
      pvpConfig.threatSpeedRaw !== undefined ? scaleSpeed(pvpConfig.threatSpeedRaw) : undefined,
    radius: deriveRadius(definition),
  };
}

/**
 * Spawnable monster metadata registry
 * Contains PvP-only fields plus single-player-derived combat numbers.
 */
export const SPAWNABLE_MONSTER_META: Record<string, MonsterMetaData> = Object.fromEntries(
  Object.entries(SPAWNABLE_MONSTER_PVP_CONFIG).map(([monsterId, pvpConfig]) => [
    monsterId,
    deriveMonsterMeta(monsterId, pvpConfig),
  ])
) as Record<string, MonsterMetaData>;

/**
 * Get monster metadata by ID
 */
export function getMonsterMeta(monsterId: string): MonsterMetaData | undefined {
  return SPAWNABLE_MONSTER_META[monsterId];
}

/**
 * Get the effective monster speed used by shared target scoring.
 */
export function getMonsterThreatSpeed(meta: MonsterMetaData): number {
  return meta.threatSpeed ?? meta.speed;
}

/**
 * Shared normalization cap for tower target scoring on both client and server.
 * Both speed and threatSpeed already use effective speed semantics here.
 */
export const MAX_TARGET_SCORING_MONSTER_SPEED = Object.values(SPAWNABLE_MONSTER_META).reduce(
  (maxSpeed, meta) => Math.max(maxSpeed, getMonsterThreatSpeed(meta)),
  0
);

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
