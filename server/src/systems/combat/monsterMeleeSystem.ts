/**
 * Monster Melee System
 * Handles monster-building and monster-mine collision (melee attacks)
 * Monster deals damage proportional to its HP on collision, then dies.
 */

import type { MonsterState } from '../../schema/MonsterState.js';
import type { BuildingState } from '../../schema/BuildingState.js';
import type { MineState } from '../../schema/MineState.js';
import type { MapSchema } from '@colyseus/schema';
import { collides } from '../../shared/math/circle.js';
import { isEnemy } from '../../shared/types/ownership.js';
import { MineStateType } from '../../../../shared/config/mineMeta.js';

export interface MeleeResult {
  monsterId: string;
  buildingId: string;
  damage: number;
  monsterOwnerId: string;
  /** If set, this melee hit a mine instead of a building */
  mineId?: string;
}

/**
 * Process monster-building and monster-mine melee collisions.
 * Monsters that collide with enemy buildings/mines deal damage = hp * 0.5, then die.
 */
export function processMonsterMelee(
  monsters: MapSchema<MonsterState>,
  buildings: MapSchema<BuildingState>,
  mines?: MapSchema<MineState>
): MeleeResult[] {
  const results: MeleeResult[] = [];
  const processed = new Set<string>();

  monsters.forEach((monster: MonsterState) => {
    if (processed.has(monster.id)) return;

    // Check buildings
    buildings.forEach((building: BuildingState) => {
      if (processed.has(monster.id)) return;

      if (!isEnemy({ ownerId: monster.ownerId }, { ownerId: building.ownerId })) {
        return;
      }

      const hit = collides(
        monster.position.x,
        monster.position.y,
        monster.radius,
        building.position.x,
        building.position.y,
        building.radius
      );

      if (hit) {
        const damage = Math.max(1, Math.floor(monster.hp * 0.5));

        results.push({
          monsterId: monster.id,
          buildingId: building.id,
          damage,
          monsterOwnerId: monster.ownerId,
        });

        processed.add(monster.id);
      }
    });

    // Check mines (only powerPlant state)
    if (mines) {
      mines.forEach((mine: MineState) => {
        if (processed.has(monster.id)) return;
        if (mine.mineState !== MineStateType.POWER_PLANT) return;

        if (!isEnemy({ ownerId: monster.ownerId }, { ownerId: mine.ownerId })) {
          return;
        }

        const hit = collides(
          monster.position.x,
          monster.position.y,
          monster.radius,
          mine.position.x,
          mine.position.y,
          mine.radius
        );

        if (hit) {
          const damage = Math.max(1, Math.floor(monster.hp * 0.5));

          results.push({
            monsterId: monster.id,
            buildingId: mine.id,
            damage,
            monsterOwnerId: monster.ownerId,
            mineId: mine.id,
          });

          processed.add(monster.id);
        }
      });
    }
  });

  return results;
}
