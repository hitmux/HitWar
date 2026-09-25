/**
 * Tower Combat Metadata
 * Server-side combat parameters for all bullet-type towers (baseClass: 'Tower')
 * Extracted from client src/towers/config/*.ts
 *
 * NOTE: Does NOT include Laser/Hammer/Boomerang/Hell/Ray towers (future task)
 */

import { scaleSpeed, scalePeriod } from '../constants/speedScale.js';
import { BULLET_COMBAT_META, type BulletCombatData } from './bulletCombatMeta.js';

export interface TowerCombatData {
  id: string;
  hp: number;
  radius: number;           // 15 + rAdd
  attackRadius: number;      // rangeR
  attackClock: number;       // scalePeriod(clock)
  // Bullet config
  bulletType: string;
  bulletDamage: number;      // from BULLET_COMBAT_META
  bulletRadius: number;      // from BULLET_COMBAT_META
  bulletSpeed: number;       // scaleSpeed(bulletSpeed)
  bulletSlideRate: number;   // bulletSlideRate
  bulletCount: number;       // attackBulletCount
  bulletSpread: number;      // bulletRotate
  isShrapnel: boolean;       // attackType === 'shrapnelAttack'
  // Special properties (inherited from bullet meta)
  isExplosive: boolean;
  explosionRadius: number;
  explosionDamage: number;
  isTracking: boolean;
  trackingRadius: number;
  isPenetrating: boolean;
  penetrationCount: number;
  freezeMultiplier: number;
  burnRate: number;
  targetsTowers: boolean;
}

// Default values matching Tower base class constructor
const DEFAULT_HP = 1000;
const DEFAULT_RANGE_R = 100;
const DEFAULT_CLOCK = 5;
const DEFAULT_BULLET_SPEED = 8;
const DEFAULT_BULLET_SLIDE_RATE = 1;
const DEFAULT_ATTACK_BULLET_COUNT = 1;
const DEFAULT_BULLET_ROTATE = 0;
const DEFAULT_BULLET_TYPE = 'Normal';

interface TowerRawConfig {
  id: string;
  hp?: number;
  rAdd?: number;
  rangeR?: number;
  clock?: number;
  bulletType?: string;
  bulletSpeed?: number;
  bulletSlideRate?: number;
  attackBulletCount?: number;
  bulletRotate?: number;
  isShrapnel?: boolean;
}

/** Build TowerCombatData from raw config + bullet meta */
function tower(cfg: TowerRawConfig): TowerCombatData {
  const bulletType = cfg.bulletType ?? DEFAULT_BULLET_TYPE;
  const bulletMeta: BulletCombatData | undefined = BULLET_COMBAT_META[bulletType];

  return {
    id: cfg.id,
    hp: cfg.hp ?? DEFAULT_HP,
    radius: 15 + (cfg.rAdd ?? 0),
    attackRadius: cfg.rangeR ?? DEFAULT_RANGE_R,
    attackClock: scalePeriod(cfg.clock ?? DEFAULT_CLOCK),
    bulletType,
    bulletDamage: bulletMeta?.damage ?? 5,
    bulletRadius: bulletMeta?.radius ?? 2.5,
    bulletSpeed: scaleSpeed(cfg.bulletSpeed ?? DEFAULT_BULLET_SPEED),
    bulletSlideRate: cfg.bulletSlideRate ?? DEFAULT_BULLET_SLIDE_RATE,
    bulletCount: cfg.attackBulletCount ?? DEFAULT_ATTACK_BULLET_COUNT,
    bulletSpread: cfg.bulletRotate ?? DEFAULT_BULLET_ROTATE,
    isShrapnel: cfg.isShrapnel ?? false,
    isExplosive: bulletMeta?.isExplosive ?? false,
    explosionRadius: bulletMeta?.explosionRadius ?? 0,
    explosionDamage: bulletMeta?.explosionDamage ?? 0,
    isTracking: bulletMeta?.isTracking ?? false,
    trackingRadius: bulletMeta?.trackingRadius ?? 0,
    isPenetrating: bulletMeta?.isPenetrating ?? false,
    penetrationCount: bulletMeta?.penetrationCount ?? 0,
    freezeMultiplier: bulletMeta?.freezeMultiplier ?? 1,
    burnRate: bulletMeta?.burnRate ?? 0,
    targetsTowers: bulletMeta?.targetsTowers ?? false,
  };
}

/**
 * All bullet-type tower combat data (baseClass: 'Tower', ~56 towers)
 */
export const TOWER_COMBAT_META: Record<string, TowerCombatData> = {
  // ==================== Basic Towers (2) ====================
  BasicCannon: tower({ id: 'BasicCannon' }),
  AncientCannon: tower({
    id: 'AncientCannon', hp: 2000, rAdd: 1, rangeR: 105,
    bulletType: 'littleStone',
  }),

  // ==================== Traditional Towers (5) ====================
  TraditionalCannon: tower({
    id: 'TraditionalCannon', hp: 5000, rAdd: 1, rangeR: 105,
  }),
  TraditionalCannon_Small: tower({
    id: 'TraditionalCannon_Small', rAdd: 2, rangeR: 200, clock: 3,
    bulletType: 'Bullet_S',
  }),
  TraditionalCannon_Middle: tower({
    id: 'TraditionalCannon_Middle', rAdd: 3, rangeR: 200, clock: 3,
    bulletType: 'Bullet_M',
  }),
  TraditionalCannon_Large: tower({
    id: 'TraditionalCannon_Large', rAdd: 4, rangeR: 200, clock: 3,
    bulletType: 'Bullet_L',
  }),
  TraditionalCannon_MultiTube: tower({
    id: 'TraditionalCannon_MultiTube', rAdd: 4, rangeR: 200, clock: 4,
    bulletType: 'Bullet_M', bulletRotate: Math.PI / 36, attackBulletCount: 2,
    isShrapnel: true,
  }),

  // ==================== Gun Towers (9) ====================
  Rifle_1: tower({
    id: 'Rifle_1', rAdd: 3, rangeR: 200, clock: 4,
    bulletType: 'Rifle_Bullet_L', bulletSpeed: 8,
  }),
  Rifle_2: tower({
    id: 'Rifle_2', rAdd: 3, rangeR: 230, clock: 3,
    bulletType: 'Rifle_Bullet_M', bulletSpeed: 9,
  }),
  Rifle_3: tower({
    id: 'Rifle_3', rAdd: 4, rangeR: 260, clock: 3,
    bulletType: 'Rifle_Bullet_L', bulletSpeed: 10,
  }),
  MachineGun_1: tower({
    id: 'MachineGun_1', hp: 2000, rAdd: 3, rangeR: 220, clock: 2,
    bulletType: 'F_S', bulletSpeed: 7,
  }),
  MachineGun_2: tower({
    id: 'MachineGun_2', hp: 5000, rAdd: 5, rangeR: 190, clock: 1,
    bulletType: 'F_M', bulletSpeed: 2, bulletSlideRate: 1.1, attackBulletCount: 3,
  }),
  MachineGun_3: tower({
    id: 'MachineGun_3', hp: 10000, rAdd: 7, rangeR: 250, clock: 1,
    bulletType: 'F_L', bulletSpeed: 8.2, attackBulletCount: 3,
  }),
  ArmorPiercing_1: tower({
    id: 'ArmorPiercing_1', hp: 1500, rAdd: 5, rangeR: 200, clock: 4,
    bulletType: 'T_M', bulletSpeed: 8, bulletSlideRate: 3,
  }),
  ArmorPiercing_2: tower({
    id: 'ArmorPiercing_2', hp: 5000, rAdd: 7, rangeR: 220, clock: 2,
    bulletType: 'T_L', bulletSpeed: 8, bulletSlideRate: 5,
  }),
  ArmorPiercing_3: tower({
    id: 'ArmorPiercing_3', hp: 10000, rAdd: 9, rangeR: 230, clock: 10,
    bulletType: 'T_LL', bulletSpeed: 4, bulletSlideRate: 5,
  }),

  // ==================== Arrow Towers (7) ====================
  ArrowBow_1: tower({
    id: 'ArrowBow_1', hp: 1500, rAdd: 2, rangeR: 200, clock: 15,
    bulletType: 'Arrow',
  }),
  ArrowBow_2: tower({
    id: 'ArrowBow_2', hp: 2000, rAdd: 3, rangeR: 250, clock: 12,
    bulletType: 'Arrow_L', bulletSpeed: 10,
  }),
  ArrowBow_3: tower({
    id: 'ArrowBow_3', hp: 5000, rAdd: 4, rangeR: 300, clock: 10,
    bulletType: 'Arrow_L', bulletSpeed: 12,
  }),
  ArrowBow_4: tower({
    id: 'ArrowBow_4', hp: 8000, rAdd: 5, rangeR: 320, clock: 8,
    bulletType: 'Arrow_LL', bulletSpeed: 13,
  }),
  Crossbow_1: tower({
    id: 'Crossbow_1', hp: 6000, rAdd: 3, rangeR: 160, clock: 11,
    bulletType: 'Arrow', bulletSpeed: 10, attackBulletCount: 2,
  }),
  Crossbow_2: tower({
    id: 'Crossbow_2', hp: 10000, rAdd: 5, rangeR: 200, clock: 9,
    bulletType: 'Arrow', bulletSpeed: 13, attackBulletCount: 3,
  }),
  Crossbow_3: tower({
    id: 'Crossbow_3', hp: 20000, rAdd: 7, rangeR: 250, clock: 5,
    bulletType: 'Arrow_L', bulletSpeed: 15, attackBulletCount: 4,
  }),

  // ==================== Shot Towers (5) ====================
  ThreeTubeCannon: tower({
    id: 'ThreeTubeCannon', rAdd: 6, rangeR: 230, clock: 4,
    bulletType: 'Bullet_M', bulletSpeed: 3,
    bulletRotate: Math.PI / 12, attackBulletCount: 3, isShrapnel: true,
  }),
  Shotgun_1: tower({
    id: 'Shotgun_1', hp: 5000, rAdd: 10, rangeR: 250, clock: 3,
    bulletType: 'Bullet_M', bulletSpeed: 3,
    bulletRotate: Math.PI / 10, attackBulletCount: 5, isShrapnel: true,
  }),
  Shotgun_2: tower({
    id: 'Shotgun_2', hp: 10000, rAdd: 23, rangeR: 260, clock: 2,
    bulletType: 'Bullet_M', bulletSpeed: 2.8,
    bulletRotate: Math.PI / 6, attackBulletCount: 10, isShrapnel: true,
  }),
  ShotCannon_1: tower({
    id: 'ShotCannon_1', hp: 5000, rAdd: 10, rangeR: 225, clock: 15,
    bulletType: 'Bullet_M', bulletSpeed: 3, attackBulletCount: 40,
  }),
  ShotCannon_2: tower({
    id: 'ShotCannon_2', hp: 5000, rAdd: 11, rangeR: 335, clock: 18,
    bulletType: 'Bullet_M', bulletSpeed: 3, bulletSlideRate: 1.1,
    attackBulletCount: 100,
  }),

  // ==================== Artillery Towers (6) ====================
  Artillery_1: tower({
    id: 'Artillery_1', hp: 5000, rAdd: 7, rangeR: 300, clock: 30,
    bulletType: 'H_S', bulletSpeed: 1, bulletSlideRate: 1.2,
  }),
  Artillery_2: tower({
    id: 'Artillery_2', hp: 8800, rAdd: 9, rangeR: 250, clock: 35,
    bulletType: 'H_L', bulletSpeed: 1, bulletSlideRate: 1.2,
    bulletRotate: Math.PI / 12, attackBulletCount: 2, isShrapnel: true,
  }),
  Artillery_3: tower({
    id: 'Artillery_3', hp: 30000, rAdd: 11, rangeR: 300, clock: 50,
    bulletType: 'H_LL', bulletSpeed: 1, bulletSlideRate: 1.1,
    bulletRotate: Math.PI / 12, attackBulletCount: 2, isShrapnel: true,
  }),
  MissileGun_1: tower({
    id: 'MissileGun_1', hp: 10000, rAdd: 8, rangeR: 250, clock: 20,
    bulletType: 'H_Target_S', bulletSpeed: 7, bulletSlideRate: 6,
  }),
  MissileGun_2: tower({
    id: 'MissileGun_2', hp: 10000, rAdd: 11, rangeR: 250, clock: 20,
    bulletType: 'H_Target_S', bulletSpeed: 8, bulletSlideRate: 6,
    bulletRotate: Math.PI / 6, attackBulletCount: 3, isShrapnel: true,
  }),
  MissileGun_3: tower({
    id: 'MissileGun_3', hp: 10000, rAdd: 15, rangeR: 250, clock: 20,
    bulletType: 'H_Target_S', bulletSpeed: 10, bulletSlideRate: 6,
    bulletRotate: Math.PI / 6, attackBulletCount: 5, isShrapnel: true,
  }),

  // ==================== Spray Towers (5) ====================
  SprayCannon_1: tower({
    id: 'SprayCannon_1', rAdd: 10, rangeR: 200, clock: 30,
    bulletType: 'SS_S', bulletSpeed: 5,
  }),
  SprayCannon_2: tower({
    id: 'SprayCannon_2', hp: 3000, rAdd: 11, rangeR: 220, clock: 30,
    bulletType: 'SS_M', bulletSpeed: 8,
  }),
  SprayCannon_3: tower({
    id: 'SprayCannon_3', hp: 5000, rAdd: 12, rangeR: 250, clock: 30,
    bulletType: 'SS_L', bulletSpeed: 11,
  }),
  SprayCannon_Double: tower({
    id: 'SprayCannon_Double', hp: 10000, rAdd: 13, rangeR: 250, clock: 30,
    bulletType: 'SS_Second', bulletSpeed: 15,
  }),
  SprayCannon_Three: tower({
    id: 'SprayCannon_Three', hp: 10000, rAdd: 15, rangeR: 250, clock: 30,
    bulletType: 'SS_Third', bulletSpeed: 15,
  }),

  // ==================== Stone Towers (7) ====================
  StoneCannon: tower({
    id: 'StoneCannon', hp: 3000, rAdd: 3, rangeR: 120, clock: 20,
    bulletType: 'CannonStone_S', bulletSpeed: 3, bulletSlideRate: 1.5,
  }),
  StoneCannon_Far_1: tower({
    id: 'StoneCannon_Far_1', hp: 3000, rAdd: 4, rangeR: 260, clock: 20,
    bulletType: 'CannonStone_S', bulletSpeed: 7, bulletSlideRate: 2,
  }),
  StoneCannon_Far_2: tower({
    id: 'StoneCannon_Far_2', rAdd: 5, rangeR: 270, clock: 20,
    bulletType: 'CannonStone_M', bulletSpeed: 7, bulletSlideRate: 2.2,
  }),
  StoneCannon_Far_3: tower({
    id: 'StoneCannon_Far_3', rAdd: 6, rangeR: 300, clock: 20,
    bulletType: 'CannonStone_M', bulletSpeed: 7, bulletSlideRate: 2.2,
  }),
  StoneCannon_Power_1: tower({
    id: 'StoneCannon_Power_1', hp: 9000, rAdd: 4, rangeR: 180, clock: 50,
    bulletType: 'CannonStone_M', bulletSpeed: 8, bulletSlideRate: 1.5,
  }),
  StoneCannon_Power_2: tower({
    id: 'StoneCannon_Power_2', hp: 30000, rAdd: 5, rangeR: 200, clock: 50,
    bulletType: 'CannonStone_L', bulletSpeed: 8, bulletSlideRate: 2.5,
  }),
  StoneCannon_Power_3: tower({
    id: 'StoneCannon_Power_3', hp: 100000, rAdd: 6, rangeR: 230, clock: 65,
    bulletType: 'CannonStone_L', bulletSpeed: 10,
  }),

  // ==================== Elemental Towers (7) ====================
  PowderCannon: tower({
    id: 'PowderCannon', rAdd: 5, rangeR: 150, clock: 1,
    bulletType: 'Powder', bulletSpeed: 10,
  }),
  Flamethrower_1: tower({
    id: 'Flamethrower_1', hp: 5000, rAdd: 7, rangeR: 200, clock: 1,
    bulletType: 'Fire_L', bulletSpeed: 15, attackBulletCount: 2,
  }),
  Flamethrower_2: tower({
    id: 'Flamethrower_2', hp: 10000, rAdd: 9, rangeR: 200, clock: 1,
    bulletType: 'Fire_LL', bulletSpeed: 18, attackBulletCount: 2,
  }),
  FrozenCannon_1: tower({
    id: 'FrozenCannon_1', hp: 2000, rAdd: 7, rangeR: 150, clock: 10,
    bulletType: 'Frozen_L', bulletSpeed: 4,
  }),
  FrozenCannon_2: tower({
    id: 'FrozenCannon_2', hp: 3000, rAdd: 8, rangeR: 200, clock: 3,
    bulletType: 'Frozen_L', bulletSpeed: 6, attackBulletCount: 3,
  }),
  Poison_1: tower({
    id: 'Poison_1', hp: 10000, rAdd: 8, rangeR: 250, clock: 10,
    bulletType: 'P_L', bulletSpeed: 9, attackBulletCount: 10,
  }),
  Poison_2: tower({
    id: 'Poison_2', hp: 15000, rAdd: 9.5, rangeR: 260, clock: 13,
    bulletType: 'P_M', bulletSpeed: 9, attackBulletCount: 10,
  }),

  // ==================== Thunder Towers (baseClass Tower only: 3) ====================
  ThunderBall_1: tower({
    id: 'ThunderBall_1', hp: 15000, rAdd: 7, rangeR: 280, clock: 30,
    bulletType: 'ThunderBall', bulletSpeed: 10,
  }),
  ThunderBall_2: tower({
    id: 'ThunderBall_2', hp: 16000, rAdd: 12, rangeR: 290, clock: 18,
    bulletType: 'ThunderBall', bulletSpeed: 15,
  }),
  ThunderBall_3: tower({
    id: 'ThunderBall_3', hp: 20000, rAdd: 13, rangeR: 300, clock: 16,
    bulletType: 'ThunderBall', bulletSpeed: 20,
  }),
};

/** Get tower combat data by type name */
export function getTowerCombatData(towerType: string): TowerCombatData | undefined {
  return TOWER_COMBAT_META[towerType];
}
