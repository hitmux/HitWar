/**
 * Monster State Schema
 * Represents a monster in the multiplayer game
 */
import { Schema, type } from '@colyseus/schema';
import { VectorSchema } from './VectorSchema.js';

export class MonsterState extends Schema {
  @type('string') id: string = '';
  @type('string') ownerId: string = ''; // Player ID who spawned it, empty for neutral
  @type('string') targetPlayerId: string = ''; // Player being attacked
  @type('string') monsterType: string = ''; // Monster class name
  @type(VectorSchema) position: VectorSchema = new VectorSchema();
  @type(VectorSchema) velocity: VectorSchema = new VectorSchema();
  @type('number') hp: number = 0;
  @type('number') maxHp: number = 0;
  @type('number') radius: number = 0;
  @type('number') speed: number = 0;

  // Status effects
  @type('boolean') isFrozen: boolean = false;
  @type('boolean') isSlowed: boolean = false;
  @type('number') freezeEndTime: number = 0;
  @type('number') slowEndTime: number = 0;
  @type('number') burnRate: number = 0; // HP% damage per tick from burning
  @type('string') burnSourceOwnerId: string = ''; // Player who applied the burn

  // Movement tracking (for sweep collision)
  prevX: number = 0;
  prevY: number = 0;

  // AI properties
  @type('string') movementType: string = 'normal'; // normal, swing, sudden, exciting
  @type('boolean') dodgeAble: boolean = false;

  constructor() {
    super();
    this.position = new VectorSchema();
    this.velocity = new VectorSchema();
  }

  setPosition(x: number, y: number): void {
    this.position.set(x, y);
  }

  setVelocity(vx: number, vy: number): void {
    this.velocity.set(vx, vy);
  }
}
