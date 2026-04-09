/**
 * Mine State Schema
 * Represents a mine/power plant entity synced to clients
 */
import { Schema, type } from '@colyseus/schema';
import { VectorSchema } from './VectorSchema.js';
import { MineStateType } from '../../../shared/config/mineMeta.js';

export class MineState extends Schema {
  @type('string') id: string = '';
  @type(VectorSchema) position: VectorSchema = new VectorSchema();
  @type('string') mineState: string = MineStateType.NORMAL;
  @type('string') ownerId: string = '';
  @type('number') level: number = 0;
  @type('number') hp: number = 0;
  @type('number') maxHp: number = 0;
  @type('number') radius: number = 15;
  @type('boolean') repairing: boolean = false;
  @type('number') repairProgress: number = 0;
  @type('boolean') inValidTerritory: boolean = true;

  constructor() {
    super();
    this.position = new VectorSchema();
  }

  setPosition(x: number, y: number): void {
    this.position.set(x, y);
  }
}
