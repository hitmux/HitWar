/**
 * Tower Attack System - Server-side tower attack logic
 * Handles target finding, attack timing, and bullet creation
 *
 * Port of src/towers/base/tower.ts attack methods for server use
 */

import type { TowerState } from '../../schema/TowerState.js';
import type { MonsterState } from '../../schema/MonsterState.js';
import type { MapSchema } from '@colyseus/schema';
import { distSq, normalize, sub, rotate } from '../../shared/math/vector.js';
import { collides } from '../../shared/math/circle.js';
import { isEnemy } from '../../shared/types/ownership.js';
import type { SpatialHashGrid, SpatialEntity } from '../spatial/spatialHashGrid.js';
import type { DamageCalculator } from './damageCalculator.js';
import { calcMonsterTargetScore, DEFAULT_TOWER_TARGET_WEIGHTS } from '../../../../shared/formulas/targetScoring.js';
import { scaleSpeed } from '../../shared/constants/speedScale.js';

// Max expected monster speed for target scoring normalization
const MAX_EXPECTED_MONSTER_SPEED = scaleSpeed(15);

/**
 * Tower attack configuration (from tower config)
 */
export interface TowerAttackConfig {
  attackRadius: number; // Attack range
  attackClock: number; // Ticks between attacks
  bulletCount: number; // Bullets per attack
  bulletSpread: number; // Spread angle for shrapnel (radians)
  bulletType: string; // Bullet type to fire
  bulletDamage: number; // Base damage per bullet
  bulletSpeed: number; // Bullet velocity
  bulletRadius: number; // Bullet collision radius
  isShrapnel: boolean; // Use shrapnel attack pattern
  // Optional properties for special bullets
  isExplosive?: boolean;
  explosionRadius?: number;
  explosionDamage?: number;
  isTracking?: boolean;
  trackingRadius?: number;
  isPenetrating?: boolean;
  penetrationCount?: number;
  freezeMultiplier?: number;
  burnRate?: number;
}

/**
 * Result of a tower attack (bullets to create)
 */
export interface AttackResult {
  towerId: string;
  ownerId: string;
  bullets: BulletCreationData[];
}

/**
 * Data for creating a bullet
 */
export interface BulletCreationData {
  bulletType: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  maxRange: number;
  targetId?: string; // For tracking bullets
  isExplosive: boolean;
  explosionRadius: number;
  explosionDamage: number;
  isPenetrating: boolean;
  penetrationCount: number;
  freezeMultiplier: number;
  burnRate: number;
}

/**
 * Monster wrapper for spatial grid
 */
interface MonsterSpatialEntity extends SpatialEntity {
  state: MonsterState;
}

/**
 * Tower Attack System
 */
export class TowerAttackSystem {
  // Tower configurations (loaded from game config)
  private towerConfigs: Map<string, TowerAttackConfig> = new Map();

  // Tower attack state (last attack tick)
  private lastAttackTick: Map<string, number> = new Map();

  constructor() {}

  /**
   * Register tower attack configuration
   */
  registerTowerConfig(towerType: string, config: TowerAttackConfig): void {
    this.towerConfigs.set(towerType, config);
  }

  /**
   * Get tower config
   */
  getTowerConfig(towerType: string): TowerAttackConfig | undefined {
    return this.towerConfigs.get(towerType);
  }

  /**
   * Process attacks for all towers
   * Returns list of attack results (bullets to create)
   */
  processAttacks(
    currentTick: number,
    towers: MapSchema<TowerState>,
    monsterGrid: SpatialHashGrid<MonsterSpatialEntity>,
    damageCalc: DamageCalculator
  ): AttackResult[] {
    const results: AttackResult[] = [];

    towers.forEach((tower) => {
      if (tower.isManual) return; // Manual towers don't auto-attack

      const config = this.towerConfigs.get(tower.towerType);
      if (!config) return;

      // Check attack cooldown
      const lastAttack = this.lastAttackTick.get(tower.id) || 0;
      if (currentTick - lastAttack < config.attackClock) return;

      // Find target
      const target = this.findTarget(tower, config, monsterGrid);
      if (!target) return;

      // Calculate damage multiplier
      const damageMultiplier = damageCalc.getDamageMultiplier(tower.id, tower.ownerId);
      const actualDamage = config.bulletDamage * damageMultiplier;

      // Create attack
      const bullets = this.createAttack(tower, target, config, actualDamage);
      if (bullets.length > 0) {
        results.push({
          towerId: tower.id,
          ownerId: tower.ownerId,
          bullets,
        });
        this.lastAttackTick.set(tower.id, currentTick);
      }
    });

    return results;
  }

  /**
   * Find first valid target for a tower
   */
  private findTarget(
    tower: TowerState,
    config: TowerAttackConfig,
    monsterGrid: SpatialHashGrid<MonsterSpatialEntity>
  ): MonsterState | null {
    const nearbyMonsters = monsterGrid.queryRange(
      tower.position.x,
      tower.position.y,
      tower.attackRadius + 50 // Small buffer for edge cases
    );

    const rangeSq = tower.attackRadius * tower.attackRadius;
    let bestTarget: MonsterState | null = null;
    let bestScore = -1;

    for (const entity of nearbyMonsters) {
      const monster = entity.state;

      // Check ownership
      if (!isEnemy({ ownerId: tower.ownerId }, { ownerId: monster.ownerId })) {
        continue;
      }

      // Check if in attack range
      if (
        !collides(
          tower.position.x,
          tower.position.y,
          tower.attackRadius,
          monster.position.x,
          monster.position.y,
          monster.radius
        )
      ) {
        continue;
      }

      const dx = monster.position.x - tower.position.x;
      const dy = monster.position.y - tower.position.y;
      const distSq = dx * dx + dy * dy;

      const score = calcMonsterTargetScore(
        distSq, rangeSq,
        monster.hp, monster.maxHp,
        monster.speed, MAX_EXPECTED_MONSTER_SPEED,
        DEFAULT_TOWER_TARGET_WEIGHTS,
      );

      if (score > bestScore) {
        bestScore = score;
        bestTarget = monster;
      }
    }

    return bestTarget;
  }

  /**
   * Create attack bullets
   */
  private createAttack(
    tower: TowerState,
    target: MonsterState,
    config: TowerAttackConfig,
    damage: number
  ): BulletCreationData[] {
    const bullets: BulletCreationData[] = [];

    // Calculate direction to target
    const dir = normalize(
      sub({ x: target.position.x, y: target.position.y }, { x: tower.position.x, y: tower.position.y })
    );

    if (config.isShrapnel && config.bulletCount > 1) {
      // Shrapnel attack: spread bullets in an arc
      for (let i = 0; i < config.bulletCount; i++) {
        // Calculate spread angle for this bullet
        const spreadFraction = i / config.bulletCount;
        const angle = config.bulletSpread * spreadFraction - config.bulletSpread / 2;
        const rotatedDir = rotate(dir, angle);

        bullets.push(this.createBulletData(tower, rotatedDir, config, damage));
      }
    } else {
      // Normal attack: fire directly at target
      for (let i = 0; i < config.bulletCount; i++) {
        bullets.push(this.createBulletData(tower, dir, config, damage, target.id));
      }
    }

    return bullets;
  }

  /**
   * Create bullet data
   */
  private createBulletData(
    tower: TowerState,
    direction: { x: number; y: number },
    config: TowerAttackConfig,
    damage: number,
    targetId?: string
  ): BulletCreationData {
    return {
      bulletType: config.bulletType,
      x: tower.position.x,
      y: tower.position.y,
      vx: direction.x * config.bulletSpeed,
      vy: direction.y * config.bulletSpeed,
      damage,
      radius: config.bulletRadius,
      maxRange: tower.attackRadius,
      targetId: config.isTracking ? targetId : undefined,
      isExplosive: config.isExplosive ?? false,
      explosionRadius: config.explosionRadius ?? 0,
      explosionDamage: config.explosionDamage ?? 0,
      isPenetrating: config.isPenetrating ?? false,
      penetrationCount: config.penetrationCount ?? 0,
      freezeMultiplier: config.freezeMultiplier ?? 1,
      burnRate: config.burnRate ?? 0,
    };
  }

  /**
   * Reset tower cooldown (for selling/rebuilding)
   */
  /**
   * Check cooldown and set it if ready. Returns true if action can proceed.
   */
  checkAndSetCooldown(towerId: string, currentTick: number, cooldownTicks: number): boolean {
    const lastAttack = this.lastAttackTick.get(towerId) || 0;
    if (currentTick - lastAttack < cooldownTicks) return false;
    this.lastAttackTick.set(towerId, currentTick);
    return true;
  }

  resetTowerCooldown(towerId: string): void {
    this.lastAttackTick.delete(towerId);
  }

  /**
   * Clean up removed tower
   */
  removeTower(towerId: string): void {
    this.lastAttackTick.delete(towerId);
  }
}
