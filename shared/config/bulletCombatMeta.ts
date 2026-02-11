/**
 * Bullet Combat Metadata
 * Server-side combat properties for all bullet types
 * Extracted from client src/bullets/variants/*.ts
 */

export interface BulletCombatData {
  id: string;
  damage: number;
  radius: number;
  // Explosive
  isExplosive: boolean;
  explosionDamage: number;
  explosionRadius: number;
  // Tracking
  isTracking: boolean;
  trackingRadius: number;
  // Penetrating
  isPenetrating: boolean;
  penetrationCount: number;
  // Freeze (1 = none, <1 = slow)
  freezeMultiplier: number;
  // Burn
  burnRate: number;
  // Targets buildings instead of monsters
  targetsTowers: boolean;
}

/** Default values for fields not specified */
const DEFAULTS: Omit<BulletCombatData, 'id' | 'damage' | 'radius'> = {
  isExplosive: false,
  explosionDamage: 0,
  explosionRadius: 0,
  isTracking: false,
  trackingRadius: 0,
  isPenetrating: false,
  penetrationCount: 0,
  freezeMultiplier: 1,
  burnRate: 0,
  targetsTowers: false,
};

/** Helper to create bullet data with defaults */
function bullet(
  id: string,
  damage: number,
  radius: number,
  overrides: Partial<BulletCombatData> = {}
): BulletCombatData {
  return { ...DEFAULTS, id, damage, radius, ...overrides };
}

/**
 * All bullet combat metadata keyed by bullet type name.
 *
 * Sources:
 *   basic.ts      - 14 types
 *   machinegun.ts - 3 types
 *   explosive.ts  - 5 types
 *   freeze.ts     - 3 types
 *   penetrating.ts - 3 types
 *   split.ts      - 7 types
 *   special.ts    - 9 types
 */
export const BULLET_COMBAT_META: Record<string, BulletCombatData> = {
  // ==================== basic.ts ====================
  Normal:         bullet('Normal', 5, 2.5),
  littleStone:    bullet('littleStone', 7, 3),
  Arrow:          bullet('Arrow', 10, 2),
  Arrow_L:        bullet('Arrow_L', 15, 2.5),
  Arrow_LL:       bullet('Arrow_LL', 70, 2.7),
  CannonStone_S:  bullet('CannonStone_S', 500, 4),
  CannonStone_M:  bullet('CannonStone_M', 800, 6),
  CannonStone_L:  bullet('CannonStone_L', 1000, 8),
  Bully_S:        bullet('Bully_S', 40, 1.5),
  Bully_M:        bullet('Bully_M', 50, 1.7),
  Bully_L:        bullet('Bully_L', 75, 2),
  Rifle_Bully_S:  bullet('Rifle_Bully_S', 70, 1),
  Rifle_Bully_M:  bullet('Rifle_Bully_M', 100, 1.1),
  Rifle_Bully_L:  bullet('Rifle_Bully_L', 150, 1.2),

  // ==================== machinegun.ts ====================
  F_S: bullet('F_S', 10, 0.8),
  F_M: bullet('F_M', 30, 0.9),
  F_L: bullet('F_L', 30, 1),

  // ==================== explosive.ts ====================
  H_S: bullet('H_S', 100, 4, {
    isExplosive: true, explosionDamage: 1000, explosionRadius: 35,
  }),
  H_L: bullet('H_L', 200, 6, {
    isExplosive: true, explosionDamage: 2000, explosionRadius: 60,
  }),
  H_LL: bullet('H_LL', 500, 10, {
    isExplosive: true, explosionDamage: 3500, explosionRadius: 120,
  }),
  H_Target_S: bullet('H_Target_S', 100, 6, {
    isExplosive: true, explosionDamage: 100, explosionRadius: 100,
    isTracking: true, trackingRadius: 50,
  }),
  ManualCannon_Shell: bullet('ManualCannon_Shell', 50, 5, {
    isExplosive: true, explosionDamage: 100, explosionRadius: 50,
    targetsTowers: true,
  }),

  // ==================== freeze.ts ====================
  Frozen_S: bullet('Frozen_S', 0.1, 1, {
    isExplosive: true, explosionDamage: 0.1, explosionRadius: 10,
    freezeMultiplier: 0.98,
  }),
  Frozen_M: bullet('Frozen_M', 0.1, 2, {
    isExplosive: true, explosionDamage: 0.1, explosionRadius: 20,
    freezeMultiplier: 0.9,
  }),
  Frozen_L: bullet('Frozen_L', 0.1, 5, {
    isExplosive: true, explosionDamage: 0.1, explosionRadius: 30,
    freezeMultiplier: 0.7,
  }),

  // ==================== penetrating.ts ====================
  // penetrationCount = floor(radius / throughCutNum)
  T_M: bullet('T_M', 30, 2.5, {
    isPenetrating: true, penetrationCount: 25,
  }),
  T_L: bullet('T_L', 40, 4, {
    isPenetrating: true, penetrationCount: 4,
  }),
  T_LL: bullet('T_LL', 120, 8, {
    isPenetrating: true, penetrationCount: 8,
  }),

  // ==================== split.ts ====================
  // Split mechanics are simplified on server: treated as explosive AOE
  SS_S: bullet('SS_S', 30, 5, {
    isExplosive: true, explosionDamage: 40, explosionRadius: 30,
  }),
  SS_M: bullet('SS_M', 20, 6, {
    isExplosive: true, explosionDamage: 50, explosionRadius: 50,
  }),
  SS_L: bullet('SS_L', 50, 8, {
    isExplosive: true, explosionDamage: 100, explosionRadius: 50,
  }),
  SS_Second: bullet('SS_Second', 100, 15, {
    isExplosive: true, explosionDamage: 200, explosionRadius: 80,
  }),
  SS_Third: bullet('SS_Third', 120, 20, {
    isExplosive: true, explosionDamage: 300, explosionRadius: 100,
  }),
  SpikeBully: bullet('SpikeBully', 5, 10, {
    isExplosive: true, explosionDamage: 5, explosionRadius: 40,
  }),
  CactusNeedle: bullet('CactusNeedle', 5, 1),

  // ==================== special.ts ====================
  S: bullet('S', 40, 2),
  R_M: bullet('R_M', 20, 5),
  Powder: bullet('Powder', 0.8, 8, {
    isPenetrating: true, penetrationCount: 100,
  }),
  Fire_M: bullet('Fire_M', 1, 10, {
    isPenetrating: true, penetrationCount: 100,
    burnRate: 0.0001,
  }),
  Fire_L: bullet('Fire_L', 0.5, 20, {
    isPenetrating: true, penetrationCount: 100,
    burnRate: 0.0001,
  }),
  Fire_LL: bullet('Fire_LL', 1, 10, {
    isPenetrating: true, penetrationCount: 100,
    burnRate: 0.0001,
  }),
  P_L: bullet('P_L', 3, 2, {
    isPenetrating: true, penetrationCount: 1,
  }),
  P_M: bullet('P_M', 5, 10, {
    isPenetrating: true, penetrationCount: 5,
  }),
  ThunderBall: bullet('ThunderBall', 100, 10, {
    isExplosive: true, explosionDamage: 200, explosionRadius: 160,
    isTracking: true, trackingRadius: 300,
  }),
};

/** Get bullet combat data by type name */
export function getBulletCombatData(bulletType: string): BulletCombatData | undefined {
  return BULLET_COMBAT_META[bulletType];
}
