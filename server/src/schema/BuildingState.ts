/**
 * Building State Schema
 * Represents a building (base, spawner, etc.) in the multiplayer game
 */
import { Schema, type, ArraySchema } from '@colyseus/schema';
import { VectorSchema } from './VectorSchema.js';

/**
 * Spawner cooldown for a specific monster type
 */
export class SpawnerCooldown extends Schema {
  @type('string') monsterType: string = '';
  remainingTicks: number = 0; // Server-side only, not synced
  @type('number') totalTicks: number = 0;

  constructor(monsterType: string = '', totalTicks: number = 0) {
    super();
    this.monsterType = monsterType;
    this.totalTicks = totalTicks;
    this.remainingTicks = 0;
  }
}

export class BuildingState extends Schema {
  @type('string') id: string = '';
  @type('string') ownerId: string = ''; // Player ID
  @type('string') buildingType: string = ''; // Building class name
  @type(VectorSchema) position: VectorSchema = new VectorSchema();
  @type('number') hp: number = 0;
  @type('number') maxHp: number = 0;
  @type('number') radius: number = 0;
  @type('boolean') isBase: boolean = false;

  // For monster spawner
  @type('boolean') isSpawner: boolean = false;
  @type([SpawnerCooldown]) cooldowns: ArraySchema<SpawnerCooldown> =
    new ArraySchema<SpawnerCooldown>();

  constructor() {
    super();
    this.position = new VectorSchema();
    this.cooldowns = new ArraySchema<SpawnerCooldown>();
  }

  setPosition(x: number, y: number): void {
    this.position.set(x, y);
  }

  /**
   * Get cooldown for a specific monster type
   */
  getCooldown(monsterType: string): SpawnerCooldown | undefined {
    return this.cooldowns.find((c) => c.monsterType === monsterType);
  }

  /**
   * Set cooldown for a specific monster type
   */
  setCooldown(monsterType: string, remainingTicks: number, totalTicks: number): void {
    let cooldown = this.getCooldown(monsterType);
    if (!cooldown) {
      cooldown = new SpawnerCooldown(monsterType, totalTicks);
      this.cooldowns.push(cooldown);
    }
    cooldown.remainingTicks = remainingTicks;
    cooldown.totalTicks = totalTicks;
  }
}
