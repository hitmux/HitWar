/**
 * Tower Base Metadata for Non-Bullet Towers
 * Server-side physical stats for Laser/Hammer/Boomerang/Hell/Ray towers
 * Extracted from client src/towers/config/*.ts and base class defaults
 *
 * NOTE: Bullet-type towers (baseClass: 'Tower') are in towerCombatMeta.ts
 */

export interface TowerBaseMeta {
  id: string;
  hp: number;
  radius: number;        // 15 + rAdd (ManualCannon: 12)
  attackRadius: number;   // rangeR
  // ManualCannon-only fields
  isManual?: boolean;
  maxAmmo?: number;
  reloadTicks?: number;
}

/**
 * Build a TowerBaseMeta entry.
 * Default hp comes from base class constructors:
 *   TowerLaser/TowerHell/TowerRay: 5000
 *   TowerHammer/TowerBoomerang: 1000 (Tower base)
 */
function meta(
  id: string,
  hp: number,
  rAdd: number,
  rangeR: number,
  extra?: Partial<Pick<TowerBaseMeta, 'isManual' | 'maxAmmo' | 'reloadTicks'>>
): TowerBaseMeta {
  return {
    id,
    hp,
    radius: 15 + rAdd,
    attackRadius: rangeR,
    ...extra,
  };
}

/**
 * All non-bullet tower base metadata (48 entries)
 */
export const TOWER_BASE_META: Record<string, TowerBaseMeta> = {
  // ==================== TowerLaser (7) ====================
  // Base class default hp=5000 when not specified in config
  Laser:         meta('Laser',         5000,  6, 120),
  Laser_Blue_1:  meta('Laser_Blue_1',  5000,  7, 130),
  Laser_Blue_2:  meta('Laser_Blue_2',  5000, 10, 150),
  Laser_Blue_3:  meta('Laser_Blue_3',  5000, 13, 170),
  Laser_Green_1: meta('Laser_Green_1', 5000,  7, 200),
  Laser_Green_2: meta('Laser_Green_2', 5000,  8, 250),
  Laser_Green_3: meta('Laser_Green_3', 5000, 10, 300),

  // ==================== TowerHell (2) ====================
  // Base class default hp=5000, rangeR=200
  Laser_Hell_1: meta('Laser_Hell_1', 5000, 13, 200),
  Laser_Hell_2: meta('Laser_Hell_2', 5000, 15, 200),

  // ==================== TowerRay - Red Laser (5) ====================
  // Base class default hp=5000, rangeR=200
  Laser_Red:         meta('Laser_Red',         10000,  7, 250),
  Laser_Red_Alpha_1: meta('Laser_Red_Alpha_1', 20000,  9, 300),
  Laser_Red_Alpha_2: meta('Laser_Red_Alpha_2', 30000, 11, 350),
  Laser_Red_Beta_1:  meta('Laser_Red_Beta_1',  30000, 10,   0), // scanningAttack: no range limit
  Laser_Red_Beta_2:  meta('Laser_Red_Beta_2',  50000, 13,   0), // scanningAttack: no range limit

  // ==================== Thunder - TowerLaser (6) ====================
  // Base class default hp=5000
  Thunder_1:       meta('Thunder_1',       5000,  5, 250),
  Thunder_2:       meta('Thunder_2',       5000, 10, 270),
  Thunder_Far_1:   meta('Thunder_Far_1',   5000, 12, 300),
  Thunder_Far_2:   meta('Thunder_Far_2',   5000, 13, 320),
  Thunder_Power_1: meta('Thunder_Power_1', 5000, 10, 250),
  Thunder_Power_2: meta('Thunder_Power_2', 5000, 12, 245),

  // ==================== Earthquake - TowerLaser (5) ====================
  Earthquake:         meta('Earthquake',         5000,   5, 120),
  Earthquake_Power_1: meta('Earthquake_Power_1', 10000, 10, 250),
  Earthquake_Power_2: meta('Earthquake_Power_2', 100000, 15, 260),
  Earthquake_Speed_1: meta('Earthquake_Speed_1', 6000,  10, 250),
  Earthquake_Speed_2: meta('Earthquake_Speed_2', 9000,  12, 300),

  // ==================== TowerRay - Air Cannon (3) ====================
  AirCannon_1: meta('AirCannon_1',  4000, 5, 120),
  AirCannon_2: meta('AirCannon_2',  5000, 7, 130),
  AirCannon_3: meta('AirCannon_3', 10000, 8, 150),

  // ==================== TowerRay - Future Cannon (5) ====================
  FutureCannon_1: meta('FutureCannon_1',   5000,  1, 150),
  FutureCannon_2: meta('FutureCannon_2',  10000,  5, 170),
  FutureCannon_3: meta('FutureCannon_3',  20000,  7, 200),
  FutureCannon_4: meta('FutureCannon_4',  50000,  9, 250),
  FutureCannon_5: meta('FutureCannon_5', 100000, 12, 280),

  // ==================== TowerHammer (7) ====================
  // Base class default hp=1000 (Tower base)
  Hammer:         meta('Hammer',         5000,  3,  80),
  Hammer_Fast_1:  meta('Hammer_Fast_1',  6000,  5, 100),
  Hammer_Fast_2:  meta('Hammer_Fast_2', 10000,  7, 150),
  Hammer_Fast_3:  meta('Hammer_Fast_3', 18000,  8, 180),
  Hammer_Power_1: meta('Hammer_Power_1', 10000, 3,  90),
  Hammer_Power_2: meta('Hammer_Power_2', 20000, 5, 100),
  Hammer_Power_3: meta('Hammer_Power_3', 30000, 7, 110),

  // ==================== TowerBoomerang (7) ====================
  // Base class default hp=1000 (Tower base)
  Boomerang:         meta('Boomerang',          3000, 2, 120),
  Boomerang_Far_1:   meta('Boomerang_Far_1',    6000, 3, 140),
  Boomerang_Far_2:   meta('Boomerang_Far_2',    6000, 4, 160),
  Boomerang_Far_3:   meta('Boomerang_Far_3',    6000, 5, 200),
  Boomerang_Power_1: meta('Boomerang_Power_1',  3000, 2, 100),
  Boomerang_Power_2: meta('Boomerang_Power_2',  5000, 3, 100),
  Boomerang_Power_3: meta('Boomerang_Power_3', 10000, 4, 110),

  // ==================== ManualCannon (1) ====================
  // Special: r=12 (not 15+rAdd), maxAmmo=3
  ManualCannon: {
    id: 'ManualCannon',
    hp: 2000,
    radius: 12,
    attackRadius: 400,
    isManual: true,
    maxAmmo: 3,
    reloadTicks: 60,
  },
};

/** Get non-bullet tower base meta by type name */
export function getTowerBaseMeta(towerType: string): TowerBaseMeta | undefined {
  return TOWER_BASE_META[towerType];
}
