/**
 * Server-side monster AI helpers.
 *
 * This module intentionally exposes pure functions only, so callers can
 * evaluate monster AI inside existing systems without coupling to Colyseus
 * schema objects or room state.
 */

import { scalePeriod } from '../../../../shared/constants/speedScale.js';
import type {
  MovementType,
  TargetStrategyType,
} from '../../../../shared/config/monsterDefinitionTypes.js';
import {
  distSq,
  dot,
  normalize,
  rotate90,
  type Vec2,
} from '../../shared/math/vector.js';

/**
 * Lightweight owned entity input.
 */
export interface OwnedLike {
  ownerId: string;
}

/**
 * Target category carried by monster target-selection helpers.
 */
export type MonsterAiTargetType = 'building' | 'tower';

/**
 * Lightweight structure target input for target selection.
 */
export interface MonsterAiTargetLike extends OwnedLike {
  position: Vec2;
  hp: number;
  maxHp: number;
  radius?: number;
  damage?: number;
  clock?: number;
  targetType?: MonsterAiTargetType;
}

/**
 * Backward-compatible alias for older building-only call sites.
 */
export interface MonsterAiBuildingLike extends MonsterAiTargetLike {}

/**
 * Lightweight monster input for target selection.
 */
export interface MonsterAiMonsterLike extends OwnedLike {
  position: Vec2;
  velocity: Vec2;
  liveTime: number;
}

/**
 * Lightweight projectile input for dodge calculations.
 */
export interface MonsterAiProjectileLike {
  position: Vec2;
  velocity: Vec2;
  radius?: number;
}

/**
 * Target selection score weights for the balanced strategy.
 */
export interface TargetSelectionWeights {
  distance: number;
  hp: number;
  threat: number;
}

/**
 * Target selection configuration.
 */
export interface TargetSelectionConfig {
  strategy: TargetStrategyType;
  scanRadius: number;
  updateInterval: number;
  weights: TargetSelectionWeights;
}

/**
 * Bullet dodge configuration.
 */
export interface DodgeConfig {
  detectRadius: number;
  dodgeStrength: number;
  reactionTime: number;
}

/**
 * Movement helper input.
 */
export interface MovementOffsetInput {
  position: Vec2;
  destination: Vec2;
  liveTime: number;
  movementType?: MovementType | string | null;
}

/**
 * Predefined movement period values.
 */
const SWING_PERIOD = scalePeriod(10);
const EXCITING_PERIOD = scalePeriod(4);

/**
 * Default target damage fallback when runtime state lacks threat metadata.
 */
export const DEFAULT_TARGET_DAMAGE = 10;

/**
 * Default target fire interval fallback when runtime state lacks threat metadata.
 */
export const DEFAULT_TARGET_CLOCK = 30;

/**
 * Default target selection configuration copied from single-player AI.
 */
export const DEFAULT_TARGET_SELECTION_CONFIG: Readonly<TargetSelectionConfig> = {
  strategy: 'balanced',
  scanRadius: 300,
  updateInterval: scalePeriod(30),
  weights: {
    distance: 0.4,
    hp: 0.3,
    threat: 0.3,
  },
};

/**
 * Default dodge configuration copied from single-player AI.
 */
export const DEFAULT_DODGE_CONFIG: Readonly<DodgeConfig> = {
  detectRadius: 120,
  dodgeStrength: 8,
  reactionTime: scalePeriod(3),
};

/**
 * Check whether two entities should be treated as enemies.
 */
export function isEnemyOwned(a: OwnedLike, b: OwnedLike): boolean {
  return a.ownerId !== b.ownerId;
}

/**
 * Check whether a periodic AI step should run on the current tick.
 */
export function shouldRunAiStep(liveTime: number, interval: number): boolean {
  return interval > 0 && liveTime % interval === 0;
}

/**
 * Check whether a target is close enough to be considered inside the scan range.
 */
export function isTargetWithinScanRange(
  monsterPosition: Vec2,
  target: Pick<MonsterAiTargetLike, 'position' | 'radius'>,
  scanRadius: number,
): boolean {
  const extraRadius = target.radius ?? 0;
  const maxDistance = scanRadius + extraRadius;
  return distSq(monsterPosition, target.position) <= maxDistance * maxDistance;
}

/**
 * Check whether a target is a valid enemy candidate.
 */
export function isValidEnemyTarget(
  monster: Pick<MonsterAiMonsterLike, 'ownerId' | 'position'>,
  target: MonsterAiTargetLike,
  scanRadius: number,
): boolean {
  if (target.hp <= 0) {
    return false;
  }

  if (!isEnemyOwned(monster, target)) {
    return false;
  }

  return isTargetWithinScanRange(monster.position, target, scanRadius);
}

/**
 * Calculate a simple threat score for a target structure.
 */
export function calcTargetThreatScore(target: MonsterAiTargetLike): number {
  const damage = target.damage ?? DEFAULT_TARGET_DAMAGE;
  const clock = target.clock ?? DEFAULT_TARGET_CLOCK;
  return damage / Math.max(clock, 1);
}

/**
 * Backward-compatible building threat helper.
 */
export function calcBuildingThreatScore(building: MonsterAiBuildingLike): number {
  return calcTargetThreatScore(building);
}

/**
 * Calculate the balanced target score used by single-player target selection.
 */
export function calcBalancedTargetScore(
  target: MonsterAiTargetLike,
  monsterPosition: Vec2,
  weights: TargetSelectionWeights,
): number {
  const distance = Math.sqrt(distSq(target.position, monsterPosition));
  const distanceScore = 1 / Math.max(distance, 1);
  const hpScore = 1 / Math.max(target.hp, 1);
  const threatScore = calcTargetThreatScore(target);

  return (
    weights.distance * distanceScore * 100 +
    weights.hp * hpScore * 1000 +
    weights.threat * threatScore
  );
}

/**
 * Select the best enemy target for a monster according to the requested strategy.
 *
 * This function is side-effect free and does not apply the update interval gate.
 */
export function selectTargetEntity<T extends MonsterAiTargetLike>(
  monster: Pick<MonsterAiMonsterLike, 'ownerId' | 'position'>,
  targets: readonly T[],
  config: Pick<TargetSelectionConfig, 'strategy' | 'scanRadius' | 'weights'> = DEFAULT_TARGET_SELECTION_CONFIG,
): T | null {
  const validTargets = targets.filter((target) => isValidEnemyTarget(monster, target, config.scanRadius));
  let bestTarget: T | null = null;

  switch (config.strategy) {
    case 'nearest': {
      let bestDistanceSq = Infinity;
      for (const target of validTargets) {
        const currentDistanceSq = distSq(monster.position, target.position);
        if (currentDistanceSq < bestDistanceSq) {
          bestDistanceSq = currentDistanceSq;
          bestTarget = target;
        }
      }
      break;
    }

    case 'weakest': {
      let lowestHp = Infinity;
      for (const target of validTargets) {
        if (target.hp < lowestHp) {
          lowestHp = target.hp;
          bestTarget = target;
        }
      }
      break;
    }

    case 'threat': {
      let bestThreat = -Infinity;
      for (const target of validTargets) {
        const threat = calcTargetThreatScore(target);
        if (threat > bestThreat) {
          bestThreat = threat;
          bestTarget = target;
        }
      }
      break;
    }

    case 'balanced':
    default: {
      let bestScore = -Infinity;
      for (const target of validTargets) {
        const score = calcBalancedTargetScore(target, monster.position, config.weights);
        if (score > bestScore) {
          bestScore = score;
          bestTarget = target;
        }
      }
      break;
    }
  }

  return bestTarget;
}

/**
 * Backward-compatible building-only wrapper for target selection.
 */
export function selectTargetBuilding<T extends MonsterAiBuildingLike>(
  monster: Pick<MonsterAiMonsterLike, 'ownerId' | 'position'>,
  buildings: readonly T[],
  config: Pick<TargetSelectionConfig, 'strategy' | 'scanRadius' | 'weights'> = DEFAULT_TARGET_SELECTION_CONFIG,
): T | null {
  return selectTargetEntity(monster, buildings, config);
}

/**
 * Select the target position for a monster when the target selection cooldown allows it.
 */
export function selectTargetPosition<T extends MonsterAiTargetLike>(
  monster: MonsterAiMonsterLike,
  targets: readonly T[],
  config: TargetSelectionConfig = DEFAULT_TARGET_SELECTION_CONFIG,
): Vec2 | null {
  if (!shouldRunAiStep(monster.liveTime, config.updateInterval)) {
    return null;
  }

  const target = selectTargetEntity(monster, targets, config);
  if (!target) {
    return null;
  }

  return {
    x: target.position.x,
    y: target.position.y,
  };
}

/**
 * Check whether a projectile is moving toward the monster.
 */
export function isProjectileApproaching(
  projectilePosition: Vec2,
  projectileVelocity: Vec2,
  monsterPosition: Vec2,
): boolean {
  const toMonster = {
    x: monsterPosition.x - projectilePosition.x,
    y: monsterPosition.y - projectilePosition.y,
  };

  return dot(projectileVelocity, toMonster) > 0;
}

/**
 * Calculate the dodge vector against a single approaching projectile.
 */
export function calcSingleProjectileDodgeVector(
  projectile: Pick<MonsterAiProjectileLike, 'position' | 'velocity'>,
  monsterPosition: Vec2,
  monsterVelocity: Vec2,
  strength: number,
): Vec2 {
  const projectileDir = normalize(projectile.velocity);
  if (projectileDir.x === 0 && projectileDir.y === 0) {
    return { x: 0, y: 0 };
  }

  const perpA = rotate90(projectileDir);
  const perpB = { x: -perpA.x, y: -perpA.y };
  const chosen = dot(perpA, monsterVelocity) >= dot(perpB, monsterVelocity) ? perpA : perpB;

  const dx = projectile.position.x - monsterPosition.x;
  const dy = projectile.position.y - monsterPosition.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const distanceFactor = Math.max(0.2, 1 - distance / 150);

  return {
    x: chosen.x * strength * distanceFactor,
    y: chosen.y * strength * distanceFactor,
  };
}

/**
 * Calculate the averaged dodge offset against nearby approaching projectiles.
 */
export function calcDodgeOffset(
  monster: MonsterAiMonsterLike,
  projectiles: readonly MonsterAiProjectileLike[],
  config: DodgeConfig = DEFAULT_DODGE_CONFIG,
): Vec2 {
  if (!shouldRunAiStep(monster.liveTime, config.reactionTime)) {
    return { x: 0, y: 0 };
  }

  const detectRadiusSq = config.detectRadius * config.detectRadius;
  let sumX = 0;
  let sumY = 0;
  let threatCount = 0;

  for (const projectile of projectiles) {
    const extraRadius = projectile.radius ?? 0;
    const maxDistance = config.detectRadius + extraRadius;
    if (distSq(monster.position, projectile.position) > Math.max(detectRadiusSq, maxDistance * maxDistance)) {
      continue;
    }

    if (!isProjectileApproaching(projectile.position, projectile.velocity, monster.position)) {
      continue;
    }

    const dodge = calcSingleProjectileDodgeVector(
      projectile,
      monster.position,
      monster.velocity,
      config.dodgeStrength,
    );

    sumX += dodge.x;
    sumY += dodge.y;
    threatCount++;
  }

  if (threatCount === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: sumX / threatCount,
    y: sumY / threatCount,
  };
}

/**
 * Calculate the normalized forward direction from current position to destination.
 */
export function getMovementDirection(position: Vec2, destination: Vec2): Vec2 {
  return normalize({
    x: destination.x - position.x,
    y: destination.y - position.y,
  });
}

/**
 * Calculate the offset produced by the "swing" movement type.
 */
export function calcSwingMovementOffset(direction: Vec2, liveTime: number): Vec2 {
  const side = rotate90(direction);
  const amplitude = Math.sin(liveTime / SWING_PERIOD) * 10;
  return {
    x: side.x * amplitude,
    y: side.y * amplitude,
  };
}

/**
 * Calculate the offset produced by the "suddenly" movement type.
 */
export function calcSuddenlyMovementOffset(direction: Vec2, liveTime: number): Vec2 {
  const amplitude = (Math.sin(liveTime / SWING_PERIOD) + 1) * 2;
  return {
    x: direction.x * amplitude,
    y: direction.y * amplitude,
  };
}

/**
 * Calculate the offset produced by the "exciting" movement type.
 */
export function calcExcitingMovementOffset(direction: Vec2, liveTime: number): Vec2 {
  const amplitude = (Math.sin(liveTime / EXCITING_PERIOD) + 0.3) * 6;
  return {
    x: direction.x * amplitude,
    y: direction.y * amplitude,
  };
}

/**
 * Calculate the offset produced by the "doubleSwing" movement type.
 */
export function calcDoubleSwingMovementOffset(direction: Vec2, liveTime: number): Vec2 {
  const side = rotate90(direction);
  const swingPhase = liveTime / SWING_PERIOD;
  const sideAmplitude = Math.sin(Math.pow(swingPhase, 0.5)) * 10;
  const forwardAmplitude = Math.cos(Math.pow(swingPhase, 2)) * 20;

  return {
    x: side.x * sideAmplitude + direction.x * forwardAmplitude,
    y: side.y * sideAmplitude + direction.y * forwardAmplitude,
  };
}

/**
 * Calculate the additional movement offset for a monster movement type.
 */
export function calcMovementTypeOffset(input: MovementOffsetInput): Vec2 {
  const direction = getMovementDirection(input.position, input.destination);
  if (direction.x === 0 && direction.y === 0) {
    return { x: 0, y: 0 };
  }

  switch (input.movementType) {
    case 'exciting':
      return calcExcitingMovementOffset(direction, input.liveTime);
    case 'doubleSwing':
      return calcDoubleSwingMovementOffset(direction, input.liveTime);
    case 'swing':
      return calcSwingMovementOffset(direction, input.liveTime);
    case 'suddenly':
      return calcSuddenlyMovementOffset(direction, input.liveTime);
    case 'normal':
    default:
      return { x: 0, y: 0 };
  }
}
