import type { MonsterState } from '../../schema/MonsterState.js';
import { collides } from '../../shared/math/circle.js';
import { add, distSq, mul, normalize, sub, type Vec2 } from '../../shared/math/vector.js';
import { isEnemy } from '../../shared/types/ownership.js';
import { getBulletCombatData } from '../../../../shared/config/bulletCombatMeta.js';
import { getMonsterDefinition } from '../../../../shared/config/monsterDefinitions.js';
import { scaleSpeed } from '../../../../shared/constants/speedScale.js';
import type {
  AnyMonsterDefinition,
  MortisMonsterDefinition,
  ShooterMonsterDefinition,
  TargetSelectionParams,
} from '../../../../shared/config/monsterDefinitionTypes.js';
import {
  DEFAULT_TARGET_SELECTION_CONFIG,
  selectTargetEntity,
  type MonsterAiTargetLike,
  type TargetSelectionConfig,
} from './monsterAi.js';
import {
  DEFAULT_TERMINATOR_DAMAGE_RULES,
  getMonsterRuntimeConfig,
} from './runtimeConfig.js';
import type {
  MonsterMortisRuntimeConfig,
  MonsterRuntimeConfig,
  MonsterShooterRuntimeConfig,
  MonsterTargetSelectionConfig,
  MonsterTerminatorDamageRule,
} from './runtimeTypes.js';

/**
 * Default shooter bullet speed from the single-player MonsterShooter base class.
 */
const DEFAULT_SHOOTER_BULLET_SPEED = scaleSpeed(8);

/**
 * Dash endpoint tolerance copied from the single-player Mortis implementation.
 */
const DEFAULT_MORTIS_ENDPOINT_TOLERANCE = 12;

/**
 * Structure category supported by special monster target selection.
 */
export type MonsterStructureTargetType = 'building' | 'tower';

/**
 * Lightweight structure target with optional combat hints.
 */
export interface StructureTargetLike extends MonsterAiTargetLike {
  id: string;
  radius: number;
  targetType?: MonsterStructureTargetType;
}

/**
 * Backward-compatible alias for existing building-only call sites.
 */
export interface BuildingTargetLike extends StructureTargetLike {
  targetType?: 'building';
}

/**
 * Optional tower-flavored alias for future mixed target snapshots.
 */
export interface TowerTargetLike extends StructureTargetLike {
  targetType?: 'tower';
}

type MonsterConfigSource = Pick<MonsterState, 'monsterType'> &
  Partial<Pick<MonsterState, 'runtime'>>;

type MonsterTargetSelectionLike = {
  strategy?: TargetSelectionParams['strategy'];
  scanRadius?: number;
  weights?: MonsterTargetSelectionConfig['weights'];
};

/**
 * Runtime config derived for MonsterShooter.
 */
export interface ShooterRuntimeConfig {
  range: number;
  fireIntervalTicks: number;
  bulletType: string;
  bulletSpeed: number;
  shotCount: number;
  maxRange: number;
}

/**
 * Runtime config derived for MonsterMortis.
 */
export interface MortisRuntimeConfig {
  viewRadius: number;
  bumpDistance: number;
  bumpSpeed: number;
  bumpDamage: number;
}

/**
 * Runtime info returned for a planned monster shot.
 */
export interface MonsterShotPlan {
  bulletType: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  maxRange: number;
  slideRate: number;
  isTracking: boolean;
  targetId?: string;
  targetsBuildings: boolean;
  isExplosive: boolean;
  explosionRadius: number;
  explosionDamage: number;
  isPenetrating: boolean;
  penetrationCount: number;
  freezeMultiplier: number;
  burnRate: number;
}

/**
 * Runtime info returned for a Mortis dash step.
 */
export interface MortisDashPlan {
  targetId: string;
  endPoint: Vec2;
  velocity: Vec2;
  bumpDamage: number;
  shouldKeepMoving: boolean;
}

/**
 * Damage mitigation result for Terminator.
 */
export interface TerminatorDamageResult {
  incomingDamage: number;
  appliedDamage: number;
  ignored: boolean;
}

function resolveMonsterRuntimeConfig(
  monster: MonsterConfigSource
): MonsterRuntimeConfig | undefined {
  return monster.runtime?.config ?? getMonsterRuntimeConfig(monster.monsterType);
}

function resolveTargetSelection(
  monster: MonsterConfigSource
): MonsterTargetSelectionLike | undefined {
  const runtimeConfig = resolveMonsterRuntimeConfig(monster);
  const runtimeTargetSelection = runtimeConfig?.abilities.targetSelection;
  if (runtimeTargetSelection?.enabled) {
    return runtimeTargetSelection;
  }

  return runtimeConfig?.definition.params?.targetSelection;
}

function resolveTerminatorDamageRules(
  monster?: MonsterConfigSource
): readonly MonsterTerminatorDamageRule[] {
  if (!monster) {
    return DEFAULT_TERMINATOR_DAMAGE_RULES;
  }

  const runtimeConfig = resolveMonsterRuntimeConfig(monster);
  if (runtimeConfig?.abilities.terminator.enabled) {
    return runtimeConfig.abilities.terminator.damageRules;
  }

  return DEFAULT_TERMINATOR_DAMAGE_RULES;
}

function createTargetSelectionConfig(
  range: number,
  targetSelection?: MonsterTargetSelectionLike,
): Pick<TargetSelectionConfig, 'strategy' | 'scanRadius' | 'weights'> {
  return {
    strategy: targetSelection?.strategy ?? DEFAULT_TARGET_SELECTION_CONFIG.strategy,
    scanRadius: range,
    weights: targetSelection?.weights ?? DEFAULT_TARGET_SELECTION_CONFIG.weights,
  };
}

/**
 * Read a shared monster definition by monster state.
 */
export function getMonsterDefinitionForState(
  monster: MonsterConfigSource
): AnyMonsterDefinition | undefined {
  return resolveMonsterRuntimeConfig(monster)?.definition ?? getMonsterDefinition(monster.monsterType);
}

/**
 * Return the special shooter definition if the monster uses MonsterShooter.
 */
export function getShooterDefinition(
  monster: MonsterConfigSource
): ShooterMonsterDefinition | undefined {
  const definition = getMonsterDefinitionForState(monster);
  return definition?.baseClass === 'MonsterShooter' ? definition : undefined;
}

/**
 * Return the special Mortis definition if the monster uses MonsterMortis.
 */
export function getMortisDefinition(
  monster: MonsterConfigSource
): MortisMonsterDefinition | undefined {
  const definition = getMonsterDefinitionForState(monster);
  return definition?.baseClass === 'MonsterMortis' ? definition : undefined;
}

/**
 * Check whether the monster uses the Terminator base class.
 */
export function isTerminatorMonster(monster: MonsterConfigSource): boolean {
  return resolveMonsterRuntimeConfig(monster)?.baseClass === 'MonsterTerminator';
}

function mapShooterRuntimeConfig(
  config: MonsterShooterRuntimeConfig
): ShooterRuntimeConfig {
  return {
    range: config.range,
    fireIntervalTicks: config.attackIntervalTicks,
    bulletType: config.bulletType,
    bulletSpeed: DEFAULT_SHOOTER_BULLET_SPEED,
    shotCount: 1,
    maxRange: config.range,
  };
}

/**
 * Resolve runtime config for MonsterShooter behavior.
 */
export function resolveShooterRuntimeConfig(
  monster: MonsterConfigSource
): ShooterRuntimeConfig | null {
  const runtimeConfig = resolveMonsterRuntimeConfig(monster);
  const shooterConfig = runtimeConfig?.abilities.shooter;
  if (
    !runtimeConfig ||
    runtimeConfig.baseClass !== 'MonsterShooter' ||
    !shooterConfig?.enabled
  ) {
    return null;
  }

  return mapShooterRuntimeConfig(shooterConfig);
}

function mapMortisRuntimeConfig(
  config: MonsterMortisRuntimeConfig
): MortisRuntimeConfig {
  return {
    viewRadius: config.viewRadius,
    bumpDistance: config.bumpDistance,
    bumpSpeed: config.bumpSpeed,
    bumpDamage: config.bumpDamage,
  };
}

/**
 * Resolve runtime config for MonsterMortis behavior.
 */
export function resolveMortisRuntimeConfig(
  monster: MonsterConfigSource
): MortisRuntimeConfig | null {
  const runtimeConfig = resolveMonsterRuntimeConfig(monster);
  const mortisConfig = runtimeConfig?.abilities.mortis;
  if (
    !runtimeConfig ||
    runtimeConfig.baseClass !== 'MonsterMortis' ||
    !mortisConfig?.enabled
  ) {
    return null;
  }

  return mapMortisRuntimeConfig(mortisConfig);
}

/**
 * Check whether a structure can still be targeted.
 */
export function isValidEnemyStructureTarget<T extends StructureTargetLike>(
  monster: Pick<MonsterState, 'ownerId' | 'position'>,
  target: Pick<T, 'ownerId' | 'hp' | 'position' | 'radius'>,
  range: number
): boolean {
  if (target.hp <= 0) {
    return false;
  }

  if (!isEnemy({ ownerId: monster.ownerId }, { ownerId: target.ownerId })) {
    return false;
  }

  return collides(
    monster.position.x,
    monster.position.y,
    range,
    target.position.x,
    target.position.y,
    target.radius
  );
}

/**
 * Backward-compatible wrapper for building-only callers.
 */
export function isValidEnemyBuildingTarget<T extends BuildingTargetLike>(
  monster: Pick<MonsterState, 'ownerId' | 'position'>,
  building: Pick<T, 'ownerId' | 'hp' | 'position' | 'radius'>,
  range: number
): boolean {
  return isValidEnemyStructureTarget(monster, building, range);
}

/**
 * Pick a structure target using the shared target-selection semantics.
 */
export function selectStructureTarget<T extends StructureTargetLike>(
  monster: Pick<MonsterState, 'ownerId' | 'position'>,
  targets: Iterable<T>,
  range: number,
  targetSelection?: MonsterTargetSelectionLike,
  currentTargetId?: string
): T | null {
  const validTargets = Array.from(targets).filter((target) =>
    isValidEnemyStructureTarget(monster, target, range)
  );

  if (validTargets.length === 0) {
    return null;
  }

  if (currentTargetId) {
    const currentTarget = validTargets.find((target) => target.id === currentTargetId);
    if (currentTarget) {
      return currentTarget;
    }
  }

  return selectTargetEntity(
    monster,
    validTargets,
    createTargetSelectionConfig(range, targetSelection)
  );
}

/**
 * Backward-compatible wrapper for building-only callers.
 */
export function selectBuildingTarget<T extends BuildingTargetLike>(
  monster: Pick<MonsterState, 'ownerId' | 'position'>,
  buildings: Iterable<T>,
  range: number,
  targetSelection?: MonsterTargetSelectionLike,
  currentTargetId?: string
): T | null {
  return selectStructureTarget(monster, buildings, range, targetSelection, currentTargetId);
}

/**
 * Shooter target selection keeps the current target if it is still valid.
 */
export function selectShooterTarget<T extends StructureTargetLike>(
  monster: MonsterConfigSource & Pick<MonsterState, 'ownerId' | 'position'>,
  targets: Iterable<T>,
  currentTargetId?: string
): T | null {
  const config = resolveShooterRuntimeConfig(monster);
  if (!config) {
    return null;
  }

  return selectStructureTarget(
    monster,
    targets,
    config.range,
    resolveTargetSelection(monster),
    currentTargetId
  );
}

/**
 * Mortis target selection mirrors the single-player behavior by keeping the
 * current valid target, otherwise finding a new enemy structure inside viewRadius.
 */
export function selectMortisDashTarget<T extends StructureTargetLike>(
  monster: MonsterConfigSource & Pick<MonsterState, 'ownerId' | 'position'>,
  targets: Iterable<T>,
  currentTargetId?: string
): T | null {
  const config = resolveMortisRuntimeConfig(monster);
  if (!config) {
    return null;
  }

  return selectStructureTarget(
    monster,
    targets,
    config.viewRadius,
    resolveTargetSelection(monster),
    currentTargetId
  );
}

/**
 * Return whether the shooter should fire this tick.
 */
export function shouldShooterFire(
  currentTick: number,
  monster: MonsterConfigSource
): boolean {
  const config = resolveShooterRuntimeConfig(monster);
  if (!config) {
    return false;
  }
  return currentTick % config.fireIntervalTicks === 0;
}

/**
 * Build a projectile plan for a MonsterShooter attack.
 */
export function createShooterShotPlan(
  monster: MonsterConfigSource & Pick<MonsterState, 'position'>,
  target: Pick<StructureTargetLike, 'id' | 'position'>
): MonsterShotPlan | null {
  const config = resolveShooterRuntimeConfig(monster);
  if (!config) {
    return null;
  }

  const bulletMeta = getBulletCombatData(config.bulletType);
  if (!bulletMeta) {
    return null;
  }

  const direction = normalize(sub(target.position, monster.position));
  if (direction.x === 0 && direction.y === 0) {
    return null;
  }

  return {
    bulletType: config.bulletType,
    x: monster.position.x,
    y: monster.position.y,
    vx: direction.x * config.bulletSpeed,
    vy: direction.y * config.bulletSpeed,
    damage: bulletMeta.damage,
    radius: bulletMeta.radius,
    maxRange: config.maxRange,
    slideRate: 1,
    isTracking: bulletMeta.isTracking,
    targetId: bulletMeta.isTracking ? target.id : undefined,
    targetsBuildings: true,
    isExplosive: bulletMeta.isExplosive,
    explosionRadius: bulletMeta.explosionRadius,
    explosionDamage: bulletMeta.explosionDamage,
    isPenetrating: bulletMeta.isPenetrating,
    penetrationCount: bulletMeta.penetrationCount,
    freezeMultiplier: bulletMeta.freezeMultiplier,
    burnRate: bulletMeta.burnRate,
  };
}

/**
 * Build the next Mortis dash plan toward the chosen target.
 */
export function createMortisDashPlan(
  monster: MonsterConfigSource & Pick<MonsterState, 'position'>,
  target: Pick<StructureTargetLike, 'id' | 'position'>,
  tolerance: number = DEFAULT_MORTIS_ENDPOINT_TOLERANCE
): MortisDashPlan | null {
  const config = resolveMortisRuntimeConfig(monster);
  if (!config) {
    return null;
  }

  const direction = normalize(sub(target.position, monster.position));
  if (direction.x === 0 && direction.y === 0) {
    return null;
  }

  const endPoint = add(target.position, mul(direction, config.bumpDistance));
  const shouldKeepMoving = distSq(monster.position, endPoint) > tolerance * tolerance;

  return {
    targetId: target.id,
    endPoint,
    velocity: mul(direction, config.bumpSpeed),
    bumpDamage: config.bumpDamage,
    shouldKeepMoving,
  };
}

/**
 * Check whether Mortis has reached the planned dash endpoint.
 */
export function hasMortisReachedDashEndpoint(
  monster: Pick<MonsterState, 'position'>,
  endPoint: Vec2,
  tolerance: number = DEFAULT_MORTIS_ENDPOINT_TOLERANCE
): boolean {
  return distSq(monster.position, endPoint) <= tolerance * tolerance;
}

/**
 * Apply the single-player Terminator damage curve on the server.
 */
export function computeTerminatorDamageResult(
  incomingDamage: number,
  monster?: MonsterConfigSource
): TerminatorDamageResult {
  const normalizedDamage = Math.max(0, incomingDamage);
  for (const rule of resolveTerminatorDamageRules(monster)) {
    if (normalizedDamage >= rule.maxIncomingDamageExclusive) {
      continue;
    }

    if (rule.mode === 'ignore') {
      return {
        incomingDamage: normalizedDamage,
        appliedDamage: 0,
        ignored: true,
      };
    }

    if (rule.mode === 'flat') {
      return {
        incomingDamage: normalizedDamage,
        appliedDamage: rule.appliedDamage ?? normalizedDamage,
        ignored: false,
      };
    }

    return {
      incomingDamage: normalizedDamage,
      appliedDamage: normalizedDamage * (rule.multiplier ?? 1),
      ignored: false,
    };
  }

  return {
    incomingDamage: normalizedDamage,
    appliedDamage: normalizedDamage,
    ignored: false,
  };
}

/**
 * Convenience helper that returns the applied damage only.
 */
export function computeTerminatorAppliedDamage(
  incomingDamage: number,
  monster?: MonsterConfigSource
): number {
  return computeTerminatorDamageResult(incomingDamage, monster).appliedDamage;
}
