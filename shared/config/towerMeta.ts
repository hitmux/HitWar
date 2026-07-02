/**
 * Shared Tower Metadata
 * Minimal tower data needed for server-side validation
 * Generated from client tower configs for P0-7 multiplayer validation
 */

import type { TowerMetaData } from '../validation/towerValidation.js';

// Re-export TowerMetaData for convenience
export type { TowerMetaData } from '../validation/towerValidation.js';

/**
 * Tower metadata registry - maps tower ID to price and upgrade paths
 */
export const TOWER_META: Record<string, TowerMetaData> = {
  // === Basic Towers ===
  BasicCannon: { id: 'BasicCannon', price: 50, levelUpArr: ['AncientCannon', 'TraditionalCannon', 'FutureCannon_1'] },
  AncientCannon: { id: 'AncientCannon', price: 60, levelUpArr: ['Boomerang', 'ArrowBow_1', 'Hammer', 'StoneCannon'] },

  // === Laser Towers ===
  Laser: { id: 'Laser', price: 350, levelUpArr: ['Laser_Blue_1', 'Laser_Red', 'Laser_Green_1'] },
  Laser_Blue_1: { id: 'Laser_Blue_1', price: 600, levelUpArr: ['Laser_Blue_2', 'Laser_Hell_1'] },
  Laser_Blue_2: { id: 'Laser_Blue_2', price: 1200, levelUpArr: ['Laser_Blue_3'] },
  Laser_Blue_3: { id: 'Laser_Blue_3', price: 1000, levelUpArr: [] },
  Laser_Green_1: { id: 'Laser_Green_1', price: 400, levelUpArr: ['Laser_Green_2'] },
  Laser_Green_2: { id: 'Laser_Green_2', price: 500, levelUpArr: ['Laser_Green_3'] },
  Laser_Green_3: { id: 'Laser_Green_3', price: 700, levelUpArr: [] },
  Laser_Hell_1: { id: 'Laser_Hell_1', price: 2000, levelUpArr: ['Laser_Hell_2'] },
  Laser_Hell_2: { id: 'Laser_Hell_2', price: 1000, levelUpArr: [] },
  Laser_Red: { id: 'Laser_Red', price: 800, levelUpArr: ['Laser_Red_Alpha_1', 'Laser_Red_Beta_1'] },
  Laser_Red_Alpha_1: { id: 'Laser_Red_Alpha_1', price: 800, levelUpArr: ['Laser_Red_Alpha_2'] },
  Laser_Red_Alpha_2: { id: 'Laser_Red_Alpha_2', price: 1000, levelUpArr: [] },
  Laser_Red_Beta_1: { id: 'Laser_Red_Beta_1', price: 800, levelUpArr: ['Laser_Red_Beta_2'] },
  Laser_Red_Beta_2: { id: 'Laser_Red_Beta_2', price: 1000, levelUpArr: [] },

  // === Hammer Towers ===
  Hammer: { id: 'Hammer', price: 230, levelUpArr: ['Hammer_Fast_1', 'Hammer_Power_1'] },
  Hammer_Fast_1: { id: 'Hammer_Fast_1', price: 300, levelUpArr: ['Hammer_Fast_2'] },
  Hammer_Fast_2: { id: 'Hammer_Fast_2', price: 370, levelUpArr: ['Hammer_Fast_3'] },
  Hammer_Fast_3: { id: 'Hammer_Fast_3', price: 320, levelUpArr: [] },
  Hammer_Power_1: { id: 'Hammer_Power_1', price: 400, levelUpArr: ['Hammer_Power_2'] },
  Hammer_Power_2: { id: 'Hammer_Power_2', price: 450, levelUpArr: ['Hammer_Power_3'] },
  Hammer_Power_3: { id: 'Hammer_Power_3', price: 500, levelUpArr: [] },

  // === Gun Towers ===
  Rifle_1: { id: 'Rifle_1', price: 160, levelUpArr: ['Rifle_2'] },
  Rifle_2: { id: 'Rifle_2', price: 170, levelUpArr: ['Rifle_3'] },
  Rifle_3: { id: 'Rifle_3', price: 180, levelUpArr: [] },
  MachineGun_1: { id: 'MachineGun_1', price: 250, levelUpArr: ['MachineGun_2'] },
  MachineGun_2: { id: 'MachineGun_2', price: 300, levelUpArr: ['MachineGun_3'] },
  MachineGun_3: { id: 'MachineGun_3', price: 500, levelUpArr: [] },
  ArmorPiercing_1: { id: 'ArmorPiercing_1', price: 220, levelUpArr: ['ArmorPiercing_2'] },
  ArmorPiercing_2: { id: 'ArmorPiercing_2', price: 250, levelUpArr: ['ArmorPiercing_3'] },
  ArmorPiercing_3: { id: 'ArmorPiercing_3', price: 400, levelUpArr: [] },

  // === Shot Towers ===
  ThreeTubeCannon: { id: 'ThreeTubeCannon', price: 400, levelUpArr: ['Shotgun_1', 'ShotCannon_1'] },
  Shotgun_1: { id: 'Shotgun_1', price: 500, levelUpArr: ['Shotgun_2'] },
  Shotgun_2: { id: 'Shotgun_2', price: 800, levelUpArr: [] },
  ShotCannon_1: { id: 'ShotCannon_1', price: 600, levelUpArr: ['ShotCannon_2'] },
  ShotCannon_2: { id: 'ShotCannon_2', price: 900, levelUpArr: [] },

  // === Artillery Towers ===
  Artillery_1: { id: 'Artillery_1', price: 500, levelUpArr: ['Artillery_2'] },
  Artillery_2: { id: 'Artillery_2', price: 800, levelUpArr: ['Artillery_3'] },
  Artillery_3: { id: 'Artillery_3', price: 1000, levelUpArr: [] },
  MissileGun_1: { id: 'MissileGun_1', price: 700, levelUpArr: ['MissileGun_2'] },
  MissileGun_2: { id: 'MissileGun_2', price: 750, levelUpArr: ['MissileGun_3'] },
  MissileGun_3: { id: 'MissileGun_3', price: 1000, levelUpArr: [] },

  // === Arrow Towers ===
  ArrowBow_1: { id: 'ArrowBow_1', price: 60, levelUpArr: ['ArrowBow_2', 'Crossbow_1'] },
  ArrowBow_2: { id: 'ArrowBow_2', price: 70, levelUpArr: ['ArrowBow_3'] },
  ArrowBow_3: { id: 'ArrowBow_3', price: 80, levelUpArr: ['ArrowBow_4'] },
  ArrowBow_4: { id: 'ArrowBow_4', price: 150, levelUpArr: [] },
  Crossbow_1: { id: 'Crossbow_1', price: 120, levelUpArr: ['Crossbow_2'] },
  Crossbow_2: { id: 'Crossbow_2', price: 130, levelUpArr: ['Crossbow_3'] },
  Crossbow_3: { id: 'Crossbow_3', price: 200, levelUpArr: [] },

  // === Spray Towers ===
  SprayCannon_1: { id: 'SprayCannon_1', price: 250, levelUpArr: ['SprayCannon_2', 'SprayCannon_Double'] },
  SprayCannon_2: { id: 'SprayCannon_2', price: 360, levelUpArr: ['SprayCannon_3'] },
  SprayCannon_3: { id: 'SprayCannon_3', price: 500, levelUpArr: [] },
  SprayCannon_Double: { id: 'SprayCannon_Double', price: 600, levelUpArr: ['SprayCannon_Three'] },
  SprayCannon_Three: { id: 'SprayCannon_Three', price: 900, levelUpArr: [] },

  // === Boomerang Towers ===
  Boomerang: { id: 'Boomerang', price: 190, levelUpArr: ['Boomerang_Far_1', 'Boomerang_Power_1'] },
  Boomerang_Far_1: { id: 'Boomerang_Far_1', price: 230, levelUpArr: ['Boomerang_Far_2'] },
  Boomerang_Far_2: { id: 'Boomerang_Far_2', price: 350, levelUpArr: ['Boomerang_Far_3'] },
  Boomerang_Far_3: { id: 'Boomerang_Far_3', price: 300, levelUpArr: [] },
  Boomerang_Power_1: { id: 'Boomerang_Power_1', price: 300, levelUpArr: ['Boomerang_Power_2'] },
  Boomerang_Power_2: { id: 'Boomerang_Power_2', price: 350, levelUpArr: ['Boomerang_Power_3'] },
  Boomerang_Power_3: { id: 'Boomerang_Power_3', price: 400, levelUpArr: [] },

  // === Stone Towers ===
  StoneCannon: { id: 'StoneCannon', price: 100, levelUpArr: ['StoneCannon_Far_1', 'StoneCannon_Power_1'] },
  StoneCannon_Far_1: { id: 'StoneCannon_Far_1', price: 200, levelUpArr: ['StoneCannon_Far_2'] },
  StoneCannon_Far_2: { id: 'StoneCannon_Far_2', price: 250, levelUpArr: ['StoneCannon_Far_3'] },
  StoneCannon_Far_3: { id: 'StoneCannon_Far_3', price: 300, levelUpArr: [] },
  StoneCannon_Power_1: { id: 'StoneCannon_Power_1', price: 120, levelUpArr: ['StoneCannon_Power_2'] },
  StoneCannon_Power_2: { id: 'StoneCannon_Power_2', price: 300, levelUpArr: ['StoneCannon_Power_3'] },
  StoneCannon_Power_3: { id: 'StoneCannon_Power_3', price: 320, levelUpArr: [] },

  // === Traditional Towers ===
  TraditionalCannon: { id: 'TraditionalCannon', price: 120, levelUpArr: ['TraditionalCannon_Small', 'TraditionalCannon_Middle', 'TraditionalCannon_Large', 'TraditionalCannon_MultiTube'] },
  TraditionalCannon_Small: { id: 'TraditionalCannon_Small', price: 120, levelUpArr: ['Rifle_1', 'MachineGun_1', 'ArmorPiercing_1'] },
  TraditionalCannon_Middle: { id: 'TraditionalCannon_Middle', price: 130, levelUpArr: ['AirCannon_1', 'Earthquake'] },
  TraditionalCannon_Large: { id: 'TraditionalCannon_Large', price: 140, levelUpArr: ['Artillery_1', 'MissileGun_1'] },
  TraditionalCannon_MultiTube: { id: 'TraditionalCannon_MultiTube', price: 135, levelUpArr: ['ThreeTubeCannon', 'SprayCannon_1', 'PowderCannon'] },

  // === Air Towers ===
  AirCannon_1: { id: 'AirCannon_1', price: 300, levelUpArr: ['AirCannon_2'] },
  AirCannon_2: { id: 'AirCannon_2', price: 320, levelUpArr: ['AirCannon_3'] },
  AirCannon_3: { id: 'AirCannon_3', price: 400, levelUpArr: [] },

  // === Thunder Towers ===
  Thunder_1: { id: 'Thunder_1', price: 400, levelUpArr: ['Thunder_2', 'ThunderBall_1'] },
  Thunder_2: { id: 'Thunder_2', price: 600, levelUpArr: ['Thunder_Far_1', 'Thunder_Power_1'] },
  Thunder_Far_1: { id: 'Thunder_Far_1', price: 600, levelUpArr: ['Thunder_Far_2'] },
  Thunder_Far_2: { id: 'Thunder_Far_2', price: 600, levelUpArr: [] },
  Thunder_Power_1: { id: 'Thunder_Power_1', price: 400, levelUpArr: ['Thunder_Power_2'] },
  Thunder_Power_2: { id: 'Thunder_Power_2', price: 1000, levelUpArr: [] },
  ThunderBall_1: { id: 'ThunderBall_1', price: 1000, levelUpArr: ['ThunderBall_2'] },
  ThunderBall_2: { id: 'ThunderBall_2', price: 600, levelUpArr: ['ThunderBall_3'] },
  ThunderBall_3: { id: 'ThunderBall_3', price: 600, levelUpArr: [] },

  // === Earthquake Towers ===
  Earthquake: { id: 'Earthquake', price: 250, levelUpArr: ['Earthquake_Power_1', 'Earthquake_Speed_1'] },
  Earthquake_Power_1: { id: 'Earthquake_Power_1', price: 260, levelUpArr: ['Earthquake_Power_2'] },
  Earthquake_Power_2: { id: 'Earthquake_Power_2', price: 300, levelUpArr: [] },
  Earthquake_Speed_1: { id: 'Earthquake_Speed_1', price: 260, levelUpArr: ['Earthquake_Speed_2'] },
  Earthquake_Speed_2: { id: 'Earthquake_Speed_2', price: 400, levelUpArr: [] },

  // === Elemental Towers ===
  PowderCannon: { id: 'PowderCannon', price: 260, levelUpArr: ['Flamethrower_1', 'FrozenCannon_1', 'Poison_1'] },
  Flamethrower_1: { id: 'Flamethrower_1', price: 420, levelUpArr: ['Flamethrower_2'] },
  Flamethrower_2: { id: 'Flamethrower_2', price: 500, levelUpArr: [] },
  FrozenCannon_1: { id: 'FrozenCannon_1', price: 620, levelUpArr: ['FrozenCannon_2'] },
  FrozenCannon_2: { id: 'FrozenCannon_2', price: 1200, levelUpArr: [] },
  Poison_1: { id: 'Poison_1', price: 400, levelUpArr: ['Poison_2'] },
  Poison_2: { id: 'Poison_2', price: 600, levelUpArr: [] },

  // === Future Towers ===
  FutureCannon_1: { id: 'FutureCannon_1', price: 800, levelUpArr: ['FutureCannon_2', 'Thunder_1', 'Laser'] },
  FutureCannon_2: { id: 'FutureCannon_2', price: 300, levelUpArr: ['FutureCannon_3'] },
  FutureCannon_3: { id: 'FutureCannon_3', price: 600, levelUpArr: ['FutureCannon_4'] },
  FutureCannon_4: { id: 'FutureCannon_4', price: 800, levelUpArr: ['FutureCannon_5'] },
  FutureCannon_5: { id: 'FutureCannon_5', price: 1200, levelUpArr: [] },

  // === Manual Cannon (Multiplayer) ===
  ManualCannon: { id: 'ManualCannon', price: 800, levelUpArr: [] },
};

/**
 * Get tower metadata by ID
 */
export function getTowerMeta(towerType: string): TowerMetaData | undefined {
  return TOWER_META[towerType];
}

/**
 * Check if a tower type exists
 */
export function isTowerTypeValid(towerType: string): boolean {
  return towerType in TOWER_META;
}
