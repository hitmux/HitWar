/**
 * Bullet State Schema
 * Represents a bullet/projectile in the multiplayer game
 *
 * NOTE: Per plan, bullets use event-driven sync (BULLET_FIRED, BULLET_HIT)
 * rather than full state sync. This schema is for server-side tracking.
 */
import { Schema, type } from '@colyseus/schema';
import { VectorSchema } from './VectorSchema.js';

export class BulletState extends Schema {
  @type('string') id: string = '';
  @type('string') ownerId: string = ''; // Player ID who owns the tower that fired
  @type('string') towerId: string = ''; // Tower that fired this bullet
  @type('string') bulletType: string = 'Normal'; // Bullet class name

  @type(VectorSchema) position: VectorSchema = new VectorSchema();
  @type(VectorSchema) velocity: VectorSchema = new VectorSchema();

  // Previous position for sweep collision
  prevX: number = 0;
  prevY: number = 0;

  @type('number') radius: number = 5;
  @type('number') damage: number = 0;
  @type('number') speed: number = 0;

  // Tracking bullet properties
  @type('boolean') isTracking: boolean = false;
  @type('string') targetId: string = '';
  @type('number') trackingRadius: number = 0;

  // Explosive bullet properties
  @type('boolean') isExplosive: boolean = false;
  @type('number') explosionRadius: number = 0;
  @type('number') explosionDamage: number = 0;

  // Penetrating bullet properties
  @type('boolean') isPenetrating: boolean = false;
  @type('number') penetrationCount: number = 0; // Remaining penetrations

  // Freeze properties
  @type('number') freezeMultiplier: number = 1; // 1 = no freeze, <1 = slow

  // Burn properties
  @type('number') burnRate: number = 0;

  // Range tracking
  originX: number = 0;
  originY: number = 0;
  maxRange: number = 0;
  slideRate: number = 2;

  // Split bullet properties
  isSplit: boolean = false;
  canSplit: boolean = false;
  splitCount: number = 0;
  splitRange: number = 0;

  // Targeting tower instead of monster
  targetsTowers: boolean = false;

  constructor() {
    super();
    this.position = new VectorSchema();
    this.velocity = new VectorSchema();
  }

  setPosition(x: number, y: number): void {
    this.prevX = this.position.x;
    this.prevY = this.position.y;
    this.position.set(x, y);
  }

  setVelocity(vx: number, vy: number): void {
    this.velocity.set(vx, vy);
  }

  setOrigin(x: number, y: number): void {
    this.originX = x;
    this.originY = y;
  }

  /**
   * Check if bullet has exceeded its range
   */
  isOutOfRange(): boolean {
    if (this.maxRange <= 0) return false;

    const dx = this.position.x - this.originX;
    const dy = this.position.y - this.originY;
    const distSq = dx * dx + dy * dy;
    const maxDistSq = (this.maxRange * this.slideRate) ** 2;

    return distSq > maxDistSq;
  }
}
