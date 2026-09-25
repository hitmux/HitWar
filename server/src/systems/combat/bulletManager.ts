/**
 * Bullet Manager - Server-side bullet system
 * Handles bullet movement, collision detection, and effects
 *
 * Port of src/bullets/bullet.ts for server use
 */

import { BulletState } from '../../schema/BulletState.js';
import type { MonsterState } from '../../schema/MonsterState.js';
import type { BuildingState } from '../../schema/BuildingState.js';
import type { TowerState } from '../../schema/TowerState.js';
import type { MapSchema } from '@colyseus/schema';
import { sweepCollides, sweepCollidesRelative, collides } from '../../shared/math/circle.js';
import { normalize, sub, distSq } from '../../shared/math/vector.js';
import { isEnemy } from '../../shared/types/ownership.js';
import type { SpatialHashGrid, SpatialEntity } from '../spatial/spatialHashGrid.js';
import type { BulletCreationData } from './towerAttack.js';

/**
 * Result of bullet collision
 */
export interface BulletHitResult {
  bulletId: string;
  towerId: string;
  ownerId: string;
  targetId: string;
  targetType: 'monster' | 'building' | 'tower';
  damage: number;
  position: { x: number; y: number };
  // Effects to apply
  freezeMultiplier: number;
  burnRate: number;
  // Explosion data (if explosive)
  isExplosion: boolean;
  explosionRadius: number;
  explosionDamage: number;
  explosionTargets: Array<{
    id: string;
    damage: number;
    targetType?: 'monster' | 'building' | 'tower';
  }>;
}

/**
 * Bullet fired event (for client sync)
 */
export interface BulletFiredEvent {
  bulletId: string;
  bulletType: string;
  sourceId: string;
  sourceType: 'tower' | 'monster';
  towerId?: string;
  ownerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  maxRange: number;
}

/**
 * Monster wrapper for spatial grid
 */
interface MonsterSpatialEntity extends SpatialEntity {
  state: MonsterState;
  prevX?: number;
  prevY?: number;
}

/**
 * Building wrapper for spatial grid
 */
interface BuildingSpatialEntity extends SpatialEntity {
  state: BuildingState;
}

interface TowerSpatialEntity extends SpatialEntity {
  state: TowerState;
}

interface StructureCollisionCandidate {
  id: string;
  ownerId: string;
  position: { x: number; y: number };
  radius: number;
  targetType: 'building' | 'tower';
}

/**
 * Bullet Manager
 */
export class BulletManager {
  // Active bullets
  private bullets: Map<string, BulletState> = new Map();
  private nextBulletId: number = 0;

  // Bullets to remove this tick
  private toRemove: Set<string> = new Set();

  constructor() {}

  /**
   * Create a bullet from attack data
   */
  createBullet(
    data: BulletCreationData,
    sourceId: string,
    ownerId: string,
    sourceType: 'tower' | 'monster' = 'tower'
  ): BulletState {
    const bullet = new BulletState();
    bullet.id = `bullet_${this.nextBulletId++}`;
    bullet.ownerId = ownerId;
    bullet.towerId = sourceId;
    bullet.bulletType = data.bulletType;
    bullet.sourceType = sourceType;

    bullet.setPosition(data.x, data.y);
    bullet.setOrigin(data.x, data.y);
    bullet.setVelocity(data.vx, data.vy);
    bullet.prevX = data.x;
    bullet.prevY = data.y;

    bullet.radius = data.radius;
    bullet.damage = data.damage;
    bullet.maxRange = data.maxRange;

    // Tracking
    bullet.isTracking = !!data.targetId;
    bullet.targetId = data.targetId || '';

    // Explosive
    bullet.isExplosive = data.isExplosive;
    bullet.explosionRadius = data.explosionRadius;
    bullet.explosionDamage = data.explosionDamage;

    // Penetrating
    bullet.isPenetrating = data.isPenetrating;
    bullet.penetrationCount = data.penetrationCount;

    // Effects
    bullet.freezeMultiplier = data.freezeMultiplier;
    bullet.burnRate = data.burnRate;
    bullet.slideRate = data.slideRate ?? bullet.slideRate;
    bullet.targetsTowers = data.targetsTowers ?? false;

    this.bullets.set(bullet.id, bullet);
    return bullet;
  }

  /**
   * Get bullet fired event for client sync
   */
  getBulletFiredEvent(bullet: BulletState): BulletFiredEvent {
    return {
      bulletId: bullet.id,
      bulletType: bullet.bulletType,
      sourceId: bullet.towerId,
      sourceType: bullet.sourceType,
      towerId: bullet.sourceType === 'tower' ? bullet.towerId : undefined,
      ownerId: bullet.ownerId,
      x: bullet.position.x,
      y: bullet.position.y,
      vx: bullet.velocity.x,
      vy: bullet.velocity.y,
      radius: bullet.radius,
      maxRange: bullet.maxRange,
    };
  }

  /**
   * Update all bullet positions (Phase 1: Movement)
   */
  updatePositions(
    monsters: MapSchema<MonsterState>,
    buildings?: MapSchema<BuildingState>,
    towers?: MapSchema<TowerState>
  ): void {
    for (const bullet of this.bullets.values()) {
      // Save previous position
      bullet.prevX = bullet.position.x;
      bullet.prevY = bullet.position.y;

      // Tracking movement
      if (bullet.isTracking && bullet.targetId) {
        const monsterTarget = monsters.get(bullet.targetId);
        const structureTarget = bullet.targetsTowers
          ? buildings?.get(bullet.targetId) ?? towers?.get(bullet.targetId)
          : undefined;
        const target = monsterTarget ?? structureTarget;
        if (target && target.hp > 0) {
          // Track toward target
          const dir = normalize(
            sub({ x: target.position.x, y: target.position.y }, { x: bullet.position.x, y: bullet.position.y })
          );
          const speed = Math.sqrt(bullet.velocity.x ** 2 + bullet.velocity.y ** 2);
          bullet.setVelocity(dir.x * speed, dir.y * speed);
        }
      }

      // Apply velocity
      bullet.setPosition(bullet.position.x + bullet.velocity.x, bullet.position.y + bullet.velocity.y);

      // Check range
      if (bullet.isOutOfRange()) {
        this.toRemove.add(bullet.id);
      }
    }
  }

  /**
   * Process all bullet collisions (Phase 2: Collision)
   * Returns hit results for damage application
   */
  processCollisions(
    monsterGrid: SpatialHashGrid<MonsterSpatialEntity>,
    buildingGrid?: SpatialHashGrid<BuildingSpatialEntity>,
    towerGrid?: SpatialHashGrid<TowerSpatialEntity>
  ): BulletHitResult[] {
    const results: BulletHitResult[] = [];

    for (const bullet of this.bullets.values()) {
      if (this.toRemove.has(bullet.id)) continue;

      const hitResult = bullet.targetsTowers
        ? this.checkStructureCollision(bullet, buildingGrid, towerGrid)
        : this.checkMonsterCollision(bullet, monsterGrid);

      if (hitResult) {
        results.push(hitResult);

        // Handle penetrating bullets
        if (bullet.isPenetrating && bullet.penetrationCount > 0) {
          bullet.penetrationCount--;
          bullet.radius *= 0.9; // Shrink after penetration
          if (bullet.radius <= 0 || bullet.penetrationCount <= 0) {
            this.toRemove.add(bullet.id);
          }
        } else {
          this.toRemove.add(bullet.id);
        }
      }
    }

    return results;
  }

  /**
   * Check collision with monsters
   */
  private checkMonsterCollision(
    bullet: BulletState,
    monsterGrid: SpatialHashGrid<MonsterSpatialEntity>
  ): BulletHitResult | null {
    const nearbyMonsters = monsterGrid.queryRange(
      bullet.position.x,
      bullet.position.y,
      bullet.radius + 100 // Buffer for sweep collision
    );

    for (const entity of nearbyMonsters) {
      const monster = entity.state;

      // Check ownership
      if (!isEnemy({ ownerId: bullet.ownerId }, { ownerId: monster.ownerId })) {
        continue;
      }

      // Get monster previous position
      const mPrevX = entity.prevX ?? monster.position.x;
      const mPrevY = entity.prevY ?? monster.position.y;

      // Sweep collision detection (both objects moving)
      const collided = sweepCollidesRelative(
        bullet.prevX,
        bullet.prevY,
        bullet.position.x,
        bullet.position.y,
        bullet.radius,
        mPrevX,
        mPrevY,
        monster.position.x,
        monster.position.y,
        monster.radius
      );

      if (collided) {
        return this.createHitResult(bullet, monster.id, 'monster', monsterGrid);
      }
    }

    return null;
  }

  /**
   * Check collision with structures that can be targeted by monster bullets
   */
  private checkStructureCollision(
    bullet: BulletState,
    buildingGrid?: SpatialHashGrid<BuildingSpatialEntity>,
    towerGrid?: SpatialHashGrid<TowerSpatialEntity>
  ): BulletHitResult | null {
    const candidates: StructureCollisionCandidate[] = [];

    if (buildingGrid) {
      const nearbyBuildings = buildingGrid.queryRange(
        bullet.position.x,
        bullet.position.y,
        bullet.radius + 100
      );

      for (const entity of nearbyBuildings) {
        candidates.push({
          id: entity.state.id,
          ownerId: entity.state.ownerId,
          position: entity.state.position,
          radius: entity.state.radius,
          targetType: 'building',
        });
      }
    }

    if (towerGrid) {
      const nearbyTowers = towerGrid.queryRange(
        bullet.position.x,
        bullet.position.y,
        bullet.radius + 100
      );

      for (const entity of nearbyTowers) {
        candidates.push({
          id: entity.state.id,
          ownerId: entity.state.ownerId,
          position: entity.state.position,
          radius: entity.state.radius,
          targetType: 'tower',
        });
      }
    }

    let bestTarget: StructureCollisionCandidate | null = null;
    let bestDistanceSq = Infinity;

    for (const candidate of candidates) {
      if (!isEnemy({ ownerId: bullet.ownerId }, { ownerId: candidate.ownerId })) {
        continue;
      }

      const collided = sweepCollides(
        bullet.prevX,
        bullet.prevY,
        bullet.position.x,
        bullet.position.y,
        bullet.radius,
        candidate.position.x,
        candidate.position.y,
        candidate.radius
      );

      if (!collided) {
        continue;
      }

      const distanceToStartSq = distSq(
        { x: bullet.prevX, y: bullet.prevY },
        { x: candidate.position.x, y: candidate.position.y }
      );

      if (distanceToStartSq < bestDistanceSq) {
        bestDistanceSq = distanceToStartSq;
        bestTarget = candidate;
      }
    }

    if (!bestTarget) {
      return null;
    }

    return this.createHitResult(
      bullet,
      bestTarget.id,
      bestTarget.targetType,
      undefined,
      buildingGrid,
      towerGrid
    );
  }

  /**
   * Create hit result
   */
  private createHitResult(
    bullet: BulletState,
    targetId: string,
    targetType: 'monster' | 'building' | 'tower',
    monsterGrid?: SpatialHashGrid<MonsterSpatialEntity>,
    buildingGrid?: SpatialHashGrid<BuildingSpatialEntity>,
    towerGrid?: SpatialHashGrid<TowerSpatialEntity>
  ): BulletHitResult {
    const result: BulletHitResult = {
      bulletId: bullet.id,
      towerId: bullet.towerId,
      ownerId: bullet.ownerId,
      targetId,
      targetType,
      damage: bullet.damage,
      position: { x: bullet.position.x, y: bullet.position.y },
      freezeMultiplier: bullet.freezeMultiplier,
      burnRate: bullet.burnRate,
      isExplosion: bullet.isExplosive,
      explosionRadius: bullet.explosionRadius,
      explosionDamage: bullet.explosionDamage,
      explosionTargets: [],
    };

    // Calculate explosion targets
    if (bullet.isExplosive && bullet.explosionRadius > 0) {
      if (targetType === 'monster' && monsterGrid) {
        const explosionTargets = monsterGrid.queryRange(
          bullet.position.x,
          bullet.position.y,
          bullet.explosionRadius
        );

        for (const entity of explosionTargets) {
          const monster = entity.state;

          if (!isEnemy({ ownerId: bullet.ownerId }, { ownerId: monster.ownerId })) {
            continue;
          }

          const dist = Math.sqrt(
            distSq({ x: bullet.position.x, y: bullet.position.y }, { x: monster.position.x, y: monster.position.y })
          );

          if (dist <= bullet.explosionRadius + monster.radius) {
            const damageRatio = Math.max(0, 1 - dist / bullet.explosionRadius);
            const explosionDamage = bullet.explosionDamage * damageRatio;

            result.explosionTargets.push({
              id: monster.id,
              damage: explosionDamage,
              targetType: 'monster',
            });
          }
        }
      }

      if (targetType === 'building' || targetType === 'tower') {
        this.appendStructureExplosionTargets(result, bullet, buildingGrid, towerGrid);
      }
    }

    return result;
  }

  private appendStructureExplosionTargets(
    result: BulletHitResult,
    bullet: BulletState,
    buildingGrid?: SpatialHashGrid<BuildingSpatialEntity>,
    towerGrid?: SpatialHashGrid<TowerSpatialEntity>
  ): void {
    if (buildingGrid) {
      const explosionTargets = buildingGrid.queryRange(
        bullet.position.x,
        bullet.position.y,
        bullet.explosionRadius
      );

      for (const entity of explosionTargets) {
        const building = entity.state;

        if (!isEnemy({ ownerId: bullet.ownerId }, { ownerId: building.ownerId })) {
          continue;
        }

        const dist = Math.sqrt(
          distSq({ x: bullet.position.x, y: bullet.position.y }, { x: building.position.x, y: building.position.y })
        );

        if (dist <= bullet.explosionRadius + building.radius) {
          const damageRatio = Math.max(0, 1 - dist / bullet.explosionRadius);
          const explosionDamage = bullet.explosionDamage * damageRatio;

          result.explosionTargets.push({
            id: building.id,
            damage: explosionDamage,
            targetType: 'building',
          });
        }
      }
    }

    if (towerGrid) {
      const explosionTargets = towerGrid.queryRange(
        bullet.position.x,
        bullet.position.y,
        bullet.explosionRadius
      );

      for (const entity of explosionTargets) {
        const tower = entity.state;

        if (!isEnemy({ ownerId: bullet.ownerId }, { ownerId: tower.ownerId })) {
          continue;
        }

        const dist = Math.sqrt(
          distSq({ x: bullet.position.x, y: bullet.position.y }, { x: tower.position.x, y: tower.position.y })
        );

        if (dist <= bullet.explosionRadius + tower.radius) {
          const damageRatio = Math.max(0, 1 - dist / bullet.explosionRadius);
          const explosionDamage = bullet.explosionDamage * damageRatio;

          result.explosionTargets.push({
            id: tower.id,
            damage: explosionDamage,
            targetType: 'tower',
          });
        }
      }
    }
  }

  /**
   * Remove bullets marked for removal
   */
  cleanup(): string[] {
    const removed: string[] = [];

    for (const id of this.toRemove) {
      this.bullets.delete(id);
      removed.push(id);
    }

    this.toRemove.clear();
    return removed;
  }

  /**
   * Get all active bullets
   */
  getActiveBullets(): BulletState[] {
    return Array.from(this.bullets.values());
  }

  /**
   * Get bullet by ID
   */
  getBullet(id: string): BulletState | undefined {
    return this.bullets.get(id);
  }

  /**
   * Remove a bullet
   */
  removeBullet(id: string): boolean {
    this.toRemove.add(id);
    return this.bullets.delete(id);
  }

  /**
   * Clear all bullets
   */
  clear(): void {
    this.bullets.clear();
    this.toRemove.clear();
  }

  /**
   * Get bullet count
   */
  getBulletCount(): number {
    return this.bullets.size;
  }
}
