/**
 * Monster Melee System
 * Handles monster-building and monster-mine collision (melee attacks)
 * Monster deals damage proportional to its HP on collision, then dies.
 */

import type { MonsterState } from '../../schema/MonsterState.js';
import type { BuildingState } from '../../schema/BuildingState.js';
import type { MineState } from '../../schema/MineState.js';
import type { TowerState } from '../../schema/TowerState.js';
import type { MapSchema } from '@colyseus/schema';
import { collides, sweepCollides } from '../../shared/math/circle.js';
import { isEnemy } from '../../shared/types/ownership.js';
import { MineStateType } from '../../../../shared/config/mineMeta.js';

export interface MeleeResult {
  monsterId: string;
  buildingId: string;
  damage: number;
  monsterOwnerId: string;
  keepAlive?: boolean;
  targetType?: 'building' | 'tower' | 'mine';
  towerId?: string;
  /** If set, this melee hit a mine instead of a building */
  mineId?: string;
}

interface StaticCircleLike {
  id: string;
  ownerId: string;
  position: { x: number; y: number };
  radius: number;
}

interface StructureHitCandidate {
  id: string;
  targetType: 'building' | 'tower';
}

function getMonsterSweepStart(monster: MonsterState): { x: number; y: number } {
  if ((monster.runtime?.liveTime ?? 0) <= 0) {
    return {
      x: monster.position.x,
      y: monster.position.y,
    };
  }

  return {
    x: monster.prevX,
    y: monster.prevY,
  };
}

function hitStaticTargetDuringMonsterMove(
  monster: MonsterState,
  target: StaticCircleLike,
): boolean {
  const start = getMonsterSweepStart(monster);
  const endX = monster.position.x;
  const endY = monster.position.y;

  return (
    sweepCollides(
      start.x,
      start.y,
      endX,
      endY,
      monster.radius,
      target.position.x,
      target.position.y,
      target.radius
    ) ||
    collides(
      endX,
      endY,
      monster.radius,
      target.position.x,
      target.position.y,
      target.radius
    )
  );
}

function getMonsterCollisionDamage(monster: MonsterState): number {
  return Math.max(
    1,
    Math.floor(monster.runtime?.currentCollisionDamage ?? monster.hp * 0.5)
  );
}

function findClosestStructureHit(
  monster: MonsterState,
  buildings: MapSchema<BuildingState>,
  towers?: MapSchema<TowerState>
): StructureHitCandidate | null {
  const start = getMonsterSweepStart(monster);
  let bestHit: StructureHitCandidate | null = null;
  let bestDistanceSq = Infinity;

  const evaluateTarget = (target: StaticCircleLike, targetType: 'building' | 'tower'): void => {
    if (!isEnemy({ ownerId: monster.ownerId }, { ownerId: target.ownerId })) {
      return;
    }

    if (!hitStaticTargetDuringMonsterMove(monster, target)) {
      return;
    }

    const dx = target.position.x - start.x;
    const dy = target.position.y - start.y;
    const distanceSq = dx * dx + dy * dy;
    if (distanceSq < bestDistanceSq) {
      bestDistanceSq = distanceSq;
      bestHit = {
        id: target.id,
        targetType,
      };
    }
  };

  buildings.forEach((building: BuildingState) => {
    evaluateTarget(building, 'building');
  });

  towers?.forEach((tower: TowerState) => {
    evaluateTarget(tower, 'tower');
  });

  return bestHit;
}

/**
 * Process monster-building and monster-mine melee collisions.
 * Uses sweep collision against the monster's previous/current path to reduce
 * tunneling for high-speed melee monsters while keeping the result shape stable.
 */
export function processMonsterMelee(
  monsters: MapSchema<MonsterState>,
  buildings: MapSchema<BuildingState>,
  mines?: MapSchema<MineState>,
  towers?: MapSchema<TowerState>
): MeleeResult[] {
  const results: MeleeResult[] = [];
  const processed = new Set<string>();

  monsters.forEach((monster: MonsterState) => {
    if (processed.has(monster.id)) return;

    const damage = getMonsterCollisionDamage(monster);
    const structureHit = findClosestStructureHit(monster, buildings, towers);
    if (structureHit) {
      results.push({
        monsterId: monster.id,
        buildingId: structureHit.id,
        damage,
        monsterOwnerId: monster.ownerId,
        keepAlive: monster.runtime?.keepAliveOnCollision ?? false,
        targetType: structureHit.targetType,
        towerId: structureHit.targetType === 'tower' ? structureHit.id : undefined,
      });

      processed.add(monster.id);
      return;
    }

    // Check mines (only powerPlant state)
    if (mines) {
      mines.forEach((mine: MineState) => {
        if (processed.has(monster.id)) return;
        if (mine.mineState !== MineStateType.POWER_PLANT) return;

        if (!isEnemy({ ownerId: monster.ownerId }, { ownerId: mine.ownerId })) {
          return;
        }

        const hit = hitStaticTargetDuringMonsterMove(monster, mine);

        if (hit) {
          results.push({
            monsterId: monster.id,
            buildingId: mine.id,
            damage,
            monsterOwnerId: monster.ownerId,
            keepAlive: monster.runtime?.keepAliveOnCollision ?? false,
            targetType: 'mine',
            mineId: mine.id,
          });

          processed.add(monster.id);
        }
      });
    }
  });

  return results;
}
