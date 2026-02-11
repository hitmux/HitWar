/**
 * Tower State Schema
 * Represents a tower in the multiplayer game
 */
import { Schema, type } from '@colyseus/schema';
import { VectorSchema } from './VectorSchema.js';

export class TowerState extends Schema {
  @type('string') id: string = '';
  @type('string') ownerId: string = ''; // Player ID, empty for neutral
  @type('string') towerType: string = ''; // Tower class name
  @type(VectorSchema) position: VectorSchema = new VectorSchema();
  @type('number') hp: number = 0;
  @type('number') maxHp: number = 0;
  @type('number') level: number = 1;
  @type('number') radius: number = 0;
  @type('number') attackRadius: number = 0;

  // Attack timing
  @type('number') attackClock: number = 60; // Ticks between attacks
  @type('number') attackBulletCount: number = 1; // Bullets per attack

  // For manual cannon
  @type('boolean') isManual: boolean = false;
  @type('number') currentAmmo: number = 0;
  @type('number') maxAmmo: number = 0;

  // Auto-target settings for manual cannon
  @type('number') autoTargetX: number = 0;
  @type('number') autoTargetY: number = 0;
  @type('number') autoTargetRadius: number = 0;
  @type('boolean') hasAutoTarget: boolean = false;

  constructor() {
    super();
    this.position = new VectorSchema();
  }

  setPosition(x: number, y: number): void {
    this.position.set(x, y);
  }
}
