/**
 * Combat System - Facade for all combat subsystems
 * Coordinates tower attacks, bullet management, and damage calculation
 */

import type { TowerState } from '../../schema/TowerState.js';
import type { MonsterState } from '../../schema/MonsterState.js';
import type { BuildingState } from '../../schema/BuildingState.js';
import type { BulletState } from '../../schema/BulletState.js';
import type { MineState } from '../../schema/MineState.js';
import type { MapSchema } from '@colyseus/schema';
import { TowerAttackSystem, type AttackResult, type BulletCreationData } from './towerAttack.js';
import { BulletManager, type BulletHitResult, type BulletFiredEvent } from './bulletManager.js';
import { DamageCalculator } from './damageCalculator.js';
import { SpatialHashGrid, type SpatialEntity } from '../spatial/spatialHashGrid.js';
import { processMonsterMelee, type MeleeResult } from './monsterMeleeSystem.js';
import { TOWER_COMBAT_META, type TowerCombatData } from '../../../../shared/config/towerCombatMeta.js';
import { BULLET_COMBAT_META } from '../../../../shared/config/bulletCombatMeta.js';
import { normalize, sub } from '../../shared/math/vector.js';

/**
 * Spatial entity wrappers for grids
 */
interface MonsterSpatialEntity extends SpatialEntity {
  state: MonsterState;
  prevX?: number;
  prevY?: number;
}

interface BuildingSpatialEntity extends SpatialEntity {
  state: BuildingState;
}

/**
 * Result of a single combat tick
 */
export interface CombatTickResult {
  bulletsFired: BulletFiredEvent[];
  bulletsHit: BulletHitResult[];
  bulletsRemoved: string[];
}

/**
 * CombatSystem facade - integrates all combat subsystems
 */
export class CombatSystem {
  private towerAttack: TowerAttackSystem;
  private bulletMgr: BulletManager;
  private damageCalc: DamageCalculator;
  private monsterGrid: SpatialHashGrid<MonsterSpatialEntity>;
  private buildingGrid: SpatialHashGrid<BuildingSpatialEntity>;

  // Track monster/building spatial wrappers
  private monsterEntities: Map<string, MonsterSpatialEntity> = new Map();
  private buildingEntities: Map<string, BuildingSpatialEntity> = new Map();

  constructor(
    mapWidth: number,
    mapHeight: number,
    damageCalc: DamageCalculator
  ) {
    this.towerAttack = new TowerAttackSystem();
    this.bulletMgr = new BulletManager();
    this.damageCalc = damageCalc;

    // Cell size 128 for good balance of precision and performance
    this.monsterGrid = new SpatialHashGrid<MonsterSpatialEntity>(mapWidth, mapHeight, 128);
    this.buildingGrid = new SpatialHashGrid<BuildingSpatialEntity>(mapWidth, mapHeight, 128);
  }

  /**
   * Register all tower configs from TOWER_COMBAT_META
   */
  initTowerConfigs(): void {
    for (const [towerType, meta] of Object.entries(TOWER_COMBAT_META)) {
      this.towerAttack.registerTowerConfig(towerType, {
        attackRadius: meta.attackRadius,
        attackClock: meta.attackClock,
        bulletCount: meta.bulletCount,
        bulletSpread: meta.bulletSpread,
        bulletType: meta.bulletType,
        bulletDamage: meta.bulletDamage,
        bulletSpeed: meta.bulletSpeed,
        bulletRadius: meta.bulletRadius,
        isShrapnel: meta.isShrapnel,
        isExplosive: meta.isExplosive,
        explosionRadius: meta.explosionRadius,
        explosionDamage: meta.explosionDamage,
        isTracking: meta.isTracking,
        trackingRadius: meta.trackingRadius,
        isPenetrating: meta.isPenetrating,
        penetrationCount: meta.penetrationCount,
        freezeMultiplier: meta.freezeMultiplier,
        burnRate: meta.burnRate,
      });
    }
  }

  /**
   * Main combat update tick
   */
  update(
    currentTick: number,
    towers: MapSchema<TowerState>,
    monsters: MapSchema<MonsterState>,
    buildings: MapSchema<BuildingState>
  ): CombatTickResult {
    const bulletsFired: BulletFiredEvent[] = [];

    // Step 1: Update spatial grids
    this.updateMonsterGrid(monsters);
    this.updateBuildingGrid(buildings);

    // Step 2: Tower attacks -> create bullets
    const attacks = this.towerAttack.processAttacks(
      currentTick,
      towers,
      this.monsterGrid,
      this.damageCalc
    );

    for (const attack of attacks) {
      for (const bulletData of attack.bullets) {
        const bullet = this.bulletMgr.createBullet(bulletData, attack.towerId, attack.ownerId);
        bulletsFired.push(this.bulletMgr.getBulletFiredEvent(bullet));
      }
    }

    // Step 3: Move bullets
    this.bulletMgr.updatePositions(monsters);

    // Step 4: Bullet collisions
    const bulletsHit = this.bulletMgr.processCollisions(this.monsterGrid, this.buildingGrid);

    // Step 5: Cleanup dead bullets
    const bulletsRemoved = this.bulletMgr.cleanup();

    return { bulletsFired, bulletsHit, bulletsRemoved };
  }

  /**
   * Process monster-building melee collisions
   */
  processMonsterMelee(
    monsters: MapSchema<MonsterState>,
    buildings: MapSchema<BuildingState>,
    mines?: MapSchema<MineState>
  ): MeleeResult[] {
    return processMonsterMelee(monsters, buildings, mines);
  }

  /**
   * Fire manual cannon - creates a bullet toward target position
   */
  fireManualCannon(
    tower: TowerState,
    targetX: number,
    targetY: number
  ): BulletFiredEvent | null {
    const bulletType = 'ManualCannon_Shell';
    const bulletMeta = BULLET_COMBAT_META[bulletType];
    if (!bulletMeta) return null;

    const towerMeta = TOWER_COMBAT_META['ManualCannon'] as TowerCombatData | undefined;
    const bulletSpeed = towerMeta?.bulletSpeed ?? 24; // scaleSpeed(8)

    // Apply damage multiplier (territory + energy) — same as regular towers
    const damageMultiplier = this.damageCalc.getDamageMultiplier(tower.id, tower.ownerId);

    const dir = normalize(
      sub(
        { x: targetX, y: targetY },
        { x: tower.position.x, y: tower.position.y }
      )
    );

    const bulletData: BulletCreationData = {
      bulletType,
      x: tower.position.x,
      y: tower.position.y,
      vx: dir.x * bulletSpeed,
      vy: dir.y * bulletSpeed,
      damage: bulletMeta.damage * damageMultiplier,
      radius: bulletMeta.radius,
      maxRange: tower.attackRadius || 300,
      isExplosive: bulletMeta.isExplosive,
      explosionRadius: bulletMeta.explosionRadius,
      explosionDamage: (bulletMeta.explosionDamage ?? 0) * damageMultiplier,
      isPenetrating: bulletMeta.isPenetrating,
      penetrationCount: bulletMeta.penetrationCount,
      freezeMultiplier: bulletMeta.freezeMultiplier,
      burnRate: bulletMeta.burnRate,
    };

    const bullet = this.bulletMgr.createBullet(bulletData, tower.id, tower.ownerId);
    // Manual cannon shells can hit buildings
    bullet.targetsTowers = true;

    return this.bulletMgr.getBulletFiredEvent(bullet);
  }

  /**
   * Notify tower removed (cleanup cooldown tracking)
   */
  /**
   * Process auto-fire for manual cannons that have an auto-target set.
   * Searches for enemy buildings/towers first, then monsters in the marked area.
   */
  processCannonAutoFire(
    currentTick: number,
    towers: MapSchema<TowerState>
  ): BulletFiredEvent[] {
    const events: BulletFiredEvent[] = [];

    towers.forEach((tower: TowerState) => {
      if (!tower.isManual || !tower.hasAutoTarget || tower.currentAmmo <= 0) return;

      // Cooldown check: ~1 second at 60fps
      if (!this.towerAttack.checkAndSetCooldown(tower.id, currentTick, 60)) return;

      // Find target in the marked area
      const target = this.findAutoTarget(tower);
      if (!target) return;

      const bulletEvent = this.fireManualCannon(tower, target.x, target.y);
      if (bulletEvent) {
        tower.currentAmmo--;
        events.push(bulletEvent);
      }
    });

    return events;
  }

  /**
   * Find a target within the cannon's auto-target area.
   * Priority: enemy buildings/towers > enemy monsters.
   * Target must also be within the cannon's attack radius.
   */
  private findAutoTarget(
    tower: TowerState
  ): { x: number; y: number } | null {
    const markerX = tower.autoTargetX;
    const markerY = tower.autoTargetY;
    const markerRadius = tower.autoTargetRadius;
    const attackRadius = tower.attackRadius || 300;

    // Helper: check if position is within cannon's attack range
    const inAttackRange = (x: number, y: number): boolean => {
      const dx = x - tower.position.x;
      const dy = y - tower.position.y;
      return dx * dx + dy * dy <= attackRadius * attackRadius;
    };

    // Helper: check if position is within the marked area
    const inMarkedArea = (x: number, y: number): boolean => {
      const dx = x - markerX;
      const dy = y - markerY;
      return dx * dx + dy * dy <= markerRadius * markerRadius;
    };

    // Priority 1: Enemy buildings in marked area
    let closestBuildingDistSq = Infinity;
    let closestBuildingPos: { x: number; y: number } | null = null;

    for (const [, entity] of this.buildingEntities) {
      const building = entity.state;
      if (building.ownerId === tower.ownerId) continue; // Skip friendly
      const bx = building.position.x;
      const by = building.position.y;
      if (!inMarkedArea(bx, by) || !inAttackRange(bx, by)) continue;

      const distSq = (bx - tower.position.x) ** 2 + (by - tower.position.y) ** 2;
      if (distSq < closestBuildingDistSq) {
        closestBuildingDistSq = distSq;
        closestBuildingPos = { x: bx, y: by };
      }
    }

    if (closestBuildingPos) return closestBuildingPos;

    // Priority 2: Enemy monsters in marked area
    const nearbyMonsters = this.monsterGrid.queryRange(markerX, markerY, markerRadius);
    let closestMonsterDistSq = Infinity;
    let closestMonsterPos: { x: number; y: number } | null = null;

    for (const entity of nearbyMonsters) {
      const monster = entity.state;
      // Skip friendly monsters
      if (tower.ownerId && monster.ownerId === tower.ownerId) continue;

      const mx = monster.position.x;
      const my = monster.position.y;
      if (!inAttackRange(mx, my)) continue;

      const distSq = (mx - tower.position.x) ** 2 + (my - tower.position.y) ** 2;
      if (distSq < closestMonsterDistSq) {
        closestMonsterDistSq = distSq;
        closestMonsterPos = { x: mx, y: my };
      }
    }

    return closestMonsterPos;
  }

  onTowerRemoved(towerId: string): void {
    this.towerAttack.removeTower(towerId);
  }

  /**
   * Notify tower upgraded (reset cooldown for immediate re-engagement)
   */
  onTowerUpgraded(towerId: string, _newType: string): void {
    this.towerAttack.resetTowerCooldown(towerId);
  }

  /**
   * Get active bullet count (for debugging/monitoring)
   */
  getActiveBulletCount(): number {
    return this.bulletMgr.getBulletCount();
  }

  /**
   * Clear all combat state
   */
  clear(): void {
    this.bulletMgr.clear();
    this.monsterGrid.clear();
    this.buildingGrid.clear();
    this.monsterEntities.clear();
    this.buildingEntities.clear();
  }

  // ==================== Private Methods ====================

  private updateMonsterGrid(monsters: MapSchema<MonsterState>): void {
    // Remove entities no longer present
    for (const [id, entity] of this.monsterEntities) {
      if (!monsters.has(id)) {
        this.monsterGrid.remove(entity);
        this.monsterEntities.delete(id);
      }
    }

    // Update or insert
    monsters.forEach((monster: MonsterState) => {
      let entity = this.monsterEntities.get(monster.id);
      if (!entity) {
        entity = {
          id: monster.id,
          position: monster.position,
          radius: monster.radius,
          state: monster,
          prevX: monster.prevX,
          prevY: monster.prevY,
        };
        this.monsterEntities.set(monster.id, entity);
      } else {
        entity.position = monster.position;
        entity.radius = monster.radius;
        entity.prevX = monster.prevX;
        entity.prevY = monster.prevY;
      }
      this.monsterGrid.update(entity);
    });
  }

  private updateBuildingGrid(buildings: MapSchema<BuildingState>): void {
    // Remove entities no longer present
    for (const [id, entity] of this.buildingEntities) {
      if (!buildings.has(id)) {
        this.buildingGrid.remove(entity);
        this.buildingEntities.delete(id);
      }
    }

    // Update or insert
    buildings.forEach((building: BuildingState) => {
      let entity = this.buildingEntities.get(building.id);
      if (!entity) {
        entity = {
          id: building.id,
          position: building.position,
          radius: building.radius,
          state: building,
        };
        this.buildingEntities.set(building.id, entity);
        this.buildingGrid.insert(entity);
      }
      // Buildings don't move, so no need to update position in grid
    });
  }
}
