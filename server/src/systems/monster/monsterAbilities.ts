/**
 * Pure helpers for server-side monster abilities.
 *
 * These functions intentionally avoid any direct GameRoom dependency so the
 * authoritative game loop can compose them from schema collections or tests.
 */

import type { BulletState } from '../../schema/BulletState.js';
import type { BuildingState } from '../../schema/BuildingState.js';
import type { MineState } from '../../schema/MineState.js';
import type { MonsterState } from '../../schema/MonsterState.js';
import { collides } from '../../shared/math/circle.js';
import { add, dist, distSq, mul, normalize, sub, type Vec2 } from '../../shared/math/vector.js';
import { getMonsterDefinition } from '../../../../shared/config/monsterDefinitions.js';
import type {
  AnyMonsterDefinition,
  BombSelfParams,
  BulletChangeParams,
  GainParams,
  GravityAreaParams,
  LaserDefenseParams,
  SummonParams,
} from '../../../../shared/config/monsterDefinitionTypes.js';
import { isEnemy, isFriendly } from '../../../../shared/types/ownership.js';

/** Minimal circle entity shape used by ability helpers. */
export interface CircleEntityLike {
  id: string;
  position: Vec2;
  radius: number;
}

/** Minimal owned circle entity shape used by ability helpers. */
export interface OwnedCircleEntityLike extends CircleEntityLike {
  ownerId: string;
}

/** Minimal monster shape used by ally-buff helpers. */
export interface AbilityMonsterLike extends OwnedCircleEntityLike {
  monsterType: string;
  hp: number;
  maxHp: number;
  speed: number;
  colishDamage?: number;
}

/** Minimal bullet shape used by bullet-interaction helpers. */
export interface AbilityBulletLike extends CircleEntityLike {
  ownerId: string;
  damage: number;
  velocity: Vec2;
  laserDestoryAble?: boolean;
}

/** Minimal building shape used by structure-targeting helpers. */
export interface AbilityBuildingLike extends OwnedCircleEntityLike {}

/** Minimal mine shape used by gravity helpers. */
export interface AbilityMineLike extends OwnedCircleEntityLike {}

/** Schema-compatible aliases for callers that want concrete server types. */
export type MonsterAbilityState = MonsterState & AbilityMonsterLike;
export type BulletAbilityState = BulletState & AbilityBulletLike;
export type BuildingAbilityState = BuildingState & AbilityBuildingLike;
export type MineAbilityState = MineState & AbilityMineLike;

/** Ability subset needed by the multiplayer runtime. */
export interface MonsterAbilitySet {
  bombSelf?: BombSelfParams;
  bulletChange?: BulletChangeParams;
  gain?: GainParams;
  gravityArea?: GravityAreaParams;
  laserDefense?: LaserDefenseParams;
  summon?: SummonParams;
}

/** Result for a bomb-self damage application. */
export interface BombSelfHit<TBuilding extends AbilityBuildingLike = AbilityBuildingLike> {
  building: TBuilding;
  buildingId: string;
  damage: number;
  centerDistance: number;
}

/** Result for one ally-buff application. */
export interface GainEffect<TMonster extends AbilityMonsterLike = AbilityMonsterLike> {
  monster: TMonster;
  monsterId: string;
  hpDelta: number;
  maxHpDelta: number;
  radiusDelta: number;
  speedDelta: number;
  collisionDamageDelta: number;
}

/** Result for one bullet-area mutation. */
export interface BulletChangeEffect<TBullet extends AbilityBulletLike = AbilityBulletLike> {
  bullet: TBullet;
  bulletId: string;
  radiusDelta: number;
  damageDelta: number;
  acceleration: Vec2;
}

/** Result for moving or damaging structures via gravity. */
export interface GravityDisplacement<TStructure extends AbilityBuildingLike = AbilityBuildingLike> {
  structure: TStructure;
  structureId: string;
  displacement: Vec2;
}

/** Result for mine damage from gravity fields. */
export interface GravityMineDamage<TMine extends AbilityMineLike = AbilityMineLike> {
  mine: TMine;
  mineId: string;
  damage: number;
}

/** Aggregated gravity result. */
export interface GravityAreaEffectResult<
  TBuilding extends AbilityBuildingLike = AbilityBuildingLike,
  TMine extends AbilityMineLike = AbilityMineLike,
> {
  buildingDisplacements: GravityDisplacement<TBuilding>[];
  mineDamages: GravityMineDamage<TMine>[];
}

/** Laser-defense decision for one tick/activation. */
export interface LaserDefenseStepResult<TBullet extends AbilityBulletLike = AbilityBulletLike> {
  destroyedBullets: TBullet[];
  destroyedBulletIds: string[];
  consumedCharges: number;
  remainingCharges: number;
}

/** Deterministic summon plan returned to the game loop. */
export interface SummonSpawnPlan {
  monsterType: string;
  index: number;
  position: Vec2;
}

/** Optional tuning overrides for ally gain. */
export interface GainEffectOptions {
  maxEligibleRadius?: number;
  maxEligibleSpeed?: number;
}

const DEFAULT_GAIN_MAX_ELIGIBLE_RADIUS = 100;
const DEFAULT_GAIN_MAX_ELIGIBLE_SPEED = 2.5;

function getOptionalAbility<T>(params: unknown, key: string): T | undefined {
  if (!params || typeof params !== 'object' || !(key in params)) {
    return undefined;
  }
  return (params as Record<string, T | undefined>)[key];
}

function getDefinition(monsterType: string): AnyMonsterDefinition | undefined {
  return getMonsterDefinition(monsterType);
}

function overlapsEffectCircle(origin: Vec2, effectRadius: number, target: CircleEntityLike): boolean {
  return collides(origin.x, origin.y, effectRadius, target.position.x, target.position.y, target.radius);
}

function isInsideEffectRadius(origin: Vec2, effectRadius: number, target: CircleEntityLike): boolean {
  return distSq(origin, target.position) < effectRadius * effectRadius;
}

/**
 * Read the ability subset from the shared monster definition.
 */
export function getMonsterAbilitySet(monsterType: string): MonsterAbilitySet | undefined {
  const params = getDefinition(monsterType)?.params;
  if (!params) {
    return undefined;
  }

  const abilitySet: MonsterAbilitySet = {
    bombSelf: getOptionalAbility<BombSelfParams>(params, 'bombSelf'),
    bulletChange: getOptionalAbility<BulletChangeParams>(params, 'bulletChange'),
    gain: getOptionalAbility<GainParams>(params, 'gain'),
    gravityArea: getOptionalAbility<GravityAreaParams>(params, 'gravityArea'),
    laserDefense: getOptionalAbility<LaserDefenseParams>(params, 'laserDefense'),
    summon: getOptionalAbility<SummonParams>(params, 'summon'),
  };

  return Object.values(abilitySet).some((value) => value !== undefined) ? abilitySet : undefined;
}

/**
 * Collect enemy buildings whose circles intersect the provided effect radius.
 */
export function filterEnemyBuildingsInRange<
  TMonster extends OwnedCircleEntityLike,
  TBuilding extends AbilityBuildingLike,
>(monster: TMonster, buildings: Iterable<TBuilding>, effectRadius: number): TBuilding[] {
  if (effectRadius <= 0) {
    return [];
  }

  const result: TBuilding[] = [];
  for (const building of buildings) {
    if (!isEnemy(monster, building)) {
      continue;
    }
    if (overlapsEffectCircle(monster.position, effectRadius, building)) {
      result.push(building);
    }
  }
  return result;
}

/**
 * Collect friendly monsters inside a radius, excluding the source monster.
 */
export function filterFriendlyMonstersInRange<
  TSource extends OwnedCircleEntityLike,
  TMonster extends AbilityMonsterLike,
>(source: TSource, monsters: Iterable<TMonster>, effectRadius: number): TMonster[] {
  if (effectRadius <= 0) {
    return [];
  }

  const result: TMonster[] = [];
  for (const monster of monsters) {
    if (monster.id === source.id) {
      continue;
    }
    if (!isFriendly(source, monster)) {
      continue;
    }
    if (isInsideEffectRadius(source.position, effectRadius, monster)) {
      result.push(monster);
    }
  }
  return result;
}

/**
 * Collect bullets whose circles intersect a monster-centered area.
 */
export function filterBulletsInRange<
  TSource extends CircleEntityLike,
  TBullet extends AbilityBulletLike,
>(source: TSource, bullets: Iterable<TBullet>, effectRadius: number): TBullet[] {
  if (effectRadius <= 0) {
    return [];
  }

  const result: TBullet[] = [];
  for (const bullet of bullets) {
    if (overlapsEffectCircle(source.position, effectRadius, bullet)) {
      result.push(bullet);
    }
  }
  return result;
}

/**
 * Collect enemy mines whose centers are inside the provided effect radius.
 */
export function filterEnemyMinesInRange<
  TMonster extends OwnedCircleEntityLike,
  TMine extends AbilityMineLike,
>(monster: TMonster, mines: Iterable<TMine>, effectRadius: number): TMine[] {
  if (effectRadius <= 0) {
    return [];
  }

  const result: TMine[] = [];
  for (const mine of mines) {
    if (!isEnemy(monster, mine)) {
      continue;
    }
    if (isInsideEffectRadius(monster.position, effectRadius, mine)) {
      result.push(mine);
    }
  }
  return result;
}

/**
 * Compute bomb-self damage against enemy buildings.
 *
 * This intentionally mirrors the current single-player damage formula,
 * including the absolute-value behavior around the edge of the blast.
 */
export function computeBombSelfHits<
  TMonster extends OwnedCircleEntityLike,
  TBuilding extends AbilityBuildingLike,
>(
  monster: TMonster,
  params: BombSelfParams | undefined,
  buildings: Iterable<TBuilding>,
): BombSelfHit<TBuilding>[] {
  if (!params?.bombSelfAble || params.bombSelfRange <= 0 || params.bombSelfDamage === 0) {
    return [];
  }

  const hits: BombSelfHit<TBuilding>[] = [];
  for (const building of filterEnemyBuildingsInRange(monster, buildings, params.bombSelfRange)) {
    const centerDistance = dist(monster.position, building.position);
    const damage = Math.abs(
      (1 - centerDistance / params.bombSelfRange) * params.bombSelfDamage
    );

    if (damage <= 0) {
      continue;
    }

    hits.push({
      building,
      buildingId: building.id,
      damage,
      centerDistance,
    });
  }

  return hits;
}

/**
 * Compute ally gain effects without mutating the target monsters.
 */
export function computeGainEffects<
  TSource extends OwnedCircleEntityLike,
  TMonster extends AbilityMonsterLike,
>(
  source: TSource,
  params: GainParams | undefined,
  monsters: Iterable<TMonster>,
  options: GainEffectOptions = {},
): GainEffect<TMonster>[] {
  if (!params?.haveGain || params.gainRadius <= 0) {
    return [];
  }

  const maxEligibleRadius = options.maxEligibleRadius ?? DEFAULT_GAIN_MAX_ELIGIBLE_RADIUS;
  const maxEligibleSpeed = options.maxEligibleSpeed ?? DEFAULT_GAIN_MAX_ELIGIBLE_SPEED;
  const effects: GainEffect<TMonster>[] = [];

  for (const monster of filterFriendlyMonstersInRange(source, monsters, params.gainRadius)) {
    effects.push({
      monster,
      monsterId: monster.id,
      hpDelta: monster.maxHp * (params.gainHpAddedRate ?? 0) + (params.gainHpAddedNum ?? 0),
      maxHpDelta: params.gainMaxHpAddedNum ?? 0,
      radiusDelta:
        monster.radius > 0 && monster.radius < maxEligibleRadius ? (params.gainR ?? 0) : 0,
      speedDelta: monster.speed < maxEligibleSpeed ? (params.gainSpeedNAddNum ?? 0) : 0,
      collisionDamageDelta: params.gainCollideDamageAddNum ?? 0,
    });
  }

  return effects;
}

/**
 * Compute bullet-area mutations without mutating the bullets directly.
 */
export function computeBulletChangeEffects<
  TSource extends OwnedCircleEntityLike,
  TBullet extends AbilityBulletLike,
>(
  source: TSource,
  params: BulletChangeParams | undefined,
  bullets: Iterable<TBullet>,
): BulletChangeEffect<TBullet>[] {
  if (!params?.haveBulletChangeArea || params.r <= 0) {
    return [];
  }

  const effects: BulletChangeEffect<TBullet>[] = [];
  for (const bullet of filterBulletsInRange(source, bullets, params.r)) {
    const offset = sub(bullet.position, source.position);
    const distance = dist(source.position, bullet.position);
    const attenuation = 1 - distance / params.r;
    const push = normalize(offset);
    const acceleration = mul(push, (params.bulletAN ?? 0) * attenuation);

    effects.push({
      bullet,
      bulletId: bullet.id,
      radiusDelta: params.bulletDR ?? 0,
      damageDelta: params.bulletDD ?? 0,
      acceleration,
    });
  }

  return effects;
}

/**
 * Compute structure displacement and mine damage from a gravity field.
 */
export function computeGravityAreaEffects<
  TMonster extends OwnedCircleEntityLike,
  TBuilding extends AbilityBuildingLike,
  TMine extends AbilityMineLike,
>(
  monster: TMonster,
  params: GravityAreaParams | undefined,
  buildings: Iterable<TBuilding>,
  mines: Iterable<TMine> = [],
): GravityAreaEffectResult<TBuilding, TMine> {
  if (!params?.haveGArea || params.gAreaR <= 0 || params.gAreaNum === 0) {
    return {
      buildingDisplacements: [],
      mineDamages: [],
    };
  }

  const buildingDisplacements = filterEnemyBuildingsInRange(monster, buildings, params.gAreaR)
    .filter((building) => isInsideEffectRadius(monster.position, params.gAreaR, building))
    .map((building) => ({
      structure: building,
      structureId: building.id,
      displacement: mul(normalize(sub(monster.position, building.position)), params.gAreaNum),
    }));

  const mineDamages = filterEnemyMinesInRange(monster, mines, params.gAreaR).map((mine) => ({
    mine,
    mineId: mine.id,
    damage: Math.abs(params.gAreaNum) * 2,
  }));

  return {
    buildingDisplacements,
    mineDamages,
  };
}

/**
 * Clamp laser-defense charges into the legal range.
 */
export function clampLaserDefenseCharges(
  charges: number,
  params: LaserDefenseParams | undefined,
): number {
  if (!params?.haveLaserDefence) {
    return Math.max(0, charges);
  }
  return Math.max(0, Math.min(params.maxLaserNum, charges));
}

/**
 * Recover laser-defense charges using the shared definition values.
 */
export function recoverLaserDefenseCharges(
  currentCharges: number,
  params: LaserDefenseParams | undefined,
): number {
  if (!params?.haveLaserDefence) {
    return Math.max(0, currentCharges);
  }
  return clampLaserDefenseCharges(currentCharges + params.laserRecoverNum, params);
}

/**
 * Select bullets destroyed by laser defense for one activation.
 */
export function computeLaserDefenseStep<
  TSource extends CircleEntityLike,
  TBullet extends AbilityBulletLike,
>(
  source: TSource,
  params: LaserDefenseParams | undefined,
  bullets: Iterable<TBullet>,
  currentCharges: number,
): LaserDefenseStepResult<TBullet> {
  if (!params?.haveLaserDefence || params.laserRadius <= 0 || currentCharges <= 0) {
    return {
      destroyedBullets: [],
      destroyedBulletIds: [],
      consumedCharges: 0,
      remainingCharges: clampLaserDefenseCharges(currentCharges, params),
    };
  }

  const destroyedBullets: TBullet[] = [];
  const destroyedBulletIds: string[] = [];
  let remainingCharges = clampLaserDefenseCharges(currentCharges, params);
  let remainingCapacity = Math.max(0, params.laserdefendPreNum);

  for (const bullet of bullets) {
    if (remainingCharges <= 0 || remainingCapacity <= 0) {
      break;
    }
    if (bullet.laserDestoryAble === false) {
      continue;
    }
    if (!isInsideEffectRadius(source.position, params.laserRadius, bullet)) {
      continue;
    }

    destroyedBullets.push(bullet);
    destroyedBulletIds.push(bullet.id);
    remainingCharges -= 1;
    remainingCapacity -= 1;
  }

  return {
    destroyedBullets,
    destroyedBulletIds,
    consumedCharges: currentCharges - remainingCharges,
    remainingCharges,
  };
}

/**
 * Build deterministic circular summon offsets.
 */
export function buildCircularSummonOffsets(
  count: number,
  distance: number,
  angleOffset: number = 0,
): Vec2[] {
  if (count <= 0 || distance <= 0) {
    return [];
  }

  const offsets: Vec2[] = [];
  for (let index = 0; index < count; index += 1) {
    const angle = angleOffset + (Math.PI * 2 * index) / count;
    offsets.push({
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    });
  }
  return offsets;
}

/**
 * Compute summon spawn positions without mutating runtime state.
 */
export function computeSummonSpawnPlans<TSource extends CircleEntityLike>(
  source: TSource,
  params: SummonParams | undefined,
  offsets: readonly Vec2[] = [],
): SummonSpawnPlan[] {
  const summonCount = params?.summonCount ?? 0;
  const summonDistance = params?.summonDistance ?? 0;
  const summonMonsterName = params?.summonMonsterName;

  if (!summonMonsterName || summonCount <= 0 || summonDistance <= 0) {
    return [];
  }

  const finalOffsets =
    offsets.length >= summonCount
      ? offsets.slice(0, summonCount)
      : buildCircularSummonOffsets(summonCount, summonDistance);

  return finalOffsets.map((offset, index) => ({
    monsterType: summonMonsterName,
    index,
    position: add(source.position, offset),
  }));
}
