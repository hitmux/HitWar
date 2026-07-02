/**
 * Vector Schema - 2D position/direction
 */
import { Schema, type } from '@colyseus/schema';

export class VectorSchema extends Schema {
  @type('float32') x: number = 0;
  @type('float32') y: number = 0;

  constructor(x: number = 0, y: number = 0) {
    super();
    this.x = x;
    this.y = y;
  }

  set(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  copyFrom(other: { x: number; y: number }): void {
    this.x = other.x;
    this.y = other.y;
  }

  distanceTo(other: { x: number; y: number }): number {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
