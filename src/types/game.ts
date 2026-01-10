/**
 * Game core types for World and Game
 */

import type { RenderContext, IBounds, VoidCallback } from './common';
import type { IVector, ICircle, IRectangle } from './geometry';
import type { ITower, IMonster, IBullet, IBuilding, IGameObject } from './entities';

// Effect interface (for visual effects)
export interface IEffect {
  pos: IVector;
  liveTime: number;
  maxLiveTime: number;
  removed: boolean;

  goStep(): void;
  render(ctx: RenderContext): void;
  remove(): void;
}

// QuadTree interface for spatial queries
export interface IQuadTree<T> {
  bounds: IBounds;
  maxObjects: number;
  maxLevels: number;

  insert(obj: T): void;
  retrieve(bounds: IBounds): T[];
  clear(): void;
}

// Camera interface
export interface ICamera {
  x: number;
  y: number;
  zoom: number;
  width: number;
  height: number;

  move(dx: number, dy: number): void;
  moveTo(x: number, y: number): void;
  setZoom(zoom: number): void;
  screenToWorld(screenX: number, screenY: number): IVector;
  worldToScreen(worldX: number, worldY: number): IVector;
  getViewBounds(): IBounds;
}

// World interface - full definition
export interface IWorld {
  canvas: HTMLCanvasElement;
  ctx: RenderContext;
  camera: ICamera;

  // Entity collections
  towers: Map<number, ITower>;
  monsters: Map<number, IMonster>;
  bullys: Map<number, IBullet>;
  buildings: Map<number, IBuilding>;
  effects: IEffect[];

  // QuadTrees for spatial queries
  monsterQuadTree: IQuadTree<IMonster>;
  bullyQuadTree: IQuadTree<IBullet>;
  buildingQuadTree: IQuadTree<IBuilding>;

  // Entity management
  addTower(tower: ITower): void;
  addMonster(monster: IMonster): void;
  removeMonster(monster: IMonster): void;
  addBully(bully: IBullet): void;
  addBuilding(building: IBuilding): void;
  addEffect(effect: IEffect): void;
  removeBully(bully: IBullet): void;

  // Query methods
  getMonstersInRange(circle: ICircle): IMonster[];
  getBullysInRange(circle: ICircle): IBullet[];
  getBuildingsInRange(circle: ICircle): IBuilding[];
  getAllBullyToArr(): IBullet[];
  getAllBuildingArr(): IBuilding[];

  // Position checks
  isPositionOnBuilding(pos: IVector): boolean;
  isPositionOnObstacle(pos: IVector): boolean;

  // World methods
  worldAddMonster(name: string, pos: IVector): IMonster;
  generateMines(): void;
  rebuildQuadTrees(): void;
  resizeCanvas(): void;

  // Game loop
  goTick(): void;
  render(): void;
}

// Game interface
export interface IGame {
  world: IWorld;
  isRunning: boolean;
  isPaused: boolean;
  score: number;
  wave: number;

  // Game lifecycle
  start(): void;
  gameEndFunc(): void;
  isGameFalse(): boolean;
}

// Game state for save/load
export interface IGameState {
  score: number;
  wave: number;
  towers: ITowerSaveData[];
  buildings: IBuildingSaveData[];
  resources: IResourceState;
}

// Save data structures
export interface ITowerSaveData {
  type: string;
  x: number;
  y: number;
  level: number;
  hp: number;
}

export interface IBuildingSaveData {
  type: string;
  x: number;
  y: number;
  hp: number;
}

export interface IResourceState {
  energy: number;
  gold: number;
}

// Game configuration
export interface IGameConfig {
  canvasWidth: number;
  canvasHeight: number;
  worldWidth: number;
  worldHeight: number;
  tickRate: number;
  maxMonsters: number;
  startingEnergy: number;
}

// Input state
export interface IInputState {
  mouseX: number;
  mouseY: number;
  mouseDown: boolean;
  keys: Set<string>;
}
