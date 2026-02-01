/**
 * Game balance formulas
 * Shared between client and server
 *
 * Pure functions for calculating monster stats, wave parameters, rewards, etc.
 */

// ============================================================================
// Monster HP scaling
// ============================================================================

/** Monster HP increase based on world tick */
export function timeMonsterHp(t: number): number {
  return t / 3;
}

export function timeMonsterAtt(t: number): number {
  return t / 5;
}

/** Monster HP cap based on wave - Easy difficulty */
export function levelMonsterHpAddedEasy(level: number): number {
  let res = Math.floor(Math.pow(level, 2) + Math.pow(level, 0.5) * 60);
  if (res > 5000) {
    res = 5000;
  }
  return res;
}

/** Monster HP cap based on wave - Normal difficulty */
export function levelMonsterHpAddedNormal(level: number): number {
  let res = Math.floor(Math.pow(level, 2.5) + Math.pow(level, 0.5) * 60);
  if (res > 100000) {
    res = 100000;
  }
  return res;
}

/** Monster HP cap based on wave - Hard difficulty */
export function levelMonsterHpAddedHard(level: number): number {
  return Math.floor(Math.pow(level, 2.7) + Math.pow(level, 0.5) * 60);
}

/** Monster HP increase based on tick - Easy */
export function tickMonsterHpAddedEasy(t: number): number {
  return Math.floor(Math.pow(t / 500, 2.5) + Math.pow(t / 500, 0.5) * 60);
}

/** Monster HP increase based on tick - Hard */
export function tickMonsterHpAddedHard(t: number): number {
  return Math.floor(Math.pow(t / 500, 2.52) + Math.pow(t / 500, 0.5) * 60);
}

// ============================================================================
// Wave / spawn count
// ============================================================================

/** Monster spawn count based on time */
export function timeMonsterAddedNum(t: number): number {
  const res = Math.floor(Math.pow(t / 20, 0.2));
  return res < 0 ? 1 : res;
}

/** Total monsters in wave n - Normal difficulty */
export function levelMonsterFlowNum(level: number): number {
  let res = Math.floor(Math.pow(level / 2, 1.1)) + 2;
  res += Math.log(level + 1) * 5;
  res = Math.floor(res);
  return res <= 0 ? 1 : res;
}

/** Total monsters in wave n - Hard difficulty */
export function levelMonsterFlowNumHard(level: number): number {
  let res = Math.floor(Math.pow(level / 2, 1.35)) + 2;
  res += Math.log(level + 1) * 10;
  res = Math.floor(res);
  return res <= 0 ? 1 : res;
}

/** Monster spawn count per tick - Easy (endless mode) */
export function tickAddMonsterNumEasy(t: number): number {
  return Math.floor(t / 200);
}

/** Monster spawn count per tick - Hard (endless mode) */
export function tickAddMonsterNumHard(t: number): number {
  return Math.floor(t / 180);
}

/** T800 count based on wave */
export function levelT800Count(level: number): number {
  const res = Math.floor(Math.pow(level, 1.2) / 20);
  const count = res < 1 ? 1 : res;
  return count > 10 ? 10 : count;
}

export function levelT800CountHard(level: number): number {
  const res = Math.floor(Math.pow(level, 1.5) / 10);
  return res < 1 ? 1 : res;
}

// ============================================================================
// Rewards / economy
// ============================================================================

/** Monster kill reward based on time */
export function timeAddPrise(tick: number): number {
  let res = Math.floor(Math.log10(tick));
  if (res <= 0) {
    res = 1;
  }
  return res;
}

/** Monster kill reward based on wave - Easy */
export function levelAddPrice(level: number): number {
  return Math.floor(Math.log(level) * (level / 10)) + 10;
}

/** Monster kill reward based on wave - Normal */
export function levelAddPriceNormal(level: number): number {
  return Math.floor(Math.log(level) * (level / 10));
}

/** Monster kill reward based on wave - Hard */
export function levelAddPriceHard(level: number): number {
  return Math.floor(Math.log(level) * (level / 20));
}

/** Tower price increase based on count */
export function TowerNumPriceAdded(num: number): number {
  if (num < 8) return 0;
  const n = num - 7;
  return Math.floor((n * n * n * n) / 3);
}

export function TowerNumPriceAdded2(num: number): number {
  let x = num - 6;
  if (x < 0) {
    x = 0;
  }
  return Math.floor(Math.pow(x, 1.7));
}

// ============================================================================
// Combat
// ============================================================================

/** Monster collision damage based on wave */
export function levelCollideAdded(level: number): number {
  return Math.floor(Math.pow(level, 1.55));
}

export function levelCollideAddedHard(level: number): number {
  return Math.floor(Math.pow(level, 2));
}

/** Hell tower damage based on lock time */
export function timeHellTowerDamage_E(tick: number): number {
  return Math.exp(tick) / 100000_0000;
}

export function timeHellTowerDamage(tick: number): number {
  return Math.pow(tick, 2) / 1000;
}

// ============================================================================
// Visual effects
// ============================================================================

/** Effect alpha based on progress (tr: 0~1) */
export function timeRateAlpha(tr: number): number {
  return (1 - tr) * 0.25;
}

export function timeRateAlphaDownFast(tr: number): number {
  return Math.pow((1 - tr) * 0.25, 2);
}
